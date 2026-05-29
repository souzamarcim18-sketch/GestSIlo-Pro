import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { EventoCalendario, FiltrosCalendario, ModuloCalendario } from '@/lib/types/calendario';
import {
  normalizarEventoDap,
  normalizarAtividadeCampo,
  normalizarManutencao,
  normalizarEventoRebanho,
  normalizarEventoSanitario,
  normalizarOcupacaoPiquete,
} from '@/lib/utils/calendario';

type Supabase = SupabaseClient<Database>;

const MODULOS_POR_INDICE: ModuloCalendario[] = [
  'lavoura_dap', 'lavoura_atividade', 'frota', 'rebanho', 'sanidade',
  'mao_obra', 'pastagem_manejo', 'pastagem_ocupacao', 'silo', 'insumo', 'produto',
];

async function fetchEventosDap(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
  talhaoId?: string,
  cultura?: string,
): Promise<EventoCalendario[]> {
  const hoje = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from('eventos_dap')
    .select('id, tipo_operacao, cultura, status, data_esperada, data_realizada, talhao_id, talhoes(nome)')
    .gte('data_esperada', dataInicio)
    .lte('data_esperada', dataFim);

  if (talhaoId) q = q.eq('talhao_id', talhaoId);
  if (cultura) q = q.eq('cultura', cultura);

  const { data, error } = await q.order('data_esperada');
  if (error) throw error;

  return (data ?? []).map((r) =>
    normalizarEventoDap(
      {
        ...r,
        talhoes: r.talhoes as { nome?: string } | null,
      },
      hoje,
    ),
  );
}

async function fetchAtividadesCampo(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
  talhaoId?: string,
): Promise<EventoCalendario[]> {
  let q = supabase
    .from('atividades_campo')
    .select('id, tipo_operacao, data, talhao_id, talhoes(nome)')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (talhaoId) q = q.eq('talhao_id', talhaoId);

  const { data, error } = await q.order('data');
  if (error) throw error;

  return (data ?? []).map((r) =>
    normalizarAtividadeCampo({
      ...r,
      talhoes: r.talhoes as { nome?: string } | null,
    }),
  );
}

async function fetchManutencoes(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const hoje = new Date().toISOString().slice(0, 10);

  const [realizadas, planejadas] = await Promise.all([
    supabase
      .from('manutencoes')
      .select('id, tipo, descricao, status, data_realizada, data_prevista, proxima_manutencao, maquinas(nome)')
      .gte('data_realizada', dataInicio)
      .lte('data_realizada', dataFim),
    supabase
      .from('manutencoes')
      .select('id, tipo, descricao, status, data_prevista, data_realizada, proxima_manutencao, maquinas(nome)')
      .is('data_realizada', null)
      .gte('data_prevista', dataInicio)
      .lte('data_prevista', dataFim),
  ]);

  if (realizadas.error) throw realizadas.error;
  if (planejadas.error) throw planejadas.error;

  const todasRows = [...(realizadas.data ?? []), ...(planejadas.data ?? [])];

  const eventos: EventoCalendario[] = [];
  for (const r of todasRows) {
    const normalized = normalizarManutencao(
      {
        ...r,
        maquinas: r.maquinas as { nome?: string } | null,
      },
      hoje,
    );
    eventos.push(...normalized);
  }

  // proxima_manutencao dentro do range (registro pode não ter sido capturado nas queries acima)
  const { data: proximasData, error: proximasError } = await supabase
    .from('manutencoes')
    .select('id, tipo, descricao, status, data_prevista, data_realizada, proxima_manutencao, maquinas(nome)')
    .gte('proxima_manutencao', dataInicio)
    .lte('proxima_manutencao', dataFim)
    .gte('proxima_manutencao', hoje);

  if (proximasError) throw proximasError;

  for (const r of proximasData ?? []) {
    // Evitar duplicar evento principal (já adicionado acima)
    const jaAdicionado = eventos.some((e) => e.id === r.id || e.id === `${r.id}_proxima`);
    if (!jaAdicionado) {
      const maquinaNome = (r.maquinas as { nome?: string } | null)?.nome ?? '';
      eventos.push({
        id: `${r.id}_proxima`,
        fonte: 'manutencoes',
        modulo: 'frota',
        titulo: `Próxima manutenção — ${maquinaNome}`,
        subtitulo: r.tipo,
        data: r.proxima_manutencao!,
        status: 'planejado',
        href: '/dashboard/frota',
      });
    }
  }

  return eventos;
}

async function fetchEventosRebanho(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('eventos_rebanho')
    .select('id, tipo, observacoes, data_evento, animal_id, animais(brinco, nome)')
    .gte('data_evento', dataInicio)
    .lte('data_evento', dataFim)
    .is('deleted_at', null)
    .order('data_evento');

  if (error) throw error;

  return (data ?? []).map((r) => {
    const animais = r.animais as unknown as { brinco?: string | null; nome?: string | null } | null;
    return normalizarEventoRebanho({
      id: r.id,
      tipo: r.tipo,
      descricao: r.observacoes,
      data_evento: r.data_evento,
      animal_id: r.animal_id,
      animais,
    });
  });
}

async function fetchEventosSanitarios(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const hoje = new Date().toISOString().slice(0, 10);

  const [passados, futuros] = await Promise.all([
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

  if (passados.error) throw passados.error;
  if (futuros.error) throw futuros.error;

  const eventos: EventoCalendario[] = [];

  for (const r of passados.data ?? []) {
    eventos.push({
      id: r.id,
      fonte: 'eventos_sanitarios',
      modulo: 'sanidade',
      titulo: r.tipo,
      subtitulo: r.vacina_nome ?? r.observacoes ?? undefined,
      data: r.data_evento,
      status: 'realizado',
      href: '/dashboard/rebanho/sanidade',
    });
  }

  for (const r of futuros.data ?? []) {
    if (!r.data_proxima_dose) continue;
    eventos.push({
      id: `${r.id}_proxima_dose`,
      fonte: 'eventos_sanitarios',
      modulo: 'sanidade',
      titulo: `Próxima dose — ${r.tipo}`,
      subtitulo: r.vacina_nome ?? r.observacoes ?? undefined,
      data: r.data_proxima_dose,
      status: 'planejado',
      href: '/dashboard/rebanho/sanidade',
    });
  }

  return eventos;
}

async function fetchAtividadesMaoObra(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('atividades_mao_obra')
    .select('id, tipo_atividade, observacoes, data, custo_final')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'atividades_mao_obra',
    modulo: 'mao_obra' as const,
    titulo: r.tipo_atividade,
    subtitulo: r.observacoes ?? undefined,
    data: r.data,
    status: 'realizado' as const,
    href: '/dashboard/mao-de-obra',
  }));
}

async function fetchEventosManejoPassagem(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('eventos_manejo_pastagem')
    .select('id, tipo, observacoes, data, piquete_id, piquetes(pastagem_id)')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');

  if (error) throw error;

  return (data ?? []).map((r) => {
    const pastagem = r.piquetes as unknown as { pastagem_id?: string } | null;
    return {
      id: r.id,
      fonte: 'eventos_manejo_pastagem',
      modulo: 'pastagem_manejo' as const,
      titulo: r.tipo,
      subtitulo: r.observacoes ?? undefined,
      data: r.data,
      status: 'realizado' as const,
      href: pastagem?.pastagem_id
        ? `/dashboard/pastagens/${pastagem.pastagem_id}`
        : '/dashboard/pastagens',
    };
  });
}

async function fetchOcupacoesPiquete(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const [entradas, saidasReais, saidasPrevistas] = await Promise.all([
    supabase
      .from('ocupacoes_piquete')
      .select('id, data_entrada, data_saida_real, data_saida_prevista, lotes(nome), piquetes(nome, pastagem_id)')
      .gte('data_entrada', dataInicio)
      .lte('data_entrada', dataFim)
      .order('data_entrada'),
    supabase
      .from('ocupacoes_piquete')
      .select('id, data_entrada, data_saida_real, data_saida_prevista, lotes(nome), piquetes(nome, pastagem_id)')
      .gte('data_saida_real', dataInicio)
      .lte('data_saida_real', dataFim)
      .not('data_saida_real', 'is', null),
    supabase
      .from('ocupacoes_piquete')
      .select('id, data_entrada, data_saida_real, data_saida_prevista, lotes(nome), piquetes(nome, pastagem_id)')
      .is('data_saida_real', null)
      .gte('data_saida_prevista', dataInicio)
      .lte('data_saida_prevista', dataFim),
  ]);

  if (entradas.error) throw entradas.error;
  if (saidasReais.error) throw saidasReais.error;
  if (saidasPrevistas.error) throw saidasPrevistas.error;

  const toNormalizable = (r: (typeof entradas.data)[number]) => ({
    ...r,
    lotes: r.lotes as { nome?: string } | null,
    piquetes: r.piquetes as unknown as { nome?: string; pastagem_id?: string } | null,
  });

  const eventos: EventoCalendario[] = [];
  const idsAdicionados = new Set<string>();

  const adicionarSemDuplicar = (lista: EventoCalendario[]) => {
    for (const e of lista) {
      if (!idsAdicionados.has(e.id)) {
        idsAdicionados.add(e.id);
        eventos.push(e);
      }
    }
  };

  for (const r of entradas.data ?? []) {
    adicionarSemDuplicar(normalizarOcupacaoPiquete(toNormalizable(r)));
  }

  // Saídas reais de registros que não foram capturados pela query de entradas
  for (const r of saidasReais.data ?? []) {
    const norm = toNormalizable(r);
    // Só adicionar o evento de saída real (não duplicar entrada)
    if (norm.data_saida_real && !idsAdicionados.has(`${r.id}_saida_real`)) {
      const piquete = norm.piquetes;
      const lote = norm.lotes;
      const href = piquete?.pastagem_id
        ? `/dashboard/pastagens/${piquete.pastagem_id}`
        : '/dashboard/pastagens';
      idsAdicionados.add(`${r.id}_saida_real`);
      eventos.push({
        id: `${r.id}_saida_real`,
        fonte: 'ocupacoes_piquete',
        modulo: 'pastagem_ocupacao',
        titulo: `Saída do piquete — ${piquete?.nome ?? ''}`,
        subtitulo: lote?.nome,
        data: norm.data_saida_real,
        status: 'realizado',
        href,
      });
    }
  }

  // Saídas previstas
  for (const r of saidasPrevistas.data ?? []) {
    const norm = toNormalizable(r);
    if (norm.data_saida_prevista && !idsAdicionados.has(`${r.id}_saida_prevista`)) {
      const piquete = norm.piquetes;
      const lote = norm.lotes;
      const href = piquete?.pastagem_id
        ? `/dashboard/pastagens/${piquete.pastagem_id}`
        : '/dashboard/pastagens';
      idsAdicionados.add(`${r.id}_saida_prevista`);
      eventos.push({
        id: `${r.id}_saida_prevista`,
        fonte: 'ocupacoes_piquete',
        modulo: 'pastagem_ocupacao',
        titulo: `Saída prevista — ${piquete?.nome ?? ''}`,
        subtitulo: lote?.nome,
        data: norm.data_saida_prevista,
        status: 'planejado',
        href,
      });
    }
  }

  return eventos;
}

async function fetchMovimentacoesSilo(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .select('id, tipo, subtipo, quantidade, data, silos(nome)')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'movimentacoes_silo',
    modulo: 'silo' as const,
    titulo: `${r.tipo}${r.subtipo ? ` (${r.subtipo})` : ''} — ${(r.silos as { nome?: string } | null)?.nome ?? ''}`,
    subtitulo: `${(r.quantidade / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} t`,
    data: r.data,
    status: 'realizado' as const,
    href: '/dashboard/silos',
  }));
}

async function fetchMovimentacoesInsumo(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('movimentacoes_insumo')
    .select('id, tipo, quantidade, data, insumos(nome)')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'movimentacoes_insumo',
    modulo: 'insumo' as const,
    titulo: `${r.tipo} — ${(r.insumos as { nome?: string } | null)?.nome ?? ''}`,
    subtitulo: `${r.quantidade}`,
    data: r.data,
    status: 'realizado' as const,
    href: '/dashboard/insumos',
  }));
}

async function fetchMovimentacoesProduto(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('movimentacoes_produto')
    .select('id, tipo, quantidade, data, produtos(nome)')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'movimentacoes_produto',
    modulo: 'produto' as const,
    titulo: `${r.tipo} — ${(r.produtos as unknown as { nome?: string } | null)?.nome ?? ''}`,
    subtitulo: `${r.quantidade}`,
    data: r.data,
    status: 'realizado' as const,
    href: '/dashboard/produtos',
  }));
}

export async function getEventosCalendario(
  supabase: Supabase,
  filtros: FiltrosCalendario,
): Promise<EventoCalendario[]> {
  const { dataInicio, dataFim, modulos } = filtros;

  const fontes: Array<() => Promise<EventoCalendario[]>> = [
    () => fetchEventosDap(supabase, dataInicio, dataFim, filtros.talhaoId, filtros.cultura),
    () => fetchAtividadesCampo(supabase, dataInicio, dataFim, filtros.talhaoId),
    () => fetchManutencoes(supabase, dataInicio, dataFim),
    () => fetchEventosRebanho(supabase, dataInicio, dataFim),
    () => fetchEventosSanitarios(supabase, dataInicio, dataFim),
    () => fetchAtividadesMaoObra(supabase, dataInicio, dataFim),
    () => fetchEventosManejoPassagem(supabase, dataInicio, dataFim),
    () => fetchOcupacoesPiquete(supabase, dataInicio, dataFim),
    () => fetchMovimentacoesSilo(supabase, dataInicio, dataFim),
    () => fetchMovimentacoesInsumo(supabase, dataInicio, dataFim),
    () => fetchMovimentacoesProduto(supabase, dataInicio, dataFim),
  ];

  const fontesAtivas = modulos
    ? fontes.filter((_, i) => modulos.includes(MODULOS_POR_INDICE[i]))
    : fontes;

  // Promise.all conforme padrão do projeto (RSCs usam Promise.all)
  // Cada fonte individual já trata erros internamente; falha numa tabela ausente
  // será capturada e re-lançada — use try/catch no RSC se necessário.
  const resultados = await Promise.all(fontesAtivas.map((fn) => fn().catch((err) => {
    console.error('[calendario] fetch parcial falhou:', err);
    return [] as EventoCalendario[];
  })));

  const eventos: EventoCalendario[] = resultados.flat();

  return eventos.sort((a, b) => a.data.localeCompare(b.data));
}

export async function getAtividadesRecentes(supabase: Supabase): Promise<EventoCalendario[]> {
  const hoje = new Date();
  const d2 = new Date(hoje);
  d2.setDate(d2.getDate() - 2);

  const dataInicio = d2.toISOString().slice(0, 10);
  const dataFim = hoje.toISOString().slice(0, 10);

  const todos = await getEventosCalendario(supabase, { dataInicio, dataFim });

  return todos
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 8);
}
