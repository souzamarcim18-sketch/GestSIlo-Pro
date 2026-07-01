-- Migration 2.3 — Entidade Doadoras (FIV/OPU), segmentada por espécie
-- Doadoras são fêmeas doadoras de oócitos para produção de embriões.
-- Podem ser internas (fêmea do rebanho, animal_id preenchido) ou externas
-- (de outra fazenda, animal_id nulo). Mesmo padrão de reprodutores.
-- Idempotente.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.doadoras (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id      uuid        NULL REFERENCES public.fazendas(id),
  animal_id       uuid        NULL REFERENCES public.animais(id) ON DELETE SET NULL,
  origem          text        NOT NULL DEFAULT 'interna',
  tipo_rebanho    text        NOT NULL DEFAULT 'dupla_aptidao',
  nome            text        NOT NULL,
  raca            text        NULL,
  numero_registro text        NULL,
  data_entrada    date        NULL,
  observacoes     text        NULL,
  deleted_at      timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_doadoras_origem
    CHECK (origem IN ('interna', 'externa')),
  CONSTRAINT chk_doadoras_tipo_rebanho
    CHECK (tipo_rebanho IN ('leiteiro', 'corte', 'dupla_aptidao')),
  -- Interna deve referenciar um animal; externa não tem animal local.
  CONSTRAINT chk_doadoras_origem_animal
    CHECK (
      (origem = 'interna' AND animal_id IS NOT NULL)
      OR (origem = 'externa' AND animal_id IS NULL)
    )
);

-- Trigger: preencher fazenda_id automaticamente via get_minha_fazenda_id()
CREATE OR REPLACE FUNCTION public.trg_fn_doadoras_set_fazenda_id()
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

DROP TRIGGER IF EXISTS trg_doadoras_set_fazenda_id ON public.doadoras;
CREATE TRIGGER trg_doadoras_set_fazenda_id
  BEFORE INSERT ON public.doadoras
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_doadoras_set_fazenda_id();

-- Trigger: atualizar updated_at em UPDATE (reusa função genérica se existir).
CREATE OR REPLACE FUNCTION public.trg_fn_doadoras_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doadoras_updated_at ON public.doadoras;
CREATE TRIGGER trg_doadoras_updated_at
  BEFORE UPDATE ON public.doadoras
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_doadoras_set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_doadoras_fazenda_id    ON public.doadoras USING btree (fazenda_id);
CREATE INDEX IF NOT EXISTS idx_doadoras_fazenda_tipo  ON public.doadoras USING btree (fazenda_id, tipo_rebanho);
CREATE INDEX IF NOT EXISTS idx_doadoras_animal_id     ON public.doadoras USING btree (animal_id);
CREATE INDEX IF NOT EXISTS idx_doadoras_nome_trgm     ON public.doadoras USING gin   (nome gin_trgm_ops);

-- RLS
ALTER TABLE public.doadoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doadoras_select_admin_visualizador" ON public.doadoras;
CREATE POLICY "doadoras_select_admin_visualizador"
  ON public.doadoras FOR SELECT
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin_ou_visualizador()
  );

DROP POLICY IF EXISTS "doadoras_insert_admin" ON public.doadoras;
CREATE POLICY "doadoras_insert_admin"
  ON public.doadoras FOR INSERT
  TO authenticated
  WITH CHECK (public.sou_admin());

DROP POLICY IF EXISTS "doadoras_update_admin" ON public.doadoras;
CREATE POLICY "doadoras_update_admin"
  ON public.doadoras FOR UPDATE
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin()
  );

DROP POLICY IF EXISTS "doadoras_delete_admin" ON public.doadoras;
CREATE POLICY "doadoras_delete_admin"
  ON public.doadoras FOR DELETE
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin()
  );
