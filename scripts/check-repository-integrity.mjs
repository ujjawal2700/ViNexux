import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const refIndex = process.argv.indexOf('--ref');
const ref = refIndex < 0 ? null : process.argv[refIndex + 1];
if (refIndex >= 0 && !ref) throw new Error('--ref requires a commit or : for the index');
const paths = (ref && ref !== ':'
  ? git(['ls-tree', '-r', '--name-only', '-z', ref])
  : git(['ls-files', '-z', ...(ref ? [] : ['--cached', '--others', '--exclude-standard'])]))
  .split('\0').filter(Boolean);
const read = path => ref ? git(['show', `${ref === ':' ? '' : ref}:${path}`]) : readFileSync(new URL(path, new URL('../', import.meta.url)), 'utf8');
const failures = [];
const forbidden = ['backend/init', 'frontend/init', 'backend/api.js', 'scratch/setup_env_credentials.js'];
for (const path of forbidden) {
  if (paths.includes(path) || (!ref && existsSync(new URL(path, new URL('../', import.meta.url))))) failures.push(`Unexpected loader or credential setup file: ${path}`);
}
for (const path of new Set(paths)) {
  if (/\.(?:[cm]?js|jsx|tsx?|json|html|sh|ya?ml)$/.test(path)) {
    const source = read(path);
    if (/_0x[0-9a-f]{4,}/i.test(source) || /global\[['"]!['"]\]/.test(source) || /[\t ]{150,}/.test(source) || /^(?:<{7}|>{7})(?: |$)/m.test(source)) {
      failures.push(`Known injection signature or unresolved conflict: ${path}`);
    }
  }
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) failures.push(`Tracked environment file: ${path}`);
}
for (const [path, expected] of [
  ['backend/package.json', { start: 'node src/server.js', dev: 'nodemon src/server.js' }],
  ['frontend/package.json', { dev: 'vite', build: 'vite build' }],
]) {
  const scripts = JSON.parse(read(path)).scripts;
  for (const [key, value] of Object.entries(expected)) {
    if (scripts[key] !== value) failures.push(`Unexpected ${key} command in ${path}`);
  }
  for (const key of ['preinstall', 'install', 'postinstall', 'prepare', 'prestart', 'predev', 'prebuild']) {
    if (scripts[key]) failures.push(`Unreviewed lifecycle command ${key} in ${path}`);
  }
}
const vite = read('frontend/vite.config.js');
if (/createRequire|global\s*\[|\beval\s*\(|\bnew\s+Function\b/.test(vite) || !vite.trimEnd().endsWith('});')) failures.push('Unexpected Vite runtime code');
const ignore = read('.gitignore').split(/\r?\n/);
for (const rule of ['.env', '.env.*', '**/.env', '**/.env.*']) {
  if (!ignore.includes(rule)) failures.push(`Missing environment ignore rule: ${rule}`);
}
if (failures.length) {
  console.error(`Repository integrity check failed:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Repository integrity passed${ref ? ` (${ref})` : ''}.`);
