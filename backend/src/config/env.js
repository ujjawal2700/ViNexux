import dotenv from 'dotenv';

dotenv.config();

// TRUST_PROXY: unset/false (direct traffic), a hop count ("1"), "true", or an
// Express preset/subnet list such as "loopback" (nginx on the same server).
const parseTrustProxy = (value) => {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 5000,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Connections per server process; multiply by PM2 instances for the total.
  mongoMaxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 100,
  // PM2 cluster mode numbers instances 0..n-1; one-off startup work runs on 0.
  isPrimaryInstance: (process.env.NODE_APP_INSTANCE ?? '0') === '0',
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinexus',
  apiBaseUrl: process.env.API_BASE_URL || '/api',
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'https://vi-nexux.vercel.app'],
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 5,
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 3,
  mockOtpCode: process.env.MOCK_OTP_CODE || process.env.DEV_OTP || '123456',
  // MOCK_OTP is deliberately explicit: true never contacts the SMS gateway,
  // false always uses the configured live provider for mobile OTP delivery.
  mockOtpEnabled:
    process.env.MOCK_OTP !== undefined
      ? process.env.MOCK_OTP === 'true'
      : process.env.DEMO_MODE === 'true',
  otpResendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
  jwtSecret: process.env.JWT_SECRET || 'vinexus_jwt_secret_key_development_mode_12345',
  jwtSecretFallback: process.env.NODE_ENV !== 'production' ? 'vinexus_jwt_secret_key_development_mode_12345' : null,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiryDays: Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 30,
  customerSessionExpiryHours: Number(process.env.CUSTOMER_SESSION_EXPIRY_HOURS) || 24,
  jwtConflictExpiry: process.env.JWT_CONFLICT_EXPIRY || '5m',
  jwtResetExpiry: process.env.JWT_RESET_EXPIRY || '10m',
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345',
  smsProvider: process.env.SMS_PROVIDER || 'smsindiahub',
  smsApiKey: process.env.SMS_API_KEY || '',
  smsApiSecret: process.env.SMS_API_SECRET || '',
  smsSenderId: process.env.SMS_SENDER_ID || '',
  smsTemplateId: process.env.SMS_TEMPLATE_ID || '',
  smsBaseUrl: process.env.SMS_BASE_URL || '',
  emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
  emailHost: process.env.EMAIL_HOST || '',
  emailPort: Number(process.env.EMAIL_PORT) || 587,
  emailSecure: process.env.EMAIL_SECURE === 'true',
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@vinexus.com',
  emailFromName: process.env.EMAIL_FROM_NAME || 'Vinexus',
  googleSheetsEnabled: process.env.GOOGLE_SHEETS_ENABLED === 'true',
  googleSheetsProvider: process.env.GOOGLE_SHEETS_PROVIDER || 'development',
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
  googleSheetsTabName: process.env.GOOGLE_SHEETS_TAB_NAME || 'Enquiries',
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  googleServiceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
  // Auto-selects 'cloudinary' once all three Cloudinary credentials are set,
  // matching the same auto-detect convention as the other providers below -
  // adding the keys alone is enough, no separate STORAGE_PROVIDER flip needed.
  storageProvider:
    process.env.STORAGE_PROVIDER ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
      ? 'cloudinary'
      : 'development'),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  // Auto-selects 'firebase' once FIREBASE_PROJECT_ID is set, so adding the
  // service account credentials alone is enough to enable real push.
  pushProvider: process.env.PUSH_PROVIDER || (process.env.FIREBASE_PROJECT_ID ? 'firebase' : 'development'),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
};

export const validateProductionConfig = () => {
  if (config.nodeEnv === 'production') {
    const defaultSecret = 'vinexus_jwt_secret_key_development_mode_12345';
    if (!process.env.JWT_SECRET || config.jwtSecret === defaultSecret || config.jwtSecret.length < 32) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable must be explicitly configured with a secure key (at least 32 characters) in production mode.'
      );
    }
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'FATAL: MONGODB_URI environment variable must be explicitly configured in production mode.'
      );
    }
    if (config.mockOtpEnabled) {
      console.warn(
        '[SECURITY WARNING] Running in PRODUCTION with MOCK_OTP=true. Fixed mock OTP is active!'
      );
    }
  }
};
