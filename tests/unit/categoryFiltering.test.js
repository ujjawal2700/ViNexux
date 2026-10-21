import { describe, expect, test } from '@jest/globals';
import { categoryLevels, readCategorySelections, readSpecificationSelections } from '../../shared/categoryFiltering.js';
import { rollupCategoryCounts } from '../../backend/src/utils/catalogFacets.js';
const categories = [
  { _id: 'h', slug: 'cameras' }, { _id: 'm', slug: 'ip-cameras', parentId: { _id: 'h' } },
  { _id: 's1', slug: 'bullet', parentId: 'm' }, { _id: 's2', slug: 'dome', parentId: 'm' },
];
describe('hierarchical multi-selection', () => {
  test('classifies header, main and subcategory levels', () => {
    expect([...categoryLevels(categories).values()]).toEqual([1, 2, 3, 3]);
  });
  test('existing category routes and legacy links initialize the correct groups', () => {
    expect(readCategorySelections(new URLSearchParams('category=bullet,dome'), categories)).toEqual({ headerCategory: [], mainCategory: [], subCategory: ['s1', 's2'] });
    expect(readCategorySelections(new URLSearchParams(), categories, categories[1]).mainCategory).toEqual(['m']);
  });
  test('keeps independent multi-select groups and resolves slugs/IDs', () => {
    expect(readCategorySelections(new URLSearchParams('headerCategory=cameras&mainCategory=m&subCategory=bullet,s2'), categories)).toEqual({ headerCategory: ['h'], mainCategory: ['m'], subCategory: ['s1', 's2'] });
  });
  test('counts multi-assigned products once per parent, including ancestor assignments', () => {
    const counts = rollupCategoryCounts([{ _id: ['h', 'm', 's1', 's2'], count: 2 }, { _id: ['s2'], count: 1 }], categories);
    expect(Object.fromEntries(counts)).toEqual({ h: 3, m: 3, s1: 2, s2: 3 });
  });
  test('unknown/deleted assignments and category cycles cannot loop indefinitely', () => {
    expect(rollupCategoryCounts([{ _id: ['deleted'], count: 1 }], categories).size).toBe(0);
    expect(categoryLevels([{ _id: 'a', parentId: 'b' }, { _id: 'b', parentId: 'a' }]).size).toBe(2);
  });
});
describe('URL specification state', () => {
  test('same-key case variants combine as one OR selection', () => {
    expect(readSpecificationSelections(JSON.stringify({ Resolution: ['4 MP'], resolution: ['8 MP', '4 MP'] }))).toEqual({ Resolution: ['4 MP', '8 MP'] });
  });
  test('unusual specification keys cannot be lost through object prototypes', () => {
    expect(Object.keys(readSpecificationSelections('{"__proto__":["missing"]}'))).toEqual(['__proto__']);
  });
  test.each(['bad json', '[]', 'null', '{"Resolution":"4MP"}'])('ignores invalid saved state %s', input => {
    expect(readSpecificationSelections(input)).toEqual({});
  });
});
