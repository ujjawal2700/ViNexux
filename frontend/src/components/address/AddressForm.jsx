import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Save, X } from 'lucide-react';

/**
 * Add/edit form for one saved address. Field set and validation lifted
 * directly from the old CheckoutEnquiryPage inline address form, plus a
 * `label` field and `isDefault` checkbox for the address-book use case.
 */
export const AddressForm = ({ initialValues, onSubmit, onCancel, isSaving = false }) => {
  const [values, setValues] = useState({
    label: initialValues?.label || '',
    line1: initialValues?.line1 || '',
    line2: initialValues?.line2 || '',
    city: initialValues?.city || '',
    state: initialValues?.state || '',
    pincode: initialValues?.pincode || '',
    isDefault: initialValues?.isDefault || false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const next = {};
    if (!values.line1.trim()) next.line1 = 'Street address (Line 1) is required';
    if (!values.city.trim()) next.city = 'City is required';
    if (!values.state.trim()) next.state = 'State is required';
    if (!values.pincode.trim()) {
      next.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(values.pincode.trim())) {
      next.pincode = 'Enter a valid 6-digit pincode';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      label: values.label.trim() || 'Address',
      line1: values.line1.trim(),
      line2: values.line2.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      pincode: values.pincode.trim(),
      isDefault: values.isDefault,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl bg-muted/40 border border-dashed border-border">
      <Input
        label="Label (Optional)"
        name="label"
        placeholder="e.g. Home, Office, Warehouse"
        value={values.label}
        onChange={handleChange}
        isDisabled={isSaving}
      />
      <Input
        label="Street Address / Line 1 *"
        name="line1"
        placeholder="Building No, Street Name, Area..."
        value={values.line1}
        onChange={handleChange}
        error={errors.line1}
        isDisabled={isSaving}
      />
      <Input
        label="Address Line 2 (Optional)"
        name="line2"
        placeholder="Landmark, Suite, Unit..."
        value={values.line2}
        onChange={handleChange}
        isDisabled={isSaving}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="City *"
          name="city"
          placeholder="e.g. Mumbai"
          value={values.city}
          onChange={handleChange}
          error={errors.city}
          isDisabled={isSaving}
        />
        <Input
          label="State *"
          name="state"
          placeholder="e.g. Maharashtra"
          value={values.state}
          onChange={handleChange}
          error={errors.state}
          isDisabled={isSaving}
        />
        <Input
          label="Pincode *"
          name="pincode"
          placeholder="6-digit code"
          value={values.pincode}
          onChange={handleChange}
          error={errors.pincode}
          isDisabled={isSaving}
        />
      </div>

      <label className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={(e) => setValues((prev) => ({ ...prev, isDefault: e.target.checked }))}
          disabled={isSaving}
          className="rounded-md border-border bg-muted text-primary focus:ring-primary/20 w-3.5 h-3.5"
        />
        <span>Set as default address</span>
      </label>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" isLoading={isSaving} leftIcon={<Save className="w-3.5 h-3.5" />}>
          Save Address
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} isDisabled={isSaving} leftIcon={<X className="w-3.5 h-3.5" />}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default AddressForm;
