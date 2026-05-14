'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { fmt, StatusBadge, Spinner } from '@/components/ui';
import { Search, RefreshCw, ChevronRight } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const loadData = (s = search, state = stateFilter) => {
    setLoading(true);
    adminAPI
      .getUsers({ page: 1, limit: 50, search: s, state: state || undefined })
      .then((r) => setUsers(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#0a0a0a] border-b border-[#111] px-6 py-4 flex items-center justify-between">
        <h1 className="text-white font-bold text-lg">Users</h1>
        <button
          onClick={() => loadData()}
          className="text-[#00C853] text-sm flex items-center gap-1"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </header>
      <div className="p-6">
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-4 py-2.5
                         text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#00C853]"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              loadData(search, e.target.value);
            }}
            className="bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-white text-sm
                       focus:outline-none focus:border-[#00C853]"
          >
            <option value="">All States</option>
            {['ACTIVE', 'GRACE', 'INACTIVE', 'TERMINATED', 'FROZEN'].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center mt-20">
            <Spinner size={32} />
          </div>
        ) : (
          <div className="bg-[#111] rounded-xl border border-[#1a1a1a] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {[
                    'User',
                    'State',
                    'Balance',
                    'Loyalty',
                    'Rank',
                    'Joined',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[#555] text-xs font-semibold uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[#111] hover:bg-[#161616] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">
                        {u.full_name || '—'}
                      </p>
                      <p className="text-[#555] text-xs">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.account_state} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#00C853] text-sm font-semibold">
                        {fmt.usd(u.total_balance)}
                      </p>
                      <p className="text-[#555] text-xs">
                        AUM: {fmt.usd(u.active_deposit)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">
                        {fmt.pct(u.loyalty_score)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#F9A825] text-xs font-semibold">
                        {u.rank}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#555] text-xs">
                      {fmt.date(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                        className="text-[#1565C0] hover:text-white transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-12 text-center text-[#555]">
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
