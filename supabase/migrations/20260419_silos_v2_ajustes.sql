-- =============================================================================
-- Migration: 20260419_silos_v2_ajustes.sql
-- Propósito: Corrigir divergências nas tabelas existentes (não recriar do zero)
-- Aplicar junto com o código no mesmo deploy.
-- =============================================================================

-- =============================================================================
-- PARTE 1: SILOS — campo de custo para silos sem talhão
-- =============================================================================
ALTER TABLE public.silos
  ADD COLUMN IF NOT EXISTS custo_aquisicao_rs_ton NUMERIC(12, 2);

-- =============================================================================
-- PARTE 2: MOVIMENTACOES_SILO — CHECK constraint e índice único de entrada
-- =============================================================================

-- CHECK: valores permitidos em subtipo (subtipo = NULL é permitido para entradas de sistema)
ALTER TABLE public.movimentacoes_silo
  ADD CONSTRAINT movimentacoes_silo_subtipo_check
  CHECK (
    subtipo IS NULL
    OR subtipo IN ('Ensilagem', 'Uso na alimentação', 'Descarte', 'Transferência', 'Venda')
  );

-- Sanity check: abortar se já existem silos com múltiplas entradas
-- Deve vir ANTES do UNIQUE INDEX para evitar falha silenciosa
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.movimentacoes_silo
    WHERE tipo = 'Entrada'
    GROUP BY silo_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Migration abortada: silos com múltiplas entradas detectados. '
      'Corrija os dados manualmente antes de reaplicar esta migration.';
  END IF;
END $$;

-- UNIQUE INDEX parcial: segunda linha de defesa após sanity check
-- Garante que cada silo tem no máximo 1 movimentação de entrada
CREATE UNIQUE INDEX IF NOT EXISTS movimentacoes_silo_uma_entrada_por_silo
  ON public.movimentacoes_silo (silo_id)
  WHERE tipo = 'Entrada';

-- =============================================================================
-- PARTE 3: AVALIACOES_BROMATOLOGICAS — remover campos fora do escopo RF-3,
--           corrigir CHECK em momento, adicionar UNIQUE
-- =============================================================================

-- Remover EE e MM (fora do escopo — RF-3 define apenas MS, PB, FDN, FDA, Amido, NDT, pH)
ALTER TABLE public.avaliacoes_bromatologicas
  DROP COLUMN IF EXISTS ee,
  DROP COLUMN IF EXISTS mm;

-- CHECK constraint para momento (a migration original não incluía)
ALTER TABLE public.avaliacoes_bromatologicas
  ADD CONSTRAINT avaliacoes_brom_momento_check
  CHECK (momento IN ('Fechamento', 'Abertura', 'Monitoramento'));

-- UNIQUE: impede duplicata de avaliação para mesmo silo/data/momento
ALTER TABLE public.avaliacoes_bromatologicas
  ADD CONSTRAINT avaliacoes_brom_unique_silo_data_momento
  UNIQUE (silo_id, data, momento);

-- =============================================================================
-- PARTE 4: AVALIACOES_PSPS — remover status_peneira_* GENERATED (calculados no TS),
--           corrigir fórmula tmp_mm, adicionar CHECK e UNIQUE
-- =============================================================================

-- Remover colunas status_peneira_* (calculadas no TypeScript, não no BD)
-- Motivo: faixas ideais dependem de kernel_processor — lógica que não cabe em GENERATED
ALTER TABLE public.avaliacoes_psps
  DROP COLUMN IF EXISTS status_peneira_19mm,
  DROP COLUMN IF EXISTS status_peneira_8_19mm,
  DROP COLUMN IF EXISTS status_peneira_4_8mm,
  DROP COLUMN IF EXISTS status_peneira_fundo_4mm;

-- Recriar tmp_mm com a fórmula correta (pesos reais do PSPS por faixa de mm)
-- A migration original usava pesos incorretos: 19, 13.5, 6, 0
ALTER TABLE public.avaliacoes_psps DROP COLUMN IF EXISTS tmp_mm;
ALTER TABLE public.avaliacoes_psps
  ADD COLUMN tmp_mm NUMERIC(5, 2) GENERATED ALWAYS AS (
    (peneira_19mm      / 100.0 * 26.9) +
    (peneira_8_19mm    / 100.0 * 13.5) +
    (peneira_4_8mm     / 100.0 *  6.0) +
    (peneira_fundo_4mm / 100.0 *  1.18)
  ) STORED;

-- CHECK constraint para momento
ALTER TABLE public.avaliacoes_psps
  ADD CONSTRAINT avaliacoes_psps_momento_check
  CHECK (momento IN ('Fechamento', 'Abertura', 'Monitoramento'));

-- UNIQUE: impede duplicata de avaliação para mesmo silo/data/momento
ALTER TABLE public.avaliacoes_psps
  ADD CONSTRAINT avaliacoes_psps_unique_silo_data_momento
  UNIQUE (silo_id, data, momento);

-- =============================================================================
-- PARTE 5: RLS — substituir policies com padrão errado (auth.jwt)
--           pelo padrão correto (get_my_fazenda_id)
-- =============================================================================

-- Remover as policies criadas pela migration 20260413_adicionar_subtipo_e_rls.sql
-- que usavam auth.jwt() ->> 'fazenda_id' (não funciona pois fazenda_id não está no JWT)
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_select_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_insert_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_update_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_delete_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_psps_select_by_fazenda"           ON public.avaliacoes_psps;
DROP POLICY IF EXISTS "avaliacoes_psps_insert_by_fazenda"           ON public.avaliacoes_psps;
DROP POLICY IF EXISTS "avaliacoes_psps_update_by_fazenda"           ON public.avaliacoes_psps;
DROP POLICY IF EXISTS "avaliacoes_psps_delete_by_fazenda"           ON public.avaliacoes_psps;

-- Recriar com get_my_fazenda_id() — padrão correto do projeto (ver 20260407_rls_completo.sql)
ALTER TABLE public.avaliacoes_bromatologicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_psps           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aval_brom_select" ON public.avaliacoes_bromatologicas
  FOR SELECT USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "aval_brom_insert" ON public.avaliacoes_bromatologicas
  FOR INSERT WITH CHECK (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "aval_brom_update" ON public.avaliacoes_bromatologicas
  FOR UPDATE
  USING     (silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()))
  WITH CHECK(silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()));

CREATE POLICY "aval_brom_delete" ON public.avaliacoes_bromatologicas
  FOR DELETE USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "aval_psps_select" ON public.avaliacoes_psps
  FOR SELECT USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "aval_psps_insert" ON public.avaliacoes_psps
  FOR INSERT WITH CHECK (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "aval_psps_update" ON public.avaliacoes_psps
  FOR UPDATE
  USING     (silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()))
  WITH CHECK(silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()));

CREATE POLICY "aval_psps_delete" ON public.avaliacoes_psps
  FOR DELETE USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- PARTE 6: BACKFILL — criar movimentação de entrada para silos já cadastrados
--          que tenham volume_ensilado_ton_mv > 0 e ainda sem entrada registrada
-- =============================================================================

-- Sanity check antes do INSERT: abortar se existirem silos em estado impossível
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.silos
    WHERE volume_ensilado_ton_mv > 0
      AND data_fechamento IS NULL
      AND created_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration abortada: silos sem data_fechamento e sem created_at encontrados. '
      'Verifique os dados.';
  END IF;
END $$;

-- INSERT de backfill idempotente via NOT EXISTS
-- Usa COALESCE(data_fechamento, created_at::date) como data da entrada retroativa
INSERT INTO public.movimentacoes_silo (
  silo_id, tipo, subtipo, quantidade, data, talhao_id, responsavel, observacao
)
SELECT
  s.id                                                    AS silo_id,
  'Entrada'                                               AS tipo,
  'Ensilagem'                                             AS subtipo,
  COALESCE(s.volume_ensilado_ton_mv, 0)                   AS quantidade,
  COALESCE(s.data_fechamento, s.created_at::date)         AS data,
  s.talhao_id                                             AS talhao_id,
  'Sistema (backfill)'                                    AS responsavel,
  'Entrada retroativa gerada automaticamente na migração' AS observacao
FROM public.silos s
WHERE
  s.volume_ensilado_ton_mv IS NOT NULL
  AND s.volume_ensilado_ton_mv > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.movimentacoes_silo m
    WHERE m.silo_id = s.id AND m.tipo = 'Entrada'
  );
-- Nota: idempotente via NOT EXISTS — seguro rodar novamente se necessário
