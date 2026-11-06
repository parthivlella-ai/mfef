import axios from 'axios';

// Resilient API base URL resolver for local development, Wi-Fi LAN access, and cloud production
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  // 1. If explicit absolute URL is configured in environment
  if (envUrl && envUrl.startsWith('http')) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 2. If running locally in browser (localhost, 127.0.0.1, or local Wi-Fi / LAN IP)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\./.test(hostname);

    if (isLocal) {
      // Connect directly to backend port 5000 on the same host/IP (bypasses Vite proxy issues)
      return `http://${hostname}:5000/api`;
    }
  }

  // 3. Fallback relative /api for production reverse proxies
  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('meditrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction and session expiration
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // Clarify generic browser "Network Error"
    if (error.message === 'Network Error' || !error.response) {
      message =
        'Network Error: Unable to reach backend server. Please verify backend is running on port 5000 and MongoDB is active.';
    }

    // If unauthorized or token expired
    if (error.response?.status === 401) {
      localStorage.removeItem('meditrack_token');
      localStorage.removeItem('meditrack_user');

      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/') {
        window.location.href = '/login?session=expired';
      }
    }

    return Promise.reject(new Error(message));
  }
);

// Auth API endpoints
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
};

// Medicine API endpoints
export const medicineService = {
  getAll: (params) => api.get('/medicines', { params }),
  getStats: (params) => api.get('/medicines/stats', { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (medicineData) => api.post('/medicines', medicineData),
  update: (id, updates) => api.put(`/medicines/${id}`, updates),
  delete: (id) => api.delete(`/medicines/${id}`),
  adjustStock: (id, change, reason) => api.patch(`/medicines/${id}/stock`, { change, reason }),
  dispose: (id, data) => api.post(`/medicines/${id}/dispose`, data),
  getExpiryBreakdown: () => api.get('/medicines/expiry/breakdown'),
};

// Dashboard API endpoints
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

// Notification API endpoints
export const notificationService = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Admin API endpoints
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserStats: (id) => api.get(`/admin/users/${id}/stats`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  toggleUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSystemHealth: () => api.get('/admin/system-health'),
};

export default api;
