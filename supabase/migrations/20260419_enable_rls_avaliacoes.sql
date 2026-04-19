-- =====================================================
-- Migration: Enable RLS on avaliacoes tables
-- Date: 2026-04-19
-- Description: Resolves Supabase lint issue: Auth RLS Initialization Plan
--              Enables RLS and creates policies for avaliacoes_bromatologicas
--              and avaliacoes_psps tables
-- =====================================================

-- 1. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE avaliacoes_bromatologicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_psps ENABLE ROW LEVEL SECURITY;

-- 2. RLS POLICIES FOR avaliacoes_bromatologicas
-- =====================================================
-- Isolate by fazenda_id (via silo → fazenda_id relationship)

DROP POLICY IF EXISTS "avaliacoes_bromatologicas_isolado_por_fazenda" ON avaliacoes_bromatologicas;
CREATE POLICY "avaliacoes_bromatologicas_isolado_por_fazenda" ON avaliacoes_bromatologicas
  FOR ALL
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = get_my_fazenda_id()
    )
  );

-- 3. RLS POLICIES FOR avaliacoes_psps
-- =====================================================
-- Isolate by fazenda_id (via silo → fazenda_id relationship)

DROP POLICY IF EXISTS "avaliacoes_psps_isolado_por_fazenda" ON avaliacoes_psps
  FOR ALL
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = get_my_fazenda_id()
    )
  );
CREATE POLICY "avaliacoes_psps_isolado_por_fazenda" ON avaliacoes_psps
  FOR ALL
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = get_my_fazenda_id()
    )
  );
