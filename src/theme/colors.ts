/**
 * Mullvad-inspired color palette.
 * Based on the official Mullvad VPN brand colors.
 */

export const Colors = {
  // Primary brand colors
  blue: '#294D73',
  darkBlue: '#192E45',
  darkerBlue: '#121F30',
  deepBlue: '#0D1520',

  // Accent colors
  green: '#44AD4D',
  lightGreen: '#5BC862',
  red: '#E34039',
  lightRed: '#FF6B6B',
  yellow: '#FFD524',
  orange: '#FF6B35',

  // Neutral colors
  white: '#FFFFFF',
  whiteAlpha80: 'rgba(255, 255, 255, 0.8)',
  whiteAlpha60: 'rgba(255, 255, 255, 0.6)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',

  // Background colors
  background: '#192E45',
  backgroundDark: '#0D1520',
  backgroundLight: '#294D73',
  surface: '#294D73',
  surfaceLight: '#3B6B9A',

  // Status colors
  connected: '#44AD4D',
  connecting: '#FFD524',
  disconnected: '#E34039',
  error: '#E34039',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',

  // Border colors
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.2)',

  // Transparent
  transparent: 'transparent',
};

/**
 * Gradient definitions.
 */
export const Gradients = {
  // Main background gradient
  background: [Colors.darkBlue, Colors.deepBlue],

  // Connected state gradient
  connected: ['#1B4332', '#0D2818'],

  // Connecting state
  connecting: ['#3D3500', '#1F1B00'],

  // Disconnected state
  disconnected: [Colors.darkBlue, Colors.deepBlue],

  // Header gradient
  header: [Colors.blue, Colors.darkBlue],

  // Button gradient
  button: [Colors.green, '#3A9442'],
  buttonDisconnect: [Colors.red, '#C73530'],
};

/**
 * Get status color based on connection state.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'connected':
      return Colors.connected;
    case 'connecting':
    case 'reconnecting':
      return Colors.connecting;
    case 'disconnected':
      return Colors.disconnected;
    case 'error':
      return Colors.error;
    default:
      return Colors.textSecondary;
  }
}
