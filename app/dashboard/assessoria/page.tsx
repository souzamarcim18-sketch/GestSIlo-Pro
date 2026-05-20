'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { AnotacaoAssessoria, AgendamentoUsuario } from '@/lib/types/assessoria';
import BlocoNotasSection from './components/BlocoNotasSection';
import CalendarioAgendamento from './components/CalendarioAgendamento';
import AgendamentosConfirmadosSection from './components/AgendamentosConfirmadosSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import Link from 'next/link';

const CONSULTOR_ID = process.env.NEXT_PUBLIC_CONSULTOR_ID || '00000000-0000-4000-8000-000000000000';

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

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, [profile?.fazenda_id]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            {/* GraduationCap emoji */}
            <span className="text-xl">👨‍🎓</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Assessoria Agronômica</h1>
            <p className="text-sm text-muted-foreground">Conecte-se com assessores agronômicos</p>
          </div>
        </div>
        <Link href="/dashboard/assessoria/admin/horarios">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Gerenciar Horários
          </Button>
        </Link>
      </div>

      <BlocoNotasSection anotacoes={anotacoes} onRefresh={loadData} />
      <CalendarioAgendamento consultorId={CONSULTOR_ID} />
      <AgendamentosConfirmadosSection agendamentos={agendamentos} onRefresh={loadData} />
    </div>
  );
}
