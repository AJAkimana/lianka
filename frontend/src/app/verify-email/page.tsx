'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { VerifyEmailPage } from '../(auth)/auth-screens';
import { authAPI } from '@/lib/api';

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const [verifying, setVerifying] = useState(Boolean(token));
  const [tokenFailed, setTokenFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!token || tokenFailed) return;

    setVerifying(true);
    authAPI
      .verifyEmail({ token })
      .then(() => {
        if (!mounted) return;
        router.replace('/account-created');
      })
      .catch(() => {
        if (!mounted) return;
        setTokenFailed(true);
      })
      .finally(() => {
        if (!mounted) return;
        setVerifying(false);
      });

    return () => {
      mounted = false;
    };
  }, [router, token, tokenFailed]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#888] text-sm">Verifying your email...</p>
      </div>
    );
  }

  if (token && tokenFailed) {
    return <VerifyEmailPage email={email} />;
  }
  return <VerifyEmailPage email={email} />;
}

export default function VerifyEmailRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
