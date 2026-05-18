import { supabase } from '../supabase';

export interface RetiradaPayload {
  siloId: string;
  quantidade: number;
  responsavel: string;
  loteNome?: string;
  data?: string;
  observacao?: string;
}

export interface DescartPayload {
  siloId: string;
  quantidade: number;
  responsavel: string;
  tipoPerda: string;
  motivo?: string;
  data?: string;
  observacao?: string;
}

export interface LoteSimples {
  id: string;
  nome: string;
  tipo_rebanho: string | null;
}

export async function listLotesCliente(): Promise<LoteSimples[]> {
  const { data, error } = await supabase
    .from('lotes')
    .select('id, nome, tipo_rebanho')
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LoteSimples[];
}

export async function registrarRetiradaSilo(payload: RetiradaPayload) {
  const hoje = new Date().toISOString().split('T')[0];
  const obsPartes: string[] = ['Retirada via Modo Operador'];
  if (payload.loteNome) obsPartes.push(`Lote: ${payload.loteNome}`);
  if (payload.observacao) obsPartes.push(payload.observacao);

  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .insert({
      silo_id: payload.siloId,
      tipo: 'Saída',
      subtipo: 'Uso na alimentação',
      quantidade: payload.quantidade,
      data: payload.data ?? hoje,
      responsavel: payload.responsavel,
      observacao: obsPartes.join(' | '),
    })
    .select('id, silo_id, tipo, subtipo, quantidade, data, talhao_id, responsavel, observacao')
    .single();

  if (error) throw error;
  return data;
}

export async function registrarPerdaSilo(payload: DescartPayload) {
  const hoje = new Date().toISOString().split('T')[0];
  const obsPartes: string[] = [`Descarte: ${payload.tipoPerda}`];
  if (payload.motivo) obsPartes.push(`Motivo: ${payload.motivo}`);
  if (payload.observacao) obsPartes.push(payload.observacao);
  obsPartes.push('via Modo Operador');

  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .insert({
      silo_id: payload.siloId,
      tipo: 'Saída',
      subtipo: 'Descarte',
      quantidade: payload.quantidade,
      data: payload.data ?? hoje,
      responsavel: payload.responsavel,
      observacao: obsPartes.join(' | '),
    })
    .select('id, silo_id, tipo, subtipo, quantidade, data, talhao_id, responsavel, observacao')
    .single();

  if (error) throw error;
  return data;
}
