import axios from 'axios';
import { API_URL } from './config';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    // Try to get token from localStorage first (for immediate use after login)
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Note: HttpOnly cookie will be sent automatically by the browser
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear local storage on unauthorized error
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // We NO LONGER force redirect here, as some pages support guests
        }
        return Promise.reject(error);
    }
);

export default api;
