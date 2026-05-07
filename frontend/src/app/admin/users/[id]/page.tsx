'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { fmt, StatusBadge, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, Unlock, RefreshCw } from 'lucide-react';

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (id) adminAPI.getUserDetail(id as string).then(r => { setData(r.data); setLoading(false); });
  }, [id]);

  const handleFreeze = async () => {
    setActing(true);
    try {
      await adminAPI.freezeUser(id as string, 'Admin action');
      toast.success('Account frozen');
      setData((d: any) => ({ ...d, user: { ...d.user, account_state: 'FROZEN' } }));
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleUnfreeze = async () => {
    setActing(true);
    try {
      await adminAPI.unfreezeUser(id as string, 'Admin action');
      toast.success('Account unfrozen');
      setData((d: any) => ({ ...d, user: { ...d.user, account_state: 'INACTIVE' } }));
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Spinner size={32} /></div>;
  if (!data) return null;

  const { user, deposits, withdrawals } = data;

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#0a0a0a] border-b border-[#111] px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/admin/users')} className="text-[#555] hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-bold text-lg">{user?.full_name || user?.email}</h1>
        <StatusBadge status={user?.account_state} />
      </header>
      <div className="p-6 grid grid-cols-3 gap-6">
        {/* Left - User info */}
        <div className="col-span-1 space-y-4">
          <div className="bg-[#111] rounded-xl border border-[#1a1a1a] p-5">
            <h3 className="text-white font-bold mb-4">Account Info</h3>
            {[
              { label: 'Email', value: user?.email },
              { label: 'State', value: <StatusBadge status={user?.account_state} /> },
              { label: 'KYC', value: <StatusBadge status={user?.kyc_status} /> },
              { label: 'Rank', value: user?.rank },
              { label: 'Loyalty', value: fmt.pct(user?.loyalty_score) },
              { label: 'Referrals', value: `${user?.active_referrals}/${user?.total_referrals}` },
            ].map((r, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-[#1a1a1a] last:border-0 text-sm">
                <span className="text-[#555]">{r.label}</span>
                <span className="text-white font-medium">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#111] rounded-xl border border-[#1a1a1a] p-5">
            <h3 className="text-white font-bold mb-4">Balances</h3>
            {[
              { label: 'Principal', value: fmt.usd(user?.principal), color: 'text-white' },
              { label: 'Active Deposit', value: fmt.usd(user?.active_deposit), color: 'text-white' },
              { label: 'Total Profit', value: fmt.usd(user?.total_profit), color: 'text-[#00C853]' },
              { label: 'Total Balance', value: fmt.usd(user?.total_balance), color: 'text-[#00C853]' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-[#1a1a1a] last:border-0 text-sm">
                <span className="text-[#555]">{r.label}</span>
                <span className={`font-bold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#111] rounded-xl border border-[#1a1a1a] p-4 space-y-2">
            <h3 className="text-white font-bold mb-2">Actions</h3>
            {user?.account_state === 'FROZEN' ? (
              <button onClick={handleUnfreeze} disabled={acting}
                className="w-full py-2.5 rounded-lg bg-[#00C853] text-black text-sm font-bold
                           flex items-center justify-center gap-2">
                <Unlock size={14} /> Unfreeze Account
              </button>
            ) : (
              <button onClick={handleFreeze} disabled={acting}
                className="w-full py-2.5 rounded-lg bg-[#C1121F] text-white text-sm font-bold
                           flex items-center justify-center gap-2">
                <Lock size={14} /> Freeze Account
              </button>
            )}
          </div>
        </div>

        {/* Right - History */}
        <div className="col-span-2 space-y-4">
          <div className="bg-[#111] rounded-xl border border-[#1a1a1a] p-5">
            <h3 className="text-white font-bold mb-4">Deposit History</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {['Amount', 'Network', 'Plan', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left pb-2 text-[#555] text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deposits?.map((d: any) => (
                  <tr key={d.id} className="border-b border-[#111]">
                    <td className="py-2 text-[#00C853] font-bold">{fmt.usd(d.amount)}</td>
                    <td className="py-2 text-white">{d.network}</td>
                    <td className="py-2 text-white">{d.plan}</td>
                    <td className="py-2"><StatusBadge status={d.status} /></td>
                    <td className="py-2 text-[#555]">{fmt.date(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#111] rounded-xl border border-[#1a1a1a] p-5">
            <h3 className="text-white font-bold mb-4">Withdrawal History</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {['Amount', 'Received', 'Network', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left pb-2 text-[#555] text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals?.map((w: any) => (
                  <tr key={w.id} className="border-b border-[#111]">
                    <td className="py-2 text-[#F9A825] font-bold">{fmt.usd(w.amount)}</td>
                    <td className="py-2 text-[#00C853]">{fmt.usd(w.final_amount)}</td>
                    <td className="py-2 text-white">{w.network}</td>
                    <td className="py-2"><StatusBadge status={w.status} /></td>
                    <td className="py-2 text-[#555]">{fmt.date(w.requested_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
