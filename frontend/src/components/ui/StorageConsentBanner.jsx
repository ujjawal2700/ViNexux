import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStorageChoices, saveStorageChoices } from '../../utils/storageConsent';
import { Cookie, ShieldCheck, Sparkles, Lock } from 'lucide-react';

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
    <aside
      aria-label="Cookie and browser storage choices"
      className="fixed bottom-0 left-0 right-0 w-full h-[30vh] min-h-[220px] max-h-[35vh] z-[999] bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col justify-between animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#800020]/10 flex items-center justify-center text-[#800020] shrink-0">
                <Cookie className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#800020] tracking-tight">
                Cookie &amp; Browser Storage Choices
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Privacy-First
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-4xl">
              Vinexus uses essential browser storage to power shopping cart persistence, authentication, and secure checkout. With your consent, we also save your wishlist and recently viewed products on this device. We do not sell your personal data or use third-party advertising cookies. Read our{' '}
              <Link
                to="/privacy"
                className="font-semibold text-[#800020] underline hover:text-[#650019]"
              >
                Privacy Policy
              </Link>.
            </p>

            {/* Detailed categories */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-1">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="p-1 rounded bg-gray-200/80 text-gray-700 shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <span>Strictly Necessary</span>
                    <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-medium">Always Active</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">
                    Session authentication, CSRF tokens, and active cart persistence.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="p-1 rounded bg-[#800020]/10 text-[#800020] shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <span>Personalization</span>
                    <span className="text-[10px] bg-rose-50 text-[#800020] border border-rose-200 px-1.5 py-0.2 rounded font-medium">Optional</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">
                    Wishlist items and recently browsed products across visits.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="p-1 rounded bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <span>Transparency</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">No Ads</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">
                    Zero third-party trackers or cross-site advertising networks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center min-w-[200px] lg:self-center pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => choose(true)}
              className="w-full rounded-lg bg-[#800020] hover:bg-[#650019] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer text-center"
            >
              Allow saved preferences
            </button>
            <button
              type="button"
              onClick={() => choose(false)}
              className="w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 px-5 py-2 text-xs sm:text-sm font-semibold text-gray-700 transition-colors cursor-pointer text-center"
            >
              Essential only
            </button>
            <p className="text-[10px] text-gray-400 text-center lg:text-left">
              Update anytime via "Storage choices" in footer.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default StorageConsentBanner;
