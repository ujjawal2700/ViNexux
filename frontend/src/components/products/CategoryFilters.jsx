import React, { useMemo } from 'react';
import { CATEGORY_FILTER_KEYS, categoryLevels } from '../../../../shared/categoryFiltering.js';
const labels = ['Main categories', 'Subcategories'];
const filterKeys = CATEGORY_FILTER_KEYS.slice(1);
export default function CategoryFilters({ categories, facets, selections, onToggle, onClear }) {
  const groups = useMemo(() => {
    const levels = categoryLevels(categories);
    const byId = new Map(categories.map(category => [String(category._id), category]));
    const counts = new Map((facets || []).map(category => [String(category._id), category]));
    return filterKeys.map((key, index) => ({ key, label: labels[index], rows: categories.filter(category => levels.get(String(category._id)) === index + 2 && counts.get(String(category._id))?.count > 0).map(category => ({
      ...category, count: counts.get(String(category._id))?.count || 0,
      parentName: key === 'subCategory' ? byId.get(String(category.parentId?._id || category.parentId || ''))?.name || '' : '',
    })) }));
  }, [categories, facets]);
  const all = !Object.values(selections).some(values => values.length);
  return <div className="space-y-4">
    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={all} onChange={onClear} className="h-4 w-4 accent-[var(--store-primary)]" /><span>All Categories</span></label>
    {groups.map(group => group.rows.length > 0 && <fieldset key={group.key} className="space-y-2">
      <legend className="mb-2 text-xs font-bold text-[var(--store-text)]">{group.label}</legend>
      {group.rows.map(category => <label key={category._id} className="flex items-start justify-between gap-2 text-xs text-[var(--store-muted)] cursor-pointer">
        <span className="flex items-start gap-2 min-w-0"><input type="checkbox" aria-label={`${group.label}: ${category.name}${category.parentName ? ` (${category.parentName})` : ''}`} checked={selections[group.key].includes(String(category._id))} onChange={() => onToggle(category, group.key)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--store-primary)]" /><span className="break-words"><span className={selections[group.key].includes(String(category._id)) ? 'font-semibold text-[var(--store-text)]' : ''}>{category.name}</span>{category.parentName && <small className="block text-[10px]">{category.parentName}</small>}</span></span>
        <span className="shrink-0 tabular-nums">{category.count}</span>
      </label>)}
    </fieldset>)}
  </div>;
}
