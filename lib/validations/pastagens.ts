import { z } from 'zod';

export const pastagemFormSchema = z.object({
  nome:               z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  especie_forrageira: z.string().max(150).optional().nullable(),
  area_total_ha:      z.number().positive('Área deve ser maior que zero'),
  sistema_pastejo:    z.enum(['rotacionado', 'continuo', 'semi_intensivo']),
  observacoes:        z.string().max(500).optional().nullable(),
});

export const piqueteFormSchema = z.object({
  pastagem_id:         z.string().uuid(),
  nome:                z.string().min(1, 'Nome obrigatório').max(50),
  area_ha:             z.number().positive('Área deve ser maior que zero'),
  ua_suportada:        z.number().positive().optional().nullable(),
  dias_descanso_ideal: z.number().int().positive().optional().nullable(),
  altura_entrada_cm:   z.number().positive().optional().nullable(),
  altura_saida_cm:     z.number().positive().optional().nullable(),
  observacoes:         z.string().max(500).optional().nullable(),
});

export const ocupacaoFormSchema = z.object({
  piquete_id:               z.string().uuid(),
  lote_id:                  z.string().uuid(),
  data_entrada:             z.string().date(),
  data_saida_prevista:      z.string().date().optional().nullable(),
  altura_dossel_entrada_cm: z.number().positive().optional().nullable(),
  observacoes:              z.string().max(500).optional().nullable(),
  quantidade_animais:       z.number().int().positive().optional().nullable(),
  peso_medio_kg:            z.number().positive().optional().nullable(),
  ua_real:                  z.number().nonnegative().optional().nullable(),
  metodo_calculo_ua:        z.enum(['peso_real', 'fator_categoria']).optional().nullable(),
});

export const fecharOcupacaoSchema = z.object({
  data_saida_real:        z.string().date(),
  altura_dossel_saida_cm: z.number().positive().optional().nullable(),
  observacoes:            z.string().max(500).optional().nullable(),
});

export const atualizarStatusPiqueteSchema = z.object({
  status: z.enum(['Em pastejo', 'Descanso', 'Em reforma', 'Interditado']),
});

export const eventoManejoFormSchema = z.object({
  piquete_id:        z.string().uuid(),
  tipo:              z.enum([
                       'adubacao_manutencao', 'calagem', 'reforma',
                       'ressemeadura', 'irrigacao', 'interdicao',
                       'rocagem', 'outro',
                     ]),
  data:              z.string().date(),
  insumo_id:         z.string().uuid().optional().nullable(),
  quantidade_insumo: z.number().positive().optional().nullable(),
  unidade_insumo:    z.string().max(20).optional().nullable(),
  dose_por_ha:       z.number().positive().optional().nullable(),
  maquina_id:        z.string().uuid().optional().nullable(),
  custo_estimado:    z.number().nonnegative().optional().nullable(),
  observacoes:       z.string().max(500).optional().nullable(),
});

export type PastagemFormData     = z.infer<typeof pastagemFormSchema>;
export type PiqueteFormData      = z.infer<typeof piqueteFormSchema>;
export type OcupacaoFormData     = z.infer<typeof ocupacaoFormSchema>;
export type FecharOcupacaoData   = z.infer<typeof fecharOcupacaoSchema>;
export type EventoManejoFormData = z.infer<typeof eventoManejoFormSchema>;
