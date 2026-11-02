import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPrivateKey } from 'node:crypto';
import dotenv from 'dotenv';

const backendDirectory = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: `${backendDirectory}.env` });
const { config } = await import('../src/config/env.js');
const live = process.argv.includes('--live');
const pemStatus = value => {
  if (!value) return 'missing';
  try { createPrivateKey(value.replace(/\\n/g, '\n')); return 'valid PEM'; }
  catch { return 'invalid PEM'; }
};
let frontend = {};
try { frontend = dotenv.parse(readFileSync(new URL('../../frontend/.env', import.meta.url))); }
catch { /* Configuration checks below explicitly report absent settings. */ }

const report = {
  mode: live ? 'read-only live authentication' : 'local configuration only',
  firebase: {
    configured: Boolean(config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey),
    privateKey: pemStatus(config.firebasePrivateKey),
    browserConfigured: Boolean(frontend.VITE_FIREBASE_API_KEY && frontend.VITE_FIREBASE_APP_ID),
    browserServerProjectMatches: Boolean(config.firebaseProjectId && config.firebaseProjectId === frontend.VITE_FIREBASE_PROJECT_ID),
  },
  cloudinary: { configured: Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) },
  googleSheets: {
    configured: Boolean(config.googleServiceAccountEmail && config.googleServiceAccountPrivateKey),
    privateKey: pemStatus(config.googleServiceAccountPrivateKey),
    liveCheck: 'Not run; use the connected product-sheet workflow to verify spreadsheet access',
  },
  smtp: { configured: Boolean(config.emailHost && config.emailUser && config.emailPassword), deliveryTest: 'Not sent' },
  sms: { configured: Boolean(config.smsApiKey && config.smsApiSecret), deliveryTest: 'Not sent' },
};

if (live && report.firebase.configured) {
  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({ email: config.firebaseClientEmail, key: config.firebasePrivateKey.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/firebase.readonly'] });
    const access = await auth.authorize();
    report.firebase.authenticated = Boolean(access.access_token);
    if (frontend.VITE_FIREBASE_APP_ID) {
      const response = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(config.firebaseProjectId)}/webApps/${encodeURIComponent(frontend.VITE_FIREBASE_APP_ID)}/config`, {
        headers: { Authorization: `Bearer ${access.access_token}` }, signal: AbortSignal.timeout(20000),
      });
      report.firebase.officialConfigHttpStatus = response.status;
      if (response.ok) {
        const official = await response.json();
        const fields = { apiKey: 'API_KEY', authDomain: 'AUTH_DOMAIN', projectId: 'PROJECT_ID', storageBucket: 'STORAGE_BUCKET', messagingSenderId: 'MESSAGING_SENDER_ID', appId: 'APP_ID', measurementId: 'MEASUREMENT_ID' };
        report.firebase.officialConfigMatches = Object.fromEntries(Object.entries(fields).map(([key, suffix]) => [key, official[key] === frontend[`VITE_FIREBASE_${suffix}`]]));
      }
    }
  } catch (error) {
    report.firebase.authenticated = false;
    report.firebase.httpStatus = error.response?.status || null;
  }
}
if (live && report.cloudinary.configured) {
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({ cloud_name: config.cloudinaryCloudName, api_key: config.cloudinaryApiKey, api_secret: config.cloudinaryApiSecret, secure: true });
    const response = await cloudinary.api.ping({ timeout: 20000 });
    report.cloudinary.authenticated = response.status === 'ok';
  } catch (error) {
    report.cloudinary.authenticated = false;
    report.cloudinary.httpStatus = error.error?.http_code || error.http_code || null;
  }
}
// Never emit API keys, private keys, access tokens or raw provider errors.
console.log(JSON.stringify(report, null, 2));
if (Object.values(report).some(value => value && typeof value === 'object' && (
  value.authenticated === false || value.privateKey === 'invalid PEM' || (value.configured && value.browserConfigured && value.browserServerProjectMatches === false)
  || (value.officialConfigHttpStatus !== undefined && value.officialConfigHttpStatus !== 200)
  || Object.values(value.officialConfigMatches || {}).some(matches => !matches)
))) process.exitCode = 1;
