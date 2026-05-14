'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { notificationAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { fmt } from '@/components/ui';
import { X, Bell, CheckCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const dotColors: Record<string, string> = {
  green: '#00C853',
  blue: '#1565C0',
  yellow: '#F9A825',
  red: '#C1121F',
  purple: '#7B1FA2',
  gray: '#555555',
};

const NOTIFICATION_TABS = ['All', 'Unread', 'Transactions'];

// Map notification type to tab category
const typeToTab: Record<string, string> = {
  ROI_APPLIED: 'Transactions',
  DEPOSIT_CONFIRMED: 'Transactions',
  WITHDRAWAL_COMPLETED: 'Transactions',
  WITHDRAWAL_REJECTED: 'Transactions',
  REFERRAL_DEPOSITED: 'Transactions',
  PROMOTION_EARNED: 'Transactions',
};

// Map type to action button
const getAction = (n: any) => {
  if (n.type === 'GRACE_WARNING' || n.type === 'CYCLE_COMPLETED') {
    return { label: 'Deposit Now', href: '/deposit', color: '#F9A825' };
  }
  if (n.type === 'KYC_REJECTED' || n.type === 'KYC_APPROVED') {
    return { label: 'View KYC', href: '/kyc', color: '#1565C0' };
  }
  if (n.type === 'RANK_CHANGED') {
    return { label: 'View Rank', href: '/earn/rank', color: '#7B1FA2' };
  }
  if (n.type === 'WITHDRAWAL_COMPLETED' && n.metadata?.txid) {
    return { label: 'View TX', href: '/transactions', color: '#00C853' };
  }
  return null;
};

// Amount display (green for credit, red for debit)
const getAmount = (n: any) => {
  if (n.metadata?.amount) {
    const isDebit =
      n.type?.includes('WITHDRAWAL') && !n.type?.includes('REJECTED');
    return {
      val: `${isDebit ? '-' : '+'}${fmt.usd(n.metadata.amount)}`,
      color: isDebit ? '#C1121F' : '#00C853',
    };
  }
  return null;
};

// Group by date
function groupByDate(notifications: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  notifications.forEach((n) => {
    const d = new Date(n.created_at).toDateString();
    const label =
      d === today ? 'Today' : d === yesterday ? 'Yesterday' : 'This Week';
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { setUnreadCount } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('All');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      setTab('All');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll(1);
      setNotifications(res.data.items || []);
      setUnread(res.data.unread_count || 0);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnread(0);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      toast.error('Failed');
    }
  };

  const markOne = async (id: string) => {
    await notificationAPI.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
    setUnreadCount(Math.max(0, unread - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnread(0);
    setUnreadCount(0);
  };

  // Filter by tab
  const filtered = notifications.filter((n) => {
    if (tab === 'All') return true;
    if (tab === 'Unread') return !n.is_read;
    if (tab === 'Transactions') return typeToTab[n.type] === 'Transactions';
    return true;
  });

  const grouped = groupByDate(filtered);
  const groupKeys = ['Today', 'Yesterday', 'This Week'].filter(
    (k) => grouped[k]?.length > 0,
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50
                    bg-[#111] rounded-b-2xl shadow-2xl border-x border-b border-[#1a1a1a]
                    transition-transform duration-300 ease-out overflow-hidden`}
        style={{
          top: 0,
          maxHeight: '70vh',
          transform: `translateX(-50%) translateY(${isOpen ? '0' : '-100%'})`,
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-0">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#00C853]" />
            <span className="text-white font-bold">Notifications</span>
            {unread > 0 && (
              <span
                className="bg-[#7B1FA2] text-white text-[9px] font-bold
                               rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[#1565C0] text-xs font-semibold"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-[#555] hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 3-tab bar matching Screen 24 */}
        <div className="flex border-b border-[#1a1a1a]">
          {NOTIFICATION_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors
                ${
                  tab === t
                    ? 'border-[#00C853] text-[#00C853]'
                    : 'border-transparent text-[#555] hover:text-white'
                }`}
            >
              {t}
              {t === 'Unread' && unread > 0 ? ` (${unread})` : ''}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(70vh - 120px)' }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center px-6">
              <Bell size={28} className="text-[#333] mb-2" />
              <p className="text-[#555] text-sm">
                {tab === 'Unread'
                  ? 'All caught up! No unread notifications.'
                  : 'No notifications yet.'}
              </p>
            </div>
          ) : (
            groupKeys.map((groupKey) => (
              <div key={groupKey}>
                <p className="text-[#555] text-[11px] font-semibold px-4 py-2 sticky top-0 bg-[#111]">
                  {groupKey}
                </p>
                {grouped[groupKey].map((n) => {
                  const action = getAction(n);
                  const amount = getAmount(n);
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markOne(n.id);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3.5
                                 border-b border-[#0d0d0d] text-left transition-colors
                                 hover:bg-[#161616] ${!n.is_read ? 'bg-[#0d0d0d]' : ''}`}
                    >
                      {/* Category icon circle */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                        style={{
                          background: (dotColors[n.dot_color] || '#555') + '20',
                        }}
                      >
                        {n.type?.includes('ROI')
                          ? '📈'
                          : n.type?.includes('DEPOSIT')
                            ? '⬇'
                            : n.type?.includes('WITHDRAWAL')
                              ? '⬆'
                              : n.type?.includes('REFERRAL')
                                ? '👥'
                                : n.type?.includes('RANK')
                                  ? '⭐'
                                  : n.type?.includes('KYC')
                                    ? '🛡'
                                    : n.type?.includes('GRACE')
                                      ? '🔔'
                                      : 'ℹ'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 gap-2">
                          <p
                            className={`text-sm font-semibold leading-tight ${!n.is_read ? 'text-white' : 'text-[#aaa]'}`}
                          >
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {amount && (
                              <span
                                className="font-bold text-xs"
                                style={{ color: amount.color }}
                              >
                                {amount.val}
                              </span>
                            )}
                            {!n.is_read && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: dotColors[n.dot_color] || '#555',
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <p className="text-[#666] text-xs leading-snug mb-1.5">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-[#444] text-[10px]">
                            {fmt.ago(n.created_at)}
                          </p>
                          {action && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                router.push(action.href);
                              }}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                              style={{
                                color: action.color,
                                background: action.color + '20',
                                border: `1px solid ${action.color}40`,
                              }}
                            >
                              {action.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1a1a1a] px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              router.push('/profile');
            }}
            className="text-[#555] text-xs flex items-center gap-1 hover:text-white"
          >
            ⚙ Notification Settings
          </button>
          <button
            onClick={clearAll}
            className="text-[#C1121F] text-xs flex items-center gap-1 hover:text-white"
          >
            <Trash2 size={12} /> Clear All
          </button>
        </div>

        {/* Swipe hint */}
        <p className="text-center text-[#333] text-[10px] py-1.5 flex items-center justify-center gap-1">
          ↕ Swipe down to close
        </p>
      </div>
    </>
  );
}
