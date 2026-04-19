/**
 * safe-delete.ts
 *
 * Funções de deleção segura que validam dependências antes de deletar.
 * Com ON DELETE CASCADE, o banco apaga automaticamente filhos,
 * mas queremos avisar ao usuário sobre o que vai ser deletado.
 */

import { supabase } from '../supabase';

/**
 * Deleta um silo de forma segura, verificando movimentações dependentes.
 * Com ON DELETE CASCADE, todas as movimentações serão deletadas automaticamente,
 * mas o usuário merece ser avisado.
 */
export async function deleteSiloSafely(siloId: string): Promise<{
  movimentacoesCount: number;
  avaliacoesCount: number;
  permitir: boolean;
  mensagem: string;
}> {
  // 1. Contar movimentações
  const { count: movCount } = await supabase
    .from('movimentacoes_silo')
    .select('id', { count: 'exact', head: true })
    .eq('silo_id', siloId);

  // 2. Contar avaliações bromatológicas
  const { count: avaliCount } = await supabase
    .from('avaliacoes_bromatologicas')
    .select('id', { count: 'exact', head: true })
    .eq('silo_id', siloId);

  const movimentacoesCount = movCount || 0;
  const avaliacoesCount = avaliCount || 0;
  const permitir = movimentacoesCount === 0 && avaliacoesCount === 0;

  let mensagem = '';
  if (!permitir) {
    const itens = [];
    if (movimentacoesCount > 0) itens.push(`${movimentacoesCount} movimentação(ões)`);
    if (avaliacoesCount > 0) itens.push(`${avaliacoesCount} avaliação(ões)`);
    mensagem = `Não é possível deletar este silo. Ele possui ${itens.join(' e ')} associadas. Remova-as primeiro.`;
  }

  return { movimentacoesCount, avaliacoesCount, permitir, mensagem };
}

/**
 * Deleta um talhão de forma segura, verificando ciclos dependentes.
 */
export async function deleteTalhaoSafely(talhaoId: string): Promise<{
  ciclosCount: number;
  atividadesCount: number;
  permitir: boolean;
  mensagem: string;
}> {
  // 1. Contar ciclos agrícolas
  const { count: cicloCount } = await supabase
    .from('ciclos_agricolas')
    .select('id', { count: 'exact', head: true })
    .eq('talhao_id', talhaoId);

  // 2. Contar atividades de campo
  const { count: atiCount } = await supabase
    .from('atividades_campo')
    .select('id', { count: 'exact', head: true })
    .eq('talhao_id', talhaoId);

  const ciclosCount = cicloCount || 0;
  const atividadesCount = atiCount || 0;
  const permitir = ciclosCount === 0 && atividadesCount === 0;

  let mensagem = '';
  if (!permitir) {
    const itens = [];
    if (ciclosCount > 0) itens.push(`${ciclosCount} ciclo(s) agrícola(s)`);
    if (atividadesCount > 0) itens.push(`${atividadesCount} atividade(s)`);
    mensagem = `Não é possível deletar este talhão. Ele possui ${itens.join(' e ')} associadas. Finalize-as primeiro.`;
  }

  return { ciclosCount, atividadesCount, permitir, mensagem };
}

/**
 * Deleta um ciclo agrícola de forma segura.
 */
export async function deleteCicloSafely(cicloId: string): Promise<{
  atividadesCount: number;
  eventosCount: number;
  permitir: boolean;
  mensagem: string;
}> {
  // 1. Contar atividades de campo
  const { count: atiCount } = await supabase
    .from('atividades_campo')
    .select('id', { count: 'exact', head: true })
    .eq('ciclo_id', cicloId);

  // 2. Contar eventos DAP
  const { count: eventCount } = await supabase
    .from('eventos_dap')
    .select('id', { count: 'exact', head: true })
    .eq('ciclo_id', cicloId);

  const atividadesCount = atiCount || 0;
  const eventosCount = eventCount || 0;
  const permitir = atividadesCount === 0 && eventosCount === 0;

  let mensagem = '';
  if (!permitir) {
    const itens = [];
    if (atividadesCount > 0) itens.push(`${atividadesCount} atividade(s)`);
    if (eventosCount > 0) itens.push(`${eventosCount} evento(s)`);
    mensagem = `Não é possível deletar este ciclo. Ele possui ${itens.join(' e ')} associadas. Finalize-as primeiro.`;
  }

  return { atividadesCount, eventosCount, permitir, mensagem };
}

/**
 * Deleta uma máquina de forma segura.
 */
export async function deleteMaquinaSafely(maquinaId: string): Promise<{
  usoCount: number;
  manutencaoCount: number;
  abastecimentoCount: number;
  permitir: boolean;
  mensagem: string;
}> {
  // 1. Contar uso de máquinas
  const { count: usoCount } = await supabase
    .from('uso_maquinas')
    .select('id', { count: 'exact', head: true })
    .eq('maquina_id', maquinaId);

  // 2. Contar manutenções
  const { count: mantCount } = await supabase
    .from('manutencoes')
    .select('id', { count: 'exact', head: true })
    .eq('maquina_id', maquinaId);

  // 3. Contar abastecimentos
  const { count: abasCount } = await supabase
    .from('abastecimentos')
    .select('id', { count: 'exact', head: true })
    .eq('maquina_id', maquinaId);

  const usoCountNum = usoCount || 0;
  const manutencaoCount = mantCount || 0;
  const abastecimentoCount = abasCount || 0;
  const permitir = usoCountNum === 0 && manutencaoCount === 0 && abastecimentoCount === 0;

  let mensagem = '';
  if (!permitir) {
    const itens = [];
    if (usoCountNum > 0) itens.push(`${usoCountNum} registro(s) de uso`);
    if (manutencaoCount > 0) itens.push(`${manutencaoCount} manutenção(ões)`);
    if (abastecimentoCount > 0) itens.push(`${abastecimentoCount} abastecimento(s)`);
    mensagem = `Não é possível deletar esta máquina. Ela possui ${itens.join(', ')} associados. Remova-os primeiro.`;
  }

  return { usoCount: usoCountNum, manutencaoCount, abastecimentoCount, permitir, mensagem };
}

/**
 * Deleta um insumo de forma segura.
 */
export async function deleteInsumoSafely(insumoId: string): Promise<{
  movimentacoesCount: number;
  permitir: boolean;
  mensagem: string;
}> {
  // 1. Contar movimentações de insumo
  const { count: movCount } = await supabase
    .from('movimentacoes_insumo')
    .select('id', { count: 'exact', head: true })
    .eq('insumo_id', insumoId);

  const movimentacoesCount = movCount || 0;
  const permitir = movimentacoesCount === 0;

  let mensagem = '';
  if (!permitir) {
    mensagem = `Não é possível deletar este insumo. Ele possui ${movimentacoesCount} movimentação(ões) associada(s). Use soft-delete (marcar como inativo) ao invés disso.`;
  }

  return { movimentacoesCount, permitir, mensagem };
}
