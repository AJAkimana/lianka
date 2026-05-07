'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { earnAPI, referralAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Header, BottomNav, ProgressBar, fmt, Spinner } from '@/components/ui';
import { ChevronRight } from 'lucide-react';

const RANKS = [
  { level: 1, name: 'New Member',        color: '#9E9E9E', icon: '🥉', cycles: 0,  refs: 0  },
  { level: 2, name: 'Contributor',       color: '#1565C0', icon: '🥈', cycles: 3,  refs: 5  },
  { level: 3, name: 'Builder',           color: '#F9A825', icon: '🥇', cycles: 5,  refs: 10 },
  { level: 4, name: 'Growth Partner',    color: '#9C27B0', icon: '💎', cycles: 10, refs: 20 },
  { level: 5, name: 'Strategic Partner', color: '#00C853', icon: '🌟', cycles: 20, refs: 40 },
  { level: 6, name: 'Elite Contributor', color: '#FF6B35', icon: '👑', cycles: 999,refs: 999 },
];

const PRIVILEGES: Record<number, string[]> = {
  1: ['5 referral links'],
  2: ['Recognition badge'],
  3: ['Unlimited referrals', 'Promotion eligibility', 'Lower fees', 'Priority support'],
  4: ['Biweekly withdrawal without capital requirement'],
  5: ['Daily withdrawal without capital requirement'],
  6: ['Promotion revenue authority', 'Admin privileges'],
};

export default function RankDetailsPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [refData, setRefData] = useState<any>(null);
  const [rankHistory, setRankHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    Promise.all([referralAPI.getDashboard(), earnAPI.getRank()])
      .then(([r, rk]) => { setRefData(r.data); setRankHistory(rk.data || []); })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;

  const currentLevel = user?.rank_level || 1;
  const currentRank = RANKS.find(r => r.level === currentLevel)!;
  const nextRank = RANKS.find(r => r.level === currentLevel + 1);
  const completedCycles = user?.completed_cycles || 0;
  const activeRefs = refData?.active_referrals || 0;

  // Progress toward next rank
  const cycleProgress = nextRank ? Math.min((completedCycles / nextRank.cycles) * 100, 100) : 100;
  const refProgress = nextRank ? Math.min((activeRefs / nextRank.refs) * 100, 100) : 100;
  const loyaltyProgress = Math.min((Number(user?.loyalty_score || 0) / 80) * 100, 100);
  const overallProgress = nextRank
    ? Math.round((cycleProgress + refProgress + loyaltyProgress) / 3)
    : 100;

  return (
    <div className="screen">
      <Header title="Rank Details" back="/earn" />

      {/* Current rank card */}
      <div className="mx-4 mt-4 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-start gap-4 mb-4">
          {/* Rank badge */}
          {/* Current rank - silver shield */}
          <img src="/images/rank-silver.png" alt={currentRank.name}
            className="w-16 h-16 object-contain shrink-0" />
          <div className="flex-1">
            <p className="text-[#888] text-xs mb-0.5">Your Current Rank</p>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-white">{currentRank.name}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C85520] text-[#00C853]">
                Level {currentLevel}
              </span>
            </div>
            {currentLevel < 5 && (
              <p className="text-[#555] text-xs">Keep growing your contribution to reach the next rank.</p>
            )}
          </div>
          {/* Next rank target */}
          {nextRank && (
            <div className="shrink-0 text-right">
              <p className="text-[#555] text-[10px] mb-1">Next Rank</p>
              <img src="/images/rank-gold.png" alt={nextRank.name}
                className="w-14 h-14 object-contain ml-auto" />
              <p className="font-bold text-sm mt-0.5" style={{ color: nextRank.color }}>{nextRank.name}</p>
              <p className="text-[#555] text-[10px]">Level {nextRank.level}</p>
            </div>
          )}
        </div>

        {/* Overall progress */}
        {nextRank && (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[#888] text-xs">Progress to {nextRank.name}</p>
              <p className="text-[#00C853] font-bold text-sm">{overallProgress}%</p>
            </div>
            <ProgressBar percent={overallProgress} />
            <p className="text-[#555] text-[11px] mt-1">{100 - overallProgress}% to reach {nextRank.name}</p>
          </>
        )}

        {/* 4-stat summary */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[#1a1a1a]">
          {[
            { label: 'Completed Cycles', val: completedCycles, target: nextRank?.cycles, color: 'text-[#00C853]' },
            { label: 'Active Referrals', val: activeRefs, target: nextRank?.refs, color: 'text-[#1565C0]' },
            { label: 'Total Contribution', val: fmt.usd(user?.active_deposit || 0), target: null, color: 'text-[#F9A825]' },
            { label: 'Loyalty Score', val: `${user?.loyalty_score || 0}%`, target: '80%', color: 'text-[#7B1FA2]' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className={`font-bold text-sm ${s.color}`}>{s.val}</p>
              {s.target !== null && <p className="text-[#555] text-[10px]">{nextRank ? `/ ${s.target}` : '✓'}</p>}
              <p className="text-[#444] text-[9px] leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next Rank Requirements table */}
      {nextRank && (
        <div className="mx-4 mt-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-white font-bold mb-1">Next Rank Requirements</p>
          <p className="text-[#555] text-xs mb-3">
            You must meet all requirements below to reach <span style={{ color: nextRank.color }}>{nextRank.name}</span>.
          </p>
          <div className="space-y-3">
            {[
              { icon: '🔄', label: 'Completed Cycles', sub: 'Total cycles completed', current: completedCycles, target: nextRank.cycles, pct: cycleProgress },
              { icon: '👥', label: 'Active Referrals', sub: 'Direct active referrals', current: activeRefs, target: nextRank.refs, pct: refProgress },
              { icon: '💰', label: 'Total Contribution', sub: 'Total deposit amount', current: fmt.usd(user?.active_deposit || 0), target: '$5,000.00', pct: Math.min(((user?.active_deposit || 0) / 5000) * 100, 100) },
              { icon: '⭐', label: 'Loyalty Score', sub: 'Minimum loyalty score', current: `${user?.loyalty_score || 0}%`, target: '80%', pct: loyaltyProgress },
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-sm shrink-0">
                  {req.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-white text-xs font-semibold">{req.label}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#888] text-xs">{req.current}</span>
                      <span className="text-[#555] text-[10px]">/ {req.target}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border
                        ${req.pct >= 100 ? 'border-[#00C853] text-[#00C853] bg-[#00C85310]' :
                          req.pct >= 60 ? 'border-[#F9A825] text-[#F9A825] bg-[#F9A82510]' :
                          'border-[#555] text-[#888]'}`}>
                        {Math.round(req.pct)}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar percent={req.pct} color={req.pct >= 100 ? '#00C853' : '#F9A825'} />
                  <p className="text-[#555] text-[10px] mt-0.5">{req.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rank Privileges */}
      <div className="mx-4 mt-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <p className="text-white font-bold mb-1">
          Rank Privileges {nextRank ? `— Unlocked at ${nextRank.name}` : '— Your Current Benefits'}
        </p>
        <p className="text-[#555] text-xs mb-3">
          Benefits you {nextRank ? 'will' : 'currently'} unlock at <span style={{ color: nextRank?.color || currentRank.color }}>
            {nextRank?.name || currentRank.name}
          </span>.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(PRIVILEGES[nextRank?.level || currentLevel] || []).map((priv, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl p-3 text-center">
              <div className="text-2xl mb-1.5">
                {['♾️', '🎁', '💸', '🎧'][i % 4]}
              </div>
              <p className="text-white text-xs font-semibold">{priv}</p>
            </div>
          ))}
        </div>
      </div>

      {/* All Ranks Overview */}
      <div className="mx-4 mt-3 mb-6 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
        <p className="text-white font-bold mb-3">All Ranks Overview</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          {RANKS.slice(0, 5).map((rank, i) => (
            <div key={i}
              className={`shrink-0 w-24 rounded-xl border-2 p-2.5 text-center transition-all
                ${rank.level === currentLevel
                  ? 'border-[#00C853] bg-[#00C85510]'
                  : rank.level < currentLevel
                  ? 'border-[#1a1a1a] opacity-60'
                  : 'border-[#1a1a1a]'}`}>
              <div className="text-2xl mb-1">{rank.icon}</div>
              <p className="text-white text-[10px] font-bold">{rank.name}</p>
              <p className="text-[#555] text-[9px]">Level {rank.level}</p>
              {rank.level === currentLevel && (
                <span className="inline-block mt-1 bg-[#00C853] text-black text-[9px] font-bold
                                 px-1.5 py-0.5 rounded-full">Current</span>
              )}
              <p className="text-[#444] text-[9px] mt-1 leading-tight">
                {rank.level === 1 ? 'Start your journey' :
                  rank.level === 3 ? 'Promotion access' :
                  rank.level === 4 ? 'Biweekly flexibility' :
                  rank.level === 5 ? 'Daily flexibility' : ''}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-[#1a1a1a] rounded-lg p-2.5 flex items-center gap-2">
          <span className="text-[#1565C0]">ℹ</span>
          <p className="text-[#666] text-xs">Ranks are permanent. Once achieved, they are never lost.</p>
        </div>
        <p className="text-[#555] text-[11px] text-center mt-3">
          Higher rank = More privileges, lower fees, and greater flexibility.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
