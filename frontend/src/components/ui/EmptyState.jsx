import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'There are currently no items or records available to display.',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-[#e5d1d4] my-4 shadow-xs ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#f4e7ea] border border-[#e5d1d4] flex items-center justify-center mb-4 text-[#800020]">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-[#3d0a0d] tracking-tight">{title}</h3>
      <p className="text-xs text-[#7c5c5f] max-w-sm mt-1 mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
