import React, { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function ProductImageViewer({ product, onClose, initialIndex = 0 }) {
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, Math.min(initialIndex, (product.images || []).filter(image => image.url).length - 1)));
  const opener = useRef(document.activeElement);
  const images = (product.images || []).filter(image => image.url);
  const name = product.name || 'Untitled product';
  const navigate = direction => setSelectedIndex(index => (index + direction + images.length) % images.length);
  if (!images.length) return null;

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/95" />
        <Dialog.Content aria-describedby={undefined}
          onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}
          className="fixed inset-0 z-[101] flex items-center justify-center p-4 text-white outline-none sm:p-8"
          onClick={event => { if (event.target === event.currentTarget) onClose(); }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              navigate(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}>
          <div className="absolute left-4 right-20 top-4 space-y-1">
            <Dialog.Title className="truncate text-sm font-semibold">Product images: {name}</Dialog.Title>
            <p className="text-xs text-white/70" aria-live="polite">{selectedIndex + 1} / {images.length}</p>
          </div>
          <Dialog.Close asChild>
            <button type="button" aria-label="Close image viewer" className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white">
              <X className="h-6 w-6" />
            </button>
          </Dialog.Close>
          {images.length > 1 && <button type="button" aria-label="Previous image" onClick={() => navigate(-1)} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"><ChevronLeft className="h-7 w-7" /></button>}
          <img src={images[selectedIndex].url} alt={images[selectedIndex].altText || name} className="max-h-[calc(100dvh-180px)] max-w-[92vw] select-none object-contain" />
          {images.length > 1 && <button type="button" aria-label="Next image" onClick={() => navigate(1)} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"><ChevronRight className="h-7 w-7" /></button>}
          {images.length > 1 && <div className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/40 p-2">
            {images.map((image, index) => <button key={image.publicId || image.url || index} type="button" aria-label={`Show image ${index + 1}`} aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)} className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 bg-white focus-visible:outline-2 focus-visible:outline-white ${selectedIndex === index ? 'border-white' : 'border-white/30 opacity-70'}`}><img src={image.url} alt="" className="h-full w-full object-contain" /></button>)}
          </div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
