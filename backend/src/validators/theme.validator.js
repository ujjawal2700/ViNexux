import { z } from 'zod';
import mongoose from 'mongoose';
import { DEFAULT_THEME, THEME_PRESETS, DEFAULT_THEME_STYLES } from '../../../shared/seasonalThemes.js';
export const themeStylesSchema = z.object({
  font: z.enum(['system', 'serif', 'rounded']), heading: z.enum(['plain', 'accent', 'underline']),
  buttons: z.enum(['default', 'square', 'rounded', 'pill']), cardRadius: z.enum(['default', 'square', 'soft', 'round']),
  cardShadow: z.enum(['default', 'none', 'subtle', 'lifted']), cardBorder: z.enum(['default', 'none', 'accent']), spacing: z.enum(['default', 'compact', 'airy']),
  pattern: z.enum(['auto', 'none', 'dots', 'stars', 'diagonal', 'grid']), patternSize: z.number().int().min(16).max(120),
  backgroundFit: z.enum(['tile', 'cover', 'contain']), backgroundSize: z.number().int().min(120).max(1200),
  navigation: z.enum(['solid', 'gradient']), announcement: z.enum(['solid', 'soft', 'outline']), footer: z.enum(['solid', 'tinted']),
  decorationPlacement: z.enum(['both', 'header', 'footer', 'off']), decorationSize: z.number().int().min(12).max(40), decorationCount: z.number().int().min(6).max(24),
  headerHeight: z.number().int().min(16).max(96), footerHeight: z.number().int().min(24).max(160),
  headerImageHeight: z.number().int().min(24).max(200), footerImageHeight: z.number().int().min(24).max(320),
}).partial().transform(value => ({ ...DEFAULT_THEME_STYLES, ...value })).default({});
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const asset = z.object({ url: z.string().max(2000).refine(v => /^https?:\/\//.test(v) || /^\/(?!\/)/.test(v)), publicId: z.string().max(500).optional() });
export const themeConfigSchema = z.object({ colors: z.object(Object.fromEntries(Object.keys(DEFAULT_THEME).map(k => [k, color]))), styles: themeStylesSchema, decoration: z.enum(['none', 'diyas', 'stars', 'confetti', 'garland', 'flowers', 'snowflakes', 'lanterns']), announcement: z.string().max(200), motion: z.boolean(), assets: z.object({ header: asset.optional(), background: asset.optional(), footer: asset.optional() }), bannerIds: z.array(z.string().refine(mongoose.isValidObjectId)).max(20) });
export const themeScheduleSchema = z.object({ enabled: z.boolean(), startAt: z.string().datetime().nullable(), endAt: z.string().datetime().nullable(), priority: z.number().int().min(0).max(100) }).refine(v => !v.enabled || (v.startAt && v.endAt && +new Date(v.endAt) > +new Date(v.startAt)), 'Schedule requires an end after its start');
export const themeInputSchema = z.object({ name: z.string().trim().min(1).max(100), preset: z.enum(Object.keys(THEME_PRESETS)), draft: themeConfigSchema, schedule: themeScheduleSchema, revision: z.number().int().min(0).optional() });
