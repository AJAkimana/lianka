'use client';
// ═══════════════════════════════════════════════════════════
// EARN SCREEN + NOTIFICATIONS + TRANSACTIONS
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  referralAPI,
  earnAPI,
  notificationAPI as notifAPI,
  userAPI as uAPI,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Header, BottomNav, fmt, ProgressBar, Spinner } from '@/components/ui';
import { Copy, Share2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export function EarnPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [refData, setRefData] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    Promise.all([referralAPI.getDashboard(), earnAPI.getLoyalty()])
      .then(([r, l]) => {
        setRefData(r.data);
        setLoyalty(l.data);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );

  const refLink = `https://lianka.com/ref/${user?.referral_code || ''}`;
  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    toast.success('Referral link copied');
  };

  const rankProgress =
    {
      'New Member': 0,
      Contributor: 20,
      Builder: 40,
      'Growth Partner': 60,
      'Strategic Partner': 80,
      'Elite Contributor': 100,
    }[user?.rank || 'New Member'] || 0;

  const rankLevel = user?.rank_level || 1;

  return (
    <div className="screen">
      <Header title="Earn" />
      <p className="text-[#555] text-xs text-center py-2">
        Grow your income, rank up and unlock more benefits.
      </p>

      {/* 1. Rank Progress */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title mb-0">1. Rank Progress</p>
        </div>
        <div className="flex items-center gap-4 mb-4">
          {/* Real silver shield for current rank */}
          <img
            src="/images/rank-silver.png"
            alt="Current Rank"
            className="w-14 h-14 object-contain shrink-0"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold">{user?.rank}</span>
              <span className="text-[#555] text-xs">Level {rankLevel}</span>
            </div>
            <p className="text-[#00C853] text-xs font-semibold mb-2">
              Progress to next rank: {rankProgress}%
            </p>
            <ProgressBar percent={rankProgress} />
          </div>
          {/* Real gold shield for next rank */}
          {rankLevel < 6 && (
            <div className="shrink-0 text-center">
              <img
                src="/images/rank-gold.png"
                alt="Next Rank"
                className="w-12 h-12 object-contain"
              />
              <p className="text-[#F9A825] text-[9px] font-bold mt-0.5">Next</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Cycles Done', val: `${user?.completed_cycles || 0}` },
            { label: 'Active Refs', val: `${refData?.active_referrals || 0}` },
            { label: 'AUM', val: fmt.usd(user?.active_deposit || 0) },
            { label: 'Loyalty', val: fmt.pct(user?.loyalty_score || 0) },
          ].map((s, i) => (
            <div key={i} className="bg-[#0f0f0f] rounded-lg p-2 text-center">
              <p className="text-white text-xs font-bold">{s.val}</p>
              <p className="text-[#555] text-[9px] mt-0.5 leading-tight">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        {/* View Rank Details + View Rewards — spec requires both */}
        <div className="flex gap-2">
          <Link
            href="/earn/rank"
            className="flex-1 btn-secondary py-2.5 text-xs"
          >
            View Rank Details
          </Link>
          <Link
            href="/earn/rewards"
            className="flex-1 btn-outline py-2.5 text-xs"
          >
            View Rewards
          </Link>
        </div>
      </div>

      {/* 2. Referral System */}
      <div className="mx-4 mt-3 card">
        <p className="section-title">2. Referral System</p>
        <div className="bg-[#0f0f0f] rounded-lg p-3 flex items-center gap-2 mb-3">
          <p className="text-[#00C853] text-xs font-mono flex-1 truncate">
            {refLink}
          </p>
          <button onClick={copyLink}>
            <Copy size={14} className="text-[#555]" />
          </button>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={copyLink}
            className="flex-1 btn-secondary py-2.5 text-xs"
          >
            <Copy size={14} /> Copy Link
          </button>
          <button
            onClick={() =>
              navigator.share?.({ url: refLink, title: 'Join Lianka' })
            }
            className="flex-1 btn-secondary py-2.5 text-xs"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            {
              label: 'Total Referrals',
              value: refData?.total_referrals || 0,
              color: 'text-white',
            },
            {
              label: 'Active Referrals',
              value: refData?.active_referrals || 0,
              color: 'text-[#00C853]',
            },
            {
              label: 'Deposit Bonus',
              value: fmt.usd(refData?.deposit_bonus_total || 0),
              color: 'text-[#1565C0]',
            },
            {
              label: 'ROI Bonus',
              value: fmt.usd(refData?.roi_bonus_total || 0),
              color: 'text-[#7B1FA2]',
            },
          ].map((item, i) => (
            <div key={i} className="bg-[#0f0f0f] rounded-lg p-2.5">
              <p className="text-[#555] text-[10px]">{item.label}</p>
              <p className={`font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
        {/* Referral limit indicator */}
        {rankLevel < 3 && (
          <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-lg p-2.5 mb-3">
            <p className="text-[#F9A825] text-[11px]">
              📊 Referral limit: {refData?.total_referrals || 0}/5 used. Reach{' '}
              <strong>Builder</strong> rank for unlimited referrals.
            </p>
          </div>
        )}
        <div className="bg-[#00C85510] border border-[#00C85330] rounded-lg p-3 mb-3">
          <p className="text-[#00C853] text-[11px] font-semibold mb-1">
            Referral Earnings:
          </p>
          <p className="text-[#888] text-[11px]">
            • 2% bonus on every deposit by your referrals.
          </p>
          <p className="text-[#888] text-[11px]">
            • 0.1% daily from ROI earned by your referrals.
          </p>
        </div>
        {/* Referral Dashboard button — spec requires it */}
        <Link href="/earn/referrals" className="btn-secondary py-2.5 text-xs">
          Referral Dashboard <ChevronRight size={14} />
        </Link>
      </div>

      {/* 3. Promotion System */}
      <div className="mx-4 mt-3 card">
        <p className="section-title">3. Promotion System</p>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white text-sm font-semibold">
              Promotion Balance
            </p>
            <p className="text-[#7B1FA2] font-bold text-lg">
              {fmt.usd(user?.promotion_wallet_balance || 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#555] text-xs">Eligibility</p>
            <p
              className={`text-xs font-bold ${rankLevel >= 3 ? 'text-[#00C853]' : 'text-[#555]'}`}
            >
              {rankLevel >= 3 ? '✓ Eligible' : `Requires Builder rank`}
            </p>
          </div>
        </div>
        {/* Apply for Promotion — spec: visible only when rank_level >= 3, hidden otherwise */}
        {rankLevel >= 3 ? (
          <button
            onClick={() =>
              toast.success(
                'Promotion application submitted — admin will review.',
              )
            }
            className="btn-outline py-2.5 text-xs text-[#7B1FA2] border-[#7B1FA2]"
          >
            Apply for Promotion
          </button>
        ) : (
          <div className="bg-[#55555510] border border-[#33333330] rounded-xl p-3">
            <p className="text-[#555] text-xs">
              Reach <strong className="text-white">Builder rank</strong> (5
              cycles + 10 active referrals) to apply for promotion bonuses.
            </p>
          </div>
        )}
      </div>

      {/* 4. Loyalty System */}
      <div className="mx-4 mt-3 mb-6 card">
        <p className="section-title">4. Loyalty System</p>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="8"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#00C853"
                strokeWidth="8"
                strokeDasharray={`${(2 * Math.PI * 34 * (user?.loyalty_score || 0)) / 100} ${2 * Math.PI * 34}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-black text-sm">
                {user?.loyalty_score || 0}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            {loyalty
              ? [
                  {
                    label: 'Completed Cycles (35%)',
                    pct: (loyalty.completed_cycles_score / 35) * 100,
                  },
                  {
                    label: 'Redeposit Behavior (20%)',
                    pct: (loyalty.redeposit_score / 20) * 100,
                  },
                  {
                    label: 'No Breach (20%)',
                    pct: (loyalty.no_breach_score / 20) * 100,
                  },
                  {
                    label: 'Timeframe Discipline (10%)',
                    pct: (loyalty.timeframe_score / 10) * 100,
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[#555] text-[9px] w-24 shrink-0 leading-tight">
                      {item.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00C853] rounded-full transition-all"
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              : null}
          </div>
        </div>
        <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-lg p-2.5 mb-3">
          <p className="text-[#F9A825] text-[11px]">
            ⭐ 80% threshold:{' '}
            {Number(user?.loyalty_score || 0) >= 80
              ? '✓ Reached — 30% termination fee waived'
              : `${(80 - Number(user?.loyalty_score || 0)).toFixed(1)}% more needed to waive termination fee`}
          </p>
        </div>
        {/* View Loyalty Breakdown — spec requires it */}
        <Link href="/earn/loyalty" className="btn-outline py-2.5 text-xs">
          View Loyalty Breakdown <ChevronRight size={14} />
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS SCREEN
// ═══════════════════════════════════════════════════════════

export function NotificationsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    loadNotifs();
  }, [token]);

  const loadNotifs = async () => {
    const res = await notifAPI.getAll();
    setNotifications(res.data.items || []);
    setUnread(res.data.unread_count || 0);
    setLoading(false);
  };

  const markAll = async () => {
    await notifAPI.markAllRead();
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markOne = async (id: string) => {
    await notifAPI.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const dotColors: Record<string, string> = {
    green: '#00C853',
    blue: '#1565C0',
    yellow: '#F9A825',
    red: '#C1121F',
    purple: '#7B1FA2',
    gray: '#555555',
  };

  return (
    <div className="screen">
      <Header title="Notifications" back="/" />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[#555] text-xs">{unread} unread</span>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="text-[#1565C0] text-xs font-semibold"
          >
            Mark all as read
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center mt-10">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center px-6">
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-[#555] text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="pb-6">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markOne(n.id)}
              className={`w-full flex items-start gap-3 px-4 py-4 border-b border-[#111]
                         text-left transition-colors hover:bg-[#111]
                         ${!n.is_read ? 'bg-[#0d0d0d]' : 'bg-transparent'}`}
            >
              <div
                className="w-2 h-2 rounded-full mt-2 shrink-0"
                style={{ background: dotColors[n.dot_color] || '#555' }}
              />
              <div className="flex-1">
                <p
                  className={`text-sm leading-snug mb-0.5 ${!n.is_read ? 'font-semibold text-white' : 'text-[#aaa]'}`}
                >
                  {n.title}
                </p>
                <p className="text-[#666] text-xs leading-relaxed">
                  {n.message}
                </p>
                <p className="text-[#444] text-[10px] mt-1">
                  {fmt.ago(n.created_at)}
                </p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-[#7B1FA2] mt-2 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TRANSACTIONS SCREEN
// ═══════════════════════════════════════════════════════════

export function TransactionsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    loadData();
  }, [token, page]);

  const loadData = async () => {
    const res = await uAPI.getLedger(page);
    setItems(res.data.items || []);
    setTotal(res.data.total || 0);
    setLoading(false);
  };

  const typeColor: Record<string, string> = {
    CREDIT: '#00C853',
    DEBIT: '#C1121F',
  };

  const typeIcon: Record<string, string> = {
    DEPOSIT: '⬇',
    WITHDRAWAL: '⬆',
    ROI: '⭐',
    REFERRAL_BONUS: '👥',
    PROMOTION_BONUS: '🎁',
    REINVESTMENT: '🔄',
  };

  return (
    <div className="screen">
      <Header title="Transactions" back="/" />
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'ROI', 'REFERRAL_BONUS'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors
              ${filter === t ? 'bg-[#00C853] text-black' : 'bg-[#1a1a1a] text-[#666]'}`}
          >
            {t === 'ALL' ? 'All' : t.replace('_', ' ')}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center mt-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center mt-20 text-center px-6">
          <p className="text-[#555] text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="pb-6">
          {items
            .filter((i) => filter === 'ALL' || i.reference_type === filter)
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-[#111]"
              >
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-lg shrink-0">
                  {typeIcon[item.reference_type] || '💰'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">
                    {item.reference_type?.replace('_', ' ')}
                  </p>
                  <p className="text-[#555] text-[11px]">
                    {item.wallet_type} wallet
                  </p>
                  <p className="text-[#444] text-[10px]">
                    {fmt.ago(item.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold text-sm`}
                    style={{ color: typeColor[item.entry_type] }}
                  >
                    {item.entry_type === 'CREDIT' ? '+' : '-'}
                    {fmt.usd(item.amount)}
                  </p>
                  <p className="text-[#444] text-[10px]">
                    Balance: {fmt.usd(item.balance_after)}
                  </p>
                </div>
              </div>
            ))}
          <div className="flex items-center justify-center gap-4 py-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-[#555] text-sm disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="text-[#555] text-xs">Page {page}</span>
            <button
              disabled={items.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="text-[#555] text-sm disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
