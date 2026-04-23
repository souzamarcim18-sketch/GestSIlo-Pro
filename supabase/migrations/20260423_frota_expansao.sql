-- =============================================================================
-- Migration: Expansão do Módulo de Frota (Fase 1)
-- Data: 2026-04-23
--
-- Adiciona novos campos às tabelas existentes de frota e cria a tabela
-- planos_manutencao com RLS seguindo o padrão de get_my_fazenda_id().
-- Todos os novos campos são nullable para manter compatibilidade com dados
-- existentes. O backfill de status='Ativo' é aplicado logo após adicionar
-- a coluna.
-- =============================================================================

-- =============================================================================
-- 1. ALTER TABLE maquinas — 9 novos campos
-- =============================================================================
ALTER TABLE public.maquinas
  ADD COLUMN IF NOT EXISTS status              TEXT,
  ADD COLUMN IF NOT EXISTS numero_serie        TEXT,
  ADD COLUMN IF NOT EXISTS placa               TEXT,
  ADD COLUMN IF NOT EXISTS potencia_cv         NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS horimetro_atual     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_residual      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS vida_util_horas     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS largura_trabalho_metros NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS tratores_compativeis TEXT[];

-- CHECK constraint de status (valores válidos)
ALTER TABLE public.maquinas
  DROP CONSTRAINT IF EXISTS maquinas_status_check;
ALTER TABLE public.maquinas
  ADD CONSTRAINT maquinas_status_check
  CHECK (status IS NULL OR status IN ('Ativo', 'Em manutenção', 'Parado', 'Vendido'));

-- CHECK constraint de tipo expandido (adiciona Ensiladeira, Plantadeira/Semeadora, Implemento)
ALTER TABLE public.maquinas
  DROP CONSTRAINT IF EXISTS maquinas_tipo_check;
ALTER TABLE public.maquinas
  ADD CONSTRAINT maquinas_tipo_check
  CHECK (tipo IN (
    'Trator',
    'Ensiladeira',
    'Colheitadeira',
    'Pulverizador',
    'Plantadeira/Semeadora',
    'Implemento',
    'Caminhão',
    'Outros'
  ));

-- Backfill: máquinas sem status recebem 'Ativo'
UPDATE public.maquinas
  SET status = 'Ativo'
  WHERE status IS NULL;

-- =============================================================================
-- 2. ALTER TABLE uso_maquinas — 7 novos campos
-- =============================================================================
ALTER TABLE public.uso_maquinas
  ADD COLUMN IF NOT EXISTS horimetro_inicio    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS horimetro_fim       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS implemento_id       UUID REFERENCES public.maquinas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS talhao_id           UUID REFERENCES public.talhoes(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_operacao       TEXT,
  ADD COLUMN IF NOT EXISTS area_ha             NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS origem              TEXT DEFAULT 'manual';

-- =============================================================================
-- 3. ALTER TABLE manutencoes — 9 novos campos
-- =============================================================================
ALTER TABLE public.manutencoes
  ADD COLUMN IF NOT EXISTS status                     TEXT DEFAULT 'aberta',
  ADD COLUMN IF NOT EXISTS data_prevista              DATE,
  ADD COLUMN IF NOT EXISTS data_realizada             DATE,
  ADD COLUMN IF NOT EXISTS horimetro                  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS proxima_manutencao_horimetro NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS responsavel                TEXT,
  ADD COLUMN IF NOT EXISTS mao_de_obra_tipo           TEXT,
  ADD COLUMN IF NOT EXISTS mao_de_obra_valor          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pecas                      JSONB DEFAULT '[]';

-- =============================================================================
-- 4. ALTER TABLE abastecimentos — 3 novos campos
-- =============================================================================
ALTER TABLE public.abastecimentos
  ADD COLUMN IF NOT EXISTS preco_litro  NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS fornecedor   TEXT,
  ADD COLUMN IF NOT EXISTS horimetro    NUMERIC(10,2);

-- =============================================================================
-- 5. CREATE TABLE planos_manutencao
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.planos_manutencao (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id    UUID        NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
  descricao     TEXT        NOT NULL,
  intervalo_horas  INTEGER,
  intervalo_dias   INTEGER,
  horimetro_base   NUMERIC(10,2),
  data_base        DATE,
  ativo            BOOLEAN   NOT NULL DEFAULT true,
  fazenda_id    UUID        NOT NULL REFERENCES public.fazendas(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. RLS em planos_manutencao
--    Padrão idêntico ao de maquinas, silos e demais tabelas com fazenda_id
--    direto: 4 policies separadas usando get_my_fazenda_id().
-- =============================================================================
ALTER TABLE public.planos_manutencao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_manutencao_select" ON public.planos_manutencao;
DROP POLICY IF EXISTS "planos_manutencao_insert" ON public.planos_manutencao;
DROP POLICY IF EXISTS "planos_manutencao_update" ON public.planos_manutencao;
DROP POLICY IF EXISTS "planos_manutencao_delete" ON public.planos_manutencao;

CREATE POLICY "planos_manutencao_select" ON public.planos_manutencao
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "planos_manutencao_insert" ON public.planos_manutencao
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "planos_manutencao_update" ON public.planos_manutencao
  FOR UPDATE
  USING (fazenda_id = get_my_fazenda_id())
  WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "planos_manutencao_delete" ON public.planos_manutencao
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());

-- =============================================================================
-- FIM DA MIGRATION
-- Para reverter, aplicar: 20260423_frota_expansao_rollback.sql
-- =============================================================================
