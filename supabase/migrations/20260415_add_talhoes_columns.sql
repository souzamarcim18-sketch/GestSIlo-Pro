-- Migration: Adicionar colunas necessárias para o módulo de Talhões
-- Data: 2026-04-15
-- Objetivo: Preparar tabelas maquinas e insumos com campos obrigatórios

-- 1. Adicionar custo_hora à tabela maquinas
ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS custo_hora DECIMAL(12,2);

COMMENT ON COLUMN maquinas.custo_hora IS 'Custo operacional por hora da máquina (R$/hora)';

-- 2. Adicionar preco_unitario e categoria à tabela insumos
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS preco_unitario DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);

COMMENT ON COLUMN insumos.preco_unitario IS 'Preço unitário do insumo (R$/unidade)';
COMMENT ON COLUMN insumos.categoria IS 'Categoria adicional do insumo (ex: Herbicida, Fertilizante NPK, etc)';
