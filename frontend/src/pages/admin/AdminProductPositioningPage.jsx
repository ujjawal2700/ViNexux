import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import useAuth from '../../hooks/useAuth';
import { getAdminAccessState } from '../../utils/adminAccessState';
import { canAdmin } from '../../../../shared/adminAccess.js';
import { compareHeaderProductPositions, hasProductPosition } from '../../../../shared/headerProductPositioning.js';

export default function AdminProductPositioningPage() {
  const { user, adminUser } = useAuth();
  const canWrite = canAdmin(getAdminAccessState() || adminUser || user, 'products', 'write');
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getProductPositioning();
      const rows = response.data?.categories || [];
      setCategories(rows.sort(compareHeaderProductPositions));
      setDrafts(Object.fromEntries(rows.map(category => [category._id, category.productPriority ?? ''])));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load product positioning.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (event, category) => {
    event.preventDefault();
    if (saving || !canWrite) return;
    const value = drafts[category._id];
    const productPriority = value === '' ? null : Number(value);
    if (productPriority !== null && (!Number.isInteger(productPriority) || productPriority < 0 || productPriority > 1000000)) {
      setError('Enter a whole position number from 0 to 1000000.');
      return;
    }
    setSaving(category._id);
    setError('');
    setNotice('');
    try {
      const response = await adminService.updateProductPositioning(category._id, productPriority);
      setCategories(current => current.map(row => row._id === category._id ? response.data : row).sort(compareHeaderProductPositions));
      setNotice(`${category.name} product position saved.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save this position. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return <div className="space-y-5">
    <AdminPageHeader title="Product Positioning" subtitle="Choose which header category’s products appear first on the homepage and in All Products."
      action={<Link to="/admin/products" className="text-sm font-semibold text-primary">Back to Product Catalog</Link>} />
    <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground space-y-2">
      <p>Smaller numbers appear first. You can give several header categories the same number; the category that received that number first appears first.</p>
      <p>Save each category to apply its position. Saving the same number keeps its place. Changing the number starts a new place among categories with that number. Clear a position to put that category after positioned categories.</p>
      <p>Positions include all main and subcategory products under each header. Customer-selected sorting such as price or newest still applies when selected.</p>
    </div>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && (categories.length ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>
      : <ErrorState title="Positioning unavailable" description={error} onRetry={load} />)}
    {loading ? <p role="status" className="p-4 text-sm text-muted-foreground">Loading header categories…</p> :
      !error && !categories.length ? <p className="p-4 text-sm text-muted-foreground">Create a header category in Category Management to position its products.</p> :
      <ol aria-label="Header category product order" className="space-y-3">
        {categories.map((category, index) => <li key={category._id} className="rounded-xl border border-border bg-card p-4" data-category-id={category._id}>
          <form onSubmit={event => save(event, category)} className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold text-muted-foreground w-6">{index + 1}.</span>
            <div className="flex-1 min-w-40">
              <h2 className="text-sm font-bold text-foreground">{category.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">{hasProductPosition(category) ? `Saved position: ${category.productPriority}` : 'No position set'}{!category.isActive ? ' · Hidden on website' : ''}</p>
            </div>
            <div className="space-y-1">
              <label htmlFor={`position-${category._id}`} className="block text-xs font-semibold text-foreground">Position for {category.name}</label>
              <input id={`position-${category._id}`} type="number" min="0" max="1000000" step="1" placeholder="Unpositioned" value={drafts[category._id] ?? ''}
                onChange={event => setDrafts(current => ({ ...current, [category._id]: event.target.value }))} disabled={!canWrite || Boolean(saving)}
                className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-ring disabled:opacity-50" />
            </div>
            <Button type="submit" size="sm" isDisabled={!canWrite || Boolean(saving)} isLoading={saving === category._id} aria-label={`Save position for ${category.name}`}>Save position</Button>
          </form>
        </li>)}
      </ol>}
  </div>;
}
