const BANNER_SIZES = [
  { section: '1 · Large left', size: '1400 × 820 px', shape: 'Landscape · about 1.7:1' },
  { section: '2 · Upper middle', size: '700 × 410 px', shape: 'Landscape · about 1.7:1' },
  { section: '3 · Lower middle', size: '700 × 410 px', shape: 'Landscape · about 1.7:1' },
  { section: '4 · Tall right', size: '700 × 820 px', shape: 'Portrait · about 0.85:1' },
];

export default function BannerSizeGuide() {
  return <section aria-label="Banner image size guide" className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
    <div>
      <h3 className="text-sm font-bold text-gray-900">Banner Image Size Guide</h3>
      <p className="mt-1 text-xs text-gray-600">Recommended artwork sizes, width × height, for a desktop screen around 1440 px wide. Larger images with the same proportions work too.</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-[180px_1fr] items-start">
      <div aria-label="Desktop banner section positions" className="grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-1 h-24 text-xs font-bold text-primary">
        <div className="row-span-2 rounded-md bg-primary/10 flex items-center justify-center">1</div>
        <div className="col-start-2 row-start-1 rounded-md bg-primary/10 flex items-center justify-center">2</div>
        <div className="col-start-2 row-start-2 rounded-md bg-primary/10 flex items-center justify-center">3</div>
        <div className="col-start-3 row-start-1 row-span-2 rounded-md bg-primary/10 flex items-center justify-center">4</div>
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
    <p className="text-xs text-gray-600"><strong>Mobile & tablet:</strong> all four tiles use a 4:3 shape (for example, 1200 × 900 px). The same uploaded image is used on every device, so desktop artwork may crop differently on smaller screens.</p>
    <p className="text-xs text-gray-600">Keep important text and logos away from the edges. Check desktop, tablet and mobile previews in <strong>Preview / crop & adjust</strong>. Choose <strong>Show entire image</strong> to keep the full artwork visible; empty space may appear around it. Accepted formats: JPG, PNG and WebP.</p>
  </section>;
}
