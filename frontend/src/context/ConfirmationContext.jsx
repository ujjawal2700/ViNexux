import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export const ConfirmationContext = createContext(null);
export function ConfirmationProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const pending = useRef(null);
  const { pathname } = useLocation();
  const settle = useCallback(answer => {
    const resolve = pending.current;
    pending.current = null; setDialog(null); resolve?.(answer);
  }, []);
  const askConfirmation = useCallback(options => {
    if (pending.current) return Promise.resolve(false);
    return new Promise(resolve => {
      pending.current = resolve;
      setDialog(typeof options === 'string' ? { message: options } : options);
    });
  }, []);
  useEffect(() => { settle(false); }, [pathname, settle]);
  useEffect(() => () => { pending.current?.(false); pending.current = null; }, []);
  return <ConfirmationContext.Provider value={askConfirmation}>
    {children}
    <ConfirmDialog {...dialog} isOpen={!!dialog} onClose={() => settle(false)} onConfirm={() => settle(true)} />
  </ConfirmationContext.Provider>;
}
