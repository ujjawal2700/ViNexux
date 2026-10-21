import React, { useEffect, useRef, useState } from 'react';
import { specificationTemplateService } from '../../services/specificationTemplateService';
import { applySpecificationTemplate, specificationKey } from '../../../../shared/specificationTemplates.js';
import { isInventorySpecification } from '../../../../shared/productSpecifications.js';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import SpecificationOrderEditor from './SpecificationOrderEditor';

const blank = () => ({ name: '', description: '', specifications: [{ key: '', value: '' }] });
export default function SpecificationTemplates({ specifications, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [listError, setListError] = useState('');
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState('');
  const [undo, setUndo] = useState(null);
  const mutation = useRef(false);
  const blocked = disabled || saving;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true); setListError('');
      try {
        const response = await specificationTemplateService.list({ search: query.trim(), page, limit: 20 }, { signal: controller.signal, skipGlobalLoader: true });
        if (!active) return;
        const data = response.data || response;
        setTemplates(current => page === 1 ? data.templates || [] : [...new Map([...current, ...(data.templates || [])].map(template => [template._id, template])).values()]);
        setTotalPages(data.pagination?.totalPages || 0);
      } catch (error) {
        if (active) setListError(error.response?.data?.message || 'Unable to load specification templates.');
      } finally { if (active) setLoading(false); }
    }, 200);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query, page, reload]);

  const openEditor = template => {
    setDraft(template ? { ...template, specifications: template.specifications.map(({ key, value }) => ({ key, value })) } : blank());
    setErrors({}); setNotice('');
  };
  const fail = next => {
    setErrors(next);
    const first = Object.keys(next)[0];
    document.getElementById(`template-${first}`)?.focus();
  };
  const save = async () => {
    if (blocked || mutation.current) return;
    const nextErrors = {};
    if (draft.name.trim().length < 2) nextErrors.name = 'Enter a template name with at least 2 characters.';
    if (!draft.specifications.length) nextErrors.specifications = 'Add at least one specification.';
    const pairs = new Set();
    draft.specifications.forEach((spec, index) => {
      if (!spec.key.trim()) nextErrors[`specifications.${index}.key`] = 'Enter a specification name.';
      else if (isInventorySpecification(spec.key)) nextErrors[`specifications.${index}.key`] = 'Inventory quantities belong in the stock field, not a template.';
      if (!spec.value.trim()) nextErrors[`specifications.${index}.value`] = 'Enter a specification value.';
      const pair = JSON.stringify([specificationKey(spec.key), specificationKey(spec.value)]);
      if (pairs.has(pair)) nextErrors[`specifications.${index}.key`] = 'This specification and value are already in the template.';
      pairs.add(pair);
    });
    if (Object.keys(nextErrors).length) { fail(nextErrors); return; }
    mutation.current = true; setSaving(true); setErrors({});
    try {
      const payload = { name: draft.name.trim(), description: draft.description.trim(), specifications: draft.specifications.map(({ key, value }) => ({ key: key.trim(), value: value.trim() })) };
      if (draft._id) await specificationTemplateService.update(draft._id, { ...payload, expectedRevision: draft.revision || 0 });
      else await specificationTemplateService.create(payload);
      setNotice(`Template “${payload.name}” saved. Product specifications are unchanged until you apply it.`);
      setDraft(null); setPage(1); setReload(value => value + 1);
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 409) { setPage(1); setReload(value => value + 1); }
      const details = data?.details || data?.error?.details;
      fail(details?.length ? Object.fromEntries(details.map(detail => [detail.path, detail.message])) : { form: data?.message || 'Unable to save the template. Please try again.' });
    } finally { mutation.current = false; setSaving(false); }
  };
  const remove = async () => {
    if (!deleteTarget || mutation.current) return;
    mutation.current = true; setSaving(true);
    try {
      await specificationTemplateService.remove(deleteTarget._id);
      setNotice(`Template “${deleteTarget.name}” deleted. Existing products keep their specifications.`);
      setDeleteTarget(null); setPage(1); setReload(value => value + 1);
    } catch (error) { setListError(error.response?.data?.message || 'Unable to delete the template.'); setDeleteTarget(null); }
    finally { mutation.current = false; setSaving(false); }
  };
  const editRow = (index, field, value) => setDraft(current => ({ ...current, specifications: current.specifications.map((spec, position) => position === index ? { ...spec, [field]: value } : spec) }));

  return <section aria-label="Specification templates" className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 className="font-bold text-sm text-gray-900">Specification templates</h4><p className="mt-1 text-xs text-gray-600">Reuse common specifications. Applying a template fills missing values and keeps your existing specifications. You can edit every copied value below.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={blocked} onClick={() => openEditor(null)}>New template</Button>
        <Button type="button" variant="outline" size="sm" disabled={blocked || !specifications.length} onClick={() => {
          const copied = specifications.filter(spec => String(spec.key || '').trim() && String(spec.value ?? '').trim() && !isInventorySpecification(spec.key)).map(({ key, value }) => ({ key: String(key), value: String(value) }));
          setDraft({ ...blank(), specifications: copied.length ? copied : blank().specifications }); setErrors({}); setNotice('');
        }}>Save current specs as template</Button>
      </div>
    </div>
    {notice && <p role="status" className="text-xs text-emerald-800">{notice}</p>}
    {undo && <Button type="button" variant="outline" size="sm" disabled={blocked} onClick={() => { onChange(undo); setUndo(null); setNotice('Template application undone.'); }}>Undo template application</Button>}
    {draft && <div role="region" aria-label="Template editor" className="rounded-xl border bg-white p-4 space-y-3">
      <h5 className="text-sm font-bold">{draft._id ? 'Edit template' : 'Create template'}</h5>
      {errors.form && <p role="alert" className="text-sm text-rose-700">{errors.form}</p>}
      <Input id="template-name" label="Template name" maxLength={100} value={draft.name} error={errors.name} isDisabled={blocked} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. 4MP PoE bullet camera" />
      <Input id="template-description" label="Template description" maxLength={300} value={draft.description} isDisabled={blocked} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Optional product type or notes" />
      {errors.specifications && <p role="alert" className="text-sm text-rose-700">{errors.specifications}</p>}
      {draft.specifications.map((spec, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
        <Input id={`template-specifications.${index}.key`} aria-label={`Template specification ${index + 1} name`} maxLength={100} value={spec.key} error={errors[`specifications.${index}.key`]} isDisabled={blocked} onChange={event => editRow(index, 'key', event.target.value)} placeholder="Specification name" />
        <Input id={`template-specifications.${index}.value`} aria-label={`Template specification ${index + 1} value`} maxLength={2000} value={spec.value} error={errors[`specifications.${index}.value`]} isDisabled={blocked} onChange={event => editRow(index, 'value', event.target.value)} placeholder="Value" />
        <button type="button" aria-label={`Remove template specification ${index + 1}`} disabled={blocked} className="p-2 text-rose-700" onClick={() => setDraft({ ...draft, specifications: draft.specifications.filter((_, position) => position !== index) })}>Remove</button>
      </div>)}
      <Button type="button" variant="outline" size="sm" disabled={blocked || draft.specifications.length >= 100} onClick={() => setDraft({ ...draft, specifications: [...draft.specifications, { key: '', value: '' }] })}>Add template specification</Button>
      <SpecificationOrderEditor specifications={draft.specifications} onChange={rows => setDraft({ ...draft, specifications: rows })} disabled={blocked} />
      <div className="flex gap-2"><Button type="button" size="sm" disabled={blocked} onClick={save}>{saving ? 'Saving template…' : 'Save template'}</Button><Button type="button" variant="outline" size="sm" disabled={blocked} onClick={() => setDraft(null)}>Cancel template edit</Button></div>
    </div>}
    <Input label="Search specification templates" value={query} maxLength={100} onChange={event => { setLoading(true); setQuery(event.target.value); setPage(1); }} placeholder="Search template name or product type" />
    {listError && <div role="alert" className="text-sm text-rose-700">{listError} <button type="button" onClick={() => setReload(value => value + 1)} className="underline">Retry</button></div>}
    {loading && <p role="status" className="text-xs text-gray-600">Loading templates…</p>}
    {!loading && !listError && !templates.length && <p className="text-xs text-gray-600">No templates found. Create one or save the current product specifications as a template.</p>}
    <ul className="space-y-2">{templates.map(template => <li key={template._id} className="rounded-lg border bg-white p-3 space-y-2">
      <div><span className="font-semibold text-sm">{template.name}</span><p className="text-xs text-gray-600">{template.description}</p><p className="text-xs text-gray-600">{template.specifications.slice(0, 4).map(spec => `${spec.key}: ${spec.value}`).join(' · ')}{template.specifications.length > 4 ? ` · +${template.specifications.length - 4} more` : ''}</p></div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={blocked || loading} onClick={() => { setUndo(specifications.map(({ key, value }) => ({ key, value }))); onChange(applySpecificationTemplate(specifications, template.specifications)); setNotice(`Applied “${template.name}”. Edit the copied specifications below, then save the product.`); }}>Apply {template.name}</Button>
        <Button type="button" variant="outline" size="sm" disabled={blocked} onClick={() => openEditor(template)}>Edit {template.name}</Button>
        <Button type="button" variant="outline" size="sm" disabled={blocked} onClick={() => setDeleteTarget(template)}>Delete {template.name}</Button>
      </div>
    </li>)}</ul>
    {page < totalPages && <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => setPage(value => value + 1)}>Show more templates</Button>}
    <ConfirmDialog isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete specification template?" message={`Delete “${deleteTarget?.name}”? Products that used it will keep their specifications.`} confirmText="Delete template" isLoading={saving} variant="danger" />
  </section>;
}
