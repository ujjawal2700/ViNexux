import { z } from 'zod';

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const contactIdentifier = z.string().trim().min(3).max(254).refine(
  (value) => z.string().email().safeParse(value).success || INDIAN_PHONE_REGEX.test(value),
  { message: 'Enter a valid email address or 10-digit Indian mobile number' }
);

export const signupSchema = {
  body: z
    .object({
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
      // Required for dealers (phone OTP + KYC contact), optional for customers
      // (who verify via email OTP instead) - enforced below via .refine().
      phone: z
        .string({ required_error: 'Phone number is required' })
        .trim()
        .regex(INDIAN_PHONE_REGEX, { message: 'Enter a valid 10-digit Indian mobile number' }),
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, { message: 'Password must be at least 8 characters' })
        .max(72, { message: 'Password cannot exceed 72 characters' }),
      dob: z.string().optional(),
      role: z
        .enum(['customer', 'dealer'], {
          invalid_type_error: 'Role must be either customer or dealer',
        })
        .default('customer'),
      // Dealer KYC fields (optional for customer, validated for dealer)
      companyName: z.string().trim().min(2).max(150).optional(),
      gstin: z.string().trim().optional(),
      pan: z.string().trim().optional(),
      aadhaarNumber: z.string().trim().optional(),
      address: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      pincode: z.string().trim().optional(),
      acceptPrivacyPolicy: z.literal(true, { errorMap: () => ({ message: 'Please accept the Privacy Policy' }) }),
      acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the Terms & Conditions' }) }),
    })
    .superRefine((data, ctx) => {
      if (data.role !== 'dealer') return;
      const required = [
        ['companyName', data.companyName, 'Company / firm name is required'],
        ['gstin', data.gstin, 'GSTIN is required'],
        ['aadhaarNumber', data.aadhaarNumber, 'Aadhaar number is required'],
        ['address', data.address, 'Business address is required'],
        ['city', data.city, 'City is required'],
        ['state', data.state, 'State is required'],
        ['pincode', data.pincode, 'Pincode is required'],
      ];
      for (const [field, value, message] of required) {
        if (!value?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
      if (data.gstin && !GSTIN_REGEX.test(data.gstin.toUpperCase())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gstin'], message: 'Enter a valid 15-character GSTIN' });
      }
      if (data.aadhaarNumber && !/^\d{12}$/.test(data.aadhaarNumber)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['aadhaarNumber'], message: 'Aadhaar number must contain exactly 12 digits' });
      }
      if (data.pincode && !/^\d{6}$/.test(data.pincode)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pincode'], message: 'Pincode must contain exactly 6 digits' });
      }
    }),
};

export const googleAuthSchema = {
  body: z.object({
    credential: z.string().optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
    googleId: z.string().optional(),
    picture: z.string().optional(),
    acceptPrivacyPolicy: z.boolean().optional(),
    acceptTerms: z.boolean().optional(),
  }),
};

export const sendOtpSchema = {
  body: z
    .object({
      identifier: contactIdentifier,
      purpose: z
        .enum(['signup', 'login', 'phone-change', 'password-reset'], {
          invalid_type_error: 'Purpose must be one of: signup, login, phone-change, password-reset',
        })
        .default('login'),
      // Optional login surface hint: 'admin' (dedicated /admin/login) or 'customer' (storefront /login)
      portal: z.enum(['admin', 'customer']).optional(),
      // Required only for the admin portal login surface - admin sign-in is
      // password + OTP two-factor, not OTP-only like customer/dealer login.
      password: z.string().min(6).max(72).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.purpose === 'signup' && !INDIAN_PHONE_REGEX.test(data.identifier)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['identifier'], message: 'Registration OTP must be sent to a valid mobile number' });
      }
      if (data.portal === 'admin' && data.purpose === 'login' && (!data.password || data.password.length < 6)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password is required for administrator sign-in' });
      }
    }),
};

export const verifyOtpSchema = {
  body: z.object({
    identifier: contactIdentifier,
    otp: z
      .string({ required_error: 'OTP is required' })
      .trim()
      .regex(/^\d{6}$/, { message: 'OTP must be exactly 6 numeric digits' }),
    purpose: z
      .enum(['signup', 'login', 'phone-change'], {
        invalid_type_error: 'Purpose must be one of: signup, login, phone-change',
      })
      .default('login'),
    portal: z.enum(['admin', 'customer']).optional(),
  }),
};

export const verifySignupOtpSchema = {
  body: z.object({
    identifier: z.string().trim().regex(INDIAN_PHONE_REGEX, { message: 'Enter a valid 10-digit Indian mobile number' }),
    otp: z
      .string({ required_error: 'OTP is required' })
      .trim()
      .regex(/^\d{6}$/, { message: 'OTP must be exactly 6 numeric digits' }),
  }),
};

export const verifyResetOtpSchema = {
  body: z.object({
    identifier: contactIdentifier,
    otp: z
      .string({ required_error: 'OTP is required' })
      .trim()
      .regex(/^\d{6}$/, { message: 'OTP must be exactly 6 numeric digits' }),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    resetToken: z
      .string({ required_error: 'Reset token is required' })
      .trim()
      .min(1, { message: 'Reset token is required' }),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(72, { message: 'Password cannot exceed 72 characters' }),
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

export const updateProfileSchema = {
  body: z
    .object({
      fullName: z.string().trim().min(2, { message: 'Full name must be at least 2 characters' }).max(100).optional(),
      email: z.string().trim().email({ message: 'Enter a valid email address' }).max(254).toLowerCase().optional(),
      phone: z.string().trim().regex(INDIAN_PHONE_REGEX, { message: 'Enter a valid 10-digit Indian mobile number' }).optional(),
      dob: z.string().datetime({ offset: true }).optional(),
      address: z.string().trim().max(500).optional(),
      companyName: z.string().trim().min(2).max(150).optional(),
      gstin: z.string().trim().max(15).optional(),
      pan: z.string().trim().max(10).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(100).optional(),
      pincode: z.string().trim().regex(/^\d{6}$/, { message: 'Pincode must contain exactly 6 digits' }).optional(),
      currentPassword: z.string().min(6).max(72).optional(),
      newPassword: z.string().min(8, { message: 'New password must be at least 8 characters' }).max(72).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one profile field is required' })
    .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
      path: ['currentPassword'],
      message: 'Current password is required to set a new administrator password',
    }),
};
