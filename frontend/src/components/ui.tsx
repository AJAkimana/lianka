'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  Home, Star, ArrowDownToLine, ArrowUpFromLine, User,
  Bell, ChevronRight, Shield, CheckCircle, AlertTriangle,
  XCircle, Lock, TrendingUp, Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Bottom Navigation ───────────────────────────────────
export function BottomNav() {
  const pathname = usePathname();
  const tabs = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/earn', label: 'Earn', icon: Star },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
    { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
    { href: '/profile', label: 'Profile', icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50
                    bg-[#0d0d0d] border-t border-[#1a1a1a] flex">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href}
            className={clsx('flex-1 flex flex-col items-center py-2 pt-3 transition-colors',
              active ? 'text-[#00C853]' : 'text-[#444]')}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Header ──────────────────────────────────────────────
export function Header({ title, back }: { title?: string; back?: string }) {
  const { unreadCount } = useAuthStore();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-[#111]
                       flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {back ? (
          <button onClick={() => router.back()}
            className="text-[#888] hover:text-white transition-colors">
            ← 
          </button>
        ) : null}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-[#00C853] font-black text-2xl tracking-wider">L</span>
          <span className="text-white font-bold text-sm tracking-widest">LIANKA</span>
        </Link>
      </div>
      {title && (
        <span className="absolute left-1/2 -translate-x-1/2 text-white font-semibold text-sm">
          {title}
        </span>
      )}
      <Link href="/notifications" className="relative p-1">
        <Bell size={20} className="text-[#888]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#7B1FA2] text-white
                           text-[9px] font-bold rounded-full min-w-[16px] h-4
                           flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}

// ─── Account State Banner ────────────────────────────────
export function StateBanner({ state, graceEndDate }: { state: string; graceEndDate?: string }) {
  if (state === 'ACTIVE') return null;

  const daysLeft = graceEndDate
    ? Math.max(0, Math.ceil((new Date(graceEndDate).getTime() - Date.now()) / 86400000))
    : 0;

  const configs: Record<string, any> = {
    GRACE: {
      cls: 'alert-grace',
      icon: <AlertTriangle size={18} className="text-[#F9A825] shrink-0" />,
      msg: `Cycle complete — redeposit within ${daysLeft} days or account deactivates`,
      btn: { label: 'Deposit Now', href: '/deposit', cls: 'bg-[#F9A825] text-black' },
    },
    INACTIVE: {
      cls: 'alert-inactive',
      icon: <Shield size={18} className="text-[#888] shrink-0" />,
      msg: 'No active cycle — deposit to restart',
      btn: { label: 'Deposit', href: '/deposit', cls: 'bg-[#00C853] text-black' },
    },
    TERMINATED: {
      cls: 'alert-terminated',
      icon: <XCircle size={18} className="text-[#C1121F] shrink-0" />,
      msg: 'Account closed due to principal breach',
      btn: null,
    },
    FROZEN: {
      cls: 'alert-terminated',
      icon: <Lock size={18} className="text-[#C1121F] shrink-0" />,
      msg: 'Account frozen by admin',
      btn: null,
    },
  };

  const c = configs[state];
  if (!c) return null;

  return (
    <div className={c.cls + ' mx-4 mt-3'}>
      {c.icon}
      <p className="text-[13px] text-[#ccc] flex-1 leading-snug">{c.msg}</p>
      {c.btn && (
        <Link href={c.btn.href}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 ${c.btn.cls}`}>
          {c.btn.label}
        </Link>
      )}
    </div>
  );
}

// ─── Loading Spinner ─────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-[#00C853]" />;
}

// ─── Empty State ─────────────────────────────────────────
export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-[#333] mb-3">{icon || <TrendingUp size={40} />}</div>
      <p className="text-[#555] text-sm">{message}</p>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-active',
    GRACE: 'badge-grace',
    INACTIVE: 'badge-inactive',
    TERMINATED: 'badge-frozen',
    FROZEN: 'badge-frozen',
    PENDING: 'bg-[#F9A82520] text-[#F9A825] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
    APPROVED: 'badge-active',
    COMPLETED: 'badge-active',
    REJECTED: 'badge-frozen',
    VERIFIED: 'badge-verified',
    SUBMITTED: 'bg-[#1565C020] text-[#1565C0] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
  };
  return <span className={map[status] || 'badge-inactive'}>{status}</span>;
}

// ─── Progress Bar ────────────────────────────────────────
export function ProgressBar({ percent, color = '#00C853' }: { percent: number; color?: string }) {
  return (
    <div className="progress-bar">
      <div
        className="progress-fill transition-all duration-700"
        style={{ width: `${Math.min(percent, 100)}%`, background: color }}
      />
    </div>
  );
}

// ─── Confirmation Modal ──────────────────────────────────
export function ConfirmModal({
  title, message, onConfirm, onCancel, confirmLabel = 'Confirm',
  confirmClass = 'btn-primary', isLoading = false,
}: {
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmClass?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="bg-[#161616] rounded-t-2xl w-full max-w-[430px] p-6 border-t border-[#222]">
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        <div className="text-[#888] text-sm mb-6 leading-relaxed">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl border border-[#333] text-[#888]
                       font-semibold text-sm hover:border-[#555] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className={`flex-1 py-3.5 rounded-xl font-bold text-sm
                        flex items-center justify-center gap-2
                        disabled:opacity-50 ${confirmClass}`}>
            {isLoading ? <Spinner size={16} /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info Row ────────────────────────────────────────────
export function InfoRow({ label, value, valueClass = 'text-white' }: {
  label: string; value: any; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-0">
      <span className="text-[#666] text-sm">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── Format helpers ──────────────────────────────────────
export const fmt = {
  usd: (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  pct: (n: number) => `${Number(n || 0).toFixed(2)}%`,
  date: (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  ago: (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return fmt.date(d);
  },
};
