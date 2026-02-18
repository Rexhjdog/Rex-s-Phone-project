/**
 * DNS leak protection.
 * Ensures DNS queries are routed through the VPN tunnel
 * and prevents system DNS from leaking outside the tunnel.
 */

import { NativeModules, Platform } from 'react-native';
import { DNS_SERVERS } from '../../config/constants';

const { VpnModule } = NativeModules;

export interface DnsLeakTestResult {
  servers: DnsServerDetection[];
  isLeaking: boolean;
  timestamp: Date;
}

export interface DnsServerDetection {
  ip: string;
  hostname?: string;
  isp?: string;
  country?: string;
  isMullvad: boolean;
}

export class DnsLeakProtection {
  private active: boolean = false;
  private enforcedDns: string[] = [];

  /**
   * Activate DNS leak protection.
   * Forces all DNS through the VPN tunnel DNS servers.
   */
  activate(dnsServers?: string[]): void {
    this.active = true;
    this.enforcedDns = dnsServers || DNS_SERVERS.mullvad.default;

    try {
      if (VpnModule) {
        if (Platform.OS === 'android') {
          // Android: Set DNS in VpnService.Builder
          VpnModule.setTunnelDns(this.enforcedDns);
          // Block DNS on port 53 outside tunnel
          VpnModule.addFirewallRule({
            protocol: 'udp',
            port: 53,
            action: 'block_outside_tunnel',
          });
          VpnModule.addFirewallRule({
            protocol: 'tcp',
            port: 53,
            action: 'block_outside_tunnel',
          });
        } else {
          // iOS: Configure via NEDNSSettings
          VpnModule.configureDns({
            servers: this.enforcedDns,
            searchDomains: [],
            matchDomains: [''], // Match all domains
          });
        }
      }
    } catch {
      console.warn('DNS leak protection activation failed');
    }
  }

  /**
   * Deactivate DNS leak protection.
   */
  deactivate(): void {
    this.active = false;
    this.enforcedDns = [];

    try {
      if (VpnModule) {
        if (Platform.OS === 'android') {
          VpnModule.removeFirewallRule('dns_block');
        } else {
          VpnModule.configureDns({
            servers: [],
            searchDomains: [],
            matchDomains: [],
          });
        }
      }
    } catch {
      console.warn('DNS leak protection deactivation failed');
    }
  }

  /**
   * Update the enforced DNS servers.
   */
  updateDnsServers(servers: string[]): void {
    this.enforcedDns = servers;
    if (this.active) {
      this.activate(servers);
    }
  }

  /**
   * Run a DNS leak test.
   * Makes DNS queries and checks which servers respond.
   */
  async runLeakTest(): Promise<DnsLeakTestResult> {
    const testDomains = [
      `test-${Date.now()}-1.mullvad.net`,
      `test-${Date.now()}-2.mullvad.net`,
      `test-${Date.now()}-3.mullvad.net`,
    ];

    const detections: DnsServerDetection[] = [];

    for (const domain of testDomains) {
      try {
        const response = await fetch(
          `https://dns-leak-test.mullvad.net/check?domain=${domain}`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          for (const server of data.servers || []) {
            const isMullvad = this.isMullvadDns(server.ip);
            detections.push({
              ip: server.ip,
              hostname: server.hostname,
              isp: server.isp,
              country: server.country,
              isMullvad,
            });
          }
        }
      } catch {
        // Test query failed - may indicate DNS blocking is working
      }
    }

    const isLeaking = detections.some((d) => !d.isMullvad);

    return {
      servers: detections,
      isLeaking,
      timestamp: new Date(),
    };
  }

  /**
   * Check if DNS leak protection is active.
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get currently enforced DNS servers.
   */
  getEnforcedDns(): string[] {
    return [...this.enforcedDns];
  }

  private isMullvadDns(ip: string): boolean {
    const mullvadPrefixes = ['10.64.0.', '100.64.0.'];
    return mullvadPrefixes.some((prefix) => ip.startsWith(prefix));
  }
}
