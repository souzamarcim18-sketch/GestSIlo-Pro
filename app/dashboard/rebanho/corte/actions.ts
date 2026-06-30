'use server';

import { z } from 'zod';
import { criarEventosLoteAction } from '@/app/dashboard/rebanho/eventos/lote/actions';

// ========== REGISTRAR PESAGEM EM LOTE ==========
//
// Caminho ÚNICO de pesagem em lote (SPEC-rebanho345 D-3.2): esta action é uma
// FACHADA fina que delega ao wizard genérico de eventos em lote
// (`criarEventosLoteAction` → RPC `registrar_evento_com_status`). Não escreve
// mais direto em `pesos_animal`; a pesagem agora flui pela RPC → eventos_rebanho
// → trigger `eventos_rebanho_pesagem_trigger` → pesos_animal, exatamente como o
// wizard. Mantém a assinatura legada `{ success, count, error }` para não
// regredir `FormRegistroPesagemLote` (UX do corte inalterada).
//
// Nota: o campo `metodo` (balança/estimativa) não tem coluna em eventos_rebanho
// nem é propagado pelo trigger — é descartado nesta convergência (custo aceito
// do caminho único). `condicao_corporal` é preservado como escore.

export async function registrarPesagemLoteAction(
  formData: unknown
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const schema = z.object({
      lote_id: z.string().uuid('Lote inválido'),
      data_pesagem: z.string().refine((val) => {
        const d = new Date(val);
        return !isNaN(d.getTime()) && d <= new Date();
      }, 'Data inválida ou futura'),
      metodo: z.enum(['balanca', 'estimativa_visual']).default('balanca'),
      pesagens: z
        .array(
          z.object({
            animal_id: z.string().uuid('Animal inválido'),
            peso_kg: z.number().positive('Peso deve ser > 0').max(2000),
            condicao_corporal: z
              .number()
              .int()
              .min(1)
              .max(5)
              .optional()
              .nullable(),
          })
        )
        .min(1, 'Pelo menos um animal obrigatório'),
    });

    const parsed = schema.parse(formData);

    // Traduz para o contrato do wizard genérico de eventos em lote.
    const resultado = await criarEventosLoteAction({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: parsed.data_pesagem },
      animais: parsed.pesagens.map((p) => ({
        animal_id: p.animal_id,
        dados_individuais: {
          peso_kg: p.peso_kg,
          escore_condicao_corporal: p.condicao_corporal ?? null,
        },
      })),
    });

    if (!resultado.success) {
      return { success: false, error: resultado.error ?? 'Erro ao registrar pesagens' };
    }

    // Resultado parcial preservado: count = inseridos (allSettled no wizard).
    return { success: true, count: resultado.data?.inseridos ?? 0 };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}
