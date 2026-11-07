import { expect, test } from '@jest/globals';
import { compressBannerVideo } from '../../backend/src/services/bannerVideo.service.js';
import { suitableBannerConnection, bannerVideoMime } from '../../shared/bannerMedia.js';
import { bannerVideoFixture } from '../helpers/bannerVideoFixture.js';

test('compresses real video to fast-start MP4 and generates a separate WebP thumbnail', async () => {
  const source = bannerVideoFixture();
  const result = await compressBannerVideo({ buffer: source });
  expect(result.buffer.length).toBeLessThan(source.length);
  expect(result.duration).toBeCloseTo(1, 0);
  expect(result.buffer.indexOf(Buffer.from('moov'))).toBeLessThan(result.buffer.indexOf(Buffer.from('mdat')));
  expect(result.poster.subarray(8, 12).toString()).toBe('WEBP');
  expect(result.originalBytes).toBe(source.length);
}, 30000);
test('invalid containers are rejected before encoding', async () => {
  await expect(compressBannerVideo({ buffer: Buffer.from('<script>bad video</script>') })).rejects.toMatchObject({ statusCode: 400 });
});
test('only stable connections qualify for automatic video loading', () => {
  const fast = { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false };
  expect(suitableBannerConnection(fast)).toBe(true);
  for (const patch of [{ effectiveType: '3g' }, { saveData: true }, { downlink: .5 }, { rtt: 500 }]) expect(suitableBannerConnection({ ...fast, ...patch })).toBe(false);
  expect(suitableBannerConnection(undefined)).toBe(false); expect(suitableBannerConnection(fast, false)).toBe(false);
  expect(bannerVideoMime('clip.MP4', 'application/octet-stream')).toBe('video/mp4');
  expect(bannerVideoMime('clip.mp4', 'image/png')).toBeNull();
});
