import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStorageChoices, saveStorageChoices } from '../../utils/storageConsent';
import { ShieldCheck } from 'lucide-react';

const StorageConsentBanner = () => {
  const [visible, setVisible] = useState(() => !getStorageChoices());
  const navigate = useNavigate();

  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener('open-storage-choices', open);
    return () => window.removeEventListener('open-storage-choices', open);
  }, []);

  // Lock website scrolling when modal is open
  useEffect(() => {
    if (visible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [visible]);

  const choose = (preferences) => {
    saveStorageChoices(preferences);
    setVisible(false);
  };

  const handlePrivacyPolicyClick = (e) => {
    e.preventDefault();
    document.body.style.overflow = '';
    setVisible(false);
    navigate('/privacy');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
    >
      <section
        role="dialog"
        aria-label="Cookie and browser storage choices"
        className="relative w-full max-w-lg -translate-y-4 sm:-translate-y-10 rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 text-sm text-gray-800 shadow-[0_25px_70px_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-full bg-[#800020]/10 flex items-center justify-center text-[#800020] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-[#800020] tracking-tight">Your storage choices</h2>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-gray-600">
          Vinexus uses essential browser storage for sign-in, security and your cart. With your permission,
          we also save your wishlist and recently viewed products on this device. We do not currently use
          advertising or analytics cookies. Read our{' '}
          <Link
            to="/privacy"
            onClick={handlePrivacyPolicyClick}
            className="font-semibold text-[#800020] underline hover:text-[#650019] cursor-pointer"
          >
            Privacy Policy
          </Link>.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => choose(false)}
            className="flex-1 sm:flex-initial rounded-lg border border-[#800020] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#800020] hover:bg-rose-50 transition-colors cursor-pointer text-center"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="flex-1 sm:flex-initial rounded-lg bg-[#800020] hover:bg-[#650019] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer text-center"
          >
            Allow saved preferences
          </button>
        </div>
        <p className="mt-3.5 text-[11px] text-gray-400">
          You can change this choice anytime using “Storage choices” in the footer.
        </p>
      </section>
    </div>
  );
};

export default StorageConsentBanner;
