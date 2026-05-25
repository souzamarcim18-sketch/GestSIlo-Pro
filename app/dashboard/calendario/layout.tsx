'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CalendarioLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile && profile.perfil === 'Operador') {
      router.replace('/operador');
    }
  }, [profile, router]);

  if (profile?.perfil === 'Operador') return null;
  return <>{children}</>;
}
