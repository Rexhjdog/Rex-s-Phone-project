/**
 * Relay list service.
 * Fetches, caches, and provides the Mullvad relay server list.
 */

import {
  RelayList,
  RelayCountry,
  RelayCity,
  RelayServer,
  ServerLatency,
} from '../../types/server';
import { SecureStorage } from '../storage/SecureStorage';
import {
  API_BASE_URL,
  RELAY_LIST_CACHE_DURATION,
  LATENCY_CHECK_TIMEOUT,
} from '../../config/constants';

const RELAY_LIST_STORAGE_KEY = 'mullvad_relay_list';

export class RelayService {
  private relayList: RelayList | null = null;
  private storage: SecureStorage;
  private latencyCache: Map<string, ServerLatency> = new Map();

  constructor() {
    this.storage = new SecureStorage();
  }

  /**
   * Fetch the relay list from the API or cache.
   */
  async getRelayList(forceRefresh: boolean = false): Promise<RelayList> {
    // Check cache first
    if (!forceRefresh && this.relayList) {
      const age = Date.now() - this.relayList.lastUpdated.getTime();
      if (age < RELAY_LIST_CACHE_DURATION) {
        return this.relayList;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/v1/relays`, {
        headers: this.relayList?.etag
          ? { 'If-None-Match': this.relayList.etag }
          : {},
      });

      if (response.status === 304 && this.relayList) {
        this.relayList.lastUpdated = new Date();
        return this.relayList;
      }

      if (!response.ok) {
        throw new Error(`Relay list fetch failed: ${response.status}`);
      }

      const data = await response.json();
      const etag = response.headers.get('ETag') || undefined;

      this.relayList = this.parseRelayList(data, etag);
      await this.persistRelayList();

      return this.relayList;
    } catch (error) {
      // Try loading from storage
      const cached = await this.loadCachedRelayList();
      if (cached) {
        this.relayList = cached;
        return cached;
      }

      // Fall back to embedded relay list
      return this.getEmbeddedRelayList();
    }
  }

  /**
   * Get all countries.
   */
  getCountries(): RelayCountry[] {
    return this.relayList?.countries ?? [];
  }

  /**
   * Get cities for a country.
   */
  getCities(countryCode: string): RelayCity[] {
    const country = this.relayList?.countries.find(
      (c) => c.code === countryCode
    );
    return country?.cities ?? [];
  }

  /**
   * Get servers for a city.
   */
  getServers(countryCode: string, cityCode: string): RelayServer[] {
    const cities = this.getCities(countryCode);
    const city = cities.find((c) => c.code === cityCode);
    return city?.servers.filter((s) => s.active) ?? [];
  }

  /**
   * Get a specific server by hostname.
   */
  getServer(hostname: string): RelayServer | null {
    if (!this.relayList) return null;

    for (const country of this.relayList.countries) {
      for (const city of country.cities) {
        const server = city.servers.find((s) => s.hostname === hostname);
        if (server) return server;
      }
    }
    return null;
  }

  /**
   * Get total number of active servers.
   */
  getServerCount(): number {
    if (!this.relayList) return 0;

    let count = 0;
    for (const country of this.relayList.countries) {
      for (const city of country.cities) {
        count += city.servers.filter((s) => s.active).length;
      }
    }
    return count;
  }

  /**
   * Measure latency to a server.
   */
  async measureLatency(server: RelayServer): Promise<number> {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        LATENCY_CHECK_TIMEOUT
      );

      await fetch(`http://${server.ipv4Address}:${server.port}`, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => {});

      clearTimeout(timeout);
      const latency = Date.now() - start;

      this.latencyCache.set(server.hostname, {
        hostname: server.hostname,
        latencyMs: latency,
        measuredAt: new Date(),
      });

      return latency;
    } catch {
      return -1;
    }
  }

  /**
   * Get cached latency for a server.
   */
  getLatency(hostname: string): number | null {
    const cached = this.latencyCache.get(hostname);
    if (!cached) return null;

    // Invalidate after 5 minutes
    if (Date.now() - cached.measuredAt.getTime() > 300000) {
      this.latencyCache.delete(hostname);
      return null;
    }

    return cached.latencyMs;
  }

  /**
   * Search servers by name, city, or country.
   */
  search(query: string): RelayServer[] {
    if (!this.relayList || !query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: RelayServer[] = [];

    for (const country of this.relayList.countries) {
      for (const city of country.cities) {
        for (const server of city.servers) {
          if (!server.active) continue;

          if (
            server.hostname.toLowerCase().includes(lowerQuery) ||
            city.name.toLowerCase().includes(lowerQuery) ||
            country.name.toLowerCase().includes(lowerQuery) ||
            country.code.toLowerCase() === lowerQuery
          ) {
            results.push(server);
          }
        }
      }
    }

    return results;
  }

  private parseRelayList(data: Record<string, unknown>, etag?: string): RelayList {
    const countries: RelayCountry[] = (data.countries as Array<Record<string, unknown>> || []).map(
      (c: Record<string, unknown>) => ({
        name: c.name as string,
        code: c.code as string,
        cities: (c.cities as Array<Record<string, unknown>> || []).map(
          (city: Record<string, unknown>) => ({
            name: city.name as string,
            code: city.code as string,
            latitude: city.latitude as number,
            longitude: city.longitude as number,
            servers: (city.relays as Array<Record<string, unknown>> || []).map(
              (r: Record<string, unknown>) => ({
                hostname: r.hostname as string,
                ipv4Address: r.ipv4_addr_in as string,
                ipv6Address: r.ipv6_addr_in as string || '',
                publicKey: r.public_key as string,
                port: (r.port as number) || 51820,
                weight: (r.weight as number) || 100,
                active: r.active as boolean !== false,
                owned: r.owned as boolean || false,
                provider: r.provider as string || 'unknown',
                location: {
                  latitude: city.latitude as number,
                  longitude: city.longitude as number,
                  city: city.name as string,
                  country: c.name as string,
                  countryCode: c.code as string,
                },
                stboot: r.stboot as boolean || false,
                wireguardPorts: (r.wireguard_ports as number[]) || [51820],
                daita: r.daita as boolean || false,
              })
            ),
          })
        ),
      })
    );

    return {
      countries,
      lastUpdated: new Date(),
      etag,
    };
  }

  private getEmbeddedRelayList(): RelayList {
    // Embedded fallback relay list with a selection of key servers
    return {
      countries: [
        {
          name: 'Sweden',
          code: 'se',
          cities: [
            {
              name: 'Gothenburg',
              code: 'got',
              latitude: 57.7089,
              longitude: 11.9746,
              servers: [
                {
                  hostname: 'se-got-wg-001',
                  ipv4Address: '185.213.154.68',
                  ipv6Address: '2a03:1b20:5:f011::a01f',
                  publicKey: 'EMBEDDED_KEY_PLACEHOLDER',
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
                  daita: true,
                },
              ],
            },
            {
              name: 'Stockholm',
              code: 'sto',
              latitude: 59.3293,
              longitude: 18.0686,
              servers: [
                {
                  hostname: 'se-sto-wg-001',
                  ipv4Address: '185.213.154.69',
                  ipv6Address: '2a03:1b20:5:f012::a01f',
                  publicKey: 'EMBEDDED_KEY_PLACEHOLDER',
                  port: 51820,
                  weight: 100,
                  active: true,
                  owned: true,
                  provider: 'mullvad',
                  location: {
                    latitude: 59.3293,
                    longitude: 18.0686,
                    city: 'Stockholm',
                    country: 'Sweden',
                    countryCode: 'se',
                  },
                  stboot: true,
                  wireguardPorts: [51820, 53],
                  daita: true,
                },
              ],
            },
          ],
        },
        {
          name: 'United States',
          code: 'us',
          cities: [
            {
              name: 'New York',
              code: 'nyc',
              latitude: 40.7128,
              longitude: -74.006,
              servers: [
                {
                  hostname: 'us-nyc-wg-001',
                  ipv4Address: '193.27.12.1',
                  ipv6Address: '',
                  publicKey: 'EMBEDDED_KEY_PLACEHOLDER',
                  port: 51820,
                  weight: 100,
                  active: true,
                  owned: false,
                  provider: 'datapacket',
                  location: {
                    latitude: 40.7128,
                    longitude: -74.006,
                    city: 'New York',
                    country: 'United States',
                    countryCode: 'us',
                  },
                  stboot: false,
                  wireguardPorts: [51820],
                  daita: false,
                },
              ],
            },
          ],
        },
        {
          name: 'Germany',
          code: 'de',
          cities: [
            {
              name: 'Frankfurt',
              code: 'fra',
              latitude: 50.1109,
              longitude: 8.6821,
              servers: [
                {
                  hostname: 'de-fra-wg-001',
                  ipv4Address: '185.213.155.68',
                  ipv6Address: '',
                  publicKey: 'EMBEDDED_KEY_PLACEHOLDER',
                  port: 51820,
                  weight: 100,
                  active: true,
                  owned: true,
                  provider: 'mullvad',
                  location: {
                    latitude: 50.1109,
                    longitude: 8.6821,
                    city: 'Frankfurt',
                    country: 'Germany',
                    countryCode: 'de',
                  },
                  stboot: true,
                  wireguardPorts: [51820, 53],
                  daita: true,
                },
              ],
            },
          ],
        },
      ],
      lastUpdated: new Date(),
    };
  }

  private async persistRelayList(): Promise<void> {
    if (this.relayList) {
      await this.storage.set(
        RELAY_LIST_STORAGE_KEY,
        JSON.stringify(this.relayList)
      );
    }
  }

  private async loadCachedRelayList(): Promise<RelayList | null> {
    try {
      const data = await this.storage.get(RELAY_LIST_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.lastUpdated = new Date(parsed.lastUpdated);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}
