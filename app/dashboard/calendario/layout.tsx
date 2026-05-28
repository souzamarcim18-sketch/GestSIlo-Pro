'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function CalendarioLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.perfil === 'Operador') {
      toast.error('Acesso não permitido.');
      router.replace('/operador');
    }
  }, [loading, profile, router]);

  if (loading || profile?.perfil === 'Operador') return null;
  return <>{children}</>;
}
