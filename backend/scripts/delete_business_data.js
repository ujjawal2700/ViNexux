import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { Banner } from '../src/models/Banner.js';
import { Brand } from '../src/models/Brand.js';
import { Cart } from '../src/models/Cart.js';
import { Category } from '../src/models/Category.js';
import { CmsPage } from '../src/models/CmsPage.js';
import { DealerPricing } from '../src/models/DealerPricing.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { FooterContent } from '../src/models/FooterContent.js';
import { Product } from '../src/models/Product.js';
import { PromotionalBanner } from '../src/models/PromotionalBanner.js';
import { TrustBadge } from '../src/models/TrustBadge.js';
import { WebsiteSettings } from '../src/models/WebsiteSettings.js';

const CONFIRMATION = 'DELETE_ALL_BUSINESS_DATA';

// Delete product-dependent collections first, then the catalog and CMS data.
// User, DealerProfile, Session, and OtpVerification are deliberately absent.
const collectionsToClear = [
  ['carts', Cart],
  ['dealer pricing', DealerPricing],
  ['enquiries', Enquiry],
  ['products', Product],
  ['brands', Brand],
  ['categories', Category],
  ['banners', Banner],
  ['promotional banners', PromotionalBanner],
  ['CMS pages', CmsPage],
  ['trust badges', TrustBadge],
  ['footer content', FooterContent],
  ['website settings', WebsiteSettings],
];

const getSafeDatabaseLabel = () => {
  const connection = mongoose.connection;
  return `${connection.host}/${connection.name}`;
};

const getCounts = async () => {
  return Promise.all(
    collectionsToClear.map(async ([label, Model]) => ({
      label,
      Model,
      count: await Model.countDocuments({}),
    }))
  );
};

const printCounts = (heading, entries) => {
  console.log(`\n${heading}`);
  for (const { label, count } of entries) {
    console.log(`- ${label}: ${count}`);
  }
};

const deleteBusinessData = async () => {
  const suppliedConfirmation = process.argv.find((arg) => arg.startsWith('--confirm='))?.split('=')[1];
  const shouldDelete = suppliedConfirmation === CONFIRMATION;

  try {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[Cleanup] Connected to MongoDB: ${getSafeDatabaseLabel()}`);

    const before = await getCounts();
    printCounts('[Cleanup] Records found:', before);

    console.log('\n[Cleanup] Preserving:');
    console.log('- users (including their saved addresses and push tokens)');
    console.log('- dealer profiles');
    console.log('- login sessions');
    console.log('- OTP verification records');

    if (!shouldDelete) {
      console.log('\n[Cleanup] Dry run only; nothing was deleted.');
      console.log(`[Cleanup] To permanently delete the listed data, rerun with --confirm=${CONFIRMATION}`);
      return;
    }

    console.log('\n[Cleanup] Permanent deletion confirmed.');
    const results = [];

    for (const [label, Model] of collectionsToClear) {
      const result = await Model.deleteMany({});
      results.push({ label, count: result.deletedCount });
      console.log(`[Cleanup] Deleted ${result.deletedCount} ${label}.`);
    }

    printCounts('[Cleanup] Deletion complete:', results);
    console.log(
      '\n[Cleanup] Reports are computed from live records, so product/category/enquiry report data is now empty.'
    );
  } catch (error) {
    console.error('[Cleanup] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Cleanup] MongoDB disconnected.');
  }
};

deleteBusinessData();
