const BANNER_SIZES = [
  { section: '1 · Horizontal', size: '2700 × 1200 px', shape: 'Landscape · about 9:4 · fills remaining width' },
  { section: '2 · Vertical', size: '900 × 1200 px', shape: 'Portrait · 3:4' },
];

export default function BannerSizeGuide() {
  return <section aria-label="Banner image size guide" className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
    <div>
      <h3 className="text-sm font-bold text-gray-900">Banner Image Size Guide</h3>
      <p className="mt-1 text-xs text-gray-600">Recommended artwork sizes, width × height, for a desktop screen around 1440 px wide. Larger images with the same proportions work too.</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-[180px_1fr] items-start">
      <div aria-label="Desktop banner section positions" className="grid grid-cols-[3fr_1fr] gap-1 text-xs font-bold text-primary">
        <div className="rounded-md bg-primary/10 flex items-center justify-center">1</div>
        <div className="rounded-md bg-primary/10 flex items-center justify-center aspect-[3/4]">2</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-gray-600"><tr>
            <th className="pb-2 pr-3">Section</th><th className="pb-2 pr-3">Recommended desktop image</th><th className="pb-2">Shape</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-200">{BANNER_SIZES.map((item) => <tr key={item.section}>
            <td className="py-2 pr-3 font-medium">{item.section}</td>
            <td className="py-2 pr-3 whitespace-nowrap font-semibold">{item.size}</td>
            <td className="py-2">{item.shape}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    <p className="text-xs text-gray-600"><strong>Mobile & tablet:</strong> the horizontal and vertical banners stay side by side. The same uploaded artwork is used on every device; check text legibility on smaller screens.</p>
    <p className="text-xs text-gray-600">Keep important text and logos away from the edges. Check desktop, tablet and mobile previews in <strong>Preview / crop & adjust</strong>. Choose <strong>Show entire image</strong> to keep the full artwork visible; empty space may appear around it. Images: JPG, PNG, WebP or SVG up to 5 MB. Videos: MP4, WebM or MOV up to 50 MB and 60 seconds. Videos are compressed to muted MP4, with a separate thumbnail for slow connections.</p>
  </section>;
}
