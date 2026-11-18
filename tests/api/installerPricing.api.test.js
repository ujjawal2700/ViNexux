import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import { DealerPricingSettings } from '../../backend/src/models/DealerPricingSettings.js';
import { mountInstallerPricingRoutes } from '../../backend/src/routes/installerPricing.routes.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
let request, stored;
const actor = '507f1f77bcf86cd799439011';
beforeEach(() => {
  stored = null;
  jest.spyOn(DealerPricingSettings, 'findById').mockReturnValue({ select() { return this; }, lean: async () => stored });
  jest.spyOn(DealerPricingSettings, 'findByIdAndUpdate').mockImplementation(async (id, update) => { stored = update.$set; return stored; });
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { const role = req.headers['x-role']; if (!role) return res.sendStatus(401); req.user = { _id: actor, role: role === 'employee' ? 'admin' : role, isEmployee: role === 'employee' }; next(); });
  const router = express.Router(); mountInstallerPricingRoutes(router); app.use('/dealer-accounts', router); app.use(errorHandler); request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());
const path = '/dealer-accounts/installer-pricing';
test('super admin configures one persistent percentage, with zero default for existing installers', async () => {
  expect((await request.get(path).set('x-role', 'admin')).body.data.installerPriceIncreasePercent).toBe(0);
  const result = await request.put(path).set('x-role', 'admin').send({ installerPriceIncreasePercent: 10 });
  expect(result.status).toBe(200); expect(result.body.data.installerPriceIncreasePercent).toBe(10);
  expect(stored.updatedBy).toBe(actor);
  expect(DealerPricingSettings.findByIdAndUpdate).toHaveBeenCalledWith('primary', expect.anything(), expect.objectContaining({ upsert: true, runValidators: true }));
  expect((await request.get(path).set('x-role', 'admin')).body.data.installerPriceIncreasePercent).toBe(10);
});
test('employees, dealers and customers cannot read or change the global installer rate', async () => {
  expect((await request.put(path).send({ installerPriceIncreasePercent: 10 })).status).toBe(401);
  for (const role of ['employee', 'dealer', 'customer']) {
    expect((await request.get(path).set('x-role', role)).status).toBe(403);
    expect((await request.put(path).set('x-role', role).send({ installerPriceIncreasePercent: 10 })).status).toBe(403);
  }
  expect(DealerPricingSettings.findByIdAndUpdate).not.toHaveBeenCalled();
});
test('rejects negative and malformed markup requests without changing the stored setting', async () => {
  for (const body of [{ installerPriceIncreasePercent: -10 }, { installerPriceIncreasePercent: '10' }, { installerPriceIncreasePercent: 0, updatedBy: actor }, { installerPriceIncreasePercent: 1.234 }]) expect((await request.put(path).set('x-role', 'admin').send(body)).status).toBe(400);
  expect(DealerPricingSettings.findByIdAndUpdate).not.toHaveBeenCalled();
});
