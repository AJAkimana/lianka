'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Header, BottomNav, fmt, Spinner } from '@/components/ui';
import { Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const TABS = ['All', 'Deposits', 'Withdrawals', 'Earnings', 'Bonuses', 'Others'];

const TYPE_MAP: Record<string, { label: string; icon: string; tab: string }> = {
  DEPOSIT:              { label: 'Deposit',              icon: '⬇', tab: 'Deposits'    },
  WITHDRAWAL:           { label: 'Withdrawal',           icon: '⬆', tab: 'Withdrawals' },
  ROI:                  { label: 'ROI Earning',          icon: '⭐', tab: 'Earnings'   },
  REFERRAL_BONUS:       { label: 'Referral Bonus',       icon: '👥', tab: 'Bonuses'    },
  PROMOTION_BONUS:      { label: 'Promotion Bonus',      icon: '🎁', tab: 'Bonuses'    },
  REINVESTMENT:         { label: 'Reinvestment',         icon: '🔄', tab: 'Others'     },
  WITHDRAWAL_CANCELLED: { label: 'Cancelled',            icon: '↩', tab: 'Withdrawals' },
  WITHDRAWAL_REJECTED:  { label: 'Rejected',             icon: '✗', tab: 'Withdrawals' },
};

export default function TransactionsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadData();
  }, [token, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getLedger(page);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } finally { setLoading(false); }
  };

  const filtered = items.filter(item => {
    const meta = TYPE_MAP[item.reference_type] || { tab: 'Others' };
    const matchTab = tab === 'All' || meta.tab === tab;
    const matchSearch = !search ||
      item.reference_type?.toLowerCase().includes(search.toLowerCase()) ||
      String(item.amount).includes(search);
    return matchTab && matchSearch;
  });

  const totals = {
    deposits:    items.filter(i => i.reference_type === 'DEPOSIT').reduce((s,i) => s + Number(i.amount), 0),
    withdrawals: items.filter(i => i.reference_type === 'WITHDRAWAL').reduce((s,i) => s + Number(i.amount), 0),
    earnings:    items.filter(i => i.reference_type === 'ROI').reduce((s,i) => s + Number(i.amount), 0),
    bonuses:     items.filter(i => ['REFERRAL_BONUS','PROMOTION_BONUS'].includes(i.reference_type)).reduce((s,i) => s + Number(i.amount), 0),
  };
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="screen">
      <Header title="Transaction History" />

      {/* Tabs */}
      <div className="flex overflow-x-auto px-4 pt-3 pb-2 gap-1.5 border-b border-[#111]">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors
              ${tab === t ? 'bg-[#00C853] text-black' : 'bg-[#111] text-[#666] border border-[#1a1a1a]'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Search row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="flex-1 flex items-center gap-2 bg-[#111] border border-[#1a1a1a] rounded-xl px-3 py-2">
          <Search size={13} className="text-[#555] shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by type, amount or transaction ID..."
            className="bg-transparent text-white text-xs flex-1 outline-none placeholder-[#444]" />
        </div>
        <button className="p-2 bg-[#111] border border-[#1a1a1a] rounded-xl"><Download size={15} className="text-[#555]" /></button>
        <button className="p-2 bg-[#111] border border-[#1a1a1a] rounded-xl"><Filter size={15} className="text-[#555]" /></button>
      </div>

      {loading ? (
        <div className="flex justify-center mt-10"><Spinner size={32} /></div>
      ) : (
        <>
          {/* Table */}
          <div className="mx-4 bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden mb-3">
            <div className="grid gap-2 px-4 py-2.5 bg-[#0d0d0d] border-b border-[#1a1a1a]"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr' }}>
              {['Transaction', 'Asset', 'Amount', 'Status', 'Date & Time'].map(h => (
                <p key={h} className="text-[#555] text-[9px] font-bold uppercase tracking-wider">{h}</p>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-4xl mb-2">📭</p>
                <p className="text-[#555] text-sm">No transactions found</p>
              </div>
            ) : filtered.map(item => {
              const meta = TYPE_MAP[item.reference_type] || { label: item.reference_type, icon: '💰', tab: 'Others' };
              const isCredit = item.entry_type === 'CREDIT';
              const txnId = (item.reference_type?.slice(0,2) || 'TX') + (item.reference_id?.slice(-10) || item.id?.slice(-10) || '');
              return (
                <div key={item.id}
                  className="grid gap-2 px-4 py-3 border-b border-[#0d0d0d] last:border-0
                             hover:bg-[#0d0d0d] transition-colors items-center"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr' }}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0
                      ${isCredit ? 'bg-[#00C85520]' : 'bg-[#C1121F20]'}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-[11px] font-semibold leading-tight truncate">{meta.label}</p>
                      <p className="text-[#555] text-[9px] font-mono truncate">{txnId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-[#00C85520] flex items-center justify-center shrink-0">
                      <span className="text-[7px] text-[#00C853] font-bold">T</span>
                    </div>
                    <div>
                      <p className="text-white text-[10px] font-bold">USDT</p>
                      <p className="text-[#555] text-[8px]">{item.wallet_type || 'TRC20'}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${isCredit ? 'text-[#00C853]' : 'text-[#C1121F]'}`}>
                    {isCredit ? '+' : '-'}{fmt.usd(item.amount)}
                  </p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#00C85520] text-[#00C853] inline-block">
                    Completed
                  </span>
                  <div>
                    <p className="text-[#888] text-[10px]">
                      {new Date(item.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                    </p>
                    <p className="text-[#555] text-[9px]">
                      {new Date(item.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary totals */}
          <div className="mx-4 mb-3 grid grid-cols-5 gap-2">
            {[
              { icon: '⬇', label: 'Total Deposits', val: totals.deposits, color: 'text-[#00C853]', count: items.filter(i=>i.reference_type==='DEPOSIT').length },
              { icon: '⬆', label: 'Total Withdrawals', val: totals.withdrawals, color: 'text-[#C1121F]', count: items.filter(i=>i.reference_type==='WITHDRAWAL').length },
              { icon: '⭐', label: 'Total ROI Earnings', val: totals.earnings, color: 'text-[#00C853]', count: items.filter(i=>i.reference_type==='ROI').length },
              { icon: '🎁', label: 'Total Bonuses', val: totals.bonuses, color: 'text-[#7B1FA2]', count: items.filter(i=>['REFERRAL_BONUS','PROMOTION_BONUS'].includes(i.reference_type)).length },
              { icon: '⚠', label: 'Total Fees', val: 2.10, color: 'text-[#F9A825]', count: 1 },
            ].map((s, i) => (
              <div key={i} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-2 text-center">
                <div className="text-base mb-1">{s.icon}</div>
                <p className={`font-bold text-xs ${s.color}`}>{fmt.usd(s.val)}</p>
                <p className="text-[#555] text-[9px] leading-tight mt-0.5">{s.label}</p>
                <p className="text-[#444] text-[9px]">{s.count} txns</p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 text-[#555] text-xs disabled:opacity-30">
                <ChevronLeft size={14} /> Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold
                      ${page === p ? 'bg-[#00C853] text-black' : 'bg-[#111] text-[#888] border border-[#1a1a1a]'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 text-[#555] text-xs disabled:opacity-30">
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Export prompt */}
          <div className="mx-4 mb-6 bg-[#111] border border-[#1a1a1a] rounded-xl p-3
                          flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-semibold">Need a detailed statement?</p>
              <p className="text-[#555] text-[11px]">Export your transaction history in CSV or PDF format.</p>
            </div>
            <button className="flex items-center gap-1.5 text-[#1565C0] text-xs font-semibold
                               border border-[#1565C030] px-3 py-1.5 rounded-lg">
              <Download size={12} /> Export
            </button>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
