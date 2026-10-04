import { beforeAll, describe, expect, test } from '@jest/globals';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import supertest from 'supertest';
import { discoverApiRoutes, materializeApiPath } from '../helpers/apiRouteInventory.js';

mongoose.set('bufferCommands', false);

let app;
const routes = discoverApiRoutes();

beforeAll(async () => {
  ({ default: app } = await import('../../backend/src/app.js'));
});

describe('API route inventory', () => {
  test('discovers the complete API surface without duplicates', () => {
    const keys = routes.map((route) => `${route.method} ${route.path}`);
    expect(routes.length).toBeGreaterThanOrEqual(90);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test.each(routes.map((route) => [route.method, route.path, route.source]))(
    '%s %s is mounted (%s)',
    async (method, routePath) => {
      const client = supertest(app);
      const request = client[method.toLowerCase()](materializeApiPath(routePath));
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) request.send({});
      const response = await request;
      const message = response.body?.message || '';
      const isCentralRouterMiss = response.status === 404 && /^Route .* not found$/i.test(message);
      expect(isCentralRouterMiss).toBe(false);
    }
  );
});
