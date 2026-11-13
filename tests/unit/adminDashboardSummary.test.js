import { afterEach, expect, jest, test } from '@jest/globals';
import { User } from '../../backend/src/models/User.js';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.js';
import { Enquiry } from '../../backend/src/models/Enquiry.js';
import { getDashboardSummary } from '../../backend/src/services/admin.service.js';

afterEach(() => jest.restoreAllMocks());
test('dashboard separates dealer and customer enquiry totals and new leads', async () => {
  for (const model of [User, DealerProfile, Product, Category]) jest.spyOn(model, 'countDocuments').mockResolvedValue(0);
  const rows = [
    { userType: 'dealer', status: 'new' }, { userType: 'dealer', status: 'completed' },
    { userType: 'customer', status: 'new' }, { userType: 'customer', status: 'new' },
    { userType: 'customer', status: 'closed' },
  ];
  jest.spyOn(Enquiry, 'countDocuments').mockImplementation(async filter => rows.filter(row => Object.entries(filter).every(([key, value]) => row[key] === value)).length);
  const summary = await getDashboardSummary();
  expect(summary.enquiries).toMatchObject({ total: 5, new: 3, b2b: { total: 2, new: 1 }, b2c: { total: 3, new: 2 } });
});
