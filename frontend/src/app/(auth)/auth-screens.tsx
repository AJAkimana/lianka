'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield, Loader2, CheckCircle, Globe } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// SCREEN 01 — Landing / Welcome  (matches design exactly)
// ═══════════════════════════════════════════════════════════
export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col pb-8 relative overflow-hidden">
      {/* Globe background image — full screen */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/globe-bg.png"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* All content above background */}
      <div className="relative z-10 flex flex-col min-h-screen px-6">
        {/* Language selector */}
        <div className="flex justify-end pt-6 pb-2">
          <button className="flex items-center gap-1.5 text-[#888] text-xs border border-[#ffffff20] rounded-full px-3 py-1.5 bg-black/30 backdrop-blur-sm">
            <Globe size={12} />
            English
            <span className="text-[#555]">▾</span>
          </button>
        </div>

        {/* Logo + tagline */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[#00C853] opacity-20 blur-2xl scale-150" />
            <div
              className="relative w-24 h-24 rounded-2xl bg-black/60 border border-[#00C85360]
                            flex items-center justify-center backdrop-blur-sm"
            >
              <span className="text-[#00C853] font-black text-5xl leading-none">
                L
              </span>
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-widest mb-3">
            LIANKA
          </h1>
          <p className="text-[#00C853] font-bold text-xl mb-0.5">
            Intelligent Capital.
          </p>
          <p className="text-[#00C853] font-bold text-xl mb-2">
            Sustainable Growth.
          </p>
          <p className="text-[#aaa] text-sm">Built for the long run.</p>

          {/* 4-feature icons — using real generated image */}
          <div className="mt-10 w-full">
            <img
              src="/images/feature-icons.png"
              alt="Features"
              className="w-full max-w-[320px] mx-auto"
            />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                'Secure & Safe',
                'Profitable',
                'Sustainable',
                '24/7 Support',
              ].map((label, i) => (
                <p
                  key={i}
                  className="text-white text-[10px] font-bold text-center"
                >
                  {label}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl
                       bg-[#00C853] text-black font-bold text-base"
          >
            <span>👤</span> Create Account
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl
                       border border-[#ffffff30] text-white font-bold text-sm
                       bg-black/30 backdrop-blur-sm hover:border-[#ffffff50] transition-colors"
          >
            <span>→</span> Login
          </Link>

          <div className="flex items-center gap-3 bg-black/40 border border-[#ffffff15] rounded-xl p-3 mt-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full bg-[#00C85530] flex items-center justify-center shrink-0">
              <Shield size={16} className="text-[#00C853]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">
                Trusted by thousands of investors worldwide
              </p>
              <p className="text-[#aaa] text-[10px]">
                Transparent • Reliable • Built on Trust
              </p>
            </div>
          </div>

          <p className="text-[#888] text-[11px] text-center flex items-center justify-center gap-1.5">
            🔒 Lianka is <span className="text-[#00C853]">encrypted</span> and
            your data is protected.
          </p>
          <p className="text-[#555] text-[10px] text-center">
            © 2024 Lianka. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 02 — Register  (Confirm Password + strength meter)
// ═══════════════════════════════════════════════════════════
export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const password = watch('password', '');

  // Password strength rules
  const rules = [
    { label: 'Min. 8 chars', ok: password.length >= 8 },
    { label: '1 uppercase', ok: /[A-Z]/.test(password) },
    { label: '1 number', ok: /[0-9]/.test(password) },
    { label: '1 special', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = rules.filter((r) => r.ok).length;

  const onSubmit = async (data: any) => {
    if (data.password !== data.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        referral_code: data.referral_code,
      });
      toast.success('Account created! Check your email.');
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 pb-10">
      <div className="flex items-center justify-between pt-6 mb-6">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-[#00C853] font-black text-2xl">L</span>
          <span className="text-white font-bold text-sm tracking-widest">
            LIANKA
          </span>
        </Link>
        <Link href="/login" className="text-[#00C853] text-sm font-semibold">
          Login
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">
            Create Account
          </h2>
          <p className="text-[#666] text-sm">
            Join Lianka and start your investment journey.
          </p>
        </div>
        {/* Real wallet+shield graphic */}
        <img
          src="/images/register-graphic.png"
          alt="Secure Account"
          className="w-20 h-20 object-contain shrink-0"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="text-white text-sm font-semibold mb-1.5 block">
            Email Address
          </label>
          <div className="relative">
            <input
              {...register('email', { required: true })}
              type="email"
              placeholder="Enter your email address"
              className="input pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
              ✉
            </span>
          </div>
          <p className="text-[#555] text-[11px] mt-1 flex items-center gap-1">
            <span className="text-[#00C853]">✓</span> We will send a
            verification code to this email address.
          </p>
        </div>

        {/* Password */}
        <div>
          <label className="text-white text-sm font-semibold mb-1.5 block">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password', { required: true, minLength: 8 })}
              type={showPass ? 'text' : 'password'}
              placeholder="Create a strong password"
              className="input pl-10 pr-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
              🔒
            </span>
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Strength checklist matching design */}
          <div className="flex gap-3 mt-2 flex-wrap">
            {rules.map((r, i) => (
              <span
                key={i}
                className={`text-[11px] flex items-center gap-1 ${r.ok ? 'text-[#00C853]' : 'text-[#555]'}`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px]
                  ${r.ok ? 'border-[#00C853] bg-[#00C85330] text-[#00C853]' : 'border-[#333]'}`}
                >
                  {r.ok ? '✓' : ''}
                </span>
                {r.label}
              </span>
            ))}
          </div>
        </div>

        {/* Confirm Password — missing in old code */}
        <div>
          <label className="text-white text-sm font-semibold mb-1.5 block">
            Confirm Password
          </label>
          <div className="relative">
            <input
              {...register('confirm_password', { required: true })}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm your password"
              className="input pl-10 pr-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
              🔒
            </span>
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[#555] text-[11px] mt-1">Passwords must match.</p>
        </div>

        {/* Referral Code */}
        <div>
          <label className="text-white text-sm font-semibold mb-1.5 block">
            Referral Code{' '}
            <span className="text-[#555] font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              {...register('referral_code')}
              placeholder="Enter referral code (optional)"
              className="input pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
              👤
            </span>
          </div>
          <p className="text-[#555] text-[11px] mt-1">
            You will receive benefits when you use a referral code.
          </p>
          {/* Why referral code info box */}
          <div
            className="mt-2 bg-[#1565C010] border border-[#1565C030] rounded-xl p-3
                          flex items-start gap-2"
          >
            <span className="text-[#1565C0] shrink-0">ℹ</span>
            <div>
              <p className="text-[#1565C0] text-xs font-semibold">
                Why referral code?
              </p>
              <p className="text-[#888] text-[11px]">
                You get special bonuses and rewards when you join using a
                referral code.
              </p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2 pt-1">
          <input
            {...register('terms', { required: true })}
            type="checkbox"
            className="mt-0.5 accent-[#00C853] w-4 h-4"
          />
          <p className="text-[#888] text-xs">
            I agree to the{' '}
            <span className="text-[#00C853]">Terms of Service</span> and{' '}
            <span className="text-[#00C853]">Privacy Policy</span>
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || strength < 3}
          className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-base
                     flex items-center justify-center gap-2 mt-2
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <span>👤</span>
          )}
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="text-[#444] text-[11px] text-center flex items-center justify-center gap-1.5">
          <Shield size={11} className="text-[#00C853]" />
          Your data is protected with 256-bit SSL encryption.
        </p>
        <p className="text-[#333] text-[10px] text-center">
          © 2024 Lianka. All rights reserved.
        </p>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 03 — Email Verification  (OTP + resend countdown)
// ═══════════════════════════════════════════════════════════
export function VerifyEmailPage({ email }: { email: string }) {
  const router = useRouter();
  const [token, setTokenDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleInput = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...token];
    next[i] = val;
    setTokenDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !token[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (pasted.length === 6) {
      setTokenDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = token.join('');
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyEmail({ code });
      router.push('/account-created');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired code');
      setTokenDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.resendVerification(email);
      toast.success('Verification email resent');
      setCountdown(45);
      setCanResend(false);
    } catch {
      toast.error('Failed to resend');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 pb-10">
      {/* Step indicator matching design */}
      <div className="pt-6 mb-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-[#00C853] font-black text-xl">L</span>
            <span className="text-white font-bold text-sm">LIANKA</span>
          </Link>
          <span className="text-white font-bold text-sm">
            Email Verification
          </span>
        </div>
        {/* 4-step progress bar */}
        <div className="flex items-center gap-1 mt-4">
          {['Create Account', 'Verify Email', 'Set Security', 'Complete'].map(
            (s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div
                  className={`flex items-center gap-1 ${i === 0 || i === 1 ? 'text-[#00C853]' : 'text-[#555]'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
                  ${
                    i <= 1
                      ? 'bg-[#00C853] border-[#00C853] text-black'
                      : i === 2
                        ? 'border-white text-white'
                        : 'border-[#333] text-[#555]'
                  }`}
                  >
                    {i <= 1 ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[9px] font-medium hidden sm:block
                  ${i <= 1 ? 'text-[#00C853]' : i === 2 ? 'text-white' : 'text-[#555]'}`}
                  >
                    {s}
                  </span>
                </div>
                {i < 3 && (
                  <div
                    className={`flex-1 h-px mx-1 ${i < 1 ? 'bg-[#00C853]' : '#333'}`}
                  />
                )}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Email icon */}
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-full bg-[#00C85515] border-2 border-[#00C85330]
                        flex items-center justify-center"
        >
          <span className="text-4xl">✉️</span>
        </div>
      </div>

      <h2 className="text-2xl font-black text-white text-center mb-1">
        Verify Your Email
      </h2>
      <p className="text-[#888] text-sm text-center mb-1">
        We've sent a 6-digit verification code to
      </p>
      <p className="text-[#00C853] font-semibold text-sm text-center mb-2">
        {email}
      </p>
      <p className="text-[#666] text-xs text-center mb-6">
        Please enter the code below to verify your email address.
      </p>

      {/* 6-digit OTP input */}
      <div className="flex gap-2.5 justify-center mb-3" onPaste={handlePaste}>
        {token.map((val, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-14 text-center text-2xl font-bold text-white rounded-xl
                       border-2 bg-[#111] outline-none transition-colors
                       ${val ? 'border-[#00C853]' : 'border-[#222] focus:border-[#00C853]'}`}
          />
        ))}
      </div>

      <p className="text-[#00C853] text-xs text-center flex items-center justify-center gap-1 mb-6">
        <Shield size={12} /> Secure verification
      </p>

      {/* Resend box */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 flex items-center justify-between mb-6">
        <div>
          <p className="text-white text-xs font-semibold">
            Didn't receive the code?
          </p>
          <p className="text-[#555] text-[11px]">
            Check your spam folder or resend the code.
          </p>
        </div>
        <div className="text-right shrink-0">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-[#00C853] text-xs font-bold"
            >
              Resend
            </button>
          ) : (
            <div>
              <p className="text-[#555] text-[10px]">Resend code in</p>
              <p className="text-[#00C853] font-bold text-sm">
                00:{String(countdown).padStart(2, '0')}
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleVerify}
        disabled={loading || token.join('').length < 6}
        className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-base
                   flex items-center justify-center gap-2 mb-4
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Shield size={18} />
        )}
        {loading ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className="border border-[#1a1a1a] rounded-xl p-3 flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push('/register')}
          className="flex-1 flex items-center gap-2 text-[#888] text-xs"
        >
          ✉ Change Email Address
        </button>
        <span className="text-[#333]">›</span>
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#00C85520] flex items-center justify-center shrink-0">
          <Shield size={18} className="text-[#00C853]" />
        </div>
        <div>
          <p className="text-white text-xs font-semibold">
            Your security is our priority
          </p>
          <p className="text-[#555] text-[11px]">
            All verification codes are encrypted and valid for a limited time
            only.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCREEN 04 — Account Created Successfully  (NEW — was missing)
// ═══════════════════════════════════════════════════════════
export function AccountCreatedPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between pt-6 mb-6">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-[#00C853] font-black text-xl">L</span>
          <span className="text-white font-bold text-sm">LIANKA</span>
        </Link>
        <span className="text-white font-bold text-sm">Account Created</span>
      </div>

      {/* 4-step progress — all complete */}
      <div className="flex items-center gap-1 mb-8">
        {['Create Account', 'Verify Email', 'Set Security', 'Complete'].map(
          (s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-1">
                <div
                  className="w-6 h-6 rounded-full bg-[#00C853] border border-[#00C853]
                              flex items-center justify-center text-[10px] font-bold text-black"
                >
                  ✓
                </div>
              </div>
              {i < 3 && <div className="flex-1 h-px mx-1 bg-[#00C853]" />}
            </div>
          ),
        )}
      </div>

      {/* Success animation */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#00C853] opacity-10 blur-xl scale-150 animate-pulse" />
          <div
            className="relative w-32 h-32 rounded-full bg-[#00C85520] border-2 border-[#00C853]
                          flex items-center justify-center"
          >
            <CheckCircle size={60} className="text-[#00C853]" />
          </div>
        </div>
      </div>

      <h2 className="text-3xl font-black text-white text-center mb-1">
        Account Created
      </h2>
      <p className="text-[#00C853] font-bold text-2xl text-center mb-4">
        Successfully!
      </p>
      <p className="text-[#888] text-sm text-center mb-1">
        Welcome to Lianka! Your account is now ready and secure.
      </p>
      <p className="text-[#666] text-sm text-center mb-8">
        You're one step closer to building{' '}
        <span className="text-[#00C853]">intelligent capital.</span>
      </p>

      {/* 3-col status */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 grid grid-cols-3 gap-3 mb-6">
        {[
          {
            icon: '👤',
            label: 'Account Status',
            value: 'Active',
            color: 'text-[#00C853]',
          },
          {
            icon: '🛡',
            label: 'Security',
            value: 'Enabled',
            color: 'text-[#00C853]',
          },
          {
            icon: '📈',
            label: 'Your Journey',
            value: 'Just Started',
            color: 'text-[#00C853]',
          },
        ].map((item, i) => (
          <div
            key={i}
            className={`text-center ${i === 1 ? 'border-x border-[#222]' : ''}`}
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-[#666] text-[10px] mb-0.5">{item.label}</p>
            <p className={`text-xs font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* What's next box */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#00C85520] flex items-center justify-center shrink-0">
          🎁
        </div>
        <div>
          <p className="text-white text-sm font-semibold">What's Next?</p>
          <p className="text-[#666] text-xs">
            Explore our investment plans, make your first deposit, and start
            growing with Lianka.
          </p>
        </div>
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-base
                   flex items-center justify-center gap-2 mb-4"
      >
        <span>📈</span> Go to Dashboard <span>›</span>
      </button>

      <p className="text-[#444] text-[11px] text-center flex items-center justify-center gap-1.5 mb-4">
        🔒 Your data is <span className="text-[#00C853]">encrypted</span> and
        100% secure.
      </p>

      {/* Earth footer strip matching Screen 04 design */}
      <div className="mx-0 -mx-6 overflow-hidden rounded-b-none">
        <img
          src="/images/earth-footer.png"
          alt=""
          className="w-full h-28 object-cover object-top opacity-80"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Login Page
// ═══════════════════════════════════════════════════════════
export function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [savedPassword, setSavedPassword] = useState('');
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = needs2FA
        ? { email: savedEmail, password: savedPassword, totp_code: totpCode }
        : data;
      if (!needs2FA) {
        setSavedEmail(data.email);
        setSavedPassword(data.password);
      }
      const res = await authAPI.login(payload);
      if (res.data.requires_2fa) {
        setNeeds2FA(true);
        toast('Enter your 6-digit 2FA code');
        return;
      }
      setToken(res.data.access_token);
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 pb-10">
      <div className="flex items-center justify-between pt-6 mb-8">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-[#00C853] font-black text-2xl">L</span>
          <span className="text-white font-bold text-sm tracking-widest">
            LIANKA
          </span>
        </Link>
        <Link href="/register" className="text-[#00C853] text-sm font-semibold">
          Create Account
        </Link>
      </div>

      <h2 className="text-2xl font-black text-white mb-1">Welcome Back</h2>
      <p className="text-[#666] text-sm mb-8">Sign in to your Lianka account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-white text-sm font-semibold mb-1.5 block">
            Email Address
          </label>
          <div className="relative">
            <input
              {...register('email', { required: true })}
              type="email"
              placeholder="Enter your email"
              className="input pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
              ✉
            </span>
          </div>
        </div>
        <div>
          <label className="text-white text-sm font-semibold mb-1.5 block">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password', { required: true })}
              type={showPass ? 'text' : 'password'}
              placeholder="Enter your password"
              className="input pl-10 pr-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
              🔒
            </span>
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {needs2FA && (
          <div>
            <label className="text-white text-sm font-semibold mb-1.5 block">
              2FA Code
            </label>
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="Enter 6-digit authenticator code"
              className="input text-center text-xl tracking-widest font-bold"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[#555] text-xs hover:text-[#00C853]"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-[#00C853] text-black font-bold text-base
                     flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
