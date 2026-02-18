/**
 * Device management service.
 * Handles device registration, key rotation, and device listing.
 * Each Mullvad account supports up to 5 devices.
 */

import {
  Device,
  DeviceEvent,
  DeviceKeyRotation,
} from '../../types/account';
import { WireGuardConfigBuilder, WireGuardKeyPair } from '../vpn/WireGuardConfig';
import { SecureStorage } from '../storage/SecureStorage';
import { CryptoUtils } from '../../utils/crypto';
import {
  API_BASE_URL,
  MAX_DEVICES_PER_ACCOUNT,
  KEY_ROTATION_INTERVAL_DAYS,
} from '../../config/constants';

const DEVICE_STORAGE_KEY = 'mullvad_device';
const PRIVATE_KEY_STORAGE_KEY = 'mullvad_device_private_key';

export type DeviceEventListener = (event: DeviceEvent) => void;

export class DeviceService {
  private currentDevice: Device | null = null;
  private privateKey: string = '';
  private storage: SecureStorage;
  private eventListeners: Set<DeviceEventListener> = new Set();

  constructor() {
    this.storage = new SecureStorage();
  }

  /**
   * Register a new device with the account.
   * Generates a WireGuard key pair and registers the public key.
   */
  async registerDevice(
    accountToken: string,
    deviceName?: string
  ): Promise<Device> {
    // Generate key pair
    const keyPair = WireGuardConfigBuilder.generateKeyPair();
    this.privateKey = keyPair.privateKey;

    const name = deviceName || this.generateDeviceName();

    const response = await fetch(`${API_BASE_URL}/v1/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accountToken}`,
      },
      body: JSON.stringify({
        pubkey: keyPair.publicKey,
        name: name,
      }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error(
          `Device limit reached (${MAX_DEVICES_PER_ACCOUNT}). Remove a device first.`
        );
      }
      throw new Error(`Device registration failed: ${response.status}`);
    }

    const data = await response.json();

    this.currentDevice = {
      id: data.id,
      name: data.name || name,
      publicKey: keyPair.publicKey,
      ipv4Address: data.ipv4_address,
      ipv6Address: data.ipv6_address,
      created: new Date(data.created),
      lastUsed: new Date(),
      isCurrent: true,
    };

    await this.persistDevice();
    await this.persistPrivateKey();

    this.emitEvent({
      type: 'added',
      device: this.currentDevice,
      timestamp: new Date(),
    });

    return this.currentDevice;
  }

  /**
   * Remove a device from the account.
   */
  async removeDevice(
    accountToken: string,
    deviceId: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/v1/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accountToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Device removal failed: ${response.status}`);
    }

    if (this.currentDevice?.id === deviceId) {
      this.currentDevice = null;
      this.privateKey = '';
      await this.storage.remove(DEVICE_STORAGE_KEY);
      await this.storage.remove(PRIVATE_KEY_STORAGE_KEY);
    }
  }

  /**
   * List all devices on the account.
   */
  async listDevices(accountToken: string): Promise<Device[]> {
    const response = await fetch(`${API_BASE_URL}/v1/devices`, {
      headers: {
        'Authorization': `Bearer ${accountToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list devices: ${response.status}`);
    }

    const data = await response.json();

    return data.map((d: Record<string, string>) => ({
      id: d.id,
      name: d.name,
      publicKey: d.pubkey,
      ipv4Address: d.ipv4_address,
      ipv6Address: d.ipv6_address,
      created: new Date(d.created),
      lastUsed: new Date(d.last_used || d.created),
      isCurrent: this.currentDevice?.id === d.id,
    }));
  }

  /**
   * Rotate the WireGuard key for the current device.
   * This generates a new key pair and updates the server.
   */
  async rotateKey(accountToken: string): Promise<DeviceKeyRotation> {
    if (!this.currentDevice) {
      throw new Error('No device registered');
    }

    const newKeyPair = WireGuardConfigBuilder.generateKeyPair();

    const response = await fetch(
      `${API_BASE_URL}/v1/devices/${this.currentDevice.id}/pubkey`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accountToken}`,
        },
        body: JSON.stringify({
          old_pubkey: this.currentDevice.publicKey,
          new_pubkey: newKeyPair.publicKey,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Key rotation failed: ${response.status}`);
    }

    const rotation: DeviceKeyRotation = {
      oldPublicKey: this.currentDevice.publicKey,
      newPublicKey: newKeyPair.publicKey,
      newPrivateKey: newKeyPair.privateKey,
      timestamp: new Date(),
    };

    this.currentDevice.publicKey = newKeyPair.publicKey;
    this.privateKey = newKeyPair.privateKey;

    await this.persistDevice();
    await this.persistPrivateKey();

    this.emitEvent({
      type: 'rotated_key',
      device: this.currentDevice,
      timestamp: new Date(),
    });

    return rotation;
  }

  /**
   * Check if key rotation is due.
   */
  isKeyRotationDue(): boolean {
    if (!this.currentDevice) return false;

    const daysSinceCreation =
      (Date.now() - this.currentDevice.created.getTime()) /
      (1000 * 60 * 60 * 24);

    return daysSinceCreation >= KEY_ROTATION_INTERVAL_DAYS;
  }

  /**
   * Get the current device.
   */
  getCurrentDevice(): Device | null {
    return this.currentDevice ? { ...this.currentDevice } : null;
  }

  /**
   * Get the private key for the current device.
   */
  getPrivateKey(): string {
    return this.privateKey;
  }

  /**
   * Subscribe to device events.
   */
  onDeviceEvent(listener: DeviceEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * Restore device from storage.
   */
  async restoreDevice(): Promise<Device | null> {
    try {
      const deviceData = await this.storage.get(DEVICE_STORAGE_KEY);
      const keyData = await this.storage.get(PRIVATE_KEY_STORAGE_KEY);

      if (deviceData && keyData) {
        this.currentDevice = JSON.parse(deviceData);
        if (this.currentDevice) {
          this.currentDevice.created = new Date(this.currentDevice.created);
          this.currentDevice.lastUsed = new Date(this.currentDevice.lastUsed);
        }
        this.privateKey = keyData;
        return this.currentDevice;
      }
      return null;
    } catch {
      return null;
    }
  }

  private generateDeviceName(): string {
    const adjectives = ['swift', 'bright', 'calm', 'bold', 'keen'];
    const nouns = ['fox', 'hawk', 'wolf', 'bear', 'lynx'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}-${noun}-${num}`;
  }

  private async persistDevice(): Promise<void> {
    if (this.currentDevice) {
      await this.storage.set(
        DEVICE_STORAGE_KEY,
        JSON.stringify(this.currentDevice)
      );
    }
  }

  private async persistPrivateKey(): Promise<void> {
    if (this.privateKey) {
      await this.storage.set(PRIVATE_KEY_STORAGE_KEY, this.privateKey);
    }
  }

  private emitEvent(event: DeviceEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
