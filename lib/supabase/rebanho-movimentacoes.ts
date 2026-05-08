import { createSupabaseServerClient } from './server';
import type { Animal, Lote, EventoRebanho } from '@/lib/types/rebanho';

// ---------------------------------------------------------------------------
// TIPOS DE MOVIMENTAÇÕES
// ---------------------------------------------------------------------------

export type TipoMovimentacao = 'morte' | 'venda' | 'nascimento' | 'transferencia_lote' | 'descarte';

export type CausaMorte = 'doenca' | 'acidente' | 'predador' | 'desconhecida' | 'outro';

export interface MovimentacaoListItem {
  id: string;
  tipo: TipoMovimentacao;
  data_evento: string;
  observacoes: string | null;
  comprador: string | null;
  valor_venda: number | null;
  lote_id_destino: string | null;
  motivo_descarte: string | null;
  animal_id: string;
  brinco: string;
  nome: string | null;
  categoria: string;
  tipo_rebanho: string;
  peso_atual: number | null;
  lote_nome: string | null;
}

export interface MovimentacaoFiltros {
  tipo?: TipoMovimentacao;
  data_inicio?: string;
  data_fim?: string;
  lote_id?: string;
  busca?: string; // busca por brinco
}

export interface MovimentacaoResumoPeriodo {
  entradas: number;
  saidas: number;
  saldo: number;
  valor_vendas: number;
}

// ---------------------------------------------------------------------------
// PAYLOADS DE REGISTRO
// ---------------------------------------------------------------------------

export interface RegistrarNascimentoPayload {
  animal_id: string;
  data_evento: string;
  mae_id?: string;
  peso_nascimento?: number;
  observacoes?: string;
}

export interface RegistrarCompraPayload {
  animal_id: string;
  data_evento: string;
  fornecedor: string;
  peso_entrada_kg?: number;
  valor_pago?: number;
  observacoes?: string;
}

export interface RegistrarVendaPayload {
  animal_ids: string[];
  data_evento: string;
  comprador: string;
  peso_saida_kg?: number;
  valor_recebido?: number;
  observacoes?: string;
}

export interface RegistrarMortePayload {
  animal_id: string;
  data_evento: string;
  causa_morte: CausaMorte;
  observacoes?: string;
}

export interface RegistrarDescartePayload {
  animal_id: string;
  data_evento: string;
  motivo_descarte: string;
  observacoes?: string;
}

export interface RegistrarAbatePropioPayload {
  animal_id: string;
  data_evento: string;
  peso_abate_kg: number;
  rendimento_carcaca_pct?: number;
  observacoes?: string;
}

export interface RegistrarTransferenciaPayload {
  animal_ids: string[];
  data_evento: string;
  lote_destino_id: string;
  observacoes?: string;
}

// ---------------------------------------------------------------------------
// QUERIES — MOVIMENTAÇÕES
// ---------------------------------------------------------------------------

export const queryMovimentacoes = {
  async list(
    filtros: MovimentacaoFiltros = {},
    limit: number = 25,
    offset: number = 0
  ): Promise<{ data: MovimentacaoListItem[]; total: number }> {
    const supabase = await createSupabaseServerClient();

    // Construir query base
    let query = supabase
      .from('eventos_rebanho')
      .select(
        `id, tipo, data_evento, observacoes, comprador, valor_venda, lote_id_destino, motivo_descarte,
         animal_id, animais:animal_id(id, brinco, nome, categoria, tipo_rebanho, peso_atual)`,
        { count: 'exact' }
      )
      .in('tipo', ['morte', 'venda', 'nascimento', 'transferencia_lote', 'descarte'])
      .is('deleted_at', null)
      .order('data_evento', { ascending: false });

    // Aplicar filtros
    if (filtros.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }

    if (filtros.data_inicio) {
      query = query.gte('data_evento', filtros.data_inicio);
    }

    if (filtros.data_fim) {
      query = query.lte('data_evento', filtros.data_fim);
    }

    if (filtros.lote_id) {
      query = query.eq('animais.lote_id', filtros.lote_id);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transformar dados para formato esperado
    const movimentacoes: MovimentacaoListItem[] = (data || []).map((item: any) => ({
      id: item.id,
      tipo: item.tipo,
      data_evento: item.data_evento,
      observacoes: item.observacoes,
      comprador: item.comprador,
      valor_venda: item.valor_venda,
      lote_id_destino: item.lote_id_destino,
      motivo_descarte: item.motivo_descarte,
      animal_id: item.animal_id,
      brinco: item.animais?.brinco || '',
      nome: item.animais?.nome || null,
      categoria: item.animais?.categoria || '',
      tipo_rebanho: item.animais?.tipo_rebanho || '',
      peso_atual: item.animais?.peso_atual || null,
      lote_nome: null,
    }));

    return JSON.parse(JSON.stringify({
      data: movimentacoes,
      total: count || 0,
    }));
  },

  async getResumo(data_inicio: string, data_fim: string): Promise<MovimentacaoResumoPeriodo> {
    const supabase = await createSupabaseServerClient();

    // Buscar todas as movimentações do período
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .select('tipo, valor_venda')
      .in('tipo', ['morte', 'venda', 'nascimento', 'transferencia_lote', 'descarte'])
      .gte('data_evento', data_inicio)
      .lte('data_evento', data_fim)
      .is('deleted_at', null);

    if (error) throw error;

    const eventos = data || [];

    // Contar entradas (nascimento, compra)
    const entradas = eventos.filter((e: any) => ['nascimento', 'compra'].includes(e.tipo)).length;

    // Contar saídas (venda, morte, descarte)
    const saidas = eventos.filter((e: any) => ['venda', 'morte', 'descarte', 'abate_proprio'].includes(e.tipo))
      .length;

    // Saldo
    const saldo = entradas - saidas;

    // Valor total de vendas
    const valor_vendas = eventos
      .filter((e: any) => e.tipo === 'venda' && e.valor_venda)
      .reduce((sum: number, e: any) => sum + (e.valor_venda || 0), 0);

    return JSON.parse(JSON.stringify({
      entradas,
      saidas,
      saldo,
      valor_vendas,
    }));
  },

  async getHistoricoAnimal(animal_id: string): Promise<MovimentacaoListItem[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .select(
        `id, tipo, data_evento, observacoes, comprador, valor_venda, lote_id_destino, motivo_descarte,
         animal_id, animais:animal_id(id, brinco, nome, categoria, tipo_rebanho, peso_atual)`
      )
      .eq('animal_id', animal_id)
      .in('tipo', ['morte', 'venda', 'nascimento', 'transferencia_lote', 'descarte'])
      .is('deleted_at', null)
      .order('data_evento', { ascending: true });

    if (error) throw error;

    const resultado = (data || []).map((item: any) => ({
      id: item.id,
      tipo: item.tipo,
      data_evento: item.data_evento,
      observacoes: item.observacoes,
      comprador: item.comprador,
      valor_venda: item.valor_venda,
      lote_id_destino: item.lote_id_destino,
      motivo_descarte: item.motivo_descarte,
      animal_id: item.animal_id,
      brinco: item.animais?.brinco || '',
      nome: item.animais?.nome || null,
      categoria: item.animais?.categoria || '',
      tipo_rebanho: item.animais?.tipo_rebanho || '',
      peso_atual: item.animais?.peso_atual || null,
      lote_nome: null,
    }));

    return JSON.parse(JSON.stringify(resultado));
  },
};

// ---------------------------------------------------------------------------
// FUNÇÕES DE REGISTRO
// ---------------------------------------------------------------------------

export async function registrarNascimento(payload: RegistrarNascimentoPayload): Promise<EventoRebanho> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .insert({
      animal_id: payload.animal_id,
      tipo: 'nascimento',
      data_evento: payload.data_evento,
      observacoes: payload.observacoes,
    })
    .select('id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at')
    .single();

  if (error) throw error;
  return JSON.parse(JSON.stringify(data as EventoRebanho));
}

export async function registrarCompra(payload: RegistrarCompraPayload): Promise<EventoRebanho> {
  const supabase = await createSupabaseServerClient();

  // Construir observações com dados de compra
  const obs = [
    `Fornecedor: ${payload.fornecedor}`,
    payload.peso_entrada_kg ? `Peso entrada: ${payload.peso_entrada_kg} kg` : null,
    payload.valor_pago ? `Valor pago: R$ ${payload.valor_pago.toFixed(2)}` : null,
    payload.observacoes || null,
  ]
    .filter(Boolean)
    .join('\n');

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .insert({
      animal_id: payload.animal_id,
      tipo: 'compra',
      data_evento: payload.data_evento,
      observacoes: obs,
      comprador: payload.fornecedor, // reutilizar campo comprador
    })
    .select('id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at')
    .single();

  if (error) throw error;
  return JSON.parse(JSON.stringify(data as EventoRebanho));
}

export async function registrarVenda(payload: RegistrarVendaPayload): Promise<EventoRebanho[]> {
  const supabase = await createSupabaseServerClient();

  // Inserir evento de venda para cada animal
  const eventos = [];
  for (const animal_id of payload.animal_ids) {
    const { data: evento, error: eventoError } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id,
        tipo: 'venda',
        data_evento: payload.data_evento,
        comprador: payload.comprador,
        valor_venda: payload.valor_recebido || null,
        observacoes: payload.observacoes,
      })
      .select('id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at')
      .single();

    if (eventoError) throw eventoError;
    eventos.push(evento as EventoRebanho);

    // Atualizar status do animal para Vendido
    const { error: updateError } = await supabase
      .from('animais')
      .update({
        status: 'Vendido',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', animal_id);

    if (updateError) throw updateError;
  }

  return JSON.parse(JSON.stringify(eventos));
}

export async function registrarMorte(payload: RegistrarMortePayload): Promise<EventoRebanho> {
  const supabase = await createSupabaseServerClient();

  const obs = [
    `Causa: ${payload.causa_morte}`,
    payload.observacoes || null,
  ]
    .filter(Boolean)
    .join('\n');

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .insert({
      animal_id: payload.animal_id,
      tipo: 'morte',
      data_evento: payload.data_evento,
      observacoes: obs,
    })
    .select('id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at')
    .single();

  if (error) throw error;

  // Atualizar status do animal para Morto
  const { error: updateError } = await supabase
    .from('animais')
    .update({
      status: 'Morto',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', payload.animal_id);

  if (updateError) throw updateError;

  return JSON.parse(JSON.stringify(data as EventoRebanho));
}

export async function registrarDescarte(payload: RegistrarDescartePayload): Promise<EventoRebanho> {
  const supabase = await createSupabaseServerClient();

  const obs = [
    `Motivo: ${payload.motivo_descarte}`,
    payload.observacoes || null,
  ]
    .filter(Boolean)
    .join('\n');

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .insert({
      animal_id: payload.animal_id,
      tipo: 'descarte',
      data_evento: payload.data_evento,
      motivo_descarte: payload.motivo_descarte,
      observacoes: obs,
    })
    .select('id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at')
    .single();

  if (error) throw error;

  // Atualizar status do animal para Descartado
  const { error: updateError } = await supabase
    .from('animais')
    .update({
      status: 'Descartado',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', payload.animal_id);

  if (updateError) throw updateError;

  return JSON.parse(JSON.stringify(data as EventoRebanho));
}

export async function registrarAbateProprio(payload: RegistrarAbatePropioPayload): Promise<EventoRebanho> {
  const supabase = await createSupabaseServerClient();

  const obs = [
    `Peso abate: ${payload.peso_abate_kg} kg`,
    payload.rendimento_carcaca_pct ? `Rendimento carcaça: ${payload.rendimento_carcaca_pct}%` : null,
    payload.observacoes || null,
  ]
    .filter(Boolean)
    .join('\n');

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .insert({
      animal_id: payload.animal_id,
      tipo: 'abate_proprio',
      data_evento: payload.data_evento,
      observacoes: obs,
    })
    .select('id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at')
    .single();

  if (error) throw error;

  // Atualizar status do animal para Descartado
  const { error: updateError } = await supabase
    .from('animais')
    .update({
      status: 'Descartado',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', payload.animal_id);

  if (updateError) throw updateError;

  return JSON.parse(JSON.stringify(data as EventoRebanho));
}

export async function registrarTransferencia(payload: RegistrarTransferenciaPayload): Promise<EventoRebanho[]> {
  const supabase = await createSupabaseServerClient();

  const eventos = [];

  for (const animal_id of payload.animal_ids) {
    const { data: evento, error: eventoError } = await supabase
      .from('eventos_rebanho')
      .insert({
        animal_id,
        tipo: 'transferencia_lote',
        data_evento: payload.data_evento,
        lote_id_destino: payload.lote_destino_id,
        observacoes: payload.observacoes,
      })
      .select('id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at')
      .single();

    if (eventoError) throw eventoError;
    eventos.push(evento as EventoRebanho);

    // Atualizar lote do animal
    const { error: updateError } = await supabase
      .from('animais')
      .update({
        lote_id: payload.lote_destino_id,
      })
      .eq('id', animal_id);

    if (updateError) throw updateError;
  }

  return JSON.parse(JSON.stringify(eventos));
}
