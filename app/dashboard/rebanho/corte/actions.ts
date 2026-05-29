'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sou_admin } from '@/lib/auth/helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PesoAnimal } from '@/lib/types/rebanho';

// ========== REGISTRAR PESAGEM EM LOTE ==========

export async function registrarPesagemLoteAction(
  formData: unknown
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const admin = await sou_admin();
    if (!admin) {
      return { success: false, error: 'Apenas administradores podem registrar pesagens.' };
    }

    const schema = z.object({
      lote_id: z.string().uuid('Lote inválido'),
      data_pesagem: z.string().refine((val) => {
        const d = new Date(val);
        return !isNaN(d.getTime()) && d <= new Date();
      }, 'Data inválida ou futura'),
      metodo: z.enum(['balanca', 'estimativa_visual']).default('balanca'),
      pesagens: z.array(
        z.object({
          animal_id: z.string().uuid('Animal inválido'),
          peso_kg: z.number().positive('Peso deve ser > 0').max(2000),
          condicao_corporal: z.number().int().min(1).max(5).optional().nullable(),
        })
      ).min(1, 'Pelo menos um animal obrigatório'),
    });

    const parsed = schema.parse(formData);
    const supabase = await createSupabaseServerClient();

    // Inserir múltiplas pesagens
    const insercoesData = parsed.pesagens.map((p) => ({
      animal_id: p.animal_id,
      data_pesagem: parsed.data_pesagem,
      peso_kg: p.peso_kg,
      metodo: parsed.metodo,
      condicao_corporal: p.condicao_corporal || null,
      observacoes: null,
    }));

    const { error } = await supabase.from('pesos_animal').insert(insercoesData);

    if (error) throw error;

    revalidatePath('/dashboard/rebanho/corte');
    revalidatePath('/dashboard/rebanho/[id]');
    return { success: true, count: parsed.pesagens.length };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}
