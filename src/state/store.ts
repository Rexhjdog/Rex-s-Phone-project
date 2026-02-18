/**
 * Global state management using Zustand.
 * Centralizes all app state with typed slices.
 */

import { create } from 'zustand';
import {
  ConnectionStatus,
  ConnectionDetails,
  VpnSettings,
  TunnelProtocol,
  DnsConfig,
  VpnError,
} from '../types/vpn';
import {
  Account,
  AccountStatus,
  Device,
} from '../types/account';
import {
  RelayCountry,
  RelayServer,
  RelayConstraints,
  RelaySelectionMode,
} from '../types/server';
import { AppSettings, SplitTunnelingConfig, SplitTunnelApp } from '../types';
import {
  FaceTimeCallStatus,
  FaceTimeCallState,
  FaceTimeMediaType,
  CameraPosition,
} from '../types/facetime';
import { TunnelStats } from '../services/vpn/TunnelManager';

// ─── Connection State ──────────────────────────────────────────────────────

interface ConnectionState {
  status: ConnectionStatus;
  details: ConnectionDetails | null;
  error: VpnError | null;
  stats: TunnelStats | null;
  selectedRelay: RelayServer | null;
  isKillSwitchActive: boolean;

  setStatus: (status: ConnectionStatus) => void;
  setDetails: (details: ConnectionDetails | null) => void;
  setError: (error: VpnError | null) => void;
  setStats: (stats: TunnelStats | null) => void;
  setSelectedRelay: (relay: RelayServer | null) => void;
  setKillSwitchActive: (active: boolean) => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: ConnectionStatus.Disconnected,
  details: null,
  error: null,
  stats: null,
  selectedRelay: null,
  isKillSwitchActive: false,

  setStatus: (status) => set({ status }),
  setDetails: (details) => set({ details }),
  setError: (error) => set({ error }),
  setStats: (stats) => set({ stats }),
  setSelectedRelay: (relay) => set({ selectedRelay: relay }),
  setKillSwitchActive: (active) => set({ isKillSwitchActive: active }),
  reset: () =>
    set({
      status: ConnectionStatus.Disconnected,
      details: null,
      error: null,
      stats: null,
      selectedRelay: null,
    }),
}));

// ─── Account State ─────────────────────────────────────────────────────────

interface AccountState {
  account: Account | null;
  device: Device | null;
  devices: Device[];
  isLoggedIn: boolean;

  setAccount: (account: Account | null) => void;
  setDevice: (device: Device | null) => void;
  setDevices: (devices: Device[]) => void;
  logout: () => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  account: null,
  device: null,
  devices: [],
  isLoggedIn: false,

  setAccount: (account) =>
    set({ account, isLoggedIn: account !== null }),
  setDevice: (device) => set({ device }),
  setDevices: (devices) => set({ devices }),
  logout: () =>
    set({
      account: null,
      device: null,
      devices: [],
      isLoggedIn: false,
    }),
}));

// ─── Relay State ───────────────────────────────────────────────────────────

interface RelayState {
  countries: RelayCountry[];
  constraints: RelayConstraints;
  selectionMode: RelaySelectionMode;
  searchQuery: string;
  isLoading: boolean;

  setCountries: (countries: RelayCountry[]) => void;
  setConstraints: (constraints: RelayConstraints) => void;
  setSelectionMode: (mode: RelaySelectionMode) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useRelayStore = create<RelayState>((set) => ({
  countries: [],
  constraints: {},
  selectionMode: RelaySelectionMode.Auto,
  searchQuery: '',
  isLoading: false,

  setCountries: (countries) => set({ countries }),
  setConstraints: (constraints) => set({ constraints }),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// ─── Settings State ────────────────────────────────────────────────────────

interface SettingsState {
  vpnSettings: VpnSettings;
  appSettings: AppSettings;

  updateVpnSettings: (updates: Partial<VpnSettings>) => void;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  updateDns: (updates: Partial<DnsConfig>) => void;
  updateSplitTunneling: (updates: Partial<SplitTunnelingConfig>) => void;
  resetSettings: () => void;
}

const defaultVpnSettings: VpnSettings = {
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
  obfuscation: {
    enabled: false,
    mode: 'none',
  },
  quantumResistance: {
    enabled: false,
    pqKeyExchange: false,
  },
  bridge: {
    enabled: false,
    type: 'normal',
  },
  multihop: {
    enabled: false,
  },
  mtu: 1380,
  wireguardPort: 'auto',
  autoConnect: false,
  allowLan: false,
  killSwitch: true,
  lockdownMode: false,
};

const defaultAppSettings: AppSettings = {
  launchOnStartup: false,
  showNotifications: true,
  theme: 'dark',
  language: 'en',
  betaProgram: false,
  splitTunneling: {
    enabled: false,
    mode: 'exclude',
    apps: [],
  },
};

export const useSettingsStore = create<SettingsState>((set) => ({
  vpnSettings: defaultVpnSettings,
  appSettings: defaultAppSettings,

  updateVpnSettings: (updates) =>
    set((state) => ({
      vpnSettings: { ...state.vpnSettings, ...updates },
    })),

  updateAppSettings: (updates) =>
    set((state) => ({
      appSettings: { ...state.appSettings, ...updates },
    })),

  updateDns: (updates) =>
    set((state) => ({
      vpnSettings: {
        ...state.vpnSettings,
        dns: { ...state.vpnSettings.dns, ...updates },
      },
    })),

  updateSplitTunneling: (updates) =>
    set((state) => ({
      appSettings: {
        ...state.appSettings,
        splitTunneling: {
          ...state.appSettings.splitTunneling,
          ...updates,
        },
      },
    })),

  resetSettings: () =>
    set({
      vpnSettings: defaultVpnSettings,
      appSettings: defaultAppSettings,
    }),
}));

// ─── FaceTime State ───────────────────────────────────────────────────────

interface FaceTimeState {
  callState: FaceTimeCallState;
  recentLinks: string[];

  setCallState: (state: FaceTimeCallState) => void;
  addRecentLink: (link: string) => void;
  clearRecentLinks: () => void;
  reset: () => void;
}

const defaultFaceTimeCallState: FaceTimeCallState = {
  status: FaceTimeCallStatus.Idle,
  mediaType: FaceTimeMediaType.AudioVideo,
  participants: [],
  localParticipant: null,
  isMuted: false,
  isVideoEnabled: true,
  isSpeakerOn: true,
  cameraPosition: CameraPosition.Front,
  callDuration: 0,
  error: null,
};

export const useFaceTimeStore = create<FaceTimeState>((set) => ({
  callState: defaultFaceTimeCallState,
  recentLinks: [],

  setCallState: (callState) => set({ callState }),
  addRecentLink: (link) =>
    set((state) => ({
      recentLinks: [link, ...state.recentLinks.filter((l) => l !== link)].slice(
        0,
        10
      ),
    })),
  clearRecentLinks: () => set({ recentLinks: [] }),
  reset: () =>
    set({
      callState: defaultFaceTimeCallState,
      recentLinks: [],
    }),
}));
