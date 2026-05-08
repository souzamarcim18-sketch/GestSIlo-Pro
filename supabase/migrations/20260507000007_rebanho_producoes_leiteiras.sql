-- Migration G: Criar tabela producoes_leiteiras
BEGIN;

CREATE TABLE IF NOT EXISTS public.producoes_leiteiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  data DATE NOT NULL CHECK (data <= CURRENT_DATE),
  turno TEXT NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite', 'dia_inteiro')),
  volume_litros NUMERIC(8,2) NOT NULL CHECK (volume_litros > 0),
  observacoes TEXT NULL,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Uma entrada por animal por turno por dia
  CONSTRAINT producoes_leiteiras_animal_data_turno_unique
    UNIQUE (animal_id, data, turno)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_producoes_leiteiras_fazenda_id
  ON public.producoes_leiteiras(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_producoes_leiteiras_animal_id
  ON public.producoes_leiteiras(animal_id);
CREATE INDEX IF NOT EXISTS idx_producoes_leiteiras_data
  ON public.producoes_leiteiras(fazenda_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_producoes_leiteiras_animal_data
  ON public.producoes_leiteiras(animal_id, data DESC);

-- RLS
ALTER TABLE public.producoes_leiteiras ENABLE ROW LEVEL SECURITY;

-- SELECT: todos da fazenda
CREATE POLICY "producoes_leiteiras_select" ON public.producoes_leiteiras
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

-- INSERT: admin e operador
CREATE POLICY "producoes_leiteiras_insert" ON public.producoes_leiteiras
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: admin e operador (para corrigir erros de digitação)
CREATE POLICY "producoes_leiteiras_update" ON public.producoes_leiteiras
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

-- DELETE: apenas admin
CREATE POLICY "producoes_leiteiras_delete" ON public.producoes_leiteiras
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- Trigger: set_fazenda_id automático
CREATE OR REPLACE FUNCTION public.set_producoes_leiteiras_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER producoes_leiteiras_set_fazenda_id_trigger
BEFORE INSERT ON public.producoes_leiteiras
FOR EACH ROW
EXECUTE FUNCTION public.set_producoes_leiteiras_fazenda_id();

-- Trigger: atualizar producao_total_litros na tabela lactacoes quando há nova produção
CREATE OR REPLACE FUNCTION public.producao_leiteira_atualizar_lactacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar producao_total_litros na lactação ativa do animal
  UPDATE public.lactacoes
  SET producao_total_litros = (
    SELECT COALESCE(SUM(pl.volume_litros), 0)
    FROM public.producoes_leiteiras pl
    WHERE pl.animal_id = NEW.animal_id
      AND pl.data >= l.data_inicio_parto
      AND (l.data_fim_secagem IS NULL OR pl.data <= l.data_fim_secagem)
  )
  FROM public.lactacoes l
  WHERE l.id = lactacoes.id
    AND lactacoes.animal_id = NEW.animal_id
    AND lactacoes.data_fim_secagem IS NULL
    AND lactacoes.deleted_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER producoes_leiteiras_atualizar_lactacao_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.producoes_leiteiras
FOR EACH ROW
EXECUTE FUNCTION public.producao_leiteira_atualizar_lactacao();

COMMIT;
