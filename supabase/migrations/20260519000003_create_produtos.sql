-- Extensão trgm para busca por nome (verificar se já existe)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.produtos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text        NOT NULL,
  categoria_id     uuid        NOT NULL REFERENCES public.categorias_produto(id),
  unidade          text        NOT NULL,
  estoque_atual    numeric     NOT NULL DEFAULT 0,
  estoque_minimo   numeric     NOT NULL DEFAULT 0,
  custo_referencia numeric     NULL,
  local_armazen    varchar     NULL,
  observacoes      text        NULL,
  ativo            boolean     NOT NULL DEFAULT true,
  fazenda_id       uuid        NULL REFERENCES public.fazendas(id),
  criado_por       uuid        NULL REFERENCES auth.users(id),
  atualizado_por   uuid        NULL REFERENCES auth.users(id),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  data_cadastro    date        NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_produtos_estoque_minimo_nonneg
    CHECK (estoque_minimo >= 0),
  CONSTRAINT chk_produtos_custo_referencia_nonneg
    CHECK (custo_referencia IS NULL OR custo_referencia >= 0)
);

-- Trigger: preencher fazenda_id automaticamente via get_minha_fazenda_id()
CREATE OR REPLACE FUNCTION public.trg_fn_produtos_set_fazenda_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.fazenda_id IS NULL THEN
    NEW.fazenda_id := public.get_minha_fazenda_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_produtos_set_fazenda_id
  BEFORE INSERT ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_produtos_set_fazenda_id();

-- Trigger: atualizar atualizado_em em UPDATE
CREATE OR REPLACE FUNCTION public.trg_fn_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

-- Reutilizar função genérica se já existir; criar trigger específico
CREATE TRIGGER trg_produtos_atualizado_em
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_atualizado_em();

-- Índices
CREATE INDEX idx_produtos_fazenda_id      ON public.produtos USING btree (fazenda_id);
CREATE INDEX idx_produtos_fazenda_ativo   ON public.produtos USING btree (fazenda_id, ativo);
CREATE INDEX idx_produtos_categoria_id    ON public.produtos USING btree (categoria_id);
CREATE INDEX idx_produtos_nome_trgm       ON public.produtos USING gin   (nome gin_trgm_ops);

-- RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_select_admin_visualizador"
  ON public.produtos FOR SELECT
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin_ou_visualizador()
  );

CREATE POLICY "produtos_insert_admin"
  ON public.produtos FOR INSERT
  TO authenticated
  WITH CHECK (public.sou_admin());

CREATE POLICY "produtos_update_admin"
  ON public.produtos FOR UPDATE
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin()
  );

CREATE POLICY "produtos_delete_admin"
  ON public.produtos FOR DELETE
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin()
  );
