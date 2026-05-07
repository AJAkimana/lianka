'use client';
import { useAuthStore } from '@/store/auth.store';
import { Header, BottomNav } from '@/components/ui';
import Link from 'next/link';

const RANK_REWARDS = [
  {
    level: 1, name: 'New Member', icon: '🥉', color: '#9E9E9E',
    perks: ['Access to all investment plans', '5 referral link slots', 'Standard withdrawal process', 'Email & in-app notifications'],
  },
  {
    level: 2, name: 'Contributor', icon: '🥈', color: '#1565C0',
    perks: ['All New Member perks', 'Contributor recognition badge', 'Access to platform promotions'],
  },
  {
    level: 3, name: 'Builder', icon: '🥇', color: '#F9A825',
    perks: ['All Contributor perks', 'Unlimited referral links', 'Promotion eligibility', 'Lower withdrawal fees', 'Priority support access'],
  },
  {
    level: 4, name: 'Growth Partner', icon: '💎', color: '#9C27B0',
    perks: ['All Builder perks', 'Biweekly plan withdrawal without capital requirement', 'Enhanced earning rates'],
  },
  {
    level: 5, name: 'Strategic Partner', icon: '🌟', color: '#00C853',
    perks: ['All Growth Partner perks', 'Daily plan withdrawal without capital requirement', 'Maximum platform flexibility'],
  },
  {
    level: 6, name: 'Elite Contributor', icon: '👑', color: '#FF6B35',
    perks: ['All Strategic Partner perks', 'Promotion revenue authority', 'Admin-level visibility', 'Direct support line'],
  },
];

export default function RewardsPage() {
  const { user } = useAuthStore();
  const currentLevel = user?.rank_level || 1;

  return (
    <div className="screen">
      <Header title="View Rewards" back="/earn" />

      <div className="px-4 py-4">
        <p className="text-[#555] text-xs mb-4">
          Each rank unlocks more privileges, lower fees, and greater platform flexibility. Ranks are permanent and never lost.
        </p>

        <div className="space-y-3 mb-6">
          {RANK_REWARDS.map(rank => {
            const isCurrent = rank.level === currentLevel;
            const isUnlocked = rank.level <= currentLevel;
            return (
              <div key={rank.level}
                className={`bg-[#111] rounded-xl border-2 p-4 transition-all
                  ${isCurrent ? 'border-[#00C853]' : isUnlocked ? 'border-[#1a1a1a] opacity-80' : 'border-[#1a1a1a]'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-2xl">
                    {rank.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">{rank.name}</p>
                      {isCurrent && (
                        <span className="text-[9px] bg-[#00C853] text-black font-bold px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                      {isUnlocked && !isCurrent && (
                        <span className="text-[9px] bg-[#1a1a1a] text-[#00C853] font-bold px-2 py-0.5 rounded-full border border-[#00C85330]">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-[#555] text-xs">Level {rank.level}</p>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: rank.color, background: isUnlocked ? rank.color : 'transparent' }}>
                    {isUnlocked && <span className="text-black text-[8px] font-bold">✓</span>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {rank.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: isUnlocked ? rank.color : '#333' }} />
                      <p className={`text-xs ${isUnlocked ? 'text-[#ccc]' : 'text-[#444]'}`}>{perk}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-3 mb-6">
          <p className="text-[#00C853] text-xs font-semibold mb-1">ℹ Rank Note</p>
          <p className="text-[#888] text-xs">Ranks are evaluated daily. Once you reach a rank, you keep it forever. Keep investing and referring to climb the ranks.</p>
        </div>

        <Link href="/earn/rank"
          className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-sm
                     flex items-center justify-center gap-2">
          View My Rank Progress
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
