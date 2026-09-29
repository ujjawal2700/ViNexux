import path from 'node:path';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import sharp from 'sharp';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { storageService } from './storage/storage.service.js';
import { effectiveFilterDefinitions, getPublicCategories } from './catalog.service.js';
import { createProductSchema } from '../validators/product.validator.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const HEADERS = [
  'Model Number', 'Model', 'Product Name', 'Brand', 'Header Category',
  'Main Category (Optional)', 'Sub Category (Optional)', 'Standard Price',
  'Dealer Price', 'Stock Quantity', 'Product URL', 'Warranty', 'Variant', 'Specifications',
];
const PREVIOUS_HEADERS = [
  'SKU', 'Model Number', 'Model', 'Product Name', 'Brand', 'Header Category',
  'Main Category', 'Sub Category', 'Standard Price', 'Dealer Price',
  'Stock Quantity', 'Description', 'Information Phone', 'Product URL', 'Warranty',
  'Country of Origin', 'HSN Code', 'Variant', 'Specifications JSON',
  'Featured', 'Publish', 'Image Files',
];
const LEGACY_HEADERS = PREVIOUS_HEADERS.filter((header) => header !== 'Product URL');
const MAX_ROWS = 200;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGES = 500;
const imageMime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const invalid = (message) => new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
const clean = (value) => String(value ?? '').trim();
const normalized = (value) => clean(value).toLowerCase();
const slugify = (value) => normalized(value).replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cellText = (cell) => {
  if (cell.value && typeof cell.value === 'object') {
    if ('formula' in cell.value || 'sharedFormula' in cell.value) throw invalid('Formula cells are not allowed in the product template. Paste values instead.');
    if ('richText' in cell.value) return cell.value.richText.map((part) => part.text).join('').trim();
  }
  return clean(cell.text);
};
const numeric = (value, label, errors, integer = false) => {
  const text = clean(value);
  const number = Number(text);
  if (!text || !Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    errors.push(`${label} must be ${integer ? 'a whole' : 'a non-negative'} number.`);
    return 0;
  }
  return number;
};
const booleanValue = (value, label, errors, blankDefault = false) => {
  const text = normalized(value);
  if (!text) return blankDefault;
  if (text === 'no' || text === 'false') return false;
  if (text === 'yes' || text === 'true') return true;
  errors.push(`${label} must be Yes or No.`);
  return false;
};

const plainSpecifications = (value, errors) => {
  if (!clean(value)) return [];
  const entries = clean(value).split(/\r?\n|;|\s{2,}(?=[^:\s][^:]{0,49}:)/).map(clean).filter(Boolean);
  return entries.flatMap((entry) => {
    const separator = entry.indexOf(':');
    const key = clean(entry.slice(0, separator));
    const specValue = clean(entry.slice(separator + 1));
    if (separator < 1 || !key || !specValue || key.length > 50 || specValue.length > 255) {
      errors.push(`Specification "${entry.slice(0, 60)}" needs a name and value, like RAM: 16GB.`);
      return [];
    }
    return [{ key, value: specValue }];
  });
};

export const createProductImportTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Products');
  sheet.addRow(HEADERS);
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800020' } };
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(1).height = 34;
  sheet.columns.forEach((column, index) => { column.width = index === 2 ? 38 : index === 13 ? 46 : 24; });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: 'N1' };
  sheet.getColumn('A').numFmt = '@';
  const examples = workbook.addWorksheet('Examples');
  examples.addRow(HEADERS);
  examples.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  examples.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800020' } };
  examples.getRow(1).height = 34;
  examples.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  examples.columns.forEach((column, index) => { column.width = index === 2 ? 38 : index === 13 ? 46 : 24; });
  examples.getColumn('A').numFmt = '@';
  [
    ['LAP-001', 'IdeaPad Slim 3', 'Lenovo IdeaPad Slim 3 Laptop', 'Lenovo', 'Laptop', 'Branded Laptop', '', 45999, 42999, 8, 'https://www.lenovo.com/in/en/', '1 Year', 'Standard', 'RAM: 16GB\nStorage: 512GB SSD\nScreen: 15.6 inch'],
    ['TAB-001', 'Galaxy Tab A9', 'Samsung Galaxy Tab A9 Tablet', 'Samsung', 'Tablets', 'Full Size Tablet', '', 18999, 16999, 3, '', '1 Year', '', 'Display: 8.7 inch\nStorage: 64GB'],
    ['CAM-001', 'Indoor Camera', 'Indoor WiFi Security Camera', 'CP Plus', 'Security', '', '', 2499, 2199, 0, '', '1 Year', '', 'Resolution: 2MP; Connectivity: WiFi'],
  ].forEach((values) => {
    const row = examples.addRow(values);
    row.height = 55;
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }; });
  });
  examples.views = [{ state: 'frozen', ySplit: 1 }];
  const instructions = workbook.addWorksheet('Instructions');
  [
    ['Vinexus Bulk Product Import - Kaise Bharein'],
    ['1. Products sheet me har product ke liye ek nayi row bharein. Upar wale column names na badlein. Ek baar me 200 products tak upload kar sakte hain.'],
    ['2. Examples sheet me 3 sample products hain. Unhe dekhkar Products sheet bharein. Examples sheet ki rows upload nahi hongi.'],
    ['3. Model Number, Model, Product Name, Brand, Header Category, dono Price aur Stock Quantity zaroor bharein. Har Model Number alag hona chahiye.'],
    ['4. Main Category (Optional) aur Sub Category (Optional) khaali chhod sakte hain. Sub Category bharni ho to Main Category bhi bharein.'],
    ['5. Naya brand ya category likh sakte hain. Upload safal hone par woh apne aap ban jayenge. Naam ki spelling ek jaisi rakhein.'],
    ['6. Standard Price customer ke liye aur Dealer Price dealer ke liye hai. Dono me sirf number likhein. Stock nahi hai to Stock Quantity me 0 likhein.'],
    ['7. Specifications me har detail "Name: Value" likhein, jaise RAM: 16GB. Agli line ke liye Alt+Enter dabayein. Semicolon (;) ya do spaces se bhi details alag kar sakte hain.'],
    ['8. Product URL, Warranty aur Variant chahein to bharein. Product URL me original brand website ke product ka poora link likhein.'],
    ['9. Product photo aur brand/category logo upload ke baad admin panel se laga sakte hain.'],
    ['10. Pehle Preview Products dabayein. Error ho to Excel me theek karke phir Preview karein. Import tabhi karein jab sab rows sahi hon; error par koi product add nahi hoga.'],
  ].forEach((row) => instructions.addRow(row));
  instructions.getColumn(1).width = 125;
  instructions.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF800020' } };
  instructions.eachRow((row) => { row.height = row.number === 1 ? 34 : 38; row.alignment = { vertical: 'middle', wrapText: true }; });
  return workbook.xlsx.writeBuffer();
};

const parseWorkbook = async (buffer) => {
  if (!buffer?.length || buffer.length > 12 * 1024 * 1024) throw invalid('Upload a valid Excel file smaller than 12 MB.');
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(buffer); } catch { throw invalid('Excel file could not be read. Use the downloaded .xlsx template.'); }
  const sheet = workbook.getWorksheet('Products');
  if (!sheet) throw invalid('The workbook must contain a Products sheet.');
  const headers = sheet.getRow(1).values.slice(1).map(clean);
  const expectedHeaders = [HEADERS, PREVIOUS_HEADERS, LEGACY_HEADERS]
    .find((candidate) => headers.length === candidate.length && candidate.every((header, index) => headers[index] === header));
  if (!expectedHeaders) throw invalid('The Products sheet headers differ from the downloaded template.');
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = expectedHeaders.map((header, index) => cellText(row.getCell(index + 1)));
    if (values.some(Boolean)) {
      const fields = Object.fromEntries(expectedHeaders.map((header, index) => [header, values[index]]));
      if (!('Product URL' in fields)) fields['Product URL'] = '';
      rows.push({ rowNumber, fields });
    }
  });
  if (!rows.length) throw invalid('Add at least one product row to the Products sheet.');
  if (rows.length > MAX_ROWS) throw invalid(`Only ${MAX_ROWS} product rows are allowed per upload.`);
  return rows;
};

const readImageArchive = async (buffer) => {
  if (!buffer?.length) return new Map();
  const zip = await JSZip.loadAsync(buffer).catch(() => { throw invalid('Image ZIP file could not be read.'); });
  const files = new Map();
  let totalSize = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || entry.name.startsWith('__MACOSX/')) continue;
    const name = path.posix.basename(entry.name.replaceAll('\\', '/'));
    if (!name || name.startsWith('.')) continue;
    const key = normalized(name);
    if (files.has(key)) throw invalid(`Duplicate image filename in ZIP: ${name}`);
    const ext = name.split('.').pop().toLowerCase();
    if (!imageMime[ext]) throw invalid(`Unsupported image in ZIP: ${name}`);
    const declaredSize = entry._data?.uncompressedSize;
    if (declaredSize > MAX_IMAGE_SIZE) throw invalid(`Image exceeds 5 MB: ${name}`);
    totalSize += declaredSize || 0;
    if (files.size >= MAX_TOTAL_IMAGES || totalSize > 100 * 1024 * 1024) throw invalid('Image ZIP contains too many or too-large files.');
    files.set(key, { entry, name, mimetype: imageMime[ext] });
  }
  return files;
};

export const prepareProductImport = async (workbookBuffer, archiveBuffer) => {
  const rows = await parseWorkbook(workbookBuffer);
  const images = await readImageArchive(archiveBuffer);
  const [activeCategories, allCategories, allBrands, existingProducts] = await Promise.all([
    getPublicCategories(), Category.find().lean(), Brand.find().lean(), Product.find({}, 'sku modelNumber').lean(),
  ]);
  const activeCategoryIds = new Set(activeCategories.map((item) => String(item._id)));
  const newCategories = [];
  const newBrands = [];
  const categories = [...allCategories];
  const brands = [...allBrands];
  const categorySlugs = new Set(categories.map((item) => normalized(item.slug)));
  const brandSlugs = new Set(brands.map((item) => normalized(item.slug)));
  const createSlug = (name, parent, slugs) => {
    const base = slugify(name);
    if (!base) return '';
    let candidate = base;
    if (slugs.has(candidate)) candidate = `${slugify(parent?.name || 'brand')}-${base}`;
    let suffix = 2;
    const prefix = candidate;
    while (slugs.has(candidate)) candidate = `${prefix}-${suffix++}`;
    slugs.add(candidate);
    return candidate;
  };
  const findOrPlanCategory = (name, parent, level, errors) => {
    if (!clean(name)) { errors.push(`${level} Category is required.`); return null; }
    if (clean(name).length > 100) { errors.push(`${level} Category name exceeds 100 characters.`); return null; }
    const parentId = parent?._id || null;
    const existing = categories.find((item) => normalized(item.name) === normalized(name)
      && String(item.parentId?._id || item.parentId || '') === String(parentId || ''));
    if (existing) {
      if (!activeCategoryIds.has(String(existing._id)) && !newCategories.includes(existing)) {
        errors.push(`${level} Category "${name}" already exists but is inactive.`);
        return null;
      }
      return existing;
    }
    const slug = createSlug(name, parent, categorySlugs);
    if (!slug) { errors.push(`${level} Category needs a URL-safe English name.`); return null; }
    const category = { _id: new mongoose.Types.ObjectId(), name: clean(name), slug, parentId, isActive: true, filterDefinitions: [], level };
    categories.push(category);
    newCategories.push(category);
    activeCategoryIds.add(String(category._id));
    return category;
  };
  const findOrPlanBrand = (name, errors) => {
    if (!clean(name)) { errors.push('Brand is required.'); return null; }
    if (clean(name).length > 100) { errors.push('Brand name exceeds 100 characters.'); return null; }
    const existing = brands.find((item) => normalized(item.name) === normalized(name));
    if (existing) {
      if (!existing.isActive) { errors.push(`Brand "${name}" already exists but is inactive.`); return null; }
      return existing;
    }
    const slug = createSlug(name, null, brandSlugs);
    if (!slug) { errors.push('Brand needs a URL-safe English name.'); return null; }
    const brand = { _id: new mongoose.Types.ObjectId(), name: clean(name), slug, isActive: true };
    brands.push(brand);
    newBrands.push(brand);
    return brand;
  };
  const existingSkus = new Set(existingProducts.map((item) => normalized(item.sku)));
  const existingModels = new Set(existingProducts.map((item) => normalized(item.modelNumber)));
  const seenSkus = new Set();
  const seenModels = new Set();
  const imageChecks = new Map();
  const prepared = [];
  for (const { rowNumber, fields } of rows) {
    const errors = [];
    const modelNumber = clean(fields['Model Number']);
    if (existingModels.has(normalized(modelNumber)) || seenModels.has(normalized(modelNumber))) errors.push('Model Number already exists.');
    if (modelNumber) seenModels.add(normalized(modelNumber));
    const requestedSku = clean(fields.SKU).toUpperCase();
    const baseSku = requestedSku && !existingSkus.has(normalized(requestedSku)) && !seenSkus.has(normalized(requestedSku))
      ? requestedSku : `VNX-${createHash('sha256').update(modelNumber).digest('hex').slice(0, 12).toUpperCase()}`;
    let sku = baseSku;
    let suffix = 2;
    while (existingSkus.has(normalized(sku)) || seenSkus.has(normalized(sku))) sku = `${baseSku.slice(0, 45)}-${suffix++}`;
    seenSkus.add(normalized(sku));

    const header = findOrPlanCategory(fields['Header Category'], null, 'Header', errors);
    const mainName = fields['Main Category (Optional)'] ?? fields['Main Category'];
    const subName = fields['Sub Category (Optional)'] ?? fields['Sub Category'];
    const main = mainName && header ? findOrPlanCategory(mainName, header, 'Main', errors) : null;
    if (subName && !mainName) errors.push('Main Category is required when Sub Category is filled.');
    const sub = subName && main ? findOrPlanCategory(subName, main, 'Sub', errors) : null;
    const category = sub || main || header;
    const brand = findOrPlanBrand(fields.Brand, errors);
    const imageNames = clean(fields['Image Files']).split(',').map(clean).filter(Boolean);
    if (imageNames.length > 5) errors.push('Maximum 5 images per product.');
    for (const name of imageNames) {
      const key = normalized(name);
      if (!images.has(key)) errors.push(`Image not found in ZIP: ${name}`);
      else {
        if (!imageChecks.has(key)) {
          imageChecks.set(key, (async () => {
            try {
              const buffer = await images.get(key).entry.async('nodebuffer');
              if (buffer.length > MAX_IMAGE_SIZE) return `Image exceeds 5 MB: ${name}`;
              const metadata = await sharp(buffer).metadata();
              if (!['png', 'jpeg', 'webp'].includes(metadata.format)) return `Invalid image: ${name}`;
              return null;
            } catch { return `Image could not be read: ${name}`; }
          })());
        }
        const imageError = await imageChecks.get(key);
        if (imageError) errors.push(imageError);
      }
    }
    const specifications = [];
    for (const [column, key] of [['Warranty', 'Warranty'], ['Country of Origin', 'Country of Origin'], ['HSN Code', 'HSN Code'], ['Variant', 'Variant']]) {
      if (fields[column]) specifications.push({ key, value: fields[column] });
    }
    specifications.push(...plainSpecifications(fields.Specifications, errors));
    if (fields['Specifications JSON']) {
      try {
        const parsed = JSON.parse(fields['Specifications JSON']);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
        for (const [key, value] of Object.entries(parsed)) {
          const values = Array.isArray(value) ? value : [value];
          for (const entry of values) specifications.push({ key: clean(key), value: clean(entry) });
        }
      } catch { errors.push('Specifications JSON must be a JSON object.'); }
    }
    specifications.push({ key: 'Stock', value: String(numeric(fields['Stock Quantity'], 'Stock Quantity', errors, true)) });
    const payload = {
      sku, modelNumber, model: fields.Model, name: fields['Product Name'],
      categoryId: String(category?._id || ''), brandId: String(brand?._id || ''),
      standardPrice: numeric(fields['Standard Price'], 'Standard Price', errors),
      dealerPrice: numeric(fields['Dealer Price'], 'Dealer Price', errors),
      description: fields.Description || '', informationPhone: fields['Information Phone'] || '',
      productUrl: fields['Product URL'],
      specifications: [...specifications, ...(brand ? [{ key: 'Brand', value: brand.name }] : [])],
      images: [], isFeatured: booleanValue(fields.Featured, 'Featured', errors), isActive: false,
    };
    const schema = createProductSchema.body.safeParse(payload);
    if (!schema.success) errors.push(...schema.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    if (category) {
      const definitions = effectiveFilterDefinitions([...activeCategories, ...newCategories], category._id);
      for (const definition of definitions) {
        const values = specifications.filter((spec) => normalized(spec.key) === normalized(definition.key)).map((spec) => spec.value);
        if (definition.isRequired && !values.length) errors.push(`${definition.label} is required for this category.`);
        if (values.length && ['select', 'multi-select'].includes(definition.inputType)
          && values.some((value) => !definition.options.some((option) => normalized(option) === normalized(value)))) errors.push(`${definition.label} has an invalid option.`);
        if (definition.inputType === 'number' && values.some((value) => !Number.isFinite(Number(value)))) errors.push(`${definition.label} must be numeric.`);
        if (definition.inputType === 'boolean' && values.some((value) => !['yes', 'no', 'true', 'false'].includes(normalized(value)))) errors.push(`${definition.label} must be Yes or No.`);
      }
    }
    prepared.push({ rowNumber, fields, payload, imageNames, publish: booleanValue(fields.Publish, 'Publish', errors, true), errors });
  }
  return { rows: prepared, images, categories, newCategories, newBrands };
};

export const previewProductImport = async (workbookBuffer, archiveBuffer) => {
  const { rows, images, categories, newCategories, newBrands } = await prepareProductImport(workbookBuffer, archiveBuffer);
  const previewRows = await Promise.all(rows.map(async ({ rowNumber, fields, payload, errors, imageNames, publish }) => {
    let imagePreview = '';
    const firstImage = images.get(normalized(imageNames[0]));
    if (firstImage && !errors.some((error) => error.includes(imageNames[0]))) {
      try {
        const buffer = await firstImage.entry.async('nodebuffer');
        imagePreview = `data:image/webp;base64,${(await sharp(buffer).resize(72, 72, { fit: 'contain' }).webp({ quality: 60 }).toBuffer()).toString('base64')}`;
      } catch { /* The row-level image validation already reports broken images. */ }
    }
    return {
      rowNumber, sku: payload.sku, modelNumber: fields['Model Number'], name: fields['Product Name'],
      category: [fields['Header Category'], fields['Main Category (Optional)'] ?? fields['Main Category'],
        fields['Sub Category (Optional)'] ?? fields['Sub Category']].filter(Boolean).join(' / '),
      standardPrice: fields['Standard Price'], dealerPrice: fields['Dealer Price'], imageNames, imagePreview, publish, errors,
    };
  }));
  return {
    total: rows.length,
    valid: rows.filter((row) => !row.errors.length).length,
    invalid: rows.filter((row) => row.errors.length).length,
    imageCount: images.size,
    newCategories: newCategories.map((category) => ({ name: category.name, level: category.level,
      parentName: categories.find((item) => String(item._id) === String(category.parentId))?.name || '' })),
    newBrands: newBrands.map((brand) => ({ name: brand.name })),
    rows: previewRows,
  };
};

export const commitProductImport = async (workbookBuffer, archiveBuffer) => {
  const { rows, images, newCategories, newBrands } = await prepareProductImport(workbookBuffer, archiveBuffer);
  if (rows.some((row) => row.errors.length)) throw invalid('Import has invalid rows. Preview and correct the template before importing.');
  const uploadedIds = [];
  const products = rows.map((row) => ({ ...row.payload, _id: new mongoose.Types.ObjectId(), isActive: row.publish, images: [] }));
  try {
    // Upload all optional images first. No category, brand or product is written until every image is ready.
    for (const [index, row] of rows.entries()) {
      for (const name of row.imageNames) {
        const image = images.get(normalized(name));
        const buffer = await image.entry.async('nodebuffer');
        const uploaded = await storageService.uploadFile({
          buffer, originalname: image.name, mimetype: image.mimetype,
          folder: `vinexus/products/${products[index]._id}`, category: 'product',
        });
        uploadedIds.push(uploaded.publicId);
        products[index].images.push({ url: uploaded.url, publicId: uploaded.publicId,
          altText: row.payload.name, sortOrder: products[index].images.length });
      }
    }

    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    const supportsTransactions = Boolean(hello.setName || hello.msg === 'isdbgrid');
    if (supportsTransactions) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          if (newCategories.length) await Category.insertMany(newCategories, { session, ordered: true });
          if (newBrands.length) await Brand.insertMany(newBrands, { session, ordered: true });
          await Product.insertMany(products, { session, ordered: true });
        });
      } finally { await session.endSession(); }
    } else {
      // Local standalone MongoDB does not support transactions. Stage products as
      // inactive and compensate every insert if any step fails.
      try {
        if (newCategories.length) await Category.insertMany(newCategories, { ordered: true });
        if (newBrands.length) await Brand.insertMany(newBrands, { ordered: true });
        await Product.insertMany(products.map((product) => ({ ...product, isActive: false })), { ordered: true });
        const toPublish = products.filter((product) => product.isActive).map((product) => product._id);
        if (toPublish.length) await Product.updateMany({ _id: { $in: toPublish } }, { $set: { isActive: true } });
      } catch (error) {
        await Product.deleteMany({ _id: { $in: products.map((product) => product._id) } });
        await Brand.deleteMany({ _id: { $in: newBrands.map((brand) => brand._id) } });
        await Category.deleteMany({ _id: { $in: newCategories.map((category) => category._id) } });
        throw error;
      }
    }

    return { total: rows.length, created: rows.length, failed: 0,
      createdCategories: newCategories.length, createdBrands: newBrands.length,
      results: rows.map((row, index) => ({ rowNumber: row.rowNumber, sku: row.payload.sku,
        status: 'created', productId: products[index]._id })) };
  } catch (error) {
    await Promise.all(uploadedIds.filter(Boolean).map((id) => storageService.deleteFile(id)));
    throw invalid(`Bulk import failed; no products were added. ${error.code === 11000 ? 'A model number or SKU was added by another request. Preview again.' : error.message}`);
  }
};
