/**
 * Server selection screen.
 * Lists all relay servers grouped by country and city,
 * with search and filter capabilities.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Header } from '../components/Header';
import { CountryGroup } from '../components/CountryGroup';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useRelaySelection, useConnectionStatus } from '../state/hooks';
import { RelayServer, RelayCountry } from '../types/server';

interface ServerListScreenProps {
  onBack: () => void;
  onServerSelect: (server: RelayServer) => void;
}

export const ServerListScreen: React.FC<ServerListScreenProps> = ({
  onBack,
  onServerSelect,
}) => {
  const {
    countries,
    searchQuery,
    setSearchQuery,
  } = useRelaySelection();
  const { selectedRelay } = useConnectionStatus();

  const handleServerSelect = useCallback(
    (server: RelayServer) => {
      onServerSelect(server);
      onBack();
    },
    [onServerSelect, onBack]
  );

  const renderCountry = useCallback(
    ({ item }: { item: RelayCountry }) => (
      <CountryGroup
        country={item}
        selectedServer={selectedRelay}
        onServerSelect={handleServerSelect}
      />
    ),
    [selectedRelay, handleServerSelect]
  );

  const keyExtractor = useCallback(
    (item: RelayCountry) => item.code,
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Select location" showBack onBack={onBack} />

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search country, city, or server..."
          placeholderTextColor={Colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Server list */}
      <FlatList
        data={countries}
        renderItem={renderCountry}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No servers match your search'
                : 'Loading servers...'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
