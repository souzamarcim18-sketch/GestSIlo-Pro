-- Migration: Fix RPC get_insumos_abaixo_minimo column mismatch
-- Issue: Function returns incorrect column names (categoria vs categoria_id, preco_unitario vs custo_medio)
-- Solution: Use simple SQL function with correct column structure

DROP FUNCTION IF EXISTS get_insumos_abaixo_minimo(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_insumos_abaixo_minimo(p_fazenda_id uuid)
RETURNS SETOF insumos
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM insumos
  WHERE fazenda_id = p_fazenda_id
    AND estoque_atual < estoque_minimo
    AND ativo = true
  ORDER BY nome;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION get_insumos_abaixo_minimo(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_insumos_abaixo_minimo(uuid) FROM anon;

COMMENT ON FUNCTION get_insumos_abaixo_minimo(uuid) IS
  'Returns insumos (supplies) below minimum stock for a given fazenda.
   Uses SECURITY DEFINER to allow authenticated access.
   Only returns ativo=true records.';
