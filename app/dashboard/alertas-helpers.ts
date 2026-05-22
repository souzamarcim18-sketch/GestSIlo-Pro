import type { AlertaCritico, ProximaOperacaoComBadge } from './dashboard-data';

export function daysBetween(de: string, ate: string): number {
  return Math.floor(
    (new Date(ate).getTime() - new Date(de).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function formatarDataBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function derivarAlertasEtapa1(params: {
  proximasOperacoes: ProximaOperacaoComBadge[];
  autonomiaDiasNum: number | null;
  taxaPerdasNum: number | null;
}): AlertaCritico[] {
  const alertas: AlertaCritico[] = [];

  for (const [index, op] of params.proximasOperacoes.entries()) {
    if (op.status === 'Atrasado') {
      alertas.push({
        id: `operacao_atrasada_${index}`,
        tipo: 'operacao_atrasada',
        severidade: 'critico',
        mensagem: `${op.tipo_operacao} — ${op.talhao_nome}`,
        detalhe: `Previsto para ${formatarDataBR(op.data_esperada)}`,
        href: '/dashboard/talhoes',
      });
    }
  }

  if (params.autonomiaDiasNum !== null && params.autonomiaDiasNum < 30) {
    alertas.push({
      id: 'silagem_baixa_autonomia',
      tipo: 'silagem_baixa_autonomia',
      severidade: params.autonomiaDiasNum < 10 ? 'critico' : 'urgente',
      mensagem: 'Estoque de silagem crítico',
      detalhe: `Autonomia estimada: ${params.autonomiaDiasNum} dias`,
      href: '/dashboard/silos',
    });
  }

  if (params.taxaPerdasNum !== null && params.taxaPerdasNum > 10) {
    alertas.push({
      id: 'silagem_perdas_elevadas',
      tipo: 'silagem_perdas_elevadas',
      severidade: params.taxaPerdasNum > 20 ? 'critico' : 'urgente',
      mensagem: 'Taxa de perdas de silagem elevada',
      detalhe: `${params.taxaPerdasNum.toFixed(1)}% dos últimos 30 dias`,
      href: '/dashboard/silos',
    });
  }

  return alertas;
}
