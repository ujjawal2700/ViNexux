import { describe, expect, test } from '@jest/globals';
import { applySpecificationTemplate } from '../../shared/specificationTemplates.js';
import { createSpecificationTemplateSchema, updateSpecificationTemplateSchema } from '../../backend/src/validators/specificationTemplate.validator.js';
import { productShareDescription, renderSocialHtml } from '../../shared/socialMetadata.js';
const specs = [{ key: 'Resolution', value: '4 MP' }, { key: 'Power', value: 'PoE' }];
describe('specification template snapshots', () => {
  test('empty products receive ordered, independent editable specifications', () => {
    const result = applySpecificationTemplate([], specs);
    expect(result).toEqual(specs);
    result[0].value = '8 MP'; expect(specs[0].value).toBe('4 MP');
  });
  test('existing values survive case/whitespace variations; blank groups are filled', () => {
    const current = [{ key: 'resolution', value: '8 MP' }, { key: '  POWER ', value: '' }, { key: 'Lens', value: '2.8 mm' }];
    expect(applySpecificationTemplate(current, specs)).toEqual([{ key: 'resolution', value: '8 MP' }, { key: 'Lens', value: '2.8 mm' }, { key: 'Power', value: 'PoE' }]);
  });
  test('multi-select specifications retain distinct values without adding duplicates on reapply', () => {
    const template = [{ key: 'Connectivity', value: 'WiFi' }, { key: 'Connectivity', value: 'Ethernet' }];
    expect(applySpecificationTemplate([], template)).toEqual(template);
    expect(applySpecificationTemplate(template, template)).toEqual(template);
  });
  test('template validation accepts multiple product types and ordered key/value rows', () => {
    const result = createSpecificationTemplateSchema.body.parse({ name: 'PoE cameras', specifications: specs });
    expect(result.specifications).toEqual(specs);
    expect(createSpecificationTemplateSchema.body.safeParse({ name: 'Network switches', specifications: [{ key: 'Ports', value: '8' }] }).success).toBe(true);
  });
  test.each([[], [{ key: '', value: '4 MP' }], [{ key: 'Resolution', value: '' }], [{ key: 'Inventory', value: '20' }], [{ key: 'Power', value: 'PoE' }, { key: ' power ', value: 'poe' }]].map(specifications => [specifications]))('rejects invalid or duplicate specification pairs: %j', specifications => {
    expect(createSpecificationTemplateSchema.body.safeParse({ name: 'Camera', specifications }).success).toBe(false);
  });
  test('concurrent template updates require a client revision', () => {
    expect(updateSpecificationTemplateSchema.body.safeParse({ name: 'Cameras', specifications: specs }).success).toBe(false);
    expect(updateSpecificationTemplateSchema.body.safeParse({ name: 'Cameras', specifications: specs, expectedRevision: 0 }).success).toBe(true);
  });
});
describe('product sharing basics', () => {
  test('previews include model and basic specs in saved order without inventory values', () => {
    const description = productShareDescription({ modelNumber: 'IPC-4MP', specifications: [{ key: 'Stock', value: '99' }, ...specs, { key: 'Lens', value: '2.8 mm' }], description: 'Long marketing text' });
    expect(description).toBe('Model: IPC-4MP · Resolution: 4 MP · Power: PoE · Lens: 2.8 mm');
    expect(description).not.toContain('99');
  });
  test('multiple values are grouped and descriptions stay within the preview limit', () => {
    expect(productShareDescription({ specifications: [{ key: 'Ports', value: 'USB' }, { key: 'Ports', value: 'RJ45' }] })).toBe('Ports: USB, RJ45');
    expect(productShareDescription({ specifications: Array.from({ length: 10 }, (_, index) => ({ key: `Spec ${index}`, value: 'x'.repeat(2000) })) }).length).toBeLessThanOrEqual(300);
  });
  test('initial HTML includes image name, title, image and specifications with safe escaping', () => {
    const html = renderSocialHtml('<head><meta property="og:image" content="generic.png"></head>', { pathname: '/products/507f1f77bcf86cd799439011', origin: 'https://vinexus.com', product: { name: 'PoE & CCTV Adapter', images: [{ url: '/adapter.webp' }], specifications: [{ key: 'Power', value: '12V & 2A' }] } });
    expect(html).toContain('og:image:alt" content="PoE &amp; CCTV Adapter"');
    expect(html).toContain('og:description" content="Power: 12V &amp; 2A"');
    expect(html).not.toContain('generic.png');
    expect(html.indexOf('og:image" content=')).toBeLessThan(html.indexOf('og:image:alt" content='));
  });
});
