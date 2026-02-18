/**
 * Application constants for the Mullvad VPN rebuild.
 */

export const API_BASE_URL = 'https://api.mullvad.net';
export const API_VERSION = 'v1';

export const WIREGUARD_DEFAULT_PORT = 51820;
export const WIREGUARD_ALTERNATIVE_PORTS = [53, 80, 443, 1194, 4000, 5001];
export const WIREGUARD_DEFAULT_MTU = 1380;
export const WIREGUARD_KEEPALIVE_INTERVAL = 25; // seconds

export const DNS_SERVERS = {
  mullvad: {
    default: ['10.64.0.1'],
    adBlocking: ['100.64.0.1'],
    trackerBlocking: ['100.64.0.2'],
    adAndTrackerBlocking: ['100.64.0.3'],
  },
  custom: {
    cloudflare: ['1.1.1.1', '1.0.0.1'],
    google: ['8.8.8.8', '8.8.4.4'],
    quad9: ['9.9.9.9', '149.112.112.112'],
  },
};

export const ACCOUNT_NUMBER_LENGTH = 16;
export const MAX_DEVICES_PER_ACCOUNT = 5;
export const KEY_ROTATION_INTERVAL_DAYS = 7;

export const RELAY_LIST_CACHE_DURATION = 3600000; // 1 hour in ms
export const LATENCY_CHECK_TIMEOUT = 5000; // 5 seconds
export const LATENCY_CHECK_INTERVAL = 300000; // 5 minutes

export const CONNECTION_RETRY_MAX = 3;
export const CONNECTION_RETRY_DELAY = 2000; // ms
export const CONNECTION_TIMEOUT = 30000; // 30 seconds

export const SPLIT_TUNNEL_MAX_APPS = 100;

export const OBFUSCATION_UDP2TCP_PORT = 443;
export const SHADOWSOCKS_DEFAULT_PORT = 443;

export const APP_LINKS = {
  website: 'https://mullvad.net',
  privacyPolicy: 'https://mullvad.net/en/help/privacy-policy',
  faq: 'https://mullvad.net/en/help',
  github: 'https://github.com/mullvad/mullvadvpn-app',
};

// ─── FaceTime Link Support ────────────────────────────────────────────────

export const FACETIME_LINK_DOMAIN = 'facetime.apple.com';
export const FACETIME_LINK_PREFIX = `https://${FACETIME_LINK_DOMAIN}/join`;

export const FACETIME_WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceTransportPolicy: 'all' as const,
  bundlePolicy: 'max-bundle' as const,
  sdpSemantics: 'unified-plan' as const,
};

export const FACETIME_MEDIA_DEFAULTS = {
  audio: {
    enabled: true,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    enabled: true,
    width: 1280,
    height: 720,
    frameRate: 30,
    facingMode: 'user' as const,
  },
};

export const FACETIME_CALL_TIMEOUT = 60000; // 60 seconds to join
export const FACETIME_RECONNECT_ATTEMPTS = 3;
export const FACETIME_RECONNECT_DELAY = 2000; // ms
