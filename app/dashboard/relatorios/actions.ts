'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { getRelatorioMaoObra, type RelatorioMaoObraResult } from '@/lib/supabase/relatorios/mao-de-obra';
import { getRelatorioPastagens, type RelatorioPastagensResult } from '@/lib/supabase/relatorios/pastagens';
import { getRelatorioProdutos, type RelatorioProdutosResult } from '@/lib/supabase/relatorios/produtos';
import { getRelatorioFrota, type RelatorioFrotaResult } from '@/lib/supabase/relatorios/frota';
import { listMovimentacoesInsumoPorPeriodo, type MovimentacaoInsumoRow } from '@/lib/supabase/relatorios/insumos';
import { getRelatorioPlanejamentoCompras, type RelatorioPlanejamentoResult } from '@/lib/supabase/relatorios/planejamento-compras';
import { getDadosBalancoForrageiro, type RelatorioBalancoForrageiro, type PeriodoBalancoRelatorio } from '@/lib/supabase/relatorios/balanco-forrageiro';
import { getHistoricoSanitario, type EventoSanitarioRelatorio } from '@/lib/supabase/relatorios/sanidade';
import { getIndicadoresAction } from '@/app/dashboard/rebanho/indicadores/actions';

async function assertAdminOuVisualizador() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  if (profileRes.data?.perfil === 'Operador') redirect('/operador');

  const fazendaId = await getCurrentFazendaId();
  const fazendaRes = await supabase
    .from('fazendas')
    .select('nome')
    .eq('id', fazendaId)
    .single();

  return { fazendaId, fazendaNome: fazendaRes.data?.nome ?? 'Minha Fazenda' };
}

// ── Mão de Obra ───────────────────────────────────────────────────────────────

export interface GetRelatorioMaoObraParams {
  from: string; // ISO string
  to: string;   // ISO string
}

export async function getRelatorioMaoObraAction(
  params: GetRelatorioMaoObraParams
): Promise<RelatorioMaoObraResult & { fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const result = await getRelatorioMaoObra(fazendaId, new Date(params.from), new Date(params.to));
  return { ...result, fazendaNome };
}

// ── Pastagens ─────────────────────────────────────────────────────────────────

export interface GetRelatorioPastagensParams {
  from: string;
  to: string;
}

export async function getRelatorioPastagensAction(
  params: GetRelatorioPastagensParams
): Promise<RelatorioPastagensResult & { fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const result = await getRelatorioPastagens(fazendaId, new Date(params.from), new Date(params.to));
  return { ...result, fazendaNome };
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export interface GetRelatorioProdutosParams {
  from: string;
  to: string;
}

export async function getRelatorioProdutosAction(
  params: GetRelatorioProdutosParams
): Promise<RelatorioProdutosResult & { fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const result = await getRelatorioProdutos(fazendaId, new Date(params.from), new Date(params.to));
  return { ...result, fazendaNome };
}

// ── Planejamento de Compras ───────────────────────────────────────────────────

export async function getRelatorioPlanejamentoComprasAction(): Promise<RelatorioPlanejamentoResult & { fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const result = await getRelatorioPlanejamentoCompras(fazendaId);
  return { ...result, fazendaNome };
}

// ── Balanço Forrageiro ────────────────────────────────────────────────────────

export async function getRelatorioBalancoForrageiroAction(
  diasHistorico: PeriodoBalancoRelatorio
): Promise<RelatorioBalancoForrageiro & { fazendaNome: string }> {
  await assertAdminOuVisualizador();
  const supabase = await createSupabaseServerClient();
  const fazendaRes = await supabase.from('fazendas').select('nome').single();
  const fazendaNome = fazendaRes.data?.nome ?? 'Minha Fazenda';
  const result = await getDadosBalancoForrageiro(diasHistorico);
  return { ...result, fazendaNome };
}

// ── Histórico Sanitário ───────────────────────────────────────────────────────

export interface GetRelatorioSanidadeParams {
  from: string;
  to: string;
  lote_id?: string;
  tipo_evento?: string;
}

export async function getRelatorioSanidadeAction(
  params: GetRelatorioSanidadeParams
): Promise<{ eventos: EventoSanitarioRelatorio[]; fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const eventos = await getHistoricoSanitario(
    fazendaId,
    new Date(params.from),
    new Date(params.to),
    { lote_id: params.lote_id, tipo_evento: params.tipo_evento }
  );
  return { eventos, fazendaNome };
}

// ── Indicadores Zootécnicos ───────────────────────────────────────────────────

export async function getRelatorioIndicadoresRebanhoAction() {
  await assertAdminOuVisualizador();
  const supabase = await createSupabaseServerClient();

  const fazendaRes = await supabase.from('fazendas').select('nome, tipo_exploracao').single();
  const indicadoresRes = await getIndicadoresAction({ periodo: '90d' });

  return {
    fazendaNome: fazendaRes.data?.nome ?? 'Minha Fazenda',
    tipoExploracao: (fazendaRes.data?.tipo_exploracao ?? 'MISTO') as 'LEITE' | 'CORTE' | 'MISTO',
    indicadores: indicadoresRes,
  };
}

// ── Frota ─────────────────────────────────────────────────────────────────────

export interface GetRelatorioFrotaParams {
  from: string;
  to: string;
}

export async function getRelatorioFrotaAction(
  params: GetRelatorioFrotaParams
): Promise<RelatorioFrotaResult & { fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const result = await getRelatorioFrota(fazendaId, new Date(params.from), new Date(params.to));
  return { ...result, fazendaNome };
}

// ── Movimentações de Insumos ──────────────────────────────────────────────────

export interface GetMovimentacoesInsumoParams {
  from: string;
  to: string;
}

export async function getMovimentacoesInsumoAction(
  params: GetMovimentacoesInsumoParams
): Promise<{ rows: MovimentacaoInsumoRow[]; fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const rows = await listMovimentacoesInsumoPorPeriodo(fazendaId, new Date(params.from), new Date(params.to));
  return { rows, fazendaNome };
}

// ── Planejamentos de Silagem disponíveis ──────────────────────────────────────

export interface PlanejamentoSilagemItem {
  id: string;
  nome: string | null;
  created_at: string;
}

export async function listPlanejamentosSilagemAction(): Promise<{ planejamentos: PlanejamentoSilagemItem[]; fazendaNome: string }> {
  const { fazendaId, fazendaNome } = await assertAdminOuVisualizador();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('planejamentos_silagem')
    .select('id, nome, created_at')
    .eq('fazenda_id', fazendaId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    planejamentos: (data ?? []) as PlanejamentoSilagemItem[],
    fazendaNome,
  };
}

export async function getPlanejamentoSilagemParaPdfAction(id: string) {
  await assertAdminOuVisualizador();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('planejamentos_silagem')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Planejamento não encontrado');
  return data;
}
