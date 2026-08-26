import axios from "axios";
import { clearCredentials } from "../Redux/authSlice";
import { authStorage } from "./authStorage";

const BASE_URL = process.env.REACT_APP_API_URL;
const isMobileBrowser = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json", "Accept": "application/json" },
  withCredentials: true,
});

const clearSession = async () => {
  document.cookie = 'token=; Max-Age=0; path=/';
  document.cookie = 'refreshToken=; Max-Age=0; path=/';
  await authStorage.clearTokens();
  if (store) store.dispatch(clearCredentials());
};

api.interceptors.request.use(
  async (config) => {
    if (config.data instanceof FormData) delete config.headers['Content-Type'];

    // Mobile: cookies are unreliable (ITP, in-app WebViews). Attach the
    // access token explicitly so requests don't depend on the cookie alone.
    if (isMobileBrowser) {
      const { accessToken } = await authStorage.getTokens();
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  refreshQueue = [];
};

// Build the refresh call — mobile sends the refresh token explicitly in the
// body since its cookie may already be gone; desktop relies on the cookie.
const doRefresh = async () => {
  let body = {};
  if (isMobileBrowser) {
    const { refreshToken } = await authStorage.getTokens();
    if (!refreshToken) throw new Error('No refresh token available');
    body = { refreshToken };
  }
  return axios.post(`${BASE_URL}/auth/refresh-token`, body, { withCredentials: true });
};

export const refreshSession = () => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }));
  }
  isRefreshing = true;
  return doRefresh()
    .then(async (res) => {
      // Mobile: persist the newly rotated tokens back to localStorage
      if (isMobileBrowser && res.data?.data) {
        const { accessToken, refreshToken } = res.data.data;
        if (accessToken) await authStorage.setTokens(accessToken, refreshToken);
      }
      processQueue(null);
      return res;
    })
    .catch((err) => {
      processQueue(err);
      const status = err.response?.status;
      if (status === 401 || status === 403) clearSession();
      throw err;
    })
    .finally(() => { isRefreshing = false; });
};

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.data !== undefined) response.data = response.data.data;
    return response;
  },
  async (error) => {
    const original = error.config;
    if (original._skipInterceptor) return Promise.reject(error);

    if (error.response?.status === 401 && original.url?.includes('refresh-token')) {
      if (navigator.onLine === false) return Promise.reject(error);
      await clearSession();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }))
          .then(() => api(original))
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const res = await doRefresh();

        if (isMobileBrowser && res.data?.data) {
          const { accessToken, refreshToken } = res.data.data;
          if (accessToken) await authStorage.setTokens(accessToken, refreshToken);
        }

        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        const status = refreshError.response?.status;
        if (status === 401 || status === 403) {
          await clearSession();
        } else {
          console.warn('[API:Web] Refresh attempt failed transiently, not logging out:', refreshError.message);
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