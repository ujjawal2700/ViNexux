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
    <section
      role="dialog"
      aria-label="Cookie and browser storage choices"
      aria-modal="false"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <h2 className="mb-1 text-base font-bold text-[#800020]">Your storage choices</h2>
      <p className="leading-6">
        Vinexus uses essential browser storage for sign-in, security and your cart. With your permission,
        we also save your wishlist and recently viewed products on this device. We do not currently use
        advertising or analytics cookies. Read our <Link to="/privacy" className="font-semibold text-[#800020] underline">Privacy Policy</Link>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose(false)} className="rounded-md border border-[#800020] px-4 py-2 font-semibold text-[#800020] hover:bg-rose-50">
          Essential only
        </button>
        <button type="button" onClick={() => choose(true)} className="rounded-md bg-[#800020] px-4 py-2 font-semibold text-white hover:bg-[#650019]">
          Allow saved preferences
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">You can change this choice anytime using “Storage choices” in the footer.</p>
    </section>
  );
};

export default StorageConsentBanner;
