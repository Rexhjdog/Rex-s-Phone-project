/**
 * Notification banner for showing alerts, errors, and info messages.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

export type BannerType = 'info' | 'warning' | 'error' | 'success';

interface NotificationBannerProps {
  type: BannerType;
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  type,
  message,
  visible,
  onDismiss,
  autoDismissMs,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      if (autoDismissMs && onDismiss) {
        const timer = setTimeout(onDismiss, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, autoDismissMs, onDismiss, slideAnim]);

  const getColors = () => {
    switch (type) {
      case 'error':
        return { bg: Colors.red, text: Colors.white };
      case 'warning':
        return { bg: Colors.yellow, text: Colors.deepBlue };
      case 'success':
        return { bg: Colors.green, text: Colors.white };
      default:
        return { bg: Colors.blue, text: Colors.white };
    }
  };

  const colors = getColors();

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={[styles.dismiss, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  message: {
    ...Typography.bodySmall,
    flex: 1,
  },
  dismissButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  dismiss: {
    fontSize: 16,
    fontWeight: '600',
  },
});
