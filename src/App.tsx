/**
 * Root application component.
 * Initializes services, manages global state, and renders the navigator.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { AppNavigator } from './navigation/AppNavigator';
import { VpnService, VpnServiceState } from './services/vpn/VpnService';
import { AccountService } from './services/account/AccountService';
import { DeviceService } from './services/account/DeviceService';
import { RelayService } from './services/relay/RelayService';
import {
  useConnectionStore,
  useAccountStore,
  useRelayStore,
  useSettingsStore,
} from './state/store';
import { RelayServer } from './types/server';
import { Colors } from './theme/colors';

// Suppress known warnings in development
LogBox.ignoreLogs(['NativeModule']);

const App: React.FC = () => {
  // Services (singleton refs)
  const vpnService = useRef<VpnService | null>(null);
  const accountService = useRef(new AccountService());
  const deviceService = useRef(new DeviceService());
  const relayService = useRef(new RelayService());

  // Local UI state
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Global state
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setDetails = useConnectionStore((s) => s.setDetails);
  const setError = useConnectionStore((s) => s.setError);
  const setStats = useConnectionStore((s) => s.setStats);
  const setSelectedRelay = useConnectionStore((s) => s.setSelectedRelay);
  const setKillSwitchActive = useConnectionStore((s) => s.setKillSwitchActive);

  const setAccount = useAccountStore((s) => s.setAccount);
  const setDevice = useAccountStore((s) => s.setDevice);
  const isLoggedIn = useAccountStore((s) => s.isLoggedIn);
  const logout = useAccountStore((s) => s.logout);

  const setCountries = useRelayStore((s) => s.setCountries);
  const vpnSettings = useSettingsStore((s) => s.vpnSettings);

  // Initialize VPN service
  useEffect(() => {
    vpnService.current = new VpnService(vpnSettings);

    const unsubscribe = vpnService.current.onStateChange(
      (state: VpnServiceState) => {
        setStatus(state.connectionStatus);
        setDetails(state.connectionDetails);
        setError(state.error);
        setStats(state.stats);
        setSelectedRelay(state.selectedRelay);
        setKillSwitchActive(state.isKillSwitchActive);
      }
    );

    return () => {
      unsubscribe();
      vpnService.current?.destroy();
    };
  }, []);

  // Update VPN service when settings change
  useEffect(() => {
    vpnService.current?.updateSettings(vpnSettings);
  }, [vpnSettings]);

  // Restore session on launch
  useEffect(() => {
    const restoreSession = async () => {
      const account = await accountService.current.restoreSession();
      if (account) {
        setAccount(account);
        setIsFirstLaunch(false);

        const device = await deviceService.current.restoreDevice();
        if (device) {
          setDevice(device);
          vpnService.current?.setDevice(device);
        }
      }

      // Load relay list
      try {
        const relayList = await relayService.current.getRelayList();
        setCountries(relayList.countries);
      } catch {
        // Will use embedded fallback list
      }
    };

    restoreSession();
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleLogin = useCallback(async (accountNumber: string) => {
    setLoginError(null);
    setIsLoginLoading(true);

    try {
      const account = await accountService.current.login({ accountNumber });
      setAccount(account);
      setIsFirstLaunch(false);

      // Register device
      const device = await deviceService.current.registerDevice(account.token);
      setDevice(device);
      vpnService.current?.setDevice(device);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'Login failed'
      );
    } finally {
      setIsLoginLoading(false);
    }
  }, []);

  const handleCreateAccount = useCallback(async () => {
    setLoginError(null);
    setIsLoginLoading(true);

    try {
      const result = await accountService.current.createAccount();
      const account = accountService.current.getAccount();
      if (account) {
        setAccount(account);
        setIsFirstLaunch(false);

        const device = await deviceService.current.registerDevice(account.token);
        setDevice(device);
        vpnService.current?.setDevice(device);
      }
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'Account creation failed'
      );
    } finally {
      setIsLoginLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await vpnService.current?.disconnect();
    await accountService.current.logout();
    logout();
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      await vpnService.current?.connect();
    } catch (error) {
      console.error('Connect failed:', error);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await vpnService.current?.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, []);

  const handleServerSelect = useCallback((server: RelayServer) => {
    setSelectedRelay(server);
    // If connected, switch to new server
    vpnService.current?.switchServer(server).catch(console.error);
  }, []);

  const handleRedeemVoucher = useCallback(async (code: string) => {
    const result = await accountService.current.redeemVoucher(code);
    const account = accountService.current.getAccount();
    if (account) {
      setAccount(account);
    }
  }, []);

  const handleRemoveDevice = useCallback(async (deviceId: string) => {
    const account = accountService.current.getAccount();
    if (account) {
      await deviceService.current.removeDevice(account.token, deviceId);
      const devices = await deviceService.current.listDevices(account.token);
      useAccountStore.getState().setDevices(devices);
    }
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.backgroundDark}
        translucent={false}
      />
      <AppNavigator
        isLoggedIn={isLoggedIn}
        isFirstLaunch={isFirstLaunch}
        onLogin={handleLogin}
        onCreateAccount={handleCreateAccount}
        onLogout={handleLogout}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onServerSelect={handleServerSelect}
        onRedeemVoucher={handleRedeemVoucher}
        onRemoveDevice={handleRemoveDevice}
        loginError={loginError}
        isLoginLoading={isLoginLoading}
      />
    </>
  );
};

export default App;
