/**
 * Intelligent relay selection algorithm.
 * Picks the best server based on constraints, latency, load, and geography.
 */

import {
  RelayServer,
  RelayConstraints,
  RelaySelectionMode,
  RelayCountry,
  RelayCity,
} from '../../types/server';
import { TunnelProtocol } from '../../types/vpn';
import { RelayService } from './RelayService';

export interface RelaySortCriteria {
  preferOwned: boolean;
  preferLowLatency: boolean;
  preferDAITA: boolean;
}

export class RelaySelector {
  private relayService: RelayService;
  private sortCriteria: RelaySortCriteria;

  constructor(relayService?: RelayService) {
    this.relayService = relayService ?? new RelayService();
    this.sortCriteria = {
      preferOwned: true,
      preferLowLatency: true,
      preferDAITA: false,
    };
  }

  /**
   * Select the best relay matching the given constraints.
   */
  async selectRelay(
    constraints: RelayConstraints,
    _protocol: TunnelProtocol = TunnelProtocol.WireGuard
  ): Promise<RelayServer | null> {
    const relayList = await this.relayService.getRelayList();
    let candidates: RelayServer[] = [];

    // Gather all active servers
    for (const country of relayList.countries) {
      for (const city of country.cities) {
        for (const server of city.servers) {
          if (server.active) {
            candidates.push(server);
          }
        }
      }
    }

    // Apply constraints
    candidates = this.applyConstraints(candidates, constraints);

    if (candidates.length === 0) {
      return null;
    }

    // Score and sort candidates
    candidates = this.scoreCandidates(candidates);

    // Pick from top candidates with weighted randomness
    return this.weightedSelect(candidates);
  }

  /**
   * Get all servers matching constraints, grouped by country and city.
   */
  async getMatchingRelays(
    constraints: RelayConstraints
  ): Promise<RelayCountry[]> {
    const relayList = await this.relayService.getRelayList();

    return relayList.countries
      .map((country) => ({
        ...country,
        cities: country.cities
          .map((city) => ({
            ...city,
            servers: city.servers.filter(
              (server) =>
                server.active &&
                this.matchesConstraints(server, constraints)
            ),
          }))
          .filter((city) => city.servers.length > 0),
      }))
      .filter((country) => country.cities.length > 0);
  }

  /**
   * Find the closest server to the user's current location.
   */
  async findClosestRelay(
    userLat: number,
    userLon: number
  ): Promise<RelayServer | null> {
    const relayList = await this.relayService.getRelayList();
    let closestServer: RelayServer | null = null;
    let minDistance = Infinity;

    for (const country of relayList.countries) {
      for (const city of country.cities) {
        const distance = this.haversineDistance(
          userLat,
          userLon,
          city.latitude,
          city.longitude
        );

        for (const server of city.servers) {
          if (server.active && distance < minDistance) {
            minDistance = distance;
            closestServer = server;
          }
        }
      }
    }

    return closestServer;
  }

  /**
   * Update sorting preferences.
   */
  setSortCriteria(criteria: Partial<RelaySortCriteria>): void {
    this.sortCriteria = { ...this.sortCriteria, ...criteria };
  }

  private applyConstraints(
    servers: RelayServer[],
    constraints: RelayConstraints
  ): RelayServer[] {
    return servers.filter((server) => this.matchesConstraints(server, constraints));
  }

  private matchesConstraints(
    server: RelayServer,
    constraints: RelayConstraints
  ): boolean {
    // Location filter
    if (constraints.location) {
      if (
        constraints.location.country &&
        server.location.countryCode !== constraints.location.country
      ) {
        return false;
      }
      if (
        constraints.location.city &&
        !server.hostname.includes(constraints.location.city)
      ) {
        return false;
      }
      if (
        constraints.location.hostname &&
        server.hostname !== constraints.location.hostname
      ) {
        return false;
      }
    }

    // Provider filter
    if (
      constraints.providers &&
      constraints.providers.length > 0 &&
      !constraints.providers.includes(server.provider)
    ) {
      return false;
    }

    // Ownership filter
    if (constraints.ownership === 'mullvad' && !server.owned) {
      return false;
    }
    if (constraints.ownership === 'rented' && server.owned) {
      return false;
    }

    // DAITA filter
    if (constraints.daita && !server.daita) {
      return false;
    }

    return true;
  }

  private scoreCandidates(servers: RelayServer[]): RelayServer[] {
    const scored = servers.map((server) => {
      let score = server.weight;

      // Prefer Mullvad-owned servers
      if (this.sortCriteria.preferOwned && server.owned) {
        score += 50;
      }

      // Prefer DAITA-capable servers
      if (this.sortCriteria.preferDAITA && server.daita) {
        score += 30;
      }

      // Factor in cached latency
      if (this.sortCriteria.preferLowLatency) {
        const latency = this.relayService.getLatency(server.hostname);
        if (latency !== null && latency > 0) {
          // Lower latency = higher score bonus
          score += Math.max(0, 100 - latency);
        }
      }

      return { server, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.server);
  }

  /**
   * Weighted random selection from top candidates.
   * Avoids always picking the same server.
   */
  private weightedSelect(servers: RelayServer[]): RelayServer {
    // Consider top 5 candidates
    const topCandidates = servers.slice(0, Math.min(5, servers.length));

    const totalWeight = topCandidates.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const server of topCandidates) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }

    return topCandidates[0];
  }

  /**
   * Calculate distance between two coordinates using the Haversine formula.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
