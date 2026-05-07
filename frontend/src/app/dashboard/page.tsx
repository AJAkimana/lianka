'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { userAPI, notificationAPI } from '@/lib/api';
import { api } from '@/lib/api';
import { Header, BottomNav, StateBanner, ProgressBar, StatusBadge, fmt, Spinner } from '@/components/ui';
import {
  ArrowDownToLine, ArrowUpFromLine, Users, TrendingUp,
  Eye, EyeOff, ChevronRight, RotateCcw, X, Loader2, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Reinvest Modal ──────────────────────────────────────
function ReinvestModal({ user, onClose, onSuccess }: {
  user: any; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = async (val: string) => {
    if (!val || Number(val) <= 0) { setPreview(null); return; }
    try {
      const res = await api.get(`/reinvestment/preview?amount=${val}`);
      setPreview(res.data);
    } catch { /* silent */ }
  };

  const handleReinvest = async () => {
    if (!amount || Number(amount) <= 0) { toast.error('Enter an amount'); return; }
    setLoading(true);
    try {
      await api.post('/reinvestment/execute', { amount: Number(amount) });
      toast.success(`$${Number(amount).toFixed(2)} reinvested successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reinvestment failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70">
      <div className="bg-[#161616] rounded-t-2xl w-full max-w-[430px] mx-auto p-6 border-t border-[#222]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Reinvest Profit</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white"><X size={20} /></button>
        </div>
        <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-3 mb-4">
          <p className="text-[#00C853] text-xs font-semibold mb-1">How It Works</p>
          <p className="text-[#888] text-[11px]">
            Profit moves into your active deposit, increasing your daily ROI base. Your principal and total balance remain unchanged.
          </p>
        </div>
        <div className="card mb-4">
          <div className="flex justify-between text-xs mb-3">
            <span className="text-[#555]">Available Profit</span>
            <span className="text-[#00C853] font-bold">{fmt.usd(user.total_profit)}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white text-xl font-bold">$</span>
            <input value={amount}
              onChange={e => { setAmount(e.target.value); fetchPreview(e.target.value); }}
              type="number" placeholder="0.00" min="1"
              className="flex-1 bg-transparent text-white text-2xl font-bold outline-none placeholder-[#333]" />
          </div>
          <div className="flex gap-2">
            {['25%','50%','75%','100%'].map(p => {
              const val = (Number(user.total_profit) * parseInt(p) / 100).toFixed(2);
              return (
                <button key={p} onClick={() => { setAmount(val); fetchPreview(val); }}
                  className="flex-1 py-1.5 rounded-lg bg-[#1a1a1a] text-[#888] text-xs font-semibold hover:bg-[#222]">
                  {p}
                </button>
              );
            })}
          </div>
        </div>
        {preview && (
          <div className="card mb-4 space-y-0">
            {[
              { label: 'Active Deposit After', value: fmt.usd(preview.new_active_deposit), color: 'text-white' },
              { label: 'Est. Daily ROI Increase', value: `+${fmt.usd(preview.daily_roi_increase)}/day`, color: 'text-[#00C853]' },
              { label: 'Balance (unchanged)', value: fmt.usd(user.total_balance), color: 'text-[#888]' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-[#1a1a1a] last:border-0 text-xs">
                <span className="text-[#555]">{r.label}</span>
                <span className={`font-semibold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={handleReinvest} disabled={loading || !amount || Number(amount) <= 0}
          className="btn-primary disabled:opacity-40">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
          {loading ? 'Reinvesting...' : 'Reinvest Now'}
        </button>
      </div>
    </div>
  );
}

// ─── Cycle Details Modal ─────────────────────────────────
function CycleDetailsModal({ user, onClose }: { user: any; onClose: () => void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70">
      <div className="bg-[#161616] rounded-t-2xl w-full max-w-[430px] mx-auto p-6 border-t border-[#222]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Cycle Details</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-0">
          {[
            { label: 'Plan', value: user.timeframe + ' Plan' },
            { label: 'Cycle Start', value: fmt.date(user.cycle_start_date) },
            { label: 'Principal (Reference)', value: fmt.usd(user.principal) },
            { label: 'Active Deposit (ROI Base)', value: fmt.usd(user.active_deposit) },
            { label: 'Total Profit', value: fmt.usd(user.total_profit), color: 'text-[#00C853]' },
            { label: 'Total Balance', value: fmt.usd(user.total_balance), color: 'text-[#00C853]' },
            { label: 'Cycle Target (200%)', value: fmt.usd(Number(user.principal) * 2), color: 'text-[#F9A825]' },
            { label: 'Trading Days', value: user.trading_days_count || 0 },
            { label: 'Completed Cycles', value: user.completed_cycles || 0 },
            { label: 'Next Withdrawal', value: user.next_withdrawal_date ? fmt.date(user.next_withdrawal_date) : 'Available now' },
          ].map((row, i) => (
            <div key={i} className="flex justify-between py-2.5 border-b border-[#1a1a1a] last:border-0">
              <span className="text-[#666] text-sm">{row.label}</span>
              <span className={`text-sm font-semibold ${(row as any).color || 'text-white'}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { token, setUser, setUnreadCount } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [showReinvest, setShowReinvest] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const [meRes, notifRes] = await Promise.all([
        userAPI.getMe(),
        notificationAPI.getUnreadCount(),
      ]);
      setData(meRes.data);
      setUser(meRes.data);
      setUnreadCount(notifRes.data || 0);
    } catch { router.replace('/login'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;
  if (!data) return null;

  const cyclePercent = Number(data.cycle_progress_percent || 0);
  const isActive = data.account_state === 'ACTIVE';
  const isGrace = data.account_state === 'GRACE';
  const hasProfit = Number(data.total_profit) > 0;
  const canReinvest = hasProfit && (isActive || isGrace);

  return (
    <div className="screen">
      <Header />

      {/* Balance Card */}
      <div className="mx-4 mt-4 card-elevated">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1">
            <p className="stat-label">Total Balance</p>
            <p className="money-large mb-1">
              {hideBalance ? '••••••' : fmt.usd(data.total_balance)}
            </p>
          </div>
          {/* 3D Lianka Coin */}
          <div className="flex flex-col items-end gap-1">
            <button onClick={() => setHideBalance(!hideBalance)} className="text-[#555]">
              {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <img src="/images/lianka-coin.png" alt="Lianka"
              className="w-20 h-20 object-contain -mt-2 -mr-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4 mt-3">
          {[
            { label: 'Active Deposit', val: data.active_deposit, color: 'text-white' },
            { label: 'Profit', val: data.total_profit, color: 'text-[#00C853]' },
            { label: 'Withdrawable', val: data.profit_wallet_balance, color: 'text-[#F9A825]' },
          ].map((item, i) => (
            <div key={i} className="bg-[#0f0f0f] rounded-lg p-2.5">
              <p className="text-[10px] text-[#555] mb-1">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>
                {hideBalance ? '••••' : fmt.usd(item.val)}
              </p>
            </div>
          ))}
        </div>

        {/* Reinvest + View Details buttons — both required by spec */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!canReinvest) {
                toast.error(!hasProfit ? 'No profit available to reinvest' : 'Account state does not allow reinvestment');
                return;
              }
              setShowReinvest(true);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center
                       justify-center gap-1.5 transition-all
                       ${canReinvest
                         ? 'bg-[#00C853] text-black hover:bg-[#009624]'
                         : 'bg-[#111] text-[#555] border border-[#1a1a1a] cursor-not-allowed'}`}
          >
            <RotateCcw size={13} /> Reinvest
          </button>
          <button
            onClick={() => setShowDetails(true)}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[#1565C0]
                       text-[#1565C0] flex items-center justify-center gap-1.5
                       hover:bg-[#1565C010] transition-colors"
          >
            <Info size={13} /> View Details
          </button>
        </div>
        {data.timeframe && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1a1a1a]">
            <span className="text-[11px] text-[#555]">{data.timeframe} Plan</span>
            <StatusBadge status={data.account_state} />
          </div>
        )}
      </div>

      {/* State Banner */}
      <StateBanner state={data.account_state} graceEndDate={data.grace_end_date} />

      {/* Cycle Progress */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center justify-between mb-2">
          <p className="stat-label">Cycle Progress (0% to 200%)</p>
          <span className="text-[#00C853] text-sm font-bold">{fmt.pct(cyclePercent / 2)}</span>
        </div>
        <ProgressBar percent={cyclePercent / 2} />
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-[#555]">{fmt.usd(data.total_balance)}</span>
          <span className="text-[11px] text-[#555]">Target {fmt.usd(Number(data.principal) * 2)}</span>
        </div>
      </div>

      {/* ROI Status Banner */}
      {(isActive || isGrace) && (
        <div className={`mx-4 mt-3 rounded-xl p-3 flex items-center gap-2 border ${
          isGrace
            ? 'bg-[#F9A82510] border-[#F9A82530]'
            : 'bg-[#00C85310] border-[#00C85330]'
        }`}>
          <TrendingUp size={16} className={isGrace ? 'text-[#F9A825]' : 'text-[#00C853]'} />
          <p className={`text-[13px] font-medium ${isGrace ? 'text-[#F9A825]' : 'text-[#00C853]'}`}>
            {isGrace
              ? 'Cycle complete — ROI paused. Redeposit to start new cycle.'
              : 'ROI active — earning daily on trading days'}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mx-4 mt-4">
        <p className="section-title">Quick Actions</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/deposit', label: 'Deposit', sub: 'Start investing', Icon: ArrowDownToLine, color: '#00C853', bg: '#00C85320', hoverBorder: 'hover:border-[#00C853]' },
            { href: '/withdraw', label: 'Withdraw', sub: 'Withdraw your profit', Icon: ArrowUpFromLine, color: '#F9A825', bg: '#F9A82520', hoverBorder: 'hover:border-[#F9A825]' },
            { href: '/earn', label: 'Referral', sub: 'Invite & earn more', Icon: Users, color: '#1565C0', bg: '#1565C020', hoverBorder: 'hover:border-[#1565C0]' },
          ].map(({ href, label, sub, Icon, color, bg, hoverBorder }) => (
            <Link key={href} href={href}
              className={`card flex flex-col items-center gap-1.5 py-4 transition-colors ${hoverBorder}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-xs font-semibold" style={{ color }}>{label}</span>
              <span className="text-[10px] text-[#555] text-center leading-tight">{sub}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title mb-0">Earnings Breakdown</p>
          <Link href="/transactions" className="text-[#00C853] text-xs font-semibold">View All</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '📈', label: 'Deposit Earnings', value: data.total_profit, color: 'text-[#00C853]' },
            { icon: '👥', label: 'Referral Earnings', value: data.referral_wallet_balance, color: 'text-[#1565C0]' },
            { icon: '🎁', label: 'Promotion Earnings', value: data.promotion_wallet_balance, color: 'text-[#7B1FA2]' },
          ].map((item, i) => (
            <div key={i} className="card flex flex-col items-start gap-2 py-3">
              <span className="text-xl">{item.icon}</span>
              <p className="text-[10px] text-[#666] leading-tight">{item.label}</p>
              <p className={`text-sm font-black ${item.color}`}>
                {hideBalance ? '••••' : fmt.usd(item.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Reputation Panel */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title mb-0">Reputation & Rank</p>
          <Link href="/earn" className="text-[#00C853] text-xs font-semibold">View Progress</Link>
        </div>
        <div className="card">
          <div className="grid grid-cols-3 gap-0 mb-3">
            <div className="text-center pr-3 border-r border-[#1a1a1a]">
              <div className="w-8 h-8 rounded-full bg-[#00C85520] flex items-center justify-center mx-auto mb-1.5">
                <span className="text-[#00C853] text-sm">⭐</span>
              </div>
              <div className="text-[#888] text-[10px] mb-0.5">Loyalty Score</div>
              <div className="text-[#00C853] font-bold text-sm">{fmt.pct(data.loyalty_score)}</div>
              <div className="text-[#555] text-[10px]">New Member</div>
            </div>
            <div className="text-center px-3 border-r border-[#1a1a1a]">
              <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-1.5">
                <span className="text-[#888] text-sm">🛡</span>
              </div>
              <div className="text-[#888] text-[10px] mb-0.5">Current Rank</div>
              <div className="text-white font-bold text-sm truncate">{data.rank}</div>
              <div className="text-[#555] text-[10px]">Level {data.rank_level}</div>
            </div>
            <div className="text-center pl-3">
              <div className="w-8 h-8 rounded-full bg-[#F9A82520] flex items-center justify-center mx-auto mb-1.5">
                <span className="text-[#F9A825] text-sm">🏆</span>
              </div>
              <div className="text-[#888] text-[10px] mb-0.5">Next Rank Progress</div>
              <div className="text-[#F9A825] font-bold text-sm">
                {data.rank_level >= 6 ? '100%' : `${Math.round((data.completed_cycles || 0) / 3 * 100)}%`}
              </div>
              <div className="text-[#555] text-[10px]">Keep investing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Plan CTA — shown when INACTIVE (no active plan) */}
      {!isActive && !isGrace && data.account_state !== 'TERMINATED' && (
        <Link href="/deposit"
          className="mx-4 mt-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4
                     flex items-center gap-4 hover:border-[#00C85340] transition-colors">
          <div className="w-12 h-12 rounded-full bg-[#00C85520] flex items-center justify-center shrink-0">
            <span className="text-2xl">🚀</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm mb-0.5">Start Your Investment Journey</p>
            <p className="text-[#666] text-xs">Choose a plan and make your first deposit to start earning daily ROI.</p>
          </div>
          <div className="bg-[#00C853] text-black text-xs font-bold px-3 py-2 rounded-xl shrink-0">
            Make Deposit
          </div>
        </Link>
      )}

      {/* Motivational footer tip — always visible, matching Screen 05 bottom */}
      <div className="mx-4 mt-3 mb-6 bg-[#111] border border-[#1a1a1a] rounded-xl p-3
                      flex items-center gap-3">
        <span className="text-xl shrink-0">💡</span>
        <p className="text-[#555] text-xs leading-relaxed">
          Make your first deposit today and let Lianka work for you.
          Consistent investment leads to consistent growth.
        </p>
      </div>

      {showReinvest && (
        <ReinvestModal user={data} onClose={() => setShowReinvest(false)} onSuccess={loadData} />
      )}
      {showDetails && (
        <CycleDetailsModal user={data} onClose={() => setShowDetails(false)} />
      )}

      <BottomNav />
    </div>
  );
}
