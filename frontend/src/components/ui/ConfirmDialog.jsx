import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  // Both naming conventions are supported: every call site in the app uses
  // `message`/`variant="danger"`, but keep `description`/`isDanger` too.
  description,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger,
  variant,
  isLoading = false,
}) => {
  const resolvedDescription = message ?? description ?? 'This action cannot be undone.';
  const resolvedIsDanger = isDanger ?? variant === 'danger';

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isLoading}
        className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5 ${
          resolvedIsDanger
            ? 'bg-rose-600 hover:bg-rose-700'
            : 'bg-[#800020] hover:bg-[#9a1b32]'
        }`}
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={footer}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl shrink-0 ${
          resolvedIsDanger ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-rose-50 text-[#800020] border border-rose-200'
        }`}>
          {resolvedIsDanger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div className="text-left">
          <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{resolvedDescription}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
