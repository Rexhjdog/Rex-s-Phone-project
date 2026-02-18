/**
 * FaceTime Link Handler.
 * Parses and validates FaceTime links (facetime.apple.com/join/...)
 * so Android users can join FaceTime calls via the browser-based WebRTC flow.
 */

import { Linking, Platform } from 'react-native';
import {
  FaceTimeLinkInfo,
  FaceTimeError,
  FaceTimeErrorCode,
} from '../../types/facetime';
import { FACETIME_LINK_DOMAIN, FACETIME_LINK_PREFIX } from '../../config/constants';

/**
 * Regex to extract the call ID from a FaceTime link.
 * Supports formats:
 *   - https://facetime.apple.com/join#v=1&p=...&k=...
 *   - facetime.apple.com/join#v=1&p=...&k=...
 */
const FACETIME_LINK_REGEX =
  /(?:https?:\/\/)?facetime\.apple\.com\/join[#?](.+)/i;

const FACETIME_SHORT_LINK_REGEX =
  /(?:https?:\/\/)?facetime\.apple\.com\/([a-zA-Z0-9-]+)/i;

export class FaceTimeLinkHandler {
  /**
   * Parse a FaceTime link URL into structured info.
   */
  static parseLink(url: string): FaceTimeLinkInfo {
    const trimmedUrl = url.trim();

    // Try full link format first
    const fullMatch = trimmedUrl.match(FACETIME_LINK_REGEX);
    if (fullMatch) {
      return {
        url: trimmedUrl,
        callId: fullMatch[1],
        isValid: true,
      };
    }

    // Try short link format
    const shortMatch = trimmedUrl.match(FACETIME_SHORT_LINK_REGEX);
    if (shortMatch && shortMatch[1] !== 'join') {
      return {
        url: trimmedUrl,
        callId: shortMatch[1],
        isValid: true,
      };
    }

    return {
      url: trimmedUrl,
      callId: '',
      isValid: false,
    };
  }

  /**
   * Validate whether a URL is a FaceTime link.
   */
  static isFaceTimeLink(url: string): boolean {
    const normalized = url.trim().toLowerCase();
    return normalized.includes(FACETIME_LINK_DOMAIN);
  }

  /**
   * Ensure the link has a proper HTTPS prefix.
   */
  static normalizeLink(url: string): string {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replace('http://', 'https://');
    }
    return `https://${trimmed}`;
  }

  /**
   * Open a FaceTime link in the device's browser.
   * This is the fallback method — Apple's web interface handles
   * the WebRTC negotiation for non-Apple devices.
   */
  static async openInBrowser(url: string): Promise<void> {
    const normalizedUrl = FaceTimeLinkHandler.normalizeLink(url);

    const canOpen = await Linking.canOpenURL(normalizedUrl);
    if (!canOpen) {
      throw {
        code: FaceTimeErrorCode.InvalidLink,
        message: 'Cannot open FaceTime link',
        recoverable: false,
      } as FaceTimeError;
    }

    await Linking.openURL(normalizedUrl);
  }

  /**
   * Register as a handler for incoming FaceTime links (deep linking).
   * Returns an unsubscribe function.
   */
  static onIncomingLink(
    callback: (linkInfo: FaceTimeLinkInfo) => void
  ): () => void {
    const handleUrl = (event: { url: string }) => {
      if (FaceTimeLinkHandler.isFaceTimeLink(event.url)) {
        const linkInfo = FaceTimeLinkHandler.parseLink(event.url);
        callback(linkInfo);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    // Also check if the app was opened via a FaceTime link
    Linking.getInitialURL().then((url) => {
      if (url && FaceTimeLinkHandler.isFaceTimeLink(url)) {
        const linkInfo = FaceTimeLinkHandler.parseLink(url);
        callback(linkInfo);
      }
    });

    return () => {
      subscription.remove();
    };
  }

  /**
   * Generate the browser URL for joining a FaceTime call on Android.
   * Apple requires non-Apple devices to join via the web interface.
   */
  static getJoinUrl(callId: string): string {
    return `${FACETIME_LINK_PREFIX}#${callId}`;
  }

  /**
   * Extract query parameters from a FaceTime link hash fragment.
   */
  static extractParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return params;

    const fragment = url.substring(hashIndex + 1);
    const pairs = fragment.split('&');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }

    return params;
  }
}
