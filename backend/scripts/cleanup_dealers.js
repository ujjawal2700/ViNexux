import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { DealerProfile } from '../src/models/DealerProfile.js';

const cleanDealers = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('[Cleanup] Connected to MongoDB:', config.mongodbUri);

    // List all current DealerProfiles
    const profiles = await DealerProfile.find().populate('userId', 'email fullName name role');
    console.log(`[Cleanup] Found ${profiles.length} total DealerProfiles in database.`);

    // Keep only the 2 legitimate dealer accounts:
    // 1) dealer@vinexus.com (Vinexus Partner Enterprises)
    // 2) lucky@gmail.com (Lucky Camera Shop / Lucky Gurjar)
    const keepEmails = ['dealer@vinexus.com', 'lucky@gmail.com'];

    const profilesToDelete = profiles.filter((p) => !p.userId?.email || !keepEmails.includes(p.userId.email.toLowerCase()));

    console.log(`[Cleanup] Deleting ${profilesToDelete.length} auto-generated/dummy dealer profiles...`);
    for (const p of profilesToDelete) {
      await DealerProfile.findByIdAndDelete(p._id);
      console.log(`- Deleted DealerProfile: ${p._id} ("${p.companyName}")`);

      if (p.userId) {
        if (p.userId.email?.endsWith('@example.com') || p.userId.email?.includes('dealer_')) {
          await User.findByIdAndDelete(p.userId._id);
          console.log(`  Deleted dummy test user: ${p.userId.email}`);
        } else {
          await User.findByIdAndUpdate(p.userId._id, { role: 'customer', dealerProfileId: null });
          console.log(`  Reverted user role to customer: ${p.userId.email}`);
        }
      }
    }

    // Double check if lucky@gmail.com user exists and has a DealerProfile
    let luckyUser = await User.findOne({ email: 'lucky@gmail.com' });
    if (luckyUser) {
      luckyUser.role = 'dealer';
      let luckyProfile = await DealerProfile.findOne({ userId: luckyUser._id });
      if (!luckyProfile) {
        luckyProfile = await DealerProfile.create({
          userId: luckyUser._id,
          companyName: 'Lucky Camera Shop',
          status: 'pending',
        });
        console.log(`[Cleanup] Created missing DealerProfile for lucky@gmail.com`);
      }
      luckyUser.dealerProfileId = luckyProfile._id;
      await luckyUser.save();
    }

    const remaining = await DealerProfile.find().populate('userId', 'email fullName name role');
    console.log(`\n[Cleanup Complete] Exactly ${remaining.length} DealerProfiles remaining:`);
    remaining.forEach((p, idx) => {
      console.log(`${idx + 1}. ID: ${p._id} | Company: "${p.companyName}" | Applicant: "${p.userId?.fullName || p.userId?.name}" | Email: <${p.userId?.email}> | Status: ${p.status}`);
    });

  } catch (err) {
    console.error('[Cleanup Error]:', err);
  } finally {
    await mongoose.disconnect();
    console.log('[Cleanup] MongoDB disconnected.');
  }
};

cleanDealers();
