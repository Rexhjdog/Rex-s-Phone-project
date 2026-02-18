/**
 * Platform detection and capability utilities.
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

export const platformVersion = Platform.Version;

/**
 * Check if split tunneling is supported (Android only).
 */
export function supportsSplitTunneling(): boolean {
  return isAndroid;
}

/**
 * Check if always-on VPN is supported.
 */
export function supportsAlwaysOnVpn(): boolean {
  if (isAndroid) {
    return typeof platformVersion === 'number' && platformVersion >= 24; // Android 7.0+
  }
  return isIOS; // iOS supports on-demand rules
}

/**
 * Check if lockdown mode is supported.
 */
export function supportsLockdownMode(): boolean {
  if (isAndroid) {
    return typeof platformVersion === 'number' && platformVersion >= 29; // Android 10+
  }
  return false; // iOS doesn't have equivalent
}

/**
 * Get screen dimensions.
 */
export function getScreenDimensions() {
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

/**
 * Check if device is a tablet.
 */
export function isTablet(): boolean {
  const { width, height } = getScreenDimensions();
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  const isLargeScreen = Math.min(width, height) >= 600;
  return isLargeScreen && aspectRatio < 1.6;
}

/**
 * Get pixel ratio for the device.
 */
export function getPixelRatio(): number {
  return PixelRatio.get();
}

/**
 * Scale a size value for the current device pixel density.
 */
export function scaledSize(size: number): number {
  const ratio = PixelRatio.get();
  if (ratio >= 3) return size;
  if (ratio >= 2) return size * 0.95;
  return size * 0.85;
}
