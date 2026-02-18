/**
 * App header component.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightSection}>
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>{rightAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Spacing.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leftSection: {
    width: 60,
    alignItems: 'flex-start',
  },
  rightSection: {
    width: 60,
    alignItems: 'flex-end',
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: Spacing.xs,
  },
  backIcon: {
    fontSize: 32,
    color: Colors.textPrimary,
    fontWeight: '300',
    lineHeight: 32,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  actionText: {
    ...Typography.buttonSmall,
    color: Colors.green,
  },
});
