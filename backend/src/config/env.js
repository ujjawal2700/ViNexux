import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinexus',
  apiBaseUrl: process.env.API_BASE_URL || '/api',
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'https://vi-nexux.vercel.app'],
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 5,
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 3,
  devOtp: process.env.DEV_OTP || '123456',
  // Demo mode: always issue the fixed devOtp instead of a random code, in
  // every environment (including production) - so a public demo/portfolio
  // deployment stays trivially loggable-into without wiring up real
  // email/SMS delivery. Defaults ON; set DEMO_MODE=false to require a real
  // OTP provider once this stops being a demo.
  demoMode: process.env.DEMO_MODE !== 'false',
  jwtSecret: process.env.JWT_SECRET || 'vinexus_jwt_secret_key_development_mode_12345',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiryDays: Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 30,
  // Auto-selects 'smsindiahub' once SMS_API_KEY is set, so adding the key
  // alone is enough - no separate SMS_PROVIDER flip needed.
  smsProvider: process.env.SMS_PROVIDER || (process.env.SMS_API_KEY ? 'smsindiahub' : 'development'),
  smsApiKey: process.env.SMS_API_KEY || '',
  smsApiSecret: process.env.SMS_API_SECRET || '',
  smsSenderId: process.env.SMS_SENDER_ID || '',
  smsTemplateId: process.env.SMS_TEMPLATE_ID || '',
  smsBaseUrl: process.env.SMS_BASE_URL || '',
  // Auto-selects 'resend' once RESEND_API_KEY is set, so adding the key alone
  // is enough - no separate EMAIL_PROVIDER flip needed. Still overridable.
  emailProvider: process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'development'),
  emailHost: process.env.EMAIL_HOST || '',
  emailPort: Number(process.env.EMAIL_PORT) || 587,
  emailSecure: process.env.EMAIL_SECURE === 'true',
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@vinexus.com',
  emailFromName: process.env.EMAIL_FROM_NAME || 'Vinexus',
  resendApiKey: process.env.RESEND_API_KEY || '',
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
  whatsappProvider: process.env.WHATSAPP_PROVIDER || 'development',
  whatsappApiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  // Auto-selects 'firebase' once FIREBASE_PROJECT_ID is set, so adding the
  // service account credentials alone is enough to enable real push.
  pushProvider: process.env.PUSH_PROVIDER || (process.env.FIREBASE_PROJECT_ID ? 'firebase' : 'development'),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
};

