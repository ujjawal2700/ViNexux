import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const moduleUrl = new URL('../src/config/env.js', import.meta.url).href;
function loadConfig(overrides = {}) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', `
    try {
      const { config } = await import(${JSON.stringify(moduleUrl)});
      console.log(JSON.stringify([config.otpRequestMax, config.otpRequestWindowMinutes]));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  `], {
    // Prevent local .env values from hiding missing environment settings.
    cwd: tmpdir(), encoding: 'utf8',
    env: { ...process.env, OTP_REQUEST_MAX: '30', OTP_REQUEST_WINDOW_MINUTES: '10', ...overrides },
  });
}

test('uses the exact environment quota and window', () => {
  const result = loadConfig({ OTP_REQUEST_MAX: '47', OTP_REQUEST_WINDOW_MINUTES: '23' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [47, 23]);
});

for (const name of ['OTP_REQUEST_MAX', 'OTP_REQUEST_WINDOW_MINUTES']) {
  for (const value of [undefined, '', '0', '-1', '2.5', 'NaN', 'Infinity']) {
    test(`${name} rejects ${String(value)} instead of using a default`, () => {
      const result = loadConfig({ [name]: value });
      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes(`${name} must be explicitly set to a positive integer`));
    });
  }
}
