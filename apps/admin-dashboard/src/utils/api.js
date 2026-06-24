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

let store;
let navigate;

export const injectStore = (_store) => {
    store = _store;
    
    api.interceptors.request.use(
        (config) => {
            const token = store?.getState()?.auth?.token;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
};

export const injectNavigate = (_navigate) => {
    navigate = _navigate;
};

// Response interceptor
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.data !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            console.warn('🔴 401 Unauthorized — redirecting to login');
            
            if (store) {
                store.dispatch({ type: 'auth/clearCredentials' });
            }
            localStorage.removeItem('persist:auth');
            
            // Use React Router navigate if available
            if (navigate) {
                navigate('/');
            } else {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;