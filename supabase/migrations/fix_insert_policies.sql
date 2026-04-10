-- Migration: Fix INSERT policies that are missing WITH CHECK clause

-- Fix SILOS INSERT
DROP POLICY IF EXISTS "silos_insert" ON silos;
CREATE POLICY "silos_insert" ON silos
  FOR INSERT
  WITH CHECK (fazenda_id = get_my_fazenda_id());

-- Fix TALHOES INSERT
DROP POLICY IF EXISTS "talhoes_insert" ON talhoes;
CREATE POLICY "talhoes_insert" ON talhoes
  FOR INSERT
  WITH CHECK (fazenda_id = get_my_fazenda_id());

-- Fix MAQUINAS INSERT
DROP POLICY IF EXISTS "maquinas_insert" ON maquinas;
CREATE POLICY "maquinas_insert" ON maquinas
  FOR INSERT
  WITH CHECK (fazenda_id = get_my_fazenda_id());

-- Fix MANUTENCOES INSERT
DROP POLICY IF EXISTS "manutencoes_insert" ON manutencoes;
CREATE POLICY "manutencoes_insert" ON manutencoes
  FOR INSERT
  WITH CHECK (maquina_id IN (SELECT id FROM maquinas WHERE fazenda_id = get_my_fazenda_id()));

-- Fix FINANCEIRO INSERT
DROP POLICY IF EXISTS "financeiro_insert" ON financeiro;
CREATE POLICY "financeiro_insert" ON financeiro
  FOR INSERT
  WITH CHECK (fazenda_id = get_my_fazenda_id());
