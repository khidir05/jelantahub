import axios from 'axios';

// Membuat instance axios dengan konfigurasi dasar
const api = axios.create({
  // Karena API kita ada di dalam project Next.js yang sama (di folder pages/api)
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor Request: Otomatis menyisipkan Token JWT sebelum request dikirim
api.interceptors.request.use(
  (config) => {
    // Pastikan kode ini berjalan di sisi client (browser), bukan di server (Next.js SSR)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      
      // Jika token ada, tambahkan ke header Authorization
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;