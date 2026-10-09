export const DEFAULT_QUICK_SPEC_KEYS = [
  'Processor', 'RAM', 'Storage', 'Graphics', 'Display', 'Resolution', 'Ports',
  'Weight', 'Operating System', 'Battery', 'Dimensions', 'Warranty', 'Connectivity',
];

// Imported catalogs use different separators and labels for internal inventory.
export const isInventorySpecification = (key) => {
  const normalized = String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return /stock|inventory/.test(normalized)
    || /^(quantity|qty|availablequantity|availableqty|availableunits|unitsavailable|unitsleft|remainingunits|remainingquantity)$/.test(normalized);
};
