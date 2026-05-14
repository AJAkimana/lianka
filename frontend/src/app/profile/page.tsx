'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { userAPI } from '@/lib/api';
import {
  Header,
  BottomNav,
  fmt,
  StatusBadge,
  ConfirmModal,
  Spinner,
} from '@/components/ui';
import {
  Shield,
  Lock,
  Bell,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const { token, user, logout } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    inapp: true,
  });

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    userAPI.getMe().then((r) => {
      setData(r.data);
      setLoading(false);
    });
  }, [token]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );

  return (
    <div className="screen">
      <Header title="Profile" />

      {/* Account Info */}
      <div className="mx-4 mt-4 card">
        <div className="flex items-center gap-4 mb-4">
          {/* Real avatar placeholder with camera icon */}
          <div className="relative shrink-0">
            <img
              src="/images/avatar-placeholder.png"
              alt="Profile"
              className="w-16 h-16 object-contain"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-bold">
                {data?.full_name || 'User'}
              </p>
              <StatusBadge status={data?.account_state} />
            </div>
            <p className="text-[#555] text-xs">{data?.email}</p>
            <p className="text-[#444] text-[11px] font-mono mt-0.5">
              ID: LIK{data?.id?.slice(-8).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#555] text-[10px] mb-1">Current Rank</p>
            <p className="text-[#F9A825] font-bold text-sm">{data?.rank}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-[#555] mb-0.5">Account State</p>
            <StatusBadge status={data?.account_state} />
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-2">
            <p className="text-[#555] mb-0.5">Member Since</p>
            <p className="text-white text-[11px]">
              {fmt.date(data?.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* KYC Section */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#00C85515] flex items-center justify-center">
            <Shield size={20} className="text-[#00C853]" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">KYC Verification</p>
            <p className="text-[#666] text-xs">
              Your identity is{' '}
              {data?.kyc_status === 'VERIFIED'
                ? 'verified'
                : 'required for withdrawal'}
            </p>
          </div>
          <StatusBadge status={data?.kyc_status} />
        </div>
        {data?.kyc_status === 'VERIFIED' ? (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#0f0f0f] rounded-lg p-2">
              <CheckCircle size={14} className="text-[#00C853] mx-auto mb-1" />
              <p className="text-[#555] text-[10px]">Verified On</p>
            </div>
            <div className="bg-[#0f0f0f] rounded-lg p-2">
              <CheckCircle size={14} className="text-[#00C853] mx-auto mb-1" />
              <p className="text-[#555] text-[10px]">3 Submitted</p>
            </div>
            <div className="bg-[#0f0f0f] rounded-lg p-2">
              <CheckCircle size={14} className="text-[#00C853] mx-auto mb-1" />
              <p className="text-[#555] text-[10px]">Next Review</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => router.push('/kyc')}
            className="btn-primary py-3 text-sm"
          >
            Complete KYC Verification
          </button>
        )}
      </div>

      {/* Security */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={16} className="text-[#7B1FA2]" />
          <p className="text-white font-semibold text-sm">Security</p>
        </div>
        {[
          {
            label: 'Two-Factor Authentication (2FA)',
            sub: 'Adds an extra layer of security',
            badge: data?.two_fa_enabled ? 'ENABLED' : 'DISABLED',
            href: '/security/2fa',
          },
          {
            label: 'Change Password',
            sub: 'Update your account password regularly',
            badge: null,
            href: '/security/password',
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => router.push(item.href)}
            className="w-full flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-0"
          >
            <div>
              <p className="text-white text-sm font-medium text-left">
                {item.label}
              </p>
              <p className="text-[#555] text-xs text-left">{item.sub}</p>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && <StatusBadge status={item.badge} />}
              <ChevronRight size={16} className="text-[#444]" />
            </div>
          </button>
        ))}
      </div>

      {/* Withdrawal Address */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-[#00C85520] flex items-center justify-center">
            <span className="text-[#00C853] text-xs font-bold">T</span>
          </div>
          <p className="text-white font-semibold text-sm">Withdrawal Address</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-semibold">USDT (TRC20)</p>
            <p className="text-[#555] font-mono text-[11px]">
              {data?.withdrawal_address
                ? `${data.withdrawal_address.slice(0, 8)}...${data.withdrawal_address.slice(-6)}`
                : 'Not set'}
            </p>
            <p className="text-[#444] text-[10px] mt-1">
              Address update cooldown: 24h
            </p>
          </div>
          <button
            onClick={() => router.push('/security/address')}
            className="text-[#1565C0] text-xs font-semibold border border-[#1565C030]
                       px-3 py-1.5 rounded-lg hover:bg-[#1565C010]"
          >
            Update Address
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-[#F9A825]" />
          <p className="text-white font-semibold text-sm">
            Notification Settings
          </p>
        </div>
        {[
          {
            label: 'Email Notifications',
            sub: 'Receive important updates and alerts via email',
            key: 'email',
          },
          {
            label: 'In-App Notifications',
            sub: 'Receive notifications within the app',
            key: 'inapp',
          },
        ].map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-0"
          >
            <div>
              <p className="text-white text-sm">{item.label}</p>
              <p className="text-[#555] text-xs">{item.sub}</p>
            </div>
            <button
              onClick={() =>
                setNotifications((prev) => ({
                  ...prev,
                  [item.key]: !prev[item.key as keyof typeof prev],
                }))
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                notifications[item.key as keyof typeof notifications]
                  ? 'bg-[#00C853]'
                  : 'bg-[#333]'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  notifications[item.key as keyof typeof notifications]
                    ? 'translate-x-7'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Preferences & Support */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-[#1565C0]" />
          <p className="text-white font-semibold text-sm">
            Preferences & Support
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '💵', label: 'Currency', sub: 'USD' },
            { icon: '🌐', label: 'Language', sub: 'English' },
            {
              icon: '❓',
              label: 'Help Center',
              sub: 'Get support',
              href: '/help',
            },
            {
              icon: '💬',
              label: 'Contact',
              sub: '24/7 Help',
              href: '/support',
            },
          ].map((item, i) => (
            <button
              key={i}
              className="bg-[#0f0f0f] rounded-xl p-2.5 text-center hover:bg-[#151515] transition-colors"
            >
              <div className="text-lg mb-1">{item.icon}</div>
              <p className="text-white text-[10px] font-semibold">
                {item.label}
              </p>
              <p className="text-[#555] text-[9px]">{item.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="mx-4 mt-3 mb-8">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="btn-danger py-3.5"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {showLogoutConfirm && (
        <ConfirmModal
          title="Log Out"
          message="Are you sure you want to log out of your Lianka account?"
          confirmLabel="Logout"
          confirmClass="bg-[#C1121F] text-white"
          onConfirm={logout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
