/**
 * Split tunneling configuration screen.
 * Allows users to exclude or include specific apps from the VPN tunnel.
 * Android only - iOS does not support per-app VPN routing.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Switch,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Header } from '../components/Header';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useSettingsStore } from '../state/store';
import { SplitTunnelApp } from '../types';
import { Firewall } from '../services/security/Firewall';

interface SplitTunnelScreenProps {
  onBack: () => void;
}

export const SplitTunnelScreen: React.FC<SplitTunnelScreenProps> = ({
  onBack,
}) => {
  const splitTunneling = useSettingsStore(
    (s) => s.appSettings.splitTunneling
  );
  const updateSplitTunneling = useSettingsStore(
    (s) => s.updateSplitTunneling
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [installedApps, setInstalledApps] = useState<SplitTunnelApp[]>([]);

  useEffect(() => {
    const loadApps = async () => {
      const firewall = new Firewall();
      const apps = await firewall.getInstalledApps();
      setInstalledApps(apps);
    };
    loadApps();
  }, []);

  const filteredApps = searchQuery
    ? installedApps.filter((app) =>
        app.appName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : installedApps;

  const toggleApp = useCallback(
    (packageName: string) => {
      const updatedApps = splitTunneling.apps.map((app) =>
        app.packageName === packageName
          ? { ...app, enabled: !app.enabled }
          : app
      );

      // If app isn't in the list yet, add it
      if (!updatedApps.find((a) => a.packageName === packageName)) {
        const installedApp = installedApps.find(
          (a) => a.packageName === packageName
        );
        if (installedApp) {
          updatedApps.push({ ...installedApp, enabled: true });
        }
      }

      updateSplitTunneling({ apps: updatedApps });
    },
    [splitTunneling.apps, installedApps, updateSplitTunneling]
  );

  const isAppEnabled = (packageName: string): boolean => {
    return (
      splitTunneling.apps.find((a) => a.packageName === packageName)
        ?.enabled ?? false
    );
  };

  const renderApp = ({ item }: { item: SplitTunnelApp }) => (
    <View style={styles.appRow}>
      <View style={styles.appInfo}>
        <Text style={styles.appName}>{item.appName}</Text>
        <Text style={styles.packageName}>{item.packageName}</Text>
      </View>
      <Switch
        value={isAppEnabled(item.packageName)}
        onValueChange={() => toggleApp(item.packageName)}
        trackColor={{
          false: Colors.whiteAlpha20,
          true: Colors.green,
        }}
        thumbColor={Colors.white}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Split tunneling" showBack onBack={onBack} />

      <View style={styles.content}>
        {/* Enable toggle */}
        <View style={styles.enableRow}>
          <View style={styles.enableInfo}>
            <Text style={styles.enableLabel}>Enable split tunneling</Text>
            <Text style={styles.enableDescription}>
              {splitTunneling.mode === 'exclude'
                ? 'Selected apps will bypass the VPN'
                : 'Only selected apps will use the VPN'}
            </Text>
          </View>
          <Switch
            value={splitTunneling.enabled}
            onValueChange={(value) =>
              updateSplitTunneling({ enabled: value })
            }
            trackColor={{
              false: Colors.whiteAlpha20,
              true: Colors.green,
            }}
            thumbColor={Colors.white}
          />
        </View>

        {/* Mode selector */}
        {splitTunneling.enabled && (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                splitTunneling.mode === 'exclude' && styles.modeActive,
              ]}
              onPress={() => updateSplitTunneling({ mode: 'exclude' })}
            >
              <Text
                style={[
                  styles.modeText,
                  splitTunneling.mode === 'exclude' && styles.modeTextActive,
                ]}
              >
                Exclude apps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                splitTunneling.mode === 'include' && styles.modeActive,
              ]}
              onPress={() => updateSplitTunneling({ mode: 'include' })}
            >
              <Text
                style={[
                  styles.modeText,
                  splitTunneling.mode === 'include' && styles.modeTextActive,
                ]}
              >
                Include apps
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search */}
        {splitTunneling.enabled && (
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search apps..."
            placeholderTextColor={Colors.textDisabled}
          />
        )}

        {/* App list */}
        {splitTunneling.enabled && (
          <FlatList
            data={filteredApps}
            renderItem={renderApp}
            keyExtractor={(item) => item.packageName}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No apps match your search'
                  : 'No apps found'}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
  },
  enableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.md,
  },
  enableInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  enableLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  enableDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    padding: 3,
    marginBottom: Spacing.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Spacing.radiusMd - 2,
  },
  modeActive: {
    backgroundColor: Colors.green,
  },
  modeText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: Colors.white,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    marginBottom: 1,
  },
  appInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  appName: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  packageName: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
