// lib/validators/planejamento-silagem.ts

import { z } from 'zod';

// Etapa 1: Sistema de Produção
export const Etapa1SistemaSchema = z.object({
  tipo_rebanho: z.enum(['Leite', 'Corte'], {
    message: 'Selecione um tipo de rebanho',
  }),
  sistema_producao: z.enum(['pasto', 'semiconfinado', 'confinado'], {
    message: 'Selecione um sistema de produção',
  }),
});

// Etapa 2: Rebanho (Quantidade por Categoria)
export const Etapa2RebanhoSchema = z
  .object({
    rebanho: z.record(
      z.number().int().min(0, 'Quantidade deve ser ≥ 0')
    ),
  })
  .refine(
    (data) => Object.values(data.rebanho).reduce((a, b) => a + b, 0) >= 1,
    { message: 'Cadastre ao menos 1 animal' }
  );

// Etapa 3: Parâmetros de Planejamento
export const Etapa3ParametrosSchema = z
  .object({
    periodo_dias: z
      .number()
      .int('Período deve ser inteiro')
      .min(1, 'Informe um período entre 1 e 365 dias')
      .max(365, 'Informe um período entre 1 e 365 dias'),
    cultura: z.enum(['Milho', 'Sorgo']),
    teor_ms_percent: z
      .number()
      .min(25, 'Teor de MS deve ser entre 25% e 40%')
      .max(40, 'Teor de MS deve ser entre 25% e 40%'),
    perdas_percent: z
      .number()
      .min(15, 'Perdas devem ser entre 15% e 30%')
      .max(30, 'Perdas devem ser entre 15% e 30%'),
    produtividade_ton_mo_ha: z
      .number()
      .min(25, 'Produtividade fora da faixa esperada')
      .max(65, 'Produtividade fora da faixa esperada'),
    taxa_retirada_kg_m2_dia: z
      .number()
      .min(200, 'Taxa deve ser entre 200 e 350 kg/m²/dia')
      .max(350, 'Taxa deve ser entre 200 e 350 kg/m²/dia'),
  })
  .refine(
    (data) => {
      if (data.cultura === 'Milho') {
        return (
          data.produtividade_ton_mo_ha >= 30 &&
          data.produtividade_ton_mo_ha <= 65
        );
      }
      if (data.cultura === 'Sorgo') {
        return (
          data.produtividade_ton_mo_ha >= 25 &&
          data.produtividade_ton_mo_ha <= 55
        );
      }
      return true;
    },
    { message: 'Produtividade fora da faixa para a cultura selecionada' }
  );

// Tipos Inferred do Zod
export type Etapa1Sistema = z.infer<typeof Etapa1SistemaSchema>;
export type Etapa2Rebanho = z.infer<typeof Etapa2RebanhoSchema>;
export type Etapa3Parametros = z.infer<typeof Etapa3ParametrosSchema>;
