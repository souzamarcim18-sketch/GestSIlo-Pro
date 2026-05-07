-- Migration H: Criar tabela eventos_sanitarios
BEGIN;

CREATE TABLE IF NOT EXISTS public.eventos_sanitarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,

  -- Tipo de evento sanitário (4 tipos distintos da spec)
  tipo TEXT NOT NULL CHECK (tipo IN ('vacinacao', 'vermifugacao', 'tratamento_veterinario', 'exame_laboratorial')),

  data_evento DATE NOT NULL CHECK (data_evento <= CURRENT_DATE),

  -- Campos compartilhados
  responsavel TEXT NULL,
  observacoes TEXT NULL,

  -- Campos de Vacinação
  vacina_nome TEXT NULL,
  dose TEXT NULL,                    -- Ex: "1ª dose", "reforço", "dose única"
  via_aplicacao TEXT NULL
    CHECK (via_aplicacao IS NULL OR via_aplicacao IN ('subcutanea', 'intramuscular', 'intranasal', 'oral', 'topica')),
  lote_produto TEXT NULL,            -- Número do lote da vacina/produto
  data_proxima_dose DATE NULL,       -- Para alertas de vacinação

  -- Campos de Tratamento Veterinário
  diagnostico TEXT NULL,
  medicamento TEXT NULL,
  duracao_dias INT NULL CHECK (duracao_dias IS NULL OR duracao_dias > 0),
  resultado TEXT NULL
    CHECK (resultado IS NULL OR resultado IN ('cura', 'melhora', 'sem_resposta', 'obito', 'em_tratamento')),

  -- Campos de Exame Laboratorial
  tipo_exame TEXT NULL,              -- Ex: "Brucelose", "Tuberculose", "Aftosa"
  numero_protocolo TEXT NULL,

  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_fazenda_id
  ON public.eventos_sanitarios(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_animal_id
  ON public.eventos_sanitarios(animal_id);
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_tipo
  ON public.eventos_sanitarios(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_data_proxima_dose
  ON public.eventos_sanitarios(fazenda_id, data_proxima_dose)
  WHERE data_proxima_dose IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_data_evento
  ON public.eventos_sanitarios(fazenda_id, data_evento DESC);

-- RLS
ALTER TABLE public.eventos_sanitarios ENABLE ROW LEVEL SECURITY;

-- SELECT: todos da fazenda (deletados apenas admin)
CREATE POLICY "eventos_sanitarios_select" ON public.eventos_sanitarios
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND
    (deleted_at IS NULL OR sou_admin())
  );

-- INSERT: admin e operador
CREATE POLICY "eventos_sanitarios_insert" ON public.eventos_sanitarios
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: eventos sanitários podem ser editados (não são imutáveis como reprodutivos)
CREATE POLICY "eventos_sanitarios_update" ON public.eventos_sanitarios
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

-- DELETE: apenas admin
CREATE POLICY "eventos_sanitarios_delete" ON public.eventos_sanitarios
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- Trigger: set_fazenda_id automático
CREATE OR REPLACE FUNCTION public.set_eventos_sanitarios_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_sanitarios_set_fazenda_id_trigger
BEFORE INSERT ON public.eventos_sanitarios
FOR EACH ROW
EXECUTE FUNCTION public.set_eventos_sanitarios_fazenda_id();

-- Trigger: updated_at
CREATE TRIGGER eventos_sanitarios_update_updated_at_trigger
BEFORE UPDATE ON public.eventos_sanitarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
