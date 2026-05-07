-- Migration E: Adicionar tipo_rebanho a lotes
BEGIN;

ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS tipo_rebanho TEXT NULL
  CHECK (tipo_rebanho IS NULL OR tipo_rebanho IN ('leiteiro', 'corte', 'misto'));

-- Índice para filtrar lotes por tipo
CREATE INDEX IF NOT EXISTS idx_lotes_tipo_rebanho
  ON public.lotes(fazenda_id, tipo_rebanho)
  WHERE tipo_rebanho IS NOT NULL;

COMMIT;
