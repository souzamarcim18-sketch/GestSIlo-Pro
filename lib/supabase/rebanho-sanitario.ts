'use server';

import { createSupabaseServerClient } from './server';
import { getCurrentUserId } from '@/lib/auth/helpers';
import type {
  EventoSanitarioRow,
  EventoSanitarioInput,
  AlertaSanitario,
  TipoEventoSanitario,
} from '@/lib/types/rebanho-sanitario';

const COLUMNS_SELECT =
  'id, fazenda_id, animal_id, tipo, data_evento, responsavel, observacoes, vacina_nome, dose, via_aplicacao, lote_produto, data_proxima_dose, diagnostico, medicamento, duracao_dias, resultado, tipo_exame, numero_protocolo, usuario_id, deleted_at, created_at, updated_at';

// ========== CRIAR EVENTO SANITÁRIO ==========

export async function criarEventoSanitario(
  payload: EventoSanitarioInput
): Promise<EventoSanitarioRow> {
  const supabase = await createSupabaseServerClient();
  const usuarioId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('eventos_sanitarios')
    .insert({
      ...payload,
      usuario_id: usuarioId,
    })
    .select(COLUMNS_SELECT)
    .single();

  if (error) throw error;
  return data as EventoSanitarioRow;
}

// ========== LISTAR POR ANIMAL ==========

export async function listEventosSanitariosPorAnimal(
  animalId: string,
  limit: number = 50,
  offset: number = 0
): Promise<EventoSanitarioRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('eventos_sanitarios')
    .select(COLUMNS_SELECT)
    .eq('animal_id', animalId)
    .is('deleted_at', null)
    .order('data_evento', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return JSON.parse(JSON.stringify((data as EventoSanitarioRow[]) || []));
}

// ========== LISTAR ALERTAS DE VACINAÇÃO ==========

export async function listAlertasVacinacao(
  diasAntecedencia: number = 15
): Promise<AlertaSanitario[]> {
  const supabase = await createSupabaseServerClient();

  // Calcular data limite (hoje + diasAntecedencia)
  const hoje = new Date();
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);
  const dataLimiteISO = dataLimite.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('eventos_sanitarios')
    .select(
      `id, animal_id, tipo, vacina_nome, data_proxima_dose,
       animais:animal_id(id, brinco, nome)`
    )
    .eq('tipo', 'vacinacao')
    .is('deleted_at', null)
    .not('data_proxima_dose', 'is', null)
    .lte('data_proxima_dose', dataLimiteISO)
    .order('data_proxima_dose', { ascending: true });

  if (error) throw error;

  type AlertaRow = { animal_id: string; animais?: { brinco?: string; nome?: string | null } | null; tipo: string; vacina_nome?: string | null; data_proxima_dose: string };
  const resultado = ((data || []) as unknown as AlertaRow[]).map((row) => {
    const diasRestantes = Math.ceil(
      (new Date(row.data_proxima_dose).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      animal_id: row.animal_id,
      animal_brinco: row.animais?.brinco || '',
      animal_nome: row.animais?.nome || null,
      tipo: row.tipo as TipoEventoSanitario,
      vacina_nome: row.vacina_nome || '',
      data_proxima_dose: row.data_proxima_dose,
      dias_para_vencimento: diasRestantes,
    };
  });

  return JSON.parse(JSON.stringify(resultado));
}

// ========== LISTAR COM FILTROS ==========

export async function listEventosSanitarios(
  filtros: {
    tipo?: TipoEventoSanitario;
    data_inicio?: string;
    data_fim?: string;
  },
  limit: number = 50,
  offset: number = 0
): Promise<EventoSanitarioRow[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('eventos_sanitarios')
    .select(COLUMNS_SELECT)
    .is('deleted_at', null);

  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }

  if (filtros.data_inicio) {
    query = query.gte('data_evento', filtros.data_inicio);
  }

  if (filtros.data_fim) {
    query = query.lte('data_evento', filtros.data_fim);
  }

  const { data, error } = await query
    .order('data_evento', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return JSON.parse(JSON.stringify((data as EventoSanitarioRow[]) || []));
}

// ========== EDITAR EVENTO SANITÁRIO ==========

export async function editarEventoSanitario(
  id: string,
  payload: Partial<EventoSanitarioInput>
): Promise<EventoSanitarioRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('eventos_sanitarios')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select(COLUMNS_SELECT)
    .single();

  if (error) throw error;
  return data as EventoSanitarioRow;
}

// ========== DELETAR EVENTO SANITÁRIO (SOFT DELETE) ==========

export async function deletarEventoSanitario(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('eventos_sanitarios')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
