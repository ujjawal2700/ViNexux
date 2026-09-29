import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStorageChoices, saveStorageChoices } from '../../utils/storageConsent';

const StorageConsentBanner = () => {
  const [visible, setVisible] = useState(() => !getStorageChoices());

  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener('open-storage-choices', open);
    return () => window.removeEventListener('open-storage-choices', open);
  }, []);

  const choose = (preferences) => {
    saveStorageChoices(preferences);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      <section
        role="dialog"
        aria-label="Cookie and browser storage choices"
        className="pointer-events-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 text-sm text-gray-800 shadow-[0_20px_60px_rgba(0,0,0,0.22)] animate-in fade-in zoom-in-95 duration-200"
      >
        <h2 className="mb-2 text-base font-bold text-[#800020]">Your storage choices</h2>
        <p className="text-xs sm:text-sm leading-relaxed text-gray-600">
          Vinexus uses essential browser storage for sign-in, security and your cart. With your permission,
          we also save your wishlist and recently viewed products on this device. We do not currently use
          advertising or analytics cookies. Read our{' '}
          <Link to="/privacy" className="font-semibold text-[#800020] underline hover:text-[#650019]">
            Privacy Policy
          </Link>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => choose(false)}
            className="rounded-lg border border-[#800020] px-4 py-2 text-xs sm:text-sm font-semibold text-[#800020] hover:bg-rose-50 transition-colors cursor-pointer"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="rounded-lg bg-[#800020] hover:bg-[#650019] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            Allow saved preferences
          </button>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          You can change this choice anytime using “Storage choices” in the footer.
        </p>
      </section>
    </div>
  );
};

export default StorageConsentBanner;
