-- Suporte completo a venda de silagem (Cenário B — ver PRD §5.4 e §6.7)
ALTER TABLE public.movimentacoes_silo
  ADD COLUMN IF NOT EXISTS valor_unitario numeric NULL,
  ADD COLUMN IF NOT EXISTS comprador      varchar NULL,
  ADD COLUMN IF NOT EXISTS receita_id     uuid    NULL
    REFERENCES public.financeiro(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mov_silo_receita_id
  ON public.movimentacoes_silo USING btree (receita_id);
