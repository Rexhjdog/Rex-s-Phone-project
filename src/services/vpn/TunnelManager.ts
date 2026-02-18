/**
 * Tunnel lifecycle manager.
 * Coordinates the full VPN tunnel lifecycle: setup, connect, monitor, disconnect.
 * Bridges between the JS layer and native VPN service via NativeModules.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import {
  ConnectionStatus,
  ConnectionDetails,
  TunnelConfig,
  WireGuardConfig,
  TunnelProtocol,
  VpnError,
  ErrorCode,
} from '../../types/vpn';
import { RelayServer } from '../../types/server';
import { WireGuardConfigBuilder } from './WireGuardConfig';
import {
  CONNECTION_TIMEOUT,
  CONNECTION_RETRY_MAX,
  CONNECTION_RETRY_DELAY,
} from '../../config/constants';

const { VpnModule } = NativeModules;

export type TunnelStateListener = (state: TunnelState) => void;
export type TunnelStatsListener = (stats: TunnelStats) => void;

export interface TunnelState {
  status: ConnectionStatus;
  details?: ConnectionDetails;
  error?: VpnError;
  timestamp: Date;
}

export interface TunnelStats {
  bytesReceived: number;
  bytesSent: number;
  lastHandshake: Date;
  latencyMs: number;
}

export class TunnelManager {
  private currentState: TunnelState;
  private stateListeners: Set<TunnelStateListener> = new Set();
  private statsListeners: Set<TunnelStatsListener> = new Set();
  private eventEmitter: NativeEventEmitter | null = null;
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private connectionConfig: TunnelConfig | null = null;
  private retryCount: number = 0;

  constructor() {
    this.currentState = {
      status: ConnectionStatus.Disconnected,
      timestamp: new Date(),
    };
    this.initializeNativeEvents();
  }

  private initializeNativeEvents(): void {
    try {
      if (VpnModule) {
        this.eventEmitter = new NativeEventEmitter(VpnModule);
        this.eventEmitter.addListener('onTunnelStateChange', this.handleNativeStateChange);
        this.eventEmitter.addListener('onTunnelError', this.handleNativeError);
      }
    } catch {
      // Native module not available (development/testing)
      console.warn('VPN native module not available');
    }
  }

  /**
   * Establish a WireGuard tunnel to the specified relay server.
   */
  async connect(
    config: WireGuardConfig,
    relay: RelayServer
  ): Promise<void> {
    if (this.currentState.status === ConnectionStatus.Connected) {
      await this.disconnect();
    }

    this.connectionConfig = config;
    this.retryCount = 0;
    this.updateState(ConnectionStatus.Connecting, {
      serverAddress: relay.ipv4Address,
      serverLocation: `${relay.location.city}, ${relay.location.country}`,
      protocol: TunnelProtocol.WireGuard,
      port: config.endpoint.port,
    });

    try {
      await this.establishTunnel(config);
      this.startStatsPolling();
    } catch (error) {
      await this.handleConnectionError(error, config, relay);
    }
  }

  /**
   * Disconnect the active tunnel.
   */
  async disconnect(): Promise<void> {
    if (this.currentState.status === ConnectionStatus.Disconnected) {
      return;
    }

    this.updateState(ConnectionStatus.Disconnecting);
    this.stopStatsPolling();

    try {
      if (VpnModule) {
        await VpnModule.stopTunnel();
      }
      this.connectionConfig = null;
      this.updateState(ConnectionStatus.Disconnected);
    } catch (error) {
      this.emitError({
        code: ErrorCode.InternalError,
        message: 'Failed to disconnect tunnel',
        details: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });
      // Force disconnected state even on error
      this.updateState(ConnectionStatus.Disconnected);
    }
  }

  /**
   * Reconnect using the current or new configuration.
   */
  async reconnect(newRelay?: RelayServer, newConfig?: WireGuardConfig): Promise<void> {
    this.updateState(ConnectionStatus.Reconnecting);

    await this.disconnect();

    if (newConfig && newRelay) {
      await this.connect(newConfig, newRelay);
    } else if (this.connectionConfig) {
      // Reconnect with existing config
      try {
        await this.establishTunnel(this.connectionConfig);
      } catch (error) {
        this.emitError({
          code: ErrorCode.ServerUnreachable,
          message: 'Reconnection failed',
          details: error instanceof Error ? error.message : String(error),
          recoverable: true,
        });
      }
    }
  }

  /**
   * Get current tunnel state.
   */
  getState(): TunnelState {
    return { ...this.currentState };
  }

  /**
   * Subscribe to tunnel state changes.
   */
  onStateChange(listener: TunnelStateListener): () => void {
    this.stateListeners.add(listener);
    // Immediately emit current state
    listener(this.currentState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Subscribe to tunnel statistics updates.
   */
  onStatsUpdate(listener: TunnelStatsListener): () => void {
    this.statsListeners.add(listener);
    return () => {
      this.statsListeners.delete(listener);
    };
  }

  /**
   * Check if the tunnel has VPN permission from the OS.
   */
  async checkPermission(): Promise<boolean> {
    try {
      if (VpnModule) {
        return await VpnModule.checkVpnPermission();
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Request VPN permission from the OS.
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (VpnModule) {
        return await VpnModule.requestVpnPermission();
      }
      return false;
    } catch {
      return false;
    }
  }

  private async establishTunnel(config: TunnelConfig): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT);

      const attemptConnection = async () => {
        try {
          if (VpnModule) {
            const wgConfig = config as WireGuardConfig;

            if (Platform.OS === 'android') {
              await VpnModule.startTunnel({
                privateKey: wgConfig.privateKey,
                addresses: wgConfig.addresses,
                dns: wgConfig.dns,
                endpoint: `${wgConfig.endpoint.address}:${wgConfig.endpoint.port}`,
                peerPublicKey: wgConfig.peerPublicKey,
                presharedKey: wgConfig.presharedKey || '',
                mtu: wgConfig.mtu,
                allowedIPs: wgConfig.allowedIPs,
                persistentKeepalive: wgConfig.persistentKeepalive,
              });
            } else {
              // iOS uses NEVPNManager
              const configString = new WireGuardConfigBuilder()
                .setKeys(wgConfig.privateKey, wgConfig.publicKey)
                .setAddresses(wgConfig.addresses[0], wgConfig.addresses[1])
                .setDnsServers(wgConfig.dns)
                .toConfigString();

              await VpnModule.startTunnelWithConfig(configString);
            }

            clearTimeout(timeout);
            this.updateState(ConnectionStatus.Connected, {
              tunnelIP: wgConfig.addresses[0],
              connectedSince: new Date(),
            });
            resolve();
          } else {
            // Simulated connection for development
            clearTimeout(timeout);
            this.updateState(ConnectionStatus.Connected, {
              tunnelIP: (config as WireGuardConfig).addresses[0],
              connectedSince: new Date(),
            });
            resolve();
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      attemptConnection();
    });
  }

  private async handleConnectionError(
    error: unknown,
    config: TunnelConfig,
    relay: RelayServer
  ): Promise<void> {
    if (this.retryCount < CONNECTION_RETRY_MAX) {
      this.retryCount++;
      const delay = CONNECTION_RETRY_DELAY * Math.pow(2, this.retryCount - 1);

      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        await this.establishTunnel(config);
        this.startStatsPolling();
        return;
      } catch {
        return this.handleConnectionError(error, config, relay);
      }
    }

    this.emitError({
      code: ErrorCode.ServerUnreachable,
      message: `Failed to connect to ${relay.hostname}`,
      details: error instanceof Error ? error.message : String(error),
      recoverable: true,
    });
    this.updateState(ConnectionStatus.Error);
  }

  private handleNativeStateChange = (event: { state: string; details?: Record<string, unknown> }): void => {
    const statusMap: Record<string, ConnectionStatus> = {
      connected: ConnectionStatus.Connected,
      connecting: ConnectionStatus.Connecting,
      disconnected: ConnectionStatus.Disconnected,
      disconnecting: ConnectionStatus.Disconnecting,
      reconnecting: ConnectionStatus.Reconnecting,
    };

    const status = statusMap[event.state] ?? ConnectionStatus.Error;
    this.updateState(status, event.details as ConnectionDetails | undefined);
  };

  private handleNativeError = (event: { code: string; message: string }): void => {
    this.emitError({
      code: (event.code as ErrorCode) || ErrorCode.InternalError,
      message: event.message,
      recoverable: true,
    });
  };

  private updateState(status: ConnectionStatus, details?: Partial<ConnectionDetails>): void {
    this.currentState = {
      status,
      details: {
        ...this.currentState.details,
        ...details,
        status,
      } as ConnectionDetails,
      timestamp: new Date(),
    };

    for (const listener of this.stateListeners) {
      listener(this.currentState);
    }
  }

  private emitError(error: VpnError): void {
    this.currentState = {
      ...this.currentState,
      error,
      timestamp: new Date(),
    };

    for (const listener of this.stateListeners) {
      listener(this.currentState);
    }
  }

  private startStatsPolling(): void {
    this.stopStatsPolling();

    this.statsInterval = setInterval(async () => {
      if (this.currentState.status !== ConnectionStatus.Connected) {
        this.stopStatsPolling();
        return;
      }

      try {
        let stats: TunnelStats;

        if (VpnModule) {
          const nativeStats = await VpnModule.getTunnelStats();
          stats = {
            bytesReceived: nativeStats.rxBytes,
            bytesSent: nativeStats.txBytes,
            lastHandshake: new Date(nativeStats.lastHandshake),
            latencyMs: nativeStats.latency,
          };
        } else {
          // Simulated stats for development
          stats = {
            bytesReceived: Math.floor(Math.random() * 1000000),
            bytesSent: Math.floor(Math.random() * 500000),
            lastHandshake: new Date(),
            latencyMs: Math.floor(Math.random() * 50) + 10,
          };
        }

        for (const listener of this.statsListeners) {
          listener(stats);
        }
      } catch {
        // Stats polling failure is non-critical
      }
    }, 1000);
  }

  private stopStatsPolling(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Clean up all resources.
   */
  destroy(): void {
    this.stopStatsPolling();
    this.stateListeners.clear();
    this.statsListeners.clear();

    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('onTunnelStateChange');
      this.eventEmitter.removeAllListeners('onTunnelError');
    }
  }
}
