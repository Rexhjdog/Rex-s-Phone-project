/**
 * Tests for FaceTimeLinkHandler.
 * Validates link parsing, validation, and normalization.
 */

import { FaceTimeLinkHandler } from '../../src/services/facetime/FaceTimeLinkHandler';

describe('FaceTimeLinkHandler', () => {
  describe('isFaceTimeLink', () => {
    it('should recognize standard FaceTime links', () => {
      expect(
        FaceTimeLinkHandler.isFaceTimeLink(
          'https://facetime.apple.com/join#v=1&p=abc&k=xyz'
        )
      ).toBe(true);
    });

    it('should recognize links without https prefix', () => {
      expect(
        FaceTimeLinkHandler.isFaceTimeLink('facetime.apple.com/join#v=1&p=abc')
      ).toBe(true);
    });

    it('should recognize links with http prefix', () => {
      expect(
        FaceTimeLinkHandler.isFaceTimeLink(
          'http://facetime.apple.com/join#v=1&p=abc'
        )
      ).toBe(true);
    });

    it('should reject non-FaceTime URLs', () => {
      expect(
        FaceTimeLinkHandler.isFaceTimeLink('https://google.com')
      ).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(FaceTimeLinkHandler.isFaceTimeLink('')).toBe(false);
    });

    it('should handle URLs with extra whitespace', () => {
      expect(
        FaceTimeLinkHandler.isFaceTimeLink(
          '  https://facetime.apple.com/join#v=1  '
        )
      ).toBe(true);
    });
  });

  describe('parseLink', () => {
    it('should parse a full FaceTime link with hash parameters', () => {
      const result = FaceTimeLinkHandler.parseLink(
        'https://facetime.apple.com/join#v=1&p=abc123&k=xyz789'
      );
      expect(result.isValid).toBe(true);
      expect(result.callId).toBe('v=1&p=abc123&k=xyz789');
    });

    it('should parse a short FaceTime link', () => {
      const result = FaceTimeLinkHandler.parseLink(
        'https://facetime.apple.com/my-call-id'
      );
      expect(result.isValid).toBe(true);
      expect(result.callId).toBe('my-call-id');
    });

    it('should return invalid for non-FaceTime links', () => {
      const result = FaceTimeLinkHandler.parseLink('https://google.com');
      expect(result.isValid).toBe(false);
      expect(result.callId).toBe('');
    });

    it('should return invalid for bare join path without ID', () => {
      const result = FaceTimeLinkHandler.parseLink(
        'https://facetime.apple.com/join'
      );
      expect(result.isValid).toBe(false);
    });

    it('should preserve the original URL', () => {
      const url = 'https://facetime.apple.com/join#v=1&p=test';
      const result = FaceTimeLinkHandler.parseLink(url);
      expect(result.url).toBe(url);
    });
  });

  describe('normalizeLink', () => {
    it('should add https to bare domains', () => {
      expect(
        FaceTimeLinkHandler.normalizeLink('facetime.apple.com/join#abc')
      ).toBe('https://facetime.apple.com/join#abc');
    });

    it('should upgrade http to https', () => {
      expect(
        FaceTimeLinkHandler.normalizeLink(
          'http://facetime.apple.com/join#abc'
        )
      ).toBe('https://facetime.apple.com/join#abc');
    });

    it('should leave https URLs unchanged', () => {
      const url = 'https://facetime.apple.com/join#abc';
      expect(FaceTimeLinkHandler.normalizeLink(url)).toBe(url);
    });

    it('should trim whitespace', () => {
      expect(
        FaceTimeLinkHandler.normalizeLink(
          '  https://facetime.apple.com/join#abc  '
        )
      ).toBe('https://facetime.apple.com/join#abc');
    });
  });

  describe('extractParams', () => {
    it('should extract hash fragment parameters', () => {
      const params = FaceTimeLinkHandler.extractParams(
        'https://facetime.apple.com/join#v=1&p=abc123&k=xyz789'
      );
      expect(params).toEqual({
        v: '1',
        p: 'abc123',
        k: 'xyz789',
      });
    });

    it('should return empty object for URLs without hash', () => {
      const params = FaceTimeLinkHandler.extractParams(
        'https://facetime.apple.com/join'
      );
      expect(params).toEqual({});
    });

    it('should handle URL-encoded values', () => {
      const params = FaceTimeLinkHandler.extractParams(
        'https://facetime.apple.com/join#name=John%20Doe&room=test%20room'
      );
      expect(params.name).toBe('John Doe');
      expect(params.room).toBe('test room');
    });
  });

  describe('getJoinUrl', () => {
    it('should generate a valid join URL from a call ID', () => {
      const url = FaceTimeLinkHandler.getJoinUrl('v=1&p=abc&k=xyz');
      expect(url).toBe('https://facetime.apple.com/join#v=1&p=abc&k=xyz');
    });
  });
});
