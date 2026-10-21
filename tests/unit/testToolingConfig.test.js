import { expect, test } from '@jest/globals';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');

test('coverage tooling reads YAML configuration with the patched parser', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vinexus-coverage-config-'));
  try {
    await writeFile(join(directory, 'package.json'), '{"name":"coverage-fixture"}');
    await writeFile(join(directory, '.nycrc.yml'), 'all: true\ncheck-coverage: true\ninclude:\n  - "src/**/*.js"\nreporter:\n  - text\n');
    const config = await loadNycConfig({ cwd: directory });
    expect(config).toMatchObject({ all: true, checkCoverage: true, include: ['src/**/*.js'], reporter: ['text'] });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
