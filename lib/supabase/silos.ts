import {
  supabase,
  type Silo,
  type MovimentacaoSilo,
  type AtividadeCampo,
  type Financeiro,
  type AvaliacaoBromatologica,
} from '../supabase';
import { q } from './queries-audit';

export async function updateSilo(id: string, silo: Partial<Silo>) {
  const { data, error } = await supabase
    .from('silos')
    .update(silo)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Silo;
}

export async function deleteSilo(id: string) {
  const { error } = await supabase
    .from('silos')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getCustoProducaoSilagem(siloId: string) {
  // 1. Buscar a primeira entrada para identificar o talhão de origem
  const { data: primeiraEntrada } = await supabase
    .from('movimentacoes_silo')
    .select('talhao_id, data')
    .eq('silo_id', siloId)
    .eq('tipo', 'Entrada')
    .order('data', { ascending: true })
    .limit(1)
    .single();

  if (!primeiraEntrada?.talhao_id) return null;

  const talhaoId = primeiraEntrada.talhao_id;

  // 2. Buscar o ciclo agrícola ativo ou mais recente desse talhão na data da entrada
  const { data: ciclo } = await supabase
    .from('ciclos_agricolas')
    .select('id')
    .eq('talhao_id', talhaoId)
    .lte('data_plantio', primeiraEntrada.data)
    .or(`data_colheita_real.is.null,data_colheita_real.gte.${primeiraEntrada.data}`)
    .order('data_plantio', { ascending: false })
    .limit(1)
    .single();

  // 3. Somar custos do financeiro vinculados ao talhão
  const { data: custosFinanceiro } = await supabase
    .from('financeiro')
    .select('valor')
    .eq('referencia_id', talhaoId)
    .eq('referencia_tipo', 'Talhão')
    .eq('tipo', 'Despesa');

  // 4. Somar custos das atividades de campo vinculadas ao ciclo
  let custoAtividades = 0;
  if (ciclo?.id) {
    const { data: atividades } = await supabase
      .from('atividades_campo')
      .select('custo_total')
      .eq('ciclo_id', ciclo.id);
    custoAtividades = (atividades as AtividadeCampo[])?.reduce((acc: number, a: AtividadeCampo) => acc + (a.custo_total || 0), 0) || 0;
  }

  const custoFinanceiroTotal = (custosFinanceiro as Financeiro[])?.reduce((acc: number, c: Financeiro) => acc + c.valor, 0) || 0;
  const custoTotal = custoFinanceiroTotal + custoAtividades;

  // 5. Somar total de toneladas ensiladas (Entradas)
  const { data: entradas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade')
    .eq('silo_id', siloId)
    .eq('tipo', 'Entrada');

  const totalToneladas = (entradas as MovimentacaoSilo[])?.reduce((acc: number, e: MovimentacaoSilo) => acc + e.quantidade, 0) || 0;

  if (totalToneladas === 0) return null;

  return {
    custoTotal,
    totalToneladas,
    custoPorTonelada: custoTotal / totalToneladas
  };
}

/**
 * Calcula a densidade do silo em kg/m³
 * Fórmula: volume (toneladas em MV) / volume físico (m³)
 * volume físico = comprimento × largura × altura (em metros)
 */
export function calcularDensidade(
  volumeTonMv: number,
  comprimento: number,
  largura: number,
  altura: number
): number {
  const volumeMetrosCubicos = comprimento * largura * altura;
  if (volumeMetrosCubicos === 0) return 0;
  // Converte toneladas para kg (1 ton = 1000 kg)
  return (volumeTonMv * 1000) / volumeMetrosCubicos;
}

/**
 * Calcula o estoque atual do silo
 * Retorna: { total: toneladas, percentage: % do volume ensilado }
 */
export async function calcularEstoqueAtual(
  siloId: string
): Promise<{ total: number; percentage: number }> {
  const { data: entradas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade')
    .eq('silo_id', siloId)
    .eq('tipo', 'Entrada');

  const { data: saidas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade')
    .eq('silo_id', siloId)
    .eq('tipo', 'Saída');

  const totalEntradas = (entradas as MovimentacaoSilo[])?.reduce(
    (acc, e) => acc + e.quantidade,
    0
  ) || 0;
  const totalSaidas = (saidas as MovimentacaoSilo[])?.reduce(
    (acc, s) => acc + s.quantidade,
    0
  ) || 0;

  const estoque = totalEntradas - totalSaidas;

  // Buscar volume ensilado para calcular percentual
  const silo = await q.silos.getById(siloId);
  const volumeEnsilado = silo.volume_ensilado_ton_mv || 0;

  const percentage = volumeEnsilado > 0 ? (estoque / volumeEnsilado) * 100 : 0;

  return {
    total: Math.max(0, estoque), // Nunca negativo
    percentage: Math.min(100, Math.max(0, percentage)), // Entre 0-100%
  };
}

/**
 * Calcula o consumo diário em ton/dia
 * Usa: Σ(saídas com subtipo='Uso na alimentação') / dias desde data_abertura_real
 */
export async function calcularConsumoDiario(
  siloId: string
): Promise<number> {
  const silo = await q.silos.getById(siloId);

  // Se não tem data de abertura real, não há consumo
  if (!silo.data_abertura_real) return 0;

  const { data: saidas } = await supabase
    .from('movimentacoes_silo')
    .select('quantidade, data')
    .eq('silo_id', siloId)
    .eq('tipo', 'Saída')
    .eq('subtipo', 'Uso na alimentação');

  const totalSaidasUso = (saidas as MovimentacaoSilo[])?.reduce(
    (acc, s) => acc + s.quantidade,
    0
  ) || 0;

  const dataAbertura = new Date(silo.data_abertura_real);
  const hoje = new Date();
  const diasDesdeAbertura = Math.max(
    1,
    Math.floor(
      (hoje.getTime() - dataAbertura.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  return totalSaidasUso / diasDesdeAbertura;
}

/**
 * Obtém o status atual do silo
 * Regras:
 * - Enchendo: tem entradas mas sem data_fechamento
 * - Fechado: tem data_fechamento, sem data_abertura_real
 * - Aberto: tem data_abertura_real, estoque > 0
 * - Vazio: estoque = 0
 * - Atenção: estoque para < 7 dias
 */
export async function obterStatusSilo(
  siloId: string
): Promise<'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção'> {
  const silo = await q.silos.getById(siloId);
  const { total: estoque } = await calcularEstoqueAtual(siloId);

  // Vazio
  if (estoque === 0) return 'Vazio';

  // Enchendo: tem entradas mas sem data_fechamento
  const { count: countEntradas } = await supabase
    .from('movimentacoes_silo')
    .select('id', { count: 'exact', head: true })
    .eq('silo_id', siloId)
    .eq('tipo', 'Entrada');

  if (countEntradas && countEntradas > 0 && !silo.data_fechamento) {
    return 'Enchendo';
  }

  // Fechado: tem data_fechamento, sem data_abertura_real
  if (silo.data_fechamento && !silo.data_abertura_real) return 'Fechado';

  // Atenção: estoque para < 7 dias
  const consumoDiario = await calcularConsumoDiario(siloId);
  if (consumoDiario > 0 && estoque / consumoDiario < 7) return 'Atenção';

  // Aberto: tem data_abertura_real, estoque > 0
  if (silo.data_abertura_real && estoque > 0) return 'Aberto';

  return 'Aberto'; // Default
}

/**
 * Obtém o último MS (matéria seca) registrado em avaliações bromatológicas
 */
export async function obterMsAtual(siloId: string): Promise<number | null> {
  const { data: avaliacoes } = await supabase
    .from('avaliacoes_bromatologicas')
    .select('ms')
    .eq('silo_id', siloId)
    .order('data', { ascending: false })
    .limit(1)
    .single();

  return (avaliacoes as AvaliacaoBromatologica | null)?.ms ?? null;
}

/**
 * Calcula quantos dias de estoque restam
 * Usa: estoque atual / consumo diário
 * Retorna null se não há consumo calculável
 */
export async function obterEstoqueParaDias(
  siloId: string
): Promise<number | null> {
  const { total: estoque } = await calcularEstoqueAtual(siloId);

  if (estoque === 0) return 0;

  const consumoDiario = await calcularConsumoDiario(siloId);

  // Se não há consumo registrado, não conseguimos calcular
  if (consumoDiario === 0) return null;

  return Math.floor(estoque / consumoDiario);
}
