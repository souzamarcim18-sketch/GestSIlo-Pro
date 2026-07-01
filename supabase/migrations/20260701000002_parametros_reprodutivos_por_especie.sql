-- Migration 2.2 — Parâmetros reprodutivos por espécie (leite × corte)
-- Hoje parametros_reprodutivos_fazenda é 1 linha por fazenda (UNIQUE(fazenda_id)).
-- Passa a ser 1 linha por (fazenda, tipo_rebanho): leiteiro e corte têm metas
-- distintas. Idempotente.

-- 1) Nova coluna tipo_rebanho.
ALTER TABLE public.parametros_reprodutivos_fazenda
  ADD COLUMN IF NOT EXISTS tipo_rebanho text NULL;

-- 2) Backfill: a linha legada de cada fazenda vira a linha 'leiteiro'.
UPDATE public.parametros_reprodutivos_fazenda
  SET tipo_rebanho = 'leiteiro'
  WHERE tipo_rebanho IS NULL;

-- 3) CHECK espelhando o Zod (leiteiro | corte).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_parametros_reprod_tipo_rebanho'
  ) THEN
    ALTER TABLE public.parametros_reprodutivos_fazenda
      ADD CONSTRAINT chk_parametros_reprod_tipo_rebanho
      CHECK (tipo_rebanho IN ('leiteiro', 'corte'));
  END IF;
END $$;

-- 4) Criar a linha 'corte' de cada fazenda, copiando as metas da 'leiteiro'.
--    Só insere se ainda não existir (idempotente).
INSERT INTO public.parametros_reprodutivos_fazenda
  (fazenda_id, tipo_rebanho, dias_gestacao, dias_seca, pve_dias,
   coberturas_para_repetidora, janela_repetidora_dias,
   meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias)
SELECT
  p.fazenda_id, 'corte', p.dias_gestacao, p.dias_seca, p.pve_dias,
  p.coberturas_para_repetidora, p.janela_repetidora_dias,
  p.meta_taxa_prenhez_pct, p.meta_psm_dias, p.meta_iep_dias
FROM public.parametros_reprodutivos_fazenda p
WHERE p.tipo_rebanho = 'leiteiro'
  AND NOT EXISTS (
    SELECT 1 FROM public.parametros_reprodutivos_fazenda c
    WHERE c.fazenda_id = p.fazenda_id AND c.tipo_rebanho = 'corte'
  );

-- 5) Trocar a UNIQUE de (fazenda_id) para (fazenda_id, tipo_rebanho).
--    O nome da constraint antiga pode variar; remover a que estiver só em fazenda_id.
DO $$
DECLARE
  old_conname text;
BEGIN
  -- Localiza a UNIQUE cujo conjunto de colunas é exatamente {fazenda_id}.
  -- Compara como text[] (att.attname é do tipo name; cast explícito evita
  -- "operator does not exist: name[] = text[]").
  SELECT con.conname INTO old_conname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'parametros_reprodutivos_fazenda'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(att.attname::text ORDER BY att.attname::text)
      FROM unnest(con.conkey) AS k(attnum)
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
    ) = ARRAY['fazenda_id']::text[]
  LIMIT 1;

  IF old_conname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.parametros_reprodutivos_fazenda DROP CONSTRAINT %I',
      old_conname
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_parametros_reprod_fazenda_tipo'
  ) THEN
    ALTER TABLE public.parametros_reprodutivos_fazenda
      ADD CONSTRAINT uq_parametros_reprod_fazenda_tipo
      UNIQUE (fazenda_id, tipo_rebanho);
  END IF;
END $$;
