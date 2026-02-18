/**
 * Typography system.
 */

import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography: Record<string, TextStyle> = {
  // Headlines
  h1: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  },

  // Body text
  bodyLarge: {
    fontFamily,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
  },
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Labels
  label: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Button text
  button: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  buttonSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Caption
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Monospace (for IPs, keys, etc.)
  mono: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  monoLarge: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
  },
};
