import { z } from 'zod';
import { DealerPricingSettings } from '../models/DealerPricingSettings.js';
export const installerPricingSchema = z.object({ installerPriceIncreasePercent: z.number().finite().min(0).max(10000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'Use at most two decimal places') }).strict();
export const getInstallerPriceIncreasePercent = async () => {
  const settings = await DealerPricingSettings.findById('primary').select('installerPriceIncreasePercent').lean();
  return settings?.installerPriceIncreasePercent || 0;
};
