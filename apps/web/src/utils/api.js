// utils/api.js - web-app
import axios from "axios";
import { 
  clearCredentials, 
  // setToken 
} from "../Redux/authSlice";

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
  document.cookie = 'token=; Max-Age=0; path=/';
  document.cookie = 'refreshToken=; Max-Age=0; path=/';

  if (store) {
    store.dispatch(clearCredentials());
  }
};


api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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

    // Refresh call itself failed — session is genuinely gone (revoked or truly expired)
    if (error.response?.status === 401 && original.url?.includes('refresh-token')) {
      await clearSession();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => api(original))
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        const status = refreshError.response?.status;
        const isAuthFailure = status === 401 || status === 403;

        if (isAuthFailure) {
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