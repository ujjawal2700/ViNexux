import { describe, expect, test } from '@jest/globals';
import { slugify } from '../../frontend/src/utils/categoryUrls.js';

describe('brand slug generation and sanitization', () => {
  test('generates kebab-case slug from brand name', () => {
    expect(slugify('CP PLUS')).toBe('cp-plus');
    expect(slugify('Dahua')).toBe('dahua');
    expect(slugify('Hikvision')).toBe('hikvision');
    expect(slugify('Hi-Focus CCTV')).toBe('hi-focus-cctv');
    expect(slugify('Nexivue Security')).toBe('nexivue-security');
  });

  test('replaces ampersands with "and"', () => {
    expect(slugify('D-Link & TP-Link')).toBe('d-link-and-tp-link');
  });

  test('strips leading and trailing hyphens and special characters', () => {
    expect(slugify('---Brand  Name!@#$---')).toBe('brand-name');
  });

  test('handles empty or null input gracefully', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });
});
