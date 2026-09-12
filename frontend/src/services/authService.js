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
  sendOtp: async (identifier, portal) => {
    const response = await apiClient.post('/auth/send-otp', { identifier, ...(portal ? { portal } : {}) });
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
