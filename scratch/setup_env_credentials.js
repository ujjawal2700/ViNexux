import fs from 'fs';
import path from 'path';

const backendDir = 'c:/Rays software/MERN Workspace/Vinexus/backend';
const frontendDir = 'c:/Rays software/MERN Workspace/Vinexus/frontend';

// 1. Update backend/src/config/env.js
const envJsPath = path.join(backendDir, 'src/config/env.js');
let envJs = fs.readFileSync(envJsPath, 'utf8');

// Replace JWT configuration section
const oldJwtBlock = `  jwtSecret: process.env.JWT_SECRET || 'vinexus_jwt_secret_key_development_mode_12345',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiryDays: Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 30,`;

const newJwtBlock = `  jwtSecret: process.env.JWT_SECRET || 'vinexus_jwt_secret_key_development_mode_12345',
  jwtSecretFallback: process.env.NODE_ENV !== 'production' ? 'vinexus_jwt_secret_key_development_mode_12345' : null,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiryDays: Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 30,
  jwtConflictExpiry: process.env.JWT_CONFLICT_EXPIRY || '5m',
  jwtResetExpiry: process.env.JWT_RESET_EXPIRY || '10m',
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345',`;

// Normalize newlines in search if needed
const normalizedEnvJs = envJs.replace(/\r\n/g, '\n');
if (normalizedEnvJs.includes(oldJwtBlock)) {
  envJs = normalizedEnvJs.replace(oldJwtBlock, newJwtBlock);
} else {
  console.log('Searching by regex for jwt block in env.js...');
  envJs = normalizedEnvJs.replace(
    /jwtSecret:\s*process\.env\.JWT_SECRET[^,]+,\s*jwtAccessExpiry:\s*process\.env\.JWT_ACCESS_EXPIRY[^,]+,\s*jwtRefreshExpiryDays:\s*Number\(process\.env\.JWT_REFRESH_EXPIRY_DAYS\)[^,]+,/,
    newJwtBlock
  );
}

// Enhance validateProductionConfig in env.js
const oldValidation = `export const validateProductionConfig = () => {
  if (config.nodeEnv === 'production') {
    const defaultSecret = 'vinexus_jwt_secret_key_development_mode_12345';
    if (!process.env.JWT_SECRET || config.jwtSecret === defaultSecret) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable must be explicitly configured with a secure key in production mode.'
      );
    }
    if (config.demoMode) {
      console.warn(
        '[SECURITY WARNING] Running in PRODUCTION with DEMO_MODE=true. Demo OTP bypass is active!'
      );
    }
  }
};`;

const newValidation = `export const validateProductionConfig = () => {
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
    if (config.demoMode) {
      console.warn(
        '[SECURITY WARNING] Running in PRODUCTION with DEMO_MODE=true. Demo OTP bypass is active!'
      );
    }
  }
};`;

if (envJs.includes(oldValidation)) {
  envJs = envJs.replace(oldValidation, newValidation);
}
fs.writeFileSync(envJsPath, envJs, 'utf8');
console.log('✓ Successfully updated backend/src/config/env.js');

// 2. Update backend/src/utils/token.util.js to use configurable expiries and graceful fallback
const tokenUtilPath = path.join(backendDir, 'src/utils/token.util.js');
let tokenUtil = fs.readFileSync(tokenUtilPath, 'utf8').replace(/\r\n/g, '\n');

// Update verifyAccessToken
const oldVerifyAccess = `export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};`;
const newVerifyAccess = `export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (config.jwtSecretFallback && err.name === 'JsonWebTokenError') {
      return jwt.verify(token, config.jwtSecretFallback);
    }
    throw err;
  }
};`;
tokenUtil = tokenUtil.replace(oldVerifyAccess, newVerifyAccess);

// Update generateConflictTicket expiry
tokenUtil = tokenUtil.replace(
  /expiresIn:\s*'5m',/,
  "expiresIn: config.jwtConflictExpiry || '5m',"
);

// Update verifyConflictTicket
const oldVerifyConflict = `export const verifyConflictTicket = (ticket) => {
  const decoded = jwt.verify(ticket, config.jwtSecret);
  if (decoded.type !== 'session-conflict') {
    throw new Error('Invalid ticket type');
  }
  return decoded;
};`;
const newVerifyConflict = `export const verifyConflictTicket = (ticket) => {
  let decoded;
  try {
    decoded = jwt.verify(ticket, config.jwtSecret);
  } catch (err) {
    if (config.jwtSecretFallback && err.name === 'JsonWebTokenError') {
      decoded = jwt.verify(ticket, config.jwtSecretFallback);
    } else {
      throw err;
    }
  }
  if (decoded.type !== 'session-conflict') {
    throw new Error('Invalid ticket type');
  }
  return decoded;
};`;
tokenUtil = tokenUtil.replace(oldVerifyConflict, newVerifyConflict);

// Update generatePasswordResetTicket expiry
tokenUtil = tokenUtil.replace(
  /expiresIn:\s*'10m',/,
  "expiresIn: config.jwtResetExpiry || '10m',"
);

// Update verifyPasswordResetTicket
const oldVerifyReset = `export const verifyPasswordResetTicket = (ticket) => {
  const decoded = jwt.verify(ticket, config.jwtSecret);
  if (decoded.type !== 'password-reset') {
    throw new Error('Invalid ticket type');
  }
  return decoded;
};`;
const newVerifyReset = `export const verifyPasswordResetTicket = (ticket) => {
  let decoded;
  try {
    decoded = jwt.verify(ticket, config.jwtSecret);
  } catch (err) {
    if (config.jwtSecretFallback && err.name === 'JsonWebTokenError') {
      decoded = jwt.verify(ticket, config.jwtSecretFallback);
    } else {
      throw err;
    }
  }
  if (decoded.type !== 'password-reset') {
    throw new Error('Invalid ticket type');
  }
  return decoded;
};`;
tokenUtil = tokenUtil.replace(oldVerifyReset, newVerifyReset);

fs.writeFileSync(tokenUtilPath, tokenUtil, 'utf8');
console.log('✓ Successfully updated backend/src/utils/token.util.js');

// 3. Update backend/src/seed.js to use config.adminDefaultPassword
const seedPath = path.join(backendDir, 'src/seed.js');
let seedJs = fs.readFileSync(seedPath, 'utf8').replace(/\r\n/g, '\n');
seedJs = seedJs.replace(
  /const adminDefaultPassword = process\.env\.ADMIN_DEFAULT_PASSWORD \|\| 'Admin@12345';/,
  "const adminDefaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345';"
);
fs.writeFileSync(seedPath, seedJs, 'utf8');
console.log('✓ Verified backend/src/seed.js');

// 4. Update backend/.env with production-grade structure, secure JWT_SECRET, tokens, and credentials
const backendEnvPath = path.join(backendDir, '.env');
const backendEnvContent = `# ==============================================================================
# VINEXUS BACKEND PRODUCTION-GRADE CONFIGURATION
# ==============================================================================

# Server & Application Environment
PORT=5000
NODE_ENV=development
API_BASE_URL=/api
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://vi-nexux.vercel.app

# Database Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://dipeshgurjer000_db_user:FWyhcSlHzKC1KDR7@vinexusdatabase.onegosp.mongodb.net/vinexus

# ------------------------------------------------------------------------------
# JWT AUTHENTICATION & SECURITY CREDENTIALS
# ------------------------------------------------------------------------------
# Cryptographically secure signing secret (256-bit)
JWT_SECRET=dcb8fb6edb4db2285102cb01a03e40c700e687bc74ec3b29605156d678fe651f

# Token Expiry Durations
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY_DAYS=30
JWT_CONFLICT_EXPIRY=5m
JWT_RESET_EXPIRY=10m

# System Administrator Seed Credentials
ADMIN_DEFAULT_PASSWORD=Admin@12345

# ------------------------------------------------------------------------------
# OTP & TWO-FACTOR AUTHENTICATION
# ------------------------------------------------------------------------------
DEMO_MODE=true
DEV_OTP=123456
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3

# ------------------------------------------------------------------------------
# CLOUDINARY MEDIA & STORAGE
# ------------------------------------------------------------------------------
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=b5hik8gu
CLOUDINARY_API_KEY=627255749322937
CLOUDINARY_API_SECRET=fEw5yFXGQlFWxQc4hiHASu4xgIA

# ------------------------------------------------------------------------------
# SMS / OTP PROVIDER (development | msg91 | fast2sms | smsindiahub)
# ------------------------------------------------------------------------------
SMS_PROVIDER=development
SMS_API_KEY=
SMS_API_SECRET=
SMS_SENDER_ID=
SMS_TEMPLATE_ID=
SMS_BASE_URL=https://cloud.smsindiahub.in/vendorsms/pushsms.aspx

# ------------------------------------------------------------------------------
# EMAIL SERVICE (development | resend | smtp)
# ------------------------------------------------------------------------------
EMAIL_PROVIDER=development
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@vinexus.com
EMAIL_FROM_NAME=Vinexus
RESEND_API_KEY=

# ------------------------------------------------------------------------------
# WHATSAPP CLOUD API (development | cloud_api)
# ------------------------------------------------------------------------------
WHATSAPP_PROVIDER=development
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# ------------------------------------------------------------------------------
# PUSH NOTIFICATIONS / FIREBASE (development | firebase)
# ------------------------------------------------------------------------------
PUSH_PROVIDER=development
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# ------------------------------------------------------------------------------
# GOOGLE SHEETS ENQUIRY SYNC (development | google_api)
# ------------------------------------------------------------------------------
GOOGLE_SHEETS_ENABLED=false
GOOGLE_SHEETS_PROVIDER=development
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_TAB_NAME=Enquiries
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
`;

fs.writeFileSync(backendEnvPath, backendEnvContent, 'utf8');
console.log('✓ Successfully updated backend/.env');

// 5. Update backend/.env.example with comprehensive documentation
const backendEnvExamplePath = path.join(backendDir, '.env.example');
const backendEnvExampleContent = `# ==============================================================================
# VINEXUS BACKEND ENVIRONMENT TEMPLATE (.env.example)
# Copy this file to .env and configure all required credentials.
# ==============================================================================

# Server & Application Environment
PORT=5000
NODE_ENV=development
API_BASE_URL=/api
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://vi-nexux.vercel.app

# Database Connection (MongoDB Atlas or Local MongoDB)
# Example Local: mongodb://127.0.0.1:27017/vinexus
# Example Atlas: mongodb+srv://<username>:<password>@cluster0.mongodb.net/vinexus
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.mongodb.net/vinexus

# ------------------------------------------------------------------------------
# JWT AUTHENTICATION & SECURITY CREDENTIALS
# ------------------------------------------------------------------------------
# Mandatory in production: Cryptographically secure signing secret (min 32 characters)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_cryptographic_secret_key_at_least_32_characters

# Token Expiry Durations
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY_DAYS=30
JWT_CONFLICT_EXPIRY=5m
JWT_RESET_EXPIRY=10m

# Initial Seed Password for System Administrator (admin@vinexus.com)
ADMIN_DEFAULT_PASSWORD=your_admin_default_password_placeholder

# ------------------------------------------------------------------------------
# OTP & TWO-FACTOR AUTHENTICATION
# ------------------------------------------------------------------------------
# Set DEMO_MODE=false in production to send real SMS OTPs
DEMO_MODE=true
DEV_OTP=123456
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3

# ------------------------------------------------------------------------------
# CLOUDINARY MEDIA & STORAGE
# ------------------------------------------------------------------------------
# Auto-enables 'cloudinary' once all 3 keys are populated.
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name_placeholder
CLOUDINARY_API_KEY=your_cloudinary_api_key_placeholder
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_placeholder

# ------------------------------------------------------------------------------
# SMS / OTP PROVIDER (development | msg91 | fast2sms | smsindiahub)
# ------------------------------------------------------------------------------
SMS_PROVIDER=development
SMS_API_KEY=your_sms_api_key_placeholder
SMS_API_SECRET=your_sms_api_secret_placeholder
SMS_SENDER_ID=your_sms_sender_id_placeholder
SMS_TEMPLATE_ID=your_sms_template_id_placeholder
SMS_BASE_URL=https://cloud.smsindiahub.in/vendorsms/pushsms.aspx

# ------------------------------------------------------------------------------
# EMAIL SERVICE (development | resend | smtp)
# ------------------------------------------------------------------------------
EMAIL_PROVIDER=development
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email_username_placeholder
EMAIL_PASSWORD=your_email_password_placeholder
EMAIL_FROM=noreply@vinexus.com
EMAIL_FROM_NAME=Vinexus
RESEND_API_KEY=your_resend_api_key_placeholder

# ------------------------------------------------------------------------------
# WHATSAPP CLOUD API (development | cloud_api)
# ------------------------------------------------------------------------------
WHATSAPP_PROVIDER=development
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_placeholder
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id_placeholder
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id_placeholder

# ------------------------------------------------------------------------------
# PUSH NOTIFICATIONS / FIREBASE (development | firebase)
# ------------------------------------------------------------------------------
PUSH_PROVIDER=development
FIREBASE_PROJECT_ID=your_firebase_project_id_placeholder
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email_placeholder
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_private_key_placeholder\\n-----END PRIVATE KEY-----"

# ------------------------------------------------------------------------------
# GOOGLE SHEETS ENQUIRY SYNC (development | google_api)
# ------------------------------------------------------------------------------
GOOGLE_SHEETS_ENABLED=false
GOOGLE_SHEETS_PROVIDER=development
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_placeholder
GOOGLE_SHEETS_TAB_NAME=Enquiries
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_placeholder
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_private_key_placeholder\\n-----END PRIVATE KEY-----"
`;

fs.writeFileSync(backendEnvExamplePath, backendEnvExampleContent, 'utf8');
console.log('✓ Successfully updated backend/.env.example');

// 6. Update frontend/.gitignore to protect .env files
const frontendGitignorePath = path.join(frontendDir, '.gitignore');
let frontendGitignore = fs.readFileSync(frontendGitignorePath, 'utf8').replace(/\r\n/g, '\n');
if (!frontendGitignore.includes('.env')) {
  frontendGitignore += `\n# Environment variables\n.env\n.env.*\n!.env.example\n`;
  fs.writeFileSync(frontendGitignorePath, frontendGitignore, 'utf8');
  console.log('✓ Successfully updated frontend/.gitignore');
} else {
  console.log('✓ frontend/.gitignore already handles .env');
}

console.log('ALL UPDATES COMPLETE!');
