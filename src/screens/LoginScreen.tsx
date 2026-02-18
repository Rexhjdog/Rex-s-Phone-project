/**
 * Login screen.
 * Account number entry with create account option.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { ACCOUNT_NUMBER_LENGTH } from '../config/constants';
import { formatAccountNumber } from '../utils/format';

interface LoginScreenProps {
  onLogin: (accountNumber: string) => Promise<void>;
  onCreateAccount: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onCreateAccount,
  isLoading,
  error,
}) => {
  const [accountNumber, setAccountNumber] = useState('');

  const handleTextChange = useCallback((text: string) => {
    // Only allow digits, auto-format with spaces
    const digits = text.replace(/[^0-9]/g, '').slice(0, ACCOUNT_NUMBER_LENGTH);
    setAccountNumber(digits);
  }, []);

  const handleLogin = useCallback(async () => {
    if (accountNumber.length === ACCOUNT_NUMBER_LENGTH) {
      await onLogin(accountNumber);
    }
  }, [accountNumber, onLogin]);

  const displayNumber = formatAccountNumber(accountNumber);
  const isValid = accountNumber.length === ACCOUNT_NUMBER_LENGTH;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo area */}
        <View style={styles.logoSection}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>MULLVAD VPN</Text>
          </View>
          <Text style={styles.subtitle}>Privacy is a universal right</Text>
        </View>

        {/* Login form */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Account number</Text>
          <TextInput
            style={styles.input}
            value={displayNumber}
            onChangeText={handleTextChange}
            placeholder="0000 0000 0000 0000"
            placeholderTextColor={Colors.textDisabled}
            keyboardType="number-pad"
            maxLength={ACCOUNT_NUMBER_LENGTH + 3} // Account for spaces
            autoFocus
            editable={!isLoading}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.loginButton,
              !isValid && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Log in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={onCreateAccount} disabled={isLoading}>
            <Text style={styles.createAccountText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    ...Typography.labelSmall,
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    gap: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusMd,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Typography.monoLarge,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.red,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radiusFull,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: Colors.whiteAlpha20,
  },
  loginButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  createAccountText: {
    ...Typography.body,
    color: Colors.green,
    fontWeight: '600',
  },
});
