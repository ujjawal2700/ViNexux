export const ids = Array.from({ length: 12 }, (_, index) => `507f1f77bcf86cd7994390${String(index + 11).padStart(2, '0')}`);
const item = (index, name, kind, price, extra = {}) => ({ key: ids[index], productId: ids[index], variantId: null, name, sku: `CCTV-${index}`, modelNumber: `MODEL-${index}`, brand: 'CP Plus', image: '', kind, systemTypes: [], style: 'other', capacity: 0, stock: 100, price, recommended: false, ...extra });
export const cctvCatalog = [
  item(0, 'CP Plus 3MP WiFi Dome Camera', 'camera', 2599, { systemTypes: ['WIFI', '4G'], style: 'dome' }),
  item(1, 'CP Plus Micro SD Card 64GB', 'memory', 1031, { capacity: 64 }),
  item(2, 'CP Plus 2MP HD Dome Camera', 'camera', 1000, { systemTypes: ['HD'], style: 'dome' }),
  item(3, 'CP Plus 2MP HD Bullet Camera', 'camera', 1200, { systemTypes: ['HD'], style: 'bullet' }),
  item(4, 'CP Plus 4CH DVR', 'dvr', 3000, { capacity: 4 }),
  item(5, 'Seagate Surveillance 1TB Hard Disk', 'hdd', 4000, { capacity: 1000 }),
  item(6, 'CP Plus Premium 4CH Power Supply', 'power', 500, { capacity: 4 }),
  item(7, '4U Rack', 'rack', 600),
  item(8, 'CP Plus IP Dome Camera', 'camera', 2000, { systemTypes: ['IP'], style: 'dome' }),
  item(9, 'CP Plus 8CH NVR', 'nvr', 4000, { capacity: 8 }),
  item(10, '8 Port PoE Switch', 'poe', 2000, { capacity: 8 }),
  item(11, '2TB Hard Disk', 'hdd', 6000, { capacity: 2000 }),
];
cctvCatalog.push({ ...cctvCatalog[0], key: '507f1f77bcf86cd799439099', productId: '507f1f77bcf86cd799439099', name: 'CP Plus 3MP WiFi Bullet Camera', style: 'bullet' });
export const quoteSelectionFixture = { systemType: 'WIFI', domeCount: 2, bulletCount: 2, brand: 'CP Plus', domeKey: '', bulletKey: '', mobileView: true, accessories: {}, area: 'Kota City', propertyType: 'Residential', state: 'Rajasthan' };
export const quoteCustomerFixture = { name: 'Quote Customer', company: '', phone: '9876543210', email: 'quote@example.test', address: '123 Test Road, Kota, Rajasthan', hasGst: false, gstin: '', service: 'CCTV Installation & Support', requirementType: 'New Installation', location: 'Kota City', siteType: 'Home', quantityDescription: '4 cameras', message: 'Please quote for my CCTV installation.', preferredContact: 'email', preferredTime: 'Anytime' };
export const quoteSettingsFixture = { enabled: true, areas: ['Kota City', 'Outside Kota'], installationPerCamera: 0, gstRate: 18, validityDays: 7, terms: 'Availability and compatibility subject to confirmation.', seller: { name: 'ViNexus', address: 'Test Business Road, Kota', state: 'Rajasthan', gstin: '08CQQPM3652N1Z1', email: 'business@example.test', phone: '9876543210' }, mappings: [], revision: 0 };
