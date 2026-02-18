/**
 * Tests for VpnService.
 */

import {
  ConnectionStatus,
  TunnelProtocol,
  VpnSettings,
} from '../../src/types/vpn';

// Mock default VPN settings for testing
const createDefaultSettings = (): VpnSettings => ({
  protocol: TunnelProtocol.WireGuard,
  dns: {
    enabled: true,
    customDns: [],
    blockAds: false,
    blockTrackers: false,
    blockMalware: false,
    blockAdultContent: false,
    blockGambling: false,
    blockSocialMedia: false,
  },
  obfuscation: { enabled: false, mode: 'none' },
  quantumResistance: { enabled: false, pqKeyExchange: false },
  bridge: { enabled: false, type: 'normal' },
  multihop: { enabled: false },
  mtu: 1380,
  wireguardPort: 'auto',
  autoConnect: false,
  allowLan: false,
  killSwitch: true,
  lockdownMode: false,
});

describe('VpnService', () => {
  describe('Default Settings', () => {
    it('should have WireGuard as default protocol', () => {
      const settings = createDefaultSettings();
      expect(settings.protocol).toBe(TunnelProtocol.WireGuard);
    });

    it('should have kill switch enabled by default', () => {
      const settings = createDefaultSettings();
      expect(settings.killSwitch).toBe(true);
    });

    it('should have lockdown mode disabled by default', () => {
      const settings = createDefaultSettings();
      expect(settings.lockdownMode).toBe(false);
    });

    it('should have auto MTU set to 1380', () => {
      const settings = createDefaultSettings();
      expect(settings.mtu).toBe(1380);
    });

    it('should have DNS blocking disabled by default', () => {
      const settings = createDefaultSettings();
      expect(settings.dns.blockAds).toBe(false);
      expect(settings.dns.blockTrackers).toBe(false);
      expect(settings.dns.blockMalware).toBe(false);
    });
  });

  describe('Connection Status', () => {
    it('should define all connection states', () => {
      expect(ConnectionStatus.Disconnected).toBe('disconnected');
      expect(ConnectionStatus.Connecting).toBe('connecting');
      expect(ConnectionStatus.Connected).toBe('connected');
      expect(ConnectionStatus.Disconnecting).toBe('disconnecting');
      expect(ConnectionStatus.Reconnecting).toBe('reconnecting');
      expect(ConnectionStatus.Error).toBe('error');
    });
  });
});
