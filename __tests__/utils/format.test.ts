/**
 * Tests for format utilities.
 */

import {
  formatBytes,
  formatDuration,
  formatLatency,
  formatAccountNumber,
  countryCodeToFlag,
  truncate,
} from '../../src/utils/format';

describe('formatBytes', () => {
  it('should format zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('formatLatency', () => {
  it('should format negative as --', () => {
    expect(formatLatency(-1)).toBe('--');
  });

  it('should format sub-millisecond', () => {
    expect(formatLatency(0.5)).toBe('<1 ms');
  });

  it('should format normal latency', () => {
    expect(formatLatency(42)).toBe('42 ms');
  });
});

describe('formatAccountNumber', () => {
  it('should format with spaces', () => {
    expect(formatAccountNumber('1234567890123456')).toBe('1234 5678 9012 3456');
  });
});

describe('truncate', () => {
  it('should not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long strings', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello w...');
  });
});
