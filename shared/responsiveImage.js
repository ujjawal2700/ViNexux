// Only transform unsigned original Cloudinary image URLs. Leave custom/signed
// transformations, local files and other providers untouched.
export function responsiveImage(url, { widths = [160, 320, 480, 640, 960], sizes = '(max-width: 640px) 50vw, 320px' } = {}) {
  if (typeof url !== 'string') return { src: url };
  let parsed;
  try { parsed = new URL(url); } catch { return { src: url }; }
  if (parsed.hostname !== 'res.cloudinary.com' || parsed.search || !/^\/[^/]+\/image\/upload\/v\d+\//.test(parsed.pathname)) return { src: url };
  const variant = width => url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
  return { src: variant(widths.at(-1)), srcSet: widths.map(width => `${variant(width)} ${width}w`).join(', '), sizes };
}
export const logoImage = url => responsiveImage(url, { widths: [80, 160, 240], sizes: '120px' });

export function bannerImage(asset, section = 0) {
  const url = asset?.mediaType === 'video' ? asset.posterUrl : asset?.url;
  return responsiveImage(url, { widths: section === 1 ? [160, 320, 480, 640, 800] : [320, 640, 960, 1280, 1600], sizes: section === 1 ? '25vw' : '75vw' });
}
