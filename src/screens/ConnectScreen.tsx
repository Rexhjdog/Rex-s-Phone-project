/**
 * Main connection screen.
 * The primary interface showing connection state, the connect/disconnect button,
 * and quick access to server selection.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { ConnectionButton } from '../components/ConnectionButton';
import { StatusIndicator } from '../components/StatusIndicator';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useConnectionStatus, useAccountStatus } from '../state/hooks';
import { useConnectionStore } from '../state/store';
import { ConnectionStatus } from '../types/vpn';

interface ConnectScreenProps {
  onNavigateToServers: () => void;
  onNavigateToAccount: () => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const ConnectScreen: React.FC<ConnectScreenProps> = ({
  onNavigateToServers,
  onNavigateToAccount,
  onConnect,
  onDisconnect,
}) => {
  const {
    status,
    details,
    selectedRelay,
    isConnected,
    isConnecting,
  } = useConnectionStatus();
  const { isLoggedIn, daysRemaining, isExpired } = useAccountStatus();

  const handleConnectionToggle = useCallback(async () => {
    if (isConnected || isConnecting) {
      await onDisconnect();
    } else {
      await onConnect();
    }
  }, [isConnected, isConnecting, onConnect, onDisconnect]);

  const serverLocation = selectedRelay
    ? `${selectedRelay.location.city}, ${selectedRelay.location.country}`
    : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundDark} />

      {/* Account warning banner */}
      {isLoggedIn && isExpired && (
        <TouchableOpacity
          style={styles.expiryBanner}
          onPress={onNavigateToAccount}
        >
          <Text style={styles.expiryText}>
            Account expired - Tap to manage
          </Text>
        </TouchableOpacity>
      )}

      {isLoggedIn && !isExpired && daysRemaining <= 30 && (
        <TouchableOpacity
          style={[styles.expiryBanner, styles.expiryWarning]}
          onPress={onNavigateToAccount}
        >
          <Text style={styles.expiryWarningText}>
            {daysRemaining} days remaining on account
          </Text>
        </TouchableOpacity>
      )}

      {/* Main content */}
      <View style={styles.content}>
        {/* Status section */}
        <StatusIndicator
          status={status}
          details={details}
          serverLocation={serverLocation}
        />

        {/* Connection button */}
        <View style={styles.buttonSection}>
          <ConnectionButton
            status={status}
            onPress={handleConnectionToggle}
            disabled={!isLoggedIn || isExpired}
          />
        </View>

        {/* Server selection shortcut */}
        <TouchableOpacity
          style={styles.serverSelector}
          onPress={onNavigateToServers}
        >
          <Text style={styles.serverLabel}>
            {selectedRelay
              ? `${selectedRelay.location.city}, ${selectedRelay.location.country}`
              : 'Fastest server'}
          </Text>
          <Text style={styles.serverArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  expiryBanner: {
    backgroundColor: Colors.red,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  expiryWarning: {
    backgroundColor: Colors.yellow,
  },
  expiryText: {
    ...Typography.bodySmall,
    color: Colors.white,
    fontWeight: '600',
  },
  expiryWarningText: {
    ...Typography.bodySmall,
    color: Colors.deepBlue,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  buttonSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  serverSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
  },
  serverLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  serverArrow: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
});
