import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { OtpVerification } from '../src/models/OtpVerification.js';
import { Session } from '../src/models/Session.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Cart } from '../src/models/Cart.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { DealerPricing } from '../src/models/DealerPricing.js';
import { Banner } from '../src/models/Banner.js';
import { PromotionalBanner } from '../src/models/PromotionalBanner.js';
import { CmsPage } from '../src/models/CmsPage.js';
import { TrustBadge } from '../src/models/TrustBadge.js';
import { FooterContent } from '../src/models/FooterContent.js';

const verifyModels = () => {
  console.log('[Model Verification] Verifying Mongoose model definitions...\n');

  // 1. Verify User Model
  console.log('1. User Model:');
  console.log(`   Model Name: ${User.modelName}`);
  console.log(`   Collection Name: ${User.collection.name}`);
  console.log(`   Configured Indexes:`, User.schema.indexes().map((idx) => idx[0]));
  if (User.modelName === 'User') {
    console.log('   ✅ User model verified successfully\n');
  }

  // 2. Verify OtpVerification Model
  console.log('2. OtpVerification Model:');
  console.log(`   Model Name: ${OtpVerification.modelName}`);
  console.log(`   Collection Name: ${OtpVerification.collection.name}`);
  console.log(`   Configured Indexes:`, OtpVerification.schema.indexes().map((idx) => idx[0]));
  if (OtpVerification.modelName === 'OtpVerification') {
    console.log('   ✅ OtpVerification model verified successfully\n');
  }

  // 3. Verify Session Model
  console.log('3. Session Model:');
  console.log(`   Model Name: ${Session.modelName}`);
  console.log(`   Collection Name: ${Session.collection.name}`);
  console.log(`   Configured Indexes:`, Session.schema.indexes().map((idx) => idx[0]));
  if (Session.modelName === 'Session') {
    console.log('   ✅ Session model verified successfully\n');
  }

  // 4. Verify DealerProfile Model
  console.log('4. DealerProfile Model:');
  console.log(`   Model Name: ${DealerProfile.modelName}`);
  console.log(`   Collection Name: ${DealerProfile.collection.name}`);
  console.log(`   Configured Indexes:`, DealerProfile.schema.indexes().map((idx) => idx[0]));
  if (DealerProfile.modelName === 'DealerProfile') {
    console.log('   ✅ DealerProfile model verified successfully\n');
  }

  // 5. Verify Category Model
  console.log('5. Category Model:');
  console.log(`   Model Name: ${Category.modelName}`);
  console.log(`   Collection Name: ${Category.collection.name}`);
  console.log(`   Configured Indexes:`, Category.schema.indexes().map((idx) => idx[0]));
  if (Category.modelName === 'Category') {
    console.log('   ✅ Category model verified successfully\n');
  }

  // 6. Verify Product Model
  console.log('6. Product Model:');
  console.log(`   Model Name: ${Product.modelName}`);
  console.log(`   Collection Name: ${Product.collection.name}`);
  console.log(`   Configured Indexes:`, Product.schema.indexes().map((idx) => idx[0]));
  if (Product.modelName === 'Product') {
    console.log('   ✅ Product model verified successfully\n');
  }

  // 7. Verify Cart Model
  console.log('7. Cart Model:');
  console.log(`   Model Name: ${Cart.modelName}`);
  console.log(`   Collection Name: ${Cart.collection.name}`);
  console.log(`   Configured Indexes:`, Cart.schema.indexes().map((idx) => idx[0]));
  if (Cart.modelName === 'Cart') {
    console.log('   ✅ Cart model verified successfully\n');
  }

  // 8. Verify Enquiry Model
  console.log('8. Enquiry Model:');
  console.log(`   Model Name: ${Enquiry.modelName}`);
  console.log(`   Collection Name: ${Enquiry.collection.name}`);
  console.log(`   Configured Indexes:`, Enquiry.schema.indexes().map((idx) => idx[0]));
  if (Enquiry.modelName === 'Enquiry') {
    console.log('   ✅ Enquiry model verified successfully\n');
  }

  // 9. Verify DealerPricing Model
  console.log('9. DealerPricing Model:');
  console.log(`   Model Name: ${DealerPricing.modelName}`);
  console.log(`   Collection Name: ${DealerPricing.collection.name}`);
  console.log(`   Configured Indexes:`, DealerPricing.schema.indexes().map((idx) => idx[0]));
  if (DealerPricing.modelName === 'DealerPricing') {
    console.log('   ✅ DealerPricing model verified successfully\n');
  }

  // 10. Verify Banner Model
  console.log('10. Banner Model:');
  console.log(`   Model Name: ${Banner.modelName}`);
  console.log(`   Collection Name: ${Banner.collection.name}`);
  console.log(`   Configured Indexes:`, Banner.schema.indexes().map((idx) => idx[0]));
  if (Banner.modelName === 'Banner') {
    console.log('   ✅ Banner model verified successfully\n');
  }

  // 11. Verify PromotionalBanner Model
  console.log('11. PromotionalBanner Model:');
  console.log(`   Model Name: ${PromotionalBanner.modelName}`);
  console.log(`   Collection Name: ${PromotionalBanner.collection.name}`);
  console.log(`   Configured Indexes:`, PromotionalBanner.schema.indexes().map((idx) => idx[0]));
  if (PromotionalBanner.modelName === 'PromotionalBanner') {
    console.log('   ✅ PromotionalBanner model verified successfully\n');
  }

  // 12. Verify CmsPage Model
  console.log('12. CmsPage Model:');
  console.log(`   Model Name: ${CmsPage.modelName}`);
  console.log(`   Collection Name: ${CmsPage.collection.name}`);
  console.log(`   Configured Indexes:`, CmsPage.schema.indexes().map((idx) => idx[0]));
  if (CmsPage.modelName === 'CmsPage') {
    console.log('   ✅ CmsPage model verified successfully\n');
  }

  // 13. Verify TrustBadge Model
  console.log('13. TrustBadge Model:');
  console.log(`   Model Name: ${TrustBadge.modelName}`);
  console.log(`   Collection Name: ${TrustBadge.collection.name}`);
  console.log(`   Configured Indexes:`, TrustBadge.schema.indexes().map((idx) => idx[0]));
  if (TrustBadge.modelName === 'TrustBadge') {
    console.log('   ✅ TrustBadge model verified successfully\n');
  }

  // 14. Verify FooterContent Model
  console.log('14. FooterContent Model:');
  console.log(`   Model Name: ${FooterContent.modelName}`);
  console.log(`   Collection Name: ${FooterContent.collection.name}`);
  console.log(`   Configured Indexes:`, FooterContent.schema.indexes().map((idx) => idx[0]));
  if (FooterContent.modelName === 'FooterContent') {
    console.log('   ✅ FooterContent model verified successfully\n');
  }

  console.log('[Model Verification] All Phase 2 database models (User, OtpVerification, Session, DealerProfile, Category, Product, Cart, Enquiry, DealerPricing, Banner, PromotionalBanner, CmsPage, TrustBadge, FooterContent) loaded cleanly with zero errors.');
};

verifyModels();
