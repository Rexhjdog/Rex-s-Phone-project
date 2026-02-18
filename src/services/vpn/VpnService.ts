/**
 * Main VPN service orchestrator.
 * Coordinates all VPN subsystems: tunnel management, DNS, relay selection,
 * kill switch, and connection lifecycle.
 */

import {
  ConnectionStatus,
  ConnectionDetails,
  VpnSettings,
  TunnelProtocol,
  DnsConfig,
  VpnError,
  ErrorCode,
} from '../../types/vpn';
import { RelayServer, RelaySelection } from '../../types/server';
import { Device } from '../../types/account';
import { TunnelManager, TunnelState, TunnelStats } from './TunnelManager';
import { WireGuardConfigBuilder, WireGuardKeyPair } from './WireGuardConfig';
import { DnsManager } from './DnsManager';
import { RelaySelector } from '../relay/RelaySelector';
import { KillSwitch } from '../security/KillSwitch';
import { DnsLeakProtection } from '../security/DnsLeakProtection';

export type VpnStateListener = (state: VpnServiceState) => void;

export interface VpnServiceState {
  connectionStatus: ConnectionStatus;
  connectionDetails: ConnectionDetails | null;
  selectedRelay: RelayServer | null;
  error: VpnError | null;
  isKillSwitchActive: boolean;
  stats: TunnelStats | null;
}

export class VpnService {
  private tunnelManager: TunnelManager;
  private dnsManager: DnsManager;
  private relaySelector: RelaySelector;
  private killSwitch: KillSwitch;
  private dnsLeakProtection: DnsLeakProtection;

  private settings: VpnSettings;
  private currentDevice: Device | null = null;
  private selectedRelay: RelayServer | null = null;
  private listeners: Set<VpnStateListener> = new Set();
  private currentStats: TunnelStats | null = null;

  constructor(settings: VpnSettings) {
    this.settings = settings;
    this.tunnelManager = new TunnelManager();
    this.dnsManager = new DnsManager();
    this.relaySelector = new RelaySelector();
    this.killSwitch = new KillSwitch();
    this.dnsLeakProtection = new DnsLeakProtection();

    this.setupInternalListeners();
  }

  private setupInternalListeners(): void {
    this.tunnelManager.onStateChange((state: TunnelState) => {
      this.notifyListeners();

      if (state.status === ConnectionStatus.Connected) {
        this.dnsLeakProtection.activate();
      } else if (state.status === ConnectionStatus.Disconnected) {
        this.dnsLeakProtection.deactivate();
      }

      // Activate kill switch on unexpected disconnection
      if (
        state.status === ConnectionStatus.Error &&
        this.settings.killSwitch
      ) {
        this.killSwitch.activate();
      }
    });

    this.tunnelManager.onStatsUpdate((stats: TunnelStats) => {
      this.currentStats = stats;
      this.notifyListeners();
    });
  }

  /**
   * Connect to VPN using current settings and relay selection.
   */
  async connect(relaySelection?: RelaySelection): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No device registered. Please log in first.');
    }

    // Select relay
    const relay = relaySelection?.selectedRelay ??
      await this.relaySelector.selectRelay(
        relaySelection?.constraints ?? {},
        this.settings.protocol
      );

    if (!relay) {
      throw new Error('No suitable relay server found');
    }

    this.selectedRelay = relay;

    // Build WireGuard configuration
    const config = new WireGuardConfigBuilder()
      .setKeys(this.currentDevice.publicKey, this.currentDevice.publicKey) // Device keys
      .setAddresses(this.currentDevice.ipv4Address, this.currentDevice.ipv6Address)
      .setDns(this.settings.dns)
      .setPeer(relay, this.resolvePort())
      .setMtu(this.settings.mtu)
      .build();

    // Activate kill switch before connecting if enabled
    if (this.settings.killSwitch) {
      this.killSwitch.activate();
    }

    await this.tunnelManager.connect(config, relay);
  }

  /**
   * Disconnect from VPN.
   */
  async disconnect(): Promise<void> {
    await this.tunnelManager.disconnect();

    if (!this.settings.lockdownMode) {
      this.killSwitch.deactivate();
    }

    this.selectedRelay = null;
  }

  /**
   * Reconnect to a different server.
   */
  async switchServer(relay: RelayServer): Promise<void> {
    const config = this.buildConfigForRelay(relay);
    this.selectedRelay = relay;
    await this.tunnelManager.reconnect(relay, config);
  }

  /**
   * Get the current VPN service state.
   */
  getState(): VpnServiceState {
    const tunnelState = this.tunnelManager.getState();
    return {
      connectionStatus: tunnelState.status,
      connectionDetails: tunnelState.details ?? null,
      selectedRelay: this.selectedRelay,
      error: tunnelState.error ?? null,
      isKillSwitchActive: this.killSwitch.isActive(),
      stats: this.currentStats,
    };
  }

  /**
   * Subscribe to VPN state changes.
   */
  onStateChange(listener: VpnStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update VPN settings.
   */
  updateSettings(updates: Partial<VpnSettings>): void {
    this.settings = { ...this.settings, ...updates };

    if (updates.dns) {
      this.dnsManager.updateConfig(updates.dns);
    }

    if (updates.killSwitch !== undefined) {
      if (updates.killSwitch) {
        this.killSwitch.activate();
      } else if (!this.settings.lockdownMode) {
        this.killSwitch.deactivate();
      }
    }
  }

  /**
   * Set the current device (after login/device registration).
   */
  setDevice(device: Device): void {
    this.currentDevice = device;
  }

  /**
   * Get the DNS manager for DNS configuration.
   */
  getDnsManager(): DnsManager {
    return this.dnsManager;
  }

  /**
   * Get the relay selector for server browsing.
   */
  getRelaySelector(): RelaySelector {
    return this.relaySelector;
  }

  /**
   * Check if VPN permission is granted.
   */
  async hasPermission(): Promise<boolean> {
    return this.tunnelManager.checkPermission();
  }

  /**
   * Request VPN permission.
   */
  async requestPermission(): Promise<boolean> {
    return this.tunnelManager.requestPermission();
  }

  private buildConfigForRelay(relay: RelayServer) {
    if (!this.currentDevice) {
      throw new Error('No device registered');
    }

    return new WireGuardConfigBuilder()
      .setKeys(this.currentDevice.publicKey, this.currentDevice.publicKey)
      .setAddresses(this.currentDevice.ipv4Address, this.currentDevice.ipv6Address)
      .setDns(this.settings.dns)
      .setPeer(relay, this.resolvePort())
      .setMtu(this.settings.mtu)
      .build();
  }

  private resolvePort(): number | undefined {
    if (this.settings.wireguardPort === 'auto') {
      return undefined;
    }
    return this.settings.wireguardPort;
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * Clean up all resources.
   */
  destroy(): void {
    this.tunnelManager.destroy();
    this.listeners.clear();
    this.killSwitch.deactivate();
    this.dnsLeakProtection.deactivate();
  }
}
