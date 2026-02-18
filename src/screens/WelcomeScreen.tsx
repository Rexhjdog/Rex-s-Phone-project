/**
 * Welcome/onboarding screen.
 * Shown on first launch to introduce the app.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <View style={styles.shieldOuter}>
                <View style={styles.shieldInner} />
              </View>
            </View>
          </View>

          <Text style={styles.title}>Mullvad VPN</Text>
          <Text style={styles.subtitle}>
            Privacy is a universal right
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.green }]} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>No logging</Text>
              <Text style={styles.featureDescription}>
                We never store activity logs or connection data
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.blue }]} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>WireGuard protocol</Text>
              <Text style={styles.featureDescription}>
                Fast, modern, and cryptographically secure
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.yellow }]} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Kill switch</Text>
              <Text style={styles.featureDescription}>
                Blocks traffic if VPN connection drops
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.orange }]} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>No accounts needed</Text>
              <Text style={styles.featureDescription}>
                Anonymous account numbers, no email required
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={onGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedText}>Get started</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldOuter: {
    width: 50,
    height: 60,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInner: {
    width: 20,
    height: 20,
    backgroundColor: Colors.green,
    borderRadius: 10,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.8,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  featureDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cta: {
    gap: Spacing.md,
  },
  getStartedButton: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radiusFull,
    alignItems: 'center',
  },
  getStartedText: {
    ...Typography.button,
    color: Colors.white,
  },
});
