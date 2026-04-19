-- =====================================================
-- Migration: Adicionar campo data_cadastro na tabela insumos
-- Data: 2026-04-19
-- Descrição: Adiciona campo para registrar a data de cadastro do insumo
-- =====================================================

ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS data_cadastro DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN insumos.data_cadastro IS 'Data de cadastro do insumo na fazenda';
