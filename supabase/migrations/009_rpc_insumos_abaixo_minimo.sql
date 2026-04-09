-- Migration: RPC para listar insumos com estoque abaixo do mínimo
-- Criado em: 2026-04-09

CREATE OR REPLACE FUNCTION get_insumos_abaixo_minimo(p_fazenda_id uuid)
RETURNS SETOF insumos
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM insumos
  WHERE fazenda_id = p_fazenda_id
    AND estoque_atual < estoque_minimo
  ORDER BY nome;
$$;
