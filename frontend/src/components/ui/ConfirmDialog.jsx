import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  isLoading = false,
}) => {
  const footer = (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={onClose}
        isDisabled={isLoading}
      >
        {cancelText}
      </Button>
      <Button
        variant={isDanger ? 'danger' : 'primary'}
        size="sm"
        onClick={onConfirm}
        isLoading={isLoading}
      >
        {confirmText}
      </Button>
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
          isDanger ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#f4e7ea] text-[#800020] border border-[#e5d1d4]'
        }`}>
          {isDanger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-bold text-[#3d0a0d] text-sm">{title}</h4>
          <p className="text-xs text-[#7c5c5f] mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
