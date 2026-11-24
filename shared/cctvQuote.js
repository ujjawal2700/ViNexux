export const QUOTE_STATES = ['Rajasthan', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry', 'Andaman and Nicobar Islands', 'Lakshadweep', 'Dadra and Nagar Haveli and Daman and Diu'];
export const CCTV_SYSTEMS = [
  { id: 'HD', label: 'HD Camera', description: 'Wired cameras with a DVR / XVR recorder' },
  { id: 'IP', label: 'IP Camera', description: 'Network cameras with an NVR recorder' },
  { id: '4G', label: '4G Camera', description: 'Standalone cameras using a SIM connection' },
  { id: 'WIFI', label: 'WiFi Camera', description: 'Standalone cameras connected to WiFi' },
];
export const QUOTE_PROPERTY_TYPES = ['Residential', 'Small Business', 'Corporate', 'Community & NGO'];
export const QUOTE_KINDS = ['camera', 'dvr', 'nvr', 'hdd', 'memory', 'power', 'rack', 'poe'];
export const quoteKey = (productId, variantId) => `${productId}${variantId ? `:${variantId}` : ''}`;
export const brandKey = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const quoteMoney = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const cheapest = rows => [...rows].sort((a, b) => Number(b.recommended) - Number(a.recommended) || (a.price ?? Infinity) - (b.price ?? Infinity) || a.name.localeCompare(b.name))[0];
// Accessory identities must win over camera-category placement or a mistaken mapping.
export function quotationAccessoryKind(product) {
  const name = [product.name, product.model, product.modelNumber].filter(Boolean).join(' ');
  if (/\b(?:ups|uninterruptible|inverter)\b/i.test(name)) return 'unsupported';
  if (/\bbatter(?:y|ies)\b/i.test(name) && !/\b(?:camera|dome|bullet|turret)\b.*\bbatter(?:y|ies)\b/i.test(name)) return 'unsupported';
  if (/\b(?:dvr|xvr)\b/i.test(name)) return 'dvr';
  if (/\bnvr\b|network.video.recorder/i.test(name)) return 'nvr';
  if (/micro[\s-]?sd|memory.card|\bsd[\s-]?card\b/i.test(name)) return 'memory';
  if (/hard.disk|hard.drive|\bhdd\b|\bssd\b/i.test(name)) return 'hdd';
  if (/\bpoe\b/i.test(name) && /switch/i.test(name)) return 'poe';
  if (/power.supply|\bsmps\b|power.adapt[eo]r/i.test(name)) return 'power';
  if (/\brack\b|cabinet/i.test(name)) return 'rack';
  if (/\b(?:router|switch|cable|connector|bracket|mount|housing|junction.box)\b/i.test(name)) return 'unsupported';
  return null;
}
export const isQuotationCamera = item => item.kind === 'camera' && !quotationAccessoryKind(item) && ['dome', 'bullet'].includes(item.style);
export const cameraOptions = (catalog, selection, style) => catalog.filter(item => isQuotationCamera(item) && item.systemTypes.includes(selection.systemType) && (!selection.brand || brandKey(item.brand) === brandKey(selection.brand)) && item.style === style);
const score = row => Math.min(Number(row.name.match(/(\d+(?:\.\d+)?)\s*mp/i)?.[1]) || 2, 8) + (/colorvu|colourvu|full.colou?r|night.colou?r|illumax/i.test(row.name) ? 2 : 0) + (/audio|mic|two.way/i.test(row.name) ? 1 : 0);
export function recommendedCamera(rows, qty = 1) {
  const available = rows.filter(row => row.stock >= qty && row.price !== 0);
  if (!available.length) return undefined;
  const marked = available.filter(row => row.recommended);
  const minimum = Math.min(...available.map(row => row.price ?? Infinity));
  const budget = available.filter(row => row.price === undefined || row.price <= minimum * 1.6);
  return [...(marked.length ? marked : budget.length ? budget : available)].sort((a, b) => score(b) - score(a) || (a.price ?? Infinity) - (b.price ?? Infinity))[0];
}
export function accessoryDefinitions(catalog, selection) {
  const count = Number(selection.domeCount) + Number(selection.bulletCount);
  const standalone = ['WIFI', '4G'].includes(selection.systemType);
  const available = kind => catalog.filter(item => item.kind === kind);
  const capacity = (rows, minimum) => {
    const suitable = rows.filter(row => row.capacity >= minimum && row.stock > 0).sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.capacity - b.capacity || (a.price ?? Infinity) - (b.price ?? Infinity));
    return suitable[0];
  };
  const memory = available('memory');
  const card = cheapest(memory.filter(row => row.capacity >= 64 && row.stock >= (standalone ? count : 1)));
  const definitions = [{ key: 'storage', kind: standalone ? 'memory' : 'hdd', label: standalone ? 'Memory Card' : 'Hard Disk', required: true, defaultIncluded: true, fixedQty: standalone ? count : 1,
    options: available(standalone ? 'memory' : 'hdd'), recommended: standalone ? card : capacity(available('hdd'), count <= 4 ? 1000 : count <= 8 ? 2000 : 4000) }];
  if (selection.systemType === 'IP') definitions.push({ key: 'poe', kind: 'poe', label: 'PoE Switch', defaultIncluded: true, max: 20, options: available('poe'), recommended: capacity(available('poe'), count) });
  definitions.push({ key: 'power', kind: 'power', label: 'Power Supply', defaultIncluded: selection.systemType === 'HD', max: 20, options: available('power'), recommended: capacity(available('power'), count) },
    { key: 'rack', kind: 'rack', label: 'Rack', defaultIncluded: !standalone, max: 20, options: available('rack'), recommended: cheapest(available('rack').filter(row => row.stock > 0)) });
  if (!standalone) definitions.push({ key: 'memory', kind: 'memory', label: 'Backup Memory Card', defaultIncluded: false, defaultQty: count, max: 64, options: memory, recommended: card });
  return definitions;
}
export function calculateCctvQuote(catalog, selection, settings = {}) {
  const count = Number(selection.domeCount) + Number(selection.bulletCount);
  const issues = [], reasons = [], lines = [];
  if (!CCTV_SYSTEMS.some(row => row.id === selection.systemType) || !Number.isSafeInteger(count) || count < 1 || count > 64 || [selection.domeCount, selection.bulletCount].some(value => !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 50)) issues.push('Choose 1–64 cameras, with no more than 50 of either style.');
  const brand = selection.brand || '';
  const selected = { ...selection, brand };
  const add = (item, qty, label) => {
    if (!item) { reasons.push(`${label} needs a recommendation from our team.`); return; }
    if (item.stock < qty) reasons.push(`${item.name}: availability needs confirmation.`);
    if (item.price === 0) reasons.push(`${item.name}: price needs confirmation.`);
    const existing = lines.find(line => line.key === item.key);
    if (existing) { existing.quantity += qty; existing.amount = existing.unitPrice === undefined ? undefined : Math.round(existing.unitPrice * existing.quantity * 100) / 100; if (existing.quantity > item.stock) reasons.push(`${item.name}: availability needs confirmation.`); }
    else lines.push({ key: item.key, productId: item.productId, variantId: item.variantId || null, name: item.name, modelNumber: item.modelNumber || '', sku: item.sku || '', image: item.image || '', quantity: qty, unitPrice: item.price, amount: item.price === undefined ? undefined : Math.round(item.price * qty * 100) / 100 });
  };
  for (const style of ['dome', 'bullet']) {
    const qty = Number(selection[`${style}Count`]); if (!qty) continue;
    const options = cameraOptions(catalog, selected, style);
    const key = selection[`${style}Key`];
    const item = key ? options.find(item => item.key === key) : recommendedCamera(options, qty);
    if (key && !item) issues.push(`Choose a compatible ${style} camera for this system and brand.`);
    add(item, qty, `${style === 'dome' ? 'Dome' : 'Bullet'} camera`);
  }
  if (['HD', 'IP'].includes(selection.systemType)) {
    let options = catalog.filter(item => item.kind === (selection.systemType === 'HD' ? 'dvr' : 'nvr') && item.capacity >= count && item.stock > 0);
    const sameBrand = options.filter(item => brandKey(item.brand) === brandKey(brand)); if (sameBrand.length) options = sameBrand;
    options.sort((a, b) => a.capacity - b.capacity || (a.price ?? Infinity) - (b.price ?? Infinity));
    add(options[0], 1, selection.systemType === 'HD' ? 'DVR / XVR recorder' : 'NVR recorder');
  }
  for (const def of accessoryDefinitions(catalog, selection)) {
    const choice = selection.accessories?.[def.key] || {};
    if (!(def.required || (choice.included ?? def.defaultIncluded))) continue;
    const item = choice.key ? def.options.find(item => item.key === choice.key) : def.recommended;
    if (choice.key && !item) issues.push(`Choose a compatible ${def.label.toLowerCase()}.`);
    const qty = def.fixedQty ?? Number(choice.quantity ?? def.defaultQty ?? 1);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > (def.max || 64)) issues.push(`Invalid ${def.label.toLowerCase()} quantity.`);
    if (item && ['power', 'poe'].includes(def.kind) && item.capacity * qty < count) reasons.push(`${def.label} capacity needs confirmation.`);
    add(item, qty, def.label);
  }
  const fee = Math.round((settings.installationPerCamera || 0) * count * 100) / 100;
  if (fee > 0) lines.push({ key: 'installation', name: 'Installation service', quantity: count, unitPrice: settings.installationPerCamera, amount: fee });
  const priced = !issues.length && !reasons.length && lines.length > 0 && lines.every(line => Number.isFinite(line.unitPrice));
  const subtotalPaise = lines.reduce((sum, line) => sum + Math.round((line.amount || 0) * 100), 0);
  const taxPaise = lines.reduce((sum, line) => sum + Math.round((line.amount || 0) * (settings.gstRate ?? 18)), 0);
  const interstate = !!selection.state && !!settings.seller?.state && selection.state.toLowerCase() !== settings.seller.state.toLowerCase();
  const totalPaise = Math.round((subtotalPaise + taxPaise) / 100) * 100;
  return { lines, count, brand, issues, reasons: [...new Set(reasons)], priced, subtotal: priced ? subtotalPaise / 100 : null, gstRate: settings.gstRate ?? 18,
    cgst: priced && !interstate ? Math.round(taxPaise / 2) / 100 : 0, sgst: priced && !interstate ? (taxPaise - Math.round(taxPaise / 2)) / 100 : 0, igst: priced && interstate ? taxPaise / 100 : 0,
    roundOff: priced ? (totalPaise - subtotalPaise - taxPaise) / 100 : null, total: priced ? totalPaise / 100 : null };
}
