// Agregador puro de pendências da "Operação do dia" (Fase 3 — P3.1).
//
// Função pura, sem dependências de servidor, testável isoladamente. Recebe os
// alertas crus (já calculados por sanidade/indicadores) e produz a lista
// priorizada e classificada por subdomínio, criticidade, categoria e lote.
//
// NÃO inventa regra de negócio nova: as condições de cada alerta já foram
// decididas pelas queries de origem. Aqui só classificamos e priorizamos.

import type { AlertaSanitario } from '@/lib/types/rebanho-sanitario';
import type { AlertaAnimal } from '@/lib/supabase/rebanho-indicadores';
import type {
  Pendencia,
  GrupoPendencia,
  ResumoOperacaoDia,
  SubdominioPendencia,
  CriticidadePendencia,
  TipoPendencia,
  ResumoPorCategoria,
} from '@/lib/types/rebanho-pendencias';

export interface EntradasPendencias {
  vacinacoes: AlertaSanitario[];
  partosPrevistos: AlertaAnimal[];
  vacasSecas: AlertaAnimal[];
  semPesagem: AlertaAnimal[];
}

const PESO_CRITICIDADE: Record<CriticidadePendencia, number> = {
  critico: 0,
  urgente: 1,
  aviso: 2,
};

const TITULO_GRUPO: Record<TipoPendencia, string> = {
  vacinacao_vencida: 'Vacinações vencidas',
  vacinacao_proxima: 'Vacinações próximas',
  parto_proximo: 'Partos próximos',
  vaca_a_secar: 'Vacas a secar',
  pesagem_atrasada: 'Pesagens atrasadas',
};

const SUBDOMINIO_GRUPO: Record<TipoPendencia, SubdominioPendencia> = {
  vacinacao_vencida: 'sanidade',
  vacinacao_proxima: 'sanidade',
  parto_proximo: 'reproducao',
  vaca_a_secar: 'reproducao',
  pesagem_atrasada: 'desempenho',
};

// Ordem de exibição dos grupos (mais acionável/urgente primeiro).
const ORDEM_GRUPOS: TipoPendencia[] = [
  'vacinacao_vencida',
  'parto_proximo',
  'vaca_a_secar',
  'vacinacao_proxima',
  'pesagem_atrasada',
];

/** Dias entre hoje e uma data ISO (YYYY-MM-DD); negativo = passado. */
function diasAte(dataIso: string | null | undefined): number | null {
  if (!dataIso) return null;
  const alvo = new Date(`${dataIso}T00:00:00`);
  if (isNaN(alvo.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function pendenciaVacinacao(a: AlertaSanitario): Pendencia {
  const vencida = a.dias_para_vencimento < 0;
  const tipo: TipoPendencia = vencida ? 'vacinacao_vencida' : 'vacinacao_proxima';
  return {
    id: `${tipo}:${a.animal_id}`,
    tipo,
    subdominio: 'sanidade',
    criticidade: vencida ? 'critico' : 'urgente',
    animal_id: a.animal_id,
    animal_brinco: a.animal_brinco,
    animal_nome: a.animal_nome,
    categoria: null,
    lote_id: null,
    motivo: vencida
      ? `Vacinação ${a.vacina_nome} vencida há ${Math.abs(a.dias_para_vencimento)} dia(s)`
      : `Vacinação ${a.vacina_nome} vence em ${a.dias_para_vencimento} dia(s)`,
    acaoSugerida: 'Registrar vacinação',
    href: '/dashboard/rebanho/sanidade',
    diasParaVencimento: a.dias_para_vencimento,
  };
}

function pendenciaParto(a: AlertaAnimal): Pendencia {
  const dias = diasAte(a.data_parto_previsto);
  return {
    id: `parto_proximo:${a.id}`,
    tipo: 'parto_proximo',
    subdominio: 'reproducao',
    criticidade: dias != null && dias <= 7 ? 'critico' : 'urgente',
    animal_id: a.id,
    animal_brinco: a.brinco,
    animal_nome: a.nome,
    categoria: a.categoria,
    lote_id: a.lote_id,
    motivo:
      dias != null
        ? `Parto previsto em ${dias} dia(s)`
        : 'Parto previsto em breve',
    acaoSugerida: 'Acompanhar / registrar parto',
    href: `/dashboard/rebanho/${a.id}/evento`,
    diasParaVencimento: dias,
  };
}

function pendenciaVacaSecar(a: AlertaAnimal): Pendencia {
  const dias = diasAte(a.data_parto_previsto);
  return {
    id: `vaca_a_secar:${a.id}`,
    tipo: 'vaca_a_secar',
    subdominio: 'reproducao',
    criticidade: 'urgente',
    animal_id: a.id,
    animal_brinco: a.brinco,
    animal_nome: a.nome,
    categoria: a.categoria,
    lote_id: a.lote_id,
    motivo:
      dias != null
        ? `Vaca seca com parto em ${dias} dia(s) — preparar secagem`
        : 'Vaca seca com parto próximo — preparar secagem',
    acaoSugerida: 'Registrar secagem',
    href: `/dashboard/rebanho/${a.id}/evento`,
    diasParaVencimento: dias,
  };
}

function pendenciaPesagem(a: AlertaAnimal): Pendencia {
  return {
    id: `pesagem_atrasada:${a.id}`,
    tipo: 'pesagem_atrasada',
    subdominio: 'desempenho',
    criticidade: 'aviso',
    animal_id: a.id,
    animal_brinco: a.brinco,
    animal_nome: a.nome,
    categoria: a.categoria,
    lote_id: a.lote_id,
    motivo: 'Sem pesagem há mais de 60 dias',
    acaoSugerida: 'Registrar pesagem',
    href: `/dashboard/rebanho/${a.id}/evento`,
    diasParaVencimento: null,
  };
}

/**
 * Ordena pendências por criticidade e, dentro da mesma criticidade, pelo prazo
 * (mais vencido/mais próximo primeiro). Pendências sem prazo vão ao fim do grupo.
 */
function ordenarPendencias(a: Pendencia, b: Pendencia): number {
  const critDiff = PESO_CRITICIDADE[a.criticidade] - PESO_CRITICIDADE[b.criticidade];
  if (critDiff !== 0) return critDiff;
  const da = a.diasParaVencimento;
  const db = b.diasParaVencimento;
  if (da == null && db == null) return 0;
  if (da == null) return 1;
  if (db == null) return -1;
  return da - db;
}

/**
 * Constrói o resumo da Operação do dia a partir dos alertas crus.
 * Pura e determinística — base dos testes unitários (smoke 12.5 da SPEC).
 */
export function montarPendencias(
  entradas: EntradasPendencias
): ResumoOperacaoDia {
  const pendencias: Pendencia[] = [
    ...entradas.vacinacoes.map(pendenciaVacinacao),
    ...entradas.partosPrevistos.map(pendenciaParto),
    ...entradas.vacasSecas.map(pendenciaVacaSecar),
    ...entradas.semPesagem.map(pendenciaPesagem),
  ].sort(ordenarPendencias);

  // Grupos acionáveis na ordem definida.
  const grupos: GrupoPendencia[] = ORDEM_GRUPOS.map((tipo) => ({
    tipo,
    titulo: TITULO_GRUPO[tipo],
    subdominio: SUBDOMINIO_GRUPO[tipo],
    itens: pendencias.filter((p) => p.tipo === tipo),
  })).filter((g) => g.itens.length > 0);

  // Totais por subdomínio.
  const totaisPorSubdominio: Record<SubdominioPendencia, number> = {
    reproducao: 0,
    sanidade: 0,
    desempenho: 0,
    manejo: 0,
  };
  for (const p of pendencias) {
    totaisPorSubdominio[p.subdominio] += 1;
  }

  // Totais por categoria animal (ignora pendências sem categoria conhecida).
  const mapaCategoria = new Map<string, number>();
  for (const p of pendencias) {
    if (!p.categoria) continue;
    mapaCategoria.set(p.categoria, (mapaCategoria.get(p.categoria) ?? 0) + 1);
  }
  const totaisPorCategoria: ResumoPorCategoria[] = Array.from(
    mapaCategoria.entries()
  )
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);

  return {
    pendencias,
    grupos,
    totaisPorSubdominio,
    totaisPorCategoria,
    total: pendencias.length,
  };
}
