import { allowedTypos, editDistance, searchWords } from './productCatalogFields.js';

export const stockSearchScore = (product, query) => {
  const text = query.trim().toLowerCase();
  const fields = [product.name, product.model, product.modelNumber, product.sku, String(product._id)]
    .filter(Boolean).map((value) => String(value).toLowerCase());
  if (fields.includes(text)) return 0;
  if (fields.some((value) => value.includes(text))) return 1;
  const words = fields.flatMap(searchWords);
  const terms = searchWords(text);
  if (!terms.length) return null;
  let score = 2;
  for (const term of terms) {
    if (words.some((word) => word.includes(term))) continue;
    const tolerance = term.length < 3 ? 0 : allowedTypos(term);
    const distance = Math.min(...words.map((word) => editDistance(term, word, tolerance)));
    if (distance > tolerance) return null;
    score += distance;
  }
  return score;
};
