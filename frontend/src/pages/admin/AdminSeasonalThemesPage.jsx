import NumberInput from '../../components/ui/NumberInput';
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
const ThemeStyleControls = lazy(() => import('../../components/admin/ThemeStyleControls'));
import { Upload, ImagePlus, Eye, CheckCircle2, Palette } from 'lucide-react';
import useToast from '../../hooks/useToast';
import useConfirm from '../../hooks/useConfirm';
import useAuth from '../../hooks/useAuth';
import { readSessionDraft, saveSessionDraft, clearSessionDraft } from '../../utils/sessionDraft';
import { themeService } from '../../services/themeService';
import { useSeasonalTheme } from '../../hooks/useSeasonalTheme';
import { THEME_PRESETS, presetConfig, normalizeThemeConfig, applyThemePreset, contrastRatio } from '../../../../shared/seasonalThemes';

const empty = () => ({ name: 'Diwali campaign', preset: 'diwali', draft: presetConfig('diwali'), schedule: { enabled: false, startAt: null, endAt: null, priority: 0 }, revision: 0, history: [] });
const normalizeCampaign = theme => {
  if (!theme || typeof theme !== 'object') throw new Error('The campaign could not be loaded. Reload and try again.');
  const date = value => value && Number.isFinite(+new Date(value)) ? new Date(value).toISOString() : null;
  const schedule = theme.schedule || {};
  return { ...empty(), ...theme,
    name: typeof theme.name === 'string' ? theme.name : 'Festival campaign',
    preset: Object.hasOwn(THEME_PRESETS, theme.preset) ? theme.preset : 'default',
    revision: Number.isInteger(theme.revision) && theme.revision >= 0 ? theme.revision : 0,
    draft: normalizeThemeConfig(theme.draft, theme.preset),
    schedule: { enabled: schedule.enabled === true, startAt: date(schedule.startAt), endAt: date(schedule.endAt), priority: Number.isFinite(schedule.priority) ? Math.max(0, Math.min(100, Math.round(schedule.priority))) : 0 },
    history: Array.isArray(theme.history) ? theme.history.filter(entry => entry && typeof entry === 'object') : [],
  };
};
// datetime-local is explicitly Asia/Kolkata, irrespective of the admin's device timezone.
const indiaInput = value => value && Number.isFinite(+new Date(value)) ? new Date(+new Date(value) + 330 * 60000).toISOString().slice(0, 16) : '';
const indiaUTC = value => value && Number.isFinite(+new Date(`${value}:00+05:30`)) ? new Date(`${value}:00+05:30`).toISOString() : null;
const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white p-2 text-sm';
const Labels = { primary: 'Primary / navigation', primaryHover: 'Primary hover', background: 'Page background', surface: 'Cards / header', text: 'Main text', muted: 'Secondary text', border: 'Borders', footer: 'Footer background', footerText: 'Footer text', accent: 'Festival accent' };

export default function AdminSeasonalThemesPage() {
  const askConfirmation = useConfirm();
  const { adminUser } = useAuth();
  const { id } = useParams(); const navigate = useNavigate(); const toast = useToast(); const { refresh } = useSeasonalTheme();
  const recoveryKey = `vinexus-theme-draft:${adminUser?._id}:${id || 'new'}`;
  const [themes, setThemes] = useState([]); const [active, setActive] = useState(null); const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const busyRef = useRef(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false); const [reloadVersion, setReloadVersion] = useState(0);
  const [dirty, setDirty] = useState(false); const [width, setWidth] = useState('100%'); const frame = useRef(null);
  const previewBox = useRef(null); const [previewSpace, setPreviewSpace] = useState(440);
  const previewWidth = width === '100%' ? 1280 : parseInt(width, 10);
  const previewScale = Math.min(1, previewSpace / previewWidth);
  useEffect(() => {
    if (!previewBox.current) return;
    const observer = new ResizeObserver(([entry]) => setPreviewSpace(Math.max(1, entry.contentRect.width)));
    observer.observe(previewBox.current); return () => observer.disconnect();
  }, [loading, loadFailed]);
  const report = err => { const message = err.response?.data?.message || err.message || 'Unable to update theme'; setError(message); };
  const loadList = async () => { const data = await themeService.list(); setThemes(Array.isArray(data?.themes) ? data.themes.filter(t => t && typeof t._id === 'string') : []); setActive(data?.active || null); };
  useEffect(() => {
    let cancelled = false; setLoading(true); setLoadFailed(false); setError('');
    Promise.all([themeService.list(), id ? themeService.get(id) : Promise.resolve({ theme: empty() })])
      .then(([list, detail]) => { if (!cancelled) {
        const saved = normalizeCampaign(detail.theme);
        const recovered = readSessionDraft(recoveryKey);
        const restore = recovered && recovered._id === saved._id;
        setThemes(Array.isArray(list?.themes) ? list.themes.filter(t => t && typeof t._id === 'string') : []); setActive(list?.active || null);
        setForm(restore ? normalizeCampaign({ ...saved, name: recovered.name, preset: recovered.preset, draft: recovered.draft, schedule: recovered.schedule, revision: recovered.revision }) : saved);
        setDirty(!!restore);
      } })
      .catch(err => { if (!cancelled) { setLoadFailed(true); setError(err.response?.data?.message || err.message || 'Unable to load themes. Try again.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, reloadVersion, recoveryKey]);
  useEffect(() => {
    if (loading || loadFailed || (form._id || undefined) !== (id || undefined)) return;
    if (dirty) saveSessionDraft(recoveryKey, form); else clearSessionDraft(recoveryKey);
  }, [form, dirty, loading, loadFailed, id, recoveryKey]);
  const sendPreview = useCallback(() => frame.current?.contentWindow?.postMessage({ type: 'vinexus-theme-preview', config: form.draft, banners: [] }, window.location.origin), [form.draft]);
  useEffect(() => { const timer = setTimeout(sendPreview, 180); return () => clearTimeout(timer); }, [sendPreview]);
  useEffect(() => {
    const ready = event => { if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'vinexus-theme-preview-ready') sendPreview(); };
    window.addEventListener('message', ready); return () => window.removeEventListener('message', ready);
  }, [sendPreview]);
  const edit = changes => { setForm(current => ({ ...current, ...changes })); setDirty(true); };
  const draft = changes => edit({ draft: { ...form.draft, ...changes } });
  const selectFestival = preset => {
    const previous = THEME_PRESETS[form.preset].name;
    const automaticName = [`${previous} campaign`, `${previous} theme`, 'Festival campaign'].includes(form.name);
    edit({ preset, name: automaticName ? `${THEME_PRESETS[preset].name} theme` : form.name, draft: applyThemePreset(form.draft, preset) });
  };
  const changeSchedule = changes => edit({ schedule: { ...form.schedule, ...changes } });
  const go = async path => { if (!dirty || await askConfirmation({ title: 'Discard unsaved changes?', message: 'Your edits have not been saved. Discard them and continue?', confirmText: 'Discard changes', variant: 'danger' })) { clearSessionDraft(recoveryKey); if (path.endsWith('/new')) { setForm(empty()); setDirty(false); } navigate(path); } };
  const persist = async (candidate = form) => {
    if (!candidate.name.trim()) throw new Error('Enter a name for this theme before saving.');
    if (candidate.schedule.enabled && (!candidate.schedule.startAt || !candidate.schedule.endAt || +new Date(candidate.schedule.endAt) <= +new Date(candidate.schedule.startAt))) throw new Error('Choose a start and an end date. The end must be after the start.');
    const payload = { name: candidate.name.trim() || 'Festival campaign', preset: candidate.preset, draft: candidate.draft, schedule: candidate.schedule, revision: candidate.revision };
    const result = candidate._id ? await themeService.save(candidate._id, payload) : await themeService.create(payload);
    if (!result?.theme?._id) throw new Error('The save response was incomplete. Your edits are still here; try saving again.');
    clearSessionDraft(recoveryKey);
    return normalizeCampaign(result.theme);
  };
  const save = async () => {
    if (busyRef.current) return; busyRef.current = true;
    setBusy(true); setError('');
    try {
      const saved = await persist();
      setForm(saved); setDirty(false); await loadList(); toast.success('Theme draft saved. Apply to store when ready.');
      if (!form._id) navigate(`/admin/cms/themes/${saved._id}`);
      return saved;
    } catch (err) { report(err); return null; } finally { busyRef.current = false; setBusy(false); }
  };
  const act = async action => {
    if (busyRef.current) return;
    if (!await askConfirmation({ title: { apply: 'Apply theme?', activate: 'Activate theme?', publish: 'Save theme schedule?', archive: 'Archive theme?', duplicate: 'Duplicate theme?' }[action], confirmText: { apply: 'Apply theme', activate: 'Activate theme', publish: 'Save schedule', archive: 'Archive theme', duplicate: 'Duplicate theme' }[action], variant: action === 'archive' ? 'danger' : undefined,
      message: action === 'apply' ? 'This will replace the current website theme and pause automatic schedules.' : action === 'activate' ? 'This saved theme will become visible to customers and pause automatic schedules.' : action === 'publish' ? 'Save this theme and its schedule? If it is already live, its changes will also be published.' : `${action === 'archive' ? 'Archive' : 'Duplicate'} this theme?` })) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      let current = form;
      if (dirty || !current._id) { current = await persist(); setForm(current); setDirty(false); }
      let result;
      if (action === 'apply') {
        result = await themeService.action(current._id, 'publish', current.revision);
        setForm(normalizeCampaign(result.theme));
        result = await themeService.action(current._id, 'activate', result.theme.revision);
      } else result = await themeService.action(current._id, action, current.revision);
      setForm(normalizeCampaign(result.theme));
      if (action === 'duplicate' || !form._id) navigate(`/admin/cms/themes/${result.theme._id}`);
      await loadList(); await refresh(); toast.success(action === 'apply' ? 'Theme applied to the store.' : 'Theme updated.');
    }
    catch (err) { report(err); } finally { busyRef.current = false; setBusy(false); }
  };
  const reset = async resume => {
    if (!await askConfirmation({ title: resume ? 'Resume schedules?' : 'Restore default theme?', message: resume ? 'Automatic schedules will choose which theme appears on your website.' : 'The default store design will replace the current theme and pause automatic schedules.', confirmText: resume ? 'Resume schedules' : 'Restore default' })) return;
    if (busyRef.current) return; busyRef.current = true;
    setBusy(true); setError(''); try { await themeService.reset(resume); await loadList(); await refresh(); toast.success(resume ? 'Schedules resumed.' : 'Default theme restored.'); } catch (err) { report(err); } finally { busyRef.current = false; setBusy(false); }
  };
  const upload = async (slot, event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPG or WebP picture up to 5 MB.'); return; }
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    let current = form;
    try {
      if (!current._id) { current = await persist(); setForm(current); setDirty(false); }
      const result = await themeService.upload(current._id, slot, file);
      if (!result?.asset?.url) throw new Error('The picture upload did not complete. Your draft is still saved; please try uploading again.');
      const saved = await persist({ ...current, draft: { ...current.draft, assets: { ...current.draft.assets, [slot]: result.asset } } });
      setForm(saved); setDirty(false); await loadList();
      toast.success(`${slot[0].toUpperCase() + slot.slice(1)} image uploaded to your draft. Apply to store when ready.`);
    } catch (err) { report(err); }
    finally { if (!form._id && current._id) navigate(`/admin/cms/themes/${current._id}`); busyRef.current = false; setBusy(false); }
  };
  if (loading) return <p className="p-6">Loading themes…</p>;
  if (loadFailed) return <div className="rounded-xl border bg-white p-6"><h1 className="text-2xl font-bold">Seasonal Themes</h1><p role="alert" className="my-4 text-sm text-rose-700">{error}</p><div className="flex gap-3"><Button onClick={() => setReloadVersion(v => v + 1)}>Try again</Button><Button variant="secondary" onClick={() => go('/admin/cms/themes/new')}>New theme</Button></div></div>;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Seasonal Themes</h1><p className="mt-1 text-sm text-gray-500">Choose a festival, make it yours, and preview it before it goes live.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3"><p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"><CheckCircle2 size={14} />Live: {typeof active?.name === 'string' ? active.name : 'Store default'}.</p>
          {typeof active?.id === 'string' && <button disabled={busy} className="text-xs font-semibold text-primary underline" onClick={() => go(`/admin/cms/themes/${active.id}`)}>Edit live theme</button>}</div></div>
      <Button variant="secondary" disabled={busy} onClick={() => go('/admin/cms/themes/new')}>New theme</Button>
    </header>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}<button className="ml-3 underline" onClick={() => setError('')}>Dismiss</button></div>}
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div><p className="text-sm font-semibold">{busy ? 'Updating your theme…' : dirty ? 'You have unsaved changes' : 'Your draft is ready to edit'}</p><p className="mt-1 text-xs text-gray-500">Save keeps it private. Apply makes it visible to customers.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy || !form.name.trim()} onClick={save}>Save draft{dirty ? ' *' : ''}</Button><Button disabled={busy || !form.name.trim()} onClick={() => act('apply')}>Apply to store</Button></div>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-70">
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Palette size={18} className="text-primary" />1. Choose your theme</h2>
          <label className="block text-sm font-medium">Festival<select aria-label="Festival" className={`${fieldClass} mt-2`} value={form.preset} onChange={e => selectFestival(e.target.value)}>{Object.entries(THEME_PRESETS).map(([key, p]) => <option key={key} value={key}>{p.name}</option>)}</select></label>
          <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Matching colors and decorations are included.</span><div className="ml-auto flex shrink-0 gap-1">{['primary', 'background', 'accent'].map(key => <span key={key} className="h-5 w-5 rounded-full border border-gray-200" style={{ background: form.draft.colors[key] }} />)}</div></div>
          <label className="block text-sm font-medium">Theme name<input aria-label="Theme name" className={`${fieldClass} mt-2`} maxLength={100} value={form.name} onChange={e => edit({ name: e.target.value })} /><span className="mt-1 block text-xs font-normal text-gray-500">A name to help you find this theme later.</span></label>
        </section>
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">2. Add your message and pictures</h2>
          <label className="block text-sm font-medium">Announcement<input aria-label="Announcement" className={`${fieldClass} mt-2`} maxLength={200} value={form.draft.announcement} placeholder="e.g. Happy Diwali! Visit us for festive offers." onChange={e => draft({ announcement: e.target.value })} /><span className="mt-1 block text-xs font-normal text-gray-500">Shown at the top of your website. Leave blank to hide it.</span></label>
          <p className="text-xs text-gray-500">The festival pictures are ready to use. Replacing them is optional.</p>
          <div className="grid gap-3 sm:grid-cols-3">{['header', 'background', 'footer'].map(slot => <div key={slot} className="min-w-0 rounded-lg border border-gray-200 p-3"><h3 className="text-sm font-medium">{slot === 'header' ? 'Top of website' : slot === 'footer' ? 'Bottom of website' : 'Page background'}</h3>
            <div className="my-3 flex h-20 items-center justify-center overflow-hidden rounded bg-gray-50">{form.draft.assets[slot]?.url ? <img src={form.draft.assets[slot].url} alt={`${slot} decoration`} className="h-full w-full object-contain" loading="lazy" /> : <ImagePlus size={24} className="text-gray-400" />}</div>
            <label className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold text-primary hover:bg-rose-50 ${busy ? 'pointer-events-none' : ''}`}><Upload size={13} />{form.draft.assets[slot] ? 'Replace picture' : 'Upload picture'}<input aria-label={`Upload ${slot} image`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => upload(slot, e)} className="sr-only" /></label>
            {form.draft.assets[slot] && <button type="button" className="mt-2 w-full text-xs text-gray-500 underline" onClick={() => { const assets = { ...form.draft.assets }; delete assets[slot]; draft({ assets }); }}>Remove picture</button>}
          </div>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-gray-500">PNG, JPG or WebP · up to 5 MB</span><button type="button" className="font-semibold text-primary underline" onClick={() => draft({ assets: presetConfig(form.preset).assets })}>Restore preset artwork</button></div>
        </section>
        <details onToggle={event => setMoreOpen(event.currentTarget.open)} className="rounded-xl border border-gray-200 bg-white p-5"><summary className="cursor-pointer text-sm font-semibold">More design options</summary><div className="mt-5 space-y-5">
          <p className="text-xs text-gray-500">Optional. The selected festival already includes a complete design.</p>
          <div className="grid gap-3 sm:grid-cols-2">{Object.entries(form.draft.colors).map(([key, value]) => <label key={key} className="flex items-center justify-between gap-2 text-sm">{Labels[key]}<input aria-label={Labels[key]} type="color" value={value} onChange={e => draft({ colors: { ...form.draft.colors, [key]: e.target.value } })} className="h-9 w-12 cursor-pointer" /></label>)}</div>
          {contrastRatio(form.draft.colors.text, form.draft.colors.background) < 4.5 && <p className="text-xs text-amber-800">Text may be difficult to read. Choose a darker text color or lighter background.</p>}
          <label className="block text-sm">Festival decoration<select className={`${fieldClass} mt-2`} value={form.draft.decoration} onChange={e => draft({ decoration: e.target.value })}>{['none', 'diyas', 'stars', 'confetti', 'garland', 'flowers', 'snowflakes', 'lanterns'].map(v => <option key={v}>{v}</option>)}</select></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.draft.motion} onChange={e => draft({ motion: e.target.checked })} />Animate decorations</label>
          <Suspense fallback={<p className="text-sm text-gray-500">Loading design options…</p>}>{moreOpen && <ThemeStyleControls config={form.draft} onChange={styles => draft({ styles })} />}</Suspense>
        </div></details>
        <details className="rounded-xl border border-gray-200 bg-white p-5"><summary className="cursor-pointer text-sm font-semibold">Schedule for later</summary><div className="mt-4 space-y-4">
          <p className="text-xs text-gray-500">Optional. Set dates, then choose “Save schedule” to publish those dates. Applying now overrides schedules.</p>
          <label className="flex gap-2 text-sm font-medium"><input type="checkbox" checked={form.schedule.enabled} onChange={e => changeSchedule({ enabled: e.target.checked })} />Schedule this campaign</label>
          {form.schedule.enabled && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Start (India time)<input type="datetime-local" className={`${fieldClass} mt-2`} value={indiaInput(form.schedule.startAt)} onChange={e => changeSchedule({ startAt: indiaUTC(e.target.value) })} /></label><label className="text-sm">End (India time)<input type="datetime-local" className={`${fieldClass} mt-2`} value={indiaInput(form.schedule.endAt)} onChange={e => changeSchedule({ endAt: indiaUTC(e.target.value) })} /></label></div>}
          <label className="block text-sm">Priority (0–100)<NumberInput aria-label="Priority (0–100)" type="number" min="0" max="100" className={`${fieldClass} mt-2`} value={form.schedule.priority} onChange={e => changeSchedule({ priority: Number(e.target.value) })} /><span className="mt-1 block text-xs text-gray-500">Leave at 0. A higher number takes priority if dates overlap.</span></label>
          <Button variant="secondary" onClick={() => act('publish')}>Save schedule</Button><Button variant="ghost" onClick={() => reset(true)}>Resume schedules</Button>
        </div></details>
      </fieldset>
      <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 xl:sticky xl:top-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Eye size={18} className="text-primary" />3. Preview your website</h2><p className="mt-1 text-xs text-gray-500">Only you can see these changes until you apply them.</p></div><div className="flex flex-wrap gap-1">{[['Desktop', '100%'], ['Tablet', '768px'], ['Mobile', '390px']].map(([label, size]) => <Button key={label} variant={width === size ? 'primary' : 'ghost'} size="sm" onClick={() => setWidth(size)}>{label}</Button>)}</div></div>
        <div ref={previewBox} className="overflow-hidden rounded-lg border bg-gray-50" style={{ height: Math.round(800 * previewScale) }}><iframe ref={frame} title="Seasonal theme storefront preview" src="/theme-preview" loading="lazy" onLoad={sendPreview} style={{ width: previewWidth, maxWidth: 'none', height: 800, display: 'block', border: 0, transform: `scale(${previewScale})`, transformOrigin: 'top left' }} /></div>
      </section>
    </div>
    <details className="rounded-xl border border-gray-200 bg-white p-5"><summary className="cursor-pointer text-sm font-semibold">Saved themes and store settings</summary><div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{!themes.length && <p className="text-sm text-gray-500">Your saved themes will appear here.</p>}{themes.map(t => <button key={t._id} disabled={busy} onClick={() => go(`/admin/cms/themes/${t._id}`)} className={`rounded-lg border p-4 text-left ${t._id === id ? 'border-primary bg-rose-50' : 'border-gray-200'}`}><span className="block text-sm font-semibold">{typeof t.name === 'string' ? t.name : 'Saved theme'}</span><span className="mt-1 block text-xs text-gray-500">{t.archived ? 'Archived' : t.published ? 'Ready to use' : 'Draft'}{t._id === active?.id ? ' · Live' : ''}</span></button>)}</div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => reset(false)}>Restore default</Button>{form._id && <><Button variant="secondary" disabled={busy} onClick={() => act('duplicate')}>Duplicate</Button><Button variant="secondary" disabled={busy || !form.published || form.archived} onClick={() => act('activate')}>Activate now</Button><Button variant="danger" disabled={busy || form.archived} onClick={() => act('archive')}>Archive</Button></>}</div>
      {form.history.some(h => h.config) && <label className="block text-sm">Restore an earlier published design to draft<select className={`${fieldClass} mt-2`} defaultValue="" onChange={e => { if (e.target.value !== '') draft(normalizeThemeConfig(form.history[Number(e.target.value)].config, form.preset)); e.target.value = ''; }}><option value="">Choose version…</option>{form.history.map((h, i) => h.config && <option key={i} value={i}>{h.publishedAt && Number.isFinite(+new Date(h.publishedAt)) ? new Date(h.publishedAt).toLocaleString() : `Earlier design ${i + 1}`}</option>)}</select></label>}
    </div></details>
  </div>;
}
