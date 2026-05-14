'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { useAdminStore } from '@/store/auth.store';
import { fmt, StatusBadge, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import {
  Users, ArrowDownToLine, ArrowUpFromLine, Shield,
  TrendingUp, Settings, FileText, AlertTriangle,
  CheckCircle, XCircle, LogOut, ChevronRight,
  Eye, RefreshCw, Loader2, Search,
} from 'lucide-react';

// ─── Admin Layout ────────────────────────────────────────
function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { admin, adminLogout } = useAdminStore();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp, href: '/admin' },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine, href: '/admin/deposits' },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, href: '/admin/withdrawals' },
    { id: 'kyc', label: 'KYC', icon: Shield, href: '/admin/kyc' },
    { id: 'users', label: 'Users', icon: Users, href: '/admin/users' },
    { id: 'roi', label: 'ROI Engine', icon: RefreshCw, href: '/admin/roi' },
    { id: 'audit', label: 'Audit Log', icon: FileText, href: '/admin/audit' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0a0a0a] border-r border-[#111] flex flex-col fixed h-full z-40">
        <div className="p-5 border-b border-[#111]">
          <div className="flex items-center gap-2">
            <span className="text-[#00C853] font-black text-xl">L</span>
            <div>
              <p className="text-white font-bold text-sm">LIANKA</p>
              <p className="text-[#00C853] text-[10px] font-semibold uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors
                ${pathname === item.href
                  ? 'bg-[#00C85315] text-[#00C853] border-r-2 border-[#00C853]'
                  : 'text-[#555] hover:text-white hover:bg-[#111]'}`}>
              <item.icon size={16} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#111]">
          <div className="mb-3">
            <p className="text-white text-xs font-semibold">{admin?.full_name || 'Admin'}</p>
            <p className="text-[#555] text-[10px]">{admin?.role}</p>
          </div>
          <button onClick={adminLogout}
            className="w-full flex items-center gap-2 text-[#C1121F] text-xs font-semibold
                       py-2 hover:bg-[#C1121F10] rounded-lg px-2 transition-colors">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen">
        <header className="bg-[#0a0a0a] border-b border-[#111] px-6 py-4 sticky top-0 z-30">
          <h1 className="text-white font-bold text-lg">{title}</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

// ─── Admin Login ─────────────────────────────────────────
export function AdminLoginPage() {
  const router = useRouter();
  const { setAdmin, setAdminToken } = useAdminStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.login({ email, password });
      setAdminToken(res.data.access_token);
      setAdmin(res.data.admin);
      router.push('/admin');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-[#00C853] font-black text-4xl">L</span>
          <p className="text-white font-bold mt-1">LIANKA Admin</p>
          <p className="text-[#555] text-sm">Secure admin access</p>
        </div>
        <div className="space-y-4">
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="Admin email"
            className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5
                       text-white placeholder-[#444] focus:outline-none focus:border-[#00C853]" />
          <input value={password} onChange={e => setPassword(e.target.value)}
            type="password" placeholder="Password"
            className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5
                       text-white placeholder-[#444] focus:outline-none focus:border-[#00C853]"
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold
                       flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
            {loading ? 'Signing in...' : 'Admin Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Overview ──────────────────────────────────────
export function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getOverview().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout title="Overview"><div className="flex justify-center mt-20"><Spinner size={32} /></div></AdminLayout>;

  return (
    <AdminLayout title="Overview">
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: data?.overview?.total_users || 0, color: '#1565C0' },
          { label: 'Active Users', value: data?.overview?.active_users || 0, color: '#00C853' },
          { label: 'Total AUM', value: fmt.usd(data?.overview?.total_aum || 0), color: '#F9A825' },
          { label: 'Total Profit on Platform', value: fmt.usd(data?.overview?.total_profit_on_platform || 0), color: '#7B1FA2' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111] rounded-xl border border-[#1a1a1a] p-4">
            <p className="text-[#555] text-xs mb-2">{stat.label}</p>
            <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* User states */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Active', value: data?.overview?.active_users, color: '#00C853' },
          { label: 'Grace', value: data?.overview?.grace_users, color: '#F9A825' },
          { label: 'Inactive', value: data?.overview?.inactive_users, color: '#555' },
          { label: 'Terminated', value: data?.overview?.terminated_users, color: '#C1121F' },
          { label: 'Frozen', value: data?.overview?.frozen_users, color: '#C1121F' },
        ].map((s, i) => (
          <div key={i} className="bg-[#111] rounded-xl border border-[#1a1a1a] p-3 text-center">
            <p style={{ color: s.color }} className="text-xl font-black">{s.value || 0}</p>
            <p className="text-[#555] text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending actions */}
      <div className="bg-[#111] rounded-xl border border-[#1a1a1a] p-4">
        <h3 className="text-white font-bold mb-4">Pending Actions</h3>
        {(data?.pending || []).length === 0 ? (
          <p className="text-[#555] text-sm">No pending actions</p>
        ) : (
          <div className="space-y-2">
            {data.pending.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                    ${item.action_type === 'DEPOSIT' ? 'bg-[#00C85520] text-[#00C853]' :
                      item.action_type === 'WITHDRAWAL' ? 'bg-[#F9A82520] text-[#F9A825]' :
                      'bg-[#1565C020] text-[#1565C0]'}`}>
                    {item.action_type}
                  </span>
                  {item.amount && <span className="text-white text-sm font-semibold">{fmt.usd(item.amount)}</span>}
                </div>
                <span className="text-[#555] text-xs">{fmt.ago(item.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Admin Deposits ───────────────────────────────────────
export function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState<string | null>(null);

  const loadDeposits = () => {
    adminAPI.getPendingDeposits().then(r => {
      setDeposits(r.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadDeposits(); }, []);

  const approve = async (id: string) => {
    setActionId(id);
    try {
      await adminAPI.approveDeposit(id);
      toast.success('Deposit approved and credited');
      loadDeposits();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionId(null); }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Enter rejection reason'); return; }
    setActionId(id);
    try {
      await adminAPI.rejectDeposit(id, rejectReason);
      toast.success('Deposit rejected');
      setShowReject(null);
      setRejectReason('');
      loadDeposits();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionId(null); }
  };

  return (
    <AdminLayout title="Pending Deposits">
      {loading ? <div className="flex justify-center mt-20"><Spinner size={32} /></div> : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#555] text-sm">{deposits.length} pending deposits</p>
            <button onClick={loadDeposits} className="text-[#00C853] text-sm flex items-center gap-1">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {deposits.length === 0 ? (
            <div className="bg-[#111] rounded-xl p-12 text-center border border-[#1a1a1a]">
              <CheckCircle size={40} className="text-[#00C853] mx-auto mb-3" />
              <p className="text-[#555]">No pending deposits</p>
            </div>
          ) : deposits.map((d: any) => (
            <div key={d.id} className="bg-[#111] rounded-xl border border-[#1a1a1a] p-5 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[#555] text-xs">User Email</p>
                  <p className="text-white text-sm font-semibold">{d.user_id?.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Amount</p>
                  <p className="text-[#00C853] text-xl font-black">{fmt.usd(d.amount)}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Network</p>
                  <p className="text-white text-sm font-semibold">{d.network}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Plan</p>
                  <p className="text-white text-sm">{d.plan}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#555] text-xs mb-1">Transaction ID</p>
                  <div className="bg-[#0a0a0a] rounded-lg p-2.5 flex items-center justify-between">
                    <p className="text-[#00C853] text-xs font-mono break-all">{d.txid}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#555] mb-4">
                <span>Submitted: {fmt.date(d.submitted_at)}</span>
                <a href={`https://${d.network === 'TRC20' ? 'tronscan.org/#/transaction' : 'bscscan.com/tx'}/${d.txid}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[#1565C0] flex items-center gap-1 hover:underline">
                  Verify on Explorer <ChevronRight size={12} />
                </a>
              </div>
              {showReject === d.id ? (
                <div className="space-y-2">
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (required)"
                    className="w-full bg-[#0a0a0a] border border-[#C1121F] rounded-lg px-3 py-2
                               text-white text-sm focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReject(null)}
                      className="flex-1 py-2.5 rounded-lg border border-[#333] text-[#888] text-sm">
                      Cancel
                    </button>
                    <button onClick={() => reject(d.id)} disabled={actionId === d.id}
                      className="flex-1 py-2.5 rounded-lg bg-[#C1121F] text-white font-bold text-sm
                                 flex items-center justify-center gap-2">
                      {actionId === d.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      Confirm Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setShowReject(d.id)}
                    className="flex-1 py-3 rounded-xl border border-[#C1121F] text-[#C1121F]
                               font-semibold text-sm hover:bg-[#C1121F10] flex items-center justify-center gap-2">
                    <XCircle size={16} /> Reject
                  </button>
                  <button onClick={() => approve(d.id)} disabled={actionId === d.id}
                    className="flex-1 py-3 rounded-xl bg-[#00C853] text-black font-bold text-sm
                               flex items-center justify-center gap-2 disabled:opacity-50">
                    {actionId === d.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Approve & Credit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

// ─── Admin Withdrawals ───────────────────────────────────
export function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txids, setTxids] = useState<Record<string, string>>({});
  const [actionId, setActionId] = useState<string | null>(null);
  const [showReject, setShowReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = () => {
    adminAPI.getPendingWithdrawals().then(r => {
      setWithdrawals(r.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const approve = async (id: string) => {
    if (!txids[id]?.trim()) { toast.error('Enter the TXID of the sent transaction'); return; }
    setActionId(id);
    try {
      await adminAPI.approveWithdrawal(id, txids[id]);
      toast.success('Withdrawal marked as completed');
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionId(null); }
  };

  return (
    <AdminLayout title="Pending Withdrawals">
      {loading ? <div className="flex justify-center mt-20"><Spinner size={32} /></div> : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#555] text-sm">{withdrawals.length} pending withdrawals</p>
            <button onClick={loadData} className="text-[#00C853] text-sm flex items-center gap-1">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {withdrawals.length === 0 ? (
            <div className="bg-[#111] rounded-xl p-12 text-center border border-[#1a1a1a]">
              <CheckCircle size={40} className="text-[#00C853] mx-auto mb-3" />
              <p className="text-[#555]">No pending withdrawals</p>
            </div>
          ) : withdrawals.map((w: any) => (
            <div key={w.id} className="bg-[#111] rounded-xl border border-[#1a1a1a] p-5 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[#555] text-xs">User</p>
                  <p className="text-white text-sm font-semibold">{w.email || w.user_id?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Amount to Send</p>
                  <p className="text-[#F9A825] text-xl font-black">{fmt.usd(w.final_amount)}</p>
                  <p className="text-[#555] text-[10px]">Requested: {fmt.usd(w.amount)} | Fee: {fmt.usd(w.network_fee)}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Network</p>
                  <p className="text-white font-semibold">{w.network}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Wallet Type</p>
                  <p className="text-white">{w.wallet_type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#555] text-xs mb-1">Send USDT to this address</p>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 border border-[#F9A82530]">
                    <p className="text-[#F9A825] text-xs font-mono break-all">{w.address}</p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-[#555] text-xs mb-1.5">
                  After sending, paste the Transaction ID here:
                </p>
                <input
                  value={txids[w.id] || ''}
                  onChange={e => setTxids(prev => ({ ...prev, [w.id]: e.target.value }))}
                  placeholder="Transaction ID (TXID) of sent transfer"
                  className="w-full bg-[#0a0a0a] border border-[#00C85340] rounded-lg px-3 py-2.5
                             text-white text-xs font-mono focus:outline-none focus:border-[#00C853]"
                />
              </div>
              {showReject === w.id ? (
                <div className="space-y-2">
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rejection reason" className="w-full bg-[#0a0a0a] border border-[#C1121F]
                    rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReject(null)}
                      className="flex-1 py-2.5 rounded-lg border border-[#333] text-[#888] text-sm">Cancel</button>
                    <button onClick={async () => {
                      setActionId(w.id);
                      await adminAPI.rejectWithdrawal(w.id, rejectReason);
                      toast.success('Rejected — funds returned');
                      setShowReject(null);
                      setRejectReason('');
                      loadData();
                      setActionId(null);
                    }}
                      className="flex-1 py-2.5 rounded-lg bg-[#C1121F] text-white font-bold text-sm">Confirm</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setShowReject(w.id)}
                    className="flex-1 py-3 rounded-xl border border-[#C1121F] text-[#C1121F]
                               font-semibold text-sm flex items-center justify-center gap-2">
                    <XCircle size={16} /> Reject
                  </button>
                  <button onClick={() => approve(w.id)} disabled={actionId === w.id}
                    className="flex-1 py-3 rounded-xl bg-[#00C853] text-black font-bold text-sm
                               flex items-center justify-center gap-2">
                    {actionId === w.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Mark Completed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

// ─── Admin ROI Engine ─────────────────────────────────────
export function AdminROIPage() {
  const [rates, setRates] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const plans = [
    { id: 'DAILY', label: 'Daily Plan', max: 0.20 },
    { id: 'BIWEEKLY', label: 'Bi-Weekly Plan', max: 0.50 },
    { id: '40D', label: '40-Day Plan', max: 1.00 },
    { id: '90D', label: '90-Day Plan', max: 1.20 },
    { id: '180D', label: '180-Day Plan', max: 1.50 },
  ];

  const saveRates = async () => {
    setLoading(true);
    let saved = 0;
    for (const [timeframe, rate] of Object.entries(rates)) {
      if (rate) {
        try {
          await adminAPI.setROIRate({ date, timeframe, rate: Number(rate) });
          saved++;
        } catch (err: any) {
          toast.error(`${timeframe}: ${err.response?.data?.message || 'Error'}`);
        }
      }
    }
    if (saved > 0) toast.success(`${saved} rates saved for ${date}`);
    setLoading(false);
  };

  const runEngine = async () => {
    setRunning(true);
    try {
      const res = await adminAPI.runROI(date);
      toast.success(`ROI applied: ${res.data.applied} users processed`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setRunning(false); }
  };

  return (
    <AdminLayout title="ROI Engine">
      <div className="max-w-2xl">
        <div className="bg-[#111] rounded-xl border border-[#1a1a1a] p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Set ROI Rates</h3>
          <div className="mb-4">
            <label className="text-[#555] text-xs mb-1.5 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5
                         text-white focus:outline-none focus:border-[#00C853]" />
          </div>
          <div className="space-y-3 mb-6">
            {plans.map(p => (
              <div key={p.id} className="flex items-center gap-4">
                <span className="text-white text-sm w-32 shrink-0">{p.label}</span>
                <div className="flex items-center gap-2 flex-1">
                  <input type="number" step="0.01" min="0" max={p.max}
                    value={rates[p.id] || ''}
                    onChange={e => setRates(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder={`Max: ${p.max}%`}
                    className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2
                               text-white text-sm focus:outline-none focus:border-[#00C853]" />
                  <span className="text-[#555] text-sm">%</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveRates} disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1565C0] text-white font-bold text-sm
                       flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Save Rates for {date}
          </button>
        </div>
        <div className="bg-[#111] rounded-xl border border-[#F9A82530] p-6">
          <h3 className="text-white font-bold mb-2">Run ROI Engine</h3>
          <p className="text-[#555] text-sm mb-4">
            Applies daily ROI to all ACTIVE accounts for the selected date.
            The engine runs automatically Monday–Friday at midnight UTC.
            Use manual run only when needed.
          </p>
          <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-lg p-3 mb-4">
            <p className="text-[#F9A825] text-xs">
              ⚠ The engine has double-execution protection. If ROI was already applied for this date, it will be skipped.
            </p>
          </div>
          <button onClick={runEngine} disabled={running}
            className="w-full py-3.5 rounded-xl bg-[#00C853] text-black font-bold
                       flex items-center justify-center gap-2 disabled:opacity-50">
            {running ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {running ? 'Running ROI Engine...' : `Run ROI Engine for ${date}`}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
