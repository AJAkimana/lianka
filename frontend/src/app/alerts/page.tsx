'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { BottomNav, fmt } from '@/components/ui';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type AlertType = 'Action Required' | 'Reminder' | 'Security' | 'Alert' | 'Information';

const BADGE_STYLES: Record<AlertType, string> = {
  'Action Required': 'bg-[#C1121F20] text-[#C1121F] border border-[#C1121F40]',
  'Reminder':        'bg-[#F9A82520] text-[#F9A825] border border-[#F9A82540]',
  'Security':        'bg-[#1565C020] text-[#1565C0] border border-[#1565C040]',
  'Alert':           'bg-[#7B1FA220] text-[#7B1FA2] border border-[#7B1FA240]',
  'Information':     'bg-[#55555520] text-[#888] border border-[#33333340]',
};

const ICON_BG: Record<AlertType, string> = {
  'Action Required': 'bg-[#C1121F20]',
  'Reminder':        'bg-[#F9A82520]',
  'Security':        'bg-[#1565C020]',
  'Alert':           'bg-[#7B1FA220]',
  'Information':     'bg-[#00C85520]',
};

export default function ImportantAlertsPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    notificationAPI.getAll(1).then(r => {
      setNotifications(r.data.items || []);
    }).finally(() => setLoading(false));
  }, [token]);

  // Build alert list — critical ones from API + static important ones based on account state
  const staticAlerts = [
    user?.kyc_status !== 'VERIFIED' && {
      type: 'Action Required' as AlertType,
      icon: '⚠️',
      title: 'Verify Your Identity (KYC)',
      message: 'Complete your KYC verification to unlock full account features and ensure uninterrupted transactions.',
      time: 'Action required',
      action: { label: 'Verify Now', href: '/kyc', color: '#C1121F' },
    },
    user?.account_state === 'GRACE' && {
      type: 'Reminder' as AlertType,
      icon: '🔔',
      title: 'Grace Period Active',
      message: `You have limited days left in your grace period. Make a deposit to continue earning daily ROI.`,
      time: `Expires: ${user?.grace_end_date ? new Date(user.grace_end_date).toLocaleDateString() : 'Soon'}`,
      action: { label: 'Deposit Now', href: '/deposit', color: '#F9A825' },
    },
    !user?.two_fa_enabled && {
      type: 'Security' as AlertType,
      icon: '🛡',
      title: 'Enable Two-Factor Authentication (2FA)',
      message: 'Protect your account by enabling 2FA. This adds an extra layer of security to your account.',
      time: 'Recommended',
      action: { label: 'Enable 2FA', href: '/security/2fa', color: '#1565C0' },
    },
  ].filter(Boolean);

  const criticalNotifications = notifications
    .filter(n => n.is_critical && !n.is_read)
    .slice(0, 6);

  const allAlerts = [...staticAlerts, ...criticalNotifications.map(n => ({
    type: 'Alert' as AlertType,
    icon: '🔔',
    title: n.title,
    message: n.message,
    time: new Date(n.created_at).toLocaleString(),
    action: null,
  }))];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#111] px-4 py-3">
        <Link href="/" className="flex items-center gap-1.5 mb-1">
          <span className="text-[#00C853] font-black text-xl">L</span>
          <span className="text-white font-bold text-sm">LIANKA</span>
        </Link>
        <p className="text-[#555] text-xs">
          Stay informed about important updates and actions for your account security.
        </p>
      </div>

      <div className="flex gap-3 px-4 mt-4">
        {/* Left sidebar */}
        <div className="w-36 shrink-0 space-y-3">
          {/* Balance card */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
            <p className="text-[#555] text-[10px] mb-1">Total Balance</p>
            <p className="text-white font-black text-lg">{fmt.usd(user?.total_balance || 0)}</p>
            <div className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <p className="text-[#555] text-[9px]">Active Deposit</p>
                <p className="text-white text-[9px]">{fmt.usd(user?.active_deposit || 0)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#555] text-[9px]">Total Profit</p>
                <p className="text-[#00C853] text-[9px]">{fmt.usd(user?.total_profit || 0)}</p>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <button onClick={() => router.push('/dashboard')}
                className="flex-1 text-[9px] text-[#00C853] border border-[#00C85330] rounded py-1">Reinvest</button>
              <button onClick={() => router.push('/dashboard')}
                className="flex-1 text-[9px] text-[#1565C0] border border-[#1565C030] rounded py-1">Details</button>
            </div>
            <div className="mt-2 bg-[#00C85510] border border-[#00C85330] rounded-lg p-1.5 text-center">
              <p className="text-[#00C853] text-[9px] font-semibold">● Cycle active — earning daily ROI</p>
            </div>
          </div>

          {/* Nav */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
            <p className="text-[#555] text-[9px] font-bold uppercase tracking-wider mb-2">Main Menu</p>
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Earn', href: '/earn' },
              { label: 'Deposit', href: '/deposit' },
              { label: 'Withdraw', href: '/withdraw' },
              { label: 'Transactions', href: '/transactions' },
              { label: 'Referral', href: '/earn/referrals' },
              { label: 'Profile', href: '/profile' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="block py-1.5 text-[#888] text-[11px] hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
          </div>

          {/* Security tip */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
            <p className="text-[#1565C0] text-[10px] font-semibold mb-1">🛡 Security Tip</p>
            <p className="text-[#666] text-[9px]">
              Never share your password, 2FA codes, or recovery phrase with anyone. Lianka will never ask for this information.
            </p>
          </div>
        </div>

        {/* Right — Alerts panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden mb-3">
            <div className="flex items-center gap-2 p-3 border-b border-[#1a1a1a]">
              <span className="text-lg">🔔</span>
              <div>
                <p className="text-white font-bold text-sm">Important Alerts</p>
                <p className="text-[#555] text-[10px]">Critical updates and actions you should not miss.</p>
              </div>
            </div>

            {allAlerts.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-4xl mb-2">✅</p>
                <p className="text-[#555] text-sm">No urgent alerts</p>
                <p className="text-[#444] text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div>
                {(allAlerts as any[]).map((alert: any, i: number) => (
                  <div key={i}
                    className="flex items-start gap-3 p-3 border-b border-[#0d0d0d] last:border-0
                               hover:bg-[#0d0d0d] transition-colors">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${ICON_BG[alert.type as AlertType]}`}>
                      {alert.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-white text-xs font-semibold">{alert.title}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[alert.type as AlertType]}`}>
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-[#888] text-[11px] leading-snug mb-1.5">{alert.message}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[#444] text-[10px]">📅 {alert.time}</p>
                        {alert.action && (
                          <button
                            onClick={() => router.push(alert.action.href)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: alert.action.color + '20', color: alert.action.color, border: `1px solid ${alert.action.color}40` }}>
                            {alert.action.label}
                          </button>
                        )}
                        {!alert.action && (
                          <ChevronRight size={14} className="text-[#444]" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Important notice */}
          <div className="bg-[#1565C010] border border-[#1565C030] rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="text-[#1565C0] shrink-0">ℹ</span>
              <p className="text-[#888] text-xs">
                <span className="text-white font-semibold">Important Notice:</span>{' '}
                Please take action on the alerts above to keep your account secure and avoid any interruption to your earnings or transactions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
