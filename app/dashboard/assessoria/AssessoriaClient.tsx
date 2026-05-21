'use client';

import { useRouter } from 'next/navigation';
import { AnotacaoAssessoria, AgendamentoUsuario } from '@/lib/types/assessoria';
import BlocoNotasSection from './components/BlocoNotasSection';
import AgendamentosConfirmadosSection from './components/AgendamentosConfirmadosSection';

interface Props {
  initialAnotacoes: AnotacaoAssessoria[];
  initialAgendamentos: AgendamentoUsuario[];
}

export function AssessoriaClient({ initialAnotacoes, initialAgendamentos }: Props) {
  const router = useRouter();

  const handleRefresh = async () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Assessoria Agronômica</h2>
        <p className="text-sm text-muted-foreground">Anote suas dúvidas e conecte-se com um Agrônomo para consultoria individualizada</p>
      </div>

      <BlocoNotasSection anotacoes={initialAnotacoes} onRefresh={handleRefresh} />
      <AgendamentosConfirmadosSection agendamentos={initialAgendamentos} onRefresh={handleRefresh} />
    </div>
  );
}
