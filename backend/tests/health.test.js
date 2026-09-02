import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';

const PORT = 5006;
const BASE_URL = `http://127.0.0.1:${PORT}${config.apiBaseUrl}`;

const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              body: JSON.parse(data),
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              body: data,
            });
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

const runTests = async () => {
  console.log('[Test Script] Running API health & verification tests...\n');

  let server;
  try {
    await mongoose.connect(config.mongodbUri);
    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));

    // 1. Health check test
    console.log(`1. Testing GET ${BASE_URL}/health`);
    const healthRes = await makeRequest(`${BASE_URL}/health`);
    console.log(`   Status Code: ${healthRes.statusCode}`);
    console.log(`   Response Body:`, JSON.stringify(healthRes.body, null, 2));

    if (
      healthRes.statusCode === 200 &&
      healthRes.body.success === true &&
      healthRes.body.data.status === 'UP'
    ) {
      console.log('   ✅ Health endpoint test PASSED\n');
    } else {
      console.error('   ❌ Health endpoint test FAILED\n');
      process.exitCode = 1;
    }

    // 2. 404 test
    console.log(`2. Testing GET ${BASE_URL}/nonexistent-route-12345`);
    const notFoundRes = await makeRequest(`${BASE_URL}/nonexistent-route-12345`);
    console.log(`   Status Code: ${notFoundRes.statusCode}`);
    console.log(`   Response Body:`, JSON.stringify(notFoundRes.body, null, 2));

    if (
      notFoundRes.statusCode === 404 &&
      notFoundRes.body.success === false &&
      notFoundRes.body.error.code === 'NOT_FOUND'
    ) {
      console.log('   ✅ Centralized 404 error handler test PASSED\n');
    } else {
      console.error('   ❌ 404 handler test FAILED\n');
      process.exitCode = 1;
    }

    console.log('[Test Script] All verification tests complete.');
  } catch (err) {
    console.error('[Test Script] Error during test execution:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
};

runTests();
