import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const TYPES = [
  ['select', 'Single choice'],
  ['multi-select', 'Multiple choice'],
  ['text', 'Text'],
  ['number', 'Number'],
  ['boolean', 'Yes / No'],
];

const CategoryFilterBuilder = ({ value = [], onChange }) => {
  const update = (index, field, nextValue) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: nextValue } : item)));
  };

  const add = () => onChange([
    ...value,
    { key: '', label: '', inputType: 'select', options: [], unit: '', isRequired: false, isFilterable: true, sortOrder: value.length },
  ]);

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">Product filter fields</p>
          <p className="text-xs text-gray-500">Products in this category get these fields. Child categories inherit them and can override the same key.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} leftIcon={<Plus className="h-3.5 w-3.5" />}>Add filter</Button>
      </div>

      {value.map((definition, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input value={definition.label || ''} onChange={(e) => update(index, 'label', e.target.value)} placeholder="Label: CPU Socket" required />
            <Input value={definition.key || ''} onChange={(e) => update(index, 'key', e.target.value)} placeholder="Key: CPU Socket" required />
            <Select
              className="text-xs"
              value={definition.inputType || 'select'}
              onChange={(e) => update(index, 'inputType', e.target.value)}
              options={TYPES.map(([type, label]) => ({ value: type, label }))}
            />
          </div>
          {(definition.inputType === 'select' || definition.inputType === 'multi-select') && (
            <Input value={(definition.options || []).join(', ')} onChange={(e) => update(index, 'options', e.target.value.split(',').map((option) => option.trim()).filter(Boolean))} placeholder="Options, comma separated: LGA 1700, AM4, AM5" required />
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700">
            <Input value={definition.unit || ''} onChange={(e) => update(index, 'unit', e.target.value)} placeholder="Unit (inch, GB...)" className="max-w-40" />
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!definition.isRequired} onChange={(e) => update(index, 'isRequired', e.target.checked)} /> Required on product</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={definition.isFilterable !== false} onChange={(e) => update(index, 'isFilterable', e.target.checked)} /> Show in storefront filters</label>
            <button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="ml-auto inline-flex items-center gap-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryFilterBuilder;
