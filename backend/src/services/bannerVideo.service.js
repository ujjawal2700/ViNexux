import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { BANNER_VIDEO_MAX_BYTES, BANNER_VIDEO_MAX_SECONDS } from '../../../shared/bannerMedia.js';
import { AppError } from '../utils/AppError.js';
const run = promisify(execFile);
let encoding = false;
export async function compressBannerVideo(file) {
  if (encoding) throw new AppError('Another banner video is being optimized. Please retry shortly.', 429, 'VIDEO_BUSY');
  const buffer = file?.buffer;
  const mp4 = buffer?.length > 12 && ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(buffer.subarray(4, 8).toString());
  const webm = buffer?.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (!buffer?.length || buffer.length > BANNER_VIDEO_MAX_BYTES || (!mp4 && !webm)) throw new AppError('Choose a valid MP4, WebM or MOV video up to 50 MB.', 400, 'INVALID_VIDEO');
  encoding = true;
  let directory;
  try {
    directory = await mkdtemp(join(tmpdir(), 'vinexus-banner-'));
    const source = join(directory, 'source'), output = join(directory, 'banner.mp4'), poster = join(directory, 'poster.webp');
    await writeFile(source, buffer, { flag: 'wx' });
    const { stdout } = await run(process.env.FFPROBE_PATH || ffprobeStatic.path, ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', source], { timeout: 15000, maxBuffer: 1024 * 1024 });
    const info = JSON.parse(stdout), stream = info.streams?.find(item => item.codec_type === 'video'), duration = Number(info.format?.duration);
    if (!stream || !Number.isFinite(duration) || duration <= 0 || duration > BANNER_VIDEO_MAX_SECONDS || stream.width > 4096 || stream.height > 4096 || stream.width < 2 || stream.height < 2) throw new AppError('Banner videos must be 60 seconds or shorter, with dimensions between 2 and 4096 pixels.', 400, 'INVALID_VIDEO');
    const ffmpeg = process.env.FFMPEG_PATH || ffmpegStatic;
    const options = { timeout: 120000, maxBuffer: 2 * 1024 * 1024 };
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-i', source, '-map', '0:v:0', '-an', '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=24", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-maxrate', '1400k', '-bufsize', '2800k', '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-map_metadata', '-1', '-y', output], options);
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-ss', String(Math.min(duration / 10, 1)), '-i', output, '-frames:v', '1', '-vf', "scale='min(960,iw)':'min(960,ih)':force_original_aspect_ratio=decrease", '-c:v', 'libwebp', '-quality', '78', '-threads', '2', '-y', poster], options);
    const [video, thumbnail] = await Promise.all([readFile(output), readFile(poster)]);
    if (video.length > 12 * 1024 * 1024) throw new AppError('This video is still too large after compression. Use a shorter promotional clip.', 400, 'INVALID_VIDEO');
    return { buffer: video, poster: thumbnail, duration, originalBytes: buffer.length };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('This video could not be optimized. Try a valid MP4, WebM or MOV clip no longer than 60 seconds. Check that the server video encoder is installed.', 422, 'VIDEO_ENCODING_FAILED');
  } finally { encoding = false; if (directory) await rm(directory, { recursive: true, force: true }); }
}
