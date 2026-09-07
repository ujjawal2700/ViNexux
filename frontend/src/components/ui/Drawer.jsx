import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Drawer = ({
  isOpen,
  onClose,
  position = 'right',
  title,
  description,
  children,
  footer,
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = {
    right: 'top-0 right-0 h-full w-full max-w-md border-l',
    left: 'top-0 left-0 h-full w-full max-w-md border-r',
    top: 'top-0 left-0 w-full max-h-[80vh] border-b',
    bottom: 'bottom-0 left-0 w-full max-h-[80vh] border-t',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-[#3d0a0d]/40 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className={`fixed bg-white border-[#e5d1d4] shadow-2xl flex flex-col z-50 ${positionClasses[position] || positionClasses.right} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5d1d4]">
            <div>
              {title && <h3 className="text-base font-bold text-[#3d0a0d]">{title}</h3>}
              {description && <p className="text-xs text-[#7c5c5f] mt-0.5">{description}</p>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#7c5c5f] hover:text-[#3d0a0d] hover:bg-[#f4e7ea] transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm text-[#3d0a0d]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#e5d1d4] bg-[#fdf8f9] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Drawer;
