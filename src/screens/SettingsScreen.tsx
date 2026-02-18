/**
 * Settings screen.
 * Central configuration hub for all VPN and app settings.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Header } from '../components/Header';
import { SettingsRow, SettingsSection } from '../components/SettingsRow';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useVpnSettings } from '../state/hooks';
import { useSettingsStore } from '../state/store';
import { TunnelProtocol } from '../types/vpn';
import { supportsSplitTunneling, supportsLockdownMode } from '../utils/platform';
import { APP_LINKS } from '../config/constants';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToVpnSettings: () => void;
  onNavigateToDnsSettings: () => void;
  onNavigateToSplitTunnel: () => void;
  onNavigateToAbout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onNavigateToVpnSettings,
  onNavigateToDnsSettings,
  onNavigateToSplitTunnel,
  onNavigateToAbout,
}) => {
  const { settings, updateSettings, updateDns } = useVpnSettings();
  const appSettings = useSettingsStore((s) => s.appSettings);
  const updateAppSettings = useSettingsStore((s) => s.updateAppSettings);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" showBack onBack={onBack} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* VPN Settings */}
        <SettingsSection title="VPN">
          <SettingsRow
            label="VPN protocol"
            value={settings.protocol === TunnelProtocol.WireGuard ? 'WireGuard' : 'OpenVPN'}
            onPress={onNavigateToVpnSettings}
            showArrow
          />
          <SettingsRow
            label="WireGuard port"
            value={settings.wireguardPort === 'auto' ? 'Automatic' : String(settings.wireguardPort)}
            onPress={onNavigateToVpnSettings}
            showArrow
          />
          <SettingsRow
            label="Obfuscation"
            value={settings.obfuscation.enabled ? settings.obfuscation.mode : 'Off'}
            onPress={onNavigateToVpnSettings}
            showArrow
          />
          <SettingsRow
            label="Quantum resistance"
            toggle
            toggleValue={settings.quantumResistance.enabled}
            onToggle={(value) =>
              updateSettings({
                quantumResistance: { ...settings.quantumResistance, enabled: value },
              })
            }
          />
          <SettingsRow
            label="Multihop"
            description="Route through two servers for extra privacy"
            toggle
            toggleValue={settings.multihop.enabled}
            onToggle={(value) =>
              updateSettings({
                multihop: { ...settings.multihop, enabled: value },
              })
            }
          />
        </SettingsSection>

        {/* DNS */}
        <SettingsSection title="DNS">
          <SettingsRow
            label="DNS content blockers"
            onPress={onNavigateToDnsSettings}
            showArrow
          />
          <SettingsRow
            label="Block ads"
            toggle
            toggleValue={settings.dns.blockAds}
            onToggle={(value) => updateDns({ blockAds: value })}
          />
          <SettingsRow
            label="Block trackers"
            toggle
            toggleValue={settings.dns.blockTrackers}
            onToggle={(value) => updateDns({ blockTrackers: value })}
          />
          <SettingsRow
            label="Block malware"
            toggle
            toggleValue={settings.dns.blockMalware}
            onToggle={(value) => updateDns({ blockMalware: value })}
          />
          <SettingsRow
            label="Custom DNS"
            value={settings.dns.customDns.length > 0 ? 'Custom' : 'Mullvad'}
            onPress={onNavigateToDnsSettings}
            showArrow
          />
        </SettingsSection>

        {/* Security */}
        <SettingsSection title="Security">
          <SettingsRow
            label="Kill switch"
            description="Block internet if VPN disconnects"
            toggle
            toggleValue={settings.killSwitch}
            onToggle={(value) => updateSettings({ killSwitch: value })}
          />
          {supportsLockdownMode() && (
            <SettingsRow
              label="Lockdown mode"
              description="Block all traffic when VPN is off"
              toggle
              toggleValue={settings.lockdownMode}
              onToggle={(value) => updateSettings({ lockdownMode: value })}
            />
          )}
          <SettingsRow
            label="Auto-connect"
            description="Connect automatically on app start"
            toggle
            toggleValue={settings.autoConnect}
            onToggle={(value) => updateSettings({ autoConnect: value })}
          />
          <SettingsRow
            label="Allow LAN"
            description="Access local network while connected"
            toggle
            toggleValue={settings.allowLan}
            onToggle={(value) => updateSettings({ allowLan: value })}
          />
        </SettingsSection>

        {/* Split Tunneling */}
        {supportsSplitTunneling() && (
          <SettingsSection title="Split tunneling">
            <SettingsRow
              label="Split tunneling"
              description="Exclude apps from VPN"
              onPress={onNavigateToSplitTunnel}
              showArrow
            />
          </SettingsSection>
        )}

        {/* App */}
        <SettingsSection title="App">
          <SettingsRow
            label="Notifications"
            toggle
            toggleValue={appSettings.showNotifications}
            onToggle={(value) =>
              updateAppSettings({ showNotifications: value })
            }
          />
          <SettingsRow
            label="Beta program"
            description="Get early access to new features"
            toggle
            toggleValue={appSettings.betaProgram}
            onToggle={(value) =>
              updateAppSettings({ betaProgram: value })
            }
          />
          <SettingsRow
            label="About"
            onPress={onNavigateToAbout}
            showArrow
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
