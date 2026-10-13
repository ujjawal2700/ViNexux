import { isDevelopmentLoopbackAlias } from '../../backend/src/utils/corsOrigin.util.js';
test('local invoice portal can call the API through its configured localhost alias', () => {
  expect(isDevelopmentLoopbackAlias('http://127.0.0.1:3000', ['http://localhost:3000'], 'development')).toBe(true);
});
test.each(['http://127.0.0.1:4000', 'https://127.0.0.1:3000', 'http://malicious.example:3000', 'not-a-url'])('does not allow unmatched local origins: %s', origin => {
  expect(isDevelopmentLoopbackAlias(origin, ['http://localhost:3000'], 'development')).toBe(false);
});
test('production keeps its explicit origin restrictions', () => {
  expect(isDevelopmentLoopbackAlias('http://127.0.0.1:3000', ['http://localhost:3000'], 'production')).toBe(false);
});
