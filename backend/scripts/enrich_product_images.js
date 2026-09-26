import mongoose from 'mongoose';

const laptopGallery = [
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
];

const cctvGallery = [
  'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
];

const networkGallery = [
  'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
];

const storageGallery = [
  'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80',
];

async function enrichImages() {
  await mongoose.connect('mongodb://localhost:27017/vinexus');
  const collection = mongoose.connection.db.collection('products');
  const products = await collection.find({}).toArray();

  let updatedCount = 0;
  for (const prod of products) {
    if (!prod.images || prod.images.length <= 1) {
      const existing = (prod.images && prod.images.length > 0) ? prod.images[0].url : 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800';
      const name = (prod.name || '').toLowerCase();
      let extra = [];

      if (name.includes('laptop') || name.includes('notebook') || name.includes('vivobook') || name.includes('thinkpad') || name.includes('aspire') || name.includes('legion')) {
        extra = [
          { url: laptopGallery[0], altText: prod.name + ' Keyboard & Screen View', sortOrder: 1 },
          { url: laptopGallery[1], altText: prod.name + ' Feature Infographic & Specs', sortOrder: 2 },
        ];
      } else if (name.includes('camera') || name.includes('cctv') || name.includes('dome') || name.includes('bullet') || name.includes('dvr') || name.includes('nvr')) {
        extra = [
          { url: cctvGallery[0], altText: prod.name + ' Perspective View', sortOrder: 1 },
          { url: cctvGallery[1], altText: prod.name + ' Connectors & Ports', sortOrder: 2 },
        ];
      } else if (name.includes('switch') || name.includes('router') || name.includes('poe') || name.includes('rack') || name.includes('network')) {
        extra = [
          { url: networkGallery[0], altText: prod.name + ' Rear Ports', sortOrder: 1 },
          { url: networkGallery[1], altText: prod.name + ' Mount Perspective', sortOrder: 2 },
        ];
      } else {
        extra = [
          { url: storageGallery[0], altText: prod.name + ' Hardware View', sortOrder: 1 },
          { url: storageGallery[1], altText: prod.name + ' Specification Sheet', sortOrder: 2 },
        ];
      }

      const newImages = [
        { url: existing, altText: prod.name, sortOrder: 0 },
        ...extra,
      ];

      await collection.updateOne({ _id: prod._id }, { $set: { images: newImages } });
      updatedCount++;
    }
  }

  console.log(`Successfully enriched ${updatedCount} products with multi-image galleries!`);
  await mongoose.disconnect();
}

enrichImages().catch((err) => {
  console.error('Error enriching product images:', err);
  process.exit(1);
});
