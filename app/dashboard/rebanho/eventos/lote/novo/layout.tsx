'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export default function LoteEventosLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.perfil !== 'Administrador') {
      toast.error('Acesso restrito a Administradores.');
      router.replace('/dashboard/rebanho');
    }
  }, [loading, profile, router]);

  if (loading || profile?.perfil !== 'Administrador') return null;
  return <>{children}</>;
}
