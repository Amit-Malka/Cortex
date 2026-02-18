import { describe, it, expect } from 'vitest';
import { formatBytes, formatDate } from '../utils/format';

describe('formatBytes', () => {
  it('returns "0 Bytes" for 0', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('returns "0 Bytes" for falsy values', () => {
    expect(formatBytes('')).toBe('0 Bytes');
  });

  it('formats bytes less than 1 KB', () => {
    expect(formatBytes(512)).toBe('512 Bytes');
  });

  it('formats exactly 1 KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats exactly 1 MB', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats exactly 1 GB', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('handles string input', () => {
    expect(formatBytes('2048')).toBe('2 KB');
  });

  it('applies the decimals parameter', () => {
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
  });

  it('uses 0 decimals when decimals is negative', () => {
    expect(formatBytes(1536, -1)).toBe('2 KB');
  });
});

describe('formatDate', () => {
  it('returns a non-empty locale-formatted date string', () => {
    const result = formatDate('2024-06-15T12:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the year', () => {
    const result = formatDate('2024-06-15T12:00:00.000Z');
    expect(result).toContain('2024');
  });

  it('includes the day', () => {
    const result = formatDate('2024-06-15T12:00:00.000Z');
    expect(result).toMatch(/15/);
  });
});
