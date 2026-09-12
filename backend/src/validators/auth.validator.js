import { z } from 'zod';

export const signupSchema = {
  body: z.object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' })
      .max(100, { message: 'Full name cannot exceed 100 characters' }),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .email({ message: 'Invalid email address format' })
      .toLowerCase(),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .min(10, { message: 'Phone number must be at least 10 digits' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters' }),
    dob: z.string().optional(),
    role: z
      .enum(['customer', 'dealer'], {
        invalid_type_error: 'Role must be either customer or dealer',
      })
      .default('customer'),
    // Dealer KYC fields (optional for customer, validated for dealer)
    companyName: z.string().trim().optional(),
    gstin: z.string().trim().optional(),
    pan: z.string().trim().optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
  }),
};

export const googleAuthSchema = {
  body: z.object({
    credential: z.string().optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
    googleId: z.string().optional(),
    picture: z.string().optional(),
  }),
};

export const sendOtpSchema = {
  body: z.object({
    identifier: z
      .string({ required_error: 'Identifier (email or phone) is required' })
      .trim()
      .min(3, { message: 'Identifier must be at least 3 characters' }),
    purpose: z
      .enum(['signup', 'login', 'phone-change'], {
        invalid_type_error: 'Purpose must be one of: signup, login, phone-change',
      })
      .default('login'),
    // Optional login surface hint. When set to 'admin' (the dedicated
    // /admin/login page), the target account must have the admin role.
    portal: z.enum(['admin']).optional(),
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    identifier: z
      .string({ required_error: 'Identifier (email or phone) is required' })
      .trim()
      .min(3, { message: 'Identifier must be at least 3 characters' }),
    otp: z
      .string({ required_error: 'OTP is required' })
      .trim()
      .regex(/^\d{6}$/, { message: 'OTP must be exactly 6 numeric digits' }),
    purpose: z
      .enum(['signup', 'login', 'phone-change'], {
        invalid_type_error: 'Purpose must be one of: signup, login, phone-change',
      })
      .default('login'),
    portal: z.enum(['admin']).optional(),
  }),
};

export const forceLoginSchema = {
  body: z.object({
    conflictTicket: z
      .string({ required_error: 'Conflict ticket is required for force-login' })
      .trim(),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z
      .string({ required_error: 'Refresh token is required' })
      .trim(),
  }),
};
