import apiClient from '../api/axios';

export const authService = {
  // Send OTP (supports email or phone number identifier)
  sendOtp: async (identifier) => {
    const response = await apiClient.post('/auth/send-otp', { identifier });
    return response.data;
  },

  // Verify OTP
  verifyOtp: async (identifier, otpCode) => {
    const response = await apiClient.post('/auth/verify-otp', {
      identifier,
      otp: otpCode,
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
