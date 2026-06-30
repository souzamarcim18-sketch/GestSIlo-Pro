'use server';

/**
 * Fachada de leitura do domínio Rebanho (Fase 5 — SPEC-rebanho345 §8.3).
 *
 * REGRA: consumidores EXTERNOS ao módulo rebanho (pastagens, balanço forrageiro,
 * dashboard, calendário) NÃO lêem tabelas do rebanho diretamente — passam por aqui.
 * Dentro do próprio módulo rebanho a consulta direta às suas tabelas permanece permitida.
 *
 * Contratos estáveis: as assinaturas e tipos de retorno desta fachada são o contrato
 * público; o shape interno das tabelas pode evoluir sem quebrar os consumidores.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { FATORES_UA_POR_CATEGORIA, UA_FATOR_PADRAO, type ResultadoCalculoUA } from '@/lib/types/pastagens';

// ─── Tipos estáveis da fachada ────────────────────────────────────────────────

/** Contagem de animais ativos por categoria (retorno de getDemandaAnimalPorCategoria). */
export type AnimalPorCategoriaRow = {
  categoria: string;
  quantidade: number;
};

/** Evento do rebanho normalizado para o calendário. */
export type EventoRebanhoParaCalendario = {
  id: string;
  tipo: string;
  observacoes: string | null;
  data_evento: string;
  animal_id: string | null;
  animais: { brinco?: string | null; nome?: string | null } | null;
};

/** Evento sanitário normalizado para o calendário. */
export type EventoSanitarioParaCalendario = {
  id: string;
  tipo: string;
  vacina_nome: string | null;
  observacoes: string | null;
  data_evento: string | null;
  data_proxima_dose: string | null;
  animal_id: string | null;
};

/** Dados do rebanho usados pelo dashboard principal. */
export type DadosRebanhoParaDashboard = {
  /** Animais ativos com categoria (para composição de rebanho). */
  animaisCategoria: { categoria: string | null }[];
  /** Animais ativos com tipo_rebanho (para composição leiteiro/corte). */
  animaisTipo: { tipo_rebanho: string | null }[];
  /** Lotes da fazenda. */
  lotes: { id: string; nome: string }[];
  /** Animais ativos alocados em algum lote. */
  animaisPorLote: { lote_id: string | null }[];
  /** Vacinações com próxima dose nos próximos 15 dias. */
  vacinacoes: VacinacaoAlertaRow[];
};

export type VacinacaoAlertaRow = {
  id: string;
  animal_id: string | null;
  vacina_nome: string | null;
  data_proxima_dose: string | null;
  animais: { brinco?: string | null; nome?: string | null } | null;
};

// ─── getDemandaAnimalPorCategoria ─────────────────────────────────────────────

/**
 * Retorna a contagem de animais ativos por categoria para cálculo de demanda forrageira.
 * Consumido pelo Balanço Forrageiro.
 */
export async function getDemandaAnimalPorCategoria(
  supabase: SupabaseClient<Database>,
): Promise<AnimalPorCategoriaRow[]> {
  const { data, error } = await supabase
    .from('animais')
    .select('categoria')
    .eq('status', 'Ativo')
    .is('deleted_at', null);

  if (error || !data) return [];

  const contagem = new Map<string, number>();
  for (const row of data) {
    if (!row.categoria) continue;
    contagem.set(row.categoria, (contagem.get(row.categoria) ?? 0) + 1);
  }

  return Array.from(contagem.entries()).map(([categoria, quantidade]) => ({
    categoria,
    quantidade,
  }));
}

// ─── getUAPorLote ─────────────────────────────────────────────────────────────

/**
 * Calcula UA total e UA/ha de um lote de animais, usando pesagem real (≤90 dias)
 * ou fator fixo por categoria como fallback.
 * Consumido pelo módulo de Pastagens (ocupação de piquete).
 */
export async function getUAPorLote(
  supabase: SupabaseClient<Database>,
  loteId: string,
  areaHa: number,
): Promise<ResultadoCalculoUA> {
  const { data: animais, error: animaisError } = await supabase
    .from('animais')
    .select('id, categoria')
    .eq('lote_id', loteId)
    .eq('status', 'Ativo');

  if (animaisError) throw animaisError;

  if (!animais || animais.length === 0) {
    return {
      ua_total: 0,
      ua_por_ha: null,
      peso_medio_kg: 0,
      quantidade_animais: 0,
      metodo: 'fator_categoria',
      animais_sem_pesagem: 0,
    };
  }

  const animalIds = animais.map((a) => a.id);
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 90);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];

  const { data: pesagensRaw, error: pesagensError } = await supabase
    .from('pesos_animal')
    .select('animal_id, peso_kg, data_pesagem')
    .in('animal_id', animalIds)
    .gte('data_pesagem', dataLimiteStr)
    .order('data_pesagem', { ascending: false });

  if (pesagensError) throw pesagensError;

  // Pegar a pesagem mais recente por animal
  const pesagemPorAnimal = new Map<string, number>();
  for (const p of pesagensRaw ?? []) {
    if (!pesagemPorAnimal.has(p.animal_id)) {
      pesagemPorAnimal.set(p.animal_id, Number(p.peso_kg));
    }
  }

  let uaTotal = 0;
  let pesoTotal = 0;
  let animaisSemPesagem = 0;

  for (const animal of animais) {
    const pesoReal = pesagemPorAnimal.get(animal.id);

    if (pesoReal !== undefined) {
      const ua = pesoReal / 450;
      uaTotal += ua;
      pesoTotal += pesoReal;
    } else {
      const fator = FATORES_UA_POR_CATEGORIA[animal.categoria ?? ''] ?? UA_FATOR_PADRAO;
      uaTotal += fator;
      pesoTotal += fator * 450;
      animaisSemPesagem++;
    }
  }

  const quantidade = animais.length;
  const pesoMedio = quantidade > 0 ? pesoTotal / quantidade : 0;
  const uaPorHa = areaHa > 0 ? uaTotal / areaHa : null;
  const metodo: ResultadoCalculoUA['metodo'] = animaisSemPesagem === 0 ? 'peso_real' : 'fator_categoria';

  return {
    ua_total: uaTotal,
    ua_por_ha: uaPorHa,
    peso_medio_kg: pesoMedio,
    quantidade_animais: quantidade,
    metodo,
    animais_sem_pesagem: animaisSemPesagem,
  };
}

// ─── getAlertasRebanhoParaDashboard ──────────────────────────────────────────

/**
 * Retorna os dados do rebanho necessários para o dashboard principal:
 * composição por categoria, composição por tipo, lotes, animais por lote
 * e vacinações com próxima dose próxima.
 * Consumido por app/dashboard/page.tsx.
 */
export async function getAlertasRebanhoParaDashboard(
  supabase: SupabaseClient<Database>,
  fazendaId: string,
  proximosQuinzeStr: string,
): Promise<DadosRebanhoParaDashboard> {
  const [categRes, tipoRes, lotesRes, porLoteRes, vaciRes] = await Promise.all([
    supabase
      .from('animais')
      .select('categoria')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null),
    supabase
      .from('animais')
      .select('tipo_rebanho')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null),
    supabase
      .from('lotes')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .order('nome'),
    supabase
      .from('animais')
      .select('lote_id')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null)
      .not('lote_id', 'is', null),
    supabase
      .from('eventos_sanitarios')
      .select('id, animal_id, vacina_nome, data_proxima_dose, animais(brinco, nome)')
      .eq('tipo', 'vacinacao')
      .is('deleted_at', null)
      .lte('data_proxima_dose', proximosQuinzeStr)
      .order('data_proxima_dose', { ascending: true })
      .limit(10),
  ]);

  return {
    animaisCategoria: categRes.data ?? [],
    animaisTipo: tipoRes.data ?? [],
    lotes: lotesRes.data ?? [],
    animaisPorLote: porLoteRes.data ?? [],
    vacinacoes: (vaciRes.data ?? []).map((r) => ({
      id: r.id,
      animal_id: r.animal_id,
      vacina_nome: r.vacina_nome,
      data_proxima_dose: r.data_proxima_dose,
      animais: r.animais as unknown as { brinco?: string | null; nome?: string | null } | null,
    })),
  };
}

// ─── getEventosRebanhoParaCalendario ─────────────────────────────────────────

/**
 * Retorna eventos do rebanho e sanitários em uma janela de datas,
 * já no shape esperado pelo módulo de Calendário.
 * Consumido por lib/supabase/calendario.ts.
 */
export async function getEventosRebanhoParaCalendario(
  supabase: SupabaseClient<Database>,
  dataInicio: string,
  dataFim: string,
): Promise<{
  eventosRebanho: EventoRebanhoParaCalendario[];
  eventosSanitarios: {
    passados: EventoSanitarioParaCalendario[];
    futuros: Omit<EventoSanitarioParaCalendario, 'data_evento'>[];
  };
}> {
  const hoje = new Date().toISOString().slice(0, 10);

  const [rebanhoRes, passadosRes, futurosRes] = await Promise.all([
    supabase
      .from('eventos_rebanho')
      .select('id, tipo, observacoes, data_evento, animal_id, animais(brinco, nome)')
      .gte('data_evento', dataInicio)
      .lte('data_evento', dataFim)
      .is('deleted_at', null)
      .order('data_evento'),
    supabase
      .from('eventos_sanitarios')
      .select('id, tipo, vacina_nome, observacoes, data_evento, data_proxima_dose, animal_id')
      .gte('data_evento', dataInicio)
      .lte('data_evento', dataFim)
      .order('data_evento'),
    supabase
      .from('eventos_sanitarios')
      .select('id, tipo, vacina_nome, observacoes, data_proxima_dose, animal_id')
      .gte('data_proxima_dose', dataInicio)
      .lte('data_proxima_dose', dataFim)
      .gte('data_proxima_dose', hoje)
      .order('data_proxima_dose'),
  ]);

  const eventosRebanho: EventoRebanhoParaCalendario[] = (rebanhoRes.data ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    observacoes: r.observacoes ?? null,
    data_evento: r.data_evento,
    animal_id: r.animal_id,
    animais: r.animais as unknown as { brinco?: string | null; nome?: string | null } | null,
  }));

  const passados: EventoSanitarioParaCalendario[] = (passadosRes.data ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    vacina_nome: r.vacina_nome ?? null,
    observacoes: r.observacoes ?? null,
    data_evento: r.data_evento ?? null,
    data_proxima_dose: r.data_proxima_dose ?? null,
    animal_id: r.animal_id,
  }));

  const futuros = (futurosRes.data ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    vacina_nome: r.vacina_nome ?? null,
    observacoes: r.observacoes ?? null,
    data_proxima_dose: r.data_proxima_dose ?? null,
    animal_id: r.animal_id,
  }));

  return { eventosRebanho, eventosSanitarios: { passados, futuros } };
}
