/**
 * Custom React hooks for VPN app state and side effects.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  useConnectionStore,
  useAccountStore,
  useSettingsStore,
  useRelayStore,
  useFaceTimeStore,
} from './store';
import { ConnectionStatus } from '../types/vpn';
import { FaceTimeCallStatus } from '../types/facetime';
import { formatDuration, formatBytes } from '../utils/format';

/**
 * Hook for connection status with derived display values.
 */
export function useConnectionStatus() {
  const status = useConnectionStore((s) => s.status);
  const details = useConnectionStore((s) => s.details);
  const error = useConnectionStore((s) => s.error);
  const stats = useConnectionStore((s) => s.stats);
  const selectedRelay = useConnectionStore((s) => s.selectedRelay);

  const isConnected = status === ConnectionStatus.Connected;
  const isConnecting =
    status === ConnectionStatus.Connecting ||
    status === ConnectionStatus.Reconnecting;
  const isDisconnected = status === ConnectionStatus.Disconnected;
  const hasError = status === ConnectionStatus.Error;

  return {
    status,
    details,
    error,
    stats,
    selectedRelay,
    isConnected,
    isConnecting,
    isDisconnected,
    hasError,
  };
}

/**
 * Hook for connection timer display.
 */
export function useConnectionTimer() {
  const [elapsed, setElapsed] = useState('00:00:00');
  const details = useConnectionStore((s) => s.details);
  const status = useConnectionStore((s) => s.status);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === ConnectionStatus.Connected && details?.connectedSince) {
      const startTime = new Date(details.connectedSince);

      const updateTimer = () => {
        const diff = Date.now() - startTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsed(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsed('00:00:00');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status, details?.connectedSince]);

  return elapsed;
}

/**
 * Hook for formatted traffic stats.
 */
export function useTrafficStats() {
  const stats = useConnectionStore((s) => s.stats);

  return {
    download: stats ? formatBytes(stats.bytesReceived) : '0 B',
    upload: stats ? formatBytes(stats.bytesSent) : '0 B',
    latency: stats ? `${stats.latencyMs} ms` : '--',
    hasData: stats !== null,
  };
}

/**
 * Hook for account status.
 */
export function useAccountStatus() {
  const account = useAccountStore((s) => s.account);
  const device = useAccountStore((s) => s.device);
  const isLoggedIn = useAccountStore((s) => s.isLoggedIn);

  const isExpired = account
    ? new Date() > account.expiry
    : true;

  const daysRemaining = account
    ? Math.max(
        0,
        Math.floor(
          (account.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return {
    account,
    device,
    isLoggedIn,
    isExpired,
    daysRemaining,
  };
}

/**
 * Hook for VPN settings.
 */
export function useVpnSettings() {
  const vpnSettings = useSettingsStore((s) => s.vpnSettings);
  const updateVpnSettings = useSettingsStore((s) => s.updateVpnSettings);
  const updateDns = useSettingsStore((s) => s.updateDns);

  return {
    settings: vpnSettings,
    updateSettings: updateVpnSettings,
    updateDns,
  };
}

/**
 * Hook for relay selection.
 */
export function useRelaySelection() {
  const countries = useRelayStore((s) => s.countries);
  const constraints = useRelayStore((s) => s.constraints);
  const searchQuery = useRelayStore((s) => s.searchQuery);
  const setConstraints = useRelayStore((s) => s.setConstraints);
  const setSearchQuery = useRelayStore((s) => s.setSearchQuery);

  const filteredCountries = searchQuery
    ? countries
        .map((country) => ({
          ...country,
          cities: country.cities
            .map((city) => ({
              ...city,
              servers: city.servers.filter(
                (s) =>
                  s.hostname
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  city.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  country.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
              ),
            }))
            .filter((city) => city.servers.length > 0),
        }))
        .filter((country) => country.cities.length > 0)
    : countries;

  return {
    countries: filteredCountries,
    allCountries: countries,
    constraints,
    searchQuery,
    setConstraints,
    setSearchQuery,
  };
}

/**
 * Hook for FaceTime call state.
 */
export function useFaceTimeCall() {
  const callState = useFaceTimeStore((s) => s.callState);
  const recentLinks = useFaceTimeStore((s) => s.recentLinks);
  const setCallState = useFaceTimeStore((s) => s.setCallState);
  const addRecentLink = useFaceTimeStore((s) => s.addRecentLink);

  const isInCall =
    callState.status === FaceTimeCallStatus.Connected ||
    callState.status === FaceTimeCallStatus.Connecting ||
    callState.status === FaceTimeCallStatus.Reconnecting;

  const isIdle = callState.status === FaceTimeCallStatus.Idle;

  return {
    callState,
    recentLinks,
    setCallState,
    addRecentLink,
    isInCall,
    isIdle,
  };
}
