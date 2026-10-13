const labels = { name: 'Name', phone: 'Phone', whatsappNumber: 'WhatsApp number', email: 'Email', address: 'Street address', city: 'City',
  state: 'State', stateCode: 'GST state code', pincode: 'PIN code', gstin: 'GSTIN', quantity: 'Quantity', unitPrice: 'Unit price',
  discountPercent: 'Discount', gstRate: 'GST rate', hsn: 'HSN/SAC', unit: 'Unit', serialNumbers: 'Serial numbers', productId: 'Product',
  method: 'Payment method', amount: 'Payment amount', specifications: 'Product specifications', key: 'Specification name', value: 'Specification value' };

export function posFieldLabel(path, items = []) {
  const parts = String(path || '').split('.');
  const prefix = parts[0] === 'customer' ? 'Customer' : parts[0] === 'shipping' ? 'Shipping address'
    : parts[0] === 'items' ? items[Number(parts[1])]?.productName || `Product ${Number(parts[1]) + 1}`
    : parts[0] === 'payments' ? 'Payment' : parts[0] === 'seller' ? 'Invoice setup'
      : parts[0] === 'specifications' ? 'Product catalogue → Specifications' : 'Bill';
  return `${prefix} → ${labels[parts.at(-1)] || labels[parts[0]] || parts.at(-1) || 'Details'}`;
}

export function validatePosCustomer(customer, prefix = 'customer') {
  const issues = [], add = (field, message) => issues.push({ path: `${prefix}.${field}`, message });
  const required = { name: [2, 100], address: [3, 500], city: [2, 100], state: [2, 100] };
  for (const [field, [min, max]] of Object.entries(required)) {
    const length = String(customer?.[field] || '').trim().length;
    if (length < min || length > max) add(field, `Enter ${min} to ${max} characters.`);
  }
  for (const field of ['phone', 'whatsappNumber']) {
    const value = String(customer?.[field] || '').trim();
    if (!/^\+?[\d\s()-]{10,20}$/.test(value)) add(field, 'Enter a valid phone number with country code.');
  }
  if (prefix === 'customer') {
    let phone = String(customer?.phone || '').replace(/\D/g, '');
    if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
    if (!/^[6-9]\d{9}$/.test(phone) && !issues.some(issue => issue.path === `${prefix}.phone`)) add('phone', 'Enter a valid Indian mobile number.');
  }
  if (!/^\d{6}$/.test(customer?.pincode || '')) add('pincode', 'Enter a 6-digit PIN code.');
  if (!/^\d{2}$/.test(customer?.stateCode || '')) add('stateCode', 'Enter a 2-digit GST state code.');
  const email = String(customer?.email || '').trim();
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150)) add('email', 'Enter a valid email address or leave it blank.');
  const gstin = String(customer?.gstin || '').trim().toUpperCase();
  if (gstin && !/^\d{2}[A-Z0-9]{13}$/.test(gstin)) add('gstin', 'Enter a 15-character GSTIN or leave it blank.');
  else if (gstin && !gstin.startsWith(customer.stateCode)) add('gstin', 'The first two GSTIN digits must match the GST state code.');
  return issues;
}

export function validatePosItems(items = []) {
  const issues = [], ids = new Set(), serials = new Set();
  if (!Array.isArray(items)) return [{ path: 'items', message: 'Reload the product list and add products to the bill.' }];
  if (!items.length || items.length > 100) issues.push({ path: 'items', message: 'Add between 1 and 100 products.' });
  items.forEach((item, index) => {
    const add = (field, message) => issues.push({ path: `items.${index}.${field}`, message });
    if (!/^[a-f\d]{24}$/i.test(item.productId || '') || ids.has(item.productId)) add('productId', 'Remove this line and add the product once from the catalogue.');
    ids.add(item.productId);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) add('quantity', 'Enter a whole number from 1 to 10,000.');
    else if (Number.isFinite(item.stockQuantity) && item.quantity > item.stockQuantity) add('quantity', `Only ${item.stockQuantity} units are available.`);
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0 || item.unitPrice > 100000000 || Math.abs(item.unitPrice * 100 - Math.round(item.unitPrice * 100)) > 0.00001) add('unitPrice', 'Enter a non-negative price with at most two decimal places.');
    for (const field of ['discountPercent', 'gstRate']) if (!Number.isFinite(item[field]) || item[field] < 0 || item[field] > 100) add(field, 'Enter a percentage between 0 and 100.');
    if (!/^\d{4,8}$/.test(String(item.hsn || '').trim())) add('hsn', 'Enter the 4 to 8 digit code from the product or supplier invoice.');
    if (!String(item.unit || '').trim() || String(item.unit).trim().length > 10) add('unit', 'Enter a unit of up to 10 characters, such as NOS.');
    const values = item.serialNumbers || [];
    if (!Array.isArray(values) || values.length > Math.min(100, item.quantity)) add('serialNumbers', 'Enter no more serial numbers than the sold quantity (maximum 100).');
    else for (const value of values) {
      if (typeof value !== 'string') { add('serialNumbers', 'Enter serial numbers as text.'); continue; }
      if (!value.trim() || value.trim().length > 100 || serials.has(value.trim())) add('serialNumbers', 'Use unique serial numbers of up to 100 characters.');
      serials.add(value.trim());
    }
  });
  return issues;
}

export function validatePosDraft(draft) {
  return [...validatePosCustomer(draft.customer), ...(draft.shipping ? validatePosCustomer(draft.shipping, 'shipping') : []), ...validatePosItems(draft.items)];
}
