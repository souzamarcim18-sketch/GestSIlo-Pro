-- Migration 2.1 — Segmentação de Reprodutores por espécie (leite × corte)
-- Adiciona tipo_rebanho a reprodutores para que cada painel (leiteira/corte)
-- gerencie apenas os seus. dupla_aptidao aparece em ambos os painéis.
-- Idempotente.

ALTER TABLE public.reprodutores
  ADD COLUMN IF NOT EXISTS tipo_rebanho text NULL;

-- Backfill: reprodutores já cadastrados passam a valer para ambos os painéis.
UPDATE public.reprodutores
  SET tipo_rebanho = 'dupla_aptidao'
  WHERE tipo_rebanho IS NULL;

-- CHECK espelhando o Zod (leiteiro | corte | dupla_aptidao).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_reprodutores_tipo_rebanho'
  ) THEN
    ALTER TABLE public.reprodutores
      ADD CONSTRAINT chk_reprodutores_tipo_rebanho
      CHECK (tipo_rebanho IN ('leiteiro', 'corte', 'dupla_aptidao'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reprodutores_fazenda_tipo
  ON public.reprodutores USING btree (fazenda_id, tipo_rebanho);
