import axios from 'axios';
import { useStore } from './store';

const api = axios.create({
  // Gunakan Environment Variable untuk produksi, atau IP dinamis untuk lokal WiFi
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

api.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) {
    config.headers['X-Authorization'] = `Bearer ${token}`;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      if (error.response.status === 401) {
        useStore.getState().logout();
        window.location.hash = '#/login';
      } else if (error.response.status >= 400) {
        if (!window.location.hash.startsWith('#/error')) {
          const msg = encodeURIComponent(error.response.data?.message || 'Terjadi kesalahan pada permintaan Anda.');
          window.location.hash = `#/error?status=${error.response.status}&message=${msg}`;
        }
      }
    } else if (error.request) {
      if (!window.location.hash.startsWith('#/error')) {
        const msg = encodeURIComponent('Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau server mungkin sedang down.');
        window.location.hash = `#/error?status=Koneksi&message=${msg}`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
