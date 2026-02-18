/**
 * Server list item card.
 * Displays a relay server with latency indicator and selection state.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { RelayServer } from '../types/server';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { formatLatency } from '../utils/format';

interface ServerCardProps {
  server: RelayServer;
  isSelected: boolean;
  latency?: number;
  onPress: (server: RelayServer) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  isSelected,
  latency,
  onPress,
}) => {
  const getLatencyColor = (ms: number): string => {
    if (ms < 50) return Colors.green;
    if (ms < 100) return Colors.yellow;
    return Colors.red;
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={() => onPress(server)}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: server.active ? Colors.green : Colors.red },
          ]}
        />
        <View style={styles.info}>
          <Text style={styles.hostname}>{server.hostname}</Text>
          <Text style={styles.details}>
            {server.provider}
            {server.owned ? ' (Mullvad-owned)' : ''}
            {server.daita ? ' - DAITA' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {latency !== undefined && latency >= 0 && (
          <View style={styles.latencyContainer}>
            <View
              style={[
                styles.latencyBar,
                { backgroundColor: getLatencyColor(latency) },
                { width: Math.min(40, Math.max(8, 40 - latency / 5)) },
              ]}
            />
            <Text style={styles.latencyText}>{formatLatency(latency)}</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.xs,
  },
  selected: {
    backgroundColor: Colors.whiteAlpha20,
    borderWidth: 1,
    borderColor: Colors.green,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  info: {
    flex: 1,
  },
  hostname: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  details: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  latencyContainer: {
    alignItems: 'flex-end',
  },
  latencyBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  latencyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
