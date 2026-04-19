-- =====================================================
-- Migration: Adicionar 'Ajuste' como tipo válido em movimentacoes_insumo
-- Data: 2026-04-19
-- Problema: Constraint só permitia 'Entrada' e 'Saída'
-- =====================================================

-- 1. Remover constraint antiga
ALTER TABLE movimentacoes_insumo
  DROP CONSTRAINT movimentacoes_insumo_tipo_check;

-- 2. Adicionar nova constraint com 'Ajuste'
ALTER TABLE movimentacoes_insumo
  ADD CONSTRAINT movimentacoes_insumo_tipo_check
    CHECK (tipo IN ('Entrada', 'Saída', 'Ajuste'));

COMMENT ON CONSTRAINT movimentacoes_insumo_tipo_check ON movimentacoes_insumo
  IS 'Tipos válidos: Entrada, Saída, Ajuste (inventário)';
