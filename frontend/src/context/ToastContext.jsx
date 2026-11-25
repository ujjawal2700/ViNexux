import React, { createContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ToastContainer from '../components/ui/Toast';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const { key: routeKey } = useLocation();
  const activeRoute = useRef(routeKey);
  activeRoute.current = routeKey;
  useEffect(() => { setToasts(previous => previous.filter(toast => toast.type !== 'error' || toast.routeKey === routeKey)); }, [routeKey]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    if (type === 'error' && activeRoute.current !== routeKey) return null;
    const id = Date.now() + Math.random().toString(36).substring(2, 9);

    setToasts((prev) => {
      // Prevent identical message and type toasts from stacking simultaneously
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      return [...prev, { id, message, type, duration, routeKey }];
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast, routeKey]);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pending_session_toast');
      if (pending) {
        sessionStorage.removeItem('pending_session_toast');
        addToast(pending, 'warning', 6000);
      }
    } catch (e) {}

    let lastHandledTime = 0;
    const handleSessionExpired = (e) => {
      const now = Date.now();
      if (now - lastHandledTime < 5000) return;
      lastHandledTime = now;
      const msg = e.detail?.message || 'Your session has expired. Please login again.';
      addToast(msg, 'warning', 6000);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [addToast]);

  const toast = useMemo(() => ({
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    stock: (msg, duration) => addToast(msg, 'stock', duration),
    remove: removeToast,
  }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts.filter(toast => toast.type !== 'error' || toast.routeKey === routeKey)} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};
