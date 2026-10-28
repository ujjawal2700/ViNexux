import { afterEach, expect, jest, test } from '@jest/globals';
import { productService } from '../../backend/src/services/product.service.js';
import { Product } from '../../backend/src/models/Product.js';
import { getProductsQuerySchema } from '../../backend/src/validators/product.validator.js';

afterEach(() => jest.restoreAllMocks());

const sortFields = getProductsQuerySchema.query.shape.sortBy.unwrap().options;

test.each(sortFields.flatMap(field => ['asc', 'desc'].map(order => [field, order])))(
  'admin pagination uses a unique tie-breaker before paging by %s %s',
  async (sortBy, sortOrder) => {
    const queries = [];
    jest.spyOn(Product, 'find').mockImplementation(() => {
      const query = {};
      queries.push(query);
      const chain = {};
      for (const method of ['populate', 'select']) chain[method] = () => chain;
      for (const method of ['sort', 'skip', 'limit']) {
        chain[method] = value => { query[method] = value; return chain; };
      }
      chain.lean = async () => [];
      return chain;
    });
    jest.spyOn(Product, 'countDocuments').mockResolvedValue(60);

    for (const page of [1, 2, 3]) {
      const result = await productService.getProducts({ page, limit: 20, sortBy, sortOrder });
      expect(result.pagination).toEqual({ page, limit: 20, total: 60, totalPages: 3 });
    }

    const primaryField = sortBy === 'sortOrder' ? 'createdAt' : sortBy;
    expect(queries).toEqual([0, 20, 40].map(skip => ({
      sort: { [primaryField]: sortOrder === 'asc' ? 1 : -1, _id: 1 },
      skip,
      limit: 20,
    })));
  },
);
