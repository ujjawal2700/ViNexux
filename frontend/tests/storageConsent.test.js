import assert from 'node:assert/strict';
import { allowsPreferences, getStorageChoices, saveStorageChoices } from '../src/utils/storageConsent.js';
import wishlistService from '../src/services/wishlistService.js';

const values = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
  dispatchEvent: () => {},
};
globalThis.localStorage = globalThis.window.localStorage;
globalThis.Event = class Event { constructor(type) { this.type = type; } };

assert.equal(getStorageChoices(), null);
assert.equal(allowsPreferences(), false);
assert.equal(wishlistService.toggleWishlist({ _id: 'example' }), null);
assert.equal(values.has('vinexus_wishlist'), false);
saveStorageChoices(true);
assert.equal(allowsPreferences(), true);
assert.equal(wishlistService.toggleWishlist({ _id: 'example' }), true);
assert.equal(wishlistService.getWishlist().length, 1);
values.set('vinexus_recently_viewed', 'saved');
saveStorageChoices(false);
assert.equal(allowsPreferences(), false);
assert.equal(values.has('vinexus_wishlist'), false);
assert.equal(values.has('vinexus_recently_viewed'), false);
console.log('Optional browser storage choices passed');
