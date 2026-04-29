-- Migration: Adicionar CHECK constraints em planejamento_silagem
-- Data: 2026-04-29
-- Objetivo: Alinhar validações Zod (lib/validators/planejamento-silagem.ts) com constraints PostgreSQL
-- Status: SIMPLIFICADO - apenas constraints de planejamento_silagem (sem dados conflitantes)
-- Nota: atividades_campo tem validação Zod no frontend; constraints no banco serão adicionados após limpeza de dados

-- ============================================================================
-- REMOVER CONSTRAINTS EXISTENTES (se houver)
-- ============================================================================

ALTER TABLE public.planejamentos_silagem DROP CONSTRAINT IF EXISTS chk_periodo_dias_range;
ALTER TABLE public.planejamentos_silagem DROP CONSTRAINT IF EXISTS chk_teor_ms_percent_range;
ALTER TABLE public.planejamentos_silagem DROP CONSTRAINT IF EXISTS chk_perdas_percent_range;
ALTER TABLE public.planejamentos_silagem DROP CONSTRAINT IF EXISTS chk_produtividade_ton_mo_ha_range;
ALTER TABLE public.planejamentos_silagem DROP CONSTRAINT IF EXISTS chk_taxa_retirada_kg_m2_dia_range;

-- ============================================================================
-- ADICIONAR CHECK CONSTRAINTS EM PLANEJAMENTO_SILAGEM
-- ============================================================================

-- Validação: periodo_dias entre 1 e 365
ALTER TABLE public.planejamentos_silagem
ADD CONSTRAINT chk_periodo_dias_range
  CHECK ((parametros->>'periodo_dias')::integer >= 1 AND (parametros->>'periodo_dias')::integer <= 365);

-- Validação: teor_ms_percent entre 25 e 40
ALTER TABLE public.planejamentos_silagem
ADD CONSTRAINT chk_teor_ms_percent_range
  CHECK ((parametros->>'teor_ms_percent')::numeric >= 25 AND (parametros->>'teor_ms_percent')::numeric <= 40);

-- Validação: perdas_percent entre 15 e 30
ALTER TABLE public.planejamentos_silagem
ADD CONSTRAINT chk_perdas_percent_range
  CHECK ((parametros->>'perdas_percent')::numeric >= 15 AND (parametros->>'perdas_percent')::numeric <= 30);

-- Validação: produtividade_ton_mo_ha entre 25 e 65
ALTER TABLE public.planejamentos_silagem
ADD CONSTRAINT chk_produtividade_ton_mo_ha_range
  CHECK ((parametros->>'produtividade_ton_mo_ha')::numeric >= 25 AND (parametros->>'produtividade_ton_mo_ha')::numeric <= 65);

-- Validação: taxa_retirada_kg_m2_dia entre 200 e 350
ALTER TABLE public.planejamentos_silagem
ADD CONSTRAINT chk_taxa_retirada_kg_m2_dia_range
  CHECK ((parametros->>'taxa_retirada_kg_m2_dia')::numeric >= 200 AND (parametros->>'taxa_retirada_kg_m2_dia')::numeric <= 350);

-- ============================================================================
-- ADICIONAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice em planejamentos_silagem(fazenda_id) para queries filtradas por fazenda
CREATE INDEX IF NOT EXISTS idx_planejamentos_silagem_fazenda_id
  ON public.planejamentos_silagem(fazenda_id);

-- Índice em atividades_campo(tipo_operacao) para filtros por tipo
CREATE INDEX IF NOT EXISTS idx_atividades_campo_tipo_operacao
  ON public.atividades_campo(tipo_operacao);
