import { describe, expect, test } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Static checks only: never import a build config or execute suspect code.
const indicators = [
  /_0x[0-9a-f]{4,}/i,
  /global\[['"]!['"]\]/,
  /[\t ]{150,}/,
  /^(?:<{7}|>{7})(?: |$)/m,
];
const suspicious = source => indicators.some(pattern => pattern.test(source));

describe('repository integrity', () => {
  test('detects hidden obfuscated loaders and unresolved conflicts', () => {
    expect(suspicious('const ' + '_0x' + '5983e1 = payload;')).toBe(true);
    expect(suspicious('});' + '\t'.repeat(200) + 'payload();')).toBe(true);
    expect(suspicious('<'.repeat(7) + ' HEAD')).toBe(true);
    expect(suspicious('export default { plugins: [] };')).toBe(false);
  });

  test('project sources and configuration contain no known injection signatures', () => {
    const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
    const matches = [...new Set(paths.split('\0'))].filter(path => {
      if (!/\.(?:[cm]?js|jsx|tsx?|json|html|sh|ya?ml)$/.test(path)) return false;
      const absolute = resolve(root, path);
      return existsSync(absolute) && suspicious(readFileSync(absolute, 'utf8'));
    });
    expect(matches).toEqual([]);
  });

  test('backend startup launches only the application entry point', () => {
    const backend = JSON.parse(readFileSync(resolve(root, 'backend/package.json'), 'utf8'));
    expect(backend.scripts.start).toBe('node src/server.js');
    expect(backend.scripts.dev).toBe('nodemon src/server.js');
    expect(existsSync(resolve(root, 'backend/api.js'))).toBe(false);
  });

  test('Vite has no injected require bridge or appended top-level script', () => {
    const config = readFileSync(resolve(root, 'frontend/vite.config.js'), 'utf8');
    expect(config).not.toMatch(/createRequire|global\s*\[|\beval\s*\(|\bnew\s+Function\b/);
    expect(config.trimEnd().endsWith('});')).toBe(true);
  });
});
