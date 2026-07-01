-- Migration 2.5 — Área do lote (produtividade por área)
-- Habilita KPIs litros/ha (leite) e @/ha ou kg/ha (corte). Opcional por lote;
-- quando ausente, o KPI de área é omitido/estimado na UI. Idempotente.

ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS area_ha numeric(10,2) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_lotes_area_ha_nonneg'
  ) THEN
    ALTER TABLE public.lotes
      ADD CONSTRAINT chk_lotes_area_ha_nonneg
      CHECK (area_ha IS NULL OR area_ha >= 0);
  END IF;
END $$;
