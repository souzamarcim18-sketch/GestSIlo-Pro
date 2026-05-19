CREATE TABLE IF NOT EXISTS public.movimentacoes_produto (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id        uuid        NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo              text        NOT NULL,
  tipo_entrada      varchar     NULL,
  tipo_saida        varchar     NULL,
  quantidade        numeric     NOT NULL,
  valor_unitario    numeric     NULL,
  data              date        NOT NULL DEFAULT CURRENT_DATE,
  responsavel       text        NULL,
  observacoes       text        NULL,
  origem            varchar     NOT NULL DEFAULT 'manual',
  sinal_ajuste      smallint    NULL,
  receita_id        uuid        NULL REFERENCES public.financeiro(id) ON DELETE SET NULL,
  insumo_id_destino uuid        NULL REFERENCES public.insumos(id) ON DELETE SET NULL,
  criado_por        uuid        NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_mov_produto_tipo
    CHECK (tipo = ANY (ARRAY['Entrada','Saída','Ajuste'])),
  CONSTRAINT chk_mov_produto_tipo_entrada
    CHECK (tipo_entrada IS NULL OR tipo_entrada = ANY (
      ARRAY['COLHEITA','COMPRA','TRANSFERENCIA_INSUMO','AJUSTE_INICIAL']
    )),
  CONSTRAINT chk_mov_produto_tipo_saida
    CHECK (tipo_saida IS NULL OR tipo_saida = ANY (
      ARRAY['VENDA','CONSUMO_PROPRIO','PERDA','DOACAO','TRANSFERENCIA_INSUMO','DESCARTE']
    )),
  CONSTRAINT chk_mov_produto_sinal_ajuste
    CHECK (sinal_ajuste IS NULL OR sinal_ajuste = ANY (ARRAY[-1,1])),
  CONSTRAINT chk_mov_produto_quantidade_pos
    CHECK (quantidade > 0),
  CONSTRAINT chk_mov_produto_origem
    CHECK (origem = ANY (ARRAY['manual','rebanho','talhao','silo']))
);

-- Trigger: atualizar produtos.estoque_atual após INSERT
CREATE OR REPLACE FUNCTION public.trg_fn_mov_produto_atualiza_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  delta numeric;
BEGIN
  IF NEW.tipo = 'Entrada' THEN
    delta := NEW.quantidade;
  ELSIF NEW.tipo = 'Saída' THEN
    delta := -NEW.quantidade;
  ELSIF NEW.tipo = 'Ajuste' THEN
    delta := NEW.quantidade * NEW.sinal_ajuste;
  ELSE
    RETURN NEW;
  END IF;

  UPDATE public.produtos
  SET estoque_atual = estoque_atual + delta
  WHERE id = NEW.produto_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mov_produto_atualiza_estoque
  AFTER INSERT ON public.movimentacoes_produto
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_mov_produto_atualiza_estoque();

-- Índices
CREATE INDEX idx_mov_produto_produto_id ON public.movimentacoes_produto USING btree (produto_id);
CREATE INDEX idx_mov_produto_data       ON public.movimentacoes_produto USING btree (data DESC);
CREATE INDEX idx_mov_produto_receita_id ON public.movimentacoes_produto USING btree (receita_id);

-- RLS
ALTER TABLE public.movimentacoes_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mov_produto_select_admin_visualizador"
  ON public.movimentacoes_produto FOR SELECT
  TO authenticated
  USING (
    produto_id IN (
      SELECT id FROM public.produtos
      WHERE fazenda_id = public.get_minha_fazenda_id()
    )
    AND public.sou_admin_ou_visualizador()
  );

CREATE POLICY "mov_produto_insert_admin"
  ON public.movimentacoes_produto FOR INSERT
  TO authenticated
  WITH CHECK (
    produto_id IN (
      SELECT id FROM public.produtos
      WHERE fazenda_id = public.get_minha_fazenda_id()
    )
    AND public.sou_admin()
  );

CREATE POLICY "mov_produto_update_admin"
  ON public.movimentacoes_produto FOR UPDATE
  TO authenticated
  USING (public.sou_admin());

CREATE POLICY "mov_produto_delete_admin"
  ON public.movimentacoes_produto FOR DELETE
  TO authenticated
  USING (public.sou_admin());
