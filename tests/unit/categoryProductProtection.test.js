import { afterEach, expect, jest, test } from '@jest/globals';
import { Category } from '../../backend/src/models/Category.js';
import { Product } from '../../backend/src/models/Product.js';
import categoryService from '../../backend/src/services/category.service.js';
const id = '507f1f77bcf86cd799439011', childId = '507f1f77bcf86cd799439012';
afterEach(() => jest.restoreAllMocks());
const setup = count => {
  jest.spyOn(Category, 'findById').mockResolvedValue({ _id: id, name: 'Cameras' });
  jest.spyOn(Category, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: id }, { _id: childId, parentId: id }] }) });
  jest.spyOn(Product, 'countDocuments').mockResolvedValue(count);
  jest.spyOn(Product, 'deleteMany').mockResolvedValue({});
  jest.spyOn(Category, 'deleteMany').mockResolvedValue({});
};
test('category deletion protects products linked through primary OR secondary categories, including descendants', async () => {
  setup(2);
  await expect(categoryService.deleteCategory(id)).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Reassign those products first') });
  expect(Product.countDocuments).toHaveBeenCalledWith({ $or: [
    { categoryId: { $in: expect.arrayContaining([id, childId]) } },
    { categoryIds: { $in: expect.arrayContaining([id, childId]) } },
  ] });
  expect(Product.deleteMany).not.toHaveBeenCalled();
  expect(Category.deleteMany).not.toHaveBeenCalled();
});
test('empty category trees can still be removed without deleting any products', async () => {
  setup(0);
  expect((await categoryService.deleteCategory(id)).deleted).toBe(true);
  expect(Product.deleteMany).not.toHaveBeenCalled();
  expect(Category.deleteMany).toHaveBeenCalled();
});
