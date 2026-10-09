import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { DEFAULT_QUICK_SPEC_KEYS, isInventorySpecification } from '../../shared/productSpecifications.js';
import { websiteSettingsSchema } from '../../backend/src/validators/cms.validator.js';
import { WebsiteSettings } from '../../backend/src/models/WebsiteSettings.js';
import { updateWebsiteSettings } from '../../backend/src/services/cms.service.js';

afterEach(() => jest.restoreAllMocks());
describe('public inventory specification filtering', () => {
  test.each(['Stock Quantity', 'STOCK_QUANTITY', 'stockQuantity', 'Stock Qty.', 'Inventory', 'Inventory count', 'Available Stock', 'Quantity', 'Qty', 'Units Left', 'Available Units'])('hides %s', (key) => {
    expect(isInventorySpecification(key)).toBe(true);
  });
  test.each(['Storage', 'Processor', 'RAM', 'Resolution', 'Battery', 'Dimensions', 'Brand'])('retains %s', (key) => {
    expect(isInventorySpecification(key)).toBe(false);
  });
});
describe('shared admin Quick Add shortcuts', () => {
  test('existing settings use defaults while a saved empty list stays empty', () => {
    expect(new WebsiteSettings().quickSpecKeys).toEqual(DEFAULT_QUICK_SPEC_KEYS);
    expect(new WebsiteSettings({ quickSpecKeys: [] }).quickSpecKeys).toEqual([]);
  });
  test('accepts new shortcuts and rejects blank, duplicate or oversized lists', () => {
    const validate = (keys) => websiteSettingsSchema.body.safeParse({ quickSpecKeys: keys });
    expect(validate([' Refresh Rate ']).data.quickSpecKeys).toEqual(['Refresh Rate']);
    expect(validate([]).success).toBe(true);
    for (const keys of [[' '], ['RAM', 'ram'], ['x'.repeat(81)], Array.from({length:101}, (_, i) => `Spec ${i}`)]) {
      expect(validate(keys).success).toBe(false);
    }
  });
  test('persists additions and deletion of the last shortcut without changing other settings', async () => {
    const save = jest.spyOn(WebsiteSettings, 'findOneAndUpdate').mockResolvedValue({ quickSpecKeys: [] });
    for (const keys of [['Refresh Rate'], []]) {
      await updateWebsiteSettings({ quickSpecKeys: keys }, 'admin-id');
      expect(save).toHaveBeenLastCalledWith(
        { singletonKey: 'primary' },
        { quickSpecKeys: keys, singletonKey: 'primary', updatedBy: 'admin-id' },
        expect.objectContaining({ upsert: true, runValidators: true })
      );
    }
  });
});
