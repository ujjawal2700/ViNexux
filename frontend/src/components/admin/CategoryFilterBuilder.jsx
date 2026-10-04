import React from 'react';
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const TYPES = [
  { value: 'select', label: 'Dropdown list (single choice)' },
  { value: 'multi-select', label: 'Checkboxes (multiple choices)' },
  { value: 'text', label: 'Text specification' },
  { value: 'number', label: 'Numeric value' },
  { value: 'boolean', label: 'Yes / No choice' },
];

const slugifyKey = (text) => {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const CategoryFilterBuilder = ({ value = [], onChange }) => {
  const update = (index, field, nextValue) => {
    onChange(
      value.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updated = { ...item, [field]: nextValue };
        // If user changed label and key is either empty or matches previous auto-slug, keep key in sync
        if (field === 'label' && (!item.key || item.key === slugifyKey(item.label))) {
          updated.key = slugifyKey(nextValue);
        }
        return updated;
      })
    );
  };

  const add = () =>
    onChange([
      ...value,
      {
        key: '',
        label: '',
        inputType: 'select',
        options: [],
        unit: '',
        isRequired: false,
        isFilterable: true,
        sortOrder: value.length,
      },
    ]);

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/70">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#800020]" />
            <h3 className="text-sm font-bold text-gray-900">Storefront Filters &amp; Specifications</h3>
            <span className="text-[11px] font-medium text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full">
              Optional
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-xl">
            Add custom filters that help customers narrow down products (e.g. Storage Capacity, RAM, Resolution, Screen Size).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          leftIcon={<Plus className="h-4 w-4 text-[#800020]" />}
          className="shrink-0 border-[#800020]/40 text-[#800020] hover:bg-[#800020]/10 font-semibold"
        >
          Add New Filter
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="py-5 px-4 text-center border border-dashed border-gray-300 rounded-xl bg-white text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-800">No custom filters configured</p>
          <p className="text-[11px] text-gray-400">
            Products will use standard price and brand filters. Click <strong>+ Add New Filter</strong> if you want custom spec filters (e.g. Storage, RAM).
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {value.map((definition, index) => (
            <div
              key={index}
              className="space-y-3.5 rounded-xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-gray-300 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">
                  Filter #{index + 1}: {definition.label || 'New Filter'}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Filter</span>
                </button>
              </div>

              {/* 2-Column Responsive Layout for Name and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Filter Name"
                  value={definition.label || ''}
                  onChange={(e) => update(index, 'label', e.target.value)}
                  placeholder="e.g. Storage Capacity, RAM Size, Camera Type"
                  required
                />
                <Select
                  label="Filter Type"
                  value={definition.inputType || 'select'}
                  onChange={(e) => update(index, 'inputType', e.target.value)}
                  options={TYPES}
                />
              </div>

              {/* Options row for select / multi-select */}
              {(definition.inputType === 'select' || definition.inputType === 'multi-select') && (
                <Input
                  label="Available Choices (separate with commas)"
                  value={(definition.options || []).join(', ')}
                  onChange={(e) =>
                    update(
                      index,
                      'options',
                      e.target.value
                        .split(',')
                        .map((opt) => opt.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="e.g. 256 GB, 512 GB, 1 TB, 2 TB"
                  helperText="Customers will see these options as filter checkboxes."
                  required
                />
              )}

              {/* Bottom detail row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-gray-700 border-t border-gray-100">
                <div className="w-full sm:w-48">
                  <Input
                    label="Measurement Unit (Optional)"
                    value={definition.unit || ''}
                    onChange={(e) => update(index, 'unit', e.target.value)}
                    placeholder="e.g. GB, TB, MP, Watts"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1 sm:pt-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={definition.isFilterable !== false}
                      onChange={(e) => update(index, 'isFilterable', e.target.checked)}
                      className="rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
                    />
                    <span>Show on customer filter bar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!definition.isRequired}
                      onChange={(e) => update(index, 'isRequired', e.target.checked)}
                      className="rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
                    />
                    <span>Required for products</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryFilterBuilder;

