-- Migration: Adicionar colunas de composição NPK para Insumos (Item 4.10)
-- Data: 2026-04-07

ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS teor_n_percent   NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teor_p_percent   NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teor_k_percent   NUMERIC(5,2) DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN insumos.teor_n_percent IS 'Teor de Nitrogênio (%)';
COMMENT ON COLUMN insumos.teor_p_percent IS 'Teor de Fósforo (P2O5) (%)';
COMMENT ON COLUMN insumos.teor_k_percent IS 'Teor de Potássio (K2O) (%)';
