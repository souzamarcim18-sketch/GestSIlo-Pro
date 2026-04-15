-- Migration: Criar estrutura base do módulo Talhões (Bloco 1)
-- Data: 2026-04-15
-- Contém: tabelas talhoes, ciclos_agricolas, atividades_campo, eventos_dap
--         trigger de cálculo de análise de solo, RLS policies

-- Limpar estruturas antigas se existirem
DROP TRIGGER IF EXISTS trg_calcular_analise_solo ON public.atividades_campo;
DROP TABLE IF EXISTS public.eventos_dap CASCADE;
DROP TABLE IF EXISTS public.atividades_campo CASCADE;
DROP TABLE IF EXISTS public.ciclos_agricolas CASCADE;
DROP TABLE IF EXISTS public.talhoes CASCADE;

-- =============================================================================
-- TABELA: talhoes
-- =============================================================================
CREATE TABLE public.talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  area_ha DECIMAL(10,2) NOT NULL,
  tipo_solo VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Em pousio',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT area_positive CHECK (area_ha > 0)
);

CREATE INDEX idx_talhoes_fazenda_id ON public.talhoes(fazenda_id);
ALTER TABLE public.talhoes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TABELA: ciclos_agricolas
-- =============================================================================
CREATE TABLE public.ciclos_agricolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talhao_id UUID NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  cultura VARCHAR(100) NOT NULL,
  data_plantio DATE NOT NULL,
  data_colheita_prevista DATE NOT NULL,
  data_colheita_real DATE,
  produtividade_ton_ha DECIMAL(10,2),
  custo_total_estimado DECIMAL(15,2),
  permite_rebrota BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT colheita_after_plantio CHECK (data_colheita_prevista > data_plantio),
  CONSTRAINT produtividade_positive CHECK (produtividade_ton_ha IS NULL OR produtividade_ton_ha > 0)
);

CREATE INDEX idx_ciclos_agricolas_talhao_id ON public.ciclos_agricolas(talhao_id);
CREATE INDEX idx_ciclos_agricolas_ativo ON public.ciclos_agricolas(ativo);
ALTER TABLE public.ciclos_agricolas ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TABELA: atividades_campo
-- =============================================================================
CREATE TABLE public.atividades_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_agricolas(id) ON DELETE CASCADE,
  talhao_id UUID NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  tipo_operacao VARCHAR(50) NOT NULL,
  data DATE NOT NULL,
  maquina_id UUID REFERENCES public.maquinas(id),
  horas_maquina DECIMAL(10,2),
  observacoes TEXT,
  custo_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  custo_manual DECIMAL(15,2),

  -- Campos por tipo (JSONB para flexibilidade ou columns específicas)
  tipo_operacao_solo VARCHAR(50),
  insumo_id UUID REFERENCES public.insumos(id),
  dose_ton_ha DECIMAL(10,2),

  semente_id UUID REFERENCES public.insumos(id),
  populacao_plantas_ha DECIMAL(10,2),
  sacos_ha DECIMAL(10,2),
  espacamento_entre_linhas_cm DECIMAL(10,2),

  categoria_pulverizacao VARCHAR(50),
  dose_valor DECIMAL(10,2),
  dose_unidade VARCHAR(20),
  volume_calda_l_ha DECIMAL(10,2),

  produtividade_ton_ha DECIMAL(10,2),
  maquina_colheita_id UUID REFERENCES public.maquinas(id),
  horas_colheita DECIMAL(10,2),
  maquina_transporte_id UUID REFERENCES public.maquinas(id),
  horas_transporte DECIMAL(10,2),
  maquina_compactacao_id UUID REFERENCES public.maquinas(id),
  horas_compactacao DECIMAL(10,2),
  valor_terceirizacao_r DECIMAL(15,2),

  custo_amostra_r DECIMAL(15,2),
  metodo_entrada VARCHAR(20),
  url_pdf_analise VARCHAR(255),
  ph_cacl2 DECIMAL(5,2),
  mo_g_dm3 DECIMAL(10,2),
  p_mg_dm3 DECIMAL(10,2),
  k_mmolc_dm3 DECIMAL(10,2),
  ca_mmolc_dm3 DECIMAL(10,2),
  mg_mmolc_dm3 DECIMAL(10,2),
  al_mmolc_dm3 DECIMAL(10,2),
  h_al_mmolc_dm3 DECIMAL(10,2),
  s_mg_dm3 DECIMAL(10,2),
  b_mg_dm3 DECIMAL(10,2),
  cu_mg_dm3 DECIMAL(10,2),
  fe_mg_dm3 DECIMAL(10,2),
  mn_mg_dm3 DECIMAL(10,2),
  zn_mg_dm3 DECIMAL(10,2),
  sb_mmolc_dm3 DECIMAL(10,2),
  ctc_mmolc_dm3 DECIMAL(10,2),
  v_percent DECIMAL(10,2),

  lamina_mm DECIMAL(10,2),
  horas_irrigacao DECIMAL(10,2),
  custo_por_hora_r DECIMAL(15,2),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT horas_maquina_positive CHECK (horas_maquina IS NULL OR horas_maquina > 0)
);

CREATE INDEX idx_atividades_campo_ciclo_id ON public.atividades_campo(ciclo_id);
CREATE INDEX idx_atividades_campo_talhao_id ON public.atividades_campo(talhao_id);
CREATE INDEX idx_atividades_campo_data ON public.atividades_campo(data);
ALTER TABLE public.atividades_campo ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TABELA: eventos_dap
-- =============================================================================
CREATE TABLE public.eventos_dap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_agricolas(id) ON DELETE CASCADE,
  talhao_id UUID NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  cultura VARCHAR(100) NOT NULL,
  tipo_operacao VARCHAR(50) NOT NULL,
  dias_apos_plantio INT NOT NULL,
  dias_apos_plantio_final INT,
  data_esperada DATE,
  data_realizada DATE,
  status VARCHAR(20) DEFAULT 'Planejado',
  atividade_campo_id UUID REFERENCES public.atividades_campo(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eventos_dap_ciclo_id ON public.eventos_dap(ciclo_id);
CREATE INDEX idx_eventos_dap_status ON public.eventos_dap(status);
ALTER TABLE public.eventos_dap ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TRIGGER: calcular_analise_solo
-- Calcula automaticamente SB, CTC e V% ao inserir/atualizar análise de solo
-- =============================================================================
DROP FUNCTION IF EXISTS public.calcular_analise_solo() CASCADE;
CREATE FUNCTION public.calcular_analise_solo()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executa se for atividade de Análise de Solo com dados manuais
  IF NEW.tipo_operacao = 'Análise de Solo' AND NEW.metodo_entrada = 'Manual' THEN
    -- 1. SB = Ca + Mg + K
    NEW.sb_mmolc_dm3 := COALESCE(NEW.ca_mmolc_dm3, 0) +
                        COALESCE(NEW.mg_mmolc_dm3, 0) +
                        COALESCE(NEW.k_mmolc_dm3, 0);

    -- 2. CTC = SB + H+Al
    NEW.ctc_mmolc_dm3 := NEW.sb_mmolc_dm3 + COALESCE(NEW.h_al_mmolc_dm3, 0);

    -- 3. V% = (SB / CTC) × 100
    IF NEW.ctc_mmolc_dm3 > 0 THEN
      NEW.v_percent := (NEW.sb_mmolc_dm3 / NEW.ctc_mmolc_dm3) * 100;
    ELSE
      NEW.v_percent := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_analise_solo
  BEFORE INSERT OR UPDATE ON public.atividades_campo
  FOR EACH ROW EXECUTE FUNCTION public.calcular_analise_solo();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- TALHOES: usuário só vê talhões da sua fazenda
DROP POLICY IF EXISTS "talhoes_isolado_por_fazenda" ON public.talhoes;
CREATE POLICY "talhoes_isolado_por_fazenda" ON public.talhoes
  FOR ALL USING (fazenda_id = get_my_fazenda_id());

-- CICLOS_AGRICOLAS: via talhao_id → fazenda_id
DROP POLICY IF EXISTS "ciclos_isolado_por_fazenda" ON public.ciclos_agricolas;
CREATE POLICY "ciclos_isolado_por_fazenda" ON public.ciclos_agricolas
  FOR ALL USING (
    talhao_id IN (
      SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id()
    )
  );

-- ATIVIDADES_CAMPO: via talhao_id → fazenda_id
DROP POLICY IF EXISTS "atividades_isolado_por_fazenda" ON public.atividades_campo;
CREATE POLICY "atividades_isolado_por_fazenda" ON public.atividades_campo
  FOR ALL USING (
    talhao_id IN (
      SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id()
    )
  );

-- EVENTOS_DAP: via talhao_id → fazenda_id
DROP POLICY IF EXISTS "eventos_dap_isolado_por_fazenda" ON public.eventos_dap;
CREATE POLICY "eventos_dap_isolado_por_fazenda" ON public.eventos_dap
  FOR ALL USING (
    talhao_id IN (
      SELECT id FROM public.talhoes WHERE fazenda_id = get_my_fazenda_id()
    )
  );
