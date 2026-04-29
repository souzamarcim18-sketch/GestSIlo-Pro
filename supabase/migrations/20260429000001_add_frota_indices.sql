-- =============================================================================
-- Migration: Índices de Performance para Módulo de Frota
-- Data: 2026-04-29
--
-- NOTA IMPORTANTE: Esses índices foram aplicados MANUALMENTE via SQL Editor
-- do Supabase em 29/04/2026 como parte da otimização P1 do módulo de frota.
--
-- MOTIVO: CREATE INDEX CONCURRENTLY não pode rodar dentro de blocos de
-- transação (como são as migrações automáticas do Supabase). Por isso,
-- esse arquivo documentação serve APENAS como registro da operação executada
-- manualmente no SQL Editor com CONCURRENTLY.
--
-- Objetivo: Melhorar performance de queries frequentes que filtram por fazenda_id
-- nas tabelas planos_manutencao, manutencoes, abastecimentos e uso_maquinas.
-- =============================================================================

-- =============================================================================
-- ÍNDICES CRIADOS MANUALMENTE NO SQL EDITOR COM CONCURRENTLY:
-- (Não rodam aqui, apenas para documentação)
-- =============================================================================

-- 1. Índice em planos_manutencao(fazenda_id)
--    Utilizado em queries de RLS e filtros por fazenda
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planos_manutencao_fazenda_id
--   ON public.planos_manutencao(fazenda_id);

-- 2. Índice em manutencoes(fazenda_id)
--    Utilizado em queries de RLS e filtros por fazenda
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manutencoes_fazenda_id
--   ON public.manutencoes(fazenda_id);

-- 3. Índice em abastecimentos(fazenda_id)
--    Utilizado em queries de RLS e filtros por fazenda
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abastecimentos_fazenda_id
--   ON public.abastecimentos(fazenda_id);

-- 4. Índice em uso_maquinas(fazenda_id)
--    Utilizado em queries de RLS e filtros por fazenda
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uso_maquinas_fazenda_id
--   ON public.uso_maquinas(fazenda_id);

-- =============================================================================
-- VERIFICAÇÃO DE ÍNDICES EXISTENTES (Executável nesta migração):
-- Garante que os índices foram criados, mesmo que manualmente.
-- =============================================================================

-- Verifica se idx_planos_manutencao_fazenda_id existe, senão cria (sem CONCURRENTLY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_planos_manutencao_fazenda_id'
  ) THEN
    CREATE INDEX idx_planos_manutencao_fazenda_id ON public.planos_manutencao(fazenda_id);
  END IF;
END $$;

-- Verifica se idx_manutencoes_fazenda_id existe, senão cria (sem CONCURRENTLY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_manutencoes_fazenda_id'
  ) THEN
    CREATE INDEX idx_manutencoes_fazenda_id ON public.manutencoes(fazenda_id);
  END IF;
END $$;

-- Verifica se idx_abastecimentos_fazenda_id existe, senão cria (sem CONCURRENTLY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_abastecimentos_fazenda_id'
  ) THEN
    CREATE INDEX idx_abastecimentos_fazenda_id ON public.abastecimentos(fazenda_id);
  END IF;
END $$;

-- Verifica se idx_uso_maquinas_fazenda_id existe, senão cria (sem CONCURRENTLY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_uso_maquinas_fazenda_id'
  ) THEN
    CREATE INDEX idx_uso_maquinas_fazenda_id ON public.uso_maquinas(fazenda_id);
  END IF;
END $$;

-- =============================================================================
-- FIM DA MIGRATION
-- Notas de performance:
--   - Índices criados com CONCURRENTLY manualmente em 29/04/2026
--   - Esta migração garante a existência dos índices (fallback sem CONCURRENTLY)
--   - IF NOT EXISTS: garante idempotência
--   - Impacto esperado: redução de tempo de query para filtros por fazenda
-- =============================================================================
