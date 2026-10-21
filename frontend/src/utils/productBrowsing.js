import { getProductHsnCode } from '../../../shared/productHsn.js';
import { isInventorySpecification } from '../../../shared/productSpecifications.js';
const idOf = value => String(value?._id || value || '');
export function findHeaderCategory(product, categories) {
  const rows = [];
  const flatten = list => { for (const row of list || []) { rows.push(row); if (row.children) flatten(row.children); } };
  flatten(categories);
  const byId = new Map(rows.map(row => [idOf(row), row]));
  for (const reference of [product?.categoryId, ...(product?.categoryIds || [])]) {
    let category = byId.get(idOf(reference)) || (typeof reference === 'object' ? reference : null);
    const visited = new Set();
    while (category && !visited.has(idOf(category))) {
      visited.add(idOf(category));
      if (!category.parentId) {
        if (byId.has(idOf(category)) || Object.hasOwn(category, 'parentId')) return category;
        break; // A partially populated category is not proof that it is a header.
      }
      category = byId.get(idOf(category.parentId)) || (typeof category.parentId === 'object' ? category.parentId : null);
    }
  }
  return null;
}
export function orderedProductSpecifications(product, brandName) {
  if (!product) return [];
  const specs = (product.specifications || []).filter(spec => spec.key?.trim() && spec.value?.trim() && !isInventorySpecification(spec.key));
  const has = pattern => specs.some(spec => pattern.test(spec.key.trim()));
  const list = [];
  if (!has(/^(brand|manufacturer)$/i)) list.push({ key: 'Brand', value: brandName });
  const hsn = getProductHsnCode(product);
  if (hsn && !has(/^hsn(?:\/sac|\s*code)?$/i)) list.push({ key: 'HSN Code', value: hsn });
  if (product.variant?.trim() && !has(/^variant$/i)) list.push({ key: 'Variant', value: product.variant.trim() });
  for (const spec of specs) {
    const key = spec.key.trim();
    list.push({ key: /^(brand|manufacturer)$/i.test(key) ? 'Brand' : key,
      value: /^(brand|manufacturer)$/i.test(key) ? brandName
        : /^hsn(?:\/sac|\s*code)?$/i.test(key) ? hsn
        : /^variant$/i.test(key) ? product.variant?.trim() || spec.value.trim() : spec.value.trim() });
  }
  if (product.description?.trim() && !has(/^key features$/i)) list.push({ key: 'Key Features', value: product.description.trim() });
  return list;
}
