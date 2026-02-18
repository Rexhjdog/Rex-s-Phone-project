/**
 * Geolocation utilities for determining user location
 * and IP-based location checks.
 */

import { GeoLocation } from '../../types/server';
import { API_BASE_URL } from '../../config/constants';

export interface LocationCheck {
  ip: string;
  location: GeoLocation;
  isMullvad: boolean;
  server?: string;
}

export class GeoLocationService {
  private lastCheck: LocationCheck | null = null;

  /**
   * Check current IP and location via Mullvad's connection check.
   */
  async checkConnection(): Promise<LocationCheck> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/am-i-mullvad`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Connection check failed');
      }

      const data = await response.json();

      this.lastCheck = {
        ip: data.ip,
        location: {
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          city: data.city || 'Unknown',
          country: data.country || 'Unknown',
          countryCode: data.country_code || '',
        },
        isMullvad: data.mullvad_exit_ip === true,
        server: data.mullvad_server_type || undefined,
      };

      return this.lastCheck;
    } catch {
      throw new Error('Unable to check connection status');
    }
  }

  /**
   * Get the last connection check result.
   */
  getLastCheck(): LocationCheck | null {
    return this.lastCheck;
  }

  /**
   * Get the user's approximate location using the device GPS
   * (requires react-native geolocation permission).
   */
  async getDeviceLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(new Error(`Geolocation error: ${error.message}`));
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        reject(new Error('Geolocation not available'));
      }
    });
  }

  /**
   * Format an IP address for display.
   */
  static formatIP(ip: string): string {
    return ip;
  }

  /**
   * Check if an IP is IPv6.
   */
  static isIPv6(ip: string): boolean {
    return ip.includes(':');
  }
}
