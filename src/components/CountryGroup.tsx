/**
 * Collapsible country group for server list.
 * Shows country name with flag and expandable city/server list.
 */

import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { RelayCountry, RelayServer } from '../types/server';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { ServerCard } from './ServerCard';
import { countryCodeToFlag } from '../utils/format';

interface CountryGroupProps {
  country: RelayCountry;
  selectedServer: RelayServer | null;
  onServerSelect: (server: RelayServer) => void;
  initiallyExpanded?: boolean;
}

export const CountryGroup: React.FC<CountryGroupProps> = ({
  country,
  selectedServer,
  onServerSelect,
  initiallyExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const totalServers = country.cities.reduce(
    (sum, city) => sum + city.servers.filter((s) => s.active).length,
    0
  );

  const hasSelectedServer = country.cities.some((city) =>
    city.servers.some((s) => s.hostname === selectedServer?.hostname)
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.header,
          hasSelectedServer && styles.headerActive,
        ]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.flag}>
            {countryCodeToFlag(country.code)}
          </Text>
          <Text style={styles.countryName}>{country.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.serverCount}>{totalServers}</Text>
          <Text style={styles.expandIcon}>{expanded ? '−' : '+'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {country.cities.map((city) => (
            <View key={city.code} style={styles.citySection}>
              <Text style={styles.cityName}>{city.name}</Text>
              {city.servers
                .filter((s) => s.active)
                .map((server) => (
                  <ServerCard
                    key={server.hostname}
                    server={server}
                    isSelected={
                      selectedServer?.hostname === server.hostname
                    }
                    onPress={onServerSelect}
                  />
                ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
  },
  headerActive: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.green,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flag: {
    fontSize: 22,
  },
  countryName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  serverCount: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  expandIcon: {
    ...Typography.h3,
    color: Colors.textSecondary,
    width: 24,
    textAlign: 'center',
  },
  content: {
    paddingLeft: Spacing.md,
    paddingTop: Spacing.sm,
  },
  citySection: {
    marginBottom: Spacing.sm,
  },
  cityName: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
});
