import { createSupabaseServerClient } from '@/lib/supabase/server';
import { toUtcRangeFromLocal } from '@/lib/utils/periodo';

export interface PastagemRow {
  id: string;
  nome: string;
  especie: string | null;
  sistema_pastejo: string;
  area_total_ha: number;
  qtd_piquetes: number;
  piquetes_em_pastejo: number;
  piquetes_descanso: number;
}

export interface PiqueteRow {
  id: string;
  pastagem_nome: string;
  nome: string;
  area_ha: number;
  status: string;
  ua_suportada: number | null;
  ua_atual: number | null;
  lote_atual: string | null;
  dias_descanso_ideal: number | null;
}

export interface OcupacaoRow {
  id: string;
  piquete_nome: string;
  pastagem_nome: string;
  lote_nome: string | null;
  data_entrada: string;
  data_saida_prevista: string | null;
  data_saida_real: string | null;
  dias_ocupacao: number | null;
  ua_real: number | null;
  metodo_calculo_ua: string | null;
}

export interface EventoManejoRow {
  id: string;
  piquete_nome: string;
  pastagem_nome: string;
  data_evento: string;
  tipo: string;
  descricao: string | null;
  custo: number | null;
  insumo_nome: string | null;
  maquina_nome: string | null;
}

export interface RelatorioPastagensResult {
  pastagens: PastagemRow[];
  piquetes: PiqueteRow[];
  ocupacoes: OcupacaoRow[];
  eventos: EventoManejoRow[];
}

type RawPiquete = {
  id: string;
  nome: string;
  area_ha: number;
  status: string;
  ua_suportada: number | null;
  ua_real: number | null;
  dias_descanso_ideal: number | null;
  pastagens: { id: string; nome: string } | null;
  ocupacoes_piquete: Array<{ lotes: { nome: string } | null; data_saida_real: string | null }>;
};

type RawOcupacao = {
  id: string;
  data_entrada: string;
  data_saida_prevista: string | null;
  data_saida_real: string | null;
  ua_real: number | null;
  metodo_calculo_ua: string | null;
  lotes: { nome: string } | null;
  piquetes: { nome: string; pastagens: { nome: string } | null } | null;
};

type RawEvento = {
  id: string;
  data_evento: string;
  tipo: string;
  descricao: string | null;
  custo: number | null;
  piquetes: { nome: string; pastagens: { nome: string } | null } | null;
  insumos: { nome: string } | null;
  maquinas: { nome: string } | null;
};

export async function getRelatorioPastagens(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioPastagensResult> {
  const supabase = await createSupabaseServerClient();
  const { gte, lte } = toUtcRangeFromLocal(from, to);

  const [pastagensRes, piquetesRes, ocupacoesRes, eventosRes] = await Promise.all([
    supabase
      .from('pastagens')
      .select('id, nome, especie, sistema_pastejo, area_total_ha')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true }),

    supabase
      .from('piquetes')
      .select(
        'id, nome, area_ha, status, ua_suportada, ua_real, dias_descanso_ideal, ' +
        'pastagens(id, nome), ' +
        'ocupacoes_piquete(lotes(nome), data_saida_real)'
      )
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true }),

    supabase
      .from('ocupacoes_piquete')
      .select(
        'id, data_entrada, data_saida_prevista, data_saida_real, ua_real, metodo_calculo_ua, ' +
        'lotes(nome), piquetes(nome, pastagens(nome))'
      )
      .eq('fazenda_id', fazendaId)
      .gte('data_entrada', gte)
      .lte('data_entrada', lte)
      .order('data_entrada', { ascending: false })
      .limit(10000),

    supabase
      .from('eventos_manejo_pastagem')
      .select(
        'id, data_evento, tipo, descricao, custo, ' +
        'piquetes(nome, pastagens(nome)), insumos(nome), maquinas(nome)'
      )
      .eq('fazenda_id', fazendaId)
      .gte('data_evento', gte)
      .lte('data_evento', lte)
      .order('data_evento', { ascending: false })
      .limit(10000),
  ]);

  if (pastagensRes.error) throw pastagensRes.error;
  if (piquetesRes.error) throw piquetesRes.error;
  if (ocupacoesRes.error) throw ocupacoesRes.error;
  if (eventosRes.error) throw eventosRes.error;

  const rawPiquetes = (piquetesRes.data ?? []) as unknown as RawPiquete[];

  // Contagens de status por pastagem
  const statusPorPastagem = new Map<string, { total: number; pastejo: number; descanso: number }>();
  for (const pq of rawPiquetes) {
    const pastagemId = pq.pastagens?.id ?? '';
    if (!statusPorPastagem.has(pastagemId)) {
      statusPorPastagem.set(pastagemId, { total: 0, pastejo: 0, descanso: 0 });
    }
    const entry = statusPorPastagem.get(pastagemId)!;
    entry.total++;
    if (pq.status === 'Em pastejo') entry.pastejo++;
    if (pq.status === 'Descanso') entry.descanso++;
  }

  const pastagens: PastagemRow[] = (pastagensRes.data ?? []).map((p) => {
    const stats = statusPorPastagem.get(p.id) ?? { total: 0, pastejo: 0, descanso: 0 };
    return {
      id: p.id,
      nome: p.nome,
      especie: p.especie ?? null,
      sistema_pastejo: p.sistema_pastejo,
      area_total_ha: p.area_total_ha,
      qtd_piquetes: stats.total,
      piquetes_em_pastejo: stats.pastejo,
      piquetes_descanso: stats.descanso,
    };
  });

  const piquetes: PiqueteRow[] = rawPiquetes.map((pq) => {
    const ocupacaoAberta = pq.ocupacoes_piquete.find((o) => !o.data_saida_real);
    return {
      id: pq.id,
      pastagem_nome: pq.pastagens?.nome ?? '',
      nome: pq.nome,
      area_ha: pq.area_ha,
      status: pq.status,
      ua_suportada: pq.ua_suportada,
      ua_atual: pq.ua_real,
      lote_atual: ocupacaoAberta?.lotes?.nome ?? null,
      dias_descanso_ideal: pq.dias_descanso_ideal,
    };
  });

  const rawOcupacoes = (ocupacoesRes.data ?? []) as unknown as RawOcupacao[];
  const ocupacoes: OcupacaoRow[] = rawOcupacoes.map((o) => {
    const entrada = new Date(o.data_entrada);
    const saida = o.data_saida_real ? new Date(o.data_saida_real) : null;
    const dias_ocupacao = saida
      ? Math.round((saida.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: o.id,
      piquete_nome: o.piquetes?.nome ?? '',
      pastagem_nome: o.piquetes?.pastagens?.nome ?? '',
      lote_nome: o.lotes?.nome ?? null,
      data_entrada: o.data_entrada,
      data_saida_prevista: o.data_saida_prevista,
      data_saida_real: o.data_saida_real,
      dias_ocupacao,
      ua_real: o.ua_real,
      metodo_calculo_ua: o.metodo_calculo_ua,
    };
  });

  const rawEventos = (eventosRes.data ?? []) as unknown as RawEvento[];
  const eventos: EventoManejoRow[] = rawEventos.map((e) => ({
    id: e.id,
    piquete_nome: e.piquetes?.nome ?? '',
    pastagem_nome: e.piquetes?.pastagens?.nome ?? '',
    data_evento: e.data_evento,
    tipo: e.tipo,
    descricao: e.descricao,
    custo: e.custo,
    insumo_nome: e.insumos?.nome ?? null,
    maquina_nome: e.maquinas?.nome ?? null,
  }));

  return { pastagens, piquetes, ocupacoes, eventos };
}
