import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach Bearer token ──────────────────────────────
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ehr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — unwrap data, handle 401 globally ───────────────
axiosClient.interceptors.response.use(
  (response) => response.data, // unwrap so callers get { success, data, message } directly
  (error) => {
    if (error.response?.status === 401) {
      // Use a custom event to avoid circular import with the Redux store
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
