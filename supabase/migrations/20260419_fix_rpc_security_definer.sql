-- Migration: Fix RPC functions with SECURITY DEFINER to validate user permissions
-- Ensures that functions using SECURITY DEFINER properly validate user access

-- Function: get_insumos_abaixo_minimo
-- Issue: SECURITY DEFINER without fazenda_id validation
-- Fix: Add check to ensure user owns the fazenda
DROP FUNCTION IF EXISTS get_insumos_abaixo_minimo(uuid);

CREATE OR REPLACE FUNCTION get_insumos_abaixo_minimo(p_fazenda_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  categoria text,
  tipo text,
  unidade text,
  estoque_atual numeric,
  estoque_minimo numeric,
  estoque_maximo numeric,
  preco_unitario numeric,
  fornecedor_id uuid,
  fazenda_id uuid,
  data_cadastro timestamptz,
  data_atualizacao timestamptz,
  subtipo text,
  concentracao_npk text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Verify user has access to this fazenda
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND fazenda_id = p_fazenda_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not have permission for this fazenda';
  END IF;

  -- Return insumos below minimum stock
  RETURN QUERY
  SELECT
    i.id,
    i.nome,
    i.categoria,
    i.tipo,
    i.unidade,
    i.estoque_atual,
    i.estoque_minimo,
    i.estoque_maximo,
    i.preco_unitario,
    i.fornecedor_id,
    i.fazenda_id,
    i.data_cadastro,
    i.data_atualizacao,
    i.subtipo,
    i.concentracao_npk
  FROM insumos i
  WHERE i.fazenda_id = p_fazenda_id
    AND i.estoque_atual < i.estoque_minimo
  ORDER BY i.nome;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION get_insumos_abaixo_minimo(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_insumos_abaixo_minimo(uuid) FROM anon;

-- Commit message:
-- Add user permission validation to RPC function get_insumos_abaixo_minimo to prevent unauthorized fazenda access
