import { Product } from '../models/Product.js';
import { getPublicCategories } from './catalog.service.js';
import { calculateApplicablePrices } from './cart.service.js';
import { activeVariants, selectedVariantProduct, productLineKey } from '../../../shared/productVariants.js';
import { quoteKey, quotationAccessoryKind } from '../../../shared/cctvQuote.js';
import { canViewStorefrontPrices } from '../../../shared/storefrontPricing.js';
export function inferQuotationClassification(product, categoryNames = []) {
  const identity = [product.name, product.model, product.modelNumber].filter(Boolean).join(' ');
  const specs = (product.specifications || []).map(row => `${row.key} ${row.value}`).join(' ');
  const name = `${identity} ${specs}`;
  const categories = categoryNames.join(' ');
  // Explicit product evidence takes precedence over broader category labels.
  // Resolution ("Full HD") alone does not identify an analogue camera.
  const technology = text => /\b4\s*g\b|sim.card|cellular/i.test(text) ? ['4G']
    : /wi[\s-]?fi|wlan/i.test(text) ? ['WIFI']
    : /\bip\b|network.camera|\bpoe\b|\bipc[-_]|\b(?:ds-)?2cd\w*|\bcp-unc[-_]/i.test(text) ? ['IP']
    : /hdcvi|hdtvi|hd[- ]?(?:cvi|tvi)|\bahd\b|analog(?:ue)?|\bhac[-_]|\b(?:ds-)?2ce\w*|\bcp-(?:hac|vac)[-_]|\bhd\s+(?:dome|bullet|turret|camera)|\b(?:dome|bullet)\s+hd\b/i.test(text) ? ['HD'] : [];
  let kind, systemTypes = [], style = /\bdome\b|\bturret\b|\beyeball\b/i.test(name) ? 'dome' : /\bbullet\b/i.test(name) ? 'bullet' : 'other';
  if (style === 'other') style = /\bdome\b|\bturret\b/i.test(categories) ? 'dome' : /\bbullet\b/i.test(categories) ? 'bullet' : 'other';
  const accessoryKind = quotationAccessoryKind(product);
  if (accessoryKind === 'unsupported') return null;
  if (accessoryKind) kind = accessoryKind;
  else if (/camera|\bdome\b|\bbullet\b|\bturret\b|\bipc[-_]|\bhac[-_]|\b(?:ds-)?2c[de]\w*|\bcp-(?:unc|hac|vac)[-_]/i.test(identity) || (product.specifications || []).some(row => /^(?:product type|device type|item type)$/i.test(row.key) && /^(?:(?:4g|wifi|wi-fi|ip|hd|dome|bullet|network|security|cctv)\s+)*camera$/i.test(row.value.trim()))) {
    kind = 'camera';
    systemTypes = technology(identity);
    if (!systemTypes.length) systemTypes = technology(specs);
    if (!systemTypes.length) systemTypes = technology(categories);
  }
  if (!kind) return null;
  const channel = Number(name.match(/(\d+)\s*(?:ch(?:annel)?s?|ports?)\b/i)?.[1]) || 0;
  const gb = Number(name.match(/(\d+)\s*gb\b/i)?.[1]) || 0;
  const tb = Number(name.match(/(\d+(?:\.\d+)?)\s*tb\b/i)?.[1]) || 0;
  return { kind, systemTypes, style, capacity: ['dvr', 'nvr', 'power', 'poe'].includes(kind) ? channel : kind === 'hdd' ? Math.round(tb * 1000 || gb) : kind === 'memory' ? gb : 0, recommended: false };
}
export async function getQuoteCatalog(user, settings, { admin = false } = {}) {
  const categories = await getPublicCategories();
  const categoryIds = categories.map(row => row._id);
  const categoriesById = new Map(categories.map(row => [String(row._id), row]));
  const categoryNamesFor = product => {
    const names = [], visited = new Set();
    for (const id of [product.categoryId, ...(product.categoryIds || [])]) {
      let row = categoriesById.get(String(id?._id || id));
      while (row && !visited.has(String(row._id))) {
        visited.add(String(row._id)); names.push(row.name);
        row = categoriesById.get(String(row.parentId?._id || row.parentId));
      }
    }
    return names;
  };
  const products = await Product.find({ isActive: true, $or: [{ categoryId: { $in: categoryIds } }, { categoryIds: { $in: categoryIds } }] }).populate('brandId', 'name isActive').select('name sku model modelNumber categoryId categoryIds variants brandId standardPrice dealerPrice stockQuantity specifications images').lean();
  const selected = products.filter(row => row.brandId?.isActive !== false).flatMap(product => product.variants?.length ? activeVariants(product).map(variant => selectedVariantProduct(product, variant._id)) : [product]);
  const prices = user ? await calculateApplicablePrices(user._id, selected) : null;
  const visible = admin || canViewStorefrontPrices(user);
  const result = [];
  for (const product of selected) {
    const productId = String(product._id), variantId = product._variantId || null, key = quoteKey(productId, variantId);
    const configured = settings.mappings.find(row => quoteKey(row.productId, row.variantId) === key);
    const inferred = inferQuotationClassification(product, categoryNamesFor(product));
    const classification = configured?.kind === 'camera' && quotationAccessoryKind(product) ? inferred : configured || inferred;
    if (!admin && (!classification || classification.excluded)) continue;
    const standard = Number(product.standardPrice || 0);
    result.push({ key, productId, variantId, name: product.name, modelNumber: product.modelNumber || '', sku: product.sku, image: product.images?.[0]?.url || '', brand: product.brandId?.name || product.specifications?.find(row => /^(brand|manufacturer)$/i.test(row.key))?.value || 'Other',
      ...classification, systemTypes: classification?.systemTypes || [], style: classification?.style || 'other', capacity: classification?.capacity || 0, recommended: classification?.recommended || false, stock: Number(product.stockQuantity || 0), configured: !!configured,
      ...(visible ? { price: prices?.get(productLineKey(product._id, product._variantId)) ?? standard } : {}) });
  }
  return result.sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.name.localeCompare(b.name));
}
