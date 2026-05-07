'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { BottomNav, fmt } from '@/components/ui';
import Link from 'next/link';
import { RotateCcw, Info } from 'lucide-react';

const RULES = [
  {
    num: 1, color: '#00C853',
    icon: '📅',
    title: 'Minimum Withdrawal',
    desc: 'The minimum withdrawal amount is',
    highlight: '10 USDT (TRC20)',
    suffix: '. Withdrawals below this amount cannot be processed.',
  },
  {
    num: 2, color: '#1565C0',
    icon: '⏱',
    title: 'Processing Time',
    desc: 'Withdrawal requests are processed within',
    highlight: '24 to 48 hours',
    suffix: '.',
  },
  {
    num: 3, color: '#F9A825',
    icon: '💰',
    title: 'Daily Withdrawal Limit',
    desc: 'You can make a maximum of',
    highlight: '1 withdrawal request',
    suffix: ' at a time. Only one active withdrawal request is allowed.',
  },
  {
    num: 4, color: '#7B1FA2',
    icon: '💳',
    title: 'Withdrawal Fee',
    desc: 'A flat fee of',
    highlight: '~$2.10 USDT',
    suffix: ' (network fee) will be deducted from each withdrawal.',
  },
  {
    num: 5, color: '#00C853',
    icon: '🛡',
    title: 'KYC Verification',
    desc: 'KYC verification is',
    highlight: 'mandatory',
    suffix: ' before making your first withdrawal.',
  },
  {
    num: 6, color: '#1565C0',
    icon: '🔗',
    title: 'Withdrawal Address',
    desc: 'Ensure your withdrawal address is correct. Lianka is',
    highlight: 'not responsible',
    suffix: ' for funds sent to the wrong address.',
  },
  {
    num: 7, color: '#F9A825',
    icon: '⚠️',
    title: 'Security Compliance',
    desc: 'All withdrawals are subject to',
    highlight: 'security checks',
    suffix: ' to prevent fraud and ensure user protection.',
  },
];

export default function WithdrawalRulesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#111] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-[#00C853] font-black text-xl">L</span>
          <span className="text-white font-bold text-sm">LIANKA</span>
        </Link>
        <div>
          <p className="text-white font-bold text-sm text-center">Withdrawal Rules</p>
          <p className="text-[#555] text-[10px] text-center">Understand the rules and conditions</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex gap-3 px-4 mt-4">
        {/* Left sidebar — mini dashboard */}
        <div className="w-36 shrink-0 space-y-3">
          {/* Balance card */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
            <p className="text-[#555] text-[10px] mb-1">Total Balance</p>
            <p className="text-white font-black text-lg">{fmt.usd(user?.total_balance || 0)}</p>
            <div className="mt-2 space-y-1">
              <div>
                <p className="text-[#555] text-[9px]">Active Deposit</p>
                <p className="text-white text-[11px] font-semibold">{fmt.usd(user?.active_deposit || 0)}</p>
              </div>
              <div>
                <p className="text-[#555] text-[9px]">Total Profit</p>
                <p className="text-[#00C853] text-[11px] font-semibold">{fmt.usd(user?.total_profit || 0)}</p>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <button onClick={() => router.push('/dashboard')}
                className="flex-1 text-[9px] text-[#00C853] border border-[#00C85330] rounded py-1">
                Reinvest
              </button>
              <button onClick={() => router.push('/dashboard')}
                className="flex-1 text-[9px] text-[#1565C0] border border-[#1565C030] rounded py-1">
                Details
              </button>
            </div>
            <div className="mt-2 bg-[#00C85510] border border-[#00C85330] rounded-lg p-1.5 text-center">
              <p className="text-[#00C853] text-[9px] font-semibold">● Cycle active</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
            <p className="text-[#555] text-[9px] font-bold uppercase tracking-wider mb-2">Main Menu</p>
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Earn', href: '/earn' },
              { label: 'Deposit', href: '/deposit' },
              { label: 'Withdraw', href: '/withdraw' },
              { label: 'Transactions', href: '/transactions', active: true },
              { label: 'Referral', href: '/earn/referrals' },
              { label: 'Profile', href: '/profile' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className={`block py-1.5 text-[11px] ${item.active ? 'text-[#00C853] font-semibold' : 'text-[#888]'}`}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Need help */}
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-lg">🎧</span>
              <p className="text-[#1565C0] text-xs font-semibold">Need Help?</p>
            </div>
            <p className="text-[#555] text-[10px] mb-2">Our support team is available 24/7</p>
            <button className="w-full text-[10px] text-[#1565C0] border border-[#1565C030]
                               rounded-lg py-1.5 font-semibold">
              Contact Support →
            </button>
          </div>

          {/* Security note */}
          <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">🛡</span>
              <p className="text-[#00C853] text-[10px] font-semibold">Security Note</p>
            </div>
            <p className="text-[#666] text-[9px]">Lianka is committed to secure and transparent withdrawal processes. Always follow the rules to avoid delays.</p>
          </div>
        </div>

        {/* Right — Rules panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-3">
            <h2 className="text-white font-bold text-base mb-0.5">Withdrawal Rules</h2>
            <p className="text-[#555] text-xs mb-4">Please read the rules carefully before making a withdrawal.</p>

            <div className="space-y-4">
              {RULES.map((rule) => (
                <div key={rule.num} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0">
                    {rule.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold mb-0.5">{rule.title}</p>
                    <p className="text-[#888] text-xs leading-snug">
                      {rule.desc}{' '}
                      <span style={{ color: rule.color }} className="font-semibold">{rule.highlight}</span>
                      {rule.suffix}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: rule.color, color: rule.color, background: rule.color + '20' }}>
                    <span className="text-[10px] font-bold">{rule.num}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Important note */}
          <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-xl p-3 mb-3">
            <div className="flex items-start gap-2">
              <span className="text-[#F9A825] shrink-0">⚠</span>
              <div>
                <p className="text-[#F9A825] text-xs font-bold mb-1">Important</p>
                <p className="text-[#888] text-[11px]">
                  Violating the above rules may result in delayed withdrawals, temporary suspension, or account restrictions.
                </p>
              </div>
            </div>
          </div>

          {/* Agreement checkbox */}
          <div className="flex items-center gap-2 mb-3">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer
                ${agreed ? 'bg-[#00C853] border-[#00C853]' : 'border-[#333]'}`}>
              {agreed && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <p className="text-[#888] text-xs">I have read and agree to the Withdrawal Rules</p>
          </div>

          <button
            onClick={() => agreed && router.push('/withdraw')}
            disabled={!agreed}
            className="w-full py-3.5 rounded-xl bg-[#00C853] text-black font-bold text-sm
                       flex items-center justify-center gap-2
                       disabled:opacity-40 disabled:cursor-not-allowed">
            I Understand
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
