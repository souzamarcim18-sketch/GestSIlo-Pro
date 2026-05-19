-- Adicionar coluna de rastreabilidade bidirecional Produto → Insumo
ALTER TABLE public.movimentacoes_insumo
  ADD COLUMN IF NOT EXISTS produto_id_origem uuid NULL
    REFERENCES public.produtos(id) ON DELETE SET NULL;

-- Atualizar CHECK chk_origem para incluir 'produto'
-- Verificar nome exato do constraint antes de rodar:
--   SELECT conname FROM pg_constraint WHERE conrelid='movimentacoes_insumo'::regclass AND contype='c' AND conname LIKE '%origem%';
ALTER TABLE public.movimentacoes_insumo
  DROP CONSTRAINT IF EXISTS chk_origem;

ALTER TABLE public.movimentacoes_insumo
  ADD CONSTRAINT chk_origem CHECK (
    origem = ANY (ARRAY[
      'manual','talhao','frota','silo','financeiro','produto'
    ]::varchar[])
  );
