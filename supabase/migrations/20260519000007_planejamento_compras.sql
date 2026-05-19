-- ============================================================
-- Migration: planejamento_compras
-- Data: 2026-05-19
-- ============================================================

-- 1. Tabela principal de atividades planejadas
CREATE TABLE public.planejamentos_atividade (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  talhao_id       uuid        NOT NULL REFERENCES public.talhoes(id) ON DELETE RESTRICT,
  ciclo_id        uuid        NULL     REFERENCES public.ciclos_agricolas(id) ON DELETE SET NULL,
  tipo_operacao   varchar     NOT NULL,
  data_prevista   date        NOT NULL,
  status          varchar     NOT NULL DEFAULT 'planejada',
  observacoes     text        NULL,
  fazenda_id      uuid        NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  created_by      uuid        NULL     DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planejamentos_atividade_pkey PRIMARY KEY (id),
  CONSTRAINT planejamentos_atividade_tipo_check CHECK (
    tipo_operacao IN ('Plantio', 'Adubação de base', 'Adubação de cobertura', 'Pulverização', 'Calagem', 'Outro')
  ),
  CONSTRAINT planejamentos_atividade_status_check CHECK (
    status IN ('planejada', 'executada', 'cancelada')
  )
);

-- 2. Tabela de ligação: insumos vinculados ao planejamento
CREATE TABLE public.planejamento_insumos (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  planejamento_id     uuid        NOT NULL REFERENCES public.planejamentos_atividade(id) ON DELETE CASCADE,
  insumo_id           uuid        NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade          numeric     NOT NULL,
  fazenda_id          uuid        NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planejamento_insumos_pkey PRIMARY KEY (id),
  CONSTRAINT planejamento_insumos_unique_insumo_por_atividade UNIQUE (planejamento_id, insumo_id),
  CONSTRAINT planejamento_insumos_quantidade_positiva CHECK (quantidade > 0)
);

-- 3. Índices
CREATE INDEX idx_planejamentos_atividade_fazenda_id    ON public.planejamentos_atividade(fazenda_id);
CREATE INDEX idx_planejamentos_atividade_talhao_id     ON public.planejamentos_atividade(talhao_id);
CREATE INDEX idx_planejamentos_atividade_data_prevista ON public.planejamentos_atividade(fazenda_id, data_prevista);
CREATE INDEX idx_planejamento_insumos_insumo_id        ON public.planejamento_insumos(insumo_id);
CREATE INDEX idx_planejamento_insumos_planejamento_id  ON public.planejamento_insumos(planejamento_id);

-- 4. Função de propagação de fazenda_id via planejamento_id
CREATE OR REPLACE FUNCTION public.preencher_fazenda_id_via_planejamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := (
    SELECT fazenda_id FROM public.planejamentos_atividade WHERE id = NEW.planejamento_id
  );
  RETURN NEW;
END;
$$;

-- 5. Triggers
-- set_fazenda_id_from_talhao() e update_updated_at_planejamentos() já existem no banco
CREATE TRIGGER trg_planejamentos_atividade_fazenda_id
  BEFORE INSERT OR UPDATE ON public.planejamentos_atividade
  FOR EACH ROW EXECUTE FUNCTION set_fazenda_id_from_talhao();

CREATE TRIGGER trg_planejamentos_atividade_updated_at
  BEFORE UPDATE ON public.planejamentos_atividade
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_planejamentos();

CREATE TRIGGER trg_planejamento_insumos_fazenda_id
  BEFORE INSERT ON public.planejamento_insumos
  FOR EACH ROW EXECUTE FUNCTION preencher_fazenda_id_via_planejamento();

-- 6. RLS habilitado
ALTER TABLE public.planejamentos_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_insumos    ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies — planejamentos_atividade
-- sou_admin_ou_visualizador() e sou_admin() já existem no banco (criados pelo módulo Produtos)
CREATE POLICY planejamentos_atividade_select_todos
  ON public.planejamentos_atividade FOR SELECT TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY planejamentos_atividade_insert_admin
  ON public.planejamentos_atividade FOR INSERT TO authenticated
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY planejamentos_atividade_update_admin
  ON public.planejamentos_atividade FOR UPDATE TO authenticated
  USING  (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id());

CREATE POLICY planejamentos_atividade_delete_admin
  ON public.planejamentos_atividade FOR DELETE TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- 8. RLS Policies — planejamento_insumos
CREATE POLICY planejamento_insumos_select_todos
  ON public.planejamento_insumos FOR SELECT TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY planejamento_insumos_insert_admin
  ON public.planejamento_insumos FOR INSERT TO authenticated
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY planejamento_insumos_update_admin
  ON public.planejamento_insumos FOR UPDATE TO authenticated
  USING  (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id());

CREATE POLICY planejamento_insumos_delete_admin
  ON public.planejamento_insumos FOR DELETE TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
