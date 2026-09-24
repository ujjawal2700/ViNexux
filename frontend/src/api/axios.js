import axios from 'axios';
import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from '../utils/tokenStorage';

// Normalize VITE_API_BASE_URL so a misconfigured value (missing "/api",
// or with a trailing slash) still resolves correctly, instead of silently
// hitting the wrong path (e.g. "/auth/send-otp" instead of "/api/auth/send-otp").
const normalizeApiBaseUrl = (raw) => {
  const trimmed = (raw || 'http://localhost:5000/api').replace(/\/+$/, '');
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

// Token memory store for access tokens
let inMemoryAccessToken = null;
let inMemoryAdminAccessToken = null;

export const setAccessToken = (token, portal) => {
  if (portal === 'admin') {
    inMemoryAdminAccessToken = token;
  } else {
    inMemoryAccessToken = token;
  }
};

export const getAccessToken = (portal) => {
  if (portal === 'admin') {
    return inMemoryAdminAccessToken;
  }
  return inMemoryAccessToken;
};

// Create main Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach Access Token if present
apiClient.interceptors.request.use(
  (config) => {
    const isAdminEndpoint = config.url?.startsWith('/admin') || config.url?.includes('/admin/');
    const token = isAdminEndpoint
      ? (inMemoryAdminAccessToken || inMemoryAccessToken)
      : inMemoryAccessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Silent Token Refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints themselves
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                           originalRequest.url?.includes('/auth/verify-otp') ||
                           originalRequest.url?.includes('/auth/send-otp') ||
                           originalRequest.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const isAdminEndpoint = originalRequest.url?.startsWith('/admin') || originalRequest.url?.includes('/admin/');
      const portal = isAdminEndpoint ? 'admin' : 'customer';
      const refreshToken = getStoredRefreshToken(isAdminEndpoint ? 'admin' : undefined);

      if (!refreshToken) {
        setAccessToken(null, portal);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = response.data?.data?.accessToken;
        const newRefreshToken = response.data?.data?.refreshToken;

        if (newAccessToken) {
          setAccessToken(newAccessToken, portal);
          if (newRefreshToken) {
            setStoredRefreshToken(newRefreshToken, portal);
          }

          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh response missing token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearStoredRefreshToken(portal);
        setAccessToken(null, portal);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
