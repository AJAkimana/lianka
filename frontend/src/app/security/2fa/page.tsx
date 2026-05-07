'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, userAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Header, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { Shield, QrCode, Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function TwoFAPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [user, setUser] = useState<any>(null);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [step, setStep] = useState<'idle' | 'setup' | 'done'>('idle');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    userAPI.getMe().then(r => { setUser(r.data); setLoading(false); });
  }, [token]);

  const startSetup = async () => {
    try {
      const res = await authAPI.setup2FA();
      setQrCode(res.data.qr_code);
      setSecret(res.data.secret);
      setStep('setup');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const verifyEnable = async () => {
    if (!code || code.length !== 6) { toast.error('Enter 6-digit code'); return; }
    setVerifying(true);
    try {
      await authAPI.verify2FA(code);
      toast.success('2FA enabled successfully');
      setStep('done');
      setUser((u: any) => ({ ...u, two_fa_enabled: true }));
    } catch (err: any) { toast.error(err.response?.data?.message || 'Invalid code'); }
    finally { setVerifying(false); }
  };

  const disable2FA = async () => {
    if (!code || code.length !== 6) { toast.error('Enter your 2FA code to disable'); return; }
    setDisabling(true);
    try {
      await authAPI.disable2FA(code);
      toast.success('2FA disabled');
      setUser((u: any) => ({ ...u, two_fa_enabled: false }));
      setCode('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Invalid code'); }
    finally { setDisabling(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;

  return (
    <div className="screen">
      <Header title="2FA Security" back="/profile" />
      <div className="px-4 py-4">
        {/* Status */}
        <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 border ${
          user?.two_fa_enabled
            ? 'bg-[#00C85310] border-[#00C85330]'
            : 'bg-[#F9A82510] border-[#F9A82530]'
        }`}>
          <Shield size={24} className={user?.two_fa_enabled ? 'text-[#00C853]' : 'text-[#F9A825]'} />
          <div>
            <p className={`font-bold text-sm ${user?.two_fa_enabled ? 'text-[#00C853]' : 'text-[#F9A825]'}`}>
              2FA is {user?.two_fa_enabled ? 'ENABLED' : 'DISABLED'}
            </p>
            <p className="text-[#888] text-xs">
              {user?.two_fa_enabled
                ? 'Your account has an extra layer of protection'
                : 'Enable 2FA to protect your account'}
            </p>
          </div>
        </div>

        {!user?.two_fa_enabled ? (
          <>
            {step === 'idle' && (
              <>
                <div className="card mb-6">
                  <p className="text-white font-semibold mb-3">How it works</p>
                  {[
                    'Download an authenticator app (Google Authenticator, Authy)',
                    'Scan the QR code shown in the next step',
                    'Enter the 6-digit code to confirm setup',
                    'Every login will require this code going forward',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                      <div className="w-6 h-6 rounded-full bg-[#00C85520] text-[#00C853]
                                      text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-[#888] text-sm">{s}</p>
                    </div>
                  ))}
                </div>
                <button onClick={startSetup} className="btn-primary">
                  <QrCode size={18} /> Set Up 2FA
                </button>
              </>
            )}
            {step === 'setup' && (
              <>
                <div className="card mb-4 flex flex-col items-center">
                  <p className="text-white font-semibold mb-3 text-center">Scan QR Code</p>
                  {qrCode && (
                    <img src={qrCode} alt="2FA QR Code"
                      className="w-48 h-48 rounded-xl border border-[#222] mb-3" />
                  )}
                  <p className="text-[#666] text-xs text-center mb-2">Or enter this key manually:</p>
                  <div className="bg-[#0f0f0f] rounded-lg px-4 py-2 w-full text-center">
                    <p className="text-[#00C853] font-mono text-sm tracking-widest break-all">{secret}</p>
                  </div>
                </div>
                <div className="card mb-4">
                  <label className="text-[#888] text-xs mb-2 block">Enter code from authenticator app</label>
                  <input value={code} onChange={e => setCode(e.target.value)}
                    placeholder="Enter 6-digit code" maxLength={6} inputMode="numeric"
                    className="input text-center text-xl tracking-widest font-bold" />
                </div>
                <button onClick={verifyEnable} disabled={verifying} className="btn-primary">
                  {verifying ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {verifying ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </>
            )}
            {step === 'done' && (
              <div className="text-center py-8">
                <CheckCircle size={60} className="text-[#00C853] mx-auto mb-4" />
                <p className="text-white font-bold text-xl mb-2">2FA Enabled!</p>
                <p className="text-[#666] text-sm mb-6">Your account is now protected with two-factor authentication.</p>
                <button onClick={() => router.push('/profile')} className="btn-primary">Back to Profile</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card mb-4">
              <p className="text-white font-semibold mb-1">Disable 2FA</p>
              <p className="text-[#666] text-xs mb-4">Enter your current 2FA code to disable two-factor authentication.</p>
              <input value={code} onChange={e => setCode(e.target.value)}
                placeholder="Enter 6-digit code" maxLength={6} inputMode="numeric"
                className="input text-center text-xl tracking-widest font-bold" />
            </div>
            <button onClick={disable2FA} disabled={disabling} className="btn-danger">
              {disabling ? <Loader2 size={18} className="animate-spin" /> : null}
              {disabling ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
