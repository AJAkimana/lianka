'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, Lock } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, new_password: password });
      toast.success('Password reset successfully');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired reset link');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
      <Link href="/login" className="text-[#00C853] font-black text-xl block mb-10">L LIANKA</Link>
      <h2 className="text-2xl font-bold text-white mb-1">Set New Password</h2>
      <p className="text-[#666] text-sm mb-8">Choose a strong new password for your account.</p>
      <div className="space-y-4">
        <div>
          <label className="text-[#888] text-xs font-medium mb-1.5 block">New Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)}
            type="password" placeholder="At least 8 characters" className="input" />
        </div>
        <div>
          <label className="text-[#888] text-xs font-medium mb-1.5 block">Confirm Password</label>
          <input value={confirm} onChange={e => setConfirm(e.target.value)}
            type="password" placeholder="Confirm new password" className="input" />
        </div>
        <button onClick={handleReset} disabled={loading} className="btn-primary">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
