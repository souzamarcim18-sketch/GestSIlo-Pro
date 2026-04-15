/**
 * Validações Zod para o módulo de Talhões
 * Baseado em: SPEC-talhoes.md (2026-04-15)
 */

import { z } from 'zod';
import { TipoOperacao, CategoriaPulverizacao } from '@/lib/types/talhoes';

// ========== CONSTANTES ==========

export const CULTURAS_SUPORTADAS = [
  'Milho Grão',
  'Milho Silagem',
  'Soja',
  'Feijão',
  'Sorgo Grão',
  'Sorgo Silagem',
  'Trigo',
  'Trigo Silagem',
] as const;

export const TIPOS_SOLO = [
  'Latossolo',
  'Argissolo',
  'Neossolo',
  'Cambissolo',
  'Gleissolo',
  'Nitossolo',
  'Chernossolos',
  'Outro',
] as const;

// ========== SCHEMAS ==========

/**
 * Novo Talhão — Cadastro inicial
 * Campos: Identificação, Área (ha), Tipo de Solo
 * Status inicial: "Em pousio"
 */
export const talhoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  area_ha: z.number()
    .positive('Área deve ser maior que 0')
    .max(10000, 'Área deve ser menor que 10.000 ha'),
  tipo_solo: z.enum(TIPOS_SOLO),
  observacoes: z.string().max(500).nullable().optional(),
});

export type TalhaoInput = z.infer<typeof talhoSchema>;

/**
 * Novo Ciclo Agrícola
 */
export const cicloAgricolaSchema = z
  .object({
    talhao_id: z.string().uuid('ID do talhão inválido'),
    cultura: z.enum(CULTURAS_SUPORTADAS),
    data_plantio: z.string().date('Data de plantio inválida'),
    data_colheita_prevista: z.string().date('Data de colheita prevista inválida'),
  })
  .refine(
    (data) => new Date(data.data_plantio) < new Date(data.data_colheita_prevista),
    {
      message: 'Data de colheita deve ser após data de plantio',
      path: ['data_colheita_prevista'],
    }
  );

export type CicloAgricolaInput = z.infer<typeof cicloAgricolaSchema>;

/**
 * Registro de Atividade de Campo
 * Campos comuns OBRIGATÓRIOS: tipo_operacao, data, observacoes
 * Máquina/Trator: OBRIGATÓRIA para Preparo/Calagem/Gessagem/Plantio/Pulverização/Colheita
 *                 OPCIONAL para Análise de Solo e Irrigação
 * Campos específicos por tipo
 */
export const atividadeCampoSchema = z
  .object({
    ciclo_id: z.string().uuid('ID do ciclo inválido'),
    talhao_id: z.string().uuid('ID do talhão inválido'),
    tipo_operacao: z.nativeEnum(TipoOperacao),
    data: z.string().date('Data inválida'),
    maquina_id: z.string().uuid('ID da máquina inválido').nullable().optional(),
    horas_maquina: z
      .number()
      .positive('Horas deve ser maior que 0')
      .max(24, 'Horas não pode exceder 24')
      .nullable()
      .optional(),
    observacoes: z.string().max(500).nullable().optional(),
    custo_manual: z.number().positive().nullable().optional(),

    // Preparo de Solo
    tipo_operacao_solo: z
      .enum([
        'Aração',
        'Gradagem',
        'Subsolagem',
        'Escarificação',
        'Nivelamento',
        'Roçagem',
        'Destorroamento',
      ])
      .nullable()
      .optional(),

    // Calagem / Gessagem
    insumo_id: z.string().uuid('ID do insumo inválido').nullable().optional(),
    dose_ton_ha: z.number().positive().nullable().optional(),

    // Plantio
    semente_id: z.string().uuid('ID da semente inválido').nullable().optional(),
    populacao_plantas_ha: z.number().positive().nullable().optional(),
    sacos_ha: z.number().positive().nullable().optional(),
    espacamento_entre_linhas_cm: z.number().positive().nullable().optional(),

    // Pulverização
    categoria_pulverizacao: z.nativeEnum(CategoriaPulverizacao).nullable().optional(),
    dose_valor: z.number().positive().nullable().optional(),
    dose_unidade: z.enum(['L/ha', 'kg/ha']).nullable().optional(),
    volume_calda_l_ha: z.number().positive().nullable().optional(),

    // Colheita
    produtividade_ton_ha: z.number().positive().nullable().optional(),
    maquina_colheita_id: z.string().uuid().nullable().optional(),
    horas_colheita: z.number().positive().nullable().optional(),
    maquina_transporte_id: z.string().uuid().nullable().optional(),
    horas_transporte: z.number().positive().nullable().optional(),
    maquina_compactacao_id: z.string().uuid().nullable().optional(),
    horas_compactacao: z.number().positive().nullable().optional(),
    valor_terceirizacao_r: z.number().positive().nullable().optional(),

    // Análise de Solo
    custo_amostra_r: z.number().positive().nullable().optional(),
    metodo_entrada: z.enum(['Manual', 'Upload PDF']).nullable().optional(),
    url_pdf_analise: z.string().url().nullable().optional(),
    ph_cacl2: z.number().min(0).max(14).nullable().optional(),
    mo_g_dm3: z.number().positive().nullable().optional(),
    p_mg_dm3: z.number().positive().nullable().optional(),
    k_mmolc_dm3: z.number().positive().nullable().optional(),
    ca_mmolc_dm3: z.number().positive().nullable().optional(),
    mg_mmolc_dm3: z.number().positive().nullable().optional(),
    al_mmolc_dm3: z.number().positive().nullable().optional(),
    h_al_mmolc_dm3: z.number().positive().nullable().optional(),
    s_mg_dm3: z.number().positive().nullable().optional(),
    b_mg_dm3: z.number().positive().nullable().optional(),
    cu_mg_dm3: z.number().positive().nullable().optional(),
    fe_mg_dm3: z.number().positive().nullable().optional(),
    mn_mg_dm3: z.number().positive().nullable().optional(),
    zn_mg_dm3: z.number().positive().nullable().optional(),

    // Irrigação
    lamina_mm: z.number().positive().nullable().optional(),
    horas_irrigacao: z.number().positive().nullable().optional(),
    custo_por_hora_r: z.number().positive().nullable().optional(),
  })
  .refine(
    (data) => {
      // Máquina obrigatória para certos tipos
      const tiposComMaquinaObrigatoria = [
        'Aração',
        'Gradagem',
        'Subsolagem',
        'Escarificação',
        'Nivelamento',
        'Roçagem',
        'Destorroamento',
        'Calagem',
        'Gessagem',
        'Plantio',
        'Pulverização',
        'Colheita',
      ];
      if (tiposComMaquinaObrigatoria.includes(data.tipo_operacao)) {
        return data.maquina_id !== null && data.maquina_id !== undefined;
      }
      return true;
    },
    {
      message: 'Máquina/Trator é obrigatória para este tipo de operação',
      path: ['maquina_id'],
    }
  )
  .refine(
    (data) => {
      // Horas também obrigatória se máquina fornecida
      if (data.maquina_id) {
        return data.horas_maquina !== null && data.horas_maquina !== undefined && data.horas_maquina > 0;
      }
      return true;
    },
    {
      message: 'Horas de máquina é obrigatória quando máquina é fornecida',
      path: ['horas_maquina'],
    }
  );

export type AtividadeCampoInput = z.infer<typeof atividadeCampoSchema>;

/**
 * Análise de Solo — subform dentro de AtividadeCampo
 */
export const analiseSoloSchema = z.object({
  custo_amostra_r: z.number().positive('Custo deve ser maior que 0'),
  metodo_entrada: z.enum(['Manual', 'Upload PDF']),
});

export type AnaliseSoloInput = z.infer<typeof analiseSoloSchema>;
