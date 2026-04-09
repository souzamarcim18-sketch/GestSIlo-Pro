import { supabase, Financeiro } from '../supabase';

// ---------------------------------------------------------------------------
// Filtros opcionais para listagem
// ---------------------------------------------------------------------------
export interface FiltrosFinanceiro {
  tipo?: 'Receita' | 'Despesa';
  categoria?: string;
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Listagem com filtros
// ---------------------------------------------------------------------------
export async function getLancamentosByFazenda(
  fazendaId: string,
  filtros: FiltrosFinanceiro = {}
): Promise<Financeiro[]> {
  let query = supabase
    .from('financeiro')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('data', { ascending: false });

  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }
  if (filtros.categoria) {
    query = query.eq('categoria', filtros.categoria);
  }
  if (filtros.dataInicio) {
    query = query.gte('data', filtros.dataInicio);
  }
  if (filtros.dataFim) {
    query = query.lte('data', filtros.dataFim);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Financeiro[];
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export async function createLancamento(
  lancamento: Omit<Financeiro, 'id'>
): Promise<Financeiro> {
  const { data, error } = await supabase
    .from('financeiro')
    .insert(lancamento)
    .select()
    .single();
  if (error) throw error;
  return data as Financeiro;
}

export async function updateLancamento(
  id: string,
  lancamento: Partial<Financeiro>
): Promise<Financeiro> {
  const { data, error } = await supabase
    .from('financeiro')
    .update(lancamento)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Financeiro;
}

export async function deleteLancamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('financeiro')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Resumo para dashboard (receitas, despesas, saldo)
// ---------------------------------------------------------------------------
export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
}

export function calcularResumo(lancamentos: Financeiro[]): ResumoFinanceiro {
  const totalReceitas = lancamentos
    .filter((l) => l.tipo === 'Receita')
    .reduce((acc, l) => acc + l.valor, 0);
  const totalDespesas = lancamentos
    .filter((l) => l.tipo === 'Despesa')
    .reduce((acc, l) => acc + l.valor, 0);
  return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas };
}

// ---------------------------------------------------------------------------
// Fluxo de caixa mensal — agrupa por mês os últimos N meses
// Retorna array pronto para Recharts: [{ mes: 'Jan/25', receita, despesa }]
// ---------------------------------------------------------------------------
export interface PontoFluxo {
  mes: string;
  receita: number;
  despesa: number;
}

export function calcularFluxoMensal(
  lancamentos: Financeiro[],
  meses = 6
): PontoFluxo[] {
  const hoje = new Date();
  const pontos: PontoFluxo[] = [];

  for (let i = meses - 1; i >= 0; i--) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = ref.getFullYear();
    const mes = ref.getMonth(); // 0-indexed

    const label = ref.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    // "jan./25" → normaliza para "Jan/25"
    const mesFormatado = label.replace('.', '').replace('/', '/').replace(
      /^./, (c) => c.toUpperCase()
    );

    const doMes = lancamentos.filter((l) => {
      const d = new Date(l.data + 'T00:00:00');
      return d.getFullYear() === ano && d.getMonth() === mes;
    });

    pontos.push({
      mes: mesFormatado,
      receita: doMes
        .filter((l) => l.tipo === 'Receita')
        .reduce((acc, l) => acc + l.valor, 0),
      despesa: doMes
        .filter((l) => l.tipo === 'Despesa')
        .reduce((acc, l) => acc + l.valor, 0),
    });
  }

  return pontos;
}

// ---------------------------------------------------------------------------
// Categorias distintas já usadas — útil para filtro e autocompletar
// ---------------------------------------------------------------------------
export async function getCategoriasByFazenda(fazendaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('financeiro')
    .select('categoria')
    .eq('fazenda_id', fazendaId);
  if (error) throw error;
  const todas = (data ?? []).map((r: { categoria: string }) => r.categoria);
  return [...new Set<string>(todas)].sort();
}
