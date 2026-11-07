import { execFileSync } from 'node:child_process';
import ffmpeg from '../../backend/node_modules/ffmpeg-static/index.js';
let buffer;
export const bannerVideoFixture = () => buffer ||= execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=24', '-t', '1', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-threads', '1', '-pix_fmt', 'yuv420p', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1'], { maxBuffer: 4 * 1024 * 1024 });
