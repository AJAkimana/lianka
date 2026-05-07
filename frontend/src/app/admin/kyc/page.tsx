'use client';
import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { fmt, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, RefreshCw, Eye } from 'lucide-react';

function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#0a0a0a] border-b border-[#111] px-6 py-4">
        <h1 className="text-white font-bold text-lg">{title}</h1>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function AdminKYCPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showReject, setShowReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = () => {
    adminAPI.getPendingKYC().then(r => { setDocs(r.data || []); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const approve = async (id: string) => {
    setActionId(id);
    try {
      await adminAPI.approveKYC(id);
      toast.success('KYC approved — user can now withdraw');
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionId(null); }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Enter rejection reason'); return; }
    setActionId(id);
    try {
      await adminAPI.rejectKYC(id, rejectReason);
      toast.success('KYC rejected');
      setShowReject(null);
      setRejectReason('');
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionId(null); }
  };

  return (
    <AdminLayout title="KYC Review">
      {loading ? <div className="flex justify-center mt-20"><Spinner size={32} /></div> : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#555] text-sm">{docs.length} pending KYC submissions</p>
            <button onClick={loadData} className="text-[#00C853] text-sm flex items-center gap-1">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {docs.length === 0 ? (
            <div className="bg-[#111] rounded-xl p-12 text-center border border-[#1a1a1a]">
              <CheckCircle size={40} className="text-[#00C853] mx-auto mb-3" />
              <p className="text-[#555]">No pending KYC submissions</p>
            </div>
          ) : docs.map((doc: any) => (
            <div key={doc.id} className="bg-[#111] rounded-xl border border-[#1a1a1a] p-5 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[#555] text-xs">User ID</p>
                  <p className="text-white text-sm font-mono">{doc.user_id?.slice(0, 12)}...</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Document Type</p>
                  <p className="text-white text-sm font-semibold">{doc.document_type}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Full Name</p>
                  <p className="text-white text-sm">{doc.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Nationality</p>
                  <p className="text-white text-sm">{doc.nationality || '—'}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Document Number</p>
                  <p className="text-white text-sm font-mono">{doc.document_number || '—'}</p>
                </div>
                <div>
                  <p className="text-[#555] text-xs">Date of Birth</p>
                  <p className="text-white text-sm">{doc.date_of_birth || '—'}</p>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                {[
                  { label: 'Front', url: doc.front_image_url },
                  { label: 'Back', url: doc.back_image_url },
                  { label: 'Selfie', url: doc.selfie_url },
                ].filter(i => i.url).map(item => (
                  <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 bg-[#0a0a0a] rounded-lg p-2.5 border border-[#222]
                               flex items-center justify-center gap-2 text-[#1565C0] text-xs font-semibold
                               hover:border-[#1565C0] transition-colors">
                    <Eye size={14} /> {item.label}
                  </a>
                ))}
              </div>
              <p className="text-[#555] text-xs mb-4">Submitted: {fmt.date(doc.submitted_at)}</p>
              {showReject === doc.id ? (
                <div className="space-y-2">
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (e.g. 'Document not clearly visible')"
                    className="w-full bg-[#0a0a0a] border border-[#C1121F] rounded-lg px-3 py-2
                               text-white text-sm focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReject(null)}
                      className="flex-1 py-2.5 rounded-lg border border-[#333] text-[#888] text-sm">Cancel</button>
                    <button onClick={() => reject(doc.id)} disabled={actionId === doc.id}
                      className="flex-1 py-2.5 rounded-lg bg-[#C1121F] text-white font-bold text-sm flex items-center justify-center gap-2">
                      {actionId === doc.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      Confirm Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setShowReject(doc.id)}
                    className="flex-1 py-3 rounded-xl border border-[#C1121F] text-[#C1121F]
                               font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#C1121F10]">
                    <XCircle size={16} /> Reject
                  </button>
                  <button onClick={() => approve(doc.id)} disabled={actionId === doc.id}
                    className="flex-1 py-3 rounded-xl bg-[#00C853] text-black font-bold text-sm
                               flex items-center justify-center gap-2 disabled:opacity-50">
                    {actionId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Approve KYC
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
