/**
 * Core VPN types for the Mullvad VPN rebuild.
 * Covers connection states, tunnel protocols, and VPN configuration.
 */

export enum TunnelProtocol {
  WireGuard = 'wireguard',
  OpenVPN = 'openvpn',
}

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnecting = 'disconnecting',
  Reconnecting = 'reconnecting',
  Error = 'error',
}

export enum ErrorCode {
  AuthFailed = 'AUTH_FAILED',
  ServerUnreachable = 'SERVER_UNREACHABLE',
  TunnelConfigFailed = 'TUNNEL_CONFIG_FAILED',
  KillSwitchActive = 'KILL_SWITCH_ACTIVE',
  DeviceLimitReached = 'DEVICE_LIMIT_REACHED',
  AccountExpired = 'ACCOUNT_EXPIRED',
  NoNetwork = 'NO_NETWORK',
  PermissionDenied = 'PERMISSION_DENIED',
  InternalError = 'INTERNAL_ERROR',
}

export interface TunnelEndpoint {
  address: string;
  port: number;
  protocol: TunnelProtocol;
}

export interface WireGuardConfig {
  privateKey: string;
  publicKey: string;
  addresses: string[];
  dns: string[];
  endpoint: TunnelEndpoint;
  peerPublicKey: string;
  presharedKey?: string;
  mtu: number;
  listenPort?: number;
  persistentKeepalive: number;
  allowedIPs: string[];
}

export interface OpenVPNConfig {
  remoteAddress: string;
  remotePort: number;
  protocol: 'tcp' | 'udp';
  cipher: string;
  auth: string;
  caCert: string;
  clientCert: string;
  clientKey: string;
  tlsAuth?: string;
}

export type TunnelConfig = WireGuardConfig | OpenVPNConfig;

export interface ConnectionDetails {
  status: ConnectionStatus;
  serverAddress?: string;
  serverLocation?: string;
  protocol?: TunnelProtocol;
  publicIP?: string;
  tunnelIP?: string;
  port?: number;
  bytesReceived?: number;
  bytesSent?: number;
  connectedSince?: Date;
  latency?: number;
}

export interface VpnError {
  code: ErrorCode;
  message: string;
  details?: string;
  recoverable: boolean;
}

export interface DnsConfig {
  enabled: boolean;
  customDns: string[];
  blockAds: boolean;
  blockTrackers: boolean;
  blockMalware: boolean;
  blockAdultContent: boolean;
  blockGambling: boolean;
  blockSocialMedia: boolean;
}

export interface ObfuscationSettings {
  enabled: boolean;
  mode: 'udp2tcp' | 'shadowsocks' | 'none';
  port?: number;
}

export interface QuantumResistance {
  enabled: boolean;
  pqKeyExchange: boolean;
}

export interface BridgeSettings {
  enabled: boolean;
  type: 'normal' | 'custom';
  customProxy?: {
    address: string;
    port: number;
    username?: string;
    password?: string;
  };
}

export interface MultihopSettings {
  enabled: boolean;
  entryRelay?: string;
  exitRelay?: string;
}

export interface VpnSettings {
  protocol: TunnelProtocol;
  dns: DnsConfig;
  obfuscation: ObfuscationSettings;
  quantumResistance: QuantumResistance;
  bridge: BridgeSettings;
  multihop: MultihopSettings;
  mtu: number;
  wireguardPort: 'auto' | number;
  autoConnect: boolean;
  allowLan: boolean;
  killSwitch: boolean;
  lockdownMode: boolean;
}
