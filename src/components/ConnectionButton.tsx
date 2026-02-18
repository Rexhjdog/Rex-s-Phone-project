/**
 * Main VPN connection toggle button.
 * Large circular button with animated states for connect/disconnect.
 */

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { ConnectionStatus } from '../types/vpn';
import { Colors, getStatusColor } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface ConnectionButtonProps {
  status: ConnectionStatus;
  onPress: () => void;
  disabled?: boolean;
}

export const ConnectionButton: React.FC<ConnectionButtonProps> = ({
  status,
  onPress,
  disabled = false,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (
      status === ConnectionStatus.Connecting ||
      status === ConnectionStatus.Reconnecting
    ) {
      // Pulse animation during connecting
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const statusColor = getStatusColor(status);
  const isConnected = status === ConnectionStatus.Connected;
  const isConnecting =
    status === ConnectionStatus.Connecting ||
    status === ConnectionStatus.Reconnecting;

  const getButtonLabel = (): string => {
    switch (status) {
      case ConnectionStatus.Connected:
        return 'Disconnect';
      case ConnectionStatus.Connecting:
        return 'Cancel';
      case ConnectionStatus.Reconnecting:
        return 'Cancel';
      case ConnectionStatus.Disconnecting:
        return 'Disconnecting...';
      default:
        return 'Secure my connection';
    }
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case ConnectionStatus.Connected:
        return 'CONNECTED';
      case ConnectionStatus.Connecting:
        return 'CREATING SECURE CONNECTION...';
      case ConnectionStatus.Reconnecting:
        return 'RECONNECTING...';
      case ConnectionStatus.Disconnecting:
        return 'DISCONNECTING...';
      case ConnectionStatus.Error:
        return 'CONNECTION FAILED';
      default:
        return 'UNSECURED CONNECTION';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.statusLabel, { color: statusColor }]}>
        {getStatusLabel()}
      </Text>

      <Animated.View
        style={[
          styles.buttonOuter,
          {
            borderColor: statusColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isConnected
                ? Colors.red
                : isConnecting
                ? Colors.yellow
                : Colors.green,
            },
          ]}
          onPress={onPress}
          disabled={disabled || status === ConnectionStatus.Disconnecting}
          activeOpacity={0.8}
        >
          <View style={styles.buttonInner}>
            {isConnected && (
              <View style={styles.lockIcon}>
                <View style={styles.lockBody} />
                <View style={styles.lockShackle} />
              </View>
            )}
            {!isConnected && !isConnecting && (
              <View style={styles.lockIcon}>
                <View style={styles.lockBody} />
                <View style={[styles.lockShackle, styles.lockOpen]} />
              </View>
            )}
            {isConnecting && (
              <View style={styles.loadingDots}>
                <View style={[styles.dot, { opacity: 0.3 }]} />
                <View style={[styles.dot, { opacity: 0.6 }]} />
                <View style={[styles.dot, { opacity: 1 }]} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor: isConnected
              ? Colors.red
              : isConnecting
              ? Colors.yellow
              : Colors.green,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        disabled={disabled || status === ConnectionStatus.Disconnecting}
      >
        <Text
          style={[
            styles.actionText,
            {
              color: isConnecting ? Colors.deepBlue : Colors.white,
            },
          ]}
        >
          {getButtonLabel()}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const BUTTON_SIZE = Spacing.connectButtonSize;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  statusLabel: {
    ...Typography.label,
    textAlign: 'center',
  },
  buttonOuter: {
    width: BUTTON_SIZE + 16,
    height: BUTTON_SIZE + 16,
    borderRadius: (BUTTON_SIZE + 16) / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 40,
    height: 50,
    alignItems: 'center',
  },
  lockBody: {
    width: 32,
    height: 24,
    backgroundColor: Colors.white,
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
  },
  lockShackle: {
    width: 20,
    height: 20,
    borderWidth: 4,
    borderColor: Colors.white,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 0,
    position: 'absolute',
    top: 4,
  },
  lockOpen: {
    transform: [{ translateX: 6 }, { rotate: '15deg' }],
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.deepBlue,
  },
  actionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Spacing.radiusFull,
    minWidth: 240,
    alignItems: 'center',
  },
  actionText: {
    ...Typography.button,
  },
});
