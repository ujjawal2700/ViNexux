export const DEFAULT_THEME = {
  primary: '#800020', primaryHover: '#660019', background: '#f9fafb', surface: '#ffffff', text: '#1f2937', muted: '#6b7280', border: '#e5e7eb', footer: '#111111', footerText: '#ffffff', accent: '#f59e0b',
};
export const DEFAULT_THEME_STYLES = {
  font: 'system', heading: 'plain', buttons: 'default', cardRadius: 'default', cardShadow: 'default', cardBorder: 'default', spacing: 'default',
  pattern: 'auto', patternSize: 32, backgroundFit: 'tile', backgroundSize: 600,
  navigation: 'solid', announcement: 'solid', footer: 'solid',
  decorationPlacement: 'both', decorationSize: 24, decorationCount: 16, headerHeight: 24, footerHeight: 36, headerImageHeight: 96, footerImageHeight: 160,
};
export const THEME_STYLE_LOOKS = {
  original: { label: 'Store original', styles: DEFAULT_THEME_STYLES },
  minimal: { label: 'Clean minimal', styles: { ...DEFAULT_THEME_STYLES, buttons: 'square', cardRadius: 'square', cardShadow: 'none', pattern: 'none', spacing: 'compact' } },
  elegant: { label: 'Elegant festive', styles: { ...DEFAULT_THEME_STYLES, font: 'serif', heading: 'accent', buttons: 'rounded', cardRadius: 'soft', cardShadow: 'subtle', navigation: 'gradient', pattern: 'stars', spacing: 'airy' } },
  playful: { label: 'Playful celebration', styles: { ...DEFAULT_THEME_STYLES, font: 'rounded', heading: 'accent', buttons: 'pill', cardRadius: 'round', cardShadow: 'lifted', cardBorder: 'accent', pattern: 'dots', decorationSize: 32, headerHeight: 40, footerHeight: 56 } },
};
export const themeStyles = config => ({ ...DEFAULT_THEME_STYLES, ...config?.styles });
export function themeStyleAttributes(config) {
  return Object.fromEntries(Object.entries(themeStyles(config)).map(([key, value]) => [`data-style-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, value]));
}
const festiveStyles = { ...DEFAULT_THEME_STYLES, heading: 'accent', buttons: 'rounded', cardRadius: 'soft', cardShadow: 'subtle', pattern: 'none', navigation: 'gradient', announcement: 'soft' };
const bundledAssets = (key, files = { header: 'header.svg', background: 'background.svg', footer: 'footer.svg' }) => Object.fromEntries(Object.entries(files).map(([slot, file]) => [slot, { url: `/theme-assets/${key}/${file}` }]));
export const THEME_PRESETS = {
  default: { name: 'Store default', colors: DEFAULT_THEME, decoration: 'none' },
  diwali: { name: 'Diwali', colors: { ...DEFAULT_THEME, background: '#fff4df', surface: '#fffaf0', border: '#e9c987', footer: '#fff4df', footerText: '#632a25', accent: '#d99a18' }, decoration: 'diyas', styles: festiveStyles, announcement: 'Wishing you a bright and joyful Diwali!', assets: bundledAssets('diwali', { header: 'header-marigold.png', background: 'section-background.png', footer: 'footer-diyas.png' }) },
  holi: { name: 'Holi', colors: { ...DEFAULT_THEME, primary: '#86198f', primaryHover: '#701a75', background: '#fff7fc', surface: '#ffffff', border: '#f0cce8', footer: '#fff7fc', footerText: '#422047', muted: '#74536f', accent: '#db2777' }, decoration: 'confetti', styles: { ...festiveStyles, font: 'rounded', buttons: 'pill', cardRadius: 'round', backgroundSize: 720 }, announcement: 'Celebrate the colors of Holi with us!', assets: bundledAssets('holi') },
  eid: { name: 'Eid', colors: { ...DEFAULT_THEME, primary: '#166534', primaryHover: '#14532d', background: '#f3faf5', surface: '#ffffff', border: '#c9decf', footer: '#f3faf5', footerText: '#18432c', muted: '#526b5b', accent: '#b58a21' }, decoration: 'lanterns', styles: festiveStyles, announcement: 'Eid Mubarak! Wishing you peace and joy.', assets: bundledAssets('eid') },
  christmas: { name: 'Christmas', colors: { ...DEFAULT_THEME, primary: '#a51d2d', primaryHover: '#861827', background: '#f5faf7', surface: '#ffffff', border: '#cbded2', footer: '#f5faf7', footerText: '#234334', muted: '#536b5d', accent: '#ad852f' }, decoration: 'snowflakes', styles: { ...festiveStyles, backgroundSize: 720 }, announcement: 'Merry Christmas and warm holiday wishes!', assets: bundledAssets('christmas') },
  independence: { name: 'Independence Day', colors: { ...DEFAULT_THEME, primary: '#166534', primaryHover: '#14532d', background: '#fffaf2', surface: '#ffffff', border: '#ecdac1', footer: '#fffaf2', footerText: '#243b36', muted: '#5f6b63', accent: '#df7420' }, decoration: 'confetti', styles: festiveStyles, announcement: 'Celebrating the spirit of Independence Day.', assets: bundledAssets('independence') },
  republic: { name: 'Republic Day', colors: { ...DEFAULT_THEME, primary: '#173c73', primaryHover: '#112d57', background: '#f7faff', surface: '#ffffff', border: '#d3deeb', footer: '#f7faff', footerText: '#233951', muted: '#586b82', accent: '#d87020' }, decoration: 'stars', styles: festiveStyles, announcement: 'Celebrating unity on Republic Day.', assets: bundledAssets('republic') },
  raksha: { name: 'Raksha Bandhan', colors: { ...DEFAULT_THEME, primary: '#9b2447', primaryHover: '#7b1d38', background: '#fff5f3', surface: '#fffcfa', border: '#ebcbbd', footer: '#fff5f3', footerText: '#542c34', muted: '#79565e', accent: '#b58031' }, decoration: 'flowers', styles: festiveStyles, announcement: 'Celebrating the beautiful bond of Raksha Bandhan.', assets: bundledAssets('raksha') },
};
export function presetConfig(key = 'default') {
  const preset = THEME_PRESETS[key] || THEME_PRESETS.default;
  return { colors: { ...preset.colors }, styles: { ...DEFAULT_THEME_STYLES, ...preset.styles }, decoration: preset.decoration, announcement: preset.announcement || '', motion: false, assets: Object.fromEntries(Object.entries(preset.assets || {}).map(([slot, asset]) => [slot, { ...asset }])), bannerIds: [] };
}
// Preset artwork changes with the festival; admin-uploaded overrides survive.
// Removing a preset image remains intentional until another preset is selected.
export function applyThemePreset(current, key) {
  const config = presetConfig(key);
  const bundledUrls = new Set(Object.values(THEME_PRESETS).flatMap(p => Object.values(p.assets || {}).map(a => a.url)));
  const overrides = Object.fromEntries(Object.entries(current?.assets || {}).filter(([, asset]) => !bundledUrls.has(asset.url)));
  const presetAnnouncements = new Set(Object.values(THEME_PRESETS).map(p => p.announcement || ''));
  return { ...config, assets: { ...config.assets, ...overrides }, announcement: presetAnnouncements.has(current?.announcement || '') ? config.announcement : current.announcement, bannerIds: [...(current?.bannerIds || [])] };
}
// All schedule comparisons are absolute UTC instants; end is exclusive.
export function resolveTheme(campaigns, manualId, now = Date.now()) {
  if (manualId === 'default') return { id: null, name: 'Store default', config: presetConfig(), nextChangeAt: null };
  const eligible = campaigns.filter(c => c.published && !c.archived);
  const manual = eligible.find(c => String(c._id) === String(manualId));
  const scheduled = eligible.filter(c => c.schedule?.enabled && c.schedule.startAt && c.schedule.endAt && +new Date(c.schedule.startAt) <= now && +new Date(c.schedule.endAt) > now)
    .sort((a, b) => (b.schedule.priority || 0) - (a.schedule.priority || 0) || +new Date(b.publishedAt) - +new Date(a.publishedAt) || String(a._id).localeCompare(String(b._id)));
  const selected = manual || scheduled[0];
  const boundaries = eligible.filter(c => c.schedule?.enabled).flatMap(c => [c.schedule.startAt, c.schedule.endAt]).map(d => +new Date(d)).filter(t => Number.isFinite(t) && t > now);
  return { id: selected ? String(selected._id) : null, name: selected?.name || 'Store default', config: selected?.published || presetConfig(), nextChangeAt: manual || !boundaries.length ? null : new Date(Math.min(...boundaries)).toISOString() };
}
export function themeVariables(config) {
  const colors = { ...DEFAULT_THEME, ...config?.colors };
  const variables = Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--store-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, value]));
  if (config?.assets?.background?.url) variables['--store-background-image'] = `url(${JSON.stringify(config.assets.background.url)})`;
  const styles = themeStyles(config);
  const pattern = styles.pattern === 'auto' ? (config?.decoration === 'diyas' ? 'dots' : 'none') : styles.pattern;
  const ink = 'color-mix(in srgb, var(--store-accent) 20%, transparent)';
  const patterns = {
    none: 'none', dots: `radial-gradient(circle, ${ink} 1px, transparent 2px)`,
    stars: `radial-gradient(ellipse 1px 5px at center, ${ink} 95%, transparent), radial-gradient(ellipse 5px 1px at center, ${ink} 95%, transparent)`,
    diagonal: `repeating-linear-gradient(45deg, transparent 0 10px, ${ink} 10px 11px, transparent 11px 22px)`,
    grid: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
  };
  const fonts = { system: 'ui-sans-serif, system-ui, sans-serif', serif: 'Georgia, Cambria, serif', rounded: '"Trebuchet MS", Verdana, sans-serif' };
  Object.assign(variables, {
    '--store-font': fonts[styles.font], '--store-pattern-size': `${styles.patternSize}px`,
    '--store-background-size': styles.backgroundFit === 'tile' ? `${styles.backgroundSize}px` : styles.backgroundFit,
    '--store-decoration-size': `${styles.decorationSize}px`, '--store-header-height': `${styles.headerHeight}px`, '--store-footer-height': `${styles.footerHeight}px`,
    '--store-pattern-image': patterns[pattern],
    '--store-header-image-height': `${styles.headerImageHeight}px`, '--store-footer-image-height': `${styles.footerImageHeight}px`,
  });
  return variables;
}
export function contrastRatio(a, b) {
  const luminance = hex => {
    const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
