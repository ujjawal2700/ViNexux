import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import useToast from '../../hooks/useToast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const ProductPriceDialog = ({ product, field, onClose, onUpdated }) => {
  const toast = useToast();
  const label = field === 'standardPrice' ? 'Standard price' : 'Dealer price';
  const [price, setPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCurrentPrice(null);
    setError('');
    adminService.getProductById(product._id).then((res) => {
      if (cancelled) return;
      const value = res.data[field] ?? 0;
      setCurrentPrice(value);
      setPrice(String(value));
    }).catch((err) => {
      if (!cancelled) setError(err.response?.data?.message || 'Unable to load the current price. Close and try again.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [product._id, field]);

  const amount = Number(price);
  const valid = price.trim() !== '' && Number.isFinite(amount) && amount >= 0;
  const save = async (event) => {
    event?.preventDefault();
    if (!valid || saving || loading || currentPrice === null) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminService.updateProduct(product._id, { [field]: amount });
      onUpdated(res.data, field);
      toast.success(`${label} updated to ₹${Number(res.data[field]).toLocaleString('en-IN')}.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update the price. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <Modal isOpen onClose={() => { if (!saving) onClose(); }} closeOnOutsideClick={!saving}
    title={`Update ${label}`} description={product.name} size="sm"
    footer={<>
      <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>Cancel</Button>
      <Button size="sm" isLoading={saving} disabled={saving || loading || currentPrice === null || !valid} onClick={save}>Save Price</Button>
    </>}>
    {loading ? <p role="status">Loading current price…</p> : currentPrice !== null && <form onSubmit={save} className="space-y-4">
      <p>Current {label.toLowerCase()}: <strong>₹{Number(currentPrice).toLocaleString('en-IN')}</strong></p>
      <Input label={`New ${label.toLowerCase()} (₹)`} type="number" min="0" step="any" autoFocus
        disabled={saving} value={price} onChange={(event) => setPrice(event.target.value)} />
      {!valid && <p className="text-xs text-rose-600">Enter a valid price of ₹0 or greater.</p>}
    </form>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </Modal>;
};

export default ProductPriceDialog;
