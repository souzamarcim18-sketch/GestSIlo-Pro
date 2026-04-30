-- Migration: Rebanho Fase 1 - Update (Decisões Confirmadas)
-- Data: 2026-04-30
-- Descrição: Alterações incrementais para implementar decisões confirmadas
--            Campo brinco, permissões Admin-only para animais/lotes, Operador INSERT eventos

-- ==================== BACKUP & MIGRATION DE DADOS ====================

-- Adicionar coluna brinco (se não existir)
ALTER TABLE public.animais
ADD COLUMN IF NOT EXISTS brinco TEXT;

-- Migrar dados de numero_animal para brinco
UPDATE public.animais
SET brinco = numero_animal
WHERE brinco IS NULL AND numero_animal IS NOT NULL;

-- Adicionar NOT NULL constraint a brinco
ALTER TABLE public.animais
ALTER COLUMN brinco SET NOT NULL;

-- ==================== REMOVER ÍNDICE ANTIGO ====================

-- Remover unique index antigo se existir
DROP INDEX IF EXISTS public.idx_animais_numero_animal_unique_not_deleted;
DROP INDEX IF EXISTS public.idx_animais_numero_animal;

-- ==================== CRIAR NOVOS ÍNDICES ====================

-- Partial Unique Index: brinco único por fazenda (apenas não-deletados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_animais_brinco_fazenda_id_not_deleted
  ON public.animais(fazenda_id, brinco)
  WHERE deleted_at IS NULL;

-- Index para busca rápida por brinco
CREATE INDEX IF NOT EXISTS idx_animais_brinco
  ON public.animais(fazenda_id, brinco);

-- ==================== ATUALIZAR RLS POLICIES ====================

-- DROP antigas policies de animais
DROP POLICY IF EXISTS "animais_select" ON public.animais;
DROP POLICY IF EXISTS "animais_insert" ON public.animais;
DROP POLICY IF EXISTS "animais_update" ON public.animais;
DROP POLICY IF EXISTS "animais_delete" ON public.animais;

-- CREATE novas policies: Admin-only para INSERT/UPDATE/DELETE
CREATE POLICY "animais_select" ON public.animais
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND
    (deleted_at IS NULL OR sou_admin())
  );

CREATE POLICY "animais_insert" ON public.animais
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "animais_update" ON public.animais
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "animais_delete" ON public.animais
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== ATUALIZAR RLS POLICIES (LOTES) ====================

-- DROP antigas policies de lotes
DROP POLICY IF EXISTS "lotes_select_mesma_fazenda" ON public.lotes;
DROP POLICY IF EXISTS "lotes_insert" ON public.lotes;
DROP POLICY IF EXISTS "lotes_update" ON public.lotes;
DROP POLICY IF EXISTS "lotes_delete" ON public.lotes;

-- CREATE novas policies: Admin-only para INSERT/UPDATE/DELETE
CREATE POLICY "lotes_select" ON public.lotes
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_insert" ON public.lotes
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_update" ON public.lotes
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_delete" ON public.lotes
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== ATUALIZAR RLS POLICIES (EVENTOS_REBANHO) ====================

-- DROP antiga policy UPDATE
DROP POLICY IF EXISTS "eventos_rebanho_update" ON public.eventos_rebanho;

-- CREATE nova policy UPDATE: imutável (FALSE)
CREATE POLICY "eventos_rebanho_update" ON public.eventos_rebanho
  FOR UPDATE
  USING (FALSE);

-- ==================== ATUALIZAR RLS POLICIES (PESOS_ANIMAL) ====================

-- DROP antigas policies SELECT
DROP POLICY IF EXISTS "pesos_animal_select_mesma_fazenda" ON public.pesos_animal;
DROP POLICY IF EXISTS "pesos_animal_select" ON public.pesos_animal;

-- CREATE nova policy SELECT com nome padrão
CREATE POLICY "pesos_animal_select" ON public.pesos_animal
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

-- ==================== REMOVER COLUNA numero_animal (OPCIONAL) ====================
-- Descomente apenas se tiver certeza que não precisa mais (DESTRUTIVO)
-- ALTER TABLE public.animais DROP COLUMN IF EXISTS numero_animal;

-- ==================== FIM DA MIGRATION ====================
