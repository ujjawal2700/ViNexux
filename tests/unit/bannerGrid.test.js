import { describe, expect, test } from '@jest/globals';
import { bannerFramingStyle } from '../../shared/bannerGrid.js';
import { gridImageInput, gridSectionInput } from '../../backend/src/routes/bannerGrid.routes.js';
describe('bento banner grid', () => {
  test('safe destinations, bounded captions and optimistic revisions', () => {
    expect(gridImageInput.safeParse({ revision: '0', link: '/products' }).success).toBe(true);
    expect(gridImageInput.safeParse({ revision: 2, fit: 'contain', link: 'https://example.com' }).success).toBe(true);
    for (const link of ['javascript:alert(1)', '//evil.example', 'data:text/html,hello']) expect(gridImageInput.safeParse({ revision: 0, link }).success).toBe(false);
    expect(gridImageInput.safeParse({ revision: -1 }).success).toBe(false);
    expect(gridImageInput.safeParse({ revision: 0, title: 'x'.repeat(151) }).success).toBe(false);
    expect(gridImageInput.safeParse({ revision: 0, zoom: 4 }).success).toBe(false);
    expect(gridImageInput.safeParse({ revision: 0, positionX: -1 }).success).toBe(false);
    expect(gridImageInput.safeParse({ revision: 0, positionY: 101 }).success).toBe(false);
    expect(gridImageInput.parse({ revision: 0, zoom: '1.5', positionX: '25' }).zoom).toBe(1.5);
  });
  test('section transitions accept supported effects and require a valid revision', () => {
    for (const transition of ['fade', 'top-to-bottom', 'bottom-to-top', 'left-to-right', 'right-to-left', 'blur', 'pixelate']) {
      expect(gridSectionInput.safeParse({ transition, revision: 0 }).success).toBe(true);
    }
    expect(gridSectionInput.safeParse({ transition: 'unknown', revision: 0 }).success).toBe(false);
    expect(gridSectionInput.safeParse({ transition: 'fade', revision: -1 }).success).toBe(false);
    expect(gridSectionInput.safeParse({ transition: 'fade' }).success).toBe(false);
  });
  test('preview and storefront share bounded non-destructive framing', () => {
    expect(bannerFramingStyle({ zoom: 2, positionX: 20, positionY: 80 })).toEqual({ objectFit: 'cover', objectPosition: '20% 80%', transform: 'scale(2)', transformOrigin: '20% 80%' });
    expect(bannerFramingStyle().transform).toBe('scale(1)');
  });
});
