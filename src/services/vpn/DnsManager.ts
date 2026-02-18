/**
 * DNS configuration manager.
 * Handles DNS server selection, content blocking categories,
 * and custom DNS validation.
 */

import { DnsConfig } from '../../types/vpn';
import { DNS_SERVERS } from '../../config/constants';
import { IpUtils } from '../../utils/ip';

export interface DnsPreset {
  name: string;
  description: string;
  servers: string[];
  features: string[];
}

export const DNS_PRESETS: DnsPreset[] = [
  {
    name: 'Mullvad Default',
    description: 'Standard Mullvad DNS with no content filtering',
    servers: DNS_SERVERS.mullvad.default,
    features: [],
  },
  {
    name: 'Ad Blocking',
    description: 'Blocks advertisements across websites and apps',
    servers: DNS_SERVERS.mullvad.adBlocking,
    features: ['ads'],
  },
  {
    name: 'Tracker Blocking',
    description: 'Blocks known tracking domains',
    servers: DNS_SERVERS.mullvad.trackerBlocking,
    features: ['trackers'],
  },
  {
    name: 'Ad + Tracker Blocking',
    description: 'Blocks both advertisements and trackers',
    servers: DNS_SERVERS.mullvad.adAndTrackerBlocking,
    features: ['ads', 'trackers'],
  },
];

export class DnsManager {
  private currentConfig: DnsConfig;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  /**
   * Get the default DNS configuration.
   */
  getDefaultConfig(): DnsConfig {
    return {
      enabled: true,
      customDns: [],
      blockAds: false,
      blockTrackers: false,
      blockMalware: false,
      blockAdultContent: false,
      blockGambling: false,
      blockSocialMedia: false,
    };
  }

  /**
   * Get current DNS configuration.
   */
  getConfig(): DnsConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update DNS configuration.
   */
  updateConfig(updates: Partial<DnsConfig>): DnsConfig {
    // If custom DNS is being set, disable content filtering
    if (updates.customDns && updates.customDns.length > 0) {
      this.currentConfig = {
        ...this.currentConfig,
        ...updates,
        blockAds: false,
        blockTrackers: false,
        blockMalware: false,
        blockAdultContent: false,
        blockGambling: false,
        blockSocialMedia: false,
      };
    } else {
      this.currentConfig = {
        ...this.currentConfig,
        ...updates,
      };
    }

    return this.getConfig();
  }

  /**
   * Resolve the effective DNS servers based on current config.
   */
  resolveServers(): string[] {
    const config = this.currentConfig;

    if (!config.enabled) {
      return [];
    }

    if (config.customDns.length > 0) {
      return config.customDns;
    }

    if (config.blockAds && config.blockTrackers) {
      return DNS_SERVERS.mullvad.adAndTrackerBlocking;
    }

    if (config.blockAds) {
      return DNS_SERVERS.mullvad.adBlocking;
    }

    if (config.blockTrackers) {
      return DNS_SERVERS.mullvad.trackerBlocking;
    }

    return DNS_SERVERS.mullvad.default;
  }

  /**
   * Validate a custom DNS server address.
   */
  validateDnsServer(address: string): { valid: boolean; error?: string } {
    if (!address || address.trim().length === 0) {
      return { valid: false, error: 'DNS address cannot be empty' };
    }

    const trimmed = address.trim();

    if (IpUtils.isValidIPv4(trimmed) || IpUtils.isValidIPv6(trimmed)) {
      return { valid: true };
    }

    return { valid: false, error: 'Invalid IP address format' };
  }

  /**
   * Add a custom DNS server.
   */
  addCustomDns(address: string): { success: boolean; error?: string } {
    const validation = this.validateDnsServer(address);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const trimmed = address.trim();
    if (this.currentConfig.customDns.includes(trimmed)) {
      return { success: false, error: 'DNS server already exists' };
    }

    if (this.currentConfig.customDns.length >= 3) {
      return { success: false, error: 'Maximum 3 custom DNS servers allowed' };
    }

    this.currentConfig.customDns = [...this.currentConfig.customDns, trimmed];
    return { success: true };
  }

  /**
   * Remove a custom DNS server.
   */
  removeCustomDns(address: string): void {
    this.currentConfig.customDns = this.currentConfig.customDns.filter(
      (dns) => dns !== address
    );
  }

  /**
   * Get content blocking features description.
   */
  getBlockingDescription(): string {
    const config = this.currentConfig;
    const features: string[] = [];

    if (config.blockAds) features.push('Ads');
    if (config.blockTrackers) features.push('Trackers');
    if (config.blockMalware) features.push('Malware');
    if (config.blockAdultContent) features.push('Adult content');
    if (config.blockGambling) features.push('Gambling');
    if (config.blockSocialMedia) features.push('Social media');

    if (features.length === 0) {
      return 'No content blocking';
    }

    return `Blocking: ${features.join(', ')}`;
  }

  /**
   * Check if using custom DNS (which disables Mullvad DNS features).
   */
  isUsingCustomDns(): boolean {
    return this.currentConfig.customDns.length > 0;
  }

  /**
   * Check if any content blocking is active.
   */
  isContentBlockingActive(): boolean {
    const config = this.currentConfig;
    return (
      config.blockAds ||
      config.blockTrackers ||
      config.blockMalware ||
      config.blockAdultContent ||
      config.blockGambling ||
      config.blockSocialMedia
    );
  }
}
