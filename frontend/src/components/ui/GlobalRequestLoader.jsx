import React, { useEffect, useRef, useState } from 'react';
import { loadingTracker } from '../../utils/loadingTracker';

export const LoadingPill = ({ message = 'Updating results...', className = '' }) => (
  <div
    role="status"
    aria-live="polite"
    className={`inline-flex items-center gap-3 rounded-full border border-[#800020]/10 bg-white px-5 py-3 text-xs font-bold text-[#5c1640] shadow-xl ${className}`}
  >
    <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#800020]/20 border-t-[#800020]" aria-hidden="true" />
    <span>{message}</span>
  </div>
);

export const ContentLoadingOverlay = ({ message = 'Updating results...', className = '' }) => (
  <div className={`absolute inset-0 z-30 flex items-center justify-center bg-white/65 backdrop-blur-[1px] ${className}`}>
    <LoadingPill message={message} />
  </div>
);

const GlobalRequestLoader = () => {
  const [snapshot, setSnapshot] = useState({ active: false, message: 'Loading content...' });
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => loadingTracker.subscribe(setSnapshot), []);

  useEffect(() => {
    let timer;
    if (snapshot.active && !visible) {
      timer = window.setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, 350);
    } else if (!snapshot.active && visible) {
      const remaining = Math.max(0, 300 - (Date.now() - shownAt.current));
      timer = window.setTimeout(() => setVisible(false), remaining);
    }
    return () => window.clearTimeout(timer);
  }, [snapshot.active, visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/55 backdrop-blur-[1.5px]" aria-busy="true">
      <LoadingPill message={snapshot.message} />
    </div>
  );
};

export default GlobalRequestLoader;
