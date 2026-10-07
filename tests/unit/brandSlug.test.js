import { describe, expect, test } from '@jest/globals';
import { slugify, cleanBrandSlug, buildBrandUrl } from '../../frontend/src/utils/categoryUrls.js';

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

  test('cleanBrandSlug sanitizes dirty external URLs to clean brand slugs', () => {
    expect(cleanBrandSlug({ name: 'HI- FOCUS', slug: 'https://hifocuscctv.com/' })).toBe('hi-focus');
    expect(cleanBrandSlug({ name: 'CP-PLUS', slug: 'https://cpplusworld.com/' })).toBe('cp-plus');
    expect(cleanBrandSlug({ name: 'NEXIVUE', slug: 'https://www.nexivuesecurity.com/' })).toBe('nexivue');
    expect(cleanBrandSlug({ name: 'D-Link', slug: 'd-link' })).toBe('d-link');
    expect(cleanBrandSlug('HI- FOCUS')).toBe('hi-focus');
    expect(cleanBrandSlug('https://hifocuscctv.com/')).toBe('hifocuscctv');
    expect(cleanBrandSlug(null)).toBe('');
    expect(cleanBrandSlug('')).toBe('');
  });

  test('buildBrandUrl produces clean /brands/:slug routes even with legacy dirty slugs', () => {
    expect(buildBrandUrl({ name: 'HI- FOCUS', slug: 'https://hifocuscctv.com/' })).toBe('/brands/hi-focus');
    expect(buildBrandUrl({ name: 'CP-PLUS', slug: 'https://cpplusworld.com/' })).toBe('/brands/cp-plus');
    expect(buildBrandUrl({ name: 'NEXIVUE', slug: 'https://www.nexivuesecurity.com/' })).toBe('/brands/nexivue');
    expect(buildBrandUrl({ name: 'D-Link', slug: 'd-link' })).toBe('/brands/d-link');
    expect(buildBrandUrl('HI- FOCUS')).toBe('/brands/hi-focus');
    expect(buildBrandUrl(null)).toBe('/brands');
    expect(buildBrandUrl('')).toBe('/brands');
  });
});

