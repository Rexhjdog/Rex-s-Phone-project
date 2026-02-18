/**
 * Reusable settings row component.
 * Supports toggle switches, navigation arrows, and value displays.
 */

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Switch,
  StyleSheet,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface SettingsRowProps {
  label: string;
  description?: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  showArrow?: boolean;
  disabled?: boolean;
  danger?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  description,
  value,
  toggle,
  toggleValue,
  onToggle,
  onPress,
  showArrow,
  disabled = false,
  danger = false,
}) => {
  const content = (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.leftSection}>
        <Text
          style={[
            styles.label,
            danger && styles.dangerText,
            disabled && styles.disabledText,
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text style={[styles.description, disabled && styles.disabledText]}>
            {description}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {value && (
          <Text style={[styles.value, disabled && styles.disabledText]}>
            {value}
          </Text>
        )}
        {toggle && (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            disabled={disabled}
            trackColor={{
              false: Colors.whiteAlpha20,
              true: Colors.green,
            }}
            thumbColor={Colors.white}
          />
        )}
        {showArrow && <Text style={styles.arrow}>›</Text>}
      </View>
    </View>
  );

  if (onPress && !toggle) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

/**
 * Section header for settings groups.
 */
export const SettingsSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    marginBottom: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  leftSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  label: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dangerText: {
    color: Colors.red,
  },
  disabledText: {
    color: Colors.textDisabled,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  value: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  arrow: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionContent: {
    borderRadius: Spacing.radiusMd,
    overflow: 'hidden',
  },
});
