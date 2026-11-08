import { test, expect } from '@jest/globals';
import { responsiveImage, logoImage } from '../../frontend/src/utils/responsiveImage.js';
import { themeAssetUrl, themeVariables, presetConfig } from '../../shared/seasonalThemes.js';

test('original Cloudinary images provide responsive, width-limited modern formats', () => {
  const url = 'https://res.cloudinary.com/store/image/upload/v123/products/cable.webp';
  const image = responsiveImage(url);
  expect(image.src).toContain('/f_auto,q_auto,c_limit,w_960/v123/');
  expect(image.srcSet).toContain('w_320/v123/products/cable.webp 320w');
  expect(image.sizes).toContain('50vw');
  expect(logoImage(url).src).toContain('w_240');
});
test('signed, transformed, local, video and unrelated image URLs are preserved', () => {
  for (const url of [undefined, '/logo.png', 'https://example.com/image/upload/v123/a.png', 'https://res.cloudinary.com/store/video/upload/v123/a.mp4', 'https://res.cloudinary.com/store/image/upload/s--signature--/v123/a.png', 'https://res.cloudinary.com/store/image/upload/c_crop/v123/a.png', 'https://res.cloudinary.com/store/image/upload/v123/a.png?signature=secret']) expect(responsiveImage(url)).toEqual({ src: url });
});
test('saved bundled PNG themes use optimized assets without replacing custom artwork', () => {
  expect(themeAssetUrl('/theme-assets/diwali/header-marigold.png')).toBe('/theme-assets/diwali/header-marigold-v1.webp');
  expect(themeVariables(presetConfig('diwali'))['--store-background-image']).toContain('section-background-v1.webp');
  expect(themeAssetUrl('https://other.example/theme-assets/diwali/header-marigold.png')).toBe('https://other.example/theme-assets/diwali/header-marigold.png');
});
