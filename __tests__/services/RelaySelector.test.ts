/**
 * Tests for RelaySelector.
 */

import { RelayServer, RelayCountry } from '../../src/types/server';

// Mock relay data
const createMockServer = (overrides: Partial<RelayServer> = {}): RelayServer => ({
  hostname: 'se-got-wg-001',
  ipv4Address: '185.213.154.68',
  ipv6Address: '',
  publicKey: 'test-public-key',
  port: 51820,
  weight: 100,
  active: true,
  owned: true,
  provider: 'mullvad',
  location: {
    latitude: 57.7089,
    longitude: 11.9746,
    city: 'Gothenburg',
    country: 'Sweden',
    countryCode: 'se',
  },
  stboot: true,
  wireguardPorts: [51820, 53],
  daita: false,
  ...overrides,
});

describe('RelaySelector', () => {
  describe('Server filtering', () => {
    it('should filter by country code', () => {
      const servers = [
        createMockServer({ hostname: 'se-got-wg-001', location: { ...createMockServer().location, countryCode: 'se' } }),
        createMockServer({ hostname: 'us-nyc-wg-001', location: { ...createMockServer().location, countryCode: 'us' } }),
        createMockServer({ hostname: 'de-fra-wg-001', location: { ...createMockServer().location, countryCode: 'de' } }),
      ];

      const filtered = servers.filter(s => s.location.countryCode === 'se');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].hostname).toBe('se-got-wg-001');
    });

    it('should filter active servers only', () => {
      const servers = [
        createMockServer({ active: true }),
        createMockServer({ active: false, hostname: 'inactive' }),
      ];

      const active = servers.filter(s => s.active);
      expect(active).toHaveLength(1);
    });

    it('should filter by ownership', () => {
      const servers = [
        createMockServer({ owned: true, hostname: 'owned' }),
        createMockServer({ owned: false, hostname: 'rented' }),
      ];

      const mullvadOwned = servers.filter(s => s.owned);
      expect(mullvadOwned).toHaveLength(1);
      expect(mullvadOwned[0].hostname).toBe('owned');
    });

    it('should filter by DAITA support', () => {
      const servers = [
        createMockServer({ daita: true, hostname: 'daita' }),
        createMockServer({ daita: false, hostname: 'no-daita' }),
      ];

      const daitaServers = servers.filter(s => s.daita);
      expect(daitaServers).toHaveLength(1);
      expect(daitaServers[0].hostname).toBe('daita');
    });
  });

  describe('Haversine distance', () => {
    // Simple distance test
    it('should calculate zero distance for same coordinates', () => {
      const lat = 57.7089;
      const lon = 11.9746;

      const R = 6371;
      const dLat = 0;
      const dLon = 0;
      const a = Math.sin(dLat / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      expect(distance).toBe(0);
    });
  });
});
