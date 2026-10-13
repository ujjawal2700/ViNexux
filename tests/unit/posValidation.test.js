import { describe, expect, test, jest, afterEach } from '@jest/globals';
import { Product } from '../../backend/src/models/Product.js';
import { stockUpdate } from '../../backend/src/utils/productStockUpdate.js';
import { posService } from '../../backend/src/services/pos.service.js';
import { posCustomerService } from '../../backend/src/services/posCustomer.service.js';
import { posSaleSchema } from '../../backend/src/validators/pos.validator.js';
import { validatePosDraft, posFieldLabel } from '../../shared/posValidation.js';
import { POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';
import { posInput, posAdminId, posProductId } from '../helpers/posFixture.js';

afterEach(() => jest.restoreAllMocks());

describe('Stock removal predicate validation regression', () => {
  test('reproduces the old failure and validates the corrected atomic update', async () => {
    const old = Product.findOneAndUpdate({}, { $inc: { stockQuantity: -1 }, $pull: { specifications: { key: /^\s*(stock|inventory)\s*$/i } } }, { runValidators: true });
    await expect(old.validate(old._castUpdate(old.getUpdate()), old.getOptions(), false)).rejects.toThrow('Specification key is required');
    for (const delta of [-1, 1]) {
      const query = Product.findOneAndUpdate({}, stockUpdate(delta), { runValidators: true });
      await expect(query.validate(query._castUpdate(query.getUpdate()), query.getOptions(), false)).resolves.toBeUndefined();
    }
    const badSpecification = Product.findOneAndUpdate({}, { $set: { specifications: [{ value: 'Missing name' }] } }, { runValidators: true });
    await expect(badSpecification.validate(badSpecification._castUpdate(badSpecification.getUpdate()), badSpecification.getOptions(), false)).rejects.toThrow('Specification key is required');
  });
  test('cleanup still matches inventory labels with mixed case and whitespace', () => {
    const pattern = stockUpdate(-1).$pull.specifications.$or[0].key;
    expect(pattern.test(' STOCK ')).toBe(true); expect(pattern.test('Inventory')).toBe(true); expect(pattern.test('Resolution')).toBe(false);
  });
});

describe('POS section validation before payment', () => {
  test('customer address, PIN, GSTIN, product and serial issues have precise field paths', () => {
    const input = posInput(); input.customer.pincode = '12'; input.customer.address = 'A'; input.customer.gstin = '09CQQPM3652N1Z1';
    input.items[0].hsn = ''; input.items[0].serialNumbers = ['same', 'same'];
    const issues = validatePosDraft(input);
    expect(issues.map(issue => issue.path)).toEqual(expect.arrayContaining(['customer.address', 'customer.pincode', 'customer.gstin', 'items.0.hsn', 'items.0.serialNumbers']));
    expect(posFieldLabel('items.0.hsn', [{ productName: 'Camera', sku: 'CAM-1' }])).toBe('Camera → HSN/SAC');
    expect(posFieldLabel('specifications.0.key')).toBe('Product catalogue → Specifications → Specification name');
  });
  test('shipping details are validated before the payment step', () => {
    const input = posInput(); input.shipping = { ...input.customer, pincode: 'bad' };
    expect(validatePosDraft(input).some(issue => issue.path === 'shipping.pincode')).toBe(true);
  });
  test('the API schema accepts a single allowed method and rejects card/split/credit', () => {
    for (const method of ['cash', 'upi', 'bank']) {
      const input = posInput(); input.payments[0].method = method; expect(posSaleSchema.safeParse(input).success).toBe(true);
    }
    for (const payments of [[], [...posInput().payments, ...posInput().payments], [{ ...posInput().payments[0], method: 'card' }]]) expect(posSaleSchema.safeParse(posInput({ payments })).success).toBe(false);
  });
  test('preflight reads stock and customer status without creating an invoice or changing stock', async () => {
    jest.spyOn(posService, 'getSettings').mockResolvedValue(POS_SELLER_DEFAULTS);
    jest.spyOn(posCustomerService, 'lookup').mockResolvedValue({ found: true, needsVerification: false });
    jest.spyOn(Product, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: posProductId, name: 'Camera', sku: 'CAM-1', stockQuantity: 10 }] }) });
    const mutate = jest.spyOn(Product, 'findOneAndUpdate');
    const result = await posService.validateSale(posInput(), posAdminId);
    expect(result).toMatchObject({ ready: true, total: 7100 }); expect(mutate).not.toHaveBeenCalled();
  });
  test('preflight identifies the specific out-of-stock line', async () => {
    jest.spyOn(posService, 'getSettings').mockResolvedValue(POS_SELLER_DEFAULTS);
    jest.spyOn(posCustomerService, 'lookup').mockResolvedValue({ found: true, needsVerification: false });
    jest.spyOn(Product, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: posProductId, name: 'Camera', sku: 'CAM-1', stockQuantity: 1 }] }) });
    await expect(posService.validateSale(posInput(), posAdminId)).rejects.toMatchObject({ statusCode: 409, details: [{ path: 'items.0.quantity', message: expect.stringContaining('only 1') }] });
  });
});
