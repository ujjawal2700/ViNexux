import React, { useEffect, useRef, useState } from 'react';
import { Globe2, Image as ImageIcon, Save, Search, Upload } from 'lucide-react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import Textarea from '../../components/ui/Textarea';
import useToast from '../../hooks/useToast';
import useWebsiteSettings from '../../hooks/useWebsiteSettings';

const emptyForm = {
  websiteName: 'Vinexus',
  metaTitle: 'Vinexus | IT, Laptop, CCTV & Networking Products',
  metaDescription: 'Browse laptops, computers, CCTV, networking and IT products on Vinexus. Explore product details and send an enquiry to our team.',
  favicon: { url: '/favicon.jpeg' },
  logo: { url: '/logo.png' },
  ogImage: { url: '/social-preview.png' },
};

const assetFields = [
  { key: 'favicon', label: 'Favicon', help: 'Browser tab icon. A square PNG, JPG or WebP image is recommended.', previewClass: 'h-24 w-24 object-contain' },
  { key: 'logo', label: 'Website Logo', help: 'Displayed in the storefront header, admin panel and authentication pages.', previewClass: 'h-24 max-w-64 object-contain' },
  { key: 'ogImage', label: 'OG / Social Image', help: 'Preview image used when website links are shared on social platforms.', previewClass: 'h-32 w-full object-contain' },
];

const extractSettings = (response) => response?.data?.settings || response?.settings || response?.data || response;

const AdminWebsiteSettingsPage = () => {
  const toast = useToast();
  const { refreshSettings } = useWebsiteSettings();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const previewUrlsRef = useRef({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const saved = extractSettings(await adminService.getWebsiteSettingsAdmin());
      setForm({ ...emptyForm, ...saved });
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Unable to load website settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => () => {
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleFile = (field, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((current) => ({ ...current, [field]: 'Only PNG, JPG and WebP images are allowed.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, [field]: 'Image must be 5MB or smaller.' }));
      return;
    }
    setErrors((current) => ({ ...current, [field]: '' }));
    if (previewUrlsRef.current[field]) URL.revokeObjectURL(previewUrlsRef.current[field]);
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current[field] = previewUrl;
    setFiles((current) => ({ ...current, [field]: file }));
    setPreviews((current) => ({ ...current, [field]: previewUrl }));
  };

  const validate = () => {
    const next = {};
    if (!form.websiteName.trim()) next.websiteName = 'Website name is required.';
    if (!form.metaTitle.trim()) next.metaTitle = 'Meta title is required.';
    if (form.metaTitle.trim().length > 200) next.metaTitle = 'Meta title cannot exceed 200 characters.';
    if (form.metaDescription.trim().length < 20) next.metaDescription = 'Meta description must contain at least 20 characters.';
    if (form.metaDescription.trim().length > 500) next.metaDescription = 'Meta description cannot exceed 500 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      let saved = extractSettings(await adminService.updateWebsiteSettingsAdmin({
        websiteName: form.websiteName.trim(),
        metaTitle: form.metaTitle.trim(),
        metaDescription: form.metaDescription.trim(),
      }));

      for (const field of ['favicon', 'logo', 'ogImage']) {
        if (files[field]) saved = extractSettings(await adminService.uploadWebsiteAssetAdmin(field, files[field]));
      }

      setForm({ ...emptyForm, ...saved });
      setFiles({});
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = {};
      setPreviews({});
      await refreshSettings();
      toast.success('Website and SEO settings saved successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save website settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-72 w-full" /></div>;
  }

  if (loadError) return <ErrorState title="Unable to load website settings" message={loadError} onRetry={loadSettings} />;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <AdminPageHeader
        title="Website / SEO Settings"
        subtitle="Manage the public website name, search metadata, favicon, logo and social sharing image."
        badge="CMS"
        action={<Button type="submit" isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>}
      />

      <Card className="space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Globe2 className="h-5 w-5 text-primary" />
          <div><h2 className="font-bold">Website Identity</h2><p className="text-xs text-muted-foreground">The website name is used in the header, browser metadata and accessible image labels.</p></div>
        </div>
        <Input
          label="Website Name"
          required
          value={form.websiteName}
          error={errors.websiteName}
          maxLength={150}
          onChange={(event) => setForm((current) => ({ ...current, websiteName: event.target.value }))}
          placeholder="Vi Nexus"
        />
      </Card>

      <Card className="space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Search className="h-5 w-5 text-primary" />
          <div><h2 className="font-bold">Search & Social Metadata</h2><p className="text-xs text-muted-foreground">Controls the default browser title and search/social description.</p></div>
        </div>
        <Input
          label="Meta Title"
          required
          value={form.metaTitle}
          error={errors.metaTitle}
          maxLength={200}
          helperText={`${form.metaTitle.length}/200 characters`}
          onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))}
        />
        <Textarea
          label="Meta Description"
          required
          rows={4}
          value={form.metaDescription}
          error={errors.metaDescription}
          maxLength={500}
          helperText={`${form.metaDescription.length}/500 characters`}
          onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))}
        />
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {assetFields.map((asset) => (
          <Card key={asset.key} className="flex flex-col gap-4">
            <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /><h2 className="font-bold">{asset.label}</h2></div>
            <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-4">
              <img src={previews[asset.key] || form[asset.key]?.url} alt={`${asset.label} preview`} className={asset.previewClass} />
            </div>
            <p className="min-h-10 text-xs leading-5 text-muted-foreground">{asset.help}</p>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">
              <Upload className="h-4 w-4" /> Choose Image
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => handleFile(asset.key, event.target.files?.[0])} />
            </label>
            {files[asset.key] && <p className="truncate text-xs font-medium text-emerald-700">Selected: {files[asset.key].name}</p>}
            {errors[asset.key] && <p className="text-xs font-medium text-rose-600">{errors[asset.key]}</p>}
          </Card>
        ))}
      </div>

      <div className="flex justify-end border-t border-border pt-5">
        <Button type="submit" size="lg" isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
      </div>
    </form>
  );
};

export default AdminWebsiteSettingsPage;
