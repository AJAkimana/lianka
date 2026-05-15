// ─── lib/api.ts ──────────────────────────────────────────
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Admin token takes priority over user token
    const adminToken = localStorage.getItem('lianka_admin_token');
    const userToken = localStorage.getItem('lianka_token');
    const token = adminToken || userToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('lianka_token');
      localStorage.removeItem('lianka_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── API functions ───────────────────────────────────────

export const authAPI = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  verifyEmail: (d: { token?: string; code?: string }) =>
    api.post('/auth/verify-email', d),
  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),
  requestReset: (email: string) =>
    api.post('/auth/request-password-reset', { email }),
  resetPassword: (d: any) => api.post('/auth/reset-password', d),
  changePassword: (d: any) => api.post('/auth/change-password', d),
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
  disable2FA: (code: string) => api.post('/auth/2fa/disable', { code }),
  refresh: (token: string) =>
    api.post('/auth/refresh', { refresh_token: token }),
};

export const userAPI = {
  getMe: () => api.get('/users/me'),
  getLedger: (page = 1) => api.get(`/users/me/ledger?page=${page}`),
  getTransactions: (page = 1, type?: string) =>
    api.get(
      `/users/me/transactions?page=${page}${type ? `&type=${type}` : ''}`,
    ),
};

export const depositAPI = {
  getInfo: () => api.get('/deposits/info'),
  submit: (d: any) => api.post('/deposits/submit', d),
  getMy: (page = 1) => api.get(`/deposits/my?page=${page}`),
};

export const withdrawalAPI = {
  request: (d: any) => api.post('/withdrawals/request', d),
  cancel: (id: string) => api.delete(`/withdrawals/cancel/${id}`),
  getMy: (page = 1) => api.get(`/withdrawals/my?page=${page}`),
  getPending: () => api.get('/withdrawals/pending'),
};

export const notificationAPI = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};

export const kycAPI = {
  getStatus: () => api.get('/kyc/status'),
  submit: (formData: FormData) =>
    api.post('/kyc/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const referralAPI = {
  getDashboard: () => api.get('/referrals/dashboard'),
};

export const roiAPI = {
  getHistory: (limit = 30) => api.get(`/roi/history?limit=${limit}`),
  getRates: (date?: string) =>
    api.get(`/roi/rates${date ? `?date=${date}` : ''}`),
};

export const earnAPI = {
  getRank: () => api.get('/earn/rank'),
  getPrivileges: () => api.get('/earn/rank/privileges'),
  getLoyalty: () => api.get('/earn/loyalty'),
};

export const reinvestAPI = {
  execute: (amount: number) => api.post('/reinvestment/execute', { amount }),
  preview: (amount: number) =>
    api.get(`/reinvestment/preview?amount=${amount}`),
};

// Admin API
export const adminAPI = {
  login: (d: any) => api.post('/admin/login', d),
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}`),
  freezeUser: (id: string, reason: string) =>
    api.post(`/admin/users/${id}/freeze`, { reason }),
  unfreezeUser: (id: string, reason: string) =>
    api.post(`/admin/users/${id}/unfreeze`, { reason }),
  resetCycle: (id: string, notes: string) =>
    api.post(`/admin/users/${id}/reset-cycle`, { notes }),
  getPendingDeposits: () => api.get('/admin/deposits/pending'),
  approveDeposit: (id: string, notes?: string) =>
    api.post(`/admin/deposits/${id}/approve`, { notes }),
  rejectDeposit: (id: string, reason: string) =>
    api.post(`/admin/deposits/${id}/reject`, { reason }),
  getPendingWithdrawals: () => api.get('/admin/withdrawals/pending'),
  approveWithdrawal: (id: string, txid: string, notes?: string) =>
    api.post(`/admin/withdrawals/${id}/approve`, { txid_sent: txid, notes }),
  rejectWithdrawal: (id: string, reason: string) =>
    api.post(`/admin/withdrawals/${id}/reject`, { reason }),
  getPendingKYC: () => api.get('/admin/kyc/pending'),
  approveKYC: (id: string) => api.post(`/admin/kyc/${id}/approve`),
  rejectKYC: (id: string, reason: string) =>
    api.post(`/admin/kyc/${id}/reject`, { reason }),
  setROIRate: (d: any) => api.post('/admin/roi/set-rate', d),
  runROI: (date: string) => api.post('/admin/roi/run', { date }),
  issuePromotion: (d: any) => api.post('/admin/promotions/issue', d),
  createAdmin: (d: any) => api.post('/admin/admins/create', d),
  getAuditLog: (page = 1) => api.get(`/admin/audit-log?page=${page}`),
  emergencyPause: (type: string) => api.post(`/admin/emergency/pause/${type}`),
  emergencyResume: (type: string) =>
    api.post(`/admin/emergency/resume/${type}`),
  // ── New admin panel enhancement methods ──────────────────
  getFullOverview: () => api.get('/admin/overview/full'),
  getAllDeposits: (params?: { status?: string; page?: number }) =>
    api.get('/admin/deposits/all', { params }),
  flagDeposit: (id: string, reason: string) =>
    api.post(`/admin/deposits/${id}/flag`, { reason }),
  getAllWithdrawals: (params?: { status?: string; page?: number }) =>
    api.get('/admin/withdrawals/all', { params }),
  getTransactionLedger: (params?: {
    page?: number;
    type?: string;
    userId?: string;
  }) => api.get('/admin/ledger', { params }),
  getReferralOverview: (params?: { page?: number }) =>
    api.get('/admin/referrals', { params }),
  disableReferral: (id: string, reason: string) =>
    api.post(`/admin/referrals/${id}/disable`, { reason }),
  getLoyaltyOverview: (params?: { page?: number }) =>
    api.get('/admin/loyalty', { params }),
  getBreachedAccounts: () => api.get('/admin/breached'),
  processBreachReset: (id: string) =>
    api.post(`/admin/users/${id}/breach-reset`),
  flagUser: (id: string, reason: string) =>
    api.post(`/admin/users/${id}/flag`, { reason }),
  forceLogout: (id: string) => api.post(`/admin/users/${id}/force-logout`),
  applyROIToUser: (id: string, date: string) =>
    api.post(`/admin/users/${id}/roi`, { date }),
};
