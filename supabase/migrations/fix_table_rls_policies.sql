-- Migration: Fix RLS Policies for all data tables
-- Removes generic policies and creates proper ones based on fazenda_id

-- =============================================
-- DROP ALL GENERIC POLICIES
-- =============================================
-- SILOS
DROP POLICY IF EXISTS "silos_delete" ON silos;
DROP POLICY IF EXISTS "silos_insert" ON silos;
DROP POLICY IF EXISTS "silos_select" ON silos;
DROP POLICY IF EXISTS "silos_update" ON silos;

-- TALHOES
DROP POLICY IF EXISTS "talhoes_delete" ON talhoes;
DROP POLICY IF EXISTS "talhoes_insert" ON talhoes;
DROP POLICY IF EXISTS "talhoes_select" ON talhoes;
DROP POLICY IF EXISTS "talhoes_update" ON talhoes;

-- MAQUINAS
DROP POLICY IF EXISTS "maquinas_delete" ON maquinas;
DROP POLICY IF EXISTS "maquinas_insert" ON maquinas;
DROP POLICY IF EXISTS "maquinas_select" ON maquinas;
DROP POLICY IF EXISTS "maquinas_update" ON maquinas;

-- MANUTENCOES
DROP POLICY IF EXISTS "manutencoes_delete" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_insert" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_select" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_update" ON manutencoes;

-- FINANCEIRO
DROP POLICY IF EXISTS "financeiro_delete" ON financeiro;
DROP POLICY IF EXISTS "financeiro_insert" ON financeiro;
DROP POLICY IF EXISTS "financeiro_select" ON financeiro;
DROP POLICY IF EXISTS "financeiro_update" ON financeiro;

-- =============================================
-- CREATE NEW POLICIES FOR SILOS
-- =============================================
CREATE POLICY "Users can read silos from their fazenda" ON silos
  FOR SELECT
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert silos in their fazenda" ON silos
  FOR INSERT
  WITH CHECK (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update silos in their fazenda" ON silos
  FOR UPDATE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete silos in their fazenda" ON silos
  FOR DELETE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

-- =============================================
-- CREATE NEW POLICIES FOR TALHOES
-- =============================================
CREATE POLICY "Users can read talhoes from their fazenda" ON talhoes
  FOR SELECT
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert talhoes in their fazenda" ON talhoes
  FOR INSERT
  WITH CHECK (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update talhoes in their fazenda" ON talhoes
  FOR UPDATE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete talhoes in their fazenda" ON talhoes
  FOR DELETE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

-- =============================================
-- CREATE NEW POLICIES FOR MAQUINAS
-- =============================================
CREATE POLICY "Users can read maquinas from their fazenda" ON maquinas
  FOR SELECT
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert maquinas in their fazenda" ON maquinas
  FOR INSERT
  WITH CHECK (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update maquinas in their fazenda" ON maquinas
  FOR UPDATE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete maquinas in their fazenda" ON maquinas
  FOR DELETE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

-- =============================================
-- CREATE NEW POLICIES FOR MANUTENCOES
-- =============================================
CREATE POLICY "Users can read manutencoes from their fazenda" ON manutencoes
  FOR SELECT
  USING (maquina_id IN (SELECT id FROM maquinas WHERE fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert manutencoes in their fazenda" ON manutencoes
  FOR INSERT
  WITH CHECK (maquina_id IN (SELECT id FROM maquinas WHERE fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update manutencoes in their fazenda" ON manutencoes
  FOR UPDATE
  USING (maquina_id IN (SELECT id FROM maquinas WHERE fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete manutencoes in their fazenda" ON manutencoes
  FOR DELETE
  USING (maquina_id IN (SELECT id FROM maquinas WHERE fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid())));

-- =============================================
-- CREATE NEW POLICIES FOR FINANCEIRO
-- =============================================
CREATE POLICY "Users can read financeiro from their fazenda" ON financeiro
  FOR SELECT
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert financeiro in their fazenda" ON financeiro
  FOR INSERT
  WITH CHECK (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update financeiro in their fazenda" ON financeiro
  FOR UPDATE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete financeiro in their fazenda" ON financeiro
  FOR DELETE
  USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));
