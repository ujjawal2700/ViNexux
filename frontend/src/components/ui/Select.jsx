import React, { useMemo } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import FormField from './FormField';
import { cn } from '../../lib/utils';

export const Select = React.forwardRef(({
  label,
  error,
  helperText,
  required = false,
  isDisabled = false,
  disabled = false,
  options = [],
  placeholder = 'Select an option...',
  className = '',
  id,
  children,
  value,
  onChange,
  portal,
  leftIcon,
  rightIcon,
  inputRef,
  ...props
}, ref) => {
  const effectiveDisabled = Boolean(isDisabled || disabled);
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Normalize options array or <option> children
  const parsedOptions = useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === 'string' || typeof opt === 'number') {
          return { value: String(opt), label: String(opt), disabled: false };
        }
        const val = opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : '');
        const lbl = opt.label || opt.name || (val !== undefined ? String(val) : '');
        return {
          value: val,
          label: lbl,
          disabled: Boolean(opt.disabled),
        };
      });
    }

    if (children) {
      const opts = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === 'option') {
          opts.push({
            value: child.props.value !== undefined ? child.props.value : child.props.children,
            label: child.props.children || child.props.value,
            disabled: Boolean(child.props.disabled),
          });
        }
      });
      return opts;
    }

    return [];
  }, [options, children]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => String(opt.value) === String(value ?? ''));
  }, [parsedOptions, value]);

  const displayLabel = selectedOption
    ? selectedOption.label
    : (placeholder !== null && placeholder !== undefined ? placeholder : (parsedOptions[0]?.label ?? ''));

  const handleSelect = (opt) => {
    if (opt.disabled || effectiveDisabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value, name: props.name || selectId },
        currentTarget: { value: opt.value, name: props.name || selectId },
        value: opt.value,
      };
      onChange(syntheticEvent);
    }
  };

  const selectNode = (
    <div className="relative w-full">
      <input
        type="hidden"
        name={props.name || selectId}
        value={value ?? ''}
        disabled={effectiveDisabled}
      />
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild disabled={effectiveDisabled}>
          <button
            ref={ref}
            type="button"
            id={selectId}
            disabled={effectiveDisabled}
            className={cn(
              'group w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-800 transition-all shadow-2xs cursor-pointer select-none text-left',
              'hover:border-[#800020] focus:outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20',
              'data-[state=open]:border-[#800020] data-[state=open]:ring-2 data-[state=open]:ring-[#800020]/20',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 data-[state=open]:border-rose-500',
              effectiveDisabled && 'opacity-50 cursor-not-allowed pointer-events-none bg-gray-50',
              className
            )}
            {...props}
          >
            <span className={cn('truncate flex-1', !selectedOption && placeholder && 'text-gray-400 font-normal')}>
              {displayLabel}
            </span>
            <ChevronDown className="w-4 h-4 text-[#800020] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuPrimitive.Trigger>

        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="start"
            sideOffset={6}
            className="z-50 min-w-[12rem] max-h-64 overflow-y-auto rounded-2xl border border-[#800020]/25 bg-white p-1.5 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}
          >
            {parsedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 font-medium text-center">
                No options available
              </div>
            ) : (
              parsedOptions.map((opt, index) => {
                const isSelected = String(opt.value) === String(value ?? '');
                return (
                  <DropdownMenuPrimitive.Item
                    key={`${opt.value}-${index}`}
                    disabled={opt.disabled}
                    onSelect={() => handleSelect(opt)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer select-none outline-none transition-colors my-0.5',
                      isSelected
                        ? 'bg-[#800020] text-white focus:bg-[#800020] focus:text-white font-bold shadow-xs'
                        : 'text-gray-800 focus:bg-[#800020]/10 focus:text-[#800020] hover:bg-[#800020]/10 hover:text-[#800020]',
                      opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                  >
                    <span className="truncate flex-1 text-left">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                  </DropdownMenuPrimitive.Item>
                );
              })
            )}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );

  if (label || error || helperText) {
    return (
      <FormField label={label} required={required} error={error} helperText={helperText} htmlFor={selectId}>
        {selectNode}
      </FormField>
    );
  }

  return selectNode;
});

Select.displayName = 'Select';

export default Select;
