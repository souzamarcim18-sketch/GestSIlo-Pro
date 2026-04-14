-- FASE 0: Adicionar coluna subtipo e criar RLS policies
-- Data: 2026-04-13
-- Dependências:
--   - 20260413_silos_reformulacao.sql
--   - 20260413_criar_avaliacoes_tabelas.sql

-- ========================================
-- 1. ADICIONAR COLUNA SUBTIPO EM MOVIMENTACOES_SILO
-- ========================================

ALTER TABLE movimentacoes_silo
  ADD COLUMN IF NOT EXISTS subtipo VARCHAR(50);

-- ========================================
-- 2. RLS POLICIES - AVALIACOES_BROMATOLOGICAS
-- ========================================

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE avaliacoes_bromatologicas ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "avaliacoes_bromatologicas_select_by_fazenda" ON avaliacoes_bromatologicas
  FOR SELECT
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );

-- INSERT policy
CREATE POLICY "avaliacoes_bromatologicas_insert_by_fazenda" ON avaliacoes_bromatologicas
  FOR INSERT
  WITH CHECK (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );

-- UPDATE policy
CREATE POLICY "avaliacoes_bromatologicas_update_by_fazenda" ON avaliacoes_bromatologicas
  FOR UPDATE
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  )
  WITH CHECK (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );

-- DELETE policy
CREATE POLICY "avaliacoes_bromatologicas_delete_by_fazenda" ON avaliacoes_bromatologicas
  FOR DELETE
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );

-- ========================================
-- 3. RLS POLICIES - AVALIACOES_PSPS
-- ========================================

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE avaliacoes_psps ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "avaliacoes_psps_select_by_fazenda" ON avaliacoes_psps
  FOR SELECT
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );

-- INSERT policy
CREATE POLICY "avaliacoes_psps_insert_by_fazenda" ON avaliacoes_psps
  FOR INSERT
  WITH CHECK (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );

-- UPDATE policy
CREATE POLICY "avaliacoes_psps_update_by_fazenda" ON avaliacoes_psps
  FOR UPDATE
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  )
  WITH CHECK (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );

-- DELETE policy
CREATE POLICY "avaliacoes_psps_delete_by_fazenda" ON avaliacoes_psps
  FOR DELETE
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = (auth.jwt() ->> 'fazenda_id')::uuid
    )
  );
