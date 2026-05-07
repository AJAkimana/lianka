'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await authAPI.requestReset(email);
      setSent(true);
    } catch { toast.error('Failed to send reset email'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
      <Link href="/login" className="text-[#00C853] font-black text-xl block mb-10">L LIANKA</Link>

      {sent ? (
        <div className="text-center mt-20">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-white font-bold text-xl mb-2">Check Your Email</h2>
          <p className="text-[#666] text-sm">
            If that email exists, a reset link has been sent. Check your inbox and spam folder.
          </p>
          <Link href="/login" className="mt-8 block text-[#00C853] text-sm font-medium">Back to Login</Link>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-white mb-1">Forgot Password</h2>
          <p className="text-[#666] text-sm mb-8">Enter your email to receive a reset link.</p>
          <div className="space-y-4">
            <div>
              <label className="text-[#888] text-xs font-medium mb-1.5 block">Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="Enter your email" className="input" />
            </div>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <Link href="/login" className="block text-center text-[#555] text-sm hover:text-white">
              Back to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
