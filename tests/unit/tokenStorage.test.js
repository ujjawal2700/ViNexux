import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  clearLastCustomerPhone,
  clearStoredRefreshToken,
  getLastCustomerPhone,
  getStoredCustomerSessionExpiry,
  setLastCustomerPhone,
  setStoredCustomerSessionExpiry,
  setStoredRefreshToken,
} from '../../frontend/src/utils/tokenStorage.js';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

describe('customer authentication browser storage', () => {
  beforeEach(() => values.clear());

  test('remembers and clears the previous customer number', () => {
    setLastCustomerPhone('9876543210');
    expect(getLastCustomerPhone()).toBe('9876543210');
    clearLastCustomerPhone();
    expect(getLastCustomerPhone()).toBe('');
  });

  test('customer logout clears session credentials but preserves the login suggestion', () => {
    setStoredRefreshToken('refresh-token', 'customer');
    setStoredCustomerSessionExpiry('2026-10-05T00:00:00.000Z');
    setLastCustomerPhone('9876543210');
    clearStoredRefreshToken('customer');
    expect(getStoredCustomerSessionExpiry()).toBeNull();
    expect(getLastCustomerPhone()).toBe('9876543210');
  });
});
