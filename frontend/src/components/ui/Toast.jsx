import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastConfig = {
  success: {
    icon: CheckCircle2,
    style: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    iconStyle: 'text-emerald-600',
  },
  error: {
    icon: AlertCircle,
    style: 'bg-rose-50 border-rose-200 text-rose-900',
    iconStyle: 'text-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    style: 'bg-amber-50 border-amber-200 text-amber-900',
    iconStyle: 'text-amber-600',
  },
  info: {
    icon: Info,
    style: 'bg-[#f4e7ea] border-[#e5d1d4] text-[#3d0a0d]',
    iconStyle: 'text-[#800020]',
  },
};

export const ToastContainer = ({ toasts = [], onDismiss }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type] || toastConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 animate-slideUp ${config.style}`}
            role="alert"
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconStyle}`} />
            <p className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default ToastContainer;
