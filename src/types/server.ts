/**
 * Server/relay infrastructure types.
 * Models the Mullvad relay network hierarchy.
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  countryCode: string;
}

export interface RelayServer {
  hostname: string;
  ipv4Address: string;
  ipv6Address: string;
  publicKey: string;
  port: number;
  weight: number;
  active: boolean;
  owned: boolean;
  provider: string;
  location: GeoLocation;
  stboot: boolean;
  wireguardPorts: number[];
  multihopPort?: number;
  daita: boolean;
}

export interface RelayCity {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  servers: RelayServer[];
}

export interface RelayCountry {
  name: string;
  code: string;
  cities: RelayCity[];
}

export interface RelayList {
  countries: RelayCountry[];
  lastUpdated: Date;
  etag?: string;
}

export enum RelaySelectionMode {
  Auto = 'auto',
  Country = 'country',
  City = 'city',
  Server = 'server',
}

export interface RelayConstraints {
  location?: {
    country?: string;
    city?: string;
    hostname?: string;
  };
  providers?: string[];
  ownership?: 'any' | 'mullvad' | 'rented';
  daita?: boolean;
}

export interface RelaySelection {
  mode: RelaySelectionMode;
  constraints: RelayConstraints;
  selectedRelay?: RelayServer;
}

export interface ServerLatency {
  hostname: string;
  latencyMs: number;
  measuredAt: Date;
}

export interface BridgeRelay {
  hostname: string;
  ipv4Address: string;
  port: number;
  protocol: 'shadowsocks';
  weight: number;
  location: GeoLocation;
}
