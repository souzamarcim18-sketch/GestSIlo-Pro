-- =============================================================================
-- Migration: Pastagens — nível de tecnologia
-- Data: 2026-06-14
-- Depende: pastagens (20260521000001)
-- Objetivo: adicionar coluna nivel_tecnologia, usada como multiplicador da
--           estimativa de produtividade da pastagem no Balanço Forrageiro.
--           baixo = 0.80 · medio = 1.00 · alto = 1.15 (multiplicador aplicado
--           no cálculo, não persistido — a coluna guarda apenas o nível).
-- =============================================================================

ALTER TABLE pastagens
  ADD COLUMN nivel_tecnologia text NOT NULL DEFAULT 'medio'
    CONSTRAINT pastagens_nivel_tecnologia_check
    CHECK (nivel_tecnologia IN ('baixo', 'medio', 'alto'));

COMMENT ON COLUMN pastagens.nivel_tecnologia IS
  'Nível de tecnologia do manejo da pastagem. Multiplica a produtividade-base estimada da espécie no Balanço Forrageiro: baixo=0.80, medio=1.00, alto=1.15. Estimativa de referência, não medição de campo.';
