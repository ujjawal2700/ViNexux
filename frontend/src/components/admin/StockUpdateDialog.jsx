import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import useToast from '../../hooks/useToast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const StockUpdateDialog = ({ product, onClose, onUpdated }) => {
  const toast = useToast();
  const [currentProduct, setCurrentProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!product?._id) return;
    let cancelled = false;
    setLoading(true);
    setQuantity('');
    setCurrentProduct(null);
    setError('');
    adminService.getProductById(product._id).then((res) => {
      if (!cancelled) setCurrentProduct(res.data);
    }).catch((err) => {
      if (!cancelled) setError(err.response?.data?.message || 'Unable to load current stock. Close and try again.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [product?._id]);

  const currentStock = Number(currentProduct?.stockQuantity || 0);
  const addition = Number(quantity);
  const valid = quantity !== '' && Number.isSafeInteger(addition) && addition > 0 && Number.isSafeInteger(currentStock + addition);
  const total = currentStock + (valid ? addition : 0);

  const save = async (event) => {
    event?.preventDefault();
    if (!valid || !currentProduct || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminService.addProductStock(product._id, addition);
      toast.success(`Product stock updated. Total stock quantity is ${res.data.stockQuantity}.`);
      onUpdated?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update product stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!product} onClose={() => { if (!saving) onClose(); }} closeOnOutsideClick={!saving}
      title="Update Stock" description={product?.name} size="sm"
      footer={<>
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="sm" isLoading={saving} disabled={saving || !valid || loading || !currentProduct} onClick={save}>Add Stock</Button>
      </>}>
      {loading ? <p role="status">Loading current stock…</p> : currentProduct && <form onSubmit={save} className="space-y-4">
        <p className="text-xs text-gray-500">{product?.modelNumber} {product?.sku && `· ${product.sku}`}</p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex justify-between">
          <span>Current stock</span><strong>{currentStock}</strong>
        </div>
        <Input label="Units to add" type="number" min="1" step="1" value={quantity} autoFocus
          disabled={saving || !currentProduct} onChange={(event) => setQuantity(event.target.value)} placeholder="Enter quantity" />
        {quantity !== '' && !valid && <p className="text-xs text-rose-600">Enter a positive whole number within the stock limit.</p>}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex justify-between text-emerald-900">
          <span>Total stock after update</span><strong>{total}</strong>
        </div>
        <p className="text-xs text-gray-500">{currentStock} current + {valid ? addition : 0} added = {total} total</p>
      </form>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </Modal>
  );
};

export default StockUpdateDialog;
