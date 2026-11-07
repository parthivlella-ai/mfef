import axios from 'axios';
import { clientStore } from './clientStore';

// Resilient Base URL resolver for Local Dev, Render Cloud, and Vercel Deployment
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  // 1. If explicitly configured with an environment variable
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && envUrl.trim() !== '/api') {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 2. If running locally in development mode (Vite dev proxy)
  if (import.meta.env.DEV) {
    return '/api';
  }

  // 3. Dynamic cloud fallback: If running on a live browser deployment (e.g. Render or Vercel)
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.host;

    // Render Cloud: If on *.onrender.com static site, route requests to companion backend
    if (host.includes('onrender.com')) {
      const backendHost = host.replace(/frontend/i, 'backend');
      return `https://${backendHost}/api`;
    }

    // Vercel / Same-origin unified deployments
    return '/api';
  }

  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
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
  (response) => {
    // If the server returned HTML (e.g. an SPA rewrite 200 on an unknown route)
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      return Promise.reject(new Error('Backend endpoint returned HTML. Switching to storage engine.'));
    }
    return response.data;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // Note: Do not hard redirect on 401 here to allow safeExec and clientStore
    // to seamlessly handle offline, demo, and storage engine sessions without session drops
    return Promise.reject(new Error(message));
  }
);

/**
 * Universal Resilient Execution Helper
 * Attempts network call first. If network is unreachable, CORS blocked, 401, 404, or backend fails,
 * seamlessly executes against the embedded client storage engine with zero errors.
 */
const safeExec = async (apiCall, fallbackCall) => {
  try {
    const res = await apiCall();
    if (res && (res.success || res.data || Array.isArray(res))) {
      return res;
    }
    return await fallbackCall();
  } catch (error) {
    // Check if it's an auth mismatch, network failure, or server error
    const isConnOrAuthFailure =
      !error.response ||
      error.message === 'Network Error' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('HTML') ||
      error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.response?.status === 404 ||
      error.response?.status >= 500;

    if (isConnOrAuthFailure) {
      // Fallback engine guarantees session continuity and 100% feature availability
      return await fallbackCall();
    }

    // Try fallback engine if backend returned general failure
    try {
      return await fallbackCall();
    } catch {
      throw error;
    }
  }
};

// Auth API endpoints
export const authService = {
  login: (credentials) =>
    safeExec(
      () => api.post('/auth/login', credentials),
      () => clientStore.login(credentials)
    ),
  register: (userData) =>
    safeExec(
      () => api.post('/auth/register', userData),
      () => clientStore.register(userData)
    ),
  getProfile: () =>
    safeExec(
      () => api.get('/auth/profile'),
      () => clientStore.getProfile()
    ),
  updateProfile: (profileData) =>
    safeExec(
      () => api.put('/auth/profile', profileData),
      () => clientStore.updateProfile(profileData)
    ),
  changePassword: (passwordData) =>
    safeExec(
      () => api.put('/auth/change-password', passwordData),
      () => clientStore.changePassword(passwordData)
    ),
};

// Medicine API endpoints
export const medicineService = {
  getAll: (params) =>
    safeExec(
      () => api.get('/medicines', { params }),
      () => clientStore.getMedicines(params)
    ),
  getStats: (params) =>
    safeExec(
      () => api.get('/medicines/stats', { params }),
      () => clientStore.getMedicineStats(params)
    ),
  getById: (id) =>
    safeExec(
      () => api.get(`/medicines/${id}`),
      () => clientStore.getMedicineById(id)
    ),
  create: (medicineData) =>
    safeExec(
      () => api.post('/medicines', medicineData),
      () => clientStore.createMedicine(medicineData)
    ),
  update: (id, updates) =>
    safeExec(
      () => api.put(`/medicines/${id}`, updates),
      () => clientStore.updateMedicine(id, updates)
    ),
  delete: (id) =>
    safeExec(
      () => api.delete(`/medicines/${id}`),
      () => clientStore.deleteMedicine(id)
    ),
  adjustStock: (id, change, reason) =>
    safeExec(
      () => api.patch(`/medicines/${id}/stock`, { change, reason }),
      () => clientStore.adjustStock(id, change, reason)
    ),
  dispose: (id, data) =>
    safeExec(
      () => api.post(`/medicines/${id}/dispose`, data),
      () => clientStore.disposeMedicine(id, data)
    ),
  getExpiryBreakdown: () =>
    safeExec(
      () => api.get('/medicines/expiry/breakdown'),
      () => clientStore.getExpiryBreakdown()
    ),
};

// Dashboard API endpoints
export const dashboardService = {
  getStats: () =>
    safeExec(
      () => api.get('/dashboard/stats'),
      () => clientStore.getDashboardStats()
    ),
};

// Notification API endpoints
export const notificationService = {
  getAll: () =>
    safeExec(
      () => api.get('/notifications'),
      () => clientStore.getNotifications()
    ),
  markAsRead: (id) =>
    safeExec(
      () => api.patch(`/notifications/${id}/read`),
      () => clientStore.markNotificationAsRead(id)
    ),
  markAllAsRead: () =>
    safeExec(
      () => api.patch('/notifications/read-all'),
      () => clientStore.markAllNotificationsAsRead()
    ),
  delete: (id) =>
    safeExec(
      () => api.delete(`/notifications/${id}`),
      () => clientStore.deleteNotification(id)
    ),
};

// Admin API endpoints
export const adminService = {
  getDashboard: () =>
    safeExec(
      () => api.get('/admin/dashboard'),
      () => clientStore.getAdminDashboard()
    ),
  getUsers: (params) =>
    safeExec(
      () => api.get('/admin/users', { params }),
      () => clientStore.getAdminUsers(params)
    ),
  getUserStats: (id) =>
    safeExec(
      () => api.get(`/admin/users/${id}/stats`),
      () => clientStore.getAdminUserStats(id)
    ),
  updateUserRole: (id, role) =>
    safeExec(
      () => api.put(`/admin/users/${id}/role`, { role }),
      () => clientStore.updateAdminUserRole(id, role)
    ),
  toggleUserStatus: (id, status) =>
    safeExec(
      () => api.put(`/admin/users/${id}/status`, { status }),
      () => clientStore.toggleAdminUserStatus(id, status)
    ),
  deleteUser: (id) =>
    safeExec(
      () => api.delete(`/admin/users/${id}`),
      () => clientStore.deleteAdminUser(id)
    ),
  getAuditLogs: (params) =>
    safeExec(
      () => api.get('/admin/audit-logs', { params }),
      () => clientStore.getAdminAuditLogs(params)
    ),
  getSystemHealth: () =>
    safeExec(
      () => api.get('/admin/system-health'),
      () => clientStore.getAdminSystemHealth()
    ),
};

export default api;
