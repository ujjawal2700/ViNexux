import WebsiteSettings from '../models/WebsiteSettings.js';

// Admin routes retain their own authentication and permission checks. Login and
// recovery remain available so the owner can always turn maintenance off.
export const maintenanceGuard = async (req, res, next) => {
  const path = req.path;
  if (path === '/share-page' || path.startsWith('/seo/') || path === '/health' || path === '/content/website-settings' ||
      /^\/admin(?:\/|$)/.test(path) || /^\/upload(?:\/|$)/.test(path) ||
      /^\/auth\/(send-otp|verify-otp|verify-reset-otp|reset-password|force-login|refresh-token|logout|me)$/.test(path)) return next();
  try {
    const settings = await WebsiteSettings.findOne({ singletonKey: 'primary' }).select('maintenanceEnabled maintenanceMessage').lean();
    if (!settings?.maintenanceEnabled) return next();
    res.set('Cache-Control', 'no-store');
    res.set('Retry-After', '60');
    return res.status(503).json({ success: false,
      message: settings.maintenanceMessage || 'Our website is under maintenance. Please check back soon.',
      error: { code: 'MAINTENANCE_MODE' } });
  } catch (error) { next(error); }
};
