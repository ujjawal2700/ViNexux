import apiClient from '../api/axios';

export const authService = {
  // Signup customer / user
  signup: async (signupData) => {
    const response = await apiClient.post('/auth/signup', signupData);
    return response.data;
  },

  // Google Login / Registration
  googleLogin: async (googleData) => {
    const response = await apiClient.post('/auth/google', googleData);
    return response.data;
  },

  // Send OTP (supports email or phone number identifier).
  // `portal: 'admin'` scopes this to the dedicated admin login page -
  // the backend rejects non-admin accounts for that portal.
  // `purpose` defaults to 'login' server-side; pass 'signup' for pre-account
  // contact verification during registration.
  sendOtp: async (identifier, portal, purpose) => {
    const response = await apiClient.post('/auth/send-otp', {
      identifier,
      ...(portal ? { portal } : {}),
      ...(purpose ? { purpose } : {}),
    });
    return response.data;
  },

  // Verify OTP
  verifyOtp: async (identifier, otpCode, portal) => {
    const response = await apiClient.post('/auth/verify-otp', {
      identifier,
      otp: otpCode,
      ...(portal ? { portal } : {}),
    });
    return response.data;
  },

  // Verifies a pre-account "signup" OTP (email for customers, phone for
  // dealers) so the multi-step signup wizard can confirm contact ownership
  // before the account is actually created.
  verifySignupOtp: async (identifier, otpCode) => {
    const response = await apiClient.post('/auth/verify-signup-otp', { identifier, otp: otpCode });
    return response.data;
  },

  // Verifies the OTP sent for a "forgot password" request. On success the
  // backend returns a short-lived resetToken that authorizes resetPassword.
  verifyResetOtp: async (identifier, otpCode) => {
    const response = await apiClient.post('/auth/verify-reset-otp', { identifier, otp: otpCode });
    return response.data;
  },

  // Completes a password reset using the resetToken from verifyResetOtp.
  resetPassword: async (resetToken, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', { resetToken, newPassword });
    return response.data;
  },

  // Force login when single active session conflict occurs
  forceLogin: async (conflictTicket) => {
    const response = await apiClient.post('/auth/force-login', { conflictTicket });
    return response.data;
  },

  // Refresh Access Token
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  // Fetch Current Logged-in User Profile
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Update Profile & Password
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  },

  // Logout Session
  logout: async () => {
    try {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    } catch (err) {
      // Even if backend call fails, proceed with frontend logout cleanup
      console.warn('Backend logout failed or session already expired:', err);
      return { success: true };
    }
  },
};

export default authService;
