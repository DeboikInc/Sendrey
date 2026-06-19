import axios from "axios";
const BASE_URL = process.env.REACT_APP_ADMIN_API_URL;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    },
    withCredentials: true,
});

// Response interceptor only — 2 args
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.data !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let store;

export const injectStore = (_store) => {
    store = _store;

    api.interceptors.request.use(
        (config) => {
            const token = store?.getState()?.auth?.token;
            console.log('Request token:', token ? 'token exist' : 'no token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
};

export default api;