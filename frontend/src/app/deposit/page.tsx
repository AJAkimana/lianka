'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { depositAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Header, BottomNav, fmt, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { Copy, CheckCircle, AlertTriangle, Shield, ChevronRight, Info, Loader2, Clock } from 'lucide-react';

// Plan definitions matching Screen 06 design exactly
const PLANS = [
  {
    id: 'DAILY', label: 'Daily Plan', icon: '⭐', color: '#00C853',
    rate: 0.20, rateLabel: '0.20%', target: '200%',
    duration: 'Until 200% reached', profitType: 'Daily',
    minDeposit: 5000, minLabel: '$5,000',
  },
  {
    id: 'BIWEEKLY', label: 'Bi-Weekly Plan', icon: '📅', color: '#1565C0',
    rate: 0.50, rateLabel: '0.50%', target: '200%',
    duration: 'Until 200% reached', profitType: 'Every 14 Days',
    minDeposit: 2000, minLabel: '$2,000',
  },
  {
    id: '40D', label: '40-Day Plan', icon: '🚀', color: '#9C27B0',
    rate: 1.00, rateLabel: '1.00%', target: '200%',
    duration: '40 Days', profitType: 'Daily',
    minDeposit: 100, minLabel: '$100',
  },
  {
    id: '90D', label: '90-Day Plan', icon: '💎', color: '#F9A825',
    rate: 1.20, rateLabel: '1.20%', target: '200%',
    duration: '90 Days', profitType: 'Daily',
    minDeposit: 100, minLabel: '$100',
  },
  {
    id: '180D', label: '180-Day Plan', icon: '👑', color: '#FF6B35',
    rate: 1.50, rateLabel: '1.50%', target: '200%',
    duration: '180 Days', profitType: 'Daily',
    minDeposit: 100, minLabel: '$100',
  },
];

const NETWORKS = [
  { id: 'TRC20', label: 'TRC20 (TRON)', icon: '🔺', desc: '~1-3 min • Low fee', recommended: true },
  { id: 'BEP20', label: 'BEP20 (BSC)', icon: '🟡', desc: '~3-5 min • Medium fee', recommended: false },
];

type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ['Select Plan', 'Enter Amount', 'Payment', 'Confirm'];

// Address expiry countdown hook (24h by default)
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function DepositPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selectedPlan, setSelectedPlan] = useState('40D');
  const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
  const [amount, setAmount] = useState('');
  const [txid, setTxid] = useState('');
  const [depositInfo, setDepositInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [depositId, setDepositId] = useState('');
  const countdown = useCountdown(86400); // 24h countdown

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    depositAPI.getInfo().then(r => setDepositInfo(r.data));
  }, [token]);

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const address = depositInfo?.addresses?.[selectedNetwork] || '';
  const numAmount = Number(amount) || 0;

  const copyAddress = () => { navigator.clipboard.writeText(address); toast.success('Address copied'); };
  const copyTxid = () => { navigator.clipboard.writeText(txid); toast.success('TXID copied'); };

  // Validate amount against plan minimum
  const validateAmount = () => {
    if (numAmount < plan.minDeposit) {
      toast.error(`Minimum deposit for ${plan.label} is ${plan.minLabel}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!txid.trim()) { toast.error('Paste your transaction ID'); return; }
    setLoading(true);
    try {
      const res = await depositAPI.submit({
        amount: numAmount,
        network: selectedNetwork,
        txid: txid.trim(),
        plan: selectedPlan,
      });
      setDepositId(res.data.deposit_id || 'DP' + Date.now());
      setStep(4);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  // Step indicator
  const StepBar = () => (
    <div className="flex items-center px-4 py-3 gap-1">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
            ${step > i + 1 ? 'bg-[#00C853] text-black' :
              step === i + 1 ? 'border-2 border-[#00C853] text-[#00C853] bg-transparent' :
              'border border-[#333] text-[#555] bg-transparent'}`}>
            {step > i + 1 ? '✓' : i + 1}
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${step > i + 1 ? 'bg-[#00C853]' : 'bg-[#222]'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // ─── STEP 1: Select Plan + Enter Amount (Screen 06) ─────
  if (step === 1) return (
    <div className="screen">
      <Header title="Deposit" back="/dashboard" />
      <StepBar />

      <div className="px-4 pb-6">
        {/* Plan comparison header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">1. Select Investment Plan</h3>
          <button className="text-[#1565C0] text-xs flex items-center gap-1">
            <Info size={12} /> Plan Comparison
          </button>
        </div>

        {/* Horizontal scroll plan cards matching design */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-5 -mx-4 px-4">
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setSelectedPlan(p.id)}
              className={`shrink-0 w-36 rounded-xl border-2 p-3 text-left transition-all relative
                ${selectedPlan === p.id ? 'border-[#00C853] bg-[#00C85508]' : 'border-[#1a1a1a] bg-[#111]'}`}>
              {selectedPlan === p.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00C853]
                                flex items-center justify-center text-black text-[10px] font-bold">✓</div>
              )}
              <div className="text-2xl mb-2">{p.icon}</div>
              <p className="text-white text-xs font-bold mb-1">{p.label}</p>
              <p className="font-black text-xl mb-1" style={{ color: p.color }}>{p.rateLabel}</p>
              <p className="text-[#666] text-[10px] mb-2">Per Day</p>
              <div className="border border-[#1a1a1a] rounded-lg px-1.5 py-0.5 text-center mb-2">
                <p className="text-[10px]" style={{ color: p.color }}>Target: {p.target}</p>
              </div>
              <div className="space-y-1">
                {[
                  { icon: '⏱', label: 'Duration', val: p.duration },
                  { icon: '💰', label: 'Profit Type', val: p.profitType },
                  { icon: '🔒', label: 'Principal', val: 'Locked' },
                ].map((row, i) => (
                  <div key={i}>
                    <p className="text-[#555] text-[9px]">{row.label}</p>
                    <p className="text-white text-[10px] font-semibold">{row.val}</p>
                  </div>
                ))}
                <div>
                  <p className="text-[#555] text-[9px]">Min. Deposit</p>
                  <p className="font-bold text-xs" style={{ color: p.color }}>{p.minLabel}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Amount input */}
        <h3 className="text-white font-bold mb-3">2. Enter Deposit Amount</h3>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#00C853] text-2xl font-bold">$</span>
            <input value={amount} onChange={e => setAmount(e.target.value)}
              type="number" placeholder="0"
              className="flex-1 bg-transparent text-white text-3xl font-bold outline-none placeholder-[#222]"
            />
            <div className="border border-[#222] rounded-lg px-2 py-1 flex items-center gap-1 shrink-0">
              <span className="text-white text-xs font-semibold">USD</span>
              <span className="text-[#555] text-xs">▾</span>
            </div>
          </div>
          {/* Quick select buttons */}
          <div className="flex gap-2 flex-wrap mb-4">
            {['100', '200', '500', '1000', '2000', '5000', 'Custom'].map(v => (
              <button key={v} onClick={() => v !== 'Custom' && setAmount(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${amount === v ? 'bg-[#00C853] text-black' : 'bg-[#1a1a1a] text-[#888] hover:bg-[#222]'}`}>
                {v === 'Custom' ? v : `$${v}`}
              </button>
            ))}
          </div>

          {/* Deposit summary matching design */}
          {numAmount > 0 && (
            <div className="border border-[#1a1a1a] rounded-xl p-3">
              <p className="text-white font-semibold text-xs mb-3">Deposit Summary</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Selected Plan', val: plan.label, color: 'text-[#00C853]' },
                  { label: 'Daily ROI', val: `${plan.rateLabel} ($${(numAmount * plan.rate / 100).toFixed(2)}/day)`, color: 'text-white' },
                  { label: 'Est. Daily Profit', val: `$${(numAmount * plan.rate / 100).toFixed(2)}`, color: 'text-white' },
                  { label: 'Target', val: plan.target, color: 'text-white' },
                  { label: 'Est. to 200%', val: plan.duration === '40 Days' ? '40 Days' : plan.duration === '90 Days' ? '90 Days' : plan.duration === '180 Days' ? '180 Days' : `~${Math.ceil(100 / plan.rate)} Days`, color: 'text-white' },
                  { label: 'Est. Total Return', val: fmt.usd(numAmount * 2), color: 'text-white' },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-[#555] text-[9px]">{item.label}</p>
                    <p className={`text-[10px] font-semibold ${item.color}`}>{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Min deposit warning */}
        {numAmount > 0 && numAmount < plan.minDeposit && (
          <div className="bg-[#C1121F10] border border-[#C1121F30] rounded-xl p-3 mb-4">
            <p className="text-[#C1121F] text-xs font-semibold">
              ⚠ Minimum deposit for {plan.label} is {plan.minLabel}
            </p>
          </div>
        )}

        <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-3 mb-4
                        flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#00C853]" />
            <p className="text-[#00C853] text-xs">Your deposit is 100% secure and encrypted.</p>
          </div>
          <ChevronRight size={14} className="text-[#00C853]" />
        </div>

        <button
          onClick={() => { if (!validateAmount()) return; setStep(2); }}
          className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-base
                     flex items-center justify-center gap-2">
          Continue to Deposit <ChevronRight size={18} />
        </button>
      </div>
      <BottomNav />
    </div>
  );

  // ─── STEP 2: Select Network (Screen 08) ─────────────────
  if (step === 2) return (
    <div className="screen">
      <Header title="Select Network" back="/deposit" />
      <StepBar />
      <div className="px-4 pb-6">
        <div className="bg-[#F9A82515] border border-[#F9A82540] rounded-xl p-3 mb-6
                        flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#F9A825] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#F9A825] text-xs font-bold mb-0.5">Important: Choose the correct network</p>
            <p className="text-[#888] text-xs">Sending USDT via the wrong network may result in permanent loss of your funds.</p>
          </div>
        </div>

        <h3 className="text-white font-bold mb-4">Select Network</h3>
        <div className="space-y-3 mb-6">
          {NETWORKS.map(n => (
            <button key={n.id} onClick={() => setSelectedNetwork(n.id)}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all
                ${selectedNetwork === n.id ? 'border-[#00C853] bg-[#00C85508]' : 'border-[#1a1a1a] bg-[#111]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-2xl">
                    {n.icon}
                  </div>
                  <div>
                    {n.recommended && (
                      <p className="text-[#00C853] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        RECOMMENDED
                      </p>
                    )}
                    <p className="text-white font-bold">{n.label}</p>
                    <p className="text-[#555] text-xs">{n.id === 'TRC20' ? 'Tron Network' : 'Binance Smart Chain'}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${selectedNetwork === n.id ? 'border-[#00C853] bg-[#00C853]' : 'border-[#333]'}`}>
                  {selectedNetwork === n.id && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1a1a1a]">
                {[
                  { icon: '⏱', label: 'Confirmation Time', val: n.id === 'TRC20' ? '~ 1-3 Minutes' : '~ 3-5 Minutes', color: 'text-[#00C853]' },
                  { icon: '💰', label: 'Network Fee', val: n.id === 'TRC20' ? 'Low' : 'Medium', color: n.id === 'TRC20' ? 'text-[#00C853]' : 'text-[#F9A825]' },
                  { icon: '🛡', label: 'Security', val: 'High', color: 'text-[#00C853]' },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <p className="text-[#555] text-[10px] mb-0.5">{item.label}</p>
                    <p className={`text-xs font-semibold ${item.color}`}>{item.val}</p>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 flex items-center gap-3 mb-6">
          <span className="text-xl shrink-0">ℹ</span>
          <div className="flex-1">
            <p className="text-[#1565C0] text-xs font-semibold mb-0.5">Need help choosing?</p>
            <p className="text-[#888] text-xs">TRC20 is usually faster and cheaper. BEP20 is also secure and widely supported.</p>
          </div>
          <ChevronRight size={14} className="text-[#444]" />
        </div>

        <button onClick={() => setStep(3)}
          className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-base
                     flex items-center justify-center gap-2">
          Confirm {selectedNetwork} Network <ChevronRight size={18} />
        </button>
        <p className="text-[#444] text-[11px] text-center mt-3 flex items-center justify-center gap-1.5">
          <Shield size={11} className="text-[#00C853]" /> Your transaction is protected with bank-level security
        </p>
      </div>
      <BottomNav />
    </div>
  );

  // ─── STEP 3: Deposit Address + TXID (Screens 07 & 09) ───
  if (step === 3) return (
    <div className="screen">
      <Header title="Deposit Address" back="/deposit" />
      <StepBar />
      <div className="px-4 pb-6">
        {/* Network badge */}
        <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-3 mb-4
                        flex items-center justify-between">
          <p className="text-[#00C853] text-xs font-semibold flex items-center gap-2">
            <Shield size={14} />
            Send <strong>ONLY USDT ({selectedNetwork})</strong> to the address below
          </p>
          <span className="text-[#00C853] text-xs font-bold border border-[#00C85340] px-2 py-0.5 rounded-lg">
            {selectedNetwork}
          </span>
        </div>

        {/* QR + address side by side matching Screen 09 */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
          <div className="flex gap-3">
            {/* QR Code */}
            <div className="shrink-0">
              <p className="text-white text-xs font-semibold text-center mb-2">Scan QR Code</p>
              <div className="bg-white p-2 rounded-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(address)}&margin=0`}
                  alt="QR Code" width={120} height={120} className="rounded" />
              </div>
              <p className="text-[#555] text-[10px] text-center mt-1">Scan from wallet</p>
            </div>

            {/* Address details */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold mb-2">Deposit Address</p>
              <div className="bg-[#0a0a0a] border border-[#00C85330] rounded-lg p-2 flex items-start gap-2 mb-3">
                <p className="text-[#00C853] text-[11px] font-mono break-all flex-1 leading-snug">{address}</p>
                <button onClick={copyAddress} className="shrink-0 mt-0.5">
                  <Copy size={14} className="text-[#555] hover:text-white" />
                </button>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Currency', val: 'USDT' },
                  { label: 'Network', val: selectedNetwork === 'TRC20' ? 'TRC20 (TRON)' : 'BEP20 (BSC)' },
                  { label: 'Min. Deposit', val: `${plan.minLabel} USDT`, color: 'text-[#00C853]' },
                  { label: 'Your Amount', val: `${fmt.usd(numAmount)} USDT`, color: 'text-white font-bold' },
                  { label: 'Expected Credit', val: 'After 1 Confirmations', color: 'text-[#00C853]' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-[#555]">{row.label}</span>
                    <span className={row.color || 'text-white'}>{row.val}</span>
                  </div>
                ))}
                {/* Address expiry countdown */}
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#555] flex items-center gap-1">
                    <Clock size={11} /> Address Expires In
                  </span>
                  <span className="text-[#F9A825] font-mono font-bold">{countdown}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important instructions */}
        <div className="bg-[#1565C010] border border-[#1565C030] rounded-xl p-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-[#1565C0] text-xs font-semibold mb-2">ℹ Important Instructions</p>
              <ul className="space-y-1">
                {[
                  `Send ONLY USDT via ${selectedNetwork} network.`,
                  'Do NOT send any other coin or token.',
                  `Minimum deposit is ${plan.minLabel} USDT.`,
                  'You will receive confirmation after 1 network confirmation.',
                  'Deposits are manually reviewed and credited within 24 hours.',
                ].map((item, i) => (
                  <li key={i} className="text-[#888] text-[11px] flex items-start gap-1.5">
                    <span className="text-[#1565C0] mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* USDT Shield graphic */}
            <img src="/images/usdt-shield.png" alt=""
              className="w-16 h-16 object-contain shrink-0 -mt-1" />
          </div>
        </div>

        {/* Deposit summary */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 mb-4">
          <p className="text-white text-xs font-semibold mb-2">Deposit Summary</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Selected Plan', val: plan.label, color: 'text-[#00C853]' },
              { label: 'Deposit Amount', val: `${fmt.usd(numAmount)}\nUSDT`, color: 'text-white' },
              { label: 'Target', val: plan.target, color: 'text-white' },
              { label: 'Est. to 200%', val: plan.duration, color: 'text-white' },
            ].map((item, i) => (
              <div key={i} className={i > 0 ? 'border-l border-[#1a1a1a] pl-2' : ''}>
                <p className="text-[#555] text-[9px] mb-0.5">{item.label}</p>
                <p className={`text-[10px] font-semibold ${item.color} whitespace-pre-line`}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-[#F9A82510] border border-[#F9A82530] rounded-xl p-3 mb-4">
          <p className="text-[#F9A825] text-xs">
            <strong>Note:</strong> Please ensure you are sending USDT ({selectedNetwork}). Transactions on the wrong network cannot be recovered.
          </p>
        </div>

        {/* TXID input */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
          <p className="text-white font-semibold text-sm mb-1">After Sending, Enter Your Transaction ID</p>
          <p className="text-[#555] text-xs mb-3">Paste your TXID from your wallet's transaction history.</p>
          <input value={txid} onChange={e => setTxid(e.target.value)}
            placeholder="Paste Transaction ID (TXID) here..."
            className="input font-mono text-xs" />
        </div>

        {/* Waiting indicator */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 mb-6
                        flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#F9A825] border-t-transparent animate-spin" />
            <div>
              <p className="text-white text-xs font-semibold">Waiting for Deposit</p>
              <p className="text-[#555] text-[11px]">Send your deposit within the time limit.</p>
            </div>
          </div>
          <p className="text-[#F9A825] font-mono font-bold">{countdown}</p>
        </div>

        <button onClick={handleSubmit} disabled={loading || !txid.trim()}
          className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-base
                     flex items-center justify-center gap-2 disabled:opacity-40">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          {loading ? 'Submitting...' : 'I Have Sent Deposit'}
        </button>
      </div>
      <BottomNav />
    </div>
  );

  // ─── STEP 4: Confirmation (Screens 10 & 12) ─────────────
  return (
    <div className="screen">
      <Header title="Confirm Deposit" back="/deposit" />
      <StepBar />
      <div className="px-4 pb-6">
        {/* Success hero */}
        <div className="bg-[#00C85510] border border-[#00C85330] rounded-xl p-6 text-center mb-4">
          <div className="flex justify-center mb-3">
            <CheckCircle size={56} className="text-[#00C853]" />
          </div>
          <h2 className="text-white font-black text-xl mb-1">Deposit Confirmation Received!</h2>
          <p className="text-[#888] text-sm">Thank you! We have received your confirmation. Your deposit is now being tracked.</p>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Status', val: 'Tracking Started', color: 'text-[#00C853]' },
            { label: 'Tracking ID', val: `#DP${depositId.slice(-8).toUpperCase()}`, color: 'text-[#1565C0]' },
            { label: 'Security', val: '100% Secure', color: 'text-[#00C853]' },
            { label: 'Updates', val: 'Real-time', color: 'text-[#00C853]' },
          ].map((item, i) => (
            <div key={i} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-2 text-center">
              <p className="text-[#555] text-[9px] mb-1">{item.label}</p>
              <p className={`text-[10px] font-bold ${item.color}`}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Deposit details */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
          <p className="text-white font-semibold text-sm mb-3">Deposit Details</p>
          {[
            { label: 'Selected Plan', val: plan.label, color: 'text-[#00C853]', sub: `(${plan.rateLabel} per day)` },
            { label: 'Deposit Amount', val: `${fmt.usd(numAmount)} USDT` },
            { label: 'Network', val: selectedNetwork === 'TRC20' ? 'TRC20 (TRON)' : 'BEP20 (BSC)' },
            { label: 'Deposit Address', val: address },
            { label: 'Transaction ID', val: txid },
            { label: 'Submitted', val: new Date().toLocaleString() },
          ].map((row, i) => (
            <div key={i} className="flex items-start justify-between py-2.5 border-b border-[#1a1a1a] last:border-0 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#555] text-xs">{row.label}</span>
              </div>
              <div className="text-right flex-1">
                <p className={`text-xs font-semibold break-all ${row.color || 'text-white'}`}>{row.val}</p>
                {row.sub && <p className="text-[#555] text-[10px]">{row.sub}</p>}
              </div>
              {(row.label === 'Deposit Address' || row.label === 'Transaction ID') && (
                <button onClick={() => { navigator.clipboard.writeText(row.val); toast.success('Copied'); }}>
                  <Copy size={13} className="text-[#555]" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* What happens next */}
        <div className="bg-[#1565C010] border border-[#1565C030] rounded-xl p-3 mb-4
                        flex items-center gap-3">
          <img src="/images/blockchain-monitor.png" alt=""
            className="w-14 h-14 object-contain shrink-0" />
          <div>
            <p className="text-[#1565C0] text-xs font-semibold">What happens next?</p>
            <p className="text-[#888] text-xs">We are monitoring the blockchain for your deposit. Once confirmed, your funds will be credited automatically.</p>
          </div>
        </div>

        {/* Tracking steps */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
          <p className="text-white font-semibold text-xs mb-3">Tracking Status</p>
          <div className="flex items-center gap-0">
            {[
              { label: 'Confirmation\nReceived', sub: 'Today', active: true },
              { label: 'Monitoring\nBlockchain', sub: 'In Progress', active: false },
              { label: 'Awaiting\nConfirmations', sub: 'Pending', active: false },
              { label: 'Deposit\nConfirmed', sub: 'Pending', active: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm
                    ${item.active ? 'border-[#00C853] bg-[#00C85520] text-[#00C853]' : 'border-[#333] text-[#555]'}`}>
                    {item.active ? '✓' : '⏳'}
                  </div>
                  <p className={`text-[9px] text-center mt-1 whitespace-pre-line leading-tight
                    ${item.active ? 'text-[#00C853]' : 'text-[#555]'}`}>{item.label}</p>
                  <p className="text-[#444] text-[9px]">{item.sub}</p>
                </div>
                {i < 3 && <div className="flex-1 h-px bg-[#1a1a1a] mx-1 mb-6" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={() => router.push('/dashboard')}
            className="flex-1 py-3.5 rounded-xl border border-[#333] text-[#888] text-sm font-semibold">
            View History
          </button>
          <button onClick={() => router.push('/dashboard')}
            className="flex-1 py-3.5 rounded-xl bg-[#00C853] text-black font-bold text-sm
                       flex items-center justify-center gap-2">
            Go to Dashboard
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
