import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import ThemeStyleControls from '../../components/admin/ThemeStyleControls';
import { Upload, ImagePlus } from 'lucide-react';
import useToast from '../../hooks/useToast';
import { themeService } from '../../services/themeService';
import { useSeasonalTheme } from '../../hooks/useSeasonalTheme';
import { THEME_PRESETS, presetConfig, applyThemePreset, contrastRatio } from '../../../../shared/seasonalThemes';

const empty = () => ({ name: 'Diwali campaign', preset: 'diwali', draft: presetConfig('diwali'), schedule: { enabled: false, startAt: null, endAt: null, priority: 0 }, revision: 0 });
// datetime-local is explicitly Asia/Kolkata, irrespective of the admin's device timezone.
const indiaInput = value => value ? new Date(+new Date(value) + 330 * 60000).toISOString().slice(0, 16) : '';
const indiaUTC = value => value ? new Date(`${value}:00+05:30`).toISOString() : null;
const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white p-2 text-sm';
const Labels = { primary: 'Primary / navigation', primaryHover: 'Primary hover', background: 'Page background', surface: 'Cards / header', text: 'Main text', muted: 'Secondary text', border: 'Borders', footer: 'Footer background', footerText: 'Footer text', accent: 'Festival accent' };

export default function AdminSeasonalThemesPage() {
  const { id } = useParams(); const navigate = useNavigate(); const toast = useToast(); const { refresh } = useSeasonalTheme();
  const [themes, setThemes] = useState([]); const [active, setActive] = useState(null); const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false); const [width, setWidth] = useState('100%'); const frame = useRef(null);
  const report = err => { const message = err.response?.data?.message || err.message || 'Unable to update theme'; setError(message); toast.error(message); };
  const loadList = async () => { const data = await themeService.list(); setThemes(data.themes); setActive(data.active); };
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    Promise.all([themeService.list(), id ? themeService.get(id) : Promise.resolve({ theme: empty() })])
      .then(([list, detail]) => { if (!cancelled) { setThemes(list.themes); setActive(list.active); setForm(detail.theme); setDirty(false); } })
      .catch(err => { if (!cancelled) setError(err.response?.data?.message || 'Unable to load themes. Try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const sendPreview = useCallback(() => frame.current?.contentWindow?.postMessage({ type: 'vinexus-theme-preview', config: form.draft, banners: [] }, window.location.origin), [form.draft]);
  useEffect(() => { sendPreview(); }, [sendPreview]);
  useEffect(() => {
    const ready = event => { if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'vinexus-theme-preview-ready') sendPreview(); };
    window.addEventListener('message', ready); return () => window.removeEventListener('message', ready);
  }, [sendPreview]);
  const edit = changes => { setForm(current => ({ ...current, ...changes })); setDirty(true); };
  const draft = changes => edit({ draft: { ...form.draft, ...changes } });
  const changeSchedule = changes => edit({ schedule: { ...form.schedule, ...changes } });
  const go = path => { if (!dirty || window.confirm('Discard unsaved theme changes?')) { if (path.endsWith('/new')) { setForm(empty()); setDirty(false); } navigate(path); } };
  const persist = async (candidate = form) => {
    const payload = { name: candidate.name.trim() || 'Festival campaign', preset: candidate.preset, draft: candidate.draft, schedule: candidate.schedule, revision: candidate.revision };
    const result = candidate._id ? await themeService.save(candidate._id, payload) : await themeService.create(payload);
    return result.theme;
  };
  const save = async () => {
    setBusy(true); setError('');
    try {
      const saved = await persist();
      setForm(saved); setDirty(false); await loadList(); toast.success('Theme draft saved. Apply to store when ready.');
      if (!form._id) navigate(`/admin/cms/themes/${saved._id}`);
      return saved;
    } catch (err) { report(err); return null; } finally { setBusy(false); }
  };
  const act = async action => {
    if (busy) return;
    if (!window.confirm(action === 'apply' ? 'Save, publish and apply this design to the live store now? This overrides schedules until you resume them.' : action === 'activate' ? 'Activate this published theme now? It overrides schedules until you resume them.' : action === 'publish' ? 'Save and publish this draft and its schedule? If already active, the storefront changes immediately.' : `${action === 'archive' ? 'Archive' : 'Duplicate'} this campaign?`)) return;
    setBusy(true); setError('');
    try {
      let current = form;
      if (dirty || !current._id) { current = await persist(); setForm(current); setDirty(false); }
      let result;
      if (action === 'apply') {
        result = await themeService.action(current._id, 'publish', current.revision);
        setForm(result.theme);
        result = await themeService.action(current._id, 'activate', result.theme.revision);
      } else result = await themeService.action(current._id, action, current.revision);
      setForm(result.theme);
      if (action === 'duplicate' || !form._id) navigate(`/admin/cms/themes/${result.theme._id}`);
      await loadList(); await refresh(); toast.success(action === 'apply' ? 'Theme applied to the store.' : 'Theme updated.');
    }
    catch (err) { report(err); } finally { setBusy(false); }
  };
  const reset = async resume => {
    if (!window.confirm(resume ? 'Clear the manual override and resume scheduled campaigns?' : 'Restore the default store theme and pause scheduled activation?')) return;
    setBusy(true); try { await themeService.reset(resume); await loadList(); await refresh(); toast.success(resume ? 'Schedules resumed.' : 'Default theme restored.'); } catch (err) { report(err); } finally { setBusy(false); }
  };
  const upload = async (slot, event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error('Choose a PNG, JPG or WebP image up to 5 MB.'); return; }
    if (busy) return;
    setBusy(true); setError('');
    let current = form;
    try {
      if (!current._id) { current = await persist(); setForm(current); setDirty(false); }
      const result = await themeService.upload(current._id, slot, file);
      const saved = await persist({ ...current, draft: { ...current.draft, assets: { ...current.draft.assets, [slot]: result.asset } } });
      setForm(saved); setDirty(false); await loadList();
      toast.success(`${slot[0].toUpperCase() + slot.slice(1)} image uploaded to your draft. Apply to store when ready.`);
    } catch (err) { report(err); }
    finally { if (!form._id && current._id) navigate(`/admin/cms/themes/${current._id}`); setBusy(false); }
  };
  if (loading) return <p className="p-6">Loading themes…</p>;
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">Seasonal Themes</h1><p className="text-sm text-gray-500">Live: {active?.name || 'Store default'}. Draft edits stay private until published.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => reset(false)}>Restore default</Button><Button variant="secondary" disabled={busy} onClick={() => reset(true)}>Resume schedules</Button><Button disabled={busy} onClick={() => go('/admin/cms/themes/new')}>New campaign</Button></div></div>
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><p className="text-sm text-gray-600">{busy ? 'Working…' : dirty ? 'Unsaved changes — preview updates immediately.' : 'Upload images or edit the design, then apply it to the store.'}</p><div className="flex gap-2"><Button variant="secondary" disabled={busy || !form.name.trim()} onClick={save}>Save draft{dirty ? ' *' : ''}</Button><Button disabled={busy || !form.name.trim()} onClick={() => act('apply')}>Apply to store</Button></div></div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error} <button className="underline" onClick={() => window.location.reload()}>Reload</button></div>}
    <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
      <aside className="space-y-2"><h2 className="font-semibold">Saved campaigns</h2>{!themes.length && <p className="text-sm text-gray-500">Create your first festival theme.</p>}{themes.map(t => <button key={t._id} onClick={() => go(`/admin/cms/themes/${t._id}`)} className={`w-full rounded-lg border p-3 text-left ${t._id === id ? 'border-primary bg-rose-50' : 'border-gray-200 bg-white'}`}><span className="block font-medium">{t.name}</span><span className="text-xs text-gray-500">{t.archived ? 'Archived' : t.published ? 'Published' : 'Draft'}{t._id === active?.id ? ' · LIVE' : ''}{t.publishedSchedule?.enabled ? ' · Scheduled' : ''}</span></button>)}</aside>
      <fieldset disabled={busy} className="min-w-0 space-y-5 rounded-xl border border-gray-200 bg-white p-5 disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2"><label>Campaign name<input className={fieldClass} maxLength={100} value={form.name} onChange={e => edit({ name: e.target.value })} /></label><label>Preset<select aria-label="Preset" className={fieldClass} value={form.preset} onChange={e => edit({ preset: e.target.value, draft: applyThemePreset(form.draft, e.target.value) })}>{Object.entries(THEME_PRESETS).map(([key, p]) => <option key={key} value={key}>{p.name}</option>)}</select></label></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-gray-500">Festival presets include matching artwork, colors and styling. Custom uploads stay when switching presets.</p><button type="button" className="text-sm font-semibold text-primary underline" onClick={() => draft({ assets: presetConfig(form.preset).assets })}>Restore preset artwork</button></div>
        <h2 className="font-semibold">Storefront colors</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(form.draft.colors).map(([key, value]) => <label key={key} className="flex items-center justify-between gap-2 text-sm">{Labels[key]}<input aria-label={Labels[key]} type="color" value={value} onChange={e => draft({ colors: { ...form.draft.colors, [key]: e.target.value } })} className="h-9 w-14 cursor-pointer" /></label>)}</div>
        {[['text', 'background', 'Page text'], ['text', 'surface', 'Card text'], ['footerText', 'footer', 'Footer text'], ['muted', 'surface', 'Secondary text']].filter(([fg, bg]) => contrastRatio(form.draft.colors[fg], form.draft.colors[bg]) < 4.5).map(([fg, bg, label]) => <p key={fg + bg} role="status" className="text-sm text-amber-800">{label} has low contrast. Choose more distinct colors for readability.</p>)}
        {contrastRatio('#ffffff', form.draft.colors.primary) < 4.5 && <p className="text-sm text-amber-800">Primary color is too light for white button/navigation text.</p>}
        <div className="grid gap-4 sm:grid-cols-2"><label>Festival decoration<select className={fieldClass} value={form.draft.decoration} onChange={e => draft({ decoration: e.target.value })}>{['none', 'diyas', 'stars', 'confetti', 'garland', 'flowers', 'snowflakes', 'lanterns'].map(v => <option key={v}>{v}</option>)}</select></label><label>Announcement<input className={fieldClass} maxLength={200} value={form.draft.announcement} placeholder="Celebrate Diwali with us!" onChange={e => draft({ announcement: e.target.value })} /></label></div>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.draft.motion} onChange={e => draft({ motion: e.target.checked })} />Subtle decoration animation (respects reduced-motion preferences)</label>
        <ThemeStyleControls config={form.draft} onChange={styles => draft({ styles })} />
        <h2 className="font-semibold">Theme image uploads</h2>
        <div className="grid gap-4 sm:grid-cols-3">{['header', 'background', 'footer'].map(slot => <div key={slot} className="min-w-0 rounded-xl border border-gray-200 p-3"><h3 className="mb-2 font-medium capitalize">{slot} image</h3><div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gray-50">{form.draft.assets[slot]?.url ? <img src={form.draft.assets[slot].url} alt={`${slot} decoration`} className="h-full w-full object-contain" /> : <ImagePlus className="h-8 w-8 text-gray-400" />}</div><label className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-rose-50 ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" /><span>{form.draft.assets[slot] ? 'Replace' : 'Upload'} {slot} image</span><input aria-label={`Upload ${slot} image`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => upload(slot, e)} className="sr-only" /></label>{form.draft.assets[slot] && <button className="mt-2 text-sm underline" onClick={() => { const assets = { ...form.draft.assets }; delete assets[slot]; draft({ assets }); }}>Remove from draft</button>}</div>)}</div><p className="text-xs text-gray-500">PNG/JPG/WebP, max 5 MB. Uploading automatically saves your private draft. Header/footer images display without cropping; background images repeat throughout the storefront.</p>
        <p className="text-sm text-gray-500">Homepage campaign previews use the same four-section bento grid configured in Admin → Homepage Banners.</p>
        <div className="rounded-lg border p-4 space-y-3"><label className="flex gap-2 font-medium"><input type="checkbox" checked={form.schedule.enabled} onChange={e => changeSchedule({ enabled: e.target.checked })} />Schedule this campaign</label><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Start (India time)<input type="datetime-local" className={fieldClass} value={indiaInput(form.schedule.startAt)} onChange={e => changeSchedule({ startAt: indiaUTC(e.target.value) })} /></label><label className="text-sm">End (India time)<input type="datetime-local" className={fieldClass} value={indiaInput(form.schedule.endAt)} onChange={e => changeSchedule({ endAt: indiaUTC(e.target.value) })} /></label><label className="text-sm">Priority (0–100)<input type="number" min="0" max="100" className={fieldClass} value={form.schedule.priority} onChange={e => changeSchedule({ priority: Number(e.target.value) })} /></label></div><p className="text-xs text-gray-500">Publish to apply the schedule. Highest priority wins overlaps, then most recently published. The default returns after the last campaign ends. Manual activation overrides schedules.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => act('publish')}>Publish draft</Button>{form._id && <><Button variant="secondary" disabled={busy || !form.published || form.archived} onClick={() => act('activate')}>Activate now</Button><Button variant="secondary" disabled={busy} onClick={() => act('duplicate')}>Duplicate</Button><Button variant="danger" disabled={busy || form.archived} onClick={() => act('archive')}>Archive</Button></>}</div>
        {form.history?.some(h => h.config) && <label className="block text-sm">Restore an earlier published design to draft<select className={fieldClass} defaultValue="" onChange={e => { if (e.target.value !== '') draft(form.history[Number(e.target.value)].config); e.target.value = ''; }}><option value="">Choose version…</option>{form.history.map((h, i) => h.config && <option key={i} value={i}>{new Date(h.publishedAt).toLocaleString()}</option>)}</select></label>}
      </fieldset>
    </div>
    <section className="rounded-xl border bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Live draft preview</h2><p className="text-xs text-gray-500">Actual storefront, isolated from the published theme. Preview does not change customers’ theme.</p></div><div className="flex gap-2">{[['Desktop', '100%'], ['Tablet', '768px'], ['Mobile', '390px']].map(([label, size]) => <Button key={label} variant={width === size ? 'primary' : 'secondary'} size="sm" onClick={() => setWidth(size)}>{label}</Button>)}</div></div><div className="overflow-x-auto"><iframe ref={frame} title="Seasonal theme storefront preview" src="/theme-preview" onLoad={sendPreview} style={{ width, maxWidth: '100%', height: 700, display: 'block', margin: 'auto', border: '1px solid #e5e7eb' }} /></div></section>
  </div>;
}
