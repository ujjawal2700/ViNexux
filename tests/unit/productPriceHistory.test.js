import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Product } from '../../backend/src/models/Product.js';
import productService from '../../backend/src/services/product.service.js';

const id = '507f1f77bcf86cd799439011';
const actor = { _id: '507f1f77bcf86cd799439012', fullName: 'Catalog Administrator' };
const base = { _id: id, sku: 'TEST-PRICE', name: 'Test Camera', modelNumber: 'CAM-01', standardPrice: 100, dealerPrice: 80, images: [], specifications: [], pendingImageDeletions: [] };
const hydrate = (fields = {}) => Product.hydrate({ ...base, ...fields });
const setup = () => {
  const document = hydrate();
  jest.spyOn(Product, 'findById').mockResolvedValue(document);
  const write = jest.spyOn(Product, 'findOneAndUpdate').mockImplementation(async (filter, update) => hydrate({ ...update.$set, priceHistory: update.$push.priceHistory.$each }));
  return { document, write };
};
afterEach(() => jest.restoreAllMocks());

describe('Product price history', () => {
  test('saves a price and its previous value, timestamp and authenticated admin in one write', async () => {
    const { write } = setup();
    const result = await productService.updateProduct(id, { standardPrice: 125 }, actor);
    const update = write.mock.calls[0][1];
    expect(update.$set.standardPrice).toBe(125);
    expect(update.$set).not.toHaveProperty('dealerPrice');
    expect(update.$push.priceHistory.$each).toEqual([{
      priceType: 'standard', previousPrice: 100, newPrice: 125, changedAt: expect.any(Date),
      changedBy: actor._id, changedByName: actor.fullName,
    }]);
    expect(result.standardPrice).toBe(125);
  });

  test('logs both fields when a full product save changes both prices', async () => {
    const { write } = setup();
    await productService.updateProduct(id, { standardPrice: 120, dealerPrice: 90 }, actor);
    expect(write.mock.calls[0][1].$push.priceHistory.$each).toEqual([
      expect.objectContaining({ priceType: 'standard', previousPrice: 100, newPrice: 120 }),
      expect.objectContaining({ priceType: 'dealer', previousPrice: 80, newPrice: 90 }),
    ]);
  });

  test('unchanged prices and unrelated changes do not produce duplicate history', async () => {
    const { document, write } = setup();
    jest.spyOn(document, 'save').mockResolvedValue(document);
    await productService.updateProduct(id, { standardPrice: 100, dealerPrice: 80, isTrending: true }, actor);
    expect(write).not.toHaveBeenCalled();
    expect(document.save).toHaveBeenCalled();
  });

  test('validation failures never write history or prices', async () => {
    const { write } = setup();
    await expect(productService.updateProduct(id, { dealerPrice: -5 }, actor)).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
  });

  test('a competing price edit retries against the actual previous price', async () => {
    setup();
    Product.findById.mockResolvedValueOnce(hydrate()).mockResolvedValueOnce(hydrate({ standardPrice: 110 }));
    Product.findOneAndUpdate.mockResolvedValueOnce(null);
    await productService.updateProduct(id, { standardPrice: 125 }, actor);
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(2);
    const [filter, update] = Product.findOneAndUpdate.mock.calls[1];
    expect(filter.$and[0].$or[0]).toEqual({ standardPrice: 110 });
    expect(update.$push.priceHistory.$each[0].previousPrice).toBe(110);
  });

  test('repeated conflicts return an error without an unaudited price overwrite', async () => {
    setup();
    Product.findById.mockImplementation(async () => hydrate());
    Product.findOneAndUpdate.mockResolvedValue(null);
    await expect(productService.updateProduct(id, { standardPrice: 125 }, actor)).rejects.toThrow('Prices changed while saving');
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(4);
  });

  test('client-supplied history cannot replace server-recorded history', async () => {
    const { write } = setup();
    await productService.updateProduct(id, { dealerPrice: 85, priceHistory: [{ changedByName: 'Spoofed' }] }, actor);
    expect(write.mock.calls[0][1].$set).not.toHaveProperty('priceHistory');
    expect(write.mock.calls[0][1].$push.priceHistory.$each).toEqual([
      expect.objectContaining({ priceType: 'dealer', changedByName: actor.fullName }),
    ]);
  });
});
