'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { AnotacaoAssessoria, AgendamentoUsuario } from '@/lib/types/assessoria';
import BlocoNotasSection from './components/BlocoNotasSection';
import AgendamentosConfirmadosSection from './components/AgendamentosConfirmadosSection';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssessoriaPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [anotacoes, setAnotacoes] = useState<AnotacaoAssessoria[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.perfil !== 'Administrador') {
      router.push('/dashboard');
    }
  }, [profile, router]);

  const loadData = useCallback(async () => {
    if (!profile?.fazenda_id) return;
    try {
      setIsLoading(true);
      const [anotacoesResp, agendamentosResp] = await Promise.all([
        fetch(`/api/assessoria/anotacoes?fazenda_id=${profile.fazenda_id}`),
        fetch(`/api/assessoria/agendamentos?fazenda_id=${profile.fazenda_id}`),
      ]);

      if (anotacoesResp.ok) {
        const anotacoesData = await anotacoesResp.json();
        setAnotacoes(anotacoesData);
      }

      if (agendamentosResp.ok) {
        const agendamentosData = await agendamentosResp.json();
        setAgendamentos(agendamentosData);
      }
    } catch (error) {
      console.error('[AssessoriaPage]', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.fazenda_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Assessoria Agronômica</h2>
        <p className="text-sm text-muted-foreground">Anote suas dúvidas e conecte-se com um Agrônomo para consultoria individualizada</p>
      </div>

      <BlocoNotasSection anotacoes={anotacoes} onRefresh={loadData} />
      <AgendamentosConfirmadosSection agendamentos={agendamentos} onRefresh={loadData} />
    </div>
  );
}
