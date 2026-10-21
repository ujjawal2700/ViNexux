import { expect, test } from '@jest/globals';
import { discoverApiRoutes } from '../helpers/apiRouteInventory.js';

test('route inventory traverses nested admin CMS routers without duplicate entries', () => {
  const routes = discoverApiRoutes();
  expect(routes).toEqual(expect.arrayContaining([
    expect.objectContaining({ method: 'POST', path: '/api/admin/cms/themes/:id/assets/:slot', source: 'theme.routes.js' }),
    expect.objectContaining({ method: 'POST', path: '/api/admin/cms/themes/:id/:action', source: 'theme.routes.js' }),
    expect.objectContaining({ method: 'DELETE', path: '/api/admin/cms/banner-grid/:section/images/:id', source: 'bannerGrid.routes.js' }),
  ]));
  expect(new Set(routes.map(route => `${route.method} ${route.path}`)).size).toBe(routes.length);
});
