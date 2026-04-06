import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',   // ✅ FIXED HERE
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('icms_token');  // make sure this key is correct
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401/403 redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('icms_token');
      localStorage.removeItem('icms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;