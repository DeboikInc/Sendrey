// utils/api.js - mobile
import axios from "axios";
import { clearCredentials, setToken } from "../Redux/authSlice";
import { authStorage } from "./authStorage";

const BASE_URL = process.env.REACT_APP_API_URL;

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

let isRefreshing = false;
let refreshQueue = []; // pending requests waiting for new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

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
        const { refreshToken } = await authStorage.getTokens();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );

        const newAccess = data.accessToken || data.token;
        const newRefresh = data.refreshToken || refreshToken;

        await authStorage.setTokens(newAccess, newRefresh);
        store.dispatch(setToken(newAccess));
        original.headers['Authorization'] = `Bearer ${newAccess}`;

        processQueue(null, newAccess);
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