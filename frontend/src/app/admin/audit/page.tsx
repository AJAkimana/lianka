'use client';
import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { fmt, Spinner } from '@/components/ui';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  APPROVE_DEPOSIT: '#00C853',
  REJECT_DEPOSIT: '#C1121F',
  APPROVE_WITHDRAWAL: '#00C853',
  REJECT_WITHDRAWAL: '#C1121F',
  COMPLETE_WITHDRAWAL: '#00C853',
  APPROVE_KYC: '#00C853',
  REJECT_KYC: '#C1121F',
  SET_ROI_RATE: '#1565C0',
  RUN_ROI_ENGINE: '#1565C0',
  FREEZE_ACCOUNT: '#C1121F',
  UNFREEZE_ACCOUNT: '#F9A825',
  RESET_CYCLE: '#F9A825',
  ISSUE_PROMOTION: '#7B1FA2',
  CREATE_ADMIN: '#1565C0',
  EMERGENCY_PAUSE: '#C1121F',
  EMERGENCY_RESUME: '#00C853',
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadData = (p = page) => {
    setLoading(true);
    adminAPI.getAuditLog(p).then(r => {
      setLogs(r.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [page]);

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#0a0a0a] border-b border-[#111] px-6 py-4 flex items-center justify-between">
        <h1 className="text-white font-bold text-lg">Audit Log</h1>
        <button onClick={() => loadData()} className="text-[#00C853] text-sm flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </button>
      </header>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center mt-20"><Spinner size={32} /></div>
        ) : (
          <>
            <div className="bg-[#111] rounded-xl border border-[#1a1a1a] overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    {['Action', 'Target', 'Admin', 'Notes', 'Time'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[#555] text-xs font-semibold uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-[#111] hover:bg-[#161616]">
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            color: ACTION_COLORS[log.action] || '#888',
                            background: (ACTION_COLORS[log.action] || '#888') + '20',
                          }}>
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#888] text-xs">{log.target_type}</p>
                        <p className="text-white text-xs font-mono">{log.target_id?.slice(0, 12)}...</p>
                      </td>
                      <td className="px-4 py-3 text-[#555] text-xs font-mono">{log.admin_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-[#555] text-xs max-w-xs truncate">{log.notes || '—'}</td>
                      <td className="px-4 py-3 text-[#555] text-xs whitespace-nowrap">{fmt.ago(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="py-12 text-center text-[#555]">No audit logs found</div>
              )}
            </div>
            <div className="flex items-center justify-center gap-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 text-[#555] text-sm disabled:opacity-30 hover:text-white">
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-[#555] text-sm">Page {page}</span>
              <button disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 text-[#555] text-sm disabled:opacity-30 hover:text-white">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
