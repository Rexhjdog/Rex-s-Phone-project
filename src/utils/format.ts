/**
 * Formatting utilities for display values.
 */

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Format duration from a start date.
 */
export function formatDuration(startDate: Date): string {
  const seconds = Math.floor((Date.now() - startDate.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

/**
 * Format latency for display.
 */
export function formatLatency(ms: number): string {
  if (ms < 0) return '--';
  if (ms < 1) return '<1 ms';
  return `${Math.round(ms)} ms`;
}

/**
 * Format account expiry date.
 */
export function formatExpiry(expiry: Date): string {
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} remaining`;
  }

  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} remaining`;
  }

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
}

/**
 * Format an account number with spaces for readability.
 */
export function formatAccountNumber(num: string): string {
  return num.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Format a server hostname for display.
 */
export function formatServerName(hostname: string): string {
  // "se-got-wg-001" -> "se-got-wg-001"
  return hostname;
}

/**
 * Format country code to flag emoji.
 */
export function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Truncate string with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
