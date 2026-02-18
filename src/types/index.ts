export * from './vpn';
export * from './account';
export * from './server';

/**
 * Global app types.
 */

export interface AppSettings {
  launchOnStartup: boolean;
  showNotifications: boolean;
  theme: 'dark' | 'light' | 'system';
  language: string;
  betaProgram: boolean;
  splitTunneling: SplitTunnelingConfig;
}

export interface SplitTunnelingConfig {
  enabled: boolean;
  mode: 'exclude' | 'include';
  apps: SplitTunnelApp[];
}

export interface SplitTunnelApp {
  packageName: string;
  appName: string;
  icon?: string;
  enabled: boolean;
}

export interface NotificationPayload {
  id: string;
  type: 'connection' | 'account' | 'update' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: string;
}

export type ScreenRoute =
  | 'Welcome'
  | 'Login'
  | 'Connect'
  | 'ServerList'
  | 'Settings'
  | 'Account'
  | 'SplitTunnel'
  | 'VpnSettings'
  | 'DnsSettings'
  | 'About';
