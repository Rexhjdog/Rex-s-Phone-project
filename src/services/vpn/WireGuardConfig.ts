/**
 * WireGuard configuration generator and manager.
 * Handles key generation, configuration building, and INI export.
 */

import {
  WireGuardConfig,
  TunnelProtocol,
  TunnelEndpoint,
  DnsConfig,
} from '../../types/vpn';
import { RelayServer } from '../../types/server';
import {
  WIREGUARD_DEFAULT_MTU,
  WIREGUARD_DEFAULT_PORT,
  WIREGUARD_KEEPALIVE_INTERVAL,
  DNS_SERVERS,
} from '../../config/constants';
import { CryptoUtils } from '../../utils/crypto';

export interface WireGuardKeyPair {
  privateKey: string;
  publicKey: string;
}

export class WireGuardConfigBuilder {
  private privateKey: string = '';
  private publicKey: string = '';
  private addresses: string[] = [];
  private dns: string[] = [];
  private peerPublicKey: string = '';
  private presharedKey?: string;
  private endpoint: TunnelEndpoint | null = null;
  private mtu: number = WIREGUARD_DEFAULT_MTU;
  private keepalive: number = WIREGUARD_KEEPALIVE_INTERVAL;
  private allowedIPs: string[] = ['0.0.0.0/0', '::/0'];

  /**
   * Generate a new WireGuard key pair using NaCl/TweetNaCl.
   */
  static generateKeyPair(): WireGuardKeyPair {
    return CryptoUtils.generateWireGuardKeyPair();
  }

  /**
   * Derive public key from a private key.
   */
  static derivePublicKey(privateKey: string): string {
    return CryptoUtils.derivePublicKey(privateKey);
  }

  setKeys(privateKey: string, publicKey: string): this {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    return this;
  }

  setAddresses(ipv4: string, ipv6?: string): this {
    this.addresses = [ipv4];
    if (ipv6) {
      this.addresses.push(ipv6);
    }
    return this;
  }

  setDns(dnsConfig: DnsConfig): this {
    if (dnsConfig.customDns.length > 0) {
      this.dns = dnsConfig.customDns;
    } else if (dnsConfig.blockAds && dnsConfig.blockTrackers) {
      this.dns = DNS_SERVERS.mullvad.adAndTrackerBlocking;
    } else if (dnsConfig.blockAds) {
      this.dns = DNS_SERVERS.mullvad.adBlocking;
    } else if (dnsConfig.blockTrackers) {
      this.dns = DNS_SERVERS.mullvad.trackerBlocking;
    } else {
      this.dns = DNS_SERVERS.mullvad.default;
    }
    return this;
  }

  setDnsServers(servers: string[]): this {
    this.dns = servers;
    return this;
  }

  setPeer(relay: RelayServer, port?: number): this {
    this.peerPublicKey = relay.publicKey;
    this.endpoint = {
      address: relay.ipv4Address,
      port: port ?? relay.port ?? WIREGUARD_DEFAULT_PORT,
      protocol: TunnelProtocol.WireGuard,
    };
    return this;
  }

  setPresharedKey(key: string): this {
    this.presharedKey = key;
    return this;
  }

  setMtu(mtu: number): this {
    this.mtu = mtu;
    return this;
  }

  setKeepalive(seconds: number): this {
    this.keepalive = seconds;
    return this;
  }

  setAllowedIPs(ips: string[]): this {
    this.allowedIPs = ips;
    return this;
  }

  /**
   * Build the WireGuard configuration object.
   */
  build(): WireGuardConfig {
    if (!this.privateKey || !this.publicKey) {
      throw new Error('WireGuard keys are required');
    }
    if (!this.endpoint) {
      throw new Error('Peer endpoint is required');
    }
    if (!this.peerPublicKey) {
      throw new Error('Peer public key is required');
    }
    if (this.addresses.length === 0) {
      throw new Error('At least one address is required');
    }

    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      addresses: this.addresses,
      dns: this.dns.length > 0 ? this.dns : DNS_SERVERS.mullvad.default,
      endpoint: this.endpoint,
      peerPublicKey: this.peerPublicKey,
      presharedKey: this.presharedKey,
      mtu: this.mtu,
      persistentKeepalive: this.keepalive,
      allowedIPs: this.allowedIPs,
    };
  }

  /**
   * Export the configuration as a WireGuard INI config file string.
   */
  toConfigString(): string {
    const config = this.build();

    const lines: string[] = [
      '[Interface]',
      `PrivateKey = ${config.privateKey}`,
      `Address = ${config.addresses.join(', ')}`,
      `DNS = ${config.dns.join(', ')}`,
      `MTU = ${config.mtu}`,
      '',
      '[Peer]',
      `PublicKey = ${config.peerPublicKey}`,
      `Endpoint = ${config.endpoint.address}:${config.endpoint.port}`,
      `AllowedIPs = ${config.allowedIPs.join(', ')}`,
      `PersistentKeepalive = ${config.persistentKeepalive}`,
    ];

    if (config.presharedKey) {
      lines.splice(lines.length - 1, 0, `PresharedKey = ${config.presharedKey}`);
    }

    return lines.join('\n');
  }
}

/**
 * Parse a WireGuard INI config string back into a config object.
 */
export function parseWireGuardConfig(configStr: string): Partial<WireGuardConfig> {
  const result: Record<string, string> = {};
  const lines = configStr.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed === '') {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex !== -1) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      result[key] = value;
    }
  }

  return {
    privateKey: result['PrivateKey'],
    addresses: result['Address']?.split(',').map((s) => s.trim()),
    dns: result['DNS']?.split(',').map((s) => s.trim()),
    peerPublicKey: result['PublicKey'],
    presharedKey: result['PresharedKey'],
    allowedIPs: result['AllowedIPs']?.split(',').map((s) => s.trim()),
    mtu: result['MTU'] ? parseInt(result['MTU'], 10) : WIREGUARD_DEFAULT_MTU,
    persistentKeepalive: result['PersistentKeepalive']
      ? parseInt(result['PersistentKeepalive'], 10)
      : WIREGUARD_KEEPALIVE_INTERVAL,
  };
}
