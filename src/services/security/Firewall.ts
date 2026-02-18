/**
 * Firewall rules manager.
 * Manages network filtering rules for split tunneling,
 * LAN access, and traffic control.
 */

import { NativeModules, Platform } from 'react-native';
import { SplitTunnelingConfig, SplitTunnelApp } from '../../types';

const { VpnModule } = NativeModules;

export interface FirewallRule {
  id: string;
  description: string;
  direction: 'inbound' | 'outbound' | 'both';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  sourceAddress?: string;
  destinationAddress?: string;
  port?: number;
  portRange?: { start: number; end: number };
  action: 'allow' | 'block';
  priority: number;
}

const LAN_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  'fe80::/10',
  'fc00::/7',
];

const MULTICAST_RANGES = [
  '224.0.0.0/4',
  'ff00::/8',
];

export class Firewall {
  private rules: Map<string, FirewallRule> = new Map();
  private lanAllowed: boolean = false;

  /**
   * Allow local network access while VPN is active.
   */
  allowLan(enabled: boolean): void {
    this.lanAllowed = enabled;

    if (enabled) {
      // Allow traffic to LAN addresses
      for (let i = 0; i < LAN_RANGES.length; i++) {
        this.addRule({
          id: `lan_allow_${i}`,
          description: `Allow LAN traffic to ${LAN_RANGES[i]}`,
          direction: 'both',
          protocol: 'all',
          destinationAddress: LAN_RANGES[i],
          action: 'allow',
          priority: 100,
        });
      }

      // Allow multicast
      for (let i = 0; i < MULTICAST_RANGES.length; i++) {
        this.addRule({
          id: `multicast_allow_${i}`,
          description: `Allow multicast to ${MULTICAST_RANGES[i]}`,
          direction: 'outbound',
          protocol: 'udp',
          destinationAddress: MULTICAST_RANGES[i],
          action: 'allow',
          priority: 100,
        });
      }
    } else {
      // Remove LAN and multicast rules
      for (const [id] of this.rules) {
        if (id.startsWith('lan_allow_') || id.startsWith('multicast_allow_')) {
          this.rules.delete(id);
        }
      }
    }

    this.applyRules();
  }

  /**
   * Configure split tunneling.
   * Excludes or includes specific apps from the VPN tunnel.
   */
  configureSplitTunneling(config: SplitTunnelingConfig): void {
    // Remove existing split tunnel rules
    for (const [id] of this.rules) {
      if (id.startsWith('split_tunnel_')) {
        this.rules.delete(id);
      }
    }

    if (!config.enabled) {
      this.applyRules();
      return;
    }

    const enabledApps = config.apps.filter((app) => app.enabled);

    try {
      if (VpnModule && Platform.OS === 'android') {
        if (config.mode === 'exclude') {
          // These apps bypass the VPN
          VpnModule.setDisallowedApplications(
            enabledApps.map((app) => app.packageName)
          );
        } else {
          // Only these apps use the VPN
          VpnModule.setAllowedApplications(
            enabledApps.map((app) => app.packageName)
          );
        }
      }
      // iOS doesn't support per-app VPN split tunneling at the system level
    } catch {
      console.warn('Split tunneling configuration failed');
    }
  }

  /**
   * Add a firewall rule.
   */
  addRule(rule: FirewallRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a firewall rule.
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all active rules.
   */
  getRules(): FirewallRule[] {
    return Array.from(this.rules.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }

  /**
   * Check if LAN access is allowed.
   */
  isLanAllowed(): boolean {
    return this.lanAllowed;
  }

  /**
   * Get list of installed apps for split tunneling (Android only).
   */
  async getInstalledApps(): Promise<SplitTunnelApp[]> {
    try {
      if (VpnModule && Platform.OS === 'android') {
        const apps = await VpnModule.getInstalledApps();
        return apps.map((app: Record<string, string>) => ({
          packageName: app.packageName,
          appName: app.appName,
          icon: app.icon,
          enabled: false,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all firewall rules.
   */
  clearRules(): void {
    this.rules.clear();
    this.applyRules();
  }

  private applyRules(): void {
    try {
      if (VpnModule) {
        const sortedRules = this.getRules();
        VpnModule.setFirewallRules(
          sortedRules.map((rule) => ({
            id: rule.id,
            direction: rule.direction,
            protocol: rule.protocol,
            destination: rule.destinationAddress,
            source: rule.sourceAddress,
            port: rule.port,
            action: rule.action,
            priority: rule.priority,
          }))
        );
      }
    } catch {
      console.warn('Failed to apply firewall rules');
    }
  }
}
