// utils/api.js - mobile
import axios from "axios";
import { clearCredentials, setToken } from "../Redux/authSlice";
import { authStorage } from "./authStorage";
export const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

const BASE_URL = process.env.REACT_APP_API_URL;
console.log(BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  withCredentials: true,
});

const clearSession = async () => {
  await authStorage.clearTokens();

  if (store) {
    store.dispatch(clearCredentials());
  }
};

let isRefreshing = false;
let refreshQueue = []; // pending requests waiting for new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

// Shared refresh logic — always sends the stored refresh token explicitly
// (mobile can't rely on cookies alone, especially inside Capacitor's native
// shell), and always persists the rotated tokens back to storage + Redux
// so the *next* request picks up the new access token immediately rather
// than waiting for another 401 round-trip.
const doRefresh = async () => {
  const { refreshToken } = await authStorage.getTokens();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await axios.post(
    `${BASE_URL}/auth/refresh-token`,
    { refreshToken },
    { withCredentials: true }
  );

  const payload = res.data?.data || res.data;
  const newAccess = payload.accessToken || payload.token;
  const newRefresh = payload.refreshToken || refreshToken;

  if (!newAccess) throw new Error('Refresh response missing accessToken');

  await authStorage.setTokens(newAccess, newRefresh);
  if (store) store.dispatch(setToken(newAccess));

  return { accessToken: newAccess, refreshToken: newRefresh };
};

export const refreshSession = () => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }
  isRefreshing = true;
  return doRefresh()
    .then((tokens) => { processQueue(null, tokens.accessToken); return tokens; })
    .catch((err) => {
      processQueue(err, null);
      const status = err.response?.status;
      if (status === 401 || status === 403) clearSession();
      throw err;
    })
    .finally(() => { isRefreshing = false; });
};

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const { accessToken } = await authStorage.getTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const original = error.config;

    if (original._skipInterceptor) return Promise.reject(error);

    if (error.response?.status === 401 && original.url?.includes('refresh-token')) {
      // Only treat this as a real logout if we're actually online.
      if (navigator.onLine === false) {
        return Promise.reject(error);
      }

      await clearSession();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        }).catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const tokens = await doRefresh();
        original.headers['Authorization'] = `Bearer ${tokens.accessToken}`;

        processQueue(null, tokens.accessToken);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const status = refreshError.response?.status;
        const isAuthFailure = status === 401 || status === 403;

        if (isAuthFailure) {
          await clearSession();
        } else {
          console.warn('[API:App] Refresh attempt failed transiently, not logging out:', refreshError.message);
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

let store;
export const injectStore = (_store) => { store = _store; };
export default api;