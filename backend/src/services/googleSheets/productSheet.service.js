import { randomUUID } from 'node:crypto';
import { config } from '../../config/env.js';
import { GoogleSheetsApiProvider } from '../../integrations/googleSheets/GoogleSheetsApiProvider.js';
import { Product } from '../../models/Product.js';
import { Brand } from '../../models/Brand.js';
import { Category } from '../../models/Category.js';
import { ProductSheetConnection, ProductSheetRecord } from '../../models/ProductSheetConnection.js';
import { productService } from '../product.service.js';
import { AppError } from '../../utils/AppError.js';
import { HEADERS, createReferences, exportProductRow, parseProductRow, productValues, mergeSheetChanges, validateSheetPayload } from './productSheetRows.js';

const invalid = message => new AppError(message, 400, 'VALIDATION_ERROR');
const quote = title => `'${title.replaceAll("'", "''")}'`;
const leaseMs = 10 * 60 * 1000;
const configured = () => Boolean(config.googleServiceAccountEmail && config.googleServiceAccountPrivateKey);
const requireConfiguration = () => {
  if (!configured()) throw new AppError('Configure the Google service-account email and private key on the server, then share your spreadsheet with that account as an Editor.', 503, 'INTEGRATION_NOT_CONFIGURED');
};
export function spreadsheetIdFrom(value) {
  const input = String(value || '').trim();
  if (/^[a-zA-Z0-9_-]{20,150}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,150})(?:\/|$)/);
    if (url.protocol === 'https:' && url.hostname === 'docs.google.com' && match) return match[1];
  } catch { /* Reject anything other than a real Sheets URL or ID. */ }
  throw invalid('Enter a valid Google Sheets URL or spreadsheet ID.');
}
async function googleCall(operation) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Google Sheets could not be reached. Check that the spreadsheet is shared with the service account as an Editor and that the Sheets API is enabled. Saved products are retained; retry Sync Products.', 502, 'GOOGLE_SHEETS_ERROR');
  }
}
async function references() {
  const [brands, categories] = await Promise.all([Brand.find().lean(), Category.find().lean()]);
  return createReferences(brands, categories);
}
async function withLock(operation) {
  requireConfiguration();
  await ProductSheetConnection.updateOne({ singletonKey: 'products' }, { $setOnInsert: { singletonKey: 'products' } }, { upsert: true });
  const token = randomUUID();
  const state = await ProductSheetConnection.findOneAndUpdate({ singletonKey: 'products', $or: [{ lockUntil: { $lte: new Date() } }, { lockUntil: null }] },
    { $set: { lockToken: token, lockUntil: new Date(Date.now() + leaseMs) } }, { new: true });
  if (!state) throw new AppError('Another product-sheet operation is running. Try again when it finishes.', 409, 'SYNC_IN_PROGRESS');
  const renew = async () => {
    const result = await ProductSheetConnection.updateOne({ singletonKey: 'products', lockToken: token, lockUntil: { $gt: new Date() } }, { $set: { lockUntil: new Date(Date.now() + leaseMs) } });
    if (!result.matchedCount) throw new AppError('The product sync lock expired. Retry Sync Products.', 409, 'SYNC_IN_PROGRESS');
  };
  try { return await operation(state, renew); }
  finally { await ProductSheetConnection.updateOne({ singletonKey: 'products', lockToken: token }, { $unset: { lockToken: 1, lockUntil: 1 } }); }
}
const publicState = state => ({
  configured: configured(), serviceAccountEmail: config.googleServiceAccountEmail || '',
  defaultSpreadsheetId: config.googleProductsSpreadsheetId || config.googleSheetsSpreadsheetId || '',
  connected: Boolean(state?.initializedAt),
  spreadsheetUrl: state?.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${state.spreadsheetId}/edit#gid=${state.sheetId}` : '',
  sheetTitle: state?.sheetTitle || '', lastSyncedAt: state?.lastSyncedAt || null,
  lastResult: state?.lastResult || null, busy: Boolean(state?.lockUntil && new Date(state.lockUntil) > new Date()),
});

async function writeRanges(client, spreadsheetId, ranges, renew) {
  for (let offset = 0; offset < ranges.length; offset += 200) {
    await renew();
    await googleCall(() => client.spreadsheets.values.batchUpdate({ spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: ranges.slice(offset, offset + 200) } }, { timeout: 30000 }));
  }
}
async function saveBaselines(products, renew) {
  for (let offset = 0; offset < products.length; offset += 200) {
    await renew();
    await ProductSheetRecord.bulkWrite(products.slice(offset, offset + 200).map(product => ({ updateOne: {
      filter: { productId: product._id }, update: { $set: { baseline: productValues(product) } }, upsert: true,
    } })), { ordered: true });
  }
}

const guideRows = [
  ['ViNexus product sheet'],
  ['Edit one product per row, then return to the admin panel and click Sync Products.'],
  ['Keep all headers and existing Product IDs unchanged. Sorting whole rows is supported.'],
  ['Add a row with a unique SKU to create a product. Leave Product ID blank. Blank Status creates a Draft.'],
  ['Published products need their required details, an active brand and category, and at least one image.'],
  ['Status: Published or Draft. Trending, New Arrival and Low Stock: Yes or No. Prices and stock: numbers only.'],
  ['Brand: managed brand name or ID. Categories: full paths or IDs from the reference tab, one per line.'],
  ['Image URLs: full HTTP/HTTPS links, one per line. Existing image metadata is retained for matching URLs.'],
  ['Specifications JSON / Additional Details JSON: [{"key":"Resolution","value":"3MP"}]. Use [] to clear.'],
  ['Empty editable cells clear text/relationships/lists. Set numeric fields to 0 instead of leaving them blank.'],
  ['Removing a row does not delete a product. Missing catalogue products are added back on the next sync. Use Draft to hide a product.'],
  ['Catalogue and sheet changes to different fields merge. Conflicting edits are skipped and reported by row.'],
  ['Finish editing before clicking Sync Products. Wait for it to finish before making further sheet edits.'],
  ['Errors appear in the last column. Correct the row and sync again; successful rows are kept.'],
];

export const productSheetService = {
  async getClient() { return new GoogleSheetsApiProvider().getSheetsClient(); },
  async status() { return publicState(await ProductSheetConnection.findOne({ singletonKey: 'products' }).lean()); },
  async initialize(input) {
    return withLock(async (state, renew) => {
      if (state.initializedAt) return { ...publicState(state), busy: false };
      const spreadsheetId = state.spreadsheetId || spreadsheetIdFrom(input || config.googleProductsSpreadsheetId || config.googleSheetsSpreadsheetId);
      const client = await this.getClient();
      const refs = await references();
      const products = await Product.find().sort({ createdAt: 1, _id: 1 }).lean();
      if (state.sheetId === undefined || state.sheetId === null) {
        const { data } = await googleCall(() => client.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' }, { timeout: 30000 }));
        const titles = new Set((data.sheets || []).map(sheet => sheet.properties.title));
        const unique = base => { let title = base, n = 2; while (titles.has(title)) title = `${base} ${n++}`; titles.add(title); return title; };
        const sheetTitle = unique('ViNexus Products'), referenceTitle = unique('ViNexus Product Reference'), guideTitle = unique('ViNexus Product Guide');
        const added = await googleCall(() => client.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [sheetTitle, referenceTitle, guideTitle].map((title, index) => ({ addSheet: { properties: { title, gridProperties: { rowCount: Math.max(1000, products.length + 100, refs.categories.length + refs.brands.length + 10), columnCount: index === 0 ? HEADERS.length : 6, frozenRowCount: 1 } } } })) } }, { timeout: 30000 }));
        state.spreadsheetId = spreadsheetId;
        state.sheetTitle = sheetTitle;
        state.sheetId = added.data.replies[0].addSheet.properties.sheetId;
        state.referenceTitle = referenceTitle; state.guideTitle = guideTitle;
        state.referenceSheetId = added.data.replies[1].addSheet.properties.sheetId;
        state.guideSheetId = added.data.replies[2].addSheet.properties.sheetId;
        await state.save();
      }
      const ranges = [{ range: `${quote(state.sheetTitle)}!A1:AA1`, values: [HEADERS] }];
      for (let offset = 0; offset < products.length; offset += 200) ranges.push({ range: `${quote(state.sheetTitle)}!A${offset + 2}`, values: products.slice(offset, offset + 200).map(product => exportProductRow(product, refs)) });
      ranges.push({ range: `${quote(state.referenceTitle)}!A1`, values: [['Type', 'Name / Category Path', 'ID', 'Active'],
        ...refs.brands.map(brand => ['Brand', brand.name, String(brand._id), brand.isActive ? 'Yes' : 'No']),
        ...refs.categories.map(category => ['Category', refs.categoryName(category._id), String(category._id), category.isActive ? 'Yes' : 'No'])] });
      ranges.push({ range: `${quote(state.guideTitle)}!A1`, values: guideRows });
      await writeRanges(client, spreadsheetId, ranges, renew);
      const formatRequests = [state.sheetId, state.referenceSheetId, state.guideSheetId].flatMap(sheetId => [
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.5, green: 0, blue: 0.125 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: sheetId === state.sheetId ? HEADERS.length : 4 }, properties: { pixelSize: sheetId === state.guideSheetId ? 800 : 180 }, fields: 'pixelSize' } },
      ]);
      formatRequests.push({ setBasicFilter: { filter: { range: { sheetId: state.sheetId, startRowIndex: 0, endRowIndex: Math.max(products.length + 1, 2), startColumnIndex: 0, endColumnIndex: HEADERS.length } } } });
      for (const column of [0, 1, 3, 17, 21]) formatRequests.push({ repeatCell: { range: { sheetId: state.sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'TEXT' } } }, fields: 'userEnteredFormat.numberFormat' } });
      for (const [column, choices] of [[12, ['Published', 'Draft']], [13, ['Yes', 'No']], [14, ['Yes', 'No']], [15, ['Yes', 'No']], [18, ['text', 'link']]]) {
        formatRequests.push({ setDataValidation: { range: { sheetId: state.sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }, rule: { condition: { type: 'ONE_OF_LIST', values: choices.map(userEnteredValue => ({ userEnteredValue })) }, showCustomUi: true, strict: true } } });
      }
      for (const [column, pattern] of [[9, '#,##0.00'], [10, '#,##0.00'], [11, '0']]) formatRequests.push({ repeatCell: { range: { sheetId: state.sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern } } }, fields: 'userEnteredFormat.numberFormat' } });
      formatRequests.push({ repeatCell: { range: { sheetId: state.guideSheetId }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat.wrapStrategy' } });
      formatRequests.push({ updateDimensionProperties: { range: { sheetId: state.guideSheetId, dimension: 'ROWS', startIndex: 0, endIndex: guideRows.length }, properties: { pixelSize: 50 }, fields: 'pixelSize' } });
      await googleCall(() => client.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: formatRequests } }, { timeout: 30000 }));
      await saveBaselines(products, renew);
      state.initializedAt = new Date(); state.lastSyncedAt = new Date();
      state.lastResult = { exported: products.length, created: 0, updated: 0, unchanged: 0, failed: 0, appended: 0, errors: [] };
      await state.save();
      return { ...publicState(state), busy: false };
    });
  },
  async sync(actor) {
    return withLock(async (state, renew) => {
      if (!state.initializedAt) throw invalid('Create the product sheet before syncing.');
      const client = await this.getClient();
      const refs = await references();
      const { data } = await googleCall(() => client.spreadsheets.values.get({ spreadsheetId: state.spreadsheetId, range: `${quote(state.sheetTitle)}!A:AA`, valueRenderOption: 'UNFORMATTED_VALUE' }, { timeout: 30000 }));
      const rows = data.values || [];
      if (!HEADERS.every((header, index) => rows[0]?.[index] === header)) throw invalid('The product sheet headers changed. Restore the original column names and order before syncing.');
      const entries = rows.slice(1).map((row, index) => ({ row, number: index + 2 })).filter(entry => entry.row.slice(0, 25).some(value => String(value ?? '').trim()));
      const ids = new Set(), skus = new Set();
      for (const { row, number } of entries) {
        const id = String(row[0] || '').trim(), sku = String(row[1] || '').trim().toUpperCase();
        if ((id && ids.has(id)) || (sku && skus.has(sku))) throw invalid(`Duplicate Product ID or SKU on row ${number}. Resolve duplicate rows before syncing.`);
        if (id) ids.add(id); if (sku) skus.add(sku);
      }
      const products = await Product.find().lean();
      const byId = new Map(products.map(product => [String(product._id), product]));
      const bySku = new Map(products.map(product => [product.sku, product]));
      const records = await ProductSheetRecord.find().lean();
      const baselines = new Map(records.map(record => [String(record.productId), record.baseline]));
      const seen = new Set(), ranges = [], completed = [];
      const summary = { created: 0, updated: 0, unchanged: 0, failed: 0, appended: 0, errors: [] };
      for (const { row, number } of entries) {
        await renew();
        let current = null;
        try {
          const { id, payload } = parseProductRow(row, refs);
          current = id ? byId.get(id) : bySku.get(payload.sku);
          if (current) seen.add(String(current._id));
          if (id && !current) throw new Error('This Product ID no longer exists. Remove the stale row; leave Product ID blank only for a new product.');
          let result, label;
          if (current) {
            const baseline = baselines.get(String(current._id));
            if (!baseline) throw new Error('This product has no sheet baseline yet. Remove this row and sync to export the current catalogue version.');
            const changes = mergeSheetChanges(productValues(current), baseline, payload);
            if (Object.keys(changes).length) {
              const update = validateSheetPayload(changes, current);
              if (changes.images) update.expectedImages = (current.images || []).map(image => image.publicId || image.url);
              result = await productService.updateProduct(String(current._id), { ...update, expectedUpdatedAt: current.updatedAt }, actor);
              label = 'Updated'; summary.updated++;
            } else { result = current; label = 'Unchanged'; summary.unchanged++; }
          } else {
            result = await productService.createProduct(validateSheetPayload(payload));
            // Persist identity before writing back to Google, making retries safe after an API failure.
            await ProductSheetRecord.updateOne({ productId: result._id }, { $set: { baseline: payload } }, { upsert: true });
            byId.set(String(result._id), result); bySku.set(result.sku, result);
            label = 'Created'; summary.created++;
          }
          seen.add(String(result._id));
          completed.push(result);
          ranges.push({ range: `${quote(state.sheetTitle)}!A${number}:AA${number}`, values: [exportProductRow(result, refs, label)] });
        } catch (error) {
          const message = error.name === 'ZodError' ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : error.message;
          summary.failed++;
          if (summary.errors.length < 500) summary.errors.push({ row: number, sku: String(row[1] || ''), message: message.slice(0, 1000) });
          else summary.errorsTruncated = true;
          ranges.push({ range: `${quote(state.sheetTitle)}!AA${number}`, values: [[`Error: ${message.slice(0, 1000)}`]] });
          // A row with invalid details still represents its existing product.
          if (byId.has(String(row[0] || ''))) seen.add(String(row[0]));
          else if (bySku.has(String(row[1] || '').trim().toUpperCase())) seen.add(String(bySku.get(String(row[1]).trim().toUpperCase())._id));
        }
      }
      const missing = products.filter(product => !seen.has(String(product._id)));
      if (missing.length) {
        await renew();
        // Grow only this managed tab; never clear or replace the user's workbook.
        const requiredRows = rows.length + missing.length;
        const metadata = await googleCall(() => client.spreadsheets.get({ spreadsheetId: state.spreadsheetId, fields: 'sheets.properties' }, { timeout: 30000 }));
        const properties = metadata.data.sheets.find(sheet => sheet.properties.sheetId === state.sheetId)?.properties;
        if (!properties) throw invalid('The managed product tab was removed. Restore it before syncing.');
        if ((properties.gridProperties?.rowCount || 0) < requiredRows) await googleCall(() => client.spreadsheets.batchUpdate({ spreadsheetId: state.spreadsheetId, requestBody: { requests: [{ appendDimension: { sheetId: state.sheetId, dimension: 'ROWS', length: requiredRows - properties.gridProperties.rowCount + 100 } }] } }, { timeout: 30000 }));
        for (let offset = 0; offset < missing.length; offset += 200) ranges.push({ range: `${quote(state.sheetTitle)}!A${rows.length + offset + 1}`, values: missing.slice(offset, offset + 200).map(product => exportProductRow(product, refs, 'Added from catalogue')) });
        completed.push(...missing); summary.appended = missing.length;
      }
      await writeRanges(client, state.spreadsheetId, ranges, renew);
      await saveBaselines(completed, renew);
      const referenceValues = [['Type', 'Name / Category Path', 'ID', 'Active'], ...refs.brands.map(brand => ['Brand', brand.name, String(brand._id), brand.isActive ? 'Yes' : 'No']), ...refs.categories.map(category => ['Category', refs.categoryName(category._id), String(category._id), category.isActive ? 'Yes' : 'No'])];
      await writeRanges(client, state.spreadsheetId, [{ range: `${quote(state.referenceTitle)}!A1`, values: referenceValues }], renew);
      state.lastSyncedAt = new Date(); state.lastResult = summary; await state.save();
      return { ...publicState(state), busy: false, result: summary };
    });
  },
};
