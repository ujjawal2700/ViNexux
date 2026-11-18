import { DealerPricingSettings } from '../models/DealerPricingSettings.js';
import { superAdminAccountsOnly } from '../services/adminAccount.service.js';
import { getInstallerPriceIncreasePercent, installerPricingSchema } from '../services/installerPricing.service.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
export function mountInstallerPricingRoutes(router) {
  router.get('/installer-pricing', superAdminAccountsOnly, asyncHandler(async (req, res) => ApiResponse.success(res, 'Installer pricing', { installerPriceIncreasePercent: await getInstallerPriceIncreasePercent() })));
  router.put('/installer-pricing', superAdminAccountsOnly, validate({ body: installerPricingSchema }), asyncHandler(async (req, res) => {
    const settings = await DealerPricingSettings.findByIdAndUpdate('primary', { $set: { ...req.body, updatedBy: req.user._id } }, { upsert: true, new: true, runValidators: true });
    ApiResponse.success(res, 'Installer pricing saved', { installerPriceIncreasePercent: settings.installerPriceIncreasePercent });
  }));
}
