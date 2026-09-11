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
      <Button
        variant="secondary"
        size="sm"
        onClick={onClose}
        isDisabled={isLoading}
      >
        {cancelText}
      </Button>
      <Button
        variant={resolvedIsDanger ? 'danger' : 'primary'}
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
          resolvedIsDanger ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-muted text-primary border border-border'
        }`}>
          {resolvedIsDanger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-bold text-foreground text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{resolvedDescription}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
