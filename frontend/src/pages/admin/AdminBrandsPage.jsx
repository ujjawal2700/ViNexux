import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import Toast from '../../components/ui/Toast';

const empty = { name: '', slug: '', description: '', isActive: true, sortOrder: 0 };

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [logoFile, setLogoFile] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const load = async () => setBrands((await adminService.getBrandsAdmin()).data?.brands || []);
  useEffect(() => { load(); }, []);

  const showForm = (brand = null) => {
    setEditing(brand);
    setForm(brand ? { name: brand.name, slug: brand.slug, description: brand.description || '', isActive: brand.isActive, sortOrder: brand.sortOrder || 0 } : empty);
    setLogoFile(null); setError(''); setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Brand name is required.');
    setSaving(true); setError('');
    try {
      let logo = editing?.logo;
      if (logoFile) {
        const uploaded = await adminService.uploadCmsImage(logoFile, 'vinexus/brands');
        logo = { url: uploaded.data.url, publicId: uploaded.data.publicId };
      }
      const payload = { ...form, name: form.name.trim(), slug: form.slug.trim() || undefined, sortOrder: Number(form.sortOrder) || 0, logo };
      if (editing) await adminService.updateBrandAdmin(editing._id, payload);
      else await adminService.createBrandAdmin(payload);
      setOpen(false); setToast({ message: 'Brand saved successfully.', type: 'success' }); await load();
    } catch (err) { setError(err.response?.data?.message || 'Unable to save brand.'); }
    finally { setSaving(false); }
  };

  const remove = async (brand) => {
    if (!window.confirm(`Remove ${brand.name}? Brands with products will be deactivated.`)) return;
    await adminService.deleteBrandAdmin(brand._id); await load();
    setToast({ message: 'Brand updated successfully.', type: 'success' });
  };

  return <div className="space-y-6">
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    <AdminPageHeader title="Brand Management" subtitle="Create, disable and maintain product brands and storefront logos" badge={`${brands.length} Brands`} action={<div className="flex gap-2"><Button variant="outline" onClick={async () => { await adminService.syncBrandsFromProducts(); await load(); }}>Import Existing</Button><Button onClick={() => showForm()}><Plus className="mr-2 h-4 w-4" />Add Brand</Button></div>} />
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {brands.map((brand) => <div key={brand._id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded-lg bg-white border border-border">
          {brand.logo?.url ? <img src={brand.logo.url} alt={brand.name} className="max-h-full max-w-full object-contain" /> : <Tags className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1"><p className="font-bold">{brand.name}</p><p className="text-xs text-muted-foreground">/{brand.slug} · {brand.isActive ? 'Active' : 'Inactive'}</p></div>
        <button onClick={() => showForm(brand)}><Pencil className="h-4 w-4" /></button>
        <button onClick={() => remove(brand)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>)}
    </div>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Brand' : 'Add Brand'}><form onSubmit={save} className="space-y-4">
      <FormError message={error} />
      <FormField label="Brand Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
      <FormField label="URL Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Auto-generated when blank" /></FormField>
      <FormField label="Brand Logo"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="block w-full text-xs" /></FormField>
      <FormField label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
      <div className="grid grid-cols-2 gap-3"><FormField label="Sort Order"><Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></FormField><label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Save Brand</Button></div>
    </form></Modal>
  </div>;
}
