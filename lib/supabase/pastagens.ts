'use server';

import { createSupabaseServerClient } from './server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { daysBetween } from '@/lib/utils';
import {
  type Pastagem,
  type Piquete,
  type PastagemComResumo,
  type PiqueteComOcupacaoAtual,
  type OcupacaoPiqueteComLote,
  type EventoManejoComJoins,
  type ResultadoCalculoUA,
  FATORES_UA_POR_CATEGORIA,
  UA_FATOR_PADRAO,
} from '@/lib/types/pastagens';

type PastagemInsert = Omit<Database['public']['Tables']['pastagens']['Insert'], 'id' | 'fazenda_id' | 'created_at' | 'updated_at'>;
type PastagemUpdate = Omit<Database['public']['Tables']['pastagens']['Update'], 'id' | 'fazenda_id' | 'created_at'>;

type PiqueteInsert = Omit<Database['public']['Tables']['piquetes']['Insert'], 'id' | 'fazenda_id' | 'created_at' | 'updated_at'>;
type PiqueteUpdate = Omit<Database['public']['Tables']['piquetes']['Update'], 'id' | 'fazenda_id' | 'created_at'>;

type OcupacaoInsert = Omit<Database['public']['Tables']['ocupacoes_piquete']['Insert'], 'id' | 'fazenda_id' | 'created_at' | 'created_by'>;
type OcupacaoUpdate = Omit<Database['public']['Tables']['ocupacoes_piquete']['Update'], 'id' | 'fazenda_id' | 'created_at'>;

type EventoManejoInsert = Omit<Database['public']['Tables']['eventos_manejo_pastagem']['Insert'], 'id' | 'fazenda_id' | 'created_at' | 'created_by'>;

const PASTAGEM_COLS = 'id, fazenda_id, nome, especie_forrageira, area_total_ha, sistema_pastejo, nivel_tecnologia, necessita_reforma, observacoes, ativo, created_at, updated_at';
const PIQUETE_COLS = 'id, fazenda_id, pastagem_id, nome, area_ha, status, necessita_reforma, ua_suportada, dias_descanso_ideal, altura_entrada_cm, altura_saida_cm, observacoes, created_at, updated_at';
const OCUPACAO_COLS = 'id, fazenda_id, piquete_id, lote_id, data_entrada, data_saida_prevista, data_saida_real, altura_dossel_entrada_cm, altura_dossel_saida_cm, quantidade_animais, peso_medio_kg, ua_real, metodo_calculo_ua, observacoes, created_by, created_at, updated_at';
const EVENTO_COLS = 'id, fazenda_id, piquete_id, tipo, data, insumo_id, quantidade_insumo, unidade_insumo, dose_por_ha, maquina_id, custo_estimado, tipo_servico_cerca, metragem_cerca_m, material_cerca, observacoes, created_by, created_at';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function enrichPiquete(
  piquete: Piquete,
  ocupacaoAtual: OcupacaoPiqueteComLote | null,
  ultimaSaida: string | null,
): PiqueteComOcupacaoAtual {
  const hoje = new Date().toISOString().split('T')[0];

  const diasDescansoAcumulado =
    piquete.status === 'Descanso' && ultimaSaida
      ? daysBetween(ultimaSaida, hoje)
      : null;

  const alerta_pronto_entrada =
    diasDescansoAcumulado !== null &&
    piquete.dias_descanso_ideal !== null &&
    diasDescansoAcumulado >= piquete.dias_descanso_ideal;

  const alerta_superlotacao =
    ocupacaoAtual !== null &&
    ocupacaoAtual.ua_real !== null &&
    piquete.ua_suportada !== null &&
    ocupacaoAtual.ua_real > piquete.ua_suportada;

  // Ocupação vencida: lote ainda em pastejo após a data de saída prevista
  const dias_ocupacao_vencida =
    ocupacaoAtual !== null && ocupacaoAtual.data_saida_prevista
      ? daysBetween(ocupacaoAtual.data_saida_prevista, hoje)
      : null;
  const alerta_ocupacao_vencida =
    dias_ocupacao_vencida !== null && dias_ocupacao_vencida > 0;

  return {
    ...piquete,
    ocupacao_atual: ocupacaoAtual,
    dias_descanso_acumulado: diasDescansoAcumulado,
    alerta_pronto_entrada,
    alerta_superlotacao,
    alerta_ocupacao_vencida,
    dias_ocupacao_vencida: alerta_ocupacao_vencida ? dias_ocupacao_vencida : null,
  };
}

// ─── Pastagens ───────────────────────────────────────────────────────────────

export async function listPastagens(): Promise<Pastagem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('pastagens')
    .select(PASTAGEM_COLS)
    .eq('ativo', true)
    .order('nome');

  if (error) throw error;
  return (data ?? []) as Pastagem[];
}

export async function getPastagemComResumo(pastagemId: string): Promise<PastagemComResumo | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Usuário não autenticado.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();
  if (!profile?.fazenda_id) return null;

  const { data: pastagem, error: pastagemError } = await supabase
    .from('pastagens')
    .select(PASTAGEM_COLS)
    .eq('id', pastagemId)
    .eq('fazenda_id', profile.fazenda_id)
    .single();

  if (pastagemError) throw pastagemError;
  if (!pastagem) return null;

  const { data: piquetesRaw, error: piquetesError } = await supabase
    .from('piquetes')
    .select(`
      id, fazenda_id, pastagem_id, nome, area_ha, status, necessita_reforma,
      ua_suportada, dias_descanso_ideal, altura_entrada_cm, altura_saida_cm,
      observacoes, created_at, updated_at,
      ocupacoes_piquete(
        id, piquete_id, lote_id, data_entrada, data_saida_prevista,
        data_saida_real, altura_dossel_entrada_cm, altura_dossel_saida_cm,
        quantidade_animais, peso_medio_kg, ua_real, metodo_calculo_ua,
        observacoes, created_by, created_at, updated_at,
        lotes(nome, tipo_rebanho)
      )
    `)
    .eq('pastagem_id', pastagemId)
    .order('nome');

  if (piquetesError) throw piquetesError;

  const piquetes: PiqueteComOcupacaoAtual[] = (piquetesRaw ?? []).map((row) => {
    const todasOcupacoes = (row.ocupacoes_piquete ?? []) as unknown as (OcupacaoPiqueteComLote & { data_saida_real: string | null })[];
    const ocupacaoAberta = todasOcupacoes.find((o) => o.data_saida_real === null) ?? null;
    const ultimaFechada = todasOcupacoes
      .filter((o) => o.data_saida_real !== null)
      .sort((a, b) => (b.data_saida_real! > a.data_saida_real! ? 1 : -1))[0] ?? null;

    const piqueteBase: Piquete = {
      id: row.id,
      fazenda_id: row.fazenda_id,
      pastagem_id: row.pastagem_id,
      nome: row.nome,
      area_ha: Number(row.area_ha),
      status: row.status as Piquete['status'],
      necessita_reforma: Boolean(row.necessita_reforma),
      ua_suportada: row.ua_suportada !== null ? Number(row.ua_suportada) : null,
      dias_descanso_ideal: row.dias_descanso_ideal,
      altura_entrada_cm: row.altura_entrada_cm !== null ? Number(row.altura_entrada_cm) : null,
      altura_saida_cm: row.altura_saida_cm !== null ? Number(row.altura_saida_cm) : null,
      observacoes: row.observacoes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return enrichPiquete(piqueteBase, ocupacaoAberta, ultimaFechada?.data_saida_real ?? null);
  });

  const em_pastejo  = piquetes.filter((p) => p.status === 'Em pastejo').length;
  const em_descanso = piquetes.filter((p) => p.status === 'Descanso').length;
  const em_reforma  = piquetes.filter((p) => p.status === 'Em reforma').length;
  const interditados = piquetes.filter((p) => p.status === 'Interditado').length;
  const necessita_reforma_count = piquetes.filter((p) => p.necessita_reforma).length;

  return {
    ...(pastagem as unknown as Pastagem),
    area_total_ha: Number(pastagem.area_total_ha),
    necessita_reforma: Boolean((pastagem as { necessita_reforma?: boolean }).necessita_reforma),
    piquetes,
    total_piquetes: piquetes.length,
    em_pastejo,
    em_descanso,
    em_reforma,
    interditados,
    necessita_reforma_count,
  };
}

export async function createPastagem(payload: PastagemInsert) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('pastagens')
    .insert(payload)
    .select(PASTAGEM_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePastagem(id: string, payload: PastagemUpdate) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('pastagens')
    .update(payload)
    .eq('id', id)
    .select(PASTAGEM_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function deletePastagem(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('pastagens').delete().eq('id', id);
  if (error) throw error;
}

export async function hasOcupacaoAbertaNaPastagem(pastagemId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ocupacoes_piquete')
    .select('id, piquetes!inner(pastagem_id)')
    .eq('piquetes.pastagem_id', pastagemId)
    .is('data_saida_real', null)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

// ─── Piquetes ─────────────────────────────────────────────────────────────────

export async function listPiquetesDaPastagem(pastagemId: string): Promise<Piquete[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('piquetes')
    .select(PIQUETE_COLS)
    .eq('pastagem_id', pastagemId)
    .order('nome');

  if (error) throw error;
  return (data ?? []) as unknown as Piquete[];
}

export async function getPiqueteById(id: string): Promise<Piquete> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Usuário não autenticado.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();
  if (!profile?.fazenda_id) throw new Error('Fazenda não encontrada.');

  const { data, error } = await supabase
    .from('piquetes')
    .select(PIQUETE_COLS)
    .eq('id', id)
    .eq('fazenda_id', profile.fazenda_id)
    .single();

  if (error) throw error;
  return data as unknown as Piquete;
}

export async function createPiquete(payload: PiqueteInsert) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('piquetes')
    .insert(payload)
    .select(PIQUETE_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePiquete(id: string, payload: PiqueteUpdate) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('piquetes')
    .update(payload)
    .eq('id', id)
    .select(PIQUETE_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function deletePiquete(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('piquetes').delete().eq('id', id);
  if (error) throw error;
}

export async function setNecessitaReformaPiquete(id: string, valor: boolean): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('piquetes')
    .update({ necessita_reforma: valor })
    .eq('id', id);
  if (error) throw error;
}

export async function setNecessitaReformaPastagem(id: string, valor: boolean): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('pastagens')
    .update({ necessita_reforma: valor })
    .eq('id', id);
  if (error) throw error;
}

export async function hasOcupacaoAbertaNoPiquete(piqueteId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ocupacoes_piquete')
    .select('id')
    .eq('piquete_id', piqueteId)
    .is('data_saida_real', null)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

// ─── Ocupações ───────────────────────────────────────────────────────────────

export async function listOcupacoesDoPiquete(
  piqueteId: string,
  opts: { incluirFechadas: boolean } = { incluirFechadas: true },
): Promise<OcupacaoPiqueteComLote[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('ocupacoes_piquete')
    .select(`
      id, piquete_id, lote_id, data_entrada, data_saida_prevista,
      data_saida_real, altura_dossel_entrada_cm, altura_dossel_saida_cm,
      quantidade_animais, peso_medio_kg, ua_real, metodo_calculo_ua,
      observacoes, created_at,
      lotes(nome, tipo_rebanho)
    `)
    .eq('piquete_id', piqueteId)
    .order('data_entrada', { ascending: false });

  if (!opts.incluirFechadas) {
    query = query.is('data_saida_real', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as OcupacaoPiqueteComLote[];
}

export async function getOcupacaoById(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ocupacoes_piquete')
    .select(OCUPACAO_COLS)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createOcupacao(payload: OcupacaoInsert) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ocupacoes_piquete')
    .insert(payload)
    .select(OCUPACAO_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOcupacao(id: string, payload: OcupacaoUpdate) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ocupacoes_piquete')
    .update(payload)
    .eq('id', id)
    .select(OCUPACAO_COLS)
    .single();

  if (error) throw error;
  return data;
}

// ─── Eventos de manejo ────────────────────────────────────────────────────────

export async function listEventosManejoDoPiquete(piqueteId: string): Promise<EventoManejoComJoins[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('eventos_manejo_pastagem')
    .select(`
      id, fazenda_id, piquete_id, tipo, data, insumo_id, quantidade_insumo,
      unidade_insumo, dose_por_ha, maquina_id, custo_estimado,
      observacoes, created_by, created_at,
      insumos(nome, unidade),
      maquinas(nome)
    `)
    .eq('piquete_id', piqueteId)
    .order('data', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as EventoManejoComJoins[];
}

export async function createEventoManejo(payload: EventoManejoInsert) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('eventos_manejo_pastagem')
    .insert(payload)
    .select(EVENTO_COLS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEventoManejo(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('eventos_manejo_pastagem').delete().eq('id', id);
  if (error) throw error;
}

// ─── Cálculo de UA ───────────────────────────────────────────────────────────

export async function calcularUADoLote(
  loteId: string,
  areaHa: number,
): Promise<ResultadoCalculoUA> {
  const supabase = await createSupabaseServerClient();

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

// ─── Dados para alertas do Dashboard ─────────────────────────────────────────

export async function listPastagensParaAlertas(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('piquetes')
    .select(`
      id, nome, area_ha, status, necessita_reforma, ua_suportada, dias_descanso_ideal, updated_at,
      pastagens!inner(id, nome, ativo),
      ocupacoes_piquete(ua_real, data_entrada, data_saida_prevista, data_saida_real)
    `)
    .eq('pastagens.ativo', true);

  if (error) throw error;
  return data ?? [];
}
