export const BENTO_SECTION_COUNT = 4;
export const BENTO_IMAGE_LIMIT = 3;
export function bannerFramingStyle(image = {}) {
  const x = Math.max(0, Math.min(100, Number(image.positionX ?? 50)));
  const y = Math.max(0, Math.min(100, Number(image.positionY ?? 50)));
  const zoom = Math.max(1, Math.min(3, Number(image.zoom ?? 1)));
  return { objectFit: image.fit || 'cover', objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}
