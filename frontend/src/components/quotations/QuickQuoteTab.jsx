import { useState } from 'react';
import { FileText, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function QuickQuoteTab() {
  const { pathname } = useLocation();
  const [showPrompt, setShowPrompt] = useState(true);
  const hidden = /^\/(?:cctv-quote|quick-quotation|account|login|register|checkout)(?:\/|$)/.test(pathname);
  if (hidden) return null;
  return <div data-quotation-float className="fixed right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
    {showPrompt && <aside aria-label="Quick CCTV quotation suggestion" className="relative w-64 max-w-full rounded-2xl border border-[var(--store-border,#eadde0)] bg-[var(--store-surface,white)] p-4 pr-8 text-[var(--store-text,#1f2937)] shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
      <button type="button" aria-label="Dismiss quotation suggestion" onClick={() => setShowPrompt(false)} className="absolute right-1 top-1 rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-primary"><X size={14} /></button>
      <Link to="/cctv-quote" className="block rounded focus-visible:outline-2 focus-visible:outline-primary"><strong className="block text-sm">Planning a CCTV setup?</strong><span className="mt-1 block text-xs leading-relaxed text-slate-600">Choose your cameras and get a quick quotation.</span><span className="mt-2 block text-xs font-semibold text-[var(--store-primary,#800020)]">Build my quote →</span></Link>
    </aside>}
    <Link to="/cctv-quote" aria-label="Get quick CCTV quotation" className="quick-quote-tab relative flex max-w-full items-center gap-2.5 overflow-hidden rounded-full border border-white/20 bg-[var(--store-primary,#800020)] py-2 pl-2 pr-5 text-white shadow-lg shadow-black/20 outline-offset-4 transition-shadow hover:shadow-xl focus-visible:outline-2 focus-visible:outline-primary sm:gap-3 sm:py-2.5 sm:pl-2.5 sm:pr-6">
      <span aria-hidden="true" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"><FileText className="h-5 w-5" strokeWidth={1.75} /></span>
      <span className="relative whitespace-nowrap text-sm font-semibold">Quick CCTV Quote</span>
    </Link>
  </div>;
}
