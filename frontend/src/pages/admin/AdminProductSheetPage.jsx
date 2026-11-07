import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileSpreadsheet, RefreshCw } from 'lucide-react';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function AdminProductSheetPage() {
  const [connection, setConnection] = useState(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [busy, setBusy] = useState('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setBusy('loading'); setError('');
    try {
      const response = await adminService.getProductSheet();
      setConnection(response.data);
      setSpreadsheetUrl(current => current || response.data.defaultSpreadsheetId || '');
    } catch (err) { setError(err.response?.data?.message || 'Could not load the Google Sheet connection.'); }
    finally { setBusy(''); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const run = async action => {
    if (busy) return;
    setBusy(action); setError(''); setMessage('');
    try {
      const response = action === 'initialize' ? await adminService.initializeProductSheet(spreadsheetUrl) : await adminService.syncProductSheet();
      setConnection(response.data);
      const result = response.data.result;
      setMessage(action === 'initialize' ? 'Your product sheet is ready with the current catalogue. Open it below to edit products.'
        : result.failed ? `Sync finished with ${result.failed} row${result.failed === 1 ? '' : 's'} to fix. Successful rows were saved.` : 'Products synced successfully. The catalogue and storefront now use the updated product data.');
    } catch (err) { setError(err.response?.data?.message || 'Could not complete the Google Sheet operation. Retry when the connection is available.'); }
    finally { setBusy(''); }
  };
  const result = connection?.lastResult;
  return <div className="space-y-5">
    <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />Back to Product Catalogue</Link>
    <AdminPageHeader title="Manage Products via Google Sheet" subtitle="Edit the same Google Sheet whenever you need to update products, then click Sync Products." />
    <nav aria-label="Product management options" className="flex flex-wrap gap-2">
      <Link to="/admin/products" className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold">Product Catalogue</Link>
      <span aria-current="page" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Google Sheet</span>
    </nav>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}
    {!connection && <Button variant="outline" onClick={load} disabled={!!busy}>{busy ? 'Loading connection…' : 'Retry connection'}</Button>}
    {connection && !connection.configured && <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
      <h2 className="font-bold">Google Sheets setup needed</h2>
      <p className="mt-2">The server needs a Google service-account email and private key with Google Sheets API access. After these are configured, share a Google spreadsheet with that email as an Editor and return here.</p>
      <Button variant="outline" className="mt-3" onClick={load} disabled={!!busy}>Check connection again</Button>
    </section>}
    {connection && !connection.connected && <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-bold"><FileSpreadsheet className="h-5 w-5 text-primary" />Create your product sheet</h2>
      <p className="text-sm text-muted-foreground">Use a Google spreadsheet you own. We’ll create dedicated Products, Reference, and Guide tabs and fill them with all current products, including drafts.</p>
      <a href="https://docs.google.com/spreadsheets/create" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">Create a blank Google Sheet<ExternalLink className="h-4 w-4" /></a>
      {connection.serviceAccountEmail && <p className="text-sm">Share the spreadsheet as an <strong>Editor</strong> with <span className="select-all break-all font-mono">{connection.serviceAccountEmail}</span>.</p>}
      <label className="block text-sm font-semibold" htmlFor="product-spreadsheet-url">Google Sheet URL or spreadsheet ID</label>
      <input id="product-spreadsheet-url" type="text" value={spreadsheetUrl} onChange={event => setSpreadsheetUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…/edit" disabled={!!busy} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <Button onClick={() => run('initialize')} disabled={!!busy || !connection.configured || !spreadsheetUrl.trim()}>{busy === 'initialize' ? 'Creating product sheet…' : 'Create Product Sheet'}</Button>
    </section>}
    {connection?.connected && <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-base font-bold">Your product sheet is connected</h2><p className="mt-1 text-sm text-muted-foreground">{connection.sheetTitle}</p></div>
        <a href={connection.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-primary">Open Google Sheet<ExternalLink className="h-4 w-4" /></a>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Edit existing rows, or add a row with a unique SKU and leave Product ID blank for a new product.</li>
        <li>Choose Published or Draft. Use Yes / No for Trending, New Arrival, and Low Stock. The reference and guide tabs explain categories, brands, images, and specifications.</li>
        <li>Use Variants JSON for options such as 5m or 10m, with separate retail/dealer prices and stock. Keep existing variant IDs unchanged; the product guide includes an example. Parent prices and stock are calculated from the options.</li>
        <li>Finish editing, then click Sync Products below. Wait for it to finish before editing the sheet again.</li>
      </ol>
      <p className="text-xs text-muted-foreground">Conflicting edits are reported for you to fix. Removing a row doesn’t delete a product; it returns on sync. Use Draft to hide a product.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => run('sync')} disabled={!!busy || !connection.configured}><RefreshCw className={`mr-2 h-4 w-4 ${busy === 'sync' ? 'animate-spin' : ''}`} />{busy === 'sync' ? 'Syncing products…' : 'Sync Products'}</Button>
        <Button variant="outline" onClick={load} disabled={!!busy}>Refresh status</Button>
        {connection.lastSyncedAt && <span className="text-xs text-muted-foreground">Last synced: {new Date(connection.lastSyncedAt).toLocaleString('en-IN')}</span>}
      </div>
      {(busy === 'sync' || busy === 'initialize') && <p role="status" className="text-sm text-muted-foreground">This may take a few minutes for a large catalogue. Keep this page open.</p>}
    </section>}
    {result && <section aria-label="Sync results" className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-bold">Last sync results</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[['Exported', result.exported], ['Created', result.created], ['Updated', result.updated], ['Unchanged', result.unchanged], ['Added from catalogue', result.appended], ['Rows to fix', result.failed]].filter(([, count]) => count !== undefined).map(([label, count]) => <div key={label} className="rounded-lg border border-border p-3"><p className="text-2xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
      {result.errorsTruncated && <p className="text-xs text-muted-foreground">Showing the first 500 errors. Every row’s error is also in the sheet’s Sync Result column.</p>}
      {result.errors?.length > 0 && <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Sheet row</th><th className="p-2">SKU</th><th className="p-2">What to fix</th></tr></thead><tbody>{result.errors.map(item => <tr key={item.row} className="border-t border-border"><td className="p-2 align-top">{item.row}</td><td className="p-2 align-top">{item.sku || 'Not set'}</td><td className="p-2">{item.message}</td></tr>)}</tbody></table></div>}
    </section>}
  </div>;
}
