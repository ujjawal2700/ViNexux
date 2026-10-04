// Catalog fields derived from a product's own data and stored on it, so the
// storefront can filter and search with indexes instead of recomputing them
// for every document on every request. Bump CATALOG_FIELDS_VERSION whenever
// computeCatalogFields changes; startup re-derives older documents.
export const CATALOG_FIELDS_VERSION = 1;

// Paths the derived fields depend on.
export const CATALOG_SOURCE_PATHS = ['name', 'sku', 'specifications', 'stockQuantity'];

const BRAND_KEYS = ['brand', 'manufacturer'];
const STOCK_KEYS = ['stock', 'inventory'];
const BRAND_KEY_PATTERN = /^(brand|manufacturer)$/i;
const DECIMAL_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

// Same as MongoDB's $toUpper, which only upper-cases ASCII letters. Keeps
// stored brand names identical to what the catalog showed before.
export const toBrandKey = (value) => String(value).trim().replace(/[a-z]+/g, (letters) => letters.toUpperCase());

export const searchWords = (text) => String(text ?? '').toLowerCase().split(WORD_SPLIT).filter(Boolean);

const gramsOfWord = (word, size) => {
  const chars = Array.from(word);
  const grams = [];
  for (let i = 0; i + size <= chars.length; i++) grams.push(chars.slice(i, i + size).join(''));
  return grams;
};

// Every 2- and 3-character fragment of every word. Any substring of the text
// that contains a word of 2+ characters shares those fragments, so an index on
// them narrows substring search without changing which products match.
export const searchTokensFor = (texts) => {
  const tokens = new Set();
  for (const text of texts) {
    for (const word of searchWords(text)) {
      for (const gram of gramsOfWord(word, 2)) tokens.add(gram);
      for (const gram of gramsOfWord(word, 3)) tokens.add(gram);
    }
  }
  return [...tokens];
};

// Fragments a product must contain to possibly match `term` as a substring.
export const requiredSearchTokens = (term) => {
  const tokens = new Set();
  for (const word of searchWords(term)) {
    const length = Array.from(word).length;
    if (length >= 3) gramsOfWord(word, 3).forEach((gram) => tokens.add(gram));
    else if (length === 2) tokens.add(word);
  }
  return [...tokens];
};

// Optimal string alignment distance (Levenshtein plus adjacent swaps), stopping
// early once it must exceed `max`.
export const editDistance = (a, b, max = Infinity) => {
  const x = Array.from(a);
  const y = Array.from(b);
  if (Math.abs(x.length - y.length) > max) return max + 1;
  let prevPrev = null;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (prevPrev && i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      row.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[y.length];
};

// Typos tolerated per word: short words 1 edit, longer words more.
export const allowedTypos = (word) => {
  const length = Array.from(word).length;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  return 3;
};

const firstSpecValue = (specifications, keys) => specifications
  .find((specification) => keys.includes(String(specification?.key ?? '').toLowerCase()))?.value;

const toStockNumber = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return DECIMAL_PATTERN.test(text) ? Number(text) : null;
};

const stockStatusFor = (stock) => {
  if (stock === 0) return 'out-of-stock';
  if (stock > 0 && stock < 5) return 'low-stock';
  if (stock >= 5) return 'in-stock';
  return 'on-order';
};

export const computeCatalogFields = (product) => {
  const specifications = Array.isArray(product.specifications) ? product.specifications : [];
  const brandValue = firstSpecValue(specifications, BRAND_KEYS);
  const specStock = toStockNumber(firstSpecValue(specifications, STOCK_KEYS));
  const rawStock = product.stockQuantity !== undefined && product.stockQuantity !== null ? product.stockQuantity : null;
  const stockLevel = (rawStock !== null && rawStock > 0)
    ? rawStock
    : (specStock !== null ? specStock : (rawStock ?? 0));
  const brandTexts = specifications
    .filter((specification) => BRAND_KEY_PATTERN.test(String(specification?.key ?? '')))
    .map((specification) => specification.value);

  return {
    brandKey: brandValue === undefined || brandValue === null ? '' : toBrandKey(brandValue),
    stockLevel,
    stockStatus: stockStatusFor(stockLevel),
    searchTokens: searchTokensFor([product.name, product.sku, ...brandTexts]),
    catalogFieldsVersion: CATALOG_FIELDS_VERSION,
  };
};
