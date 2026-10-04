import { describe, expect, test } from '@jest/globals';
import {
  discoverFrontendRoutes,
  frontendRouteCases,
  materializeFrontendPath,
} from '../helpers/frontendRouteInventory.js';

describe('website section coverage manifest', () => {
  test('includes every route declared by the application', () => {
    const declared = discoverFrontendRoutes();
    const covered = frontendRouteCases().map(({ pattern }) => pattern);
    expect(covered.sort()).toEqual(declared.sort());
    expect(declared.length).toBeGreaterThanOrEqual(60);
  });

  test('contains storefront, customer, admin, auth, and compatibility sections', () => {
    expect(new Set(frontendRouteCases().map(({ section }) => section))).toEqual(new Set([
      'storefront',
      'customer-auth',
      'account',
      'admin-auth',
      'admin',
      'legacy-redirect',
    ]));
  });

  test.each(frontendRouteCases().map(({ pattern }) => [pattern]))('%s has a concrete browser URL', (pattern) => {
    const concretePath = materializeFrontendPath(pattern);
    expect(concretePath).toMatch(/^\//);
    expect(concretePath).not.toContain(':');
    expect(concretePath).not.toBe('*');
  });
});
