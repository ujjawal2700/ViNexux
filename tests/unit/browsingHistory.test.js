import { afterEach, beforeEach, expect, test } from '@jest/globals';
import { clearBrowsingHistory, getRecentViews, rememberView, getRecentSearches, rememberSearch } from '../../frontend/src/utils/browsingHistory.js';
import { findHeaderCategory, orderedProductSpecifications } from '../../frontend/src/utils/productBrowsing.js';
import { saveStorageChoices } from '../../frontend/src/utils/storageConsent.js';
let values;
const id = value => value.toString(16).padStart(24, '0');
beforeEach(() => {
  values = new Map([['vinexus_storage_choices_v1', JSON.stringify({ preferences: true })]]);
  global.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }, dispatchEvent: () => {} };
  global.localStorage = window.localStorage;
  clearBrowsingHistory();
});
afterEach(() => { delete global.window; delete global.localStorage; clearBrowsingHistory(); });
test('view history keeps the ten latest unique IDs and moves repeat visits to the front', () => {
  for (let i = 1; i <= 12; i++) rememberView(id(i));
  expect(getRecentViews()).toEqual(Array.from({ length: 10 }, (_, i) => id(12 - i)));
  rememberView(id(5));
  expect(getRecentViews()[0]).toBe(id(5)); expect(getRecentViews()).toHaveLength(10);
  expect(JSON.parse(values.get('vinexus_recently_viewed')).every(value => typeof value === 'string')).toBe(true);
});
test('migrates old product snapshots to IDs and tolerates invalid stored data', () => {
  values.set('vinexus_recently_viewed', JSON.stringify([{ _id: id(1), dealerPrice: 5 }, null, id(2), id(1), 'bad']));
  expect(getRecentViews()).toEqual([id(1), id(2)]);
  values.set('vinexus_recently_viewed', '{broken'); expect(getRecentViews()).toEqual([]);
});
test('search history is limited to six case-insensitive distinct queries', () => {
  for (const text of ['Camera', 'NVR', 'Switch', 'Router', 'SSD', 'RAM', 'WiFi']) rememberSearch(text);
  expect(getRecentSearches()).toEqual(['WiFi', 'RAM', 'SSD', 'Router', 'Switch', 'NVR']);
  rememberSearch('  wifi  '); expect(getRecentSearches()).toEqual(['wifi', 'RAM', 'SSD', 'Router', 'Switch', 'NVR']);
});
test('without preferences, history stays in memory and revoking consent clears persistent history', () => {
  values.set('vinexus_storage_choices_v1', JSON.stringify({ preferences: false }));
  rememberView(id(1)); rememberSearch('Camera');
  expect(getRecentViews()).toEqual([id(1)]); expect(getRecentSearches()).toEqual(['Camera']);
  expect(values.has('vinexus_recent_searches')).toBe(false);
  values.set('vinexus_recently_viewed', 'old'); values.set('vinexus_recent_searches', 'old');
  saveStorageChoices(false);
  expect(values.has('vinexus_recent_searches')).toBe(false); expect(values.has('vinexus_recently_viewed')).toBe(false);
});
test('related products resolve the common header through multiple descendant levels and secondary links', () => {
  const categories = [{ _id: 'root', name: 'IP Cameras', parentId: null }, { _id: 'wifi', parentId: 'root' }, { _id: 'dome', parentId: 'wifi' }];
  expect(findHeaderCategory({ categoryId: 'dome' }, categories)._id).toBe('root');
  expect(findHeaderCategory({ categoryId: 'missing', categoryIds: ['wifi'] }, categories)._id).toBe('root');
  expect(findHeaderCategory({ categoryId: 'a' }, [{ _id: 'a', parentId: 'b' }, { _id: 'b', parentId: 'a' }])).toBeNull();
});
test('storefront specifications retain the saved technical and brand order while excluding inventory', () => {
  const specs = [{ key: 'Resolution', value: '4 MP' }, { key: 'Brand', value: 'Old name' }, { key: 'Power', value: 'PoE' }, { key: 'Stock', value: '18' }];
  expect(orderedProductSpecifications({ specifications: specs }, 'Managed Brand')).toEqual([
    { key: 'Resolution', value: '4 MP' }, { key: 'Brand', value: 'Managed Brand' }, { key: 'Power', value: 'PoE' },
  ]);
});
