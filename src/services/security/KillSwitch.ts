/**
 * Kill switch implementation.
 * Blocks all network traffic when the VPN connection drops unexpectedly.
 * Uses native platform APIs (Android VPN Service always-on / iOS NEVPNManager).
 */

import { NativeModules, Platform } from 'react-native';

const { VpnModule } = NativeModules;

export enum KillSwitchState {
  Disabled = 'disabled',
  Active = 'active',
  Blocking = 'blocking',
}

export class KillSwitch {
  private state: KillSwitchState = KillSwitchState.Disabled;
  private lockdownMode: boolean = false;

  /**
   * Activate the kill switch.
   * Configures the OS to block traffic outside the VPN tunnel.
   */
  activate(): void {
    this.state = KillSwitchState.Active;

    try {
      if (VpnModule) {
        if (Platform.OS === 'android') {
          // Android: Uses VpnService.Builder.setBlocking()
          // and configures the VPN to be "always-on"
          VpnModule.enableKillSwitch(true);
        } else {
          // iOS: Uses NEVPNProtocol.disconnectOnSleep = false
          // and NEOnDemandRule for always-on behavior
          VpnModule.setOnDemandRules([
            {
              action: 'connect',
              interfaceTypeMatch: 'any',
            },
          ]);
        }
      }
    } catch {
      console.warn('Kill switch activation failed - native module unavailable');
    }
  }

  /**
   * Deactivate the kill switch.
   */
  deactivate(): void {
    if (this.lockdownMode) {
      // In lockdown mode, kill switch cannot be deactivated
      return;
    }

    this.state = KillSwitchState.Disabled;

    try {
      if (VpnModule) {
        if (Platform.OS === 'android') {
          VpnModule.enableKillSwitch(false);
        } else {
          VpnModule.setOnDemandRules([]);
        }
      }
    } catch {
      console.warn('Kill switch deactivation failed');
    }
  }

  /**
   * Enter blocking mode (VPN disconnected but kill switch active).
   * All traffic is blocked until VPN reconnects or kill switch is disabled.
   */
  enterBlockingMode(): void {
    this.state = KillSwitchState.Blocking;

    try {
      if (VpnModule) {
        VpnModule.blockAllTraffic();
      }
    } catch {
      console.warn('Traffic blocking failed');
    }
  }

  /**
   * Enable lockdown mode.
   * Kill switch stays active even after manual disconnect.
   */
  enableLockdownMode(): void {
    this.lockdownMode = true;
    this.activate();

    try {
      if (VpnModule && Platform.OS === 'android') {
        VpnModule.setAlwaysOnVpn(true);
        VpnModule.setLockdownEnabled(true);
      }
    } catch {
      console.warn('Lockdown mode setup failed');
    }
  }

  /**
   * Disable lockdown mode.
   */
  disableLockdownMode(): void {
    this.lockdownMode = false;

    try {
      if (VpnModule && Platform.OS === 'android') {
        VpnModule.setLockdownEnabled(false);
      }
    } catch {
      console.warn('Lockdown mode teardown failed');
    }
  }

  /**
   * Get current kill switch state.
   */
  getState(): KillSwitchState {
    return this.state;
  }

  /**
   * Check if kill switch is active (either active or blocking).
   */
  isActive(): boolean {
    return this.state !== KillSwitchState.Disabled;
  }

  /**
   * Check if traffic is being blocked.
   */
  isBlocking(): boolean {
    return this.state === KillSwitchState.Blocking;
  }

  /**
   * Check if lockdown mode is enabled.
   */
  isLockdownEnabled(): boolean {
    return this.lockdownMode;
  }
}
