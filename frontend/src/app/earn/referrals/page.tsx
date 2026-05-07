'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { referralAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Header, BottomNav, fmt, Spinner, StatusBadge } from '@/components/ui';
import { Copy, Share2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReferralDashboardPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('Lifetime');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    referralAPI.getDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;

  const refLink = `https://lianka.com/ref/${user?.referral_code || ''}`;
  const copyLink = () => { navigator.clipboard.writeText(refLink); toast.success('Referral link copied'); };
  const share = () => navigator.share?.({ url: refLink, title: 'Join Lianka' });

  const referrals = (data?.referrals || []).filter((r: any) =>
    !search || r.referred_id?.toLowerCase().includes(search.toLowerCase())
  );

  const qualityPct = data?.total_referrals > 0
    ? Math.round((data.active_referrals / data.total_referrals) * 100)
    : 0;

  return (
    <div className="screen">
      <Header title="Referral Dashboard" back="/earn" />

      {/* Referral link */}
      <div className="mx-4 mt-4 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <p className="text-[#888] text-xs mb-2">Your Referral Link</p>
        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2.5 mb-3">
          <p className="text-[#00C853] text-xs font-mono flex-1 truncate">{refLink}</p>
          <button onClick={copyLink}><Copy size={14} className="text-[#555]" /></button>
        </div>
        <p className="text-[#555] text-xs mb-3">Share your link and start earning.</p>
        <div className="flex gap-2">
          <button onClick={copyLink}
            className="flex-1 py-2.5 rounded-xl border border-[#1565C0] text-[#1565C0]
                       text-xs font-semibold flex items-center justify-center gap-2">
            <Copy size={14} /> Copy Link
          </button>
          <button onClick={share}
            className="flex-1 py-2.5 rounded-xl border border-[#1565C0] text-[#1565C0]
                       text-xs font-semibold flex items-center justify-center gap-2">
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>

      {/* 4-stat overview */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        {[
          { label: 'Total Referrals', val: data?.total_referrals || 0, sub: 'All time', color: 'text-white', icon: '👥' },
          { label: 'Active Referrals', val: data?.active_referrals || 0, sub: 'Currently active', color: 'text-[#00C853]', icon: '✅' },
          { label: 'Total Referral Earnings', val: fmt.usd(data?.total_earnings || 0), sub: 'Lifetime', color: 'text-[#00C853]', icon: '💰' },
          { label: 'Referral Quality', val: `${qualityPct}%`, sub: qualityPct >= 70 ? 'Good' : 'Building', color: 'text-[#1565C0]', icon: '📈' },
        ].map((item, i) => (
          <div key={i} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{item.icon}</span>
              <p className="text-[#555] text-[10px]">{item.label}</p>
            </div>
            <p className={`text-xl font-black ${item.color}`}>{item.val}</p>
            <p className="text-[#444] text-[10px]">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Earnings Breakdown */}
      <div className="mx-4 mt-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold">Earnings Breakdown</p>
          <div className="flex gap-1">
            {['Lifetime', 'This Month'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors
                  ${period === p ? 'bg-[#00C853] text-black' : 'text-[#555] hover:text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#00C85520] flex items-center justify-center">
                <span className="text-[10px]">💼</span>
              </div>
              <p className="text-[#00C853] text-xs font-semibold">Deposit Bonus (2%)</p>
            </div>
            <p className="text-[#00C853] text-2xl font-black">{fmt.usd(data?.deposit_bonus_total || 0)}</p>
            <p className="text-[#555] text-[11px]">Earned when your referrals make deposits</p>
            <p className="text-[#444] text-[10px] mt-1">From {data?.total_referrals || 0} deposits</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#7B1FA220] flex items-center justify-center">
                <span className="text-[10px]">📊</span>
              </div>
              <p className="text-[#7B1FA2] text-xs font-semibold">ROI Bonus (0.1% Daily)</p>
            </div>
            <p className="text-[#7B1FA2] text-2xl font-black">{fmt.usd(data?.roi_bonus_total || 0)}</p>
            <p className="text-[#555] text-[11px]">Earned daily from your referrals' ROI</p>
            <p className="text-[#444] text-[10px] mt-1">From {data?.active_referrals || 0} active referrals</p>
          </div>
        </div>
        <div className="mt-3 bg-[#1565C010] border border-[#1565C030] rounded-lg p-2.5">
          <p className="text-[#888] text-[11px]">
            <span className="text-[#1565C0] font-semibold">ℹ</span>{' '}
            Deposit bonus is 2% of the referred user's deposit.
            ROI bonus is 0.1% of the daily ROI earned by your active referrals.
          </p>
        </div>
      </div>

      {/* Referral Performance */}
      <div className="mx-4 mt-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold">Referral Performance</p>
          <select className="bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1 text-xs text-white">
            <option>This Month</option>
            <option>All Time</option>
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: '👤', label: 'Referrals Joined', val: data?.total_referrals || 0, sub: 'All time', color: 'text-white' },
            { icon: '💵', label: 'New Deposits', val: data?.active_referrals || 0, sub: 'With deposit', color: 'text-[#00C853]' },
            { icon: '🎁', label: 'Deposit Bonus', val: fmt.usd(data?.deposit_bonus_total || 0), sub: 'Earned', color: 'text-[#00C853]' },
            { icon: '📈', label: 'ROI Bonus', val: fmt.usd(data?.roi_bonus_total || 0), sub: 'Daily', color: 'text-[#7B1FA2]' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <p className={`font-bold text-sm ${item.color}`}>{item.val}</p>
              <p className="text-[#555] text-[9px]">{item.label}</p>
              <p className="text-[#444] text-[9px]">{item.sub}</p>
            </div>
          ))}
        </div>
        {/* Active vs Inactive bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#00C853] rounded-full"
              style={{ width: `${qualityPct}%` }}
            />
          </div>
          <span className="text-[#00C853] text-[11px] font-semibold shrink-0">
            {data?.active_referrals || 0} ({qualityPct}%)
          </span>
          <span className="text-[#555] text-[11px] shrink-0">
            {(data?.total_referrals || 0) - (data?.active_referrals || 0)} ({100 - qualityPct}%)
          </span>
        </div>
        <div className="flex gap-4 mt-1">
          <span className="text-[#00C853] text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00C853]" />Active Referrals</span>
          <span className="text-[#555] text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#333]" />Inactive Referrals</span>
        </div>
      </div>

      {/* Referral list */}
      <div className="mx-4 mt-3 mb-6 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold">Your Referrals</p>
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5">
            <Search size={12} className="text-[#555]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by email / ID"
              className="bg-transparent text-white text-[11px] outline-none w-28 placeholder-[#555]" />
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-5 gap-2 pb-2 border-b border-[#1a1a1a] mb-2">
          {['User', 'Status', 'Deposit', 'Active Since', 'Your Earnings'].map(h => (
            <p key={h} className="text-[#555] text-[10px] font-semibold">{h}</p>
          ))}
        </div>

        {referrals.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-5xl mb-2">👥</p>
            <p className="text-[#555] text-sm">No referrals yet</p>
            <p className="text-[#444] text-xs mt-1">Share your link to start earning</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r: any, i: number) => {
              const initials = (r.referred_id || 'U').slice(0, 2).toUpperCase();
              const colors = ['#1565C0', '#7B1FA2', '#00C853', '#F9A825', '#FF6B35'];
              const color = colors[i % colors.length];
              return (
                <div key={r.id} className="grid grid-cols-5 gap-2 py-2.5 border-b border-[#111] last:border-0 items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: color }}>
                      {initials}
                    </div>
                    <div>
                      <p className="text-white text-[11px] font-semibold">***@***.com</p>
                      <p className="text-[#555] text-[9px]">ID: LIK{r.referred_id?.slice(-5).toUpperCase()}</p>
                    </div>
                  </div>
                  <div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                      ${r.status === 'ACTIVE' ? 'bg-[#00C85520] text-[#00C853]' : 'bg-[#33333320] text-[#888]'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-white text-[11px]">
                    {r.status === 'ACTIVE' ? '$500.00\nUSDT' : '$0.00\nUSDT'}
                  </p>
                  <p className="text-[#555] text-[10px]">
                    {r.activated_at ? new Date(r.activated_at).toLocaleDateString() : '—'}
                  </p>
                  <div>
                    <p className="text-[#00C853] text-[11px] font-bold">
                      {fmt.usd(Number(r.total_deposit_bonus || 0) + Number(r.total_roi_bonus || 0))}
                    </p>
                    <p className="text-[#444] text-[9px]">(Deposit + ROI)</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {referrals.length > 0 && (
          <button className="w-full mt-3 py-2.5 text-[#1565C0] text-xs font-semibold
                             border border-[#1565C030] rounded-xl">
            View All Referrals
          </button>
        )}

        <div className="mt-3 bg-[#00C85510] border border-[#00C85330] rounded-xl p-3">
          <p className="text-[#888] text-[11px]">
            The more active referrals you have, the higher your loyalty score and the faster you reach higher ranks. ›
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
