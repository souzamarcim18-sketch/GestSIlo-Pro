import { supabase } from '@/lib/supabase';
import type { Fazenda } from '@/lib/supabase';
import { authLog, authError } from '@/lib/auth/logger';

export interface CreateFazendaInput {
  nome: string;
  localizacao?: string | null;
  area_total?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Cria uma fazenda e vincula ao profile do usuário logado.
 * Operação atômica via RPC (transação no banco).
 */
export async function createFazenda(input: CreateFazendaInput): Promise<Fazenda> {
  // Validação de input
  const nome = input.nome?.trim();
  if (!nome) {
    throw new Error('Nome da fazenda é obrigatório');
  }
  if (input.area_total != null && input.area_total <= 0) {
    throw new Error('Área total deve ser maior que zero');
  }
  if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) {
    throw new Error('Latitude inválida');
  }
  if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) {
    throw new Error('Longitude inválida');
  }

  authLog('createFazenda: iniciando', { nome });

  const { data, error } = await supabase.rpc('create_fazenda_and_link', {
    p_nome: nome,
    p_localizacao: input.localizacao ?? null,
    p_area_total: input.area_total ?? null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
  });

  if (error || !data) {
    authError('createFazenda: erro na RPC', error);
    throw new Error(error?.message ?? 'Erro ao criar fazenda');
  }

  authLog('createFazenda: sucesso', { fazendaId: data.id });
  return data as Fazenda;
}
