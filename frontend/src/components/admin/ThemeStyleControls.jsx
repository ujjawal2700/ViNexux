import React from 'react';
import { themeStyles, THEME_STYLE_LOOKS } from '../../../../shared/seasonalThemes';
const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm';
const choices = [
  ['font', 'Font family', ['system', 'serif', 'rounded']], ['heading', 'Section headings', ['plain', 'accent', 'underline']],
  ['buttons', 'Button shape', ['default', 'square', 'rounded', 'pill']], ['cardRadius', 'Product card corners', ['default', 'square', 'soft', 'round']],
  ['cardShadow', 'Product card shadow', ['default', 'none', 'subtle', 'lifted']], ['cardBorder', 'Product card border', ['default', 'none', 'accent']],
  ['spacing', 'Homepage section spacing', ['default', 'compact', 'airy']], ['pattern', 'Background pattern', ['auto', 'none', 'dots', 'stars', 'diagonal', 'grid']],
  ['backgroundFit', 'Uploaded background display', ['tile', 'cover', 'contain']], ['navigation', 'Navigation style', ['solid', 'gradient']],
  ['announcement', 'Announcement style', ['solid', 'soft', 'outline']], ['footer', 'Footer finish', ['solid', 'tinted']],
  ['decorationPlacement', 'Decoration placement', ['both', 'header', 'footer', 'off']],
];
const sliders = [
  ['patternSize', 'Pattern spacing', 16, 120, 'px'], ['backgroundSize', 'Background tile size', 120, 1200, 'px'],
  ['decorationSize', 'Decoration icon size', 12, 40, 'px'], ['decorationCount', 'Decoration density', 6, 24, 'icons'],
  ['headerHeight', 'Header decoration height', 16, 96, 'px'], ['footerHeight', 'Footer decoration height', 24, 160, 'px'],
  ['headerImageHeight', 'Header image max height', 24, 200, 'px'], ['footerImageHeight', 'Footer image max height', 24, 320, 'px'],
];
export default function ThemeStyleControls({ config, onChange }) {
  const styles = themeStyles(config);
  const change = (key, value) => onChange({ ...styles, [key]: value });
  return <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
    <div><h2 className="font-semibold">Advanced styling</h2><p className="text-xs text-gray-500">Change the look without changing your store content. Every option updates the draft preview.</p></div>
    <div className="flex flex-wrap gap-2">{Object.entries(THEME_STYLE_LOOKS).map(([key, look]) => <button key={key} type="button" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary" onClick={() => onChange({ ...look.styles })}>{look.label}</button>)}</div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{choices.map(([key, label, options]) => <label key={key} className="text-sm">{label}<select aria-label={label} className={field} value={styles[key]} onChange={e => change(key, e.target.value)}>{options.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>)}</div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sliders.map(([key, label, min, max, unit]) => <label key={key} className="text-sm"><span className="flex justify-between gap-2">{label}<span className="text-gray-500">{styles[key]} {unit}</span></span><input aria-label={label} className="mt-2 w-full accent-[#800020]" type="range" min={min} max={max} value={styles[key]} disabled={key === 'backgroundSize' && styles.backgroundFit !== 'tile'} onChange={e => change(key, Number(e.target.value))} /></label>)}</div>
    <p className="text-xs text-gray-500">System fonts need no external downloads. Heading underlines affect page sections only, not footer headings. Uploaded backgrounds replace generated patterns. Mobile decoration density is reduced automatically.</p>
  </section>;
}
