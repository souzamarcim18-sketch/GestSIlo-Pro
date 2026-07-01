'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sou_admin } from '@/lib/auth/helpers';
import { criarEventosLoteSchema } from '@/lib/validations/rebanho-lote';
import type { ResultadoLote } from '@/lib/types/rebanho-lote';

export async function criarEventosLoteAction(
  input: unknown
): Promise<{ success: boolean; data?: ResultadoLote; error?: string }> {
  try {
    const isAdmin = await sou_admin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Apenas administradores podem realizar lançamentos em lote.',
      };
    }

    const parsed = criarEventosLoteSchema.parse(input);
    const supabase = await createSupabaseServerClient();

    const tipo = parsed.tipo;
    const compartilhados = parsed.dados_compartilhados;

    // Buscar brincos para mensagens de erro amigáveis
    const { data: animaisInfo } = await supabase
      .from('animais')
      .select('id, brinco')
      .in(
        'id',
        parsed.animais.map((a) => a.animal_id)
      );

    const brincoPorId = new Map(
      (animaisInfo ?? []).map((a) => [a.id, a.brinco])
    );

    // Processar cada animal com Promise.allSettled (falha individual não cancela os demais)
    const results = await Promise.allSettled(
      parsed.animais.map(async (entrada) => {
        const ind = entrada.dados_individuais;

        // Montar payload para a RPC — campos comuns a todos os tipos
        const payload: Record<string, unknown> = {
          tipo,
          data_evento: compartilhados['data_evento'],
          observacoes: ind['observacoes'] ?? null,
        };

        // Campos por tipo — compartilhados
        if (tipo === 'cobertura') {
          payload['tipo_cobertura'] = compartilhados['tipo_cobertura'];
        }
        if (tipo === 'diagnostico_prenhez') {
          payload['metodo_diagnostico'] = compartilhados['metodo_diagnostico'];
        }
        if (tipo === 'transferencia_lote') {
          payload['lote_id_destino'] = compartilhados['lote_id_destino'];
        }
        if (tipo === 'descarte') {
          payload['motivo_descarte'] = compartilhados['motivo_descarte'];
        }
        if (tipo === 'protocolo_hormonal') {
          payload['finalidade_protocolo'] =
            compartilhados['finalidade_protocolo'];
          payload['produto_hormonal'] =
            compartilhados['produto_hormonal'] ?? null;
          payload['dose_produto'] = compartilhados['dose_produto'] ?? null;
          payload['via_aplicacao'] = compartilhados['via_aplicacao'] ?? null;
        }

        // Campos por tipo — individuais
        if (tipo === 'pesagem') {
          payload['peso_kg'] = ind['peso_kg'];
          payload['escore_condicao_corporal'] =
            ind['escore_condicao_corporal'] ?? null;
        }
        if (tipo === 'cobertura') {
          payload['reprodutor_id'] = ind['reprodutor_id'] ?? null;
        }
        if (tipo === 'diagnostico_prenhez') {
          payload['resultado_prenhez'] = ind['resultado_prenhez'];
          payload['idade_gestacional_dias'] =
            ind['idade_gestacional_dias'] ?? null;
        }
        if (tipo === 'aborto') {
          payload['causa_aborto'] = ind['causa_aborto'] ?? null;
        }
        if (tipo === 'desmame') {
          payload['peso_kg'] = ind['peso_kg'] ?? null;
        }
        if (tipo === 'aspiracao_opu') {
          payload['oocitos_coletados'] = ind['oocitos_coletados'] ?? null;
          payload['oocitos_viaveis'] = ind['oocitos_viaveis'] ?? null;
          payload['grau_qualidade_opu'] = ind['grau_qualidade_opu'] ?? null;
        }
        if (tipo === 'transferencia_embriao') {
          payload['grau_embriao'] = ind['grau_embriao'] ?? null;
          payload['raca_embriao'] = ind['raca_embriao'] ?? null;
          payload['reprodutor_id'] = ind['reprodutor_id'] ?? null;
          payload['resultado_te'] = ind['resultado_te'] ?? null;
        }

        // Usa a RPC que resolve fazenda_id internamente e atualiza status
        // do animal para Descartado/Morto/Vendido quando aplicável
        const { error } = await supabase.rpc('registrar_evento_com_status', {
          p_animal_id: entrada.animal_id,
          p_payload: payload,
        });

        if (error) throw new Error(error.message);
        return entrada.animal_id;
      })
    );

    const inseridos: string[] = [];
    const erros: ResultadoLote['erros'] = [];

    for (const [i, result] of results.entries()) {
      const animalId = parsed.animais[i].animal_id;
      if (result.status === 'fulfilled') {
        inseridos.push(animalId);
      } else {
        erros.push({
          animal_id: animalId,
          brinco: brincoPorId.get(animalId) ?? animalId,
          motivo:
            result.reason instanceof Error
              ? result.reason.message
              : 'Erro ao registrar evento',
        });
      }
    }

    if (inseridos.length > 0) {
      revalidatePath('/dashboard/rebanho');
      revalidatePath('/dashboard/rebanho/[id]', 'page');
      revalidatePath('/dashboard/rebanho/leiteira');
      revalidatePath('/dashboard/rebanho/corte');
    }

    return {
      success: inseridos.length > 0,
      data: { inseridos: inseridos.length, erros },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: 'Dados inválidos' };
    }
    return { success: false, error: 'Erro ao processar lançamento em lote' };
  }
}
