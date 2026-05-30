-- Migration: adiciona lona de barreira de O₂ (segunda lona opcional) à tabela silos
-- Contexto: produtor pode usar 2 lonas (cobertura principal + barreira de oxigênio)

ALTER TABLE silos
  ADD COLUMN IF NOT EXISTS insumo_lona2_id uuid REFERENCES insumos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantidade_lona2 numeric(10,3);
