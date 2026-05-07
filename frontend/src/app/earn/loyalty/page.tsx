'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { earnAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Header, BottomNav, Spinner } from '@/components/ui';

export default function LoyaltyBreakdownPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [loyalty, setLoyalty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    earnAPI.getLoyalty().then(r => setLoyalty(r.data)).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;

  const score = Number(user?.loyalty_score || 0);
  const gapTo80 = Math.max(0, 80 - score);
  const progress80 = Math.min((score / 80) * 100, 100);

  const components = [
    {
      icon: '🔄', label: 'Completed Cycles', sub: 'More completed cycles increase your score.',
      score: loyalty?.completed_cycles_score || 0, weight: 35,
      detail: `${user?.completed_cycles || 0} / 10 cycles`,
    },
    {
      icon: '⏰', label: 'Redeposit Behavior', sub: 'Redeposit on time to earn more points.',
      score: loyalty?.redeposit_score || 0, weight: 20,
      detail: `${loyalty?.redeposit_score > 16 ? '4/5' : '0/1'} on-time redeposits`,
    },
    {
      icon: '🛡', label: 'No Principal Breach', sub: 'Avoid principal withdrawals to keep full score.',
      score: loyalty?.no_breach_score || 0, weight: 20,
      detail: 'No breaches',
    },
    {
      icon: '📅', label: 'Timeframe Discipline', sub: 'Stay consistent with your chosen timeframe.',
      score: loyalty?.timeframe_score || 0, weight: 10,
      detail: 'Good discipline',
    },
    {
      icon: '⏱', label: 'Account Age', sub: 'Longer account age earns you more points.',
      score: loyalty?.account_age_score || 0, weight: 5,
      detail: `${Math.floor((Date.now() - new Date(user?.created_at || Date.now()).getTime()) / 86400000)} days`,
    },
    {
      icon: '👥', label: 'Referral Quality', sub: 'Active and quality referrals improve your score.',
      score: loyalty?.referral_quality_score || 0, weight: 5,
      detail: `${user?.active_referrals || 0} active / ${user?.total_referrals || 0} total`,
    },
    {
      icon: '🎁', label: 'Promotion Contribution', sub: 'Higher contribution to promotions increases score.',
      score: loyalty?.promotion_score || 0, weight: 5,
      detail: 'Moderate contribution',
    },
  ];

  // Color coding
  const scoreColor = (pct: number) =>
    pct >= 80 ? '#00C853' : pct >= 60 ? '#F9A825' : pct >= 40 ? '#1565C0' : '#C1121F';

  const qualityLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'High' : score >= 40 ? 'Good' : 'Building';

  return (
    <div className="screen">
      <Header title="Loyalty Breakdown" back="/earn" />

      {/* Score overview */}
      <div className="mx-4 mt-4 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-start gap-4">
          {/* Circular gauge */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="46" fill="none" stroke="#1a1a1a" strokeWidth="10" />
              <circle cx="56" cy="56" r="46" fill="none"
                stroke={scoreColor(score)} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 46 * score / 100} ${2 * Math.PI * 46}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-black text-2xl">{score.toFixed(0)}%</span>
              <span className="font-semibold text-xs" style={{ color: scoreColor(score) }}>{qualityLabel}</span>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1">
            <p className="text-white font-bold mb-1">Your Loyalty Score</p>
            <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-2.5 mb-2">
              <p className="text-[#00C853] text-xs font-semibold">
                Reach <span className="text-white">80% or higher</span> to remove the 30% termination fee.
              </p>
            </div>
            <p className="text-[#888] text-xs mb-1.5">Progress to 80% Threshold</p>
            <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden mb-1">
              <div className="h-full bg-[#00C853] rounded-full transition-all"
                style={{ width: `${progress80}%` }} />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-white font-semibold">{score.toFixed(0)}%</span>
              <span className={`font-bold ${gapTo80 === 0 ? 'text-[#00C853]' : 'text-[#F9A825]'}`}>
                {gapTo80 === 0 ? '✓ Reached' : `${gapTo80.toFixed(1)}% to go`}
              </span>
              <span className="text-[#888]">80%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown — all 7 components */}
      <div className="mx-4 mt-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold">Score Breakdown</p>
          <div className="flex items-center gap-1">
            <span className="text-[#555] text-[10px]">ℹ</span>
            <span className="text-[#555] text-[10px]">Total Weight: 100%</span>
          </div>
        </div>

        <div className="space-y-4">
          {components.map((comp, i) => {
            const componentPct = comp.weight > 0
              ? Math.min((comp.score / comp.weight) * 100, 100)
              : 0;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-lg shrink-0">
                  {comp.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-white text-sm font-semibold">{comp.label}</p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-sm" style={{ color: scoreColor(componentPct) }}>
                        {componentPct.toFixed(0)}%
                      </span>
                      <span className="text-[#555] text-[10px] border border-[#222] px-1.5 py-0.5 rounded">
                        Weight {comp.weight}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[#555] text-[11px] mb-1.5">{comp.sub}</p>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${componentPct}%`, background: scoreColor(componentPct) }} />
                  </div>
                  <p className="text-[#444] text-[10px]">{comp.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Impact */}
      <div className="mx-4 mt-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⚖️</span>
          <p className="text-[#F9A825] font-bold">Financial Impact</p>
        </div>
        <p className="text-[#888] text-xs mb-3">
          Your loyalty score directly affects the termination fee if your account is closed.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-3">
            <p className="text-white text-xs font-bold mb-2">At 80% or higher</p>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[#00C853]">✓</span>
              <p className="text-[#00C853] text-xs font-semibold">No termination fee</p>
            </div>
            <p className="text-[#888] text-[11px]">Keep 100% of your remaining balance.</p>
          </div>
          <div className="bg-[#C1121F10] border border-[#C1121F30] rounded-xl p-3">
            <p className="text-white text-xs font-bold mb-2">Below 80%</p>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[#C1121F]">✗</span>
              <p className="text-[#C1121F] text-xs font-semibold">30% termination fee</p>
            </div>
            <p className="text-[#888] text-[11px]">30% of remaining balance will be deducted.</p>
          </div>
        </div>
      </div>

      {/* How to Improve */}
      <div className="mx-4 mt-3 mb-6 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[#1565C0]">ℹ</span>
          <p className="text-white font-bold">How to Improve Your Score</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { icon: '🔄', label: 'Complete more cycles' },
            { icon: '⏰', label: 'Redeposit on time' },
            { icon: '🛡', label: 'Avoid principal withdrawals' },
            { icon: '👥', label: 'Maintain active referrals' },
            { icon: '🎁', label: 'Contribute to promotions' },
          ].map((item, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl p-2 text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <p className="text-[#888] text-[9px] leading-tight">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <p className="text-[#555]">ℹ Loyalty score is recalculated daily based on your latest activity.</p>
          <p className="text-[#444]">Last updated: Today</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
