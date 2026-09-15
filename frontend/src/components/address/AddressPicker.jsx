import React, { useState, useEffect, useCallback } from 'react';
import addressService from '../../services/addressService';
import useToast from '../../hooks/useToast';
import { AddressCard } from './AddressCard';
import { AddressForm } from './AddressForm';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Plus, MapPin } from 'lucide-react';

/**
 * Checkout-specific address selector: pick one saved address, or add a new
 * one inline (which saves it to the address book and auto-selects it).
 * Lighter than AddressBookSection - no edit/delete here, just "must pick
 * exactly one to proceed."
 */
export const AddressPicker = ({ selectedAddressId, onSelect }) => {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await addressService.listAddresses();
      const list = res.data?.addresses || [];
      setAddresses(list);

      // Pre-select the default address (or the only one) if nothing is
      // selected yet - a sane starting point, not a hard requirement.
      if (!selectedAddressId && list.length > 0) {
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        onSelect(defaultAddr._id);
      }
    } catch (err) {
      console.error('Failed to load saved addresses:', err);
      toast.error('Unable to load your saved addresses.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleCreate = async (data) => {
    setIsSaving(true);
    try {
      const res = await addressService.createAddress(data);
      const list = res.data?.addresses || [];
      setAddresses(list);
      setIsAdding(false);
      // Auto-select the newly created address (it's the last entry returned).
      const newest = list[list.length - 1];
      if (newest) onSelect(newest._id);
      toast.success('Address saved and selected.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
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
    <div className="space-y-3">
      {addresses.length === 0 && !isAdding && (
        <div className="p-6 text-center bg-background rounded-xl border border-dashed border-border">
          <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            You don't have any saved addresses yet. Add one to continue.
          </p>
        </div>
      )}

      {addresses.map((addr) => (
        <AddressCard
          key={addr._id}
          address={addr}
          selectable
          selected={selectedAddressId === addr._id}
          onSelect={onSelect}
        />
      ))}

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

export default AddressPicker;
