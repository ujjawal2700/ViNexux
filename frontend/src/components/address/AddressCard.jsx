import React from 'react';
import { cn } from '../../lib/utils';
import { MapPin, Star, Pencil, Trash2, Check } from 'lucide-react';

/**
 * Displays one saved address. Two modes:
 * - management (default): Edit/Delete/Set-default action buttons
 * - selectable: radio-style card for checkout (AddressPicker)
 */
export const AddressCard = ({
  address,
  selectable = false,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  isBusy = false,
}) => {
  const lines = [address.line1, address.line2].filter(Boolean).join(', ');
  const cityLine = [address.city, address.state, address.pincode].filter(Boolean).join(', ');

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-[#800020] shrink-0" />
          <span className="font-bold text-gray-900 text-sm truncate">{address.label || 'Address'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {address.isDefault && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#800020] bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
              <Star className="w-2.5 h-2.5 fill-current" /> Default
            </span>
          )}
          {selectable && selected && <Check className="w-4 h-4 text-[#800020] shrink-0" />}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{lines}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{cityLine}</p>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(address._id)}
        disabled={isBusy}
        className={cn(
          'w-full text-left p-4 rounded-xl border transition-all disabled:opacity-50',
          selected ? 'border-[#800020] ring-2 ring-[#800020]/20 bg-rose-50/30' : 'border-gray-200 bg-white hover:border-[#800020]/40'
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
      {content}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        {!address.isDefault && onSetDefault && (
          <button
            type="button"
            onClick={() => onSetDefault(address._id)}
            disabled={isBusy}
            className="text-[11px] font-bold text-[#800020] hover:underline disabled:opacity-50"
          >
            Set as Default
          </button>
        )}
        <div className="flex-1" />
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(address)}
            disabled={isBusy}
            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            title="Edit address"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(address._id)}
            disabled={isBusy}
            className="text-muted-foreground hover:text-rose-600 transition-colors disabled:opacity-50"
            title="Delete address"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AddressCard;
