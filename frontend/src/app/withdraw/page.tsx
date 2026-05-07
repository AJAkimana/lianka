'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { withdrawalAPI, userAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Header, BottomNav, fmt, Spinner, ConfirmModal,
  StatusBadge, InfoRow,
} from '@/components/ui';
import toast from 'react-hot-toast';
import {
  Shield, CheckCircle, AlertTriangle, XCircle,
  Lock, Clock, Loader2, ChevronRight, X,
} from 'lucide-react';

// 5-minute cancellation countdown — Screen 19
function WithdrawalCancelCountdown({ requestedAt, onCancel }: { requestedAt: string; onCancel: () => void }) {
  const CANCEL_WINDOW = 5 * 60; // 5 minutes in seconds
  const elapsed = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 1000);
  const [remaining, setRemaining] = useState(Math.max(0, CANCEL_WINDOW - elapsed));

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const canCancel = remaining > 0;

  return (
    <div className={`rounded-xl p-3 flex items-center justify-between
      ${canCancel
        ? 'bg-[#C1121F10] border border-[#C1121F30]'
        : 'bg-[#1a1a1a] border border-[#222]'}`}>
      <div className="flex items-center gap-2">
        <Clock size={14} className={canCancel ? 'text-[#F9A825]' : 'text-[#555]'} />
        <div>
          <p className={`text-xs font-semibold ${canCancel ? 'text-white' : 'text-[#555]'}`}>
            {canCancel ? 'Cancellation available for:' : 'Cancellation window expired'}
          </p>
          {canCancel && (
            <p className="text-[#F9A825] font-mono font-bold text-sm">
              {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={canCancel ? onCancel : undefined}
        disabled={!canCancel}
        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg
          ${canCancel
            ? 'bg-[#C1121F] text-white hover:bg-[#a00f1a]'
            : 'bg-[#222] text-[#555] cursor-not-allowed'}`}>
        <X size={12} />
        Cancel Request
      </button>
    </div>
  );
}

export default function WithdrawPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [walletTab, setWalletTab] = useState('profit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('TRC20');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const [meRes, pendingRes] = await Promise.all([
        userAPI.getMe(),
        withdrawalAPI.getPending(),
      ]);
      setUser(meRes.data);
      setPending(pendingRes.data);
      if (meRes.data.withdrawal_address) {
        setWithdrawAddress(meRes.data.withdrawal_address);
      }
    } catch { router.replace('/login'); }
    finally { setLoading(false); }
  };

  // ─── Gate logic evaluation ───────────────────────────────
  const getGateStatus = () => {
    if (!user) return null;

    if (['TERMINATED', 'FROZEN'].includes(user.account_state)) {
      return { blocked: true, message: 'Account closed — withdrawals not available', color: 'red' };
    }
    if (user.account_state === 'INACTIVE') {
      return { blocked: true, message: 'No active cycle — deposit to restart', color: 'gray' };
    }
    if (user.kyc_status !== 'VERIFIED') {
      const msgs: Record<string, string> = {
        REQUIRED: 'Complete KYC to withdraw',
        SUBMITTED: 'KYC under review — withdrawals available once verified',
        REJECTED: 'KYC rejected — resubmit to enable withdrawals',
      };
      return { blocked: true, message: msgs[user.kyc_status] || 'Complete KYC', color: 'yellow', link: '/profile' };
    }
    if (!user.total_profit || Number(user.total_profit) <= 0) {
      return { blocked: true, message: 'No profit available to withdraw', color: 'gray' };
    }
    if (pending) {
      return { blocked: true, message: 'Withdrawal already in progress', color: 'blue', isPending: true };
    }
    if (user.next_withdrawal_date) {
      const today = new Date().toISOString().split('T')[0];
      if (today < user.next_withdrawal_date) {
        return { blocked: true, message: `Next withdrawal available on ${fmt.date(user.next_withdrawal_date)}`, color: 'gray' };
      }
    }
    return { blocked: false };
  };

  const gate = getGateStatus();

  const walletBalance = {
    profit: Number(user?.profit_wallet_balance || 0),
    referral: Number(user?.referral_wallet_balance || 0),
    promotion: Number(user?.promotion_wallet_balance || 0),
  }[walletTab] || 0;

  const maxWithdrawal = () => {
    if (walletTab !== 'profit') return walletBalance;
    const percents: Record<string, number> = {
      DAILY: 0.05, BIWEEKLY: 0.15, '40D': 0.25, '90D': 0.50, '180D': 1.0,
    };
    return Number(user?.total_profit || 0) * (percents[user?.timeframe] || 0.25);
  };

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      await withdrawalAPI.request({
        amount: Number(amount),
        wallet_type: walletTab,
        address: withdrawAddress,
        network: withdrawNetwork,
      });
      toast.success('Withdrawal request submitted');
      setShowConfirm(false);
      setAmount('');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!pending) return;
    setCancelling(true);
    try {
      await withdrawalAPI.cancel(pending.id);
      toast.success('Withdrawal cancelled — funds returned');
      setShowCancelConfirm(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>
  );

  return (
    <div className="screen">
      <Header title="Withdraw" />

      {/* KYC Verified banner */}
      {user?.kyc_status === 'VERIFIED' ? (
        <div className="mx-4 mt-3 bg-[#00C85310] border border-[#00C85330] rounded-xl p-3
                        flex items-center gap-3">
          <Shield size={18} className="text-[#00C853]" />
          <div className="flex-1">
            <p className="text-[#00C853] text-xs font-bold">KYC Verified</p>
            <p className="text-[#666] text-[11px]">Your identity is verified. You can withdraw your profits.</p>
          </div>
          <span className="badge-verified">Verified</span>
        </div>
      ) : (
        <div className="mx-4 mt-3 bg-[#F9A82510] border border-[#F9A82530] rounded-xl p-3
                        flex items-center gap-3">
          <AlertTriangle size={18} className="text-[#F9A825]" />
          <p className="text-[#F9A825] text-xs font-semibold flex-1">
            {gate?.message || 'KYC verification required'}
          </p>
        </div>
      )}

      <p className="text-[#555] text-[11px] mx-4 mt-2 px-1">
        Withdrawals are allowed only from profit. Your principal (active deposit) cannot be withdrawn.
      </p>

      {/* Wallet selector */}
      <div className="mx-4 mt-4">
        <p className="section-title">1. Select Wallet Type</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'profit', label: 'Profit Wallet', balance: user?.profit_wallet_balance, color: '#00C853' },
            { id: 'referral', label: 'Referral Wallet', balance: user?.referral_wallet_balance, color: '#1565C0' },
            { id: 'promotion', label: 'Promotion Wallet', balance: user?.promotion_wallet_balance, color: '#7B1FA2' },
          ].map(w => (
            <button key={w.id} onClick={() => setWalletTab(w.id)}
              className={`card text-center py-3 transition-all ${
                walletTab === w.id ? 'border-[#00C853]' : ''
              }`}>
              <div className="flex items-center gap-1 justify-center mb-1">
                {walletTab === w.id && <CheckCircle size={12} className="text-[#00C853]" />}
              </div>
              <p className="text-[10px] text-[#666] leading-tight">{w.label}</p>
              <p style={{ color: w.color }} className="font-bold text-sm mt-1">{fmt.usd(w.balance)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div className="mx-4 mt-4">
        <p className="section-title">2. Enter Withdrawal Amount (USD)</p>
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white text-2xl font-bold">$</span>
            <input value={amount} onChange={e => setAmount(e.target.value)}
              type="number" placeholder="0.00"
              className="flex-1 bg-transparent text-white text-2xl font-bold outline-none placeholder-[#333]"
              disabled={!!gate?.blocked} />
            <button onClick={() => setAmount(maxWithdrawal().toFixed(2))}
              className="text-[#00C853] text-xs font-bold px-2 py-1 rounded bg-[#00C85315]">
              Max
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#555]">Available to withdraw</span>
              <span className="text-[#00C853] font-semibold">{fmt.usd(walletBalance)}</span>
            </div>
            {walletTab === 'profit' && (
              <div className="flex justify-between">
                <span className="text-[#555]">Maximum allowed ({user?.timeframe} plan)</span>
                <span className="text-[#F9A825] font-semibold">{fmt.usd(maxWithdrawal())}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#555]">Minimum amount</span>
              <span className="text-white">$10.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555]">Network Fee (est.)</span>
              <span className="text-[#F9A825]">~$2.10</span>
            </div>
            {amount && Number(amount) > 0 && (
              <div className="flex justify-between pt-2 border-t border-[#1a1a1a]">
                <span className="text-[#888] font-semibold">You Will Receive</span>
                <span className="text-[#00C853] font-bold">{fmt.usd(Math.max(0, Number(amount) - 2.10))}</span>
              </div>
            )}
          </div>

          {/* Next withdrawal date */}
          {user?.next_withdrawal_date && walletTab === 'profit' && (
            <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[#7B1FA2]" />
                  <div>
                    <p className="text-[#F9A825] text-[11px] font-semibold">Next Withdrawal Date</p>
                    <p className="text-[#666] text-[11px]">
                      {fmt.date(user.next_withdrawal_date)} 00:00 (Platform Time)
                    </p>
                    <p className="text-[#555] text-[10px]">You can withdraw again after this date.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#555] text-[10px]">Timeframe Plan</p>
                  <p className="text-[#1565C0] text-[11px] font-semibold">{user?.timeframe} Plan</p>
                  <p className="text-[#555] text-[10px]">Withdrawal Window</p>
                  <p className="text-white text-[11px] font-semibold">Every {
                    { DAILY: '5 Days', BIWEEKLY: '14 Days', '40D': '40 Days', '90D': '90 Days', '180D': '180 Days' }[user?.timeframe] || '5 Days'
                  }</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Address */}
      <div className="mx-4 mt-4">
        <p className="section-title">3. Withdrawal Address</p>
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00C85320] flex items-center justify-center">
                <span className="text-[#00C853] text-xs font-bold">T</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">USDT ({withdrawNetwork})</p>
                <p className="text-[#555] text-[10px] font-mono">
                  {withdrawAddress
                    ? `${withdrawAddress.slice(0, 6)}...${withdrawAddress.slice(-6)}`
                    : 'No address set'}
                </p>
              </div>
              {withdrawAddress && <span className="badge-verified">Verified</span>}
            </div>
            <button onClick={() => router.push('/profile')}
              className="text-[#1565C0] text-xs font-semibold border border-[#1565C030]
                         px-3 py-1.5 rounded-lg hover:bg-[#1565C010]">
              Change
            </button>
          </div>
          {!withdrawAddress && (
            <p className="text-[#C1121F] text-xs mt-2">Set a withdrawal address in Profile to continue</p>
          )}
        </div>
      </div>

      {/* Conditions checklist */}
      {user?.kyc_status === 'VERIFIED' && (
        <div className="mx-4 mt-4">
          <p className="section-title">Conditions Checklist</p>
          <div className="card">
            {[
              { label: 'Account State', value: user?.account_state, ok: ['ACTIVE', 'GRACE'].includes(user?.account_state) },
              { label: 'KYC Verification', value: user?.kyc_status, ok: user?.kyc_status === 'VERIFIED' },
              { label: 'Withdrawal Address', value: withdrawAddress ? 'Set & Verified' : 'Not Set', ok: !!withdrawAddress },
              { label: 'Sufficient Profit Balance', value: Number(user?.total_profit) > 0 ? 'Yes' : 'No', ok: Number(user?.total_profit) > 0 },
              { label: 'No Pending Request', value: pending ? 'Pending' : 'Yes', ok: !pending },
              { label: 'Minimum Amount Met', value: Number(amount) >= 10 ? 'Yes' : 'No', ok: Number(amount) >= 10 },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                <span className="text-[#666] text-xs">{c.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${c.ok ? 'text-[#00C853]' : 'text-[#F9A825]'}`}>
                    {c.value}
                  </span>
                  {c.ok
                    ? <CheckCircle size={14} className="text-[#00C853]" />
                    : <AlertTriangle size={14} className="text-[#F9A825]" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="mx-4 mt-6 mb-6">
        {pending ? (
          <div>
            {/* Full pending withdrawal card — Screen 19 */}
            <div className="bg-[#F9A82510] border border-[#F9A82540] rounded-xl p-4 mb-3">
              <div className="flex items-start gap-3 mb-3">
                {/* Hourglass cube graphic */}
                <img src="/images/hourglass-cube.png" alt=""
                  className="w-14 h-14 object-contain shrink-0" />
                <div>
                  <p className="text-[#F9A825] font-bold text-sm">Pending</p>
                  <p className="text-[#888] text-xs">Your withdrawal request is being processed.</p>
                  <p className="text-[#666] text-xs mt-1">You will receive a notification once the transaction is completed.</p>
                </div>
              </div>
              {/* Withdrawal details */}
              <div className="bg-[#0a0a0a] rounded-xl p-3 mb-3 space-y-0">
                {[
                  { label: 'Wallet Type', val: pending.wallet_type === 'profit' ? 'Profit Wallet' : pending.wallet_type, color: 'text-[#00C853]' },
                  { label: 'Withdrawal Amount', val: fmt.usd(pending.amount) },
                  { label: 'You Will Receive (est.)', val: fmt.usd(pending.final_amount), color: 'text-[#00C853]' },
                  { label: 'Network', val: `USDT (${pending.network})` },
                  { label: 'Request Date & Time', val: new Date(pending.requested_at).toLocaleString() },
                  { label: 'Request ID', val: `WD${new Date(pending.requested_at).toISOString().slice(0,10).replace(/-/g,'')}${pending.id?.slice(-6).toUpperCase()}` },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-[#1a1a1a] last:border-0 text-xs">
                    <span className="text-[#555]">{row.label}</span>
                    <span className={`font-semibold ${row.color || 'text-white'}`}>{row.val}</span>
                  </div>
                ))}
              </div>
              {/* Processing status tracker */}
              <p className="text-[#1565C0] text-xs font-semibold mb-2">Processing Status</p>
              <div className="flex items-center gap-0 mb-3">
                {[
                  { label: 'Request\nReceived', sub: new Date(pending.requested_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), active: true },
                  { label: 'Under\nReview', sub: 'In Progress', active: false },
                  { label: 'Processing\nPending', sub: 'Pending', active: false },
                  { label: 'Completed\nPending', sub: 'Pending', active: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${s.active ? 'bg-[#1565C0]' : 'bg-[#333]'}`} />
                      <p className={`text-[8px] text-center mt-1 whitespace-pre-line leading-tight
                        ${s.active ? 'text-[#1565C0]' : 'text-[#555]'}`}>{s.label}</p>
                      <p className="text-[#444] text-[8px]">{s.sub}</p>
                    </div>
                    {i < 3 && <div className="flex-1 h-px bg-[#1a1a1a] mx-0.5 mb-5" />}
                  </div>
                ))}
              </div>
              <p className="text-[#555] text-[11px] flex items-center gap-1">
                <Clock size={11} /> Average processing time: 24–72 hours. You will be notified via in-app notification and email once the withdrawal is completed.
              </p>
            </div>

            {/* Important rules */}
            <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-xl p-3 mb-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-[#F9A825] text-xs font-bold mb-1">⚠ Important</p>
                  <ul className="space-y-1">
                    {[
                      'You can cancel this request within 5 minutes of submission.',
                      'After cancellation time expires, the request cannot be cancelled.',
                      'Only one active withdrawal request is allowed at a time.',
                      'Do not create multiple requests to avoid delays or restrictions.',
                    ].map((item, i) => (
                      <li key={i} className="text-[#888] text-[11px]">• {item}</li>
                    ))}
                  </ul>
                </div>
                {/* Security shield graphic */}
                <img src="/images/security-shield.png" alt=""
                  className="w-14 h-14 object-contain shrink-0" />
              </div>
            </div>

            {/* Cancel countdown */}
            <WithdrawalCancelCountdown
              requestedAt={pending.requested_at}
              onCancel={() => setShowCancelConfirm(true)}
            />

            {/* Request Locked notice */}
            <div className="bg-[#7B1FA210] border border-[#7B1FA230] rounded-xl p-3 mt-3">
              <p className="text-[#7B1FA2] text-xs font-semibold">🔒 Request Locked</p>
              <p className="text-[#666] text-xs mt-0.5">You cannot create another withdrawal request while this one is pending.</p>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                if (gate?.blocked) return;
                if (!amount || Number(amount) < 10) { toast.error('Minimum withdrawal is $10'); return; }
                if (!withdrawAddress) { toast.error('Set a withdrawal address first'); return; }
                setShowConfirm(true);
              }}
              disabled={!!gate?.blocked || !amount || Number(amount) < 10 || !withdrawAddress}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              Request Withdrawal
            </button>
            {gate?.blocked && (
              <p className="text-[#856404] text-xs text-center mt-2">{gate.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70">
          <div className="bg-[#161616] rounded-t-2xl w-full max-w-[430px] mx-auto p-6 border-t border-[#222]">
            <h3 className="text-white font-bold text-lg mb-4">Confirm Withdrawal</h3>
            <div className="space-y-0 mb-4">
              <InfoRow label="Wallet Type" value="Profit Wallet" />
              <InfoRow label="Withdrawal Amount" value={fmt.usd(Number(amount))} />
              <InfoRow label="Network Fee" value="~$2.10" valueClass="text-[#F9A825]" />
              <InfoRow label="You Will Receive" value={fmt.usd(Number(amount) - 2.10)} valueClass="text-[#00C853]" />
              <InfoRow label="Network" value={`USDT (${withdrawNetwork})`} />
              <InfoRow label="Address" value={`${withdrawAddress.slice(0, 10)}...${withdrawAddress.slice(-8)}`} valueClass="text-[#888] font-mono text-[11px]" />
            </div>
            <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-lg p-3 mb-4">
              <p className="text-[#F9A825] text-xs">
                ⚠ Withdrawing may reduce your balance below principal and result in account termination.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border border-[#333] text-[#888] font-semibold text-sm">
                Cancel
              </button>
              <button onClick={handleRequest} disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-[#00C853] text-black font-bold text-sm
                           flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Withdrawal
              </button>
            </div>
            <p className="text-[#444] text-[10px] text-center mt-3">
              🔒 Withdrawals are processed manually and may take 24–72 hours
            </p>
          </div>
        </div>
      )}

      {/* Cancel confirm */}
      {showCancelConfirm && (
        <ConfirmModal
          title="Cancel Withdrawal?"
          message="Cancel your pending withdrawal? Funds will be returned to your wallet."
          confirmLabel="Cancel Withdrawal"
          confirmClass="bg-[#C1121F] text-white"
          onConfirm={handleCancel}
          onCancel={() => setShowCancelConfirm(false)}
          isLoading={cancelling}
        />
      )}

      <BottomNav />
    </div>
  );
}
