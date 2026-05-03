-- Migration: Rebanho Fase 2 — Reprodução (Schema Principal)
-- Data: 2026-05-02
-- Descrição: Tabelas, campos, triggers e RLS para módulo de Reprodução
-- Baseado em: Spec v1.2, Decisões Confirmadas
-- Dependência: 20260502000001_rebanho_fase2_enum.sql (rodar ANTES deste)
-- NOTA: Seção 1.3 (reprodutores) foi movida ANTES de 1.2 (adicionar colunas em animais)
--       para respeitar dependência de Foreign Keys

-- ==================== SEÇÃO 1.3: Tabela REPRODUTORES (CRIADA PRIMEIRO) ====================

CREATE TABLE IF NOT EXISTS public.reprodutores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('touro', 'semen_ia', 'touro_teste')),
  raca TEXT,
  numero_registro TEXT,
  data_entrada DATE,
  observacoes TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reprodutores_fazenda_id ON public.reprodutores(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_reprodutores_tipo ON public.reprodutores(tipo);

-- Partial Unique: número de registro único por fazenda (soft delete respeitado)
DROP INDEX IF EXISTS idx_reprodutores_numero_registro_unique;
CREATE UNIQUE INDEX idx_reprodutores_numero_registro_unique
ON public.reprodutores (fazenda_id, numero_registro)
WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.reprodutores ENABLE ROW LEVEL SECURITY;

-- SELECT: Administrador, Operador, Visualizador veem (deletados apenas admin)
DROP POLICY IF EXISTS "reprodutores_select" ON public.reprodutores;
CREATE POLICY "reprodutores_select" ON public.reprodutores
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND
    (deleted_at IS NULL OR sou_admin())
  );

-- INSERT: Apenas Administrador
DROP POLICY IF EXISTS "reprodutores_insert" ON public.reprodutores;
CREATE POLICY "reprodutores_insert" ON public.reprodutores
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: Apenas Administrador
DROP POLICY IF EXISTS "reprodutores_update" ON public.reprodutores;
CREATE POLICY "reprodutores_update" ON public.reprodutores
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- DELETE: Apenas Administrador
DROP POLICY IF EXISTS "reprodutores_delete" ON public.reprodutores;
CREATE POLICY "reprodutores_delete" ON public.reprodutores
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== SEÇÃO 1.2: Novos Campos em Tabela ANIMAIS (APÓS REPRODUTORES) ====================

ALTER TABLE public.animais
ADD COLUMN IF NOT EXISTS status_reprodutivo TEXT DEFAULT 'vazia'
  CHECK (status_reprodutivo IN ('vazia', 'inseminada', 'prenha', 'lactacao', 'seca', 'descartada')),
ADD COLUMN IF NOT EXISTS data_ultimo_parto DATE NULL,
ADD COLUMN IF NOT EXISTS data_parto_previsto DATE NULL,
ADD COLUMN IF NOT EXISTS data_proxima_secagem DATE NULL,
ADD COLUMN IF NOT EXISTS escore_condicao_corporal NUMERIC(2,1) NULL
  CHECK (escore_condicao_corporal IS NULL OR (escore_condicao_corporal >= 1.0 AND escore_condicao_corporal <= 5.0)),
ADD COLUMN IF NOT EXISTS flag_repetidora BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_reprodutor BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reprodutor_vinculado_id UUID NULL REFERENCES public.reprodutores(id) ON DELETE SET NULL;

-- NOTA: mae_id e pai_id JÁ EXISTEM de Fase 1 (não adicionar)

-- ==================== SEÇÃO 1.4: Tabela LACTACOES ====================

CREATE TABLE IF NOT EXISTS public.lactacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animais(id) ON DELETE CASCADE,
  data_inicio_parto DATE NOT NULL CHECK (data_inicio_parto <= CURRENT_DATE),
  data_fim_secagem DATE NULL CHECK (data_fim_secagem IS NULL OR data_fim_secagem >= data_inicio_parto),
  producao_total_litros NUMERIC(10,2) NULL CHECK (producao_total_litros IS NULL OR producao_total_litros >= 0),
  observacoes TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lactacoes_fazenda_id ON public.lactacoes(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_lactacoes_animal_id ON public.lactacoes(animal_id);
CREATE INDEX IF NOT EXISTS idx_lactacoes_data_inicio ON public.lactacoes(animal_id, data_inicio_parto DESC);

-- RLS
ALTER TABLE public.lactacoes ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos da fazenda (deletados apenas admin)
DROP POLICY IF EXISTS "lactacoes_select" ON public.lactacoes;
CREATE POLICY "lactacoes_select" ON public.lactacoes
  FOR SELECT
  USING (
    fazenda_id = get_minha_fazenda_id() AND
    (deleted_at IS NULL OR sou_admin())
  );

-- INSERT: Admin apenas (automático via trigger ao lançar parto)
DROP POLICY IF EXISTS "lactacoes_insert" ON public.lactacoes;
CREATE POLICY "lactacoes_insert" ON public.lactacoes
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: Admin apenas
DROP POLICY IF EXISTS "lactacoes_update" ON public.lactacoes;
CREATE POLICY "lactacoes_update" ON public.lactacoes
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- DELETE: Admin apenas
DROP POLICY IF EXISTS "lactacoes_delete" ON public.lactacoes;
CREATE POLICY "lactacoes_delete" ON public.lactacoes
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== SEÇÃO 1.5: Tabela PARAMETROS_REPRODUTIVOS_FAZENDA ====================

CREATE TABLE IF NOT EXISTS public.parametros_reprodutivos_fazenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL UNIQUE REFERENCES public.fazendas(id) ON DELETE CASCADE,
  dias_gestacao INT DEFAULT 283 CHECK (dias_gestacao >= 270 AND dias_gestacao <= 295),
  dias_seca INT DEFAULT 60 CHECK (dias_seca >= 30 AND dias_seca <= 90),
  pve_dias INT DEFAULT 60 CHECK (pve_dias >= 30 AND pve_dias <= 120),
  coberturas_para_repetidora INT DEFAULT 3 CHECK (coberturas_para_repetidora >= 2 AND coberturas_para_repetidora <= 5),
  janela_repetidora_dias INT DEFAULT 180 CHECK (janela_repetidora_dias >= 90 AND janela_repetidora_dias <= 365),
  meta_taxa_prenhez_pct INT DEFAULT 85 CHECK (meta_taxa_prenhez_pct >= 50 AND meta_taxa_prenhez_pct <= 100),
  meta_psm_dias INT DEFAULT 90 CHECK (meta_psm_dias >= 50 AND meta_psm_dias <= 120),
  meta_iep_dias INT DEFAULT 400 CHECK (meta_iep_dias >= 350 AND meta_iep_dias <= 450),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_parametros_reprodutivos_fazenda_id ON public.parametros_reprodutivos_fazenda(fazenda_id);

-- RLS
ALTER TABLE public.parametros_reprodutivos_fazenda ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin + Operador + Visualizador
DROP POLICY IF EXISTS "parametros_reprodutivos_select" ON public.parametros_reprodutivos_fazenda;
CREATE POLICY "parametros_reprodutivos_select" ON public.parametros_reprodutivos_fazenda
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

-- INSERT: Trigger automático ao criar fazenda (ou via admin)
DROP POLICY IF EXISTS "parametros_reprodutivos_insert" ON public.parametros_reprodutivos_fazenda;
CREATE POLICY "parametros_reprodutivos_insert" ON public.parametros_reprodutivos_fazenda
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- UPDATE: Admin apenas
DROP POLICY IF EXISTS "parametros_reprodutivos_update" ON public.parametros_reprodutivos_fazenda;
CREATE POLICY "parametros_reprodutivos_update" ON public.parametros_reprodutivos_fazenda
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== SEÇÃO 1.6: Tabela EVENTOS_PARTO_CRIAS ====================

CREATE TABLE IF NOT EXISTS public.eventos_parto_crias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos_rebanho(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  sexo TEXT NOT NULL CHECK (sexo IN ('Macho', 'Fêmea')),
  peso_kg NUMERIC(6,2) NULL CHECK (peso_kg IS NULL OR peso_kg > 0),
  vivo BOOLEAN NOT NULL DEFAULT TRUE,
  animal_criado_id UUID NULL REFERENCES public.animais(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eventos_parto_crias_evento_id ON public.eventos_parto_crias(evento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_parto_crias_fazenda_id ON public.eventos_parto_crias(fazenda_id);

-- RLS
ALTER TABLE public.eventos_parto_crias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_parto_crias_select" ON public.eventos_parto_crias;
CREATE POLICY "eventos_parto_crias_select" ON public.eventos_parto_crias
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

DROP POLICY IF EXISTS "eventos_parto_crias_insert" ON public.eventos_parto_crias;
CREATE POLICY "eventos_parto_crias_insert" ON public.eventos_parto_crias
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

DROP POLICY IF EXISTS "eventos_parto_crias_update" ON public.eventos_parto_crias;
CREATE POLICY "eventos_parto_crias_update" ON public.eventos_parto_crias
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

DROP POLICY IF EXISTS "eventos_parto_crias_delete" ON public.eventos_parto_crias;
CREATE POLICY "eventos_parto_crias_delete" ON public.eventos_parto_crias
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== SEÇÃO 1.6.1: Extensão Tabela EVENTOS_REBANHO ====================

ALTER TABLE public.eventos_rebanho
ADD COLUMN IF NOT EXISTS tipo_cobertura TEXT NULL
  CHECK (tipo_cobertura IS NULL OR tipo_cobertura IN ('monta_natural', 'ia_convencional', 'iatf', 'tetf', 'fiv', 'repasse')),
ADD COLUMN IF NOT EXISTS reprodutor_id UUID NULL REFERENCES public.reprodutores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metodo_diagnostico TEXT NULL
  CHECK (metodo_diagnostico IS NULL OR metodo_diagnostico IN ('palpacao', 'ultrassom', 'sangue')),
ADD COLUMN IF NOT EXISTS resultado_prenhez TEXT NULL
  CHECK (resultado_prenhez IS NULL OR resultado_prenhez IN ('positivo', 'negativo', 'duvidoso')),
ADD COLUMN IF NOT EXISTS idade_gestacional_dias INT NULL
  CHECK (idade_gestacional_dias IS NULL OR (idade_gestacional_dias >= 0 AND idade_gestacional_dias <= 300)),
ADD COLUMN IF NOT EXISTS tipo_parto TEXT NULL
  CHECK (tipo_parto IS NULL OR tipo_parto IN ('normal', 'distocico', 'cesariana')),
ADD COLUMN IF NOT EXISTS gemelar BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS natimorto BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS causa_aborto TEXT NULL,
ADD COLUMN IF NOT EXISTS motivo_descarte TEXT NULL
  CHECK (motivo_descarte IS NULL OR motivo_descarte IN ('idade', 'reprodutivo', 'sanitario', 'producao', 'aprumos', 'outro')),
ADD COLUMN IF NOT EXISTS bypass_justificativa TEXT NULL,
ADD COLUMN IF NOT EXISTS bypass_usuario_id UUID NULL REFERENCES auth.users(id);

-- Índice novo para filtros reprodutivo
CREATE INDEX IF NOT EXISTS idx_eventos_rebanho_reprodutor_id ON public.eventos_rebanho(reprodutor_id);

-- ==================== SEÇÃO 1.7: Novos Índices para Performance ====================

-- Listagem de animais por status reprodutivo (dashboard)
CREATE INDEX IF NOT EXISTS idx_animais_status_reprodutivo ON public.animais(fazenda_id, status_reprodutivo) WHERE deleted_at IS NULL;

-- Calendário reprodutivo (próximos partos)
CREATE INDEX IF NOT EXISTS idx_animais_data_parto_previsto ON public.animais(fazenda_id, data_parto_previsto) WHERE data_parto_previsto IS NOT NULL AND deleted_at IS NULL;

-- Dashboard repetidoras
CREATE INDEX IF NOT EXISTS idx_animais_flag_repetidora ON public.animais(fazenda_id, flag_repetidora) WHERE flag_repetidora = TRUE AND deleted_at IS NULL;

-- ==================== SEÇÃO 1.8: Trigger - Estender recalcular_categoria_animal ====================

-- NOTA: Trigger já existe de Fase 1. Estender função SQL com status_reprodutivo (4ª dimensão)
-- Estratégia: BACKWARD-COMPATIBLE
--   - Animais SEM status_reprodutivo (machos, fêmeas pré-Fase 2) = regra Fase 1
--   - Animais COM status_reprodutivo = regra estendida

CREATE OR REPLACE FUNCTION public.recalcular_categoria_animal()
RETURNS TRIGGER AS $$
DECLARE
  v_idade_anos NUMERIC;
  v_categoria TEXT;
BEGIN
  v_idade_anos := (CURRENT_DATE - NEW.data_nascimento) / 365.25;

  IF NEW.tipo_rebanho = 'leiteiro' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := 'Bezerra';
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 2 THEN
      -- Novilha considera status_reprodutivo se fêmea
      IF NEW.sexo = 'Fêmea' THEN
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'prenha' THEN 'Novilha Prenha'
          ELSE 'Novilha'
        END;
      ELSE
        v_categoria := 'Novilho';
      END IF;
    ELSE
      -- Vaca > 2 anos considera status_reprodutivo se fêmea
      IF NEW.sexo = 'Fêmea' THEN
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'lactacao' THEN 'Vaca em Lactação'
          WHEN NEW.status_reprodutivo = 'seca' THEN 'Vaca Seca'
          WHEN NEW.status_reprodutivo = 'prenha' THEN 'Vaca Prenha'
          ELSE 'Vaca Vazia'
        END;
      ELSE
        -- Macho > 2 anos = Touro se marcado com is_reprodutor=true, Novilho caso contrário
        IF NEW.is_reprodutor THEN
          v_categoria := 'Touro';
        ELSE
          v_categoria := 'Novilho';
        END IF;
      END IF;
    END IF;
  ELSIF NEW.tipo_rebanho = 'corte' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := 'Bezerra';
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 2 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Novilho' ELSE 'Novilha' END;
    ELSE
      IF NEW.sexo = 'Macho' THEN
        IF NEW.is_reprodutor THEN
          v_categoria := 'Touro';
        ELSE
          v_categoria := CASE
            WHEN NEW.status_reprodutivo = 'descartada' THEN 'Boi Descartado'
            ELSE 'Boi'
          END;
        END IF;
      ELSE
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'descartada' THEN 'Fêmea Descartada'
          ELSE 'Vaca Matriz'
        END;
      END IF;
    END IF;
  END IF;

  NEW.categoria := v_categoria;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==================== SEÇÃO 1.9: Trigger - parto_atualizar_data_ultimo_parto ====================

CREATE OR REPLACE FUNCTION public.parto_atualizar_data_ultimo_parto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'parto' THEN
    UPDATE public.animais
    SET data_ultimo_parto = NEW.data_evento
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_parto_data_ultimo_parto_trigger ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_parto_data_ultimo_parto_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.parto_atualizar_data_ultimo_parto();

-- ==================== SEÇÃO 1.10: Trigger - diagnostico_atualizar_datas_previstas ====================

CREATE OR REPLACE FUNCTION public.diagnostico_atualizar_datas_previstas()
RETURNS TRIGGER AS $$
DECLARE
  v_dias_gestacao INT;
  v_dias_seca INT;
BEGIN
  IF NEW.tipo = 'diagnostico_prenhez' AND NEW.resultado_prenhez = 'positivo' THEN
    -- Buscar parâmetros da fazenda
    SELECT dias_gestacao, dias_seca
    INTO v_dias_gestacao, v_dias_seca
    FROM public.parametros_reprodutivos_fazenda
    WHERE fazenda_id = NEW.fazenda_id;

    -- Usar defaults se não encontrado
    v_dias_gestacao := COALESCE(v_dias_gestacao, 283);
    v_dias_seca := COALESCE(v_dias_seca, 60);

    -- Atualizar animal com datas previstas
    UPDATE public.animais
    SET
      status_reprodutivo = 'prenha',
      data_parto_previsto = (
        SELECT NEW.data_evento + (v_dias_gestacao || ' days')::INTERVAL
      ),
      data_proxima_secagem = (
        SELECT (NEW.data_evento + (v_dias_gestacao || ' days')::INTERVAL) - (v_dias_seca || ' days')::INTERVAL
      )
    WHERE id = NEW.animal_id;

  ELSIF NEW.tipo = 'diagnostico_prenhez' AND NEW.resultado_prenhez = 'negativo' THEN
    UPDATE public.animais
    SET status_reprodutivo = 'vazia'
    WHERE id = NEW.animal_id;

  ELSIF NEW.tipo = 'diagnostico_prenhez' AND NEW.resultado_prenhez = 'duvidoso' THEN
    UPDATE public.animais
    SET status_reprodutivo = 'inseminada'
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_diagnostico_atualizar_datas_trigger ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_diagnostico_atualizar_datas_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.diagnostico_atualizar_datas_previstas();

-- ==================== SEÇÃO 1.11: Trigger - cobertura_verificar_repetidora ====================

CREATE OR REPLACE FUNCTION public.cobertura_verificar_repetidora()
RETURNS TRIGGER AS $$
DECLARE
  v_coberturas_para_repetidora INT;
  v_janela_repetidora_dias INT;
  v_count_coberturas INT;
BEGIN
  IF NEW.tipo = 'cobertura' THEN
    -- Buscar parâmetros da fazenda
    SELECT coberturas_para_repetidora, janela_repetidora_dias
    INTO v_coberturas_para_repetidora, v_janela_repetidora_dias
    FROM public.parametros_reprodutivos_fazenda
    WHERE fazenda_id = NEW.fazenda_id;

    -- Usar defaults se não encontrado
    v_coberturas_para_repetidora := COALESCE(v_coberturas_para_repetidora, 3);
    v_janela_repetidora_dias := COALESCE(v_janela_repetidora_dias, 180);

    -- Contar coberturas SEM prenhez confirmada nos últimos N dias
    SELECT COUNT(*)
    INTO v_count_coberturas
    FROM public.eventos_rebanho
    WHERE
      animal_id = NEW.animal_id
      AND tipo = 'cobertura'
      AND data_evento >= (CURRENT_DATE - (v_janela_repetidora_dias || ' days')::INTERVAL)
      -- Sem diagnostico_prenhez positivo após esta cobertura
      AND NOT EXISTS (
        SELECT 1 FROM public.eventos_rebanho e2
        WHERE e2.animal_id = NEW.animal_id
          AND e2.tipo = 'diagnostico_prenhez'
          AND e2.resultado_prenhez = 'positivo'
          AND e2.data_evento > NEW.data_evento
      );

    -- Atualizar flag_repetidora
    UPDATE public.animais
    SET flag_repetidora = (v_count_coberturas >= v_coberturas_para_repetidora)
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_cobertura_repetidora_trigger ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_cobertura_repetidora_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.cobertura_verificar_repetidora();

-- ==================== SEÇÃO 1.12: Trigger - aborto_limpar_datas_previstas ====================

CREATE OR REPLACE FUNCTION public.aborto_limpar_datas_previstas()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'aborto' THEN
    UPDATE public.animais
    SET
      status_reprodutivo = 'vazia',
      data_parto_previsto = NULL,
      data_proxima_secagem = NULL
      -- NÃO altera data_ultimo_parto (preserva histórico)
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_aborto_limpardatas_trigger ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_aborto_limpardatas_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.aborto_limpar_datas_previstas();

-- ==================== SEÇÃO 1.13: Trigger - parto_criar_bezerros ====================

CREATE OR REPLACE FUNCTION public.parto_criar_bezerros()
RETURNS TRIGGER AS $$
DECLARE
  v_num_bezerros INT;
  v_reprodutor_id UUID;
  v_i INT := 0;
  v_novo_animal_id UUID;
  v_brinco_base TEXT;
  v_brinco_novo TEXT;
  v_contador INT := 0;
  v_sexo_cria TEXT;
  v_vivo_cria BOOLEAN;
  v_peso_cria NUMERIC;
BEGIN
  IF NEW.tipo = 'parto' THEN
    -- Determinar número de bezerros (1 ou 2 se gemelar)
    v_num_bezerros := CASE WHEN NEW.gemelar THEN 2 ELSE 1 END;

    -- Buscar reprodutor_id da última cobertura confirmada por diagnóstico positivo
    -- com validação de janela biológica (gestação: 240-295 dias antes do parto)
    SELECT r.reprodutor_id
    INTO v_reprodutor_id
    FROM public.eventos_rebanho r
    INNER JOIN public.eventos_rebanho d ON r.animal_id = d.animal_id
    WHERE r.animal_id = NEW.animal_id
      AND r.tipo = 'cobertura'
      AND d.tipo = 'diagnostico_prenhez'
      AND d.resultado_prenhez = 'positivo'
      AND d.data_evento > r.data_evento
      AND r.data_evento >= NEW.data_evento - INTERVAL '295 days'
      AND r.data_evento <= NEW.data_evento - INTERVAL '240 days'
    ORDER BY r.data_evento DESC
    LIMIT 1;

    -- Criar bezerro(s)
    WHILE v_i < v_num_bezerros LOOP
      v_i := v_i + 1;

      -- Buscar dados da cria em eventos_parto_crias
      -- Se não houver registros (compatibilidade), usar defaults
      WITH cria_data AS (
        SELECT
          COALESCE(sexo, 'Fêmea') as sexo,
          COALESCE(vivo, TRUE) as vivo,
          peso_kg
        FROM public.eventos_parto_crias
        WHERE evento_id = NEW.id
        LIMIT 1 OFFSET (v_i - 1)
      )
      SELECT INTO v_sexo_cria, v_vivo_cria, v_peso_cria
        c.sexo, c.vivo, c.peso_kg
      FROM cria_data c;

      -- Se nenhuma cria foi registrada, usar defaults
      v_sexo_cria := COALESCE(v_sexo_cria, 'Fêmea');
      v_vivo_cria := COALESCE(v_vivo_cria, TRUE);

      -- Gerar brinco sugerido: mãe_brinco + sufixo (A, B)
      SELECT brinco INTO v_brinco_base FROM public.animais WHERE id = NEW.animal_id;
      v_brinco_novo := v_brinco_base || '-' || CHR(64 + v_i); -- A=65, B=66

      -- Validar unicidade de brinco (incremente se duplicado)
      v_contador := 0;
      WHILE EXISTS (
        SELECT 1 FROM public.animais
        WHERE fazenda_id = NEW.fazenda_id
          AND brinco = v_brinco_novo
          AND deleted_at IS NULL
      ) LOOP
        v_contador := v_contador + 1;
        v_brinco_novo := v_brinco_base || '-' || CHR(64 + v_i) || v_contador;
      END LOOP;

      -- Inserir bezerro
      INSERT INTO public.animais (
        fazenda_id,
        brinco,
        sexo,
        tipo_rebanho,
        data_nascimento,
        status,
        status_reprodutivo,
        mae_id,
        pai_id,
        raca,
        created_at,
        updated_at
      ) VALUES (
        NEW.fazenda_id,
        v_brinco_novo,
        v_sexo_cria,
        (SELECT tipo_rebanho FROM public.animais WHERE id = NEW.animal_id),
        NEW.data_evento,
        CASE WHEN NOT v_vivo_cria THEN 'Natimorto' ELSE 'Ativo' END,
        'vazia',
        NEW.animal_id,
        v_reprodutor_id,
        (SELECT raca FROM public.animais WHERE id = NEW.animal_id),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING id INTO v_novo_animal_id;

      -- Atualizar eventos_parto_crias com animal_criado_id
      UPDATE public.eventos_parto_crias
      SET animal_criado_id = v_novo_animal_id
      WHERE id = (
        SELECT id FROM public.eventos_parto_crias
        WHERE evento_id = NEW.id AND animal_criado_id IS NULL
        ORDER BY created_at, id
        LIMIT 1
      );
    END LOOP;

    -- Atualizar status da mãe para 'lactacao'
    UPDATE public.animais
    SET status_reprodutivo = 'lactacao'
    WHERE id = NEW.animal_id;

    -- Criar registro em `lactacoes` (início de lactação)
    INSERT INTO public.lactacoes (
      fazenda_id,
      animal_id,
      data_inicio_parto,
      created_at,
      updated_at
    ) VALUES (
      NEW.fazenda_id,
      NEW.animal_id,
      NEW.data_evento,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_parto_criar_bezerros_trigger ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_parto_criar_bezerros_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.parto_criar_bezerros();

-- ==================== SEÇÃO 1.14: Trigger - secagem_registrar_lactacao ====================

CREATE OR REPLACE FUNCTION public.secagem_registrar_lactacao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'secagem' THEN
    -- Marcar lactação anterior como encerrada
    UPDATE public.lactacoes
    SET data_fim_secagem = NEW.data_evento
    WHERE id = (
      SELECT id FROM public.lactacoes
      WHERE animal_id = NEW.animal_id
        AND data_fim_secagem IS NULL
        AND deleted_at IS NULL
      ORDER BY data_inicio_parto DESC
      LIMIT 1
    );

    -- Atualizar status animal para 'seca'
    UPDATE public.animais
    SET status_reprodutivo = 'seca'
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_secagem_registrar_lactacao_trigger ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_secagem_registrar_lactacao_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.secagem_registrar_lactacao();

-- ==================== SEÇÃO 1.15: Trigger - descarte_marcar_status ====================

CREATE OR REPLACE FUNCTION public.descarte_marcar_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'descarte' THEN
    UPDATE public.animais
    SET status_reprodutivo = 'descartada'
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_descarte_marcar_status_trigger ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_descarte_marcar_status_trigger
AFTER INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.descarte_marcar_status();

-- ==================== SEÇÃO 1.16: Trigger - validar_parto_com_prenhez ====================

-- NOTA: Validação em nível de banco para bloquear parto sem prenhez confirmada
-- Permite bypass Admin com justificativa obrigatória (auditado em audit_log)

CREATE OR REPLACE FUNCTION public.validar_parto_com_prenhez()
RETURNS TRIGGER AS $$
DECLARE
  v_tem_prenhez BOOLEAN;
BEGIN
  -- Validar apenas se tipo = 'parto'
  IF NEW.tipo = 'parto' THEN
    -- Verificar se existe diagnostico_prenhez positivo nos últimos 295 dias
    SELECT EXISTS (
      SELECT 1 FROM public.eventos_rebanho
      WHERE animal_id = NEW.animal_id
        AND tipo = 'diagnostico_prenhez'
        AND resultado_prenhez = 'positivo'
        AND data_evento >= CURRENT_DATE - INTERVAL '295 days'
    ) INTO v_tem_prenhez;

    -- Se NÃO tem prenhez confirmada
    IF NOT v_tem_prenhez THEN
      -- Se NÃO há bypass_justificativa: bloquear
      IF NEW.bypass_justificativa IS NULL THEN
        RAISE EXCEPTION 'Parto sem prenhez confirmada. Admin deve fornecer bypass_justificativa.';
      END IF;

      -- Se tem bypass_justificativa: validar se usuário é Admin
      -- (Operador não pode bypassar - validação feita em Server Action)
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS eventos_rebanho_validar_parto_prenhez ON public.eventos_rebanho;
CREATE TRIGGER eventos_rebanho_validar_parto_prenhez
BEFORE INSERT ON public.eventos_rebanho
FOR EACH ROW
EXECUTE FUNCTION public.validar_parto_com_prenhez();

-- ==================== SEÇÃO 1.16.1: Tabela AUDIT_LOG ====================

-- NOTA: Validação no 03-log.md da Fase 1 confirma que audit_log NÃO existe.
-- Criar conforme abaixo.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('insert', 'update', 'delete', 'bypass')),
  motivo TEXT,
  payload_anterior JSONB,
  payload_novo JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_fazenda_id ON public.audit_log(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela_registro ON public.audit_log(tabela, registro_id);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- ==================== FIM DA MIGRATION ====================
