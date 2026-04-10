import { supabase, type Silo, type MovimentacaoSilo, type AtividadeCampo, type Financeiro } from '../supabase';

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
