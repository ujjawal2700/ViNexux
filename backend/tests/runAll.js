import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
const tests = fileURLToPath(new URL('./', import.meta.url)), backend = fileURLToPath(new URL('../', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'vinexus-full-integration-'));
const filter = process.argv.slice(2);
const files = (await readdir(tests)).filter(file => file.endsWith('.test.js') && (!filter.length || filter.includes(file))).sort();
if (!files.length) throw new Error('No matching backend test files were found.');
const outcomes = [];
for (const file of files) {
  const manifest = join(directory, `${file}.dbs`), logPath = join(directory, `${file}.log`);
  await writeFile(manifest, '');
  const name = `vinexus_full_test_${Date.now()}_${file.replace(/\W/g, '_').toLowerCase().slice(0, 30)}`;
  const assetDirectory = join(directory, `${file}.assets`);
  const env = { ...process.env, NODE_ENV: 'test', TEST_DATABASE_NAME: name, TEST_DATABASE_MANIFEST: manifest, TEST_THEME_ASSET_DIRECTORY: assetDirectory,
    MONGODB_URI: `mongodb://127.0.0.1:27019/${name}?replicaSet=vinexusAccessTest`, JWT_SECRET: 'vinexus-isolated-integration-test-secret',
    EMAIL_PROVIDER: 'development', SMS_PROVIDER: 'development', PUSH_PROVIDER: 'development', STORAGE_PROVIDER: 'development',
    MOCK_OTP: 'true', MOCK_OTP_CODE: '123456', GOOGLE_SHEETS_ENABLED: 'false', GOOGLE_SHEETS_PROVIDER: 'development',
    FIREBASE_SERVICE_ACCOUNT_JSON: '', FIREBASE_PRIVATE_KEY: '', FIREBASE_CLIENT_EMAIL: '', FIREBASE_PROJECT_ID: '',
    EMAIL_HOST: '', EMAIL_USER: '', EMAIL_PASSWORD: '', SMS_API_KEY: '', SMS_API_SECRET: '', CLOUDINARY_API_SECRET: '',
  };
  let output = '', timedOut = false;
  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, ['--test', '--test-reporter=spec', '--import', join(tests, 'helpers/isolate.js'), join(tests, file)], { cwd: backend, env });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 90000);
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
    child.on('exit', code => { clearTimeout(timer); resolve(code); });
  });
  await writeFile(logPath, output);
  let passed = code === 0 && !timedOut && !/❌|ASSERTION FAILED|not ok \d/.test(output);
  let cleanupVerified = false, cleanupError;
  const names = [...new Set((await readFile(manifest, 'utf8')).trim().split('\n').filter(Boolean))];
  const client = new mongoose.mongo.MongoClient('mongodb://127.0.0.1:27019/?replicaSet=vinexusAccessTest');
  try {
    await client.connect();
    if (names.some(dbName => !/^vinexus_[a-z0-9_]*test_[a-z0-9_]+$/.test(dbName))) throw new Error('Refusing cleanup outside disposable databases.');
    for (const dbName of names) await client.db(dbName).dropDatabase();
    const remaining = await client.db('admin').admin().listDatabases({ nameOnly: true, filter: { name: { $in: names } } });
    if (remaining.databases.length) throw new Error('Some disposable test databases remain.');
    await rm(assetDirectory, { recursive: true, force: true });
    cleanupVerified = true;
  } catch (error) { passed = false; cleanupError = error.message; }
  finally { await client.close(); }
  outcomes.push({ file, passed, code, timedOut, logPath, cleanupVerified, ...(cleanupError ? { cleanupError } : {}) });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${file} (cleanup ${cleanupVerified ? 'verified' : 'FAILED'}; ${logPath})`);
}
await writeFile(join(directory, 'results.json'), JSON.stringify(outcomes, null, 2));
console.log(JSON.stringify({ total: outcomes.length, passed: outcomes.filter(o => o.passed).length, failed: outcomes.filter(o => !o.passed).length, results: join(directory, 'results.json') }));
if (outcomes.some(o => !o.passed)) process.exitCode = 1;
