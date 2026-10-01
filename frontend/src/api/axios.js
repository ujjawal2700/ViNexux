import axios from 'axios';
import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from '../utils/tokenStorage';
import { loadingTracker } from '../utils/loadingTracker';

// Normalize VITE_API_BASE_URL so a misconfigured value (missing "/api",
// or with a trailing slash) still resolves correctly, instead of silently
// hitting the wrong path (e.g. "/auth/send-otp" instead of "/api/auth/send-otp").
const normalizeApiBaseUrl = (raw) => {
  let trimmed = (raw || 'http://localhost:5000/api').replace(/\/+$/, '');
  if (import.meta.env.PROD && /^http:\/\//i.test(trimmed) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^http:\/\//i, 'https://');
  }
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

// Prevent identical requests from reaching the server more than once while
// the first request is still pending. The entry is released on both success
// and failure, so a later click can try again normally.
const inFlightRequests = new Set();

const stableSerialize = (value) => {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return JSON.stringify(Array.from(value.entries()).map(([key, entry]) => [
      key,
      typeof entry === 'string' ? entry : `${entry.name}:${entry.size}:${entry.type}:${entry.lastModified}`,
    ]));
  }
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
};

const requestKey = (requestConfig) => [
  (requestConfig.method || 'get').toLowerCase(),
  requestConfig.baseURL || API_BASE_URL,
  requestConfig.url || '',
  requestConfig.portal || 'customer',
  requestConfig.headers?.Authorization || '',
  stableSerialize(requestConfig.params),
  stableSerialize(requestConfig.data),
].join('|');

const releaseRequest = (requestConfig) => {
  if (requestConfig?._inFlightRequestKey) {
    inFlightRequests.delete(requestConfig._inFlightRequestKey);
    delete requestConfig._inFlightRequestKey;
  }
};

// Request Interceptor: Attach Access Token if present
apiClient.interceptors.request.use(
  (config) => {
    const isAdminEndpoint = config.portal === 'admin' || config.url?.startsWith('/admin') || config.url?.includes('/admin/');
    const token = isAdminEndpoint
      ? (inMemoryAdminAccessToken || inMemoryAccessToken)
      : inMemoryAccessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.dedupe !== false) {
      const key = requestKey(config);
      if (inFlightRequests.has(key)) {
        const duplicateError = new axios.CanceledError('An identical request is already in progress.');
        duplicateError.code = 'DUPLICATE_REQUEST';
        duplicateError.config = config;
        duplicateError.response = {
          data: { message: 'Please wait for the current request to finish.' },
        };
        return Promise.reject(duplicateError);
      }
      inFlightRequests.add(key);
      config._inFlightRequestKey = key;
    }
    if (!config.skipGlobalLoader) {
      config._globalLoaderTracked = true;
      const method = (config.method || 'get').toLowerCase();
      const message = config.loadingMessage || (method === 'get' ? 'Loading content...' : 'Processing request...');
      loadingTracker.start(message);
    }
    return config;
  },
  (error) => {
    releaseRequest(error.config);
    if (error.config?._globalLoaderTracked) loadingTracker.finish();
    return Promise.reject(error);
  }
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
  (response) => {
    releaseRequest(response.config);
    if (response.config?._globalLoaderTracked) {
      response.config._globalLoaderTracked = false;
      loadingTracker.finish();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    releaseRequest(originalRequest);
    if (originalRequest?._globalLoaderTracked) {
      originalRequest._globalLoaderTracked = false;
      loadingTracker.finish();
    }

    // Do not attempt refresh on auth endpoints themselves
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                           originalRequest.url?.includes('/auth/verify-otp') ||
                           originalRequest.url?.includes('/auth/send-otp') ||
                           originalRequest.url?.includes('/auth/force-login') ||
                           originalRequest.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const isAdminEndpoint = originalRequest.portal === 'admin' || originalRequest.url?.startsWith('/admin') || originalRequest.url?.includes('/admin/');
      const portal = isAdminEndpoint ? 'admin' : 'customer';
      const refreshToken = getStoredRefreshToken(isAdminEndpoint ? 'admin' : undefined);

      if (!refreshToken) {
        setAccessToken(null, portal);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
          } catch (e) {}
          window.dispatchEvent(
            new CustomEvent('session-expired', {
              detail: {
                portal,
                message: 'Your session has expired. Please login again.',
              },
            })
          );
        }
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
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
          } catch (e) {}
          window.dispatchEvent(
            new CustomEvent('session-expired', {
              detail: {
                portal,
                message: 'Your session has expired. Please login again.',
              },
            })
          );
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
