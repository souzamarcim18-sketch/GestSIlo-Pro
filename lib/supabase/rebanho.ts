import { supabase, CategoriaRebanho, PeriodoConfinamento } from '../supabase';

export async function getCategoriasRebanho(fazendaId: string) {
  const { data, error } = await supabase
    .from('categorias_rebanho')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('nome');
  if (error) throw error;
  return data as CategoriaRebanho[];
}

export async function upsertCategoriaRebanho(categoria: Partial<CategoriaRebanho>) {
  const { data, error } = await supabase
    .from('categorias_rebanho')
    .upsert(categoria)
    .select()
    .single();
  if (error) throw error;
  return data as CategoriaRebanho;
}

export async function deleteCategoriaRebanho(id: string) {
  const { error } = await supabase
    .from('categorias_rebanho')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getPeriodosConfinamento(fazendaId: string) {
  const { data, error } = await supabase
    .from('periodos_confinamento')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('data_inicio', { ascending: false });
  if (error) throw error;
  return data as PeriodoConfinamento[];
}

export async function upsertPeriodoConfinamento(periodo: Partial<PeriodoConfinamento>) {
  const { data, error } = await supabase
    .from('periodos_confinamento')
    .upsert(periodo)
    .select()
    .single();
  if (error) throw error;
  return data as PeriodoConfinamento;
}

export async function deletePeriodoConfinamento(id: string) {
  const { error } = await supabase
    .from('periodos_confinamento')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
