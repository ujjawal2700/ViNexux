import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const MAX_VISIBLE = 100;

/** Searchable selection from the supplied options; typed text only filters the list. */
export const SearchableSelect = ({ value, onChange, options = [], optionAliases = {}, placeholder = 'Select...', searchPlaceholder = 'Search...', emptyMessage = 'No matches found.', disabled = false, className = '', label, loading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const listId = useId();
  const normalizedOptions = useMemo(() => [...new Set(options)].map(option => ({ option, search: [option, ...(Array.isArray(optionAliases[option]) ? optionAliases[option] : [])].map(normalize) })), [options, optionAliases]);
  const filteredOptions = useMemo(() => {
    const q = normalize(query.trim());
    return normalizedOptions.filter(item => !q || item.search.some(name => name.includes(q))).map(item => item.option);
  }, [normalizedOptions, query]);
  const visibleOptions = filteredOptions.slice(0, MAX_VISIBLE);
  const selectableOptions = visibleOptions;

  useEffect(() => {
    if (!isOpen) return undefined;
    const outside = event => {
      if (!containerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) { setIsOpen(false); setQuery(''); }
    };
    document.addEventListener('pointerdown', outside);
    const timer = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => { document.removeEventListener('pointerdown', outside); cancelAnimationFrame(timer); };
  }, [isOpen]);
  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const place = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const height = window.visualViewport?.height || window.innerHeight;
      const below = height - rect.bottom - 12;
      const above = rect.top - 12;
      const openAbove = below < 220 && above > below;
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), width: Math.min(rect.width, window.innerWidth - 16), maxHeight: Math.max(100, Math.min(350, openAbove ? above : below)), ...(openAbove ? { bottom: height - rect.top + 6 } : { top: rect.bottom + 6 }) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [isOpen]);
  useEffect(() => {
    if (isOpen) panelRef.current?.querySelector(`[data-option-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);
  const select = option => { onChange(option); setIsOpen(false); setQuery(''); containerRef.current?.querySelector('button')?.focus(); };
  const keyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); setQuery(''); containerRef.current?.querySelector('button')?.focus(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(current => Math.max(0, Math.min(selectableOptions.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))); }
    else if (event.key === 'Enter') { event.preventDefault(); if (selectableOptions[activeIndex]) select(selectableOptions[activeIndex]); }
    else if (event.key === 'Tab') { setIsOpen(false); setQuery(''); }
  };
  return <div ref={containerRef} className={cn('relative', className)}>
    <button type="button" role="combobox" aria-label={label || placeholder} aria-expanded={isOpen} aria-controls={listId} aria-haspopup="listbox" disabled={disabled}
      onClick={() => { setIsOpen(current => !current); setQuery(''); setActiveIndex(0); }}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setIsOpen(true); setActiveIndex(0); } }}
      className={cn('w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-left outline-none font-semibold flex items-center justify-between gap-2 h-[42px] hover:border-[#800020] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shadow-2xs', isOpen && 'border-[#800020] ring-2 ring-[#800020]/20', value ? 'text-gray-900' : 'text-gray-400')}>
      <span className="truncate">{value || placeholder}</span><ChevronDown className={cn('w-4 h-4 text-[#800020] shrink-0 transition-transform', isOpen && 'rotate-180')} />
    </button>
    {isOpen && !disabled && position && createPortal(<div ref={panelRef} style={position} className="fixed z-[2000] flex flex-col rounded-xl border border-gray-300 bg-white text-gray-900 shadow-xl overflow-hidden" onKeyDown={keyDown}>
      <div className="relative shrink-0 border-b border-gray-100 bg-white p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#800020]" />
        <input ref={searchInputRef} role="searchbox" aria-label={searchPlaceholder} aria-controls={listId} aria-activedescendant={selectableOptions.length ? `${listId}-${activeIndex}` : undefined} type="text" maxLength={100} value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} placeholder={searchPlaceholder} className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-[#800020]" />
      </div>
      <div id={listId} role="listbox" aria-label={label || placeholder} className="min-h-0 overflow-y-auto bg-white p-1">
        {selectableOptions.map((option, index) => <button type="button" role="option" aria-selected={option === value} id={`${listId}-${index}`} data-option-index={index} key={option} onPointerMove={() => setActiveIndex(index)} onClick={() => select(option)}
          className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm', index === activeIndex ? 'bg-[#800020] text-white' : 'bg-white text-gray-900 hover:bg-rose-50')}>
          <span className="break-words">{option}</span>{option === value && <Check className="h-4 w-4 shrink-0" />}
        </button>)}
        {!selectableOptions.length && <p className="p-3 text-sm text-gray-500">{loading ? 'Loading city suggestions…' : emptyMessage}</p>}
      </div>
      {filteredOptions.length > MAX_VISIBLE && <p className="shrink-0 border-t bg-white px-3 py-2 text-xs text-gray-500">{filteredOptions.length.toLocaleString()} suggestions. Type more to narrow your search.</p>}
    </div>, document.body)}
  </div>;
};
export default SearchableSelect;
