-- Migration 2.4 — CCS (contagem de células somáticas) em produções leiteiras
-- Entrada manual do laudo (sem integração automática). Opcional por registro.
-- Unidade: mil células / mL. Idempotente.

ALTER TABLE public.producoes_leiteiras
  ADD COLUMN IF NOT EXISTS ccs_mil_cel_ml numeric(10,2) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_producoes_leiteiras_ccs_nonneg'
  ) THEN
    ALTER TABLE public.producoes_leiteiras
      ADD CONSTRAINT chk_producoes_leiteiras_ccs_nonneg
      CHECK (ccs_mil_cel_ml IS NULL OR ccs_mil_cel_ml >= 0);
  END IF;
END $$;
