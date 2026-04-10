-- Migration: Add missing columns to silos table
-- The dashboard expects estoque_atual column but it doesn't exist

ALTER TABLE silos ADD COLUMN IF NOT EXISTS estoque_atual NUMERIC DEFAULT 0;
ALTER TABLE silos ADD COLUMN IF NOT EXISTS materia_seca_percent NUMERIC;
ALTER TABLE silos ADD COLUMN IF NOT EXISTS consumo_medio_diario_ton NUMERIC;
ALTER TABLE silos ADD COLUMN IF NOT EXISTS insumo_lona_id UUID;
ALTER TABLE silos ADD COLUMN IF NOT EXISTS insumo_inoculante_id UUID;
