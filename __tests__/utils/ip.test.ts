/**
 * Tests for IP utilities.
 */

import { IpUtils } from '../../src/utils/ip';

describe('IpUtils', () => {
  describe('isValidIPv4', () => {
    it('should validate correct IPv4 addresses', () => {
      expect(IpUtils.isValidIPv4('192.168.1.1')).toBe(true);
      expect(IpUtils.isValidIPv4('10.0.0.1')).toBe(true);
      expect(IpUtils.isValidIPv4('255.255.255.255')).toBe(true);
      expect(IpUtils.isValidIPv4('0.0.0.0')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(IpUtils.isValidIPv4('256.0.0.1')).toBe(false);
      expect(IpUtils.isValidIPv4('1.2.3')).toBe(false);
      expect(IpUtils.isValidIPv4('1.2.3.4.5')).toBe(false);
      expect(IpUtils.isValidIPv4('abc.def.ghi.jkl')).toBe(false);
      expect(IpUtils.isValidIPv4('')).toBe(false);
      expect(IpUtils.isValidIPv4('01.01.01.01')).toBe(false);
    });
  });

  describe('isPrivateIP', () => {
    it('should detect private ranges', () => {
      expect(IpUtils.isPrivateIP('10.0.0.1')).toBe(true);
      expect(IpUtils.isPrivateIP('172.16.0.1')).toBe(true);
      expect(IpUtils.isPrivateIP('192.168.1.1')).toBe(true);
      expect(IpUtils.isPrivateIP('127.0.0.1')).toBe(true);
    });

    it('should detect public addresses', () => {
      expect(IpUtils.isPrivateIP('8.8.8.8')).toBe(false);
      expect(IpUtils.isPrivateIP('1.1.1.1')).toBe(false);
      expect(IpUtils.isPrivateIP('185.213.154.68')).toBe(false);
    });
  });

  describe('ipToNumber and numberToIp', () => {
    it('should convert IP to number and back', () => {
      const ip = '192.168.1.100';
      const num = IpUtils.ipToNumber(ip);
      const result = IpUtils.numberToIp(num);
      expect(result).toBe(ip);
    });
  });

  describe('maskIP', () => {
    it('should mask the last octet of IPv4', () => {
      expect(IpUtils.maskIP('192.168.1.100')).toBe('192.168.1.xxx');
    });
  });

  describe('isInCIDR', () => {
    it('should check CIDR membership', () => {
      expect(IpUtils.isInCIDR('10.0.0.5', '10.0.0.0/8')).toBe(true);
      expect(IpUtils.isInCIDR('192.168.1.5', '192.168.1.0/24')).toBe(true);
      expect(IpUtils.isInCIDR('8.8.8.8', '10.0.0.0/8')).toBe(false);
    });
  });
});
