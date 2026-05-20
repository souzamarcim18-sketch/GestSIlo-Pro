'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Schema para criar horário
const criarHorarioSchema = z.object({
  data_hora: z.string().datetime(),
  duracao_minutos: z.number().int().min(15).max(480).default(60),
});

type CriarHorarioInput = z.infer<typeof criarHorarioSchema>;

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

async function getMeuId(): Promise<string> {
  const client = await getClient();
  const { data: { user } } = await client.auth.getUser();
  return user?.id || '';
}

// ============================================================
// HORÁRIOS
// ============================================================

export async function listarHorariosAction() {
  try {
    const client = await getClient();
    const meuId = await getMeuId();

    const { data, error } = await client
      .from('horarios_disponiveis_consultor')
      .select('*')
      .eq('consultor_id', meuId)
      .order('data_hora', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[listarHorariosAction]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao listar horários',
    };
  }
}

export async function criarHorarioAction(payload: unknown) {
  try {
    const validated = criarHorarioSchema.parse(payload);
    const client = await getClient();
    const meuId = await getMeuId();

    // Validar data futura
    if (new Date(validated.data_hora) <= new Date()) {
      return { success: false, message: 'Data/hora deve ser no futuro' };
    }

    const { data, error } = await client
      .from('horarios_disponiveis_consultor')
      .insert({
        consultor_id: meuId,
        data_hora: validated.data_hora,
        duracao_minutos: validated.duracao_minutos,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, message: 'Horário criado com sucesso' };
  } catch (error) {
    console.error('[criarHorarioAction]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao criar horário',
    };
  }
}

export async function deletarHorarioAction(id: string) {
  try {
    const client = await getClient();

    const { error } = await client
      .from('horarios_disponiveis_consultor')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, message: 'Horário deletado com sucesso' };
  } catch (error) {
    console.error('[deletarHorarioAction]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao deletar horário',
    };
  }
}

export async function marcarIndisponibilidadeAction(id: string) {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('horarios_disponiveis_consultor')
      .update({ disponivel: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, message: 'Horário marcado como indisponível' };
  } catch (error) {
    console.error('[marcarIndisponibilidadeAction]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao atualizar horário',
    };
  }
}

export async function reativarHorarioAction(id: string) {
  try {
    const client = await getClient();

    const { data, error } = await client
      .from('horarios_disponiveis_consultor')
      .update({ disponivel: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, message: 'Horário reativado com sucesso' };
  } catch (error) {
    console.error('[reativarHorarioAction]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao reativar horário',
    };
  }
}

// Gerar múltiplos horários de uma vez (ex: segunda a sexta, 09:00-17:00)
export async function gerarHorariosPeriodoAction(payload: unknown) {
  try {
    const schema = z.object({
      data_inicio: z.string().datetime(),
      data_fim: z.string().datetime(),
      hora_inicio: z.string(), // HH:mm
      hora_fim: z.string(), // HH:mm
      intervalo_minutos: z.number().int().default(60),
      dias_semana: z.array(z.number()).default([1, 2, 3, 4, 5]), // 0=domingo, 6=sábado
    });

    const validated = schema.parse(payload);
    const client = await getClient();
    const meuId = await getMeuId();

    const horarios: Array<{ consultor_id: string; data_hora: string; duracao_minutos: number }> = [];
    const dataAtual = new Date(validated.data_inicio);
    const dataFim = new Date(validated.data_fim);

    while (dataAtual <= dataFim) {
      // Apenas em dias da semana selecionados
      if (validated.dias_semana.includes(dataAtual.getDay())) {
        const [horaInicio, minInicio] = validated.hora_inicio.split(':').map(Number);
        const [horaFim, minFim] = validated.hora_fim.split(':').map(Number);

        let horaAtual = horaInicio;
        let minAtual = minInicio;

        while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
          const dataHora = new Date(dataAtual);
          dataHora.setHours(horaAtual, minAtual, 0, 0);

          if (dataHora > new Date()) {
            horarios.push({
              consultor_id: meuId,
              data_hora: dataHora.toISOString(),
              duracao_minutos: validated.intervalo_minutos,
            });
          }

          minAtual += validated.intervalo_minutos;
          if (minAtual >= 60) {
            horaAtual += Math.floor(minAtual / 60);
            minAtual = minAtual % 60;
          }
        }
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    // Inserir todos de uma vez
    if (horarios.length === 0) {
      return { success: false, message: 'Nenhum horário válido gerado' };
    }

    const { error } = await client
      .from('horarios_disponiveis_consultor')
      .insert(horarios);

    if (error) throw error;
    return {
      success: true,
      message: `${horarios.length} horários criados com sucesso`,
    };
  } catch (error) {
    console.error('[gerarHorariosPeriodoAction]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao gerar horários',
    };
  }
}
