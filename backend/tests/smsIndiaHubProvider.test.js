import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config/env.js';
import { SmsIndiaHubOtpProvider } from '../src/integrations/otp/SmsIndiaHubOtpProvider.js';

const provider = new SmsIndiaHubOtpProvider();
const request = { identifier: '9876543210', otp: '123456', purpose: 'login' };

function configure(t) {
  const original = { ...config };
  Object.assign(config, {
    smsApiKey: 'test-api-key', smsSenderId: 'VNXSMS',
    smsBaseUrl: '', smsTemplateId: '', smsRouteId: '', smsPeId: '',
  });
  t.after(() => Object.assign(config, original));
}

test('sends using API-key authentication and documented transactional parameters', async (t) => {
  configure(t);
  config.smsTemplateId = 'test-template-id';
  config.smsRouteId = '02';
  config.smsPeId = '10000000000000001';
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin + url.pathname, 'https://cloud.smsindiahub.in/api/mt/SendSMS');
    assert.equal(options.method, 'GET');
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      APIKey: 'test-api-key', number: '919876543210', senderid: 'VNXSMS',
      text: 'Dear customer 123456 is your mobile OTP verification code .do not share it with anyone.SCHTRD',
      channel: 'Trans', DCS: '0', flashsms: '0', DLTTemplateId: 'test-template-id',
      route: '02', PEId: '10000000000000001',
    });
    return Response.json({ ErrorCode: '000', JobId: 'job-1', MessageData: [{ MessageId: 'message-1' }] });
  });
  assert.deepEqual(await provider.sendOtp(request), {
    success: true, provider: 'smsindiahub', messageId: 'message-1',
  });
});

test('preserves account-specific endpoint query parameters and accepts a job ID', async (t) => {
  configure(t);
  config.smsBaseUrl = 'https://example.test/api/mt/SendSMS?route=1';
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get('route'), '1');
    assert.equal(url.searchParams.has('TemplateId'), false);
    assert.equal(url.searchParams.has('DLTTemplateId'), false);
    assert.equal(url.searchParams.has('PEId'), false);
    return Response.json({ ErrorCode: '000', JobId: 'job-1' });
  });
  assert.equal((await provider.sendOtp(request)).messageId, 'job-1');
});

test('environment route and PE ID override stale endpoint query values', async (t) => {
  configure(t);
  config.smsBaseUrl = 'https://example.test/api/mt/SendSMS?route=old&PEId=old';
  config.smsRouteId = '03';
  config.smsPeId = '10000000000000002';
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    assert.deepEqual(url.searchParams.getAll('route'), ['03']);
    assert.deepEqual(url.searchParams.getAll('PEId'), ['10000000000000002']);
    return Response.json({ ErrorCode: '000', JobId: 'job-1' });
  });
  assert.equal((await provider.sendOtp(request)).success, true);
});

test('rejects a missing API key before contacting the gateway', async (t) => {
  configure(t);
  config.smsApiKey = '';
  const fetchMock = t.mock.method(globalThis, 'fetch', () => assert.fail('Must not send SMS'));
  await assert.rejects(provider.sendOtp(request), /API key is missing/);
  assert.equal(fetchMock.mock.callCount(), 0);
});

for (const [name, response, stage] of [
  ['HTTP errors', () => new Response('', { status: 503 }), 'http-status'],
  ['provider errors returned with HTTP 200', () => Response.json({ ErrorCode: '002', ErrorMessage: 'Invalid credentials' }), 'provider-status'],
  ['malformed responses', () => new Response('ERR: rejected test-api-key 123456'), 'response-json'],
  ['success without a message ID', () => Response.json({ ErrorCode: '000' }), 'message-id'],
  ['network errors', () => { throw new TypeError('URL contains test-api-key 123456', { cause: { code: 'ENOTFOUND' } }); }, 'connection'],
]) {
  test(`rejects ${name}`, async (t) => {
    configure(t);
    const log = t.mock.method(console, 'error', () => {});
    t.mock.method(globalThis, 'fetch', async () => response());
    await assert.rejects(provider.sendOtp(request), (error) => {
      assert.equal(error.statusCode, 502);
      assert.match(error.message, /Failed to deliver OTP SMS/);
      assert.equal(error.message.includes('test-api-key'), false);
      return true;
    });
    const diagnostic = log.mock.calls.at(-1).arguments;
    assert.equal(diagnostic[1].stage, stage);
    if (stage === 'connection') assert.equal(diagnostic[1].networkCode, 'ENOTFOUND');
    const output = JSON.stringify(log.mock.calls.map(call => call.arguments));
    assert.equal(output.includes('test-api-key'), false);
    assert.equal(output.includes('123456'), false);
  });
}
