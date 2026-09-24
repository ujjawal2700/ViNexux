import React, { useState, useEffect, useCallback } from 'react';
import addressService from '../../services/addressService';
import useToast from '../../hooks/useToast';
import { AddressCard } from './AddressCard';
import { AddressForm } from './AddressForm';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Plus, MapPin } from 'lucide-react';

/**
 * Full saved-address manager, used inside the account Profile page.
 * Both customer and dealer roles use this identically.
 */
export const AddressBookSection = () => {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await addressService.listAddresses();
      setAddresses(res.data?.addresses || []);
    } catch (err) {
      console.error('Failed to load saved addresses:', err);
      toast.error('Unable to load your saved addresses.');
    } finally {
      setIsLoading(false);
    }
    // toast is a fresh object every ToastProvider render (not memoized) -
    // depending on it here would refetch on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleCreate = async (data) => {
    setIsSaving(true);
    try {
      const res = await addressService.createAddress(data);
      setAddresses(res.data?.addresses || []);
      setIsAdding(false);
      toast.success('Address saved successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (addressId, data) => {
    setIsSaving(true);
    try {
      const res = await addressService.updateAddress(addressId, data);
      setAddresses(res.data?.addresses || []);
      setEditingId(null);
      toast.success('Address updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    setBusyId(addressId);
    try {
      const res = await addressService.deleteAddress(addressId);
      setAddresses(res.data?.addresses || []);
      toast.success('Address deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete address.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (addressId) => {
    setBusyId(addressId);
    try {
      const res = await addressService.setDefaultAddress(addressId);
      setAddresses(res.data?.addresses || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set default address.');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !isAdding && (
        <div className="p-6 text-center bg-gray-50/80 rounded-xl border border-dashed border-gray-300">
          <MapPin className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">
            No saved addresses yet. Add one so it's ready to select at checkout.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {addresses.map((addr) =>
          editingId === addr._id ? (
            <AddressForm
              key={addr._id}
              initialValues={addr}
              isSaving={isSaving}
              onCancel={() => setEditingId(null)}
              onSubmit={(data) => handleUpdate(addr._id, data)}
            />
          ) : (
            <AddressCard
              key={addr._id}
              address={addr}
              isBusy={busyId === addr._id}
              onEdit={(a) => setEditingId(a._id)}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          )
        )}
      </div>

      {isAdding ? (
        <AddressForm isSaving={isSaving} onCancel={() => setIsAdding(false)} onSubmit={handleCreate} />
      ) : (
        <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsAdding(true)}>
          Add New Address
        </Button>
      )}
    </div>
  );
};

export default AddressBookSection;
