/**
 * Account management screen.
 * Shows account details, device list, expiry, and voucher redemption.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Header } from '../components/Header';
import { SettingsRow, SettingsSection } from '../components/SettingsRow';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useAccountStatus } from '../state/hooks';
import { useAccountStore } from '../state/store';
import { Device } from '../types/account';
import { formatExpiry, formatAccountNumber } from '../utils/format';

interface AccountScreenProps {
  onBack: () => void;
  onLogout: () => Promise<void>;
  onRedeemVoucher: (code: string) => Promise<void>;
  onRemoveDevice: (deviceId: string) => Promise<void>;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({
  onBack,
  onLogout,
  onRedeemVoucher,
  onRemoveDevice,
}) => {
  const { account, device, isExpired, daysRemaining } = useAccountStatus();
  const devices = useAccountStore((s) => s.devices);
  const [voucherCode, setVoucherCode] = useState('');
  const [showVoucher, setShowVoucher] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out? You will need your account number to log back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  }, [onLogout]);

  const handleRedeemVoucher = useCallback(async () => {
    if (voucherCode.trim()) {
      await onRedeemVoucher(voucherCode.trim());
      setVoucherCode('');
      setShowVoucher(false);
    }
  }, [voucherCode, onRedeemVoucher]);

  const handleRemoveDevice = useCallback(
    (dev: Device) => {
      if (dev.isCurrent) {
        Alert.alert(
          'Remove current device?',
          'This will disconnect VPN and log you out on this device.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => onRemoveDevice(dev.id),
            },
          ]
        );
      } else {
        onRemoveDevice(dev.id);
      }
    },
    [onRemoveDevice]
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Account" showBack onBack={onBack} />

      <View style={styles.content}>
        {/* Account info */}
        <SettingsSection title="Account">
          {account && (
            <>
              <SettingsRow
                label="Account number"
                value={formatAccountNumber(account.id)}
              />
              <SettingsRow
                label="Paid until"
                value={formatExpiry(account.expiry)}
              />
              <SettingsRow
                label="Status"
                value={isExpired ? 'Expired' : 'Active'}
              />
            </>
          )}
        </SettingsSection>

        {/* Voucher */}
        <SettingsSection title="Add time">
          {showVoucher ? (
            <View style={styles.voucherForm}>
              <TextInput
                style={styles.voucherInput}
                value={voucherCode}
                onChangeText={setVoucherCode}
                placeholder="Enter voucher code"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <View style={styles.voucherButtons}>
                <TouchableOpacity
                  style={styles.voucherCancel}
                  onPress={() => setShowVoucher(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.voucherSubmit,
                    !voucherCode.trim() && styles.disabled,
                  ]}
                  onPress={handleRedeemVoucher}
                  disabled={!voucherCode.trim()}
                >
                  <Text style={styles.submitText}>Redeem</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <SettingsRow
              label="Redeem voucher"
              onPress={() => setShowVoucher(true)}
              showArrow
            />
          )}
        </SettingsSection>

        {/* Devices */}
        <SettingsSection title={`Devices (${devices.length}/5)`}>
          {devices.map((dev) => (
            <View key={dev.id} style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>
                  {dev.name}
                  {dev.isCurrent ? ' (this device)' : ''}
                </Text>
                <Text style={styles.deviceKey}>
                  {dev.publicKey.substring(0, 20)}...
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveDevice(dev)}
                style={styles.removeButton}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SettingsSection>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
  },
  voucherForm: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  voucherInput: {
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: Spacing.radiusMd,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Typography.mono,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  voucherButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  voucherCancel: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Spacing.radiusMd,
    backgroundColor: Colors.whiteAlpha10,
  },
  voucherSubmit: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Spacing.radiusMd,
    backgroundColor: Colors.green,
  },
  disabled: {
    opacity: 0.5,
  },
  cancelText: {
    ...Typography.buttonSmall,
    color: Colors.textPrimary,
  },
  submitText: {
    ...Typography.buttonSmall,
    color: Colors.white,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    marginBottom: 1,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  deviceKey: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  removeButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  removeText: {
    ...Typography.buttonSmall,
    color: Colors.red,
  },
  logoutButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.red,
    borderRadius: Spacing.radiusFull,
    marginTop: Spacing.lg,
  },
  logoutText: {
    ...Typography.button,
    color: Colors.white,
  },
});
