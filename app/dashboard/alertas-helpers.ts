import type { AlertaCritico, ProximaOperacaoComBadge } from './dashboard-data';

type PiqueteAlertaRow = {
  id: string;
  nome: string;
  status: string;
  ua_suportada: number | null;
  dias_descanso_ideal: number | null;
  updated_at: string | null;
  pastagens: { id: string; nome: string } | null;
  ocupacoes_piquete: { ua_real: number | null; data_entrada: string; data_saida_real: string | null }[];
};

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

export function derivarAlertasPastagens(piquetes: PiqueteAlertaRow[]): AlertaCritico[] {
  const alertas: AlertaCritico[] = [];
  const hoje = new Date().toISOString().split('T')[0];

  for (const piquete of piquetes) {
    const pastagemId = (piquete.pastagens as { id: string; nome: string } | null)?.id;
    if (!pastagemId) continue;

    const href = `/dashboard/pastagens/${pastagemId}`;
    const ocupacoes = piquete.ocupacoes_piquete ?? [];
    const ocupacaoAberta = ocupacoes.find((o) => o.data_saida_real === null) ?? null;

    // Alerta superlotação (ocupação aberta + ua_real > ua_suportada)
    if (
      ocupacaoAberta &&
      ocupacaoAberta.ua_real !== null &&
      piquete.ua_suportada !== null &&
      ocupacaoAberta.ua_real > piquete.ua_suportada
    ) {
      alertas.push({
        id: `piquete_superlotacao_${piquete.id}`,
        tipo: 'piquete_superlotacao',
        severidade: 'urgente',
        mensagem: `Superlotação — ${piquete.nome}`,
        detalhe: `Piquete com ${ocupacaoAberta.ua_real.toFixed(1)} UA/ha (suportado: ${piquete.ua_suportada.toFixed(1)} UA/ha)`,
        href,
      });
    }

    // Alerta pronto para entrada (descanso acumulado >= ideal)
    if (piquete.status === 'Descanso' && piquete.dias_descanso_ideal !== null) {
      const ultimaSaida = ocupacoes
        .filter((o) => o.data_saida_real !== null)
        .sort((a, b) => (b.data_saida_real! > a.data_saida_real! ? 1 : -1))[0]?.data_saida_real ?? null;

      if (ultimaSaida) {
        const diasDescanso = daysBetween(ultimaSaida, hoje);
        if (diasDescanso >= piquete.dias_descanso_ideal) {
          alertas.push({
            id: `piquete_pronto_entrada_${piquete.id}`,
            tipo: 'piquete_pronto_entrada',
            severidade: 'aviso',
            mensagem: `Piquete pronto — ${piquete.nome}`,
            detalhe: `${diasDescanso} dias de descanso (ideal: ${piquete.dias_descanso_ideal} dias)`,
            href,
          });
        }
      }
    }

    // Alerta reforma longa (em reforma há > 90 dias, baseado em updated_at)
    if (piquete.status === 'Em reforma' && piquete.updated_at) {
      const diasEmReforma = daysBetween(piquete.updated_at.split('T')[0], hoje);
      if (diasEmReforma > 90) {
        alertas.push({
          id: `piquete_reforma_longa_${piquete.id}`,
          tipo: 'piquete_reforma_longa',
          severidade: 'aviso',
          mensagem: `Reforma longa — ${piquete.nome}`,
          detalhe: `Em reforma há ${diasEmReforma} dias`,
          href,
        });
      }
    }
  }

  return alertas;
}
