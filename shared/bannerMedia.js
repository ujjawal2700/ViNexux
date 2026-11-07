export const BANNER_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const BANNER_VIDEO_MAX_SECONDS = 60;
export const BANNER_MEDIA_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,.svg,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
export function bannerVideoMime(name, mime = '') {
  const extension = String(name).split('.').at(-1).toLowerCase();
  const expected = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' }[extension];
  return expected && (!mime || mime === 'application/octet-stream' || mime.toLowerCase() === expected) ? expected : null;
}
export const isBannerVideo = asset => asset?.mediaType === 'video';

export function suitableBannerConnection(connection, online = true) {
  return online && !!connection && !connection.saveData && connection.effectiveType === '4g' && Number(connection.downlink) >= 2.5 && Number(connection.rtt || 0) <= 300;
}
