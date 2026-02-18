/**
 * Connection status indicator bar.
 * Shows IP, location, and transfer stats when connected.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConnectionStatus, ConnectionDetails } from '../types/vpn';
import { TunnelStats } from '../services/vpn/TunnelManager';
import { Colors, getStatusColor } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { formatBytes } from '../utils/format';
import { useConnectionTimer, useTrafficStats } from '../state/hooks';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  details: ConnectionDetails | null;
  serverLocation?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  details,
  serverLocation,
}) => {
  const elapsed = useConnectionTimer();
  const traffic = useTrafficStats();
  const statusColor = getStatusColor(status);

  if (status === ConnectionStatus.Disconnected) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: Colors.red }]} />
        <Text style={styles.locationText}>Your connection is unsecured</Text>
        {details?.publicIP && (
          <Text style={styles.ipText}>{details.publicIP}</Text>
        )}
      </View>
    );
  }

  if (
    status === ConnectionStatus.Connecting ||
    status === ConnectionStatus.Reconnecting
  ) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, styles.dotPulsing, { backgroundColor: Colors.yellow }]} />
        <Text style={styles.locationText}>
          {serverLocation || 'Connecting...'}
        </Text>
      </View>
    );
  }

  if (status === ConnectionStatus.Connected) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: Colors.green }]} />
        <Text style={styles.locationText}>
          {serverLocation || 'Connected'}
        </Text>

        {details?.tunnelIP && (
          <Text style={styles.ipText}>{details.tunnelIP}</Text>
        )}

        <View style={styles.statsRow}>
          <Text style={styles.timerText}>{elapsed}</Text>
        </View>

        <View style={styles.trafficRow}>
          <View style={styles.trafficItem}>
            <Text style={styles.trafficLabel}>DOWN</Text>
            <Text style={styles.trafficValue}>{traffic.download}</Text>
          </View>
          <View style={styles.trafficDivider} />
          <View style={styles.trafficItem}>
            <Text style={styles.trafficLabel}>UP</Text>
            <Text style={styles.trafficValue}>{traffic.upload}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (status === ConnectionStatus.Error) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: Colors.red }]} />
        <Text style={[styles.locationText, { color: Colors.red }]}>
          Connection failed
        </Text>
        <Text style={styles.errorText}>
          {details?.status || 'Check your connection and try again'}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing.xs,
  },
  dotPulsing: {
    opacity: 0.8,
  },
  locationText: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  ipText: {
    ...Typography.mono,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  timerText: {
    ...Typography.monoLarge,
    color: Colors.textPrimary,
  },
  trafficRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: Spacing.radiusMd,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  trafficItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  trafficLabel: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
  },
  trafficValue: {
    ...Typography.mono,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  trafficDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.whiteAlpha20,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
