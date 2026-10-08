import { describe, expect, test } from '@jest/globals';
import { DEFAULT_THEME, THEME_PRESETS, presetConfig, applyThemePreset, contrastRatio, resolveTheme, themeVariables } from '../../shared/seasonalThemes.js';
import { existsSync } from 'node:fs';
import { themeInputSchema, themeStylesSchema } from '../../backend/src/validators/theme.validator.js';
const now = Date.parse('2026-10-20T12:00:00Z');
const campaign = (id, priority = 0) => ({ _id: id, name: id, published: presetConfig('diwali'), publishedAt: '2026-10-01T00:00:00Z', schedule: { enabled: true, priority, startAt: '2026-10-20T00:00:00Z', endAt: '2026-10-21T00:00:00Z' } });
describe('seasonal theme resolution', () => {
  test('bundled presets share all color tokens and do not mutate defaults', () => {
    for (const key of Object.keys(THEME_PRESETS)) expect(Object.keys(presetConfig(key).colors)).toEqual(Object.keys(DEFAULT_THEME));
    const copy = presetConfig(); copy.colors.primary = '#000000'; expect(DEFAULT_THEME.primary).toBe('#800020');
    expect(themeVariables(presetConfig())['--store-footer-text']).toBe('#ffffff');
  });
  test('every festival has real bundled artwork and readable text', () => {
    for (const key of Object.keys(THEME_PRESETS).filter(k => k !== 'default')) {
      const config = presetConfig(key);
      expect(Object.keys(config.assets).sort()).toEqual(['background', 'footer', 'header']);
      for (const asset of Object.values(config.assets)) expect(existsSync(new URL(`../../frontend/public${asset.url}`, import.meta.url))).toBe(true);
      expect(contrastRatio(config.colors.text, config.colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(config.colors.footerText, config.colors.footer)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#ffffff', config.colors.primary)).toBeGreaterThanOrEqual(4.5);
      expect(config.styles.cardRadius).not.toBe('default');
    }
    expect(presetConfig('default').assets).toEqual({});
  });
  test('preset copies do not mutate bundled artwork or styling', () => {
    const copy = presetConfig('holi'); copy.assets.header.url = '/changed.png'; copy.styles.buttons = 'square';
    expect(presetConfig('holi').assets.header.url).toBe('/theme-assets/holi/header.svg');
    expect(presetConfig('holi').styles.buttons).toBe('pill');
  });
  test('switching festivals replaces bundled images but preserves custom uploads and text', () => {
    const diwali = presetConfig('diwali');
    const holi = applyThemePreset(diwali, 'holi');
    expect(holi.assets).toEqual(presetConfig('holi').assets);
    expect(holi.announcement).toBe(presetConfig('holi').announcement);
    diwali.assets.header = { url: 'https://example.com/custom.png', publicId: 'themes/custom' };
    diwali.announcement = 'Our custom message'; diwali.bannerIds = ['507f1f77bcf86cd799439011'];
    const eid = applyThemePreset(diwali, 'eid');
    expect(eid.assets.header).toEqual(diwali.assets.header);
    expect(eid.assets.footer).toEqual(presetConfig('eid').assets.footer);
    expect(eid.announcement).toBe('Our custom message');
    expect(eid.bannerIds).toEqual(diwali.bannerIds);
    expect(applyThemePreset(presetConfig('holi'), 'default').assets).toEqual({});
  });
  test('draft-only and archived campaigns never become public', () => {
    expect(resolveTheme([{ ...campaign('draft'), published: null }, { ...campaign('archived'), archived: true }], null, now).id).toBeNull();
  });
  test('schedule start is inclusive, end exclusive, and default returns after expiration', () => {
    const c = campaign('one'); expect(resolveTheme([c], null, +new Date(c.schedule.startAt)).id).toBe('one');
    expect(resolveTheme([c], null, +new Date(c.schedule.endAt)).id).toBeNull();
    expect(resolveTheme([c], null, now).nextChangeAt).toBe(new Date(c.schedule.endAt).toISOString());
  });
  test('higher priority wins, with publication time breaking ties', () => {
    expect(resolveTheme([campaign('a'), campaign('b', 2)], null, now).id).toBe('b');
    expect(resolveTheme([campaign('a'), { ...campaign('b'), publishedAt: '2026-10-02T00:00:00Z' }], null, now).id).toBe('b');
  });
  test('manual overrides and explicit default override scheduled campaigns', () => {
    expect(resolveTheme([campaign('a'), campaign('b', 10)], 'a', now).id).toBe('a');
    expect(resolveTheme([campaign('a')], 'default', now).id).toBeNull();
  });
  test('next change includes future starts, and missing manual campaigns safely fall back', () => {
    const c = campaign('future'); expect(resolveTheme([c], 'deleted', now - 86400000).nextChangeAt).toBe(new Date(c.schedule.startAt).toISOString());
  });
});
describe('theme input safety', () => {
  test('legacy designs get defaults, and unsafe styling choices/ranges are rejected', () => {
    expect(themeStylesSchema.parse(undefined).buttons).toBe('default');
    expect(themeStylesSchema.parse({ buttons: 'pill' }).patternSize).toBe(32);
    expect(themeStylesSchema.safeParse({ font: 'url(evil)' }).success).toBe(false);
    expect(themeStylesSchema.safeParse({ decorationCount: 10000 }).success).toBe(false);
    expect(themeStylesSchema.safeParse({ backgroundSize: -1 }).success).toBe(false);
  });
  const input = () => ({ name: 'Diwali', preset: 'diwali', draft: presetConfig('diwali'), schedule: { enabled: false, startAt: null, endAt: null, priority: 0 }, revision: 0 });
  test('accepts every preset', () => { for (const key of Object.keys(THEME_PRESETS)) expect(themeInputSchema.safeParse({ ...input(), preset: key, draft: presetConfig(key) }).success).toBe(true); });
  test('rejects arbitrary CSS, script URLs, invalid banner IDs and invalid schedules', () => {
    let data = input(); data.draft.colors.primary = 'url(javascript:alert(1))'; expect(themeInputSchema.safeParse(data).success).toBe(false);
    data = input(); data.draft.assets.header = { url: 'javascript:alert(1)' }; expect(themeInputSchema.safeParse(data).success).toBe(false);
    data = input(); data.draft.bannerIds = ['invalid']; expect(themeInputSchema.safeParse(data).success).toBe(false);
    data = input(); data.schedule.enabled = true; expect(themeInputSchema.safeParse(data).success).toBe(false);
    data.schedule.startAt = '2026-10-21T00:00:00Z'; data.schedule.endAt = '2026-10-20T00:00:00Z'; expect(themeInputSchema.safeParse(data).success).toBe(false);
  });
});
