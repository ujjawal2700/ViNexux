import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Check, Search, ArrowLeft, ArrowUpRight, Layers, SlidersHorizontal, CheckSquare, CircleDot, ListFilter, Eye, EyeOff, X } from 'lucide-react';
import { canAdmin } from '../../../../shared/adminAccess.js';
import { editableProductIdentifier } from '../../../../shared/productDrafts.js';
import { filterService } from '../../services/filterService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import Image from '../../components/ui/Image';
const blankOption = () => ({ key: crypto.randomUUID(), label: '', products: [] });
const blankFilter = () => ({ name: '', type: 'checkbox', isActive: true, sortOrder: 0, options: [blankOption()] });
const displayTypes = { checkbox: { label: 'Checkboxes', hint: 'Choose multiple', icon: CheckSquare }, radio: { label: 'Radio buttons', hint: 'Choose one', icon: CircleDot }, select: { label: 'Dropdown', hint: 'Choose one', icon: ListFilter } };
const libraryPageSize = 12;
const editable = filter => ({ ...filter, options: filter.options.map(option => ({ ...option, key: String(option._id), products: option.products || [] })) });

export default function AdminFiltersPage() {
  const { adminAccess } = useOutletContext();
  const canWrite = canAdmin(adminAccess, 'filters', 'write');
  const [filters, setFilters] = useState([]);
  const [form, setForm] = useState(blankFilter);
  const [editorOpen, setEditorOpen] = useState(false);
  const [savedForm, setSavedForm] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [sort, setSort] = useState('order');
  const [libraryPage, setLibraryPage] = useState(1);
  const [optionSearch, setOptionSearch] = useState('');
  const [focusedOption, setFocusedOption] = useState(null);
  const addedOption = useRef(null);
  const [busy, setBusy] = useState('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [picker, setPicker] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchRetry, setSearchRetry] = useState(0);
  const load = useCallback(async () => {
    const response = await filterService.list(); setFilters(response.data.filters || []);
  }, []);
  useEffect(() => {
    let active = true;
    load().catch(err => { if (active) setError(err.response?.data?.message || 'Could not load filters.'); }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, [load]);
  useEffect(() => {
    if (!picker) return;
    const controller = new AbortController();
    setSearchBusy(true); setSearchError('');
    const timer = setTimeout(async () => {
      try {
        const response = await filterService.searchProducts({ search, page, limit: 20 }, controller.signal);
        if (!controller.signal.aborted) { setProducts(response.data.products || []); setPagination(response.data.pagination); }
      } catch (err) { if (!controller.signal.aborted) setSearchError(err.response?.data?.message || 'Could not load products.'); }
      finally { if (!controller.signal.aborted) setSearchBusy(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [picker, search, page, searchRetry]);
  const dirty = editorOpen && JSON.stringify(form) !== savedForm;
  const enabledCount = filters.filter(filter => filter.isActive).length;
  const visibleFilters = useMemo(() => {
    const query = filterSearch.trim().toLowerCase();
    return filters.filter(filter => (visibility === 'all' || (visibility === 'enabled') === filter.isActive) && (!query || [filter.name, ...filter.options.map(option => option.label)].some(value => value.toLowerCase().includes(query))))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'options' ? b.options.length - a.options.length || a.name.localeCompare(b.name) : (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
  }, [filters, filterSearch, visibility, sort]);
  const libraryPages = Math.max(1, Math.ceil(visibleFilters.length / libraryPageSize));
  const activeLibraryPage = Math.min(libraryPage, libraryPages);
  const libraryRows = visibleFilters.slice((activeLibraryPage - 1) * libraryPageSize, activeLibraryPage * libraryPageSize);
  const visibleOptions = form.options.map((option, index) => ({ ...option, index })).filter(option => option.key === focusedOption || option.label.toLowerCase().includes(optionSearch.trim().toLowerCase()));
  const showEditor = next => { setForm(next); setSavedForm(JSON.stringify(next)); setOptionSearch(''); setFocusedOption(null); setEditorOpen(true); };
  const newFilter = () => { showEditor(blankFilter()); setError(''); setMessage(''); };
  const backToLibrary = () => { if (dirty) setDiscardOpen(true); else { setEditorOpen(false); setError(''); } };
  const openPicker = key => { setPicker(key); setSearch(''); setPage(1); };
  const option = form.options.find(option => option.key === picker);
  const updateOption = (key, changes) => setForm(current => ({ ...current, options: current.options.map(option => option.key === key ? { ...option, ...changes } : option) }));
  const toggleProduct = product => {
    const selected = option.products.some(item => item._id === product._id);
    updateOption(option.key, { products: selected ? option.products.filter(item => item._id !== product._id) : [...option.products, product] });
  };
  const openFilter = async id => {
    setBusy('loading'); setError(''); setMessage('');
    try { showEditor(editable((await filterService.get(id)).data)); }
    catch (err) { setError(err.response?.data?.message || 'Could not open this filter.'); }
    finally { setBusy(''); }
  };
  const save = async event => {
    event.preventDefault(); if (busy || !canWrite) return;
    setBusy('save'); setError(''); setMessage('');
    try {
      const body = { name: form.name, type: form.type, isActive: form.isActive, sortOrder: Number(form.sortOrder) || 0,
        options: form.options.map(option => ({ ...(option._id ? { id: option._id } : {}), label: option.label, productIds: option.products.map(product => product._id) })) };
      const response = await filterService.save(form._id, body);
      const next = editable(response.data); setForm(next); setSavedForm(JSON.stringify(next)); await load(); setMessage(response.data.isActive ? 'Filter saved. Assigned published products now appear under its options on the storefront.' : 'Filter saved. It is hidden from the storefront.');
    } catch (err) { setError(err.response?.data?.message || 'Could not save the filter.'); }
    finally { setBusy(''); }
  };
  const remove = async () => {
    if (busy || !deleteTarget || !canWrite) return;
    setBusy('delete'); setError('');
    try {
      await filterService.remove(deleteTarget._id);
      if (form._id === deleteTarget._id) { setForm(blankFilter()); setEditorOpen(false); }
      setDeleteTarget(null); await load(); setMessage('Filter deleted. Products remain in the catalogue.');
    } catch (err) { setError(err.response?.data?.message || 'Could not delete the filter.'); }
    finally { setBusy(''); }
  };
  return <div className="min-w-0 space-y-5">
    <AdminPageHeader title="Filters" subtitle="Organize product choices. Make the right products easier to find."
      badge={`${filters.length} custom`}
      action={!editorOpen && <Button disabled={!canWrite || !!busy} onClick={newFilter}><Plus className="h-4 w-4" />New Filter</Button>} />
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}<Button variant="outline" className="ml-2" disabled={!!busy} onClick={() => load().then(() => setError('')).catch(() => {})}>Retry loading filters</Button></div>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!editorOpen ? <>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="rounded-lg bg-primary/5 p-2 text-primary"><Layers className="h-4 w-4" /></span><div><p className="text-sm font-semibold">The essentials are already included</p><p className="mt-1 text-xs text-muted-foreground">Create extra filters for details like capacity, resolution, or connection.</p></div></div>
        <div className="flex flex-wrap gap-1.5">{['Brands', 'Categories', 'Main categories'].map(label => <span key={label} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"><Check className="h-3 w-3" />{label}</span>)}</div>
      </div>
      <section aria-label="Saved filters" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
          <div><h2 className="text-base font-bold">Filter library</h2><p className="mt-1 text-xs text-muted-foreground">Find, edit, and organize all your storefront filters.</p></div>
          <div className="flex items-center gap-4 text-xs"><span><strong className="text-foreground">{enabledCount}</strong> <span className="text-muted-foreground">enabled</span></span><span className="h-4 w-px bg-border" /><span><strong className="text-foreground">{filters.length - enabledCount}</strong> <span className="text-muted-foreground">hidden</span></span></div>
        </div>
        <div className="flex flex-col gap-3 border-y border-border bg-muted/30 px-5 py-3 sm:flex-row sm:flex-wrap sm:px-6">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 focus-within:ring-2 focus-within:ring-primary/20"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input aria-label="Search filters" value={filterSearch} onChange={event => { setFilterSearch(event.target.value); setLibraryPage(1); }} placeholder="Search filters or options…" className="w-full min-w-0 !bg-transparent !outline-none !border-0 !shadow-none py-2.5 text-sm" />{filterSearch && <button type="button" aria-label="Clear filter search" onClick={() => { setFilterSearch(''); setLibraryPage(1); }} className="rounded p-1 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>}</label>
          <div className="grid grid-cols-2 gap-2 sm:flex"><select aria-label="Filter visibility" value={visibility} onChange={event => { setVisibility(event.target.value); setLibraryPage(1); }} className="min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-xs"><option value="all">All visibility</option><option value="enabled">Enabled only</option><option value="hidden">Hidden only</option></select><select aria-label="Sort filters" value={sort} onChange={event => { setSort(event.target.value); setLibraryPage(1); }} className="min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-xs"><option value="order">Storefront order</option><option value="name">Name: A–Z</option><option value="options">Most options</option></select></div>
        </div>
        <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_125px_90px_88px] gap-5 border-b border-border px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground xl:grid"><span>Filter</span><span>Options</span><span>Display type</span><span>Visibility</span><span className="text-right">Manage</span></div>
        {busy === 'loading' ? <p role="status" className="p-8 text-center text-sm text-muted-foreground">Loading filters…</p> : libraryRows.length ? <div className="divide-y divide-border">{libraryRows.map(filter => {
          const TypeIcon = displayTypes[filter.type].icon;
          const assignments = filter.options.reduce((total, option) => total + (option.productCount ?? option.products?.length ?? 0), 0);
          return <article key={filter._id} aria-label={`Filter ${filter.name}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-muted/30 sm:px-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_125px_90px_88px] xl:gap-5">
            <div className="min-w-0"><button type="button" aria-label={`Edit filter ${filter.name}`} disabled={!!busy} onClick={() => openFilter(filter._id)} className="block max-w-full truncate text-left text-sm font-bold hover:text-primary hover:underline" title={filter.name}>{filter.name}</button><p className="mt-1 text-[11px] text-muted-foreground">{filter.options.length} {filter.options.length === 1 ? 'option' : 'options'} · {assignments} assignments</p></div>
            <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-1.5 xl:col-span-1 xl:row-auto">{filter.options.slice(0, 3).map((option, index) => <span key={option._id || index} title={option.label} className="max-w-32 truncate rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">{option.label}</span>)}{filter.options.length > 3 && <span className="text-[11px] font-medium text-muted-foreground">+{filter.options.length - 3} more</span>}</div>
            <span className="col-start-1 flex items-center gap-1.5 text-[11px] text-muted-foreground xl:col-auto"><TypeIcon className="h-3.5 w-3.5" />{displayTypes[filter.type].label}</span>
            <span className={`col-start-2 row-start-1 justify-self-end rounded-full px-2 py-1 text-[10px] font-semibold xl:col-auto xl:row-auto xl:justify-self-start ${filter.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{filter.isActive ? 'Enabled' : 'Hidden'}</span>
            <div className="col-start-2 flex justify-end gap-1 xl:col-auto"><Button variant="ghost" size="sm" iconOnly aria-label={`Open filter ${filter.name}`} disabled={!!busy} onClick={() => openFilter(filter._id)}><ArrowUpRight className="h-4 w-4" /></Button><Button variant="ghost" size="sm" iconOnly aria-label={`Delete filter ${filter.name}`} disabled={!canWrite || !!busy} onClick={() => setDeleteTarget(filter)} className="text-muted-foreground hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></Button></div>
          </article>;
        })}</div> : <div className="flex flex-col items-center px-5 py-14 text-center"><div className="mb-4 rounded-2xl bg-primary/5 p-4 text-primary"><SlidersHorizontal className="h-7 w-7" /></div><h3 className="text-base font-bold">{filters.length ? 'No matching filters' : 'A better way to find the right product'}</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">{filters.length ? 'Try a different name, option, or visibility.' : 'Start with a filter like Capacity, add its options, and choose the products for each one.'}</p><Button className="mt-5" variant="outline" disabled={!!busy || (!filters.length && !canWrite)} onClick={() => { if (filters.length) { setFilterSearch(''); setVisibility('all'); setLibraryPage(1); } else newFilter(); }}>{filters.length ? 'Clear search and visibility' : 'Create your first filter'}</Button></div>}
        {visibleFilters.length > 0 && <div className="border-t border-border px-4"><Pagination currentPage={activeLibraryPage} totalPages={libraryPages} totalItems={visibleFilters.length} pageSize={libraryPageSize} onPageChange={setLibraryPage} /></div>}
      </section>
    </> : <form onSubmit={save} className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" size="sm" disabled={!!busy} onClick={backToLibrary} className="-ml-2"><ArrowLeft className="h-4 w-4" />Back to filters</Button><span className="text-xs text-muted-foreground">{dirty ? 'Unsaved changes' : form._id ? 'All changes saved' : 'New filter'}</span></div>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="Filter details">
        <h2 className="mb-5 text-base font-bold">{form._id ? 'Edit filter' : 'Create a filter'}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold">Filter name<input required maxLength={100} aria-label="Filter name" value={form.name} disabled={!canWrite || !!busy} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Capacity" className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="space-y-1.5 text-xs font-semibold">Display type<select aria-label="Filter display type" value={form.type} disabled={!canWrite || !!busy} onChange={event => setForm({ ...form, type: event.target.value })} className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"><option value="checkbox">Checkboxes — choose multiple</option><option value="radio">Radio buttons — choose one</option><option value="select">Dropdown — choose one</option></select></label>
        </div>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card" aria-label="Filter options">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6"><div><h3 className="text-sm font-bold">Options & products <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{form.options.length}</span></h3><p className="mt-1 text-xs text-muted-foreground">Add a choice, then assign the products that match it.</p></div><Button size="sm" variant="outline" disabled={!canWrite || !!busy || form.options.length >= 100} onClick={() => { const next = blankOption(); addedOption.current = next.key; setOptionSearch(''); setForm({ ...form, options: [...form.options, next] }); }}><Plus className="h-3.5 w-3.5" />Add Option</Button></div>
          {form.options.length > 5 && <label className="mx-5 mb-4 flex items-center gap-2 rounded-lg border border-border px-3 focus-within:ring-2 focus-within:ring-primary/20 sm:mx-6"><Search className="h-4 w-4 text-muted-foreground" /><input aria-label="Find an option" value={optionSearch} onChange={event => setOptionSearch(event.target.value)} placeholder="Find an option…" className="w-full min-w-0 !bg-transparent !outline-none !border-0 !shadow-none py-2 text-sm" /></label>}
          <div className="max-h-[65vh] overflow-y-auto overscroll-contain border-t border-border p-4 sm:p-5">
            <div className="space-y-3">{visibleOptions.map(option => <div key={option.key} className="rounded-xl border border-border bg-background/40 p-3.5">
              <div className="flex items-start gap-3"><span className="mt-7 w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">{String(option.index + 1).padStart(2, '0')}</span><label className="min-w-0 flex-1 text-[11px] font-semibold text-muted-foreground">Option {option.index + 1}<input required maxLength={120} aria-label={`Option ${option.index + 1} label`} ref={node => { if (node && addedOption.current === option.key) { addedOption.current = null; node.focus(); } }} onFocus={() => setFocusedOption(option.key)} onBlur={() => setFocusedOption(null)} value={option.label} disabled={!canWrite || !!busy} onChange={event => updateOption(option.key, { label: event.target.value })} placeholder="e.g. 64 GB" className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" /></label><Button variant="ghost" size="sm" iconOnly className="mt-5 text-muted-foreground hover:text-rose-600" aria-label={`Remove option ${option.index + 1}`} disabled={!canWrite || !!busy || form.options.length === 1} onClick={() => setForm({ ...form, options: form.options.filter(item => item.key !== option.key) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              <div className="ml-8 mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-muted-foreground">{option.products.length} {option.products.length === 1 ? 'product' : 'products'} assigned</span><Button size="sm" variant="outline" disabled={!canWrite || !!busy || !option.label.trim()} aria-label={`Assign products to ${option.label || `option ${option.index + 1}`}`} onClick={() => openPicker(option.key)}>{option.products.length ? 'Manage products' : 'Assign products'}<ArrowUpRight className="h-3 w-3" /></Button></div>
              {option.products.length > 0 && <div className="ml-8 mt-3 flex flex-wrap gap-1.5">{option.products.slice(0, 3).map(product => <span key={product._id} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px]"><span className="max-w-40 truncate">{product.name || 'Untitled product'}</span><button type="button" disabled={!canWrite || !!busy} aria-label={`Remove ${product.name} from ${option.label}`} onClick={() => updateOption(option.key, { products: option.products.filter(item => item._id !== product._id) })} className="rounded p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button></span>)}{option.products.length > 3 && <button type="button" disabled={!canWrite || !!busy} onClick={() => openPicker(option.key)} className="text-[10px] font-semibold text-primary hover:underline">+{option.products.length - 3} more</button>}</div>}
            </div>)}{!visibleOptions.length && <p className="p-6 text-center text-sm text-muted-foreground">No options match this search.</p>}</div>
          </div>
        </section>
        <aside className="space-y-4 xl:sticky xl:top-5">
          <section aria-label="Storefront filter preview" className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs font-semibold"><Eye className="h-3.5 w-3.5 text-primary" />Storefront preview</div><div className="p-5"><p className="mb-4 break-words text-sm font-bold">{form.name || 'Your filter name'}</p>{form.type === 'select' ? <select disabled aria-label="Preview dropdown" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"><option>All {form.name || 'options'}</option>{form.options.filter(option => option.label.trim()).map(option => <option key={option.key}>{option.label}</option>)}</select> : <div className="space-y-3">{form.options.slice(0, 4).map((option, index) => <div key={option.key} className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`h-3.5 w-3.5 shrink-0 border border-gray-300 bg-background ${form.type === 'radio' ? 'rounded-full' : 'rounded-sm'}`} /><span className="break-words">{option.label || `Option ${index + 1}`}</span></div>)}{form.options.length > 4 && <p className="text-[11px] text-muted-foreground">+{form.options.length - 4} more options</p>}</div>}<p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">{displayTypes[form.type].hint}. Only options with matching published products appear to shoppers.</p></div></section>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5"><label className="flex items-start gap-2 text-xs font-semibold"><input type="checkbox" checked={form.isActive} disabled={!canWrite || !!busy} onChange={event => setForm({ ...form, isActive: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" /><span>Show this filter on the storefront<span className="mt-1 block text-[11px] font-normal text-muted-foreground">Hide it anytime without losing assignments.</span></span></label><label className="block border-t border-border pt-4 text-xs font-semibold">Display order<div className="mt-2 flex items-center gap-3"><input type="number" min="0" max="100000" aria-label="Filter display order" value={form.sortOrder} disabled={!canWrite || !!busy} onChange={event => setForm({ ...form, sortOrder: event.target.value })} className="block w-20 rounded-lg border border-border bg-background p-2 text-sm" /><span className="text-[11px] font-normal text-muted-foreground">Lower numbers appear first.</span></div></label></section>
          <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground"><EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />Draft products can be assigned. They stay hidden until published.</p>
        </aside>
      </div>
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:px-5"><div className="text-xs text-muted-foreground">{form.options.length} {form.options.length === 1 ? 'option' : 'options'}<span className="mx-2 text-border">/</span>{new Set(form.options.flatMap(option => option.products.map(product => product._id))).size} products</div><div className="flex items-center gap-2">{form._id && <Button variant="ghost" size="sm" iconOnly aria-label={`Delete filter ${form.name}`} disabled={!canWrite || !!busy} onClick={() => setDeleteTarget(form)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-4 w-4" /></Button>}<Button type="submit" disabled={!canWrite || !!busy}><Check className="h-4 w-4" />{busy === 'save' ? 'Saving…' : 'Save Filter'}</Button></div></div>
    </form>}
    <Modal isOpen={!!option} onClose={() => setPicker(null)} title={`Assign products to ${option?.label || 'option'}`} description="Check products to include them in this option. Changes apply when you save the filter." size="lg"
      footer={<Button onClick={() => setPicker(null)}>Done · {option?.products.length || 0} selected</Button>}>
      {option && <div className="space-y-4">
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 focus-within:ring-2 focus-within:ring-primary/20"><Search className="h-4 w-4 text-muted-foreground" /><input aria-label="Search products to assign" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search by product name, SKU, or model number" className="w-full !bg-transparent !outline-none !border-0 !shadow-none py-3 text-sm" /></label>
        {searchError && <div role="alert" className="text-sm text-rose-700">{searchError}<Button variant="outline" onClick={() => setSearchRetry(value => value + 1)}>Retry</Button></div>}
        {searchBusy ? <p role="status" className="text-sm text-muted-foreground">Loading products…</p> : !searchError && <div className="space-y-2">{products.map(product => <label key={product._id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"><input type="checkbox" aria-label={`Assign ${product.name}`} checked={option.products.some(item => item._id === product._id)} onChange={() => toggleProduct(product)} className="h-4 w-4 shrink-0 accent-primary" /><Image src={product.images?.[0]?.url} alt="" className="h-10 w-10 shrink-0" objectFit="object-contain" /><span className="min-w-0 text-sm"><span className="block break-words font-semibold">{product.name}</span><span className="block text-xs text-muted-foreground">{editableProductIdentifier(product.sku) || 'SKU not set'}{product.isActive === false ? ' · Draft' : ''}</span></span></label>)}{!products.length && <p className="text-sm text-muted-foreground">No products match this search.</p>}</div>}
        <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={20} onPageChange={setPage} />
      </div>}
    </Modal>
    <ConfirmDialog isOpen={discardOpen} onClose={() => setDiscardOpen(false)} onConfirm={() => { setDiscardOpen(false); setEditorOpen(false); setError(''); }} title="Discard unsaved changes?" message="Your changes to this filter have not been saved." confirmText="Discard changes" cancelText="Keep editing" />
    <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete Filter" message={`Delete ${deleteTarget?.name} and its assignments? The products will remain in the catalogue.`} confirmText="Delete Filter" isLoading={busy === 'delete'} variant="danger" />
  </div>;
}
