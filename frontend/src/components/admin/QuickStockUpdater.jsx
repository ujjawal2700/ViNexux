import React, { useEffect, useState } from 'react';
import { PackagePlus, Search, RefreshCw } from 'lucide-react';
import adminService from '../../services/adminService';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Pagination from '../ui/Pagination';
import StockUpdateDialog from './StockUpdateDialog';

const QuickStockUpdater = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [target, setTarget] = useState(null);
  const limit = 10;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const res = await adminService.searchStockProducts({ search: search.trim(), page, limit }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.data?.message || 'Unable to load products for stock updates.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page, refresh]);

  return (
    <section id="dashboard-stock-updater" className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs scroll-mt-24">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2"><PackagePlus className="h-4 w-4 text-primary" /> Quick Stock Updates</h3>
          <p className="text-xs text-muted-foreground mt-1">Search by product name, model name, model number, SKU or ID. Close spelling matches are included.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh stock products"><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <Input id="dashboard-stock-search" aria-label="Search products to update stock" maxLength={100} leftIcon={<Search className="h-4 w-4" />}
        placeholder="Search products by name, model or ID…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      {loading ? <p role="status" className="text-sm text-muted-foreground py-4">Loading products…</p> : error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : <>
        <p className="text-xs text-muted-foreground">{pagination.total} {search.trim() ? 'matching' : 'catalog'} products</p>
        <div className="divide-y divide-border rounded-lg border border-border">
          {products.length === 0 && <p className="p-4 text-sm text-muted-foreground">No products found. Try another name, model or ID.</p>}
          {products.map((product) => <div key={product._id} className="p-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.model || 'No model name'} · {product.modelNumber || 'No model number'} · {product.sku}</p>
              <p className="text-[10px] text-muted-foreground break-all">ID: {product._id}{!product.isActive && ' · Inactive'}</p>
            </div>
            <div className="text-right text-xs"><span className="block text-muted-foreground">Current stock</span><strong className="text-base">{product.stockQuantity || 0}</strong></div>
            <Button variant="outline" size="sm" onClick={() => setTarget(product)}><PackagePlus className="h-4 w-4" /> Update Stock</Button>
          </div>)}
        </div>
        {pagination.total > 0 && <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={limit} onPageChange={setPage} />}
      </>}
      {target && <StockUpdateDialog product={target} onClose={() => setTarget(null)} onUpdated={(updated) => setProducts((items) => items.map((item) => item._id === updated._id ? { ...item, stockQuantity: updated.stockQuantity } : item))} />}
    </section>
  );
};

export default QuickStockUpdater;
