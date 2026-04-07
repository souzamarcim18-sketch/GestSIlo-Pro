import { supabase } from '../supabase';

export async function registrarRetiradaSilo(siloId: string, quantidade: number, responsavel: string) {
  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .insert({
      silo_id: siloId,
      tipo: 'Saída',
      quantidade: quantidade,
      data: new Date().toISOString().split('T')[0],
      responsavel: responsavel,
      observacao: 'Retirada via Modo Operador'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function registrarPerdaSilo(siloId: string, quantidade: number, tipoPerda: string, responsavel: string) {
  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .insert({
      silo_id: siloId,
      tipo: 'Saída',
      quantidade: quantidade,
      data: new Date().toISOString().split('T')[0],
      responsavel: responsavel,
      observacao: `Perda: ${tipoPerda} (via Modo Operador)`
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
