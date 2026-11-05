import { parse } from '@babel/parser';

function nodes(source) {
  const result = [];
  const pending = [parse(source, { sourceType: 'module' })];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    if (typeof node.type === 'string') result.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  return result;
}

// Use the same Firebase adapter fixture in source modules and compiled assets.
// Only the browser's fetched response is changed; build files stay untouched.
export function mockCompiledFirebase(source, fixture) {
  const bundleNodes = nodes(source);
  const bindings = bundleNodes.filter(node => node.type === 'VariableDeclarator');
  const findAdapter = marker => {
    const matches = bindings.filter(node =>
      node.init?.type === 'ArrowFunctionExpression'
      && source.slice(node.init.start, node.init.end).includes(marker));
    if (matches.length !== 1) throw new Error(`Expected one Firebase adapter containing: ${marker}`);
    return matches[0];
  };
  const token = findAdapter('[Push] Failed to acquire FCM token:');
  const foreground = findAdapter('[Push] Failed to attach foreground message listener:');
  const firstCheck = token.init.body.body[0];
  let condition = firstCheck.test;
  while (condition?.type === 'LogicalExpression') condition = condition.left;
  if (condition?.type !== 'UnaryExpression' || condition.operator !== '!' || condition.argument.type !== 'Identifier') {
    throw new Error('Could not identify Firebase configuration guard.');
  }
  const configured = bindings.find(node => node.id.name === condition.argument.name);
  if (!configured?.init) throw new Error('Firebase configuration binding is missing.');
  const fixtureNodes = nodes(fixture);
  const replacement = name => {
    const node = fixtureNodes.find(node => node.type === 'FunctionDeclaration' && node.id.name === name);
    if (!node) throw new Error(`Firebase fixture is missing ${name}.`);
    return `(${fixture.slice(node.start, node.end)})`;
  };
  const changes = [
    { node: token.init, value: replacement('getPushToken') },
    { node: foreground.init, value: replacement('onForegroundPush') },
    { node: configured.init, value: 'true' },
  ].sort((a, b) => b.node.start - a.node.start);
  for (const { node, value } of changes) source = source.slice(0, node.start) + value + source.slice(node.end);
  return source;
}

export async function mockFirebase(page, fixture) {
  if (process.env.PLAYWRIGHT_PREVIEW !== '1') {
    await page.route('**/src/lib/firebase.js*', route => route.fulfill({ contentType: 'application/javascript', body: fixture }));
    return;
  }
  await page.route('**/assets/index-*.js', async route => {
    const response = await route.fetch();
    const body = await response.text();
    if (!body.includes('[Push] Failed to acquire FCM token:')) return route.fulfill({ response });
    await route.fulfill({ response, body: mockCompiledFirebase(body, fixture) });
  });
}
