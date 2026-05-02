'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RevisaoQuestionarioRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return <div style={{ padding: '2rem' }}>Redirecionando para o painel...</div>;
}
