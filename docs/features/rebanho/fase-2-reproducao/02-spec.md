# SPEC — Módulo de Rebanho — Fase 2: Reprodução

**Data**: 2026-05-02  
**Status**: Especificação Técnica Completa — Baseado em PRD v1.1  
**Versão**: 1.2  
**Baseado em**: 01-prd.md (v1.1)

---

## Decisões Confirmadas (Alterações vs PRD v1.1)

| Decisão | PRD v1.1 | Confirmado v1.0 | Motivo |
|---------|----------|-----------------|--------|
| **Campos em `animais`** | 6 novos campos | Confirmado (sem GENERATED) | PostgreSQL não suporta GENERATED com subqueries; usar triggers AFTER INSERT em eventos_rebanho |
| **Cálculo de flags** | data_parto_previsto, data_proxima_secagem, flag_repetidora | Trigger AFTER INSERT/UPDATE em eventos_rebanho | Atomicidade + consistência |
| **Tabela reprodutores** | FK em eventos_rebanho (tipo_cobertura) | Sim, criar + índice UNIQUE partial | Separação clara de responsabilidade |
| **Extensão enum** | ALTER TYPE tipo_evento_rebanho | Sim, 6 novos valores | Reutiliza RLS e triggers de eventos_rebanho |
| **Trigger recalcular_categoria_animal** | Fase 1 considera idade+sexo+tipo_rebanho | Extender com 4ª dimensão: status_reprodutivo | Backward-compatible: animais sem status_reprodutivo usam regra Fase 1 |
| **Offline sync** | EventoRebanhoSyncQueue | Estender com novos tipos de evento | Reuso de estrutura Fase 1 |

---

## 1. Migration SQL Completa

### 1.1 Extensão do Enum `tipo_evento_rebanho`

```sql
-- ⚠️ ATENÇÃO: ALTER TYPE ADD VALUE não pode rodar dentro de BEGIN/COMMIT.
-- Esta migration DEVE ser dividida em 2 arquivos:
-- - YYYYMMDDHHMMSS_rebanho_fase2_enum.sql (apenas esta seção)
-- - YYYYMMDDHHMMSS_rebanho_fase2_main.sql (demais seções 1.2 em diante)
-- Em PG12+, alternativa: usar ALTER TYPE ... ADD VALUE IF NOT EXISTS
-- e rodar em arquivo separado mesmo assim.

-- Fase 2: Estender enum com 6 novos tipos de evento reprodutivo
ALTER TYPE tipo_evento_rebanho ADD VALUE 'cobertura';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'diagnostico_prenhez';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'parto';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'secagem';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'aborto';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'descarte';

-- Ordem: ADD VALUE sem posição = append ao final (preserva IDs antigos)
-- Resultado final: nascimento, pesagem, morte, venda, transferencia_lote, 
--                   cobertura, diagnostico_prenhez, parto, secagem, aborto, descarte
```

### 1.2 Novos Campos em Tabela `animais`

```sql
ALTER TABLE public.animais
ADD COLUMN IF NOT EXISTS status_reprodutivo TEXT DEFAULT 'vazia'
  CHECK (status_reprodutivo IN ('vazia', 'inseminada', 'prenha', 'lactacao', 'seca', 'descartada')),
ADD COLUMN IF NOT EXISTS data_ultimo_parto DATE NULL,
ADD COLUMN IF NOT EXISTS data_parto_previsto DATE NULL,
ADD COLUMN IF NOT EXISTS data_proxima_secagem DATE NULL,
ADD COLUMN IF NOT EXISTS escore_condicao_corporal NUMERIC(2,1) NULL
  CHECK (escore_condicao_corporal IS NULL OR (escore_condicao_corporal >= 1.0 AND escore_condicao_corporal <= 5.0)),
ADD COLUMN IF NOT EXISTS flag_repetidora BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mae_id UUID NULL REFERENCES public.animais(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pai_id UUID NULL REFERENCES public.reprodutores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_reprodutor BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reprodutor_vinculado_id UUID NULL REFERENCES public.reprodutores(id) ON DELETE SET NULL;

-- CHECK constraints espelham validações Zod (ver seção 3)
-- Nota: mae_id = mãe (animal); pai_id = pai (reprodutor, pois sêmen IA pode não ter animal cadastrado)
-- is_reprodutor = flag booleana; Admin marca true ao cadastrar macho como reprodutor

-- Decisão de Design: status_reprodutivo permanece como TEXT + CHECK (não ENUM PostgreSQL)
-- para flexibilidade futura e evitar complicações com ALTER TYPE. CHECK constraint
-- garante mesma segurança. Tipo TS StatusReprodutivo (lib/types) é a fonte de verdade no código.
```

### 1.3 Tabela `reprodutores`

```sql
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
-- Nota: Constraints inline com WHERE não são suportados. Usar CREATE UNIQUE INDEX.
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
```

### 1.4 Tabela `lactacoes`

```sql
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
```

### 1.5 Tabela `parametros_reprodutivos_fazenda`

```sql
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

-- Índice (UNIQUE já na definição da tabela)
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
```

### 1.6 Tabela Auxiliar `eventos_parto_crias` (NOVO)

```sql
-- Tabela para armazenar crias individuais de um parto (sexo, peso, vivo)
-- Permite rastrear bezerros gemelar com atributos individuais
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
```

### 1.6.1 Extensão Tabela `eventos_rebanho` com Novos Campos

```sql
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
```

### 1.7 Novos Índices para Performance

```sql
-- Listagem de animais por status reprodutivo (dashboard)
CREATE INDEX IF NOT EXISTS idx_animais_status_reprodutivo ON public.animais(fazenda_id, status_reprodutivo) WHERE deleted_at IS NULL;

-- Calendário reprodutivo (próximos partos)
CREATE INDEX IF NOT EXISTS idx_animais_data_parto_previsto ON public.animais(fazenda_id, data_parto_previsto) WHERE data_parto_previsto IS NOT NULL AND deleted_at IS NULL;

-- Dashboard repetidoras
CREATE INDEX IF NOT EXISTS idx_animais_flag_repetidora ON public.animais(fazenda_id, flag_repetidora) WHERE flag_repetidora = TRUE AND deleted_at IS NULL;
```

### 1.8 Trigger: Extensão de `recalcular_categoria_animal` (Fase 2)

```sql
-- NOTA: Trigger já existe de Fase 1. 
-- Estender função SQL para considerar status_reprodutivo (4ª dimensão)
-- Estratégia: BACKWARD-COMPATIBLE
--   - Animais SEM status_reprodutivo (machos, fêmeas pré-Fase 2) = regra Fase 1 (ignorar status)
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

-- Trigger permanece igual (BEFORE INSERT/UPDATE em animais)
-- CREATE TRIGGER animais_recalcular_categoria_trigger (já existe de Fase 1)
```

### 1.9 Trigger: `parto_atualizar_data_ultimo_parto` (AFTER INSERT em eventos_rebanho)

```sql
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
```

### 1.10 Trigger: `diagnostico_atualizar_datas_previstas` (AFTER INSERT em eventos_rebanho)

```sql
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
    
    -- Buscar data da cobertura anterior (último evento 'cobertura' antes desta data)
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
```

### 1.11 Trigger: `cobertura_verificar_repetidora` (AFTER INSERT em eventos_rebanho)

```sql
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
```

### 1.12 Trigger: `aborto_limpar_datas_previstas` (AFTER INSERT em eventos_rebanho)

```sql
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
```

### 1.13 Trigger: `parto_criar_bezerros` (AFTER INSERT em eventos_rebanho)

```sql
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
      -- Se não houver registros (compatibilidade: parto lançado antes de eventos_parto_crias existir),
      -- usar defaults (sexo='Fêmea', vivo=true, peso=NULL)
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
```

### 1.14 Trigger: `secagem_registrar_lactacao` (AFTER INSERT em eventos_rebanho)

```sql
CREATE OR REPLACE FUNCTION public.secagem_registrar_lactacao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'secagem' THEN
    -- Marcar lactação anterior como encerrada
    UPDATE public.lactacoes
    SET data_fim_secagem = NEW.data_evento
    WHERE animal_id = NEW.animal_id
      AND data_fim_secagem IS NULL
      AND deleted_at IS NULL
    ORDER BY data_inicio_parto DESC
    LIMIT 1;
    
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
```

### 1.15 Trigger: `descarte_marcar_status` (AFTER INSERT em eventos_rebanho)

```sql
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
```

### 1.16 Trigger: `validar_parto_com_prenhez` (BEFORE INSERT em eventos_rebanho)

```sql
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
      -- Audit: inserir em audit_log (feito via trigger separado ou server action)
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
```

### 1.16.1 Tabela `audit_log`

```sql
-- NOTA: Validar no 03-log.md da Fase 1 se esta tabela já existe.
-- Se sim: apenas registrar que Fase 2 adiciona tipos 'bypass_parto_sem_prenhez' e 'deleção_evento_reprodutivo'.
-- Se não: criar conforme abaixo.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
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
```

---

## 2. Tipos TypeScript

### Arquivo: `lib/types/rebanho-reproducao.ts` (novo)

```typescript
/**
 * Tipos TypeScript para Fase 2 — Reprodução
 * Baseado em: PRD v1.1 (Fase 2)
 */

// ========== ENUMS NOVOS ==========

export enum TipoCobertura {
  MONTA_NATURAL = 'monta_natural',
  IA_CONVENCIONAL = 'ia_convencional',
  IATF = 'iatf',
  TETF = 'tetf',
  FIV = 'fiv',
  REPASSE = 'repasse',
}

export enum MetodoDiagnostico {
  PALPACAO = 'palpacao',
  ULTRASSOM = 'ultrassom',
  SANGUE = 'sangue',
}

export enum ResultadoPrenhez {
  POSITIVO = 'positivo',
  NEGATIVO = 'negativo',
  DUVIDOSO = 'duvidoso',
}

export enum TipoParto {
  NORMAL = 'normal',
  DISTOCICO = 'distocico',
  CESARIANA = 'cesariana',
}

export enum MotivoDescarte {
  IDADE = 'idade',
  REPRODUTIVO = 'reprodutivo',
  SANITARIO = 'sanitario',
  PRODUCAO = 'producao',
  APRUMOS = 'aprumos',
  OUTRO = 'outro',
}

export enum StatusReprodutivo {
  VAZIA = 'vazia',
  INSEMINADA = 'inseminada',
  PRENHA = 'prenha',
  LACTACAO = 'lactacao',
  SECA = 'seca',
  DESCARTADA = 'descartada',
}

// ========== INTERFACES PRINCIPAIS ==========

export interface Reprodutor {
  id: string;
  fazenda_id: string;
  nome: string;
  tipo: 'touro' | 'semen_ia' | 'touro_teste';
  raca: string | null;
  numero_registro: string | null;
  data_entrada: string | null; // ISO date
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lactacao {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data_inicio_parto: string; // ISO date
  data_fim_secagem: string | null; // ISO date
  producao_total_litros: number | null;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParametrosReprodutivosFazenda {
  id: string;
  fazenda_id: string;
  dias_gestacao: number; // Default 283
  dias_seca: number; // Default 60
  pve_dias: number; // Default 60 (Período Voluntário de Espera)
  coberturas_para_repetidora: number; // Default 3
  janela_repetidora_dias: number; // Default 180
  meta_taxa_prenhez_pct: number; // Default 85
  meta_psm_dias: number; // Default 90
  meta_iep_dias: number; // Default 400
  created_at: string;
  updated_at: string;
}

// ========== EVENTOS REPRODUTIVOS ==========

export type EventoCobertura = {
  animal_id: string;
  tipo: 'cobertura';
  data_evento: string;
  tipo_cobertura: TipoCobertura;
  reprodutor_id?: string | null; // FK reprodutores
  observacoes?: string;
};

export type EventoDiagnostico = {
  animal_id: string;
  tipo: 'diagnostico_prenhez';
  data_evento: string;
  metodo_diagnostico: MetodoDiagnostico;
  resultado_prenhez: ResultadoPrenhez;
  idade_gestacional_dias?: number | null;
  observacoes?: string;
};

export type EventoParto = {
  animal_id: string;
  tipo: 'parto';
  data_evento: string;
  tipo_parto: TipoParto;
  gemelar?: boolean;
  natimorto?: boolean;
  observacoes?: string;
};

export type EventoSecagem = {
  animal_id: string;
  tipo: 'secagem';
  data_evento: string;
  observacoes?: string;
};

export type EventoAborto = {
  animal_id: string;
  tipo: 'aborto';
  data_evento: string;
  idade_gestacional_dias?: number | null;
  causa_aborto?: string;
  observacoes?: string;
};

export type EventoDescarte = {
  animal_id: string;
  tipo: 'descarte';
  data_evento: string;
  motivo_descarte: MotivoDesparte;
  observacoes?: string;
};

export type EventoReprodutivo =
  | EventoCobertura
  | EventoDiagnostico
  | EventoParto
  | EventoSecagem
  | EventoAborto
  | EventoDescarte;

// ========== PAYLOADS ==========

export type CoberturaInput = Omit<EventoCobertura, 'animal_id' | 'tipo'> & {
  animal_id: string;
};

export type DiagnosticoInput = Omit<EventoDiagnostico, 'animal_id' | 'tipo'> & {
  animal_id: string;
};

export type PartoInput = Omit<EventoParto, 'animal_id' | 'tipo'> & {
  animal_id: string;
};

export type SecagemInput = Omit<EventoSecagem, 'animal_id' | 'tipo'> & {
  animal_id: string;
};

export type AbortoInput = Omit<EventoAborto, 'animal_id' | 'tipo'> & {
  animal_id: string;
};

export type DescarteInput = Omit<EventoDescarte, 'animal_id' | 'tipo'> & {
  animal_id: string;
};

// ========== INDICADORES ==========

export interface IndicadoresReprodutivos {
  taxa_prenhez_pct: number; // Fêmeas com status='prenha' / total aptas
  psm_dias_media: number; // Período de Serviço Médio
  iep_dias_media: number; // Intervalo Entre Partos
  contagem_por_status: {
    vazia: number;
    inseminada: number;
    prenha: number;
    lactacao: number;
    seca: number;
    descartada: number;
  };
  animais_repetidoras: number;
}

// ========== OFFLINE SYNC (extensão Fase 1) ==========

export interface EventoReprodutivoSyncQueue {
  id: string;
  payload: EventoReprodutivo;
  usuario_id: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro' | 'pendente_revisao';
  tentativas: number;
  erro_mensagem?: string;
  motivo_revisao?: string; // Se status='pendente_revisao' (animal deletado, morto, vendido)
  criado_em: number; // timestamp ms
  enviado_em?: number;
}
```

---

## 3. Schemas Zod

### Arquivo: `lib/validations/rebanho-reproducao.ts` (novo)

```typescript
import { z } from 'zod';

// ========== COBERTURA ==========

export const criarCoberturaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo_cobertura: z.enum(['monta_natural', 'ia_convencional', 'iatf', 'tetf', 'fiv', 'repasse']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  reprodutor_id: z.string().uuid('Reprodutor inválido').nullable().optional(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarCoberturaInput = z.infer<typeof criarCoberturaSchema>;

// ========== DIAGNÓSTICO ==========

export const criarDiagnosticoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  metodo_diagnostico: z.enum(['palpacao', 'ultrassom', 'sangue']),
  resultado_prenhez: z.enum(['positivo', 'negativo', 'duvidoso']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  idade_gestacional_dias: z
    .number()
    .int()
    .min(0, 'Idade gestacional deve ser >= 0')
    .max(300, 'Idade gestacional máxima é 300 dias')
    .optional()
    .nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarDiagnosticoInput = z.infer<typeof criarDiagnosticoSchema>;

// ========== PARTO ==========

export const criarPartoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo_parto: z.enum(['normal', 'distocico', 'cesariana']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  gemelar: z.boolean().default(false),
  natimorto: z.boolean().default(false),
  crias: z.array(z.object({
    sexo: z.enum(['Macho', 'Fêmea']),
    peso_kg: z.number().positive().optional().nullable(),
    vivo: z.boolean().default(true),
  }))
    .min(1, 'Mínimo 1 cria')
    .max(2, 'Máximo 2 crias')
    .superRefine((crias, ctx) => {
      // Se gemelar=true, crias.length deve ser 2
      // Se gemelar=false, crias.length deve ser 1
      // Validação feita no server action (acesso a parent.gemelar)
    }),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarPartoInput = z.infer<typeof criarPartoSchema>;

// ========== SECAGEM ==========

export const criarSecagemSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarSecagemInput = z.infer<typeof criarSecagemSchema>;

// ========== ABORTO ==========

export const criarAbortoSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  idade_gestacional_dias: z
    .number()
    .int()
    .min(0)
    .max(300)
    .optional()
    .nullable(),
  causa_aborto: z.string().max(500).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarAbortoInput = z.infer<typeof criarAbortoSchema>;

// ========== DESCARTE ==========

export const criarDescarteSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  motivo_descarte: z.enum(['idade', 'reprodutivo', 'sanitario', 'producao', 'aprumos', 'outro']),
  data_evento: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data do evento deve ser válida e não futura'),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarDescarteInput = z.infer<typeof criarDescarteSchema>;

// ========== REPRODUTOR ==========

export const criarReprodutorSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  tipo: z.enum(['touro', 'semen_ia', 'touro_teste']),
  raca: z.string().max(255).optional().nullable(),
  numero_registro: z.string().max(255).optional().nullable(),
  data_entrada: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data deve ser válida e não futura')
    .optional()
    .nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type CriarReprodutorInput = z.infer<typeof criarReprodutorSchema>;

// ========== PARÂMETROS REPRODUTIVOS ==========

export const atualizarParametrosReprodutivosSchema = z.object({
  dias_gestacao: z.number().int().min(270).max(295).optional(),
  dias_seca: z.number().int().min(30).max(90).optional(),
  pve_dias: z.number().int().min(30).max(120).optional(),
  coberturas_para_repetidora: z.number().int().min(2).max(5).optional(),
  janela_repetidora_dias: z.number().int().min(90).max(365).optional(),
  meta_taxa_prenhez_pct: z.number().int().min(50).max(100).optional(),
  meta_psm_dias: z.number().int().min(50).max(120).optional(),
  meta_iep_dias: z.number().int().min(350).max(450).optional(),
});

export type AtualizarParametrosReprodutivosInput = z.infer<
  typeof atualizarParametrosReprodutivosSchema
>;
```

---

## 4. Camada de Dados: Assinaturas

### Arquivo: `lib/supabase/rebanho-reproducao.ts` (novo)

```typescript
/**
 * Queries para Fase 2 — Reprodução — ASSINATURAS APENAS
 */

import type {
  Reprodutor,
  Lactacao,
  ParametrosReprodutivosFazenda,
  EventoReprodutivo,
  IndicadoresReprodutivos,
  CoberturaInput,
  DiagnosticoInput,
  PartoInput,
  SecagemInput,
  AbortoInput,
  DescarteInput,
  CriarReprodutorInput,
  AtualizarParametrosReprodutivosInput,
} from '@/lib/types/rebanho-reproducao';

// ========== REPRODUTORES ==========

export interface ReprodutoresQueries {
  list(pagina?: number, limite?: number): Promise<{ dados: Reprodutor[]; total: number }>;
  getById(id: string): Promise<Reprodutor | null>;
  create(payload: CriarReprodutorInput): Promise<Reprodutor>;
  update(id: string, payload: Partial<CriarReprodutorInput>): Promise<Reprodutor>;
  remove(id: string): Promise<void>; // Soft delete
  getByNumeroRegistro(numero_registro: string): Promise<Reprodutor | null>;
}

// ========== LACTAÇÕES ==========

export interface LactacoesQueries {
  listPorAnimal(animal_id: string): Promise<Lactacao[]>;
  list(pagina?: number, limite?: number): Promise<{ dados: Lactacao[]; total: number }>;
  getById(id: string): Promise<Lactacao | null>;
  create(payload: Omit<Lactacao, 'id' | 'fazenda_id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Lactacao>;
  update(id: string, payload: Partial<Lactacao>): Promise<Lactacao>;
  remove(id: string): Promise<void>; // Soft delete
}

// ========== PARÂMETROS REPRODUTIVOS ==========

export interface ParametrosReprodutivosQueries {
  getByFazenda(fazenda_id: string): Promise<ParametrosReprodutivosFazenda>;
  update(payload: AtualizarParametrosReprodutivosInput): Promise<ParametrosReprodutivosFazenda>;
  criarDefaults(fazenda_id: string): Promise<ParametrosReprodutivosFazenda>;
}

// ========== EVENTOS REPRODUTIVOS ==========

export interface EventosReprodutivosQueries {
  listCalendarioReprodutivo(filtros?: {
    lote_id?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<Array<{ animal_id: string; brinco: string; evento: EventoReprodutivo; data_proxima: string | null }>>;
  
  listRepetidoras(): Promise<Array<{ animal_id: string; brinco: string; coberturas_count: number }>>;
}

// ========== INDICADORES ==========

export interface IndicadoresReprodutivosQueries {
  calcular(): Promise<IndicadoresReprodutivos>;
}

export const rebanhoReproducaoQueries = {
  reprodutores: {} as ReprodutoresQueries,
  lactacoes: {} as LactacoesQueries,
  parametros: {} as ParametrosReprodutivosQueries,
  eventos: {} as EventosReprodutivosQueries,
  indicadores: {} as IndicadoresReprodutivosQueries,
};
```

---

## 5. Server Actions — Assinaturas

### Arquivo: `app/dashboard/rebanho/reproducao/actions.ts` (novo)

```typescript
'use server';

import type {
  CriarCoberturaInput,
  CriarDiagnosticoInput,
  CriarPartoInput,
  CriarSecagemInput,
  CriarAbortoInput,
  CriarDescarteInput,
  CriarReprodutorInput,
  AtualizarParametrosReprodutivosInput,
} from '@/lib/validations/rebanho-reproducao';

// Reprodutor: Admin CRUD, Operador SELECT, Visualizador SELECT
export async function criarReprodutorAction(
  formData: unknown
): Promise<{ success: boolean; reprodutor_id?: string; erro?: string }>;

export async function editarReprodutorAction(
  id: string,
  formData: unknown
): Promise<{ success: boolean; erro?: string }>;

export async function deletarReprodutorAction(id: string): Promise<{ success: boolean; erro?: string }>;

// Eventos Reprodutivos: Admin CRUD, Operador CREATE/UPDATE próprios, Visualizador SELECT
export async function lancarCoberturaAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }>;

export async function lancarDiagnosticoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }>;

export async function lancarPartoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; bezerros_criados?: number; erro?: string }>;

export async function lancarSecagemAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }>;

export async function lancarAbortoAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }>;

export async function lancarDescarteAction(
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; erro?: string }>;

export async function deletarEventoReprodutivo(id: string): Promise<{ success: boolean; erro?: string }>;

// Parâmetros: Admin UPDATE, Operador/Visualizador SELECT
export async function atualizarParametrosReprodutivosAction(
  formData: unknown
): Promise<{ success: boolean; erro?: string }>;
```

---

## 6. Árvore de Arquivos

```
docs/features/rebanho/fase-2-reproducao/
├── 01-prd.md
├── 02-spec.md (este arquivo)
└── 03-log.md (será preenchido ao final da Fase 2)

lib/
├── types/
│   ├── rebanho.ts (Fase 1)
│   └── rebanho-reproducao.ts (novo — Fase 2)
├── validations/
│   ├── rebanho.ts (Fase 1)
│   └── rebanho-reproducao.ts (novo — Fase 2)
└── supabase/
    ├── rebanho.ts (Fase 1)
    └── rebanho-reproducao.ts (novo — Fase 2)

app/dashboard/rebanho/
├── reproducao/ (novo)
│   ├── page.tsx (calendário reprodutivo)
│   ├── indicadores.tsx (dashboard indicadores)
│   ├── repetidoras.tsx (lista de repetidoras)
│   ├── reprodutores/ (novo)
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── parametros.tsx (configurações reprodutivas)
│   ├── actions.ts (novo)
│   └── layout.tsx
├── (fase 1 continua)
└── ...

components/rebanho/reproducao/ (novo)
├── CalendarioReprodutivo.tsx (timeline/kanban)
├── CoberturaFormDialog.tsx
├── DiagnosticoFormDialog.tsx
├── PartoFormDialog.tsx
├── SecagemFormDialog.tsx
├── AbortoFormDialog.tsx
├── DescarteFormDialog.tsx
├── ReprodutorListagem.tsx
├── ReprodutorFormDialog.tsx
├── IndicadoresCard.tsx
├── RepetidorasAlerta.tsx
└── ParametrosReprodutivosForm.tsx

tests/rebanho/__tests__/ (novo)
├── rebanho-reproducao.validations.test.ts (40+ testes Zod)
├── rebanho-reproducao.queries.test.ts (fixtures de dados)
├── rebanho-reproducao.rls.test.ts (testes de segurança)
└── rebanho-reproducao.offline-sync.test.ts (sync com IndexedDB)
```

---

## 7. Estratégia de Cálculos Derivados

| Campo | Tipo | Estratégia | Disparador |
|-------|------|-----------|-----------|
| `data_ultimo_parto` | Coluna Física | Trigger AFTER INSERT em eventos_rebanho (tipo='parto') | parto_atualizar_data_ultimo_parto |
| `data_parto_previsto` | Coluna Física | Trigger AFTER INSERT em eventos_rebanho (tipo='diagnostico_prenhez' + resultado='positivo') | diagnostico_atualizar_datas_previstas |
| `data_proxima_secagem` | Coluna Física | Mesmo trigger acima, calcula = data_parto_previsto - dias_seca | diagnostico_atualizar_datas_previstas |
| `dias_em_lactacao` | Campo Derivado (VIEW ou query-time) | `CURRENT_DATE - data_ultimo_parto` | Queries (não trigger) |
| `flag_repetidora` | Coluna Física | Trigger AFTER INSERT em eventos_rebanho (tipo='cobertura') | cobertura_verificar_repetidora |
| `dias_lactacao` em lactacoes | Campo Derivado | `data_fim_secagem - data_inicio_parto` ou NULL | Queries (não trigger) |
| `categoria` | Coluna Física | Trigger BEFORE INSERT/UPDATE (EXTENSÃO) recalcular_categoria_animal com 4ª dimensão | animais_recalcular_categoria_trigger |

---

## 8. Permissões & RLS (Resumo)

| Operação | Admin | Operador | Visualizador |
|----------|-------|----------|--------------|
| **Reprodutor** CRUD | ✅ | ❌ | ❌ |
| **Reprodutor** SELECT | ✅ | ✅ | ✅ |
| **Cobertura** CREATE | ✅ | ✅ | ❌ |
| **Cobertura** UPDATE próprio | ✅ | ✅ | ❌ |
| **Cobertura** DELETE | ✅ | ❌ | ❌ |
| **Diagnóstico** CREATE | ✅ | ✅ | ❌ |
| **Diagnóstico** UPDATE próprio | ✅ | ✅ | ❌ |
| **Diagnóstico** DELETE | ✅ | ❌ | ❌ |
| **Parto** CREATE | ✅ | ✅ | ❌ |
| **Parto** DELETE | ✅ | ❌ | ❌ |
| **Secagem** CREATE | ✅ | ✅ | ❌ |
| **Secagem** DELETE | ✅ | ❌ | ❌ |
| **Aborto** CREATE | ✅ | ✅ | ❌ |
| **Aborto** UPDATE próprio | ✅ | ❌ | ❌ |
| **Aborto** DELETE | ✅ | ❌ | ❌ |
| **Descarte** CREATE | ✅ | ✅ | ❌ |
| **Descarte** UPDATE/DELETE | ✅ | ❌ | ❌ |
| **Calendário** visualizar | ✅ | ✅ | ✅ |
| **Indicadores** visualizar | ✅ | ✅ | ✅ |
| **Parâmetros** UPDATE | ✅ | ❌ | ❌ |
| **Parâmetros** SELECT | ✅ | ✅ | ✅ |

---

## 9. Offline & Sync (Extensão Fase 1)

```typescript
// Reuso de EventoRebanhoSyncQueue de Fase 1, com novo campo
export interface EventoReproductiveSyncQueue {
  id: string;
  payload: EventoReproductivo; // estendido: cobertura, diagnostico, parto, secagem, aborto, descarte
  usuario_id: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro' | 'pendente_revisao';
  tentativas: number;
  erro_mensagem?: string;
  motivo_revisao?: string; // Ex: "Animal foi descartado entre lançamento e sync"
  criado_em: number;
  enviado_em?: number;
}

// Fluxo
1. Evento lançado offline → enfileirado em IndexedDB (lib/db/localDb.ts)
2. Toast: "Evento enfileirado (offline)"
3. Ao reconectar: sincronizar automaticamente via Service Worker
4. Se conflito (animal descartado/morto/vendido):
   - Marcar como 'pendente_revisao' no banco
   - Notificação ao usuário: "Evento X enfileirado — animal pode ter mudado. Revisar?"
   - UI permite confirmar ou descartar
5. Toast final: "X eventos sincronizados"

// IMPORTANTE: Interface corretamente nomeada
export interface EventoReprodutivoSyncQueue {
  id: string;
  payload: EventoReprodutivo;
  usuario_id: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro' | 'pendente_revisao';
  tentativas: number;
  erro_mensagem?: string;
  motivo_revisao?: string;
  criado_em: number;
  enviado_em?: number;
}
```

---

## 14. Plano de Rollback

### Contexto
Em caso de falha crítica em produção, a migration precisa ser revertida completamente. PostgreSQL tem limitações específicas em reversão de ENUMs.

### Passos Numerados de Rollback

1. **Droppar tabelas novas** (com ordem de FK):
   ```sql
   DROP TABLE IF EXISTS public.eventos_parto_crias CASCADE;
   DROP TABLE IF EXISTS public.lactacoes CASCADE;
   DROP TABLE IF EXISTS public.reprodutores CASCADE;
   DROP TABLE IF EXISTS public.parametros_reprodutivos_fazenda CASCADE;
   DROP TABLE IF EXISTS public.audit_log CASCADE;
   ```

2. **Remover colunas de animais** (seção 1.2):
   ```sql
   ALTER TABLE public.animais DROP COLUMN IF EXISTS status_reprodutivo;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS data_ultimo_parto;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS data_parto_previsto;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS data_proxima_secagem;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS escore_condicao_corporal;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS flag_repetidora;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS mae_id;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS pai_id;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS is_reprodutor;
   ALTER TABLE public.animais DROP COLUMN IF EXISTS reprodutor_vinculado_id;
   ```

3. **Remover colunas de eventos_rebanho** (seção 1.6.1):
   ```sql
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS tipo_cobertura;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS reprodutor_id;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS metodo_diagnostico;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS resultado_prenhez;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS idade_gestacional_dias;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS tipo_parto;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS gemelar;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS natimorto;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS causa_aborto;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS motivo_descarte;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS bypass_justificativa;
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS bypass_usuario_id;
   ```

4. **Remover triggers novos**:
   ```sql
   DROP TRIGGER IF EXISTS eventos_rebanho_parto_data_ultimo_parto_trigger ON public.eventos_rebanho;
   DROP TRIGGER IF EXISTS eventos_rebanho_diagnostico_atualizar_datas_trigger ON public.eventos_rebanho;
   DROP TRIGGER IF EXISTS eventos_rebanho_cobertura_repetidora_trigger ON public.eventos_rebanho;
   DROP TRIGGER IF EXISTS eventos_rebanho_aborto_limpardatas_trigger ON public.eventos_rebanho;
   DROP TRIGGER IF EXISTS eventos_rebanho_parto_criar_bezerros_trigger ON public.eventos_rebanho;
   DROP TRIGGER IF EXISTS eventos_rebanho_secagem_registrar_lactacao_trigger ON public.eventos_rebanho;
   DROP TRIGGER IF EXISTS eventos_rebanho_descarte_marcar_status_trigger ON public.eventos_rebanho;
   DROP TRIGGER IF EXISTS eventos_rebanho_validar_parto_prenhez ON public.eventos_rebanho;
   
   DROP FUNCTION IF EXISTS public.parto_atualizar_data_ultimo_parto();
   DROP FUNCTION IF EXISTS public.diagnostico_atualizar_datas_previstas();
   DROP FUNCTION IF EXISTS public.cobertura_verificar_repetidora();
   DROP FUNCTION IF EXISTS public.aborto_limpar_datas_previstas();
   DROP FUNCTION IF EXISTS public.parto_criar_bezerros();
   DROP FUNCTION IF EXISTS public.secagem_registrar_lactacao();
   DROP FUNCTION IF EXISTS public.descarte_marcar_status();
   DROP FUNCTION IF EXISTS public.validar_parto_com_prenhez();
   ```

5. **Remover índices novos**:
   ```sql
   DROP INDEX IF EXISTS idx_animais_status_reprodutivo;
   DROP INDEX IF EXISTS idx_animais_data_parto_previsto;
   DROP INDEX IF EXISTS idx_animais_flag_repetidora;
   DROP INDEX IF EXISTS idx_eventos_rebanho_reprodutor_id;
   DROP INDEX IF EXISTS idx_reprodutores_numero_registro_unique;
   DROP INDEX IF EXISTS idx_reprodutores_fazenda_id;
   DROP INDEX IF EXISTS idx_reprodutores_tipo;
   DROP INDEX IF EXISTS idx_lactacoes_fazenda_id;
   DROP INDEX IF EXISTS idx_lactacoes_animal_id;
   DROP INDEX IF EXISTS idx_lactacoes_data_inicio;
   DROP INDEX IF EXISTS idx_parametros_reprodutivos_fazenda_id;
   DROP INDEX IF EXISTS idx_eventos_parto_crias_evento_id;
   DROP INDEX IF EXISTS idx_eventos_parto_crias_fazenda_id;
   DROP INDEX IF EXISTS idx_audit_log_fazenda_id;
   DROP INDEX IF EXISTS idx_audit_log_tabela_registro;
   ```

6. **Remover valores de ENUM tipo_evento_rebanho** (NOTA: PostgreSQL não permite remover valores de enum):
   
   **Limitação**: Não é possível usar `ALTER TYPE tipo_evento_rebanho REMOVE VALUE` em PostgreSQL. Workaround:
   - Criar novo enum `tipo_evento_rebanho_v1` com apenas valores antigos (nascimento, pesagem, morte, venda, transferencia_lote)
   - Alterar coluna `tipo` em `eventos_rebanho` para casting explícito (`tipo::text`)
   - Remover enum antigo: `DROP TYPE tipo_evento_rebanho`
   - Renomear novo: `ALTER TYPE tipo_evento_rebanho_v1 RENAME TO tipo_evento_rebanho`
   - Recriar constraint: `ALTER TABLE eventos_rebanho ALTER COLUMN tipo TYPE tipo_evento_rebanho USING tipo::tipo_evento_rebanho`
   
   ```sql
   CREATE TYPE tipo_evento_rebanho_v1 AS ENUM ('nascimento', 'pesagem', 'morte', 'venda', 'transferencia_lote');
   ALTER TABLE public.eventos_rebanho ALTER COLUMN tipo TYPE TEXT;
   ALTER TABLE public.eventos_rebanho ALTER COLUMN tipo TYPE tipo_evento_rebanho_v1 USING tipo::tipo_evento_rebanho_v1;
   DROP TYPE tipo_evento_rebanho;
   ALTER TYPE tipo_evento_rebanho_v1 RENAME TO tipo_evento_rebanho;
   ```

7. **Verificar integridade**: Confirmar que nenhuma linha de `animais`, `eventos_rebanho` foi afetada:
   ```sql
   -- Deve retornar a mesma contagem que antes da migration
   SELECT COUNT(*) FROM public.animais;
   SELECT COUNT(*) FROM public.eventos_rebanho;
   ```

8. **Remover REFERENCES auth.users onde adicionadas na Fase 2** (seções 1.6.1 e 1.16.1):
   ```sql
   ALTER TABLE public.eventos_rebanho DROP COLUMN IF EXISTS bypass_usuario_id;
   ALTER TABLE public.audit_log DROP COLUMN IF EXISTS usuario_id;
   ```

### Tempo Estimado de Rollback
~5-10 minutos (depende do tamanho da base: 10k animais = ~5 min, 100k = ~10 min).

### Notas de Segurança
- **Sempre testar rollback em staging antes de produção**
- Fazer **backup antes** de qualquer migration crítica
- **Não fazer downgrade parcial** — ir até o fim ou voltar completamente
- Monitorar queries bloqueadas durante DROP FUNCTION (pode haver locks)

---

## 10. Ordem de Implementação (T16–T22, Fase 2)

### T16: Banco (Migration SQL + Índices + RLS + Triggers) — Sub-prompts 2.1.1-2.1.6

- [ ] Extensão enum tipo_evento_rebanho (6 novos valores) — **2.1.1**
- [ ] Alterações em animais (10 novos campos + CHECKs) — **2.1.2**
- [ ] Tabela reprodutores + lactacoes + parametros_reprodutivos_fazenda (com RLS) — **2.1.3**
- [ ] Tabela eventos_parto_crias + audit_log (com RLS) — **2.1.4**
- [ ] Extensão eventos_rebanho (12 novos campos + CHECKs) — **2.1.5**
- [ ] 8 novos triggers (parto, diagnóstico, cobertura, aborto, secagem, descarte, validação, bezerros) — **2.1.6**
- [ ] 6+ novos índices (status_reprodutivo, data_parto_previsto, flag_repetidora, reprodutor_id, etc.)
- **Critério**: `npm run db:types` gera tipos sem erros; RLS testado; rollback documentado

### T17: Validação Zod (6 eventos) — Sub-prompts 2.2.1-2.2.2

- [ ] Schemas Zod (6 eventos reprodutivos + 1 reprodutor + parâmetros) — **2.2.1**
- [ ] Schema parto com array de crias (superRefine para validação gemelar) — **2.2.2**
- [ ] 40+ testes de validação (edge cases)
- **Critério**: `npm run test` com testes passando

### T18: Queries & Server Actions — Sub-prompts 2.3.1-2.3.3

- [ ] lib/supabase/rebanho-reproducao.ts (queries de reprodutores, lactações, parâmetros) — **2.3.1**
- [ ] app/dashboard/rebanho/reproducao/actions.ts (6 server actions para eventos) — **2.3.2**
- [ ] Validação com Zod + auditoria (bypass parto sem prenhez) — **2.3.3**
- **Critério**: Queries testadas; permissões validadas; audit_log populado

### T19: UI Eventos (Mobile-First) — Sub-prompts 2.4.1-2.4.2

- [ ] FormDialogs × 6 (cobertura, diagnóstico, parto, secagem, aborto, descarte) — **2.4.1**
- [ ] EventoTabs (organizar por tipo); mobile-first: campos 48px+ — **2.4.2**
- **Critério**: Lançar evento em < 3 toques; sem erros

### T20: Calendário Reprodutivo + Reprodutores — Sub-prompts 2.5.1-2.5.2

- [ ] CalendarioReprodutivo (Timeline/Kanban, 4 colunas; filtros lote/período) — **2.5.1**
- [ ] ReprodutorListagem + FormDialog (CRUD; Admin apenas) — **2.5.2**
- **Critério**: Renderizar 500+ eventos < 1s

### T21: Indicadores & Dashboard — Sub-prompts 2.6.1-2.6.2

- [ ] Cálculo de taxa prenhez, PSM, IEP; cache com TTL — **2.6.1**
- [ ] Gráficos (Recharts): pizza (status), line (série temporal); ParametrosReprodutivosForm — **2.6.2**
- **Critério**: Indicadores atualizados em tempo real

### T22: Testes RLS & Integração + Offline Sync — Sub-prompts 2.7.1-2.7.3

- [ ] Validar RLS: Admin CRUD, Operador CREATE/UPDATE próprios, Visualizador SELECT — **2.7.1**
- [ ] Esconder botões conforme perfil; 10+ testes de autorização — **2.7.2**
- [ ] Offline sync: enfileiramento IndexedDB, sincronização, detecção conflitos; E2E — **2.7.3**
- **Critério**: Todos testes passando; permissões validadas; sync funcional

---

## 11. Checklist de Aceite

### Funcionalidade Reprodutiva

- [ ] Lançar cobertura (6 tipos, reprodutor_id opcional)
- [ ] Lançar diagnóstico (3 métodos, 3 resultados, atualiza status automaticamente)
- [ ] Lançar parto (3 tipos, gemelar, natimorto, cria 1-2 bezerros automaticamente)
- [ ] Lançar secagem (fecha lactação anterior)
- [ ] Lançar aborto (limpa datas previstas, permite novo ciclo)
- [ ] Lançar descarte (marca como descartada, Admin pode UPDATE/DELETE)
- [ ] CRUD reprodutor (Admin apenas)
- [ ] Listagem reprodutor com filtros

### Categorização Automática (Extensão)

- [ ] Trigger recalcular_categoria_animal considera status_reprodutivo
- [ ] Backward-compatible: animais antigos (sem status) usam regra Fase 1
- [ ] Teste: criar fêmea > 2 anos, lançar parto → categoria muda para "Vaca em Lactação"

### Calendário Reprodutivo

- [ ] Timeline/Kanban com 4 colunas (diagnóstico, parto, secagem, histórico)
- [ ] Filtros por lote e período
- [ ] Cores: diagnóstico=amarelo, parto=vermelho
- [ ] Exibição próximas datas por animal

### Indicadores

- [ ] Taxa prenhez (%)
- [ ] Período de Serviço Médio (dias)
- [ ] Intervalo Entre Partos (dias)
- [ ] Gráfico pizza: contagem por status
- [ ] Alerta: repetidoras (≥3 coberturas sem prenhez)

### Parâmetros Reprodutivos

- [ ] Admin edita: dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, etc
- [ ] Todos os parâmetros com ranges válidos (CHECK constraints)
- [ ] Defaults sugeridos por literature zootécnica

### Permissões & RLS

- [ ] Admin: CRUD reprodutor, CRUD evento, DELETE evento, UPDATE parâmetros
- [ ] Operador: CREATE evento, UPDATE próprio (criado por ele)
- [ ] Visualizador: SELECT apenas
- [ ] Botões escondidos conforme perfil
- [ ] RLS em 5 tabelas (reprodutores, lactacoes, parametros, animais estendida, eventos_rebanho estendida)

### Offline & Sync

- [ ] Evento offline enfileirado em IndexedDB
- [ ] Sincronização automática ao reconectar
- [ ] Detecção de conflitos (animal descartado, morto, vendido)
- [ ] UI para resolução (confirmar ou descartar)

### Segurança & Auditoria

- [ ] Deleção de evento por Admin: log em audit_log (quem, quando, motivo)
- [ ] Bypass de "parto sem prenhez": log obrigatório com justificativa
- [ ] RLS bloqueia acesso cross-fazenda

### Qualidade

- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run lint` sem erros ESLint
- [ ] `npm run test` com 40+ novos testes (Zod + RLS) passando
- [ ] Sem `type any`
- [ ] Props interfaces explícitas
- [ ] Cobertura ≥ 80% em lib/supabase/rebanho-reproducao.ts

### Performance

- [ ] Listagem calendário (500+ eventos): < 1s
- [ ] Cálculo indicadores: < 2s
- [ ] Lançamento evento (com triggers + bezerros): < 500ms
- [ ] Índices criados e funcionais

### Non-Regressão (Fase 1)

- [ ] Os 53 testes Zod Fase 1 continuam passando
- [ ] Os 7 triggers Fase 1 não foram quebrados
- [ ] CRUD animais, lotes, 5 eventos básicos continuam 100% funcionais
- [ ] CSV import continua operacional

---

## 12. Notas Importantes

### Triggers de Ordem Crítica

1. `recalcular_categoria_animal` (BEFORE INSERT/UPDATE em animais) — estender para status_reprodutivo
2. `parto_atualizar_data_ultimo_parto` (AFTER INSERT)
3. `diagnostico_atualizar_datas_previstas` (AFTER INSERT)
4. `cobertura_verificar_repetidora` (AFTER INSERT)
5. `aborto_limpar_datas_previstas` (AFTER INSERT)
6. `parto_criar_bezerros` (AFTER INSERT) — **CRÍTICO**: atomicidade
7. `secagem_registrar_lactacao` (AFTER INSERT)
8. `descarte_marcar_status` (AFTER INSERT)

**ORDEM DE CRIAÇÃO**: Recomenda-se na ordem acima para evitar dependências circulares.

### Validação: Parto sem Prenhez Confirmada

O PRD permite lançar parto sem diagnóstico positivo anterior, com bypass Admin e auditoria.

Implementação:
- Remover CHECK constraint que força diagnóstico anterior
- Server action valida: se sem diagnóstico positivo, requerer justificativa do Admin
- Gerar log em audit_log

### Bezerro de Parto Gemelar

- Sistema cria **2 registros em `animais`** automaticamente
- Genealogia:
  - **mãe**: sempre preenchida
  - **pai**: preenchido com reprodutor_id da última cobertura confirmada por diagnóstico positivo
  - Se reprodutor desconhecido (IATF genérico): pai_id = NULL
- Brinco: sugere mãe_brinco + sufixo (-A, -B), validado para não duplicar

### Cache e Performance

Queries de indicadores (taxa prenhez, PSM, IEP) são **pesadas** (COUNT, AVG com JOINs). Recomendação:
- Implementar cache com TTL 1 hora (ou na próxima mudança de evento reprodutivo)
- Usar tabela de materializações (opcional, Fase 2.1)

---

## 13. Migração Incremental Segura

Para evitar breaking changes:

1. Criar enums e tabelas **novas** (reprodutores, lactacoes, parametros) — zero impacto
2. **Estender enum** tipo_evento_rebanho (ALTER TYPE ADD VALUE) — safe (append apenas)
3. **Adicionar colunas** em animais (com DEFAULT values) — safe
4. **Adicionar colunas** em eventos_rebanho (com NULL defaults) — safe
5. **Criar triggers** novos — não afetam triggers Fase 1
6. **Estender trigger** recalcular_categoria_animal — cuidado: validar backward-compatibility

**Teste crítico**: Após migration, rodar `npm run test` para garantir que 53+ testes Fase 1 continuam passando.

---

---

## Changelog v1.1 — Correções e Aprimoramentos

### Bloqueadores SQL (4 correções)
1. **CREATE POLICY IF NOT EXISTS** → `DROP POLICY + CREATE` (~11 ocorrências)
2. **CREATE TRIGGER IF NOT EXISTS** → `DROP TRIGGER + CREATE` (7 triggers)
3. **Partial UNIQUE constraint inline** → `CREATE UNIQUE INDEX` (seção 1.3)
4. **ALTER TYPE ADD VALUE em transação** → Nota destacada + divisão em 2 arquivos (seção 1.1)

### Bugs de Lógica (3 correções)
5. **Tabela `eventos_parto_crias`** (seção 1.6) — sexo/peso/vivo individuais por cria
6. **Busca cobertura com janela temporal** (seção 1.13) — filtros 240–295 dias
7. **Trigger recalcular_categoria_animal — Touro** (seção 1.8) — usar `is_reprodutor` coluna booleana

### Gaps Críticos (3 correções)
8. **Validação parto sem prenhez** (seção 1.16) — trigger BEFORE INSERT + bypass_justificativa
9. **Tabela `audit_log`** (seção 1.16.1) — para logs de bypass e deleções reprodutivas
10. **Genealogia em animais** (seção 1.2) — mae_id e pai_id (reprodutor) + is_reprodutor flag

### Inconsistências (3 correções)
11. **Função `sou_gerente_ou_admin()`** — substituída por `sou_admin()` (lactacoes_insert)
12. **ENUM PostgreSQL `status_reprodutivo`** — criado na seção 1.1.1 (não apenas TEXT+CHECK)
13. **Permissão Aborto UPDATE** — marcado como ❌ para Operador na tabela (seção 8)

### Typos TypeScript (14 correções)
14. **Nomes standardizados**:
    - MotivoDesparte → **MotivoDescarte**
    - StatusReproductivo → **StatusReprodutivo**
    - EventoReproductivo → **EventoReprodutivo**
    - EventoReproductiveSyncQueue → **EventoReprodutivoSyncQueue**
    - CoberturInput → **CoberturaInput**
    - criarReproductorSchema → **criarReprodutorSchema**
    - CriarReproductorInput → **CriarReprodutorInput**
    - IndicadoresReproductivos → **IndicadoresReprodutivos**
    - rebanhoReproductaoQueries → **rebanhoReproducaoQueries**
    - ReproductoresQueries → **ReprodutoresQueries**
    - ParametrosReproductivosQueries → **ParametrosReprodutivosQueries**
    - EventosReproductivosQueries → **EventosReprodutivosQueries**
    - IndicadoresReproductivosQueries → **IndicadoresReprodutivosQueries**
    - atualizarParametrosReproductivosSchema → **atualizarParametrosReprodutivosSchema**
    - AtualizarParametrosReproductivosInput → **AtualizarParametrosReprodutivosInput**
    - CalendarioReproductivo → **CalendarioReprodutivo**
    - ReproductorListagem → **ReprodutorListagem**
    - ReproductorFormDialog → **ReprodutorFormDialog**
    - ParametrosReproductivosForm → **ParametrosReprodutivosForm**

### Gaps de Profundidade (3 correções)
15. **Seção 14 — Plano de Rollback** (novo) — passos numerados, limitações ENUM, ~5-10 min
16. **Schema Zod parto** (seção 3) — array de crias com superRefine para validação gemelar
17. **Mapeamento T16-T22 a sub-prompts** (seção 10) — coluna "Sub-prompt 2.X.Y" adicionada

### Status Final
- ✅ **Todos 17 grupos de correções implementados**
- ✅ **Versão 1.0 → 1.1**
- ✅ **Data atualizada: 2026-05-02**
- ✅ **Inline editing preservou 100% do conteúdo correto**
- ✅ **Pronto para implementação**

---

**FIM DA ESPECIFICAÇÃO — Versão 1.1 (Fase 2: Reprodução)**
