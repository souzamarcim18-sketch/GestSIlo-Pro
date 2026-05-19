-- Adiciona 'planejamento' como valor válido para movimentacoes_insumo.origem
-- Necessário para action marcarComoCompradoAction (módulo Planejamento de Compras)

ALTER TABLE public.movimentacoes_insumo 
  DROP CONSTRAINT IF EXISTS chk_origem;

ALTER TABLE public.movimentacoes_insumo 
  ADD CONSTRAINT chk_origem 
  CHECK (
    (origem)::text = ANY (
      (ARRAY[
        'manual'::character varying,
        'talhao'::character varying,
        'frota'::character varying,
        'silo'::character varying,
        'financeiro'::character varying,
        'produto'::character varying,
        'planejamento'::character varying
      ])::text[]
    )
  );

COMMENT ON CONSTRAINT chk_origem ON public.movimentacoes_insumo IS 
  'Valores permitidos para origem da movimentação. Adicionado planejamento em 2026-05-19.';
