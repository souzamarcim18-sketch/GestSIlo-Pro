-- =============================================================================
-- Migration: RLS Completo para todas as tabelas do GestSilo-Pro
-- Data: 2026-04-07
--
-- PROBLEMA: As políticas anteriores faziam queries diretas em `profiles` dentro
-- de USING(), o que causa dependência circular quando RLS está ativo em profiles.
-- SOLUÇÃO: Função auxiliar SECURITY DEFINER que lê profiles sem passar por RLS,
-- eliminando a recursão e centralizando a lógica de isolamento por fazenda.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. FUNÇÃO AUXILIAR SECURITY DEFINER
--    Lê fazenda_id do usuário logado sem passar por RLS (evita recursão).
--    Todas as policies abaixo usam esta função.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_fazenda_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fazenda_id FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_fazenda_id() IS
  'Retorna o fazenda_id do usuário autenticado. SECURITY DEFINER para evitar
   recursão quando RLS está ativo em profiles.';

-- -----------------------------------------------------------------------------
-- 0b. CORRIGIR TRIGGER DE STATUS DO TALHÃO
--     A função atualizar_status_talhao() faz UPDATE em talhoes dentro de um
--     trigger. Com RLS ativo em talhoes, isso falharia sem SECURITY DEFINER.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_status_talhao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_colheita_real IS NOT NULL THEN
    UPDATE talhoes SET status = 'Colhido' WHERE id = NEW.talhao_id;
  ELSIF NEW.data_plantio IS NOT NULL AND NEW.data_colheita_real IS NULL THEN
    UPDATE talhoes SET status = 'Plantado' WHERE id = NEW.talhao_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.atualizar_status_talhao() IS
  'Atualiza status do talhão via trigger. SECURITY DEFINER necessário para
   contornar RLS em talhoes ao disparar pelo ciclo agrícola.';

-- =============================================================================
-- 1. HABILITAR RLS EM TODAS AS TABELAS
--    (as que já estão habilitadas não são afetadas por ALTER)
-- =============================================================================
ALTER TABLE public.fazendas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_silo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talhoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_agricolas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_insumo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_maquinas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abastecimentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_campo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_rebanho    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_confinamento ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. REMOVER POLICIES EXISTENTES (idempotência)
--    Necessário para recriar tudo de forma consistente e sem conflito.
-- =============================================================================
-- Policies padrão do Supabase ("Enable all for authenticated users")
-- Estas permitem QUALQUER usuário autenticado ver dados de QUALQUER fazenda.
-- Devem ser removidas antes das policies de isolamento por fazenda entrarem.
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.fazendas;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.silos;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.movimentacoes_silo;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.talhoes;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.ciclos_agricolas;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.insumos;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.movimentacoes_insumo;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.maquinas;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.uso_maquinas;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.manutencoes;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.abastecimentos;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.financeiro;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.atividades_campo;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.categorias_rebanho;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.periodos_confinamento;

-- atividades_campo (criada em migration anterior com subquery direta)
DROP POLICY IF EXISTS "acesso_atividades_por_fazenda"  ON public.atividades_campo;

-- categorias_rebanho e periodos_confinamento (migration planejador_rebanho)
DROP POLICY IF EXISTS "acesso_fazenda_categorias"      ON public.categorias_rebanho;
DROP POLICY IF EXISTS "acesso_fazenda_periodos"        ON public.periodos_confinamento;

-- Remover qualquer policy antiga nas outras tabelas (segurança)
DROP POLICY IF EXISTS "fazendas_select"             ON public.fazendas;
DROP POLICY IF EXISTS "fazendas_insert"             ON public.fazendas;
DROP POLICY IF EXISTS "fazendas_update"             ON public.fazendas;
DROP POLICY IF EXISTS "fazendas_delete"             ON public.fazendas;

DROP POLICY IF EXISTS "profiles_select"             ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"             ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"             ON public.profiles;

DROP POLICY IF EXISTS "silos_select"                ON public.silos;
DROP POLICY IF EXISTS "silos_insert"                ON public.silos;
DROP POLICY IF EXISTS "silos_update"                ON public.silos;
DROP POLICY IF EXISTS "silos_delete"                ON public.silos;

DROP POLICY IF EXISTS "mov_silo_select"             ON public.movimentacoes_silo;
DROP POLICY IF EXISTS "mov_silo_insert"             ON public.movimentacoes_silo;
DROP POLICY IF EXISTS "mov_silo_update"             ON public.movimentacoes_silo;
DROP POLICY IF EXISTS "mov_silo_delete"             ON public.movimentacoes_silo;

DROP POLICY IF EXISTS "talhoes_select"              ON public.talhoes;
DROP POLICY IF EXISTS "talhoes_insert"              ON public.talhoes;
DROP POLICY IF EXISTS "talhoes_update"              ON public.talhoes;
DROP POLICY IF EXISTS "talhoes_delete"              ON public.talhoes;

DROP POLICY IF EXISTS "ciclos_select"               ON public.ciclos_agricolas;
DROP POLICY IF EXISTS "ciclos_insert"               ON public.ciclos_agricolas;
DROP POLICY IF EXISTS "ciclos_update"               ON public.ciclos_agricolas;
DROP POLICY IF EXISTS "ciclos_delete"               ON public.ciclos_agricolas;

DROP POLICY IF EXISTS "insumos_select"              ON public.insumos;
DROP POLICY IF EXISTS "insumos_insert"              ON public.insumos;
DROP POLICY IF EXISTS "insumos_update"              ON public.insumos;
DROP POLICY IF EXISTS "insumos_delete"              ON public.insumos;

DROP POLICY IF EXISTS "mov_insumo_select"           ON public.movimentacoes_insumo;
DROP POLICY IF EXISTS "mov_insumo_insert"           ON public.movimentacoes_insumo;
DROP POLICY IF EXISTS "mov_insumo_update"           ON public.movimentacoes_insumo;
DROP POLICY IF EXISTS "mov_insumo_delete"           ON public.movimentacoes_insumo;

DROP POLICY IF EXISTS "maquinas_select"             ON public.maquinas;
DROP POLICY IF EXISTS "maquinas_insert"             ON public.maquinas;
DROP POLICY IF EXISTS "maquinas_update"             ON public.maquinas;
DROP POLICY IF EXISTS "maquinas_delete"             ON public.maquinas;

DROP POLICY IF EXISTS "uso_maquinas_select"         ON public.uso_maquinas;
DROP POLICY IF EXISTS "uso_maquinas_insert"         ON public.uso_maquinas;
DROP POLICY IF EXISTS "uso_maquinas_update"         ON public.uso_maquinas;
DROP POLICY IF EXISTS "uso_maquinas_delete"         ON public.uso_maquinas;

DROP POLICY IF EXISTS "manutencoes_select"          ON public.manutencoes;
DROP POLICY IF EXISTS "manutencoes_insert"          ON public.manutencoes;
DROP POLICY IF EXISTS "manutencoes_update"          ON public.manutencoes;
DROP POLICY IF EXISTS "manutencoes_delete"          ON public.manutencoes;

DROP POLICY IF EXISTS "abastecimentos_select"       ON public.abastecimentos;
DROP POLICY IF EXISTS "abastecimentos_insert"       ON public.abastecimentos;
DROP POLICY IF EXISTS "abastecimentos_update"       ON public.abastecimentos;
DROP POLICY IF EXISTS "abastecimentos_delete"       ON public.abastecimentos;

DROP POLICY IF EXISTS "financeiro_select"           ON public.financeiro;
DROP POLICY IF EXISTS "financeiro_insert"           ON public.financeiro;
DROP POLICY IF EXISTS "financeiro_update"           ON public.financeiro;
DROP POLICY IF EXISTS "financeiro_delete"           ON public.financeiro;

DROP POLICY IF EXISTS "atividades_select"           ON public.atividades_campo;
DROP POLICY IF EXISTS "atividades_insert"           ON public.atividades_campo;
DROP POLICY IF EXISTS "atividades_update"           ON public.atividades_campo;
DROP POLICY IF EXISTS "atividades_delete"           ON public.atividades_campo;

DROP POLICY IF EXISTS "rebanho_cat_select"          ON public.categorias_rebanho;
DROP POLICY IF EXISTS "rebanho_cat_insert"          ON public.categorias_rebanho;
DROP POLICY IF EXISTS "rebanho_cat_update"          ON public.categorias_rebanho;
DROP POLICY IF EXISTS "rebanho_cat_delete"          ON public.categorias_rebanho;

DROP POLICY IF EXISTS "confinamento_select"         ON public.periodos_confinamento;
DROP POLICY IF EXISTS "confinamento_insert"         ON public.periodos_confinamento;
DROP POLICY IF EXISTS "confinamento_update"         ON public.periodos_confinamento;
DROP POLICY IF EXISTS "confinamento_delete"         ON public.periodos_confinamento;

-- =============================================================================
-- 3. POLICIES — FAZENDAS
--    INSERT liberado para usuário autenticado (necessário no cadastro,
--    quando o profile ainda não existe e get_my_fazenda_id() retorna NULL).
--    SELECT/UPDATE/DELETE restritos à fazenda do usuário.
-- =============================================================================
CREATE POLICY "fazendas_select" ON public.fazendas
  FOR SELECT USING (id = get_my_fazenda_id());

CREATE POLICY "fazendas_insert" ON public.fazendas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "fazendas_update" ON public.fazendas
  FOR UPDATE
  USING (id = get_my_fazenda_id())
  WITH CHECK (id = get_my_fazenda_id());

CREATE POLICY "fazendas_delete" ON public.fazendas
  FOR DELETE USING (id = get_my_fazenda_id());

-- =============================================================================
-- 4. POLICIES — PROFILES
--    Cada usuário acessa APENAS o próprio registro (id = auth.uid()).
--    Não usa get_my_fazenda_id() para evitar qualquer risco de recursão.
-- =============================================================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE não é necessário: profiles tem ON DELETE CASCADE via auth.users

-- =============================================================================
-- 5. POLICIES — SILOS (fazenda_id direto)
-- =============================================================================
CREATE POLICY "silos_select" ON public.silos
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "silos_insert" ON public.silos
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "silos_update" ON public.silos
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "silos_delete" ON public.silos
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- 6. POLICIES — MOVIMENTACOES_SILO (sem fazenda_id direto → via silos)
-- =============================================================================
CREATE POLICY "mov_silo_select" ON public.movimentacoes_silo
  FOR SELECT USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "mov_silo_insert" ON public.movimentacoes_silo
  FOR INSERT WITH CHECK (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "mov_silo_update" ON public.movimentacoes_silo
  FOR UPDATE
  USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  )
  WITH CHECK (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "mov_silo_delete" ON public.movimentacoes_silo
  FOR DELETE USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- 7. POLICIES — TALHOES (fazenda_id direto)
-- =============================================================================
CREATE POLICY "talhoes_select" ON public.talhoes
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "talhoes_insert" ON public.talhoes
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "talhoes_update" ON public.talhoes
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "talhoes_delete" ON public.talhoes
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- 8. POLICIES — CICLOS_AGRICOLAS (sem fazenda_id direto → via talhoes)
-- =============================================================================
CREATE POLICY "ciclos_select" ON public.ciclos_agricolas
  FOR SELECT USING (
    talhao_id IN (SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "ciclos_insert" ON public.ciclos_agricolas
  FOR INSERT WITH CHECK (
    talhao_id IN (SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "ciclos_update" ON public.ciclos_agricolas
  FOR UPDATE
  USING (
    talhao_id IN (SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id())
  )
  WITH CHECK (
    talhao_id IN (SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "ciclos_delete" ON public.ciclos_agricolas
  FOR DELETE USING (
    talhao_id IN (SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- 9. POLICIES — INSUMOS (fazenda_id direto)
-- =============================================================================
CREATE POLICY "insumos_select" ON public.insumos
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "insumos_insert" ON public.insumos
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "insumos_update" ON public.insumos
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "insumos_delete" ON public.insumos
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- 10. POLICIES — MOVIMENTACOES_INSUMO (sem fazenda_id direto → via insumos)
-- =============================================================================
CREATE POLICY "mov_insumo_select" ON public.movimentacoes_insumo
  FOR SELECT USING (
    insumo_id IN (SELECT id FROM public.insumos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "mov_insumo_insert" ON public.movimentacoes_insumo
  FOR INSERT WITH CHECK (
    insumo_id IN (SELECT id FROM public.insumos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "mov_insumo_update" ON public.movimentacoes_insumo
  FOR UPDATE
  USING (
    insumo_id IN (SELECT id FROM public.insumos WHERE fazenda_id = get_my_fazenda_id())
  )
  WITH CHECK (
    insumo_id IN (SELECT id FROM public.insumos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "mov_insumo_delete" ON public.movimentacoes_insumo
  FOR DELETE USING (
    insumo_id IN (SELECT id FROM public.insumos WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- 11. POLICIES — MAQUINAS (fazenda_id direto)
-- =============================================================================
CREATE POLICY "maquinas_select" ON public.maquinas
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "maquinas_insert" ON public.maquinas
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "maquinas_update" ON public.maquinas
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "maquinas_delete" ON public.maquinas
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- 12. POLICIES — USO_MAQUINAS (sem fazenda_id → via maquinas)
-- =============================================================================
CREATE POLICY "uso_maquinas_select" ON public.uso_maquinas
  FOR SELECT USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "uso_maquinas_insert" ON public.uso_maquinas
  FOR INSERT WITH CHECK (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "uso_maquinas_update" ON public.uso_maquinas
  FOR UPDATE
  USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  )
  WITH CHECK (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "uso_maquinas_delete" ON public.uso_maquinas
  FOR DELETE USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- 13. POLICIES — MANUTENCOES (sem fazenda_id → via maquinas)
-- =============================================================================
CREATE POLICY "manutencoes_select" ON public.manutencoes
  FOR SELECT USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "manutencoes_insert" ON public.manutencoes
  FOR INSERT WITH CHECK (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "manutencoes_update" ON public.manutencoes
  FOR UPDATE
  USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  )
  WITH CHECK (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "manutencoes_delete" ON public.manutencoes
  FOR DELETE USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- 14. POLICIES — ABASTECIMENTOS (sem fazenda_id → via maquinas)
-- =============================================================================
CREATE POLICY "abastecimentos_select" ON public.abastecimentos
  FOR SELECT USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "abastecimentos_insert" ON public.abastecimentos
  FOR INSERT WITH CHECK (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "abastecimentos_update" ON public.abastecimentos
  FOR UPDATE
  USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  )
  WITH CHECK (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "abastecimentos_delete" ON public.abastecimentos
  FOR DELETE USING (
    maquina_id IN (SELECT id FROM public.maquinas WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- 15. POLICIES — FINANCEIRO (fazenda_id direto)
-- =============================================================================
CREATE POLICY "financeiro_select" ON public.financeiro
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "financeiro_insert" ON public.financeiro
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "financeiro_update" ON public.financeiro
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "financeiro_delete" ON public.financeiro
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- 16. POLICIES — ATIVIDADES_CAMPO (fazenda_id direto)
--     Recriada aqui para usar get_my_fazenda_id() em vez de subquery direta.
-- =============================================================================
CREATE POLICY "atividades_select" ON public.atividades_campo
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "atividades_insert" ON public.atividades_campo
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "atividades_update" ON public.atividades_campo
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "atividades_delete" ON public.atividades_campo
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- 17. POLICIES — CATEGORIAS_REBANHO (fazenda_id direto)
--     Recriada para usar get_my_fazenda_id().
-- =============================================================================
CREATE POLICY "rebanho_cat_select" ON public.categorias_rebanho
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "rebanho_cat_insert" ON public.categorias_rebanho
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "rebanho_cat_update" ON public.categorias_rebanho
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "rebanho_cat_delete" ON public.categorias_rebanho
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- 18. POLICIES — PERIODOS_CONFINAMENTO (fazenda_id direto)
--     Recriada para usar get_my_fazenda_id().
-- =============================================================================
CREATE POLICY "confinamento_select" ON public.periodos_confinamento
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "confinamento_insert" ON public.periodos_confinamento
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "confinamento_update" ON public.periodos_confinamento
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "confinamento_delete" ON public.periodos_confinamento
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- FIM DA MIGRATION
-- Após aplicar, verifique em Supabase Dashboard > Authentication > Policies
-- que todas as 16 tabelas aparecem com policies ativas.
-- =============================================================================
