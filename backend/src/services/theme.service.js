import SeasonalTheme from '../models/SeasonalTheme.js';
import WebsiteSettings from '../models/WebsiteSettings.js';
import { resolveTheme } from '../../../shared/seasonalThemes.js';
export async function getActiveTheme() {
  const [campaigns, settings] = await Promise.all([SeasonalTheme.find({ archived: false, published: { $exists: true } }).lean(), WebsiteSettings.findOne({ singletonKey: 'primary' }).lean()]);
  return resolveTheme(campaigns.map(c => ({ ...c, schedule: c.publishedSchedule })), settings?.activeThemeId);
}
