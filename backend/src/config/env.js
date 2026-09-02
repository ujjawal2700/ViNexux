import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinexus',
  apiBaseUrl: process.env.API_BASE_URL || '/api',
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'],
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 5,
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 3,
  devOtp: process.env.DEV_OTP || '123456',
  jwtSecret: process.env.JWT_SECRET || 'vinexus_jwt_secret_key_development_mode_12345',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiryDays: Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 30,
};
