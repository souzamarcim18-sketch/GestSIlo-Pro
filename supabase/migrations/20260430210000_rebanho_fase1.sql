-- Migration: Rebanho Fase 1 - Fundação
-- Data: 2026-04-30
-- Descrição: Tabelas, enums, índices, RLS e triggers para módulo de Rebanho

-- ==================== ENUMS ====================

-- Categoria de animal (leiteiro ou corte)
CREATE TYPE public.categoria_animal AS ENUM ('leiteiro', 'corte');

-- Status de animal (Ativo, Morto, Vendido)
CREATE TYPE public.status_animal AS ENUM ('Ativo', 'Morto', 'Vendido');

-- Tipo de evento
CREATE TYPE public.tipo_evento_rebanho AS ENUM (
  'nascimento',
  'pesagem',
  'morte',
  'venda',
  'transferencia_lote'
);

-- ==================== TABELA: LOTES ====================

CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: nome único por fazenda
  CONSTRAINT lotes_nome_fazenda_id_unique UNIQUE (fazenda_id, nome)
);

-- Índices
CREATE INDEX idx_lotes_fazenda_id ON public.lotes(fazenda_id);

-- RLS
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotes_select_mesma_fazenda" ON public.lotes
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_insert" ON public.lotes
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_update" ON public.lotes
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "lotes_delete" ON public.lotes
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== TABELA: ANIMAIS ====================

CREATE TABLE public.animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  numero_animal TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('Macho', 'Fêmea')),
  tipo_rebanho public.categoria_animal NOT NULL DEFAULT 'leiteiro',
  data_nascimento DATE NOT NULL CHECK (data_nascimento <= CURRENT_DATE),
  categoria TEXT NOT NULL DEFAULT 'Bezerro(a)',
  status public.status_animal NOT NULL DEFAULT 'Ativo',
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  peso_atual NUMERIC(6,2),
  mae_id UUID REFERENCES public.animais(id) ON DELETE SET NULL,
  pai_id UUID REFERENCES public.animais(id) ON DELETE SET NULL,
  raca TEXT,
  observacoes TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_animais_fazenda_id ON public.animais(fazenda_id);
CREATE INDEX idx_animais_fazenda_status ON public.animais(fazenda_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_animais_lote_id ON public.animais(lote_id);
CREATE INDEX idx_animais_numero_animal ON public.animais(fazenda_id, numero_animal);
CREATE INDEX idx_animais_data_nascimento ON public.animais(data_nascimento);
CREATE INDEX idx_animais_mae_id ON public.animais(mae_id);
CREATE INDEX idx_animais_pai_id ON public.animais(pai_id);

-- Partial Unique Index: numero_animal único por fazenda (apenas não-deletados)
CREATE UNIQUE INDEX idx_animais_numero_animal_unique_not_deleted
  ON public.animais(fazenda_id, numero_animal)
  WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.animais ENABLE ROW LEVEL SECURITY;

-- Política SELECT única: usuário vê animais da sua fazenda (deletados apenas se admin)
CREATE POLICY "animais_select" ON public.animais
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND
    (deleted_at IS NULL OR sou_admin())
  );

CREATE POLICY "animais_insert" ON public.animais
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "animais_update" ON public.animais
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "animais_delete" ON public.animais
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== TABELA: EVENTOS_REBANHO ====================

CREATE TABLE public.eventos_rebanho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  tipo public.tipo_evento_rebanho NOT NULL,
  data_evento DATE NOT NULL CHECK (data_evento <= CURRENT_DATE),
  peso_kg NUMERIC(6,2),
  lote_id_destino UUID REFERENCES public.lotes(id) ON DELETE RESTRICT,
  comprador TEXT,
  valor_venda NUMERIC(12,2),
  observacoes TEXT,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: peso_kg obrigatório e > 0 se tipo = pesagem
  CONSTRAINT eventos_rebanho_peso_pesagem_check
    CHECK (
      tipo != 'pesagem' OR (peso_kg IS NOT NULL AND peso_kg > 0)
    ),

  -- Constraint: lote_id_destino obrigatório se tipo = transferencia_lote
  CONSTRAINT eventos_rebanho_lote_transferencia_check
    CHECK (
      tipo != 'transferencia_lote' OR lote_id_destino IS NOT NULL
    )
);

-- Índices
CREATE INDEX idx_eventos_rebanho_fazenda_id ON public.eventos_rebanho(fazenda_id);
CREATE INDEX idx_eventos_rebanho_animal_id ON public.eventos_rebanho(animal_id);
CREATE INDEX idx_eventos_rebanho_tipo ON public.eventos_rebanho(tipo);
CREATE INDEX idx_eventos_rebanho_data_evento ON public.eventos_rebanho(data_evento DESC);

-- RLS
ALTER TABLE public.eventos_rebanho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_rebanho_select" ON public.eventos_rebanho
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND
    (deleted_at IS NULL OR sou_admin())
  );

CREATE POLICY "eventos_rebanho_insert" ON public.eventos_rebanho
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "eventos_rebanho_update" ON public.eventos_rebanho
  FOR UPDATE
  USING (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "eventos_rebanho_delete" ON public.eventos_rebanho
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== TABELA: PESOS_ANIMAL ====================

CREATE TABLE public.pesos_animal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  data_pesagem DATE NOT NULL,
  peso_kg NUMERIC(6,2) NOT NULL CHECK (peso_kg > 0),
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: uma pesagem por animal por data
  CONSTRAINT pesos_animal_animal_data_unique UNIQUE (animal_id, data_pesagem)
);

-- Índices
CREATE INDEX idx_pesos_animal_fazenda_id ON public.pesos_animal(fazenda_id);
CREATE INDEX idx_pesos_animal_animal_id ON public.pesos_animal(animal_id);
CREATE INDEX idx_pesos_animal_data_pesagem ON public.pesos_animal(animal_id, data_pesagem DESC);

-- RLS
ALTER TABLE public.pesos_animal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pesos_animal_select_mesma_fazenda" ON public.pesos_animal
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "pesos_animal_insert" ON public.pesos_animal
  FOR INSERT
  WITH CHECK (sou_gerente_ou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== TRIGGER: set_fazenda_id (LOTES) ====================

CREATE OR REPLACE FUNCTION public.set_lotes_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER lotes_set_fazenda_id_trigger
BEFORE INSERT ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.set_lotes_fazenda_id();

-- ==================== TRIGGER: Validar Genealogia (ANIMAIS) ====================

CREATE OR REPLACE FUNCTION public.validar_genealogia_animal()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar mae_id: se preenchida, deve ser da mesma fazenda
  IF NEW.mae_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.animais
      WHERE id = NEW.mae_id AND fazenda_id = NEW.fazenda_id
    ) THEN
      RAISE EXCEPTION 'Mãe deve ser um animal da mesma fazenda';
    END IF;
  END IF;

  -- Validar pai_id: se preenchido, deve ser da mesma fazenda
  IF NEW.pai_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.animais
      WHERE id = NEW.pai_id AND fazenda_id = NEW.fazenda_id
    ) THEN
      RAISE EXCEPTION 'Pai deve ser um animal da mesma fazenda';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER animais_validar_genealogia_trigger
BEFORE INSERT OR UPDATE ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.validar_genealogia_animal();

-- ==================== TRIGGER: set_fazenda_id (ANIMAIS) ====================

CREATE OR REPLACE FUNCTION public.set_animais_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER animais_set_fazenda_id_trigger
BEFORE INSERT ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.set_animais_fazenda_id();

-- ==================== TRIGGER: Recalcular Categoria Automática (ANIMAIS) ====================

CREATE OR REPLACE FUNCTION public.recalcular_categoria_animal()
RETURNS TRIGGER AS $$
DECLARE
  v_idade_anos NUMERIC;
  v_categoria TEXT;
BEGIN
  -- Calcular idade em anos
  v_idade_anos := (CURRENT_DATE - NEW.data_nascimento) / 365.25;

  -- Computar categoria baseado em tipo_rebanho + sexo + idade
  IF NEW.tipo_rebanho = 'leiteiro' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := 'Bezerro(a)';
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Macho Jovem' ELSE 'Fêmea Jovem' END;
    ELSIF v_idade_anos < 2 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Novilho' ELSE 'Novilha' END;
    ELSE
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Touro' ELSE 'Vaca' END;
    END IF;
  ELSIF NEW.tipo_rebanho = 'corte' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := 'Bezerro(a)';
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Macho Jovem' ELSE 'Fêmea Jovem' END;
    ELSIF v_idade_anos < 2 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Novilho' ELSE 'Novilha' END;
    ELSE
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Boi' ELSE 'Novilha' END;
    END IF;
  END IF;

  NEW.categoria := v_categoria;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER animais_recalcular_categoria_trigger
BEFORE INSERT OR UPDATE ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_categoria_animal();

-- ==================== TRIGGER: update_updated_at (GENÉRICO) ====================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para lotes
CREATE TRIGGER lotes_update_updated_at_trigger
BEFORE UPDATE ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para animais
CREATE TRIGGER animais_update_updated_at_trigger
BEFORE UPDATE ON public.animais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para eventos_rebanho
CREATE TRIGGER eventos_rebanho_update_updated_at_trigger
BEFORE UPDATE ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== TRIGGER: set_fazenda_id (EVENTOS_REBANHO) ====================

CREATE OR REPLACE FUNCTION public.set_eventos_rebanho_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_set_fazenda_id_trigger
BEFORE INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.set_eventos_rebanho_fazenda_id();

-- ==================== TRIGGER: Validar Lote Transferência ====================

CREATE OR REPLACE FUNCTION public.validar_lote_transferencia()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tipo = transferencia_lote, validar que lote_id_destino existe e pertence à mesma fazenda
  IF NEW.tipo = 'transferencia_lote' THEN
    IF NEW.lote_id_destino IS NULL THEN
      RAISE EXCEPTION 'Lote destino é obrigatório para transferência de lote';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.lotes
      WHERE id = NEW.lote_id_destino AND fazenda_id = NEW.fazenda_id
    ) THEN
      RAISE EXCEPTION 'Lote destino deve pertencer à mesma fazenda';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_validar_lote_transferencia_trigger
BEFORE INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.validar_lote_transferencia();

-- ==================== TRIGGER: Atualizar peso_atual em Pesagem ====================

CREATE OR REPLACE FUNCTION public.atualizar_peso_atual_pesagem()
RETURNS TRIGGER AS $$
BEGIN
  -- Se evento é do tipo pesagem, criar registro em pesos_animal
  -- e atualizar peso_atual no animal
  IF NEW.tipo = 'pesagem' AND NEW.peso_kg IS NOT NULL THEN
    -- Inserir em pesos_animal
    INSERT INTO public.pesos_animal (animal_id, data_pesagem, peso_kg, fazenda_id)
    VALUES (NEW.animal_id, NEW.data_evento, NEW.peso_kg, NEW.fazenda_id)
    ON CONFLICT (animal_id, data_pesagem) DO UPDATE
    SET peso_kg = EXCLUDED.peso_kg;

    -- Atualizar peso_atual do animal (MAX peso_kg)
    UPDATE public.animais
    SET peso_atual = (
      SELECT peso_kg
      FROM public.pesos_animal
      WHERE animal_id = NEW.animal_id
      ORDER BY data_pesagem DESC
      LIMIT 1
    )
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_pesagem_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_peso_atual_pesagem();

-- ==================== TRIGGER: Atualizar status em Morte/Venda ====================

CREATE OR REPLACE FUNCTION public.atualizar_status_morte_venda()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'morte' THEN
    UPDATE public.animais SET status = 'Morto' WHERE id = NEW.animal_id;
  ELSIF NEW.tipo = 'venda' THEN
    UPDATE public.animais SET status = 'Vendido' WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_morte_venda_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_status_morte_venda();

-- ==================== TRIGGER: Atualizar lote_id em Transferência ====================

CREATE OR REPLACE FUNCTION public.atualizar_lote_transferencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'transferencia_lote' AND NEW.lote_id_destino IS NOT NULL THEN
    UPDATE public.animais
    SET lote_id = NEW.lote_id_destino, status = 'Ativo'
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER eventos_rebanho_transferencia_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_lote_transferencia();

-- ==================== TRIGGER: set_fazenda_id (PESOS_ANIMAL) ====================

CREATE OR REPLACE FUNCTION public.set_pesos_animal_fazenda_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER pesos_animal_set_fazenda_id_trigger
BEFORE INSERT ON public.pesos_animal
FOR EACH ROW
EXECUTE FUNCTION public.set_pesos_animal_fazenda_id();

-- ==================== FIM DA MIGRATION ====================
