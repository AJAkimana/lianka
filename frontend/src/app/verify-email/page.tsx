'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { VerifyEmailPage } from '../(auth)/auth-screens';

function VerifyEmailInner() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  return <VerifyEmailPage email={email} />;
}

export default function VerifyEmailRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
