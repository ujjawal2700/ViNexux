import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Images, Upload } from 'lucide-react';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';

const formatPrice = (value) => value === '' ? '—' : `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function AdminProductImportPage() {
  const [workbook, setWorkbook] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const resetPreview = () => { setPreview(null); setResult(null); setError(''); };
  const downloadTemplate = async () => {
    setBusy('template'); setError('');
    try {
      const blob = await adminService.downloadProductImportTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vinexus-product-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.response?.data?.message || 'Could not download the template.'); }
    finally { setBusy(''); }
  };
  const runPreview = async () => {
    if (!workbook) { setError('Choose an Excel workbook first.'); return; }
    setBusy('preview'); setError(''); setResult(null);
    try {
      const response = await adminService.previewProductImport(workbook);
      setPreview(response.data);
    } catch (err) { setPreview(null); setError(err.response?.data?.message || 'Could not preview the import.'); }
    finally { setBusy(''); }
  };
  const runImport = async () => {
    if (!preview || preview.invalid > 0 || busy) return;
    setBusy('import'); setError('');
    try {
      const response = await adminService.commitProductImport(workbook);
      setResult(response.data);
      setPreview(null);
    } catch (err) { setError(err.response?.data?.message || 'Import failed. Preview the workbook again.'); }
    finally { setBusy(''); }
  };

  return <div className="space-y-6 text-slate-900">
    <div>
      <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#800020] hover:text-[#650019]"><ArrowLeft className="h-4 w-4" /> Back to Products</Link>
      <h1 className="mt-3 text-2xl font-bold">Bulk Product Import</h1>
      <p className="mt-1 text-sm text-slate-700">Use the Vinexus Excel template to add up to 200 products at once. The full import succeeds together, or no products are added.</p>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold"><FileSpreadsheet className="h-5 w-5 text-[#800020]" /> 1. Download and fill the template</h2>
        <p className="mt-2 text-sm text-slate-700">Enter one product per row on the Products sheet. See three filled rows on the Examples sheet. Each model number must be unique. New brands and categories are created when the import succeeds.</p>
        <Button type="button" variant="outline" onClick={downloadTemplate} disabled={!!busy} className="mt-4"><Download className="mr-2 h-4 w-4" />{busy === 'template' ? 'Preparing...' : 'Download Excel Template'}</Button>
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold"><Images className="h-5 w-5 text-[#800020]" /> 2. Images are optional</h2>
        <p className="mt-2 text-sm text-slate-700">After import, add product images and brand or category logos from the admin panel. Products show a placeholder until their images are added.</p>
      </section>
    </div>

    <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-base font-bold">3. Upload and preview</h2>
      <div className="grid gap-4">
        <label className="block text-sm font-semibold">Excel workbook (.xlsx)
          <input type="file" accept=".xlsx" disabled={!!busy} onChange={(event) => { setWorkbook(event.target.files?.[0] || null); resetPreview(); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 file:mr-3 file:rounded-md file:border-0 file:bg-[#800020]/10 file:px-3 file:py-2 file:font-semibold file:text-[#800020]" />
        </label>
      </div>
      <Button type="button" variant="primary" onClick={runPreview} disabled={!workbook || !!busy}><Upload className="mr-2 h-4 w-4" />{busy === 'preview' ? 'Checking rows...' : 'Preview Products'}</Button>
    </section>

    {error && <div role="alert" className="rounded-lg border border-red-400 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

    {preview && <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-bold">Import Preview</h2><p className="text-sm text-slate-700">{preview.total} rows · {preview.valid} valid · {preview.invalid} invalid</p></div>
        <Button type="button" variant="primary" onClick={runImport} disabled={preview.invalid > 0 || !!busy}>{busy === 'import' ? 'Importing...' : `Import ${preview.valid} Products`}</Button>
      </div>
      {preview.invalid > 0 && <p className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Correct all invalid rows and preview again before importing.</p>}
      {(preview.newCategories?.length > 0 || preview.newBrands?.length > 0) && <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-3"><h3 className="text-sm font-bold">New categories on successful import ({preview.newCategories?.length || 0})</h3><ul className="mt-2 space-y-1 text-sm text-slate-800">{preview.newCategories?.map((category, index) => <li key={index}>{category.level}: {category.parentName ? `${category.parentName} → ` : ''}{category.name}</li>)}</ul></div>
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-3"><h3 className="text-sm font-bold">New brands on successful import ({preview.newBrands?.length || 0})</h3><ul className="mt-2 space-y-1 text-sm text-slate-800">{preview.newBrands?.map((brand, index) => <li key={index}>{brand.name}</li>)}</ul></div>
      </div>}
      <div className="w-full overflow-x-auto rounded-lg border border-slate-300">
        <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-900"><tr>{['Row', 'Model Number', 'Product Name', 'Category', 'Standard', 'Dealer', 'Status / Errors'].map((heading) => <th key={heading} className="border-b border-r border-slate-300 px-3 py-2 font-bold last:border-r-0">{heading}</th>)}</tr></thead>
          <tbody>{preview.rows.map((row) => <tr key={row.rowNumber} className="align-top even:bg-slate-50">
            <td className="border-b border-r border-slate-200 px-3 py-2 font-semibold">{row.rowNumber}</td>
            <td className="border-b border-r border-slate-200 px-3 py-2 font-semibold">{row.modelNumber}</td>
            <td className="border-b border-r border-slate-200 px-3 py-2 font-semibold">{row.name}</td>
            <td className="border-b border-r border-slate-200 px-3 py-2">{row.category}</td>
            <td className="border-b border-r border-slate-200 px-3 py-2">{formatPrice(row.standardPrice)}</td>
            <td className="border-b border-r border-slate-200 px-3 py-2">{formatPrice(row.dealerPrice)}</td>
            <td className="border-b border-slate-200 px-3 py-2">{row.errors.length ? <ul className="space-y-1 text-red-700">{row.errors.map((message, index) => <li key={index}>{message}</li>)}</ul> : <span className="font-semibold text-emerald-700">Ready</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>}

    {result && <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm space-y-3">
      <h2 className="text-base font-bold">Import Result</h2>
      <p className="text-sm font-semibold">{result.created} products · {result.createdCategories} categories · {result.createdBrands} brands created</p>
      {result.results?.map((row) => <p key={row.rowNumber} className={`rounded-lg border px-3 py-2 text-sm ${row.status === 'created' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-red-300 bg-red-50 text-red-800'}`}>Row {row.rowNumber} · {row.sku}: {row.status === 'created' ? 'Created' : row.error}</p>)}
      <Link to="/admin/products" className="inline-block font-semibold text-[#800020]">View Product Catalog</Link>
    </section>}
  </div>;
}
