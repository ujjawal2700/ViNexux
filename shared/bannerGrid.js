export const BENTO_TRANSITIONS = ['fade', 'top-to-bottom', 'bottom-to-top', 'left-to-right', 'right-to-left', 'blur', 'pixelate'];
export const BENTO_TRANSITION_LABELS = ['Fade (current effect)', 'Top to bottom', 'Bottom to top', 'Left to right', 'Right to left', 'Blur', 'Pixelate'];
export const BENTO_SECTION_COUNT = 4;
export const BENTO_IMAGE_LIMIT = 3;
export function bannerFramingStyle(image = {}) {
  const x = Math.max(0, Math.min(100, Number(image.positionX ?? 50)));
  const y = Math.max(0, Math.min(100, Number(image.positionY ?? 50)));
  const zoom = Math.max(1, Math.min(3, Number(image.zoom ?? 1)));
  return { objectFit: image.fit || 'cover', objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}
