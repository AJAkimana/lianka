import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string;
  account_state: string;
  kyc_status: string;
  rank: string;
  rank_level: number;
  loyalty_score: number;
  referral_code: string;
  principal: number;
  active_deposit: number;
  total_profit: number;
  total_balance: number;
  cycle_progress_percent: number;
  next_withdrawal_date: string;
  timeframe: string;
  two_fa_enabled: boolean;
  profit_wallet_balance: number;
  referral_wallet_balance: number;
  promotion_wallet_balance: number;
  total_referrals: number;
  active_referrals: number;
  grace_end_date?: string | null;
  completed_cycles: number;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  unreadCount: number;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setUnreadCount: (n: number) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token:
    typeof window !== 'undefined' ? localStorage.getItem('lianka_token') : null,
  isLoading: false,
  unreadCount: 0,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lianka_token', token);
    }
    set({ token });
  },
  setUnreadCount: (n) => set({ unreadCount: n }),
  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lianka_token');
      localStorage.removeItem('lianka_user');
      window.location.href = '/login';
    }
    set({ user: null, token: null });
  },
}));

// ─── Admin store ─────────────────────────────────────────
interface AdminState {
  admin: any | null;
  adminToken: string | null;
  setAdmin: (admin: any) => void;
  setAdminToken: (token: string) => void;
  adminLogout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  adminToken:
    typeof window !== 'undefined'
      ? localStorage.getItem('lianka_admin_token')
      : null,

  setAdmin: (admin) => set({ admin }),
  setAdminToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lianka_admin_token', token);
    }
    set({ adminToken: token });
  },
  adminLogout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lianka_admin_token');
      window.location.href = '/admin/login';
    }
    set({ admin: null, adminToken: null });
  },
}));
