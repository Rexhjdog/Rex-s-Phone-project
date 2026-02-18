/**
 * IP address validation and utility functions.
 */

export class IpUtils {
  /**
   * Validate an IPv4 address.
   */
  static isValidIPv4(address: string): boolean {
    const parts = address.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
    });
  }

  /**
   * Validate an IPv6 address (simplified check).
   */
  static isValidIPv6(address: string): boolean {
    // Basic IPv6 validation
    const groups = address.split(':');
    if (groups.length < 2 || groups.length > 8) return false;

    // Allow :: shorthand
    const doubleColonCount = (address.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;

    for (const group of groups) {
      if (group === '') continue; // Allow empty groups from ::
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return false;
    }

    return true;
  }

  /**
   * Check if an IP address is in a private range.
   */
  static isPrivateIP(ip: string): boolean {
    if (!IpUtils.isValidIPv4(ip)) return false;

    const parts = ip.split('.').map(Number);

    // 10.0.0.0/8
    if (parts[0] === 10) return true;

    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;

    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;

    return false;
  }

  /**
   * Check if an IP is in CIDR range.
   */
  static isInCIDR(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    const ipNum = IpUtils.ipToNumber(ip);
    const rangeNum = IpUtils.ipToNumber(range);
    const maskNum = ~((1 << (32 - mask)) - 1);

    return (ipNum & maskNum) === (rangeNum & maskNum);
  }

  /**
   * Convert IPv4 to number.
   */
  static ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * Convert number to IPv4.
   */
  static numberToIp(num: number): string {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255,
    ].join('.');
  }

  /**
   * Mask an IP for privacy display (e.g., "192.168.1.xxx").
   */
  static maskIP(ip: string): string {
    if (IpUtils.isValidIPv4(ip)) {
      const parts = ip.split('.');
      parts[3] = 'xxx';
      return parts.join('.');
    }
    // IPv6: mask last 4 groups
    const groups = ip.split(':');
    if (groups.length >= 4) {
      for (let i = Math.max(0, groups.length - 4); i < groups.length; i++) {
        groups[i] = 'xxxx';
      }
    }
    return groups.join(':');
  }
}
