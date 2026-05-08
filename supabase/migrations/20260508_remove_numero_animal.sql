-- Migration: Remove legacy numero_animal column
-- Descrição: Remove coluna numero_animal que foi migrada para brinco
-- Data: 2026-05-08

BEGIN;

-- Drop unique index antigo (se existir)
DROP INDEX IF EXISTS public.idx_animais_numero_animal_unique_not_deleted;
DROP INDEX IF EXISTS public.idx_animais_numero_animal;

-- Remove a coluna numero_animal (dados já foram migrados para brinco)
ALTER TABLE public.animais
DROP COLUMN IF EXISTS numero_animal;

COMMIT;
