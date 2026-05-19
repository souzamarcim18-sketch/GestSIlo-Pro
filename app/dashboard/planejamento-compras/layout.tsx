'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export default function PlanejamentoComprasLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.perfil === 'Operador') {
      toast.error('Acesso negado. Módulo Planejamento de Compras não está disponível para Operadores.');
      router.replace('/dashboard');
    }
  }, [loading, profile, router]);

  if (loading) return null;
  if (profile?.perfil === 'Operador') return null;

  return <>{children}</>;
}
