# SPEC — Módulo Rebanho: Implementação Completa
**Versão:** 1.0  
**Data:** 2026-05-07  
**Base:** PRD-rebanho1.md (auditoria 2026-05-07) + database-snapshot.md + migrations existentes  
**Objetivo:** Guia acionável sessão-a-sessão para completar o módulo de ~60% para 100%

---

## ESTADO ATUAL DO BANCO (pós-migrations existentes)

Antes de qualquer implementação, o banco atual (após todas as migrations até `20260505_fix_categoria_bezerro_por_sexo.sql`) tem:

| Tabela | Estado | Observação |
|---|---|---|
| `animais` | ✅ Existe | Faltam: nome, sisbov_crbio, origem, peso_nascimento, data_nascimento_estimada, foto_url |
| `lotes` | ✅ Existe | Falta: tipo_rebanho |
| `eventos_rebanho` | ✅ Existe | Cobre: pesagem, morte, venda, transferência, cobertura, diagnóstico, parto, secagem, aborto, descarte |
| `pesos_animal` | ✅ Existe | Faltam: metodo, condicao_corporal |
| `reprodutores` | ✅ Existe | Completo |
| `lactacoes` | ✅ Existe | Completo |
| `parametros_reprodutivos_fazenda` | ✅ Existe | Completo |
| `eventos_parto_crias` | ✅ Existe | Completo |
| `audit_log` | ✅ Existe | Completo |
| `categorias_rebanho` | ✅ Existe | Usado pelo Planejador de Silagem |
| `producoes_leiteiras` | ❌ Não existe | Criar |
| `eventos_sanitarios` | ❌ Não existe | Criar |

**Bug crítico nas migrations existentes:** O trigger `parto_criar_bezerros` em `20260502000002_rebanho_fase2_main.sql` tenta inserir `status = 'Natimorto'` ao criar animais natimortos, mas `'Natimorto'` não é um valor válido do enum `status_animal` (`'Ativo'`, `'Morto'`, `'Vendido'`). Isso causa erro em runtime para partos com `natimorto = TRUE`.

---

## SEÇÃO 1 — MIGRATIONS SUPABASE

Execute nesta ordem exata. Migrations B e C contêm `ALTER TYPE ADD VALUE` e **devem rodar isoladas** (fora de transação).

---

### Migration A — `20260507000001_rebanho_animais_campos_opcionais.sql`

Segura — apenas ADD COLUMN com valores default/NULL. Sem impacto em código existente.

```sql
-- Migration A: Campos opcionais em animais (spec completa)
-- Dependência: nenhuma. Executar dentro de BEGIN/COMMIT.

BEGIN;

-- Nome do animal (opcional, spec diz "Nome (opcional)")
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS nome TEXT NULL;

-- Código SISBOV/CRBIO (rastreabilidade, opcional)
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS sisbov_crbio TEXT NULL;

-- Origem do animal
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS origem TEXT NULL
  CHECK (origem IS NULL OR origem IN ('nascido', 'comprado'));

-- Peso ao nascimento (opcional)
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS peso_nascimento NUMERIC(6,2) NULL
  CHECK (peso_nascimento IS NULL OR peso_nascimento > 0);

-- Flag: data de nascimento é estimada?
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS data_nascimento_estimada BOOLEAN NOT NULL DEFAULT FALSE;

-- URL da foto do animal (armazenada no Supabase Storage)
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS foto_url TEXT NULL;

-- Índice para busca por nome (busca textual por nome)
CREATE INDEX IF NOT EXISTS idx_animais_nome
  ON public.animais(fazenda_id, nome)
  WHERE nome IS NOT NULL AND deleted_at IS NULL;

-- Índice para rastreabilidade SISBOV
CREATE INDEX IF NOT EXISTS idx_animais_sisbov_crbio
  ON public.animais(sisbov_crbio)
  WHERE sisbov_crbio IS NOT NULL;

COMMIT;
```

---

### Migration B — `20260507000002_rebanho_status_descartado.sql`

⚠️ **CRÍTICO: NÃO colocar dentro de BEGIN/COMMIT. ALTER TYPE ADD VALUE não suporta transações.**

```sql
-- Migration B: Adicionar 'Descartado' ao enum status_animal
-- ⚠️ EXECUTAR ISOLADO — fora de transação

ALTER TYPE public.status_animal ADD VALUE 'Descartado';

-- Resultado final do enum: 'Ativo', 'Morto', 'Vendido', 'Descartado'
```

---

### Migration C — `20260507000003_rebanho_tipo_dupla_aptidao.sql`

⚠️ **CRÍTICO: NÃO colocar dentro de BEGIN/COMMIT — contém ALTER TYPE ADD VALUE.**

```sql
-- Migration C: Suporte a 'dupla_aptidao' em tipo_rebanho
-- ⚠️ EXECUTAR ISOLADO — fora de transação

-- Passo 1: Atualizar CHECK constraint em animais (TEXT, não ENUM)
-- Remover constraint antiga e recriar com novo valor
ALTER TABLE public.animais
  DROP CONSTRAINT IF EXISTS animais_tipo_rebanho_check;

ALTER TABLE public.animais
  ADD CONSTRAINT animais_tipo_rebanho_check
  CHECK (tipo_rebanho IN ('leiteiro', 'corte', 'dupla_aptidao'));

-- Passo 2: Recalcular categoria para dupla_aptidao
-- Dupla aptidão usa as mesmas categorias do leiteiro (vacas produzem leite)
CREATE OR REPLACE FUNCTION public.recalcular_categoria_animal()
RETURNS TRIGGER AS $$
DECLARE
  v_idade_anos NUMERIC;
  v_categoria TEXT;
BEGIN
  v_idade_anos := (CURRENT_DATE - NEW.data_nascimento) / 365.25;

  -- 'dupla_aptidao' usa as mesmas categorias que 'leiteiro'
  IF NEW.tipo_rebanho IN ('leiteiro', 'dupla_aptidao') THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 1 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
    ELSIF v_idade_anos < 2 THEN
      IF NEW.sexo = 'Fêmea' THEN
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'prenha' THEN 'Novilha Prenha'
          ELSE 'Novilha'
        END;
      ELSE
        v_categoria := 'Novilho';
      END IF;
    ELSE
      IF NEW.sexo = 'Fêmea' THEN
        v_categoria := CASE
          WHEN NEW.status_reprodutivo = 'lactacao' THEN 'Vaca em Lactação'
          WHEN NEW.status_reprodutivo = 'seca'     THEN 'Vaca Seca'
          WHEN NEW.status_reprodutivo = 'prenha'   THEN 'Vaca Prenha'
          ELSE 'Vaca Vazia'
        END;
      ELSE
        v_categoria := CASE WHEN NEW.is_reprodutor THEN 'Touro' ELSE 'Novilho' END;
      END IF;
    END IF;

  ELSIF NEW.tipo_rebanho = 'corte' THEN
    IF v_idade_anos < 0.25 THEN
      v_categoria := CASE WHEN NEW.sexo = 'Macho' THEN 'Bezerro' ELSE 'Bezerra' END;
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
```

---

### Migration D — `20260507000004_fix_natimorto_status.sql`

Corrige bug crítico no trigger existente que usa `'Natimorto'` (valor inválido no enum).

```sql
-- Migration D: Corrigir bug no trigger parto_criar_bezerros
-- Bug: usa 'Natimorto' como status, mas o enum só tem Ativo/Morto/Vendido/Descartado
-- Fix: natimortos nascem com status 'Morto'; campo vivo=FALSE em eventos_parto_crias documenta o fato

BEGIN;

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
    v_num_bezerros := CASE WHEN NEW.gemelar THEN 2 ELSE 1 END;

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

    WHILE v_i < v_num_bezerros LOOP
      v_i := v_i + 1;

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

      v_sexo_cria := COALESCE(v_sexo_cria, 'Fêmea');
      v_vivo_cria := COALESCE(v_vivo_cria, TRUE);

      SELECT brinco INTO v_brinco_base FROM public.animais WHERE id = NEW.animal_id;
      v_brinco_novo := v_brinco_base || '-' || CHR(64 + v_i);

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

      INSERT INTO public.animais (
        fazenda_id, brinco, sexo, tipo_rebanho, data_nascimento,
        status, status_reprodutivo, mae_id, pai_id, raca, created_at, updated_at
      ) VALUES (
        NEW.fazenda_id,
        v_brinco_novo,
        v_sexo_cria,
        (SELECT tipo_rebanho FROM public.animais WHERE id = NEW.animal_id),
        NEW.data_evento,
        -- FIX: usar 'Morto' para natimortos (enum válido), não 'Natimorto'
        CASE WHEN NOT v_vivo_cria THEN 'Morto'::"public"."status_animal" ELSE 'Ativo'::"public"."status_animal" END,
        'vazia',
        NEW.animal_id,
        v_reprodutor_id,
        (SELECT raca FROM public.animais WHERE id = NEW.animal_id),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING id INTO v_novo_animal_id;

      UPDATE public.eventos_parto_crias
      SET animal_criado_id = v_novo_animal_id
      WHERE id = (
        SELECT id FROM public.eventos_parto_crias
        WHERE evento_id = NEW.id AND animal_criado_id IS NULL
        ORDER BY created_at, id
        LIMIT 1
      );
    END LOOP;

    UPDATE public.animais
    SET status_reprodutivo = 'lactacao'
    WHERE id = NEW.animal_id;

    INSERT INTO public.lactacoes (
      fazenda_id, animal_id, data_inicio_parto, created_at, updated_at
    ) VALUES (
      NEW.fazenda_id, NEW.animal_id, NEW.data_evento,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
```

---

### Migration E — `20260507000005_rebanho_lotes_tipo_rebanho.sql`

```sql
-- Migration E: Adicionar tipo_rebanho a lotes
BEGIN;

ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS tipo_rebanho TEXT NULL
  CHECK (tipo_rebanho IS NULL OR tipo_rebanho IN ('leiteiro', 'corte', 'misto'));

-- Índice para filtrar lotes por tipo
CREATE INDEX IF NOT EXISTS idx_lotes_tipo_rebanho
  ON public.lotes(fazenda_id, tipo_rebanho)
  WHERE tipo_rebanho IS NOT NULL;

COMMIT;
```

---

### Migration F — `20260507000006_rebanho_pesos_campos.sql`

```sql
-- Migration F: Adicionar metodo e condicao_corporal a pesos_animal + trigger direto

BEGIN;

-- Método de pesagem
ALTER TABLE public.pesos_animal
  ADD COLUMN IF NOT EXISTS metodo TEXT NOT NULL DEFAULT 'balanca'
  CHECK (metodo IN ('balanca', 'estimativa_visual'));

-- Escore de condição corporal (ECC) — escala 1-5
ALTER TABLE public.pesos_animal
  ADD COLUMN IF NOT EXISTS condicao_corporal SMALLINT NULL
  CHECK (condicao_corporal IS NULL OR (condicao_corporal >= 1 AND condicao_corporal <= 5));

-- Trigger: atualizar animais.peso_atual quando peso inserido DIRETAMENTE em pesos_animal
-- (o trigger via eventos_rebanho já existe; este cobre inserção direta da aba Pesagens)
CREATE OR REPLACE FUNCTION public.pesos_animal_atualizar_peso_atual()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.animais
  SET peso_atual = (
    SELECT peso_kg
    FROM public.pesos_animal
    WHERE animal_id = NEW.animal_id
    ORDER BY data_pesagem DESC, created_at DESC
    LIMIT 1
  )
  WHERE id = NEW.animal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS pesos_animal_atualizar_peso_atual_trigger ON public.pesos_animal;
CREATE TRIGGER pesos_animal_atualizar_peso_atual_trigger
AFTER INSERT ON public.pesos_animal
FOR EACH ROW
EXECUTE FUNCTION public.pesos_animal_atualizar_peso_atual();

-- Policy de UPDATE para pesos (faltava — permite apenas admin corrigir pesagem)
DROP POLICY IF EXISTS "pesos_animal_update" ON public.pesos_animal;
CREATE POLICY "pesos_animal_update" ON public.pesos_animal
  FOR UPDATE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- Policy de DELETE para pesos (faltava)
DROP POLICY IF EXISTS "pesos_animal_delete" ON public.pesos_animal;
CREATE POLICY "pesos_animal_delete" ON public.pesos_animal
  FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());

COMMIT;
```

---

### Migration G — `20260507000007_rebanho_producoes_leiteiras.sql`

```sql
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
```

---

### Migration H — `20260507000008_rebanho_eventos_sanitarios.sql`

```sql
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
```

---

## SEÇÃO 2 — TIPOS TYPESCRIPT

### 2.1 Arquivo: `lib/types/rebanho.ts` — Modificações

#### 2.1.1 Atualizar enum `TipoRebanho`

```typescript
// ANTES:
export enum TipoRebanho {
  LEITEIRO = 'leiteiro',
  CORTE = 'corte',
}

// DEPOIS:
export enum TipoRebanho {
  LEITEIRO = 'leiteiro',
  CORTE = 'corte',
  DUPLA_APTIDAO = 'dupla_aptidao',
}
```

#### 2.1.2 Atualizar enum `StatusAnimal`

```typescript
// ANTES:
export enum StatusAnimal {
  ATIVO = 'Ativo',
  MORTO = 'Morto',
  VENDIDO = 'Vendido',
}

// DEPOIS:
export enum StatusAnimal {
  ATIVO = 'Ativo',
  MORTO = 'Morto',
  VENDIDO = 'Vendido',
  DESCARTADO = 'Descartado',
}
```

#### 2.1.3 Atualizar interface `Animal` (adicionar campos do banco e spec)

```typescript
// SUBSTITUIR a interface Animal atual por:
export interface Animal {
  id: string;
  fazenda_id: string;
  brinco: string;
  nome: string | null;                          // Migration A
  sexo: 'Macho' | 'Fêmea';
  tipo_rebanho: TipoRebanho;
  data_nascimento: string;                       // ISO date
  data_nascimento_estimada: boolean;             // Migration A
  categoria: string;
  status: StatusAnimal;
  lote_id: string | null;
  peso_atual: number | null;
  peso_nascimento: number | null;                // Migration A
  mae_id: string | null;
  pai_id: string | null;
  raca: string | null;
  observacoes: string | null;
  sisbov_crbio: string | null;                   // Migration A
  origem: 'nascido' | 'comprado' | null;         // Migration A
  foto_url: string | null;                       // Migration A
  // Campos reprodutivos (Fase 2 — já no banco)
  status_reprodutivo: StatusReprodutivo | null;
  data_ultimo_parto: string | null;
  data_parto_previsto: string | null;
  data_proxima_secagem: string | null;
  escore_condicao_corporal: number | null;
  flag_repetidora: boolean;
  is_reprodutor: boolean;
  reprodutor_vinculado_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**Nota:** Importar `StatusReprodutivo` de `./rebanho-reproducao` para evitar duplicação.

#### 2.1.4 Atualizar interface `Lote`

```typescript
export interface Lote {
  id: string;
  fazenda_id: string;
  nome: string;
  descricao: string | null;
  tipo_rebanho: 'leiteiro' | 'corte' | 'misto' | null; // Migration E
  data_criacao: string;
  created_at: string;
  updated_at: string;
}
```

#### 2.1.5 Atualizar interface `PesoAnimal`

```typescript
export interface PesoAnimal {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data_pesagem: string;                          // ISO date
  peso_kg: number;
  metodo: 'balanca' | 'estimativa_visual';       // Migration F — default 'balanca'
  condicao_corporal: 1 | 2 | 3 | 4 | 5 | null;  // Migration F
  observacoes: string | null;
  created_at: string;
}
```

#### 2.1.6 Atualizar `AnimalInput` para incluir novos campos

```typescript
export type AnimalInput = Omit<
  Animal,
  | 'id'
  | 'fazenda_id'
  | 'categoria'
  | 'peso_atual'
  | 'status_reprodutivo'
  | 'data_ultimo_parto'
  | 'data_parto_previsto'
  | 'data_proxima_secagem'
  | 'flag_repetidora'
  | 'is_reprodutor'
  | 'reprodutor_vinculado_id'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
>;
```

---

### 2.2 Novo Arquivo: `lib/types/rebanho-leiteira.ts`

```typescript
// Tipos para o módulo de Gestão Leiteira

export type TurnoProducao = 'manha' | 'tarde' | 'noite' | 'dia_inteiro';

export const TURNO_LABELS: Record<TurnoProducao, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  dia_inteiro: 'Dia Inteiro',
};

export interface ProducaoLeiteira {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data: string;                    // ISO date
  turno: TurnoProducao;
  volume_litros: number;
  observacoes: string | null;
  usuario_id: string;
  created_at: string;
}

export type ProducaoLeiteiraInput = Omit<
  ProducaoLeiteira,
  'id' | 'fazenda_id' | 'created_at'
>;

// Indicadores Leiteiros (calculados no serviço)
export interface IndicadoresLeiteiros {
  producao_media_diaria_litros: number;        // total_litros / dias no período
  producao_total_periodo_litros: number;       // soma do período
  vacas_em_lactacao: number;                   // count de animais com status_reprodutivo='lactacao'
  producao_media_por_vaca: number;             // producao_total / vacas_em_lactacao
  duracao_media_lactacoes_dias: number;        // média dos dias de lactação nas lactações encerradas
  percentual_vacas_em_lactacao: number;        // vacas_em_lactacao / total_femeas_adultas * 100
  // Integração com silos (requer buscarConsumoSilagemPeriodo)
  eficiencia_alimentar_litros_por_kg_ms: number | null; // litros / kg MS (null se sem dados silos)
}
```

---

### 2.3 Novo Arquivo: `lib/types/rebanho-sanitario.ts`

```typescript
// Tipos para o módulo de Sanidade Animal

export type TipoEventoSanitario =
  | 'vacinacao'
  | 'vermifugacao'
  | 'tratamento_veterinario'
  | 'exame_laboratorial';

export type ViaAplicacao =
  | 'subcutanea'
  | 'intramuscular'
  | 'intranasal'
  | 'oral'
  | 'topica';

export type ResultadoTratamento =
  | 'cura'
  | 'melhora'
  | 'sem_resposta'
  | 'obito'
  | 'em_tratamento';

// Base comum
interface EventoSanitarioBase {
  id: string;
  fazenda_id: string;
  animal_id: string;
  data_evento: string;        // ISO date
  responsavel: string | null;
  observacoes: string | null;
  usuario_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Discriminated union por tipo
export interface EventoVacinacao extends EventoSanitarioBase {
  tipo: 'vacinacao';
  vacina_nome: string;
  dose: string;
  via_aplicacao: ViaAplicacao;
  lote_produto: string | null;
  data_proxima_dose: string | null;   // ISO date
}

export interface EventoVermifugacao extends EventoSanitarioBase {
  tipo: 'vermifugacao';
  vacina_nome: string;                // nome do vermífugo
  via_aplicacao: ViaAplicacao;
  lote_produto: string | null;
  data_proxima_dose: string | null;
}

export interface EventoTratamentoVeterinario extends EventoSanitarioBase {
  tipo: 'tratamento_veterinario';
  diagnostico: string;
  medicamento: string;
  duracao_dias: number | null;
  resultado: ResultadoTratamento | null;
}

export interface EventoExameLaboratorial extends EventoSanitarioBase {
  tipo: 'exame_laboratorial';
  tipo_exame: string;                 // Ex: "Brucelose", "Tuberculose"
  resultado: string | null;
  numero_protocolo: string | null;
}

export type EventoSanitario =
  | EventoVacinacao
  | EventoVermifugacao
  | EventoTratamentoVeterinario
  | EventoExameLaboratorial;

// Raw DB row (antes de discriminar)
export interface EventoSanitarioRow extends EventoSanitarioBase {
  tipo: TipoEventoSanitario;
  vacina_nome: string | null;
  dose: string | null;
  via_aplicacao: ViaAplicacao | null;
  lote_produto: string | null;
  data_proxima_dose: string | null;
  diagnostico: string | null;
  medicamento: string | null;
  duracao_dias: number | null;
  resultado: ResultadoTratamento | string | null;
  tipo_exame: string | null;
  numero_protocolo: string | null;
}

export type EventoSanitarioInput = Omit<
  EventoSanitarioRow,
  'id' | 'fazenda_id' | 'deleted_at' | 'created_at' | 'updated_at'
>;

// Alerta sanitário (para dashboard)
export interface AlertaSanitario {
  animal_id: string;
  animal_brinco: string;
  animal_nome: string | null;
  tipo: TipoEventoSanitario;
  vacina_nome: string;
  data_proxima_dose: string;
  dias_para_vencimento: number;  // negativo = vencido
}
```

---

### 2.4 Validações Zod — Adições em `lib/validations/rebanho.ts`

```typescript
// Adicionar ao arquivo existente:

// ========== ANIMAL — atualizar criarAnimalSchema ==========
// Substituir a definição existente para incluir novos campos:

export const criarAnimalSchema = z.object({
  brinco: z.string().min(1, 'Brinco obrigatório').max(255),
  nome: z.string().max(255).optional().nullable(),
  sexo: z.enum(['Macho', 'Fêmea'], { message: 'Sexo inválido' }),
  tipo_rebanho: z.enum(['leiteiro', 'corte', 'dupla_aptidao'], {
    message: 'Tipo de rebanho inválido',
  }).default('leiteiro'),
  data_nascimento: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data inválida ou futura'),
  data_nascimento_estimada: z.boolean().default(false),
  lote_id: z.string().uuid().nullable().optional(),
  mae_id: z.string().uuid().nullable().optional(),
  pai_id: z.string().uuid().nullable().optional(),
  raca: z.string().max(255).optional().nullable(),
  origem: z.enum(['nascido', 'comprado']).optional().nullable(),
  peso_nascimento: z.number().positive().max(200).optional().nullable(),
  sisbov_crbio: z.string().max(100).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

// ========== LOTE — atualizar criarLoteSchema ==========

export const criarLoteSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  descricao: z.string().max(500).optional().nullable(),
  tipo_rebanho: z.enum(['leiteiro', 'corte', 'misto']).optional().nullable(),
});

// ========== PESAGEM — atualizar criarEventoPesagemSchema ==========

export const criarEventoPesagemSchema = z.object({
  animal_id: z.string().uuid(),
  tipo: z.literal(TipoEvento.PESAGEM),
  data_evento: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data inválida ou futura'),
  peso_kg: z.number().positive('Peso deve ser > 0').max(2000),
  metodo: z.enum(['balanca', 'estimativa_visual']).default('balanca'),
  condicao_corporal: z.number().int().min(1).max(5).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

// ========== NOVOS: Produção Leiteira ==========

export const criarProducaoLeiteiraSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  data: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data inválida ou futura'),
  turno: z.enum(['manha', 'tarde', 'noite', 'dia_inteiro'], {
    message: 'Turno inválido',
  }),
  volume_litros: z.number().positive('Volume deve ser > 0').max(100),
  observacoes: z.string().optional().nullable(),
});

export type CriarProducaoLeiteiraInput = z.infer<typeof criarProducaoLeiteiraSchema>;

// ========== NOVOS: Evento Sanitário ==========

export const criarEventoSanitarioSchema = z.discriminatedUnion('tipo', [
  // Vacinação
  z.object({
    tipo: z.literal('vacinacao'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    vacina_nome: z.string().min(1, 'Nome da vacina obrigatório').max(255),
    dose: z.string().min(1).max(100),
    via_aplicacao: z.enum(['subcutanea', 'intramuscular', 'intranasal', 'oral', 'topica']),
    lote_produto: z.string().max(100).optional().nullable(),
    data_proxima_dose: z.string().optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
  }),
  // Vermifugação
  z.object({
    tipo: z.literal('vermifugacao'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    vacina_nome: z.string().min(1, 'Nome do produto obrigatório').max(255),
    via_aplicacao: z.enum(['subcutanea', 'intramuscular', 'intranasal', 'oral', 'topica']),
    lote_produto: z.string().max(100).optional().nullable(),
    data_proxima_dose: z.string().optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
  }),
  // Tratamento veterinário
  z.object({
    tipo: z.literal('tratamento_veterinario'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    diagnostico: z.string().min(1, 'Diagnóstico obrigatório').max(500),
    medicamento: z.string().min(1, 'Medicamento obrigatório').max(255),
    duracao_dias: z.number().int().positive().optional().nullable(),
    resultado: z.enum(['cura', 'melhora', 'sem_resposta', 'obito', 'em_tratamento']).optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
  }),
  // Exame laboratorial
  z.object({
    tipo: z.literal('exame_laboratorial'),
    animal_id: z.string().uuid(),
    data_evento: z.string().refine((v) => !isNaN(new Date(v).getTime())),
    tipo_exame: z.string().min(1, 'Tipo de exame obrigatório').max(255),
    resultado: z.string().max(500).optional().nullable(),
    numero_protocolo: z.string().max(100).optional().nullable(),
    responsavel: z.string().max(255).optional().nullable(),
    observacoes: z.string().optional().nullable(),
  }),
]);

export type CriarEventoSanitarioInput = z.infer<typeof criarEventoSanitarioSchema>;
```

---

## SEÇÃO 3 — ESTRUTURA DE ROTAS

### Estado Atual vs. Estado Esperado

```
ATUAL:                                    ESPERADO / AÇÃO:
/rebanho/
├── page.tsx                       →  REFATORAR: add filtros tipo/sexo/categoria + quick-access buttons
├── novo/page.tsx                  →  REFATORAR: novos campos + fix Zod error messages
├── [id]/page.tsx                  →  REFATORAR: implementar abas Leiteira e Sanidade
├── [id]/editar/page.tsx           →  REFATORAR: fix Select lote (controlled state) + novos campos
├── lotes/page.tsx                 →  MANTER (sem mudanças)
├── lotes/novo/page.tsx            →  REFATORAR: adicionar campo tipo_rebanho
├── lotes/[id]/page.tsx            →  MANTER (sem mudanças)
├── importar/page.tsx              →  MANTER (sem mudanças)
├── indicadores/page.tsx           →  MANTER + adicionar ao Sidebar + adicionar alertas
├── reproducao/
│   ├── layout.tsx                 →  MANTER
│   ├── TabsNav.tsx                →  MANTER
│   ├── page.tsx                   →  MANTER (tem CalendarioReprodutivo, não é vazio)
│   ├── eventos/page.tsx           →  MANTER
│   ├── indicadores/page.tsx       →  MANTER (reprodutivos específicos — diferente do /indicadores geral)
│   ├── parametros/page.tsx        →  MANTER
│   ├── repetidoras/page.tsx       →  MANTER
│   └── reprodutores/              →  MANTER
├── leiteira/page.tsx              →  CRIAR DO ZERO (Phase 5)
├── corte/page.tsx                 →  CRIAR DO ZERO (Phase 6)
├── sanidade/page.tsx              →  CRIAR DO ZERO (Phase 7)
└── movimentacoes/page.tsx         →  CRIAR DO ZERO (Phase 8)
```

### Resolução do Conflito /indicadores vs /reproducao/indicadores

**Definição clara (implementar via comentários no topo de cada página):**
- `/rebanho/indicadores` → **Dashboard Geral**: composição do rebanho, KPIs gerais (natalidade, mortalidade, GMD), evolução do efetivo, alertas sanitários/reprodutivos por prazo
- `/rebanho/reproducao/indicadores` → **Indicadores Reprodutivos**: IEP, taxa de prenhez, taxa de concepção, dias em aberto, taxa de serviço

Ambas coexistem. Não eliminar nenhuma. Adicionar breadcrumbs claros para distinguir.

### Atualização do Sidebar

**Arquivo:** `components/Sidebar.tsx`  
**Ação:** Substituir `rebanhoSubRoutes` por:

```typescript
const rebanhoSubRoutes: RouteItem[] = [
  { label: 'Indicadores',    icon: BarChart3,          href: '/dashboard/rebanho/indicadores',                    badge: null },
  { label: 'Reprodução',     icon: Heart,               href: '/dashboard/rebanho/reproducao/eventos',             badge: null },
  { label: 'Reprodutores',   icon: Dna,                 href: '/dashboard/rebanho/reproducao/reprodutores',        badge: null },
  { label: 'Parâmetros',     icon: SlidersHorizontal,   href: '/dashboard/rebanho/reproducao/parametros',          badge: null },
  { label: 'Leiteira',       icon: Milk,                href: '/dashboard/rebanho/leiteira',                       badge: 'comingSoon' },
  { label: 'Corte',          icon: Scale,               href: '/dashboard/rebanho/corte',                          badge: 'comingSoon' },
  { label: 'Sanidade',       icon: Stethoscope,         href: '/dashboard/rebanho/sanidade',                       badge: 'comingSoon' },
  { label: 'Movimentações',  icon: ArrowRightLeft,      href: '/dashboard/rebanho/movimentacoes',                  badge: 'comingSoon' },
];
```

**Imports a adicionar em Sidebar.tsx:**
```typescript
import { BarChart3, Milk, Scale, Stethoscope, ArrowRightLeft } from 'lucide-react';
```

Os badges `'comingSoon'` podem ser removidos conforme cada sub-módulo for implementado.

---

## SEÇÃO 4 — QUERIES SUPABASE

### 4.1 Novas queries em `lib/supabase/rebanho.ts`

#### `listMovimentacoes(filtros, limit, offset)`
- **Parâmetros:** `{ tipo?: string[], data_inicio?: string, data_fim?: string, lote_id?: string }`
- **O que faz:** Busca eventos de tipo morte/venda/nascimento/transferencia_lote/descarte com JOIN em animais (brinco, nome, categoria)
- **Retorna:** `Array<EventoRebanhoComAnimal>` — evento + dados básicos do animal
- **Select:** `id, tipo, data_evento, observacoes, comprador, valor_venda, lote_id_destino, motivo_descarte, animais(brinco, nome, categoria, tipo_rebanho)`

```typescript
export async function listMovimentacoes(
  filtros: {
    tipos?: string[];
    data_inicio?: string;
    data_fim?: string;
    lote_id?: string;
  },
  limit = 50,
  offset = 0
): Promise<EventoRebanhoComAnimal[]>
```

#### `countAnimaisAtivos(filtros?)`
- **O que faz:** COUNT de animais ativos com filtros opcionais (tipo_rebanho, lote_id, sexo)
- **Usado por:** Dashboard de indicadores para KPIs rápidos

### 4.2 Novas queries em `lib/supabase/rebanho-leiteira.ts` (novo arquivo)

```typescript
// ---- CRIAR ----
export async function criarProducaoLeiteira(
  payload: CriarProducaoLeiteiraInput
): Promise<ProducaoLeiteira>

// ---- LISTAR POR ANIMAL ----
export async function listProducoesLeiteiras(
  animalId: string,
  limit = 30,
  offset = 0
): Promise<ProducaoLeiteira[]>

// ---- LISTAR POR FAZENDA (período) ----
export async function listProducoesLeiteirasNoPeriodo(
  dataInicio: string,
  dataFim: string
): Promise<ProducaoLeiteira[]>
// Select: id, animal_id, data, turno, volume_litros, observacoes, created_at
// JOIN animais: brinco, nome, status_reprodutivo, lote_id

// ---- TOTAL POR PERÍODO ----
// Retorna soma total e por animal (para dashboard leiteiro)
export async function totalProducaoLeiteiraPeriodo(
  dataInicio: string,
  dataFim: string
): Promise<{ total_litros: number; por_animal: Array<{ animal_id: string; brinco: string; nome: string | null; total_litros: number }> }>

// ---- DELETAR ----
export async function deletarProducaoLeiteira(id: string): Promise<void>

// ---- EDITAR ----
export async function editarProducaoLeiteira(
  id: string,
  payload: Partial<Pick<ProducaoLeiteira, 'volume_litros' | 'turno' | 'observacoes'>>
): Promise<ProducaoLeiteira>
```

**Columns select obrigatório (nunca `*`):**
```typescript
'id, fazenda_id, animal_id, data, turno, volume_litros, observacoes, usuario_id, created_at'
```

### 4.3 Novas queries em `lib/supabase/rebanho-sanitario.ts` (novo arquivo)

```typescript
// ---- CRIAR ----
export async function criarEventoSanitario(
  payload: EventoSanitarioInput
): Promise<EventoSanitarioRow>

// ---- LISTAR POR ANIMAL ----
export async function listEventosSanitariosPorAnimal(
  animalId: string,
  limit = 50,
  offset = 0
): Promise<EventoSanitarioRow[]>
// Select: todos os campos da tabela, ordenado por data_evento DESC

// ---- LISTAR ALERTAS DE VACINAÇÃO ----
// Retorna vacinas com data_proxima_dose nos próximos N dias (incluindo vencidas)
export async function listAlertasVacinacao(
  diasAntecedencia = 30
): Promise<AlertaSanitario[]>
// Join: eventos_sanitarios → animais (brinco, nome)
// Filter: data_proxima_dose <= CURRENT_DATE + interval '{diasAntecedencia} days'
//         AND deleted_at IS NULL
// Order: data_proxima_dose ASC

// ---- LISTAR GERAL (com filtros) ----
export async function listEventosSanitarios(
  filtros: { tipo?: TipoEventoSanitario; data_inicio?: string; data_fim?: string },
  limit = 50,
  offset = 0
): Promise<EventoSanitarioRow[]>

// ---- SOFT DELETE ----
export async function deletarEventoSanitario(id: string): Promise<void>

// ---- EDITAR ----
export async function editarEventoSanitario(
  id: string,
  payload: Partial<EventoSanitarioInput>
): Promise<EventoSanitarioRow>
```

**Columns select obrigatório:**
```typescript
'id, fazenda_id, animal_id, tipo, data_evento, responsavel, observacoes, vacina_nome, dose, via_aplicacao, lote_produto, data_proxima_dose, diagnostico, medicamento, duracao_dias, resultado, tipo_exame, numero_protocolo, usuario_id, deleted_at, created_at, updated_at'
```

### 4.4 Queries faltantes em `lib/services/indicadores-rebanho.ts`

#### `calcularIEP(animaisIds?, meses = 12)`
- **Fórmula:** Para cada fêmea: diferença entre dois partos consecutivos em dias, média de todas as fêmeas nos últimos N meses
- **Fonte:** `SELECT data_inicio_parto FROM lactacoes WHERE animal_id = X ORDER BY data_inicio_parto ASC`
- **Retorna:** `{ media_dias: number; animais_com_dados: number }`

```typescript
export async function calcularIEP(
  meses = 12
): Promise<{ media_dias: number; animais_com_dados: number }>
```

#### `calcularTaxaConcepcao(dataInicio, dataFim)`
- **Fórmula:** `(diagnósticos_positivos / total_coberturas_no_periodo) × 100`
- **Fonte:** `eventos_rebanho WHERE tipo IN ('cobertura', 'diagnostico_prenhez') AND data_evento BETWEEN X AND Y`
- **Retorna:** `{ taxa_pct: number; coberturas_total: number; concepcoes: number }`

#### `calcularDiasEmAberto()`
- **Fórmula:** Para cada fêmea com `status_reprodutivo = 'lactacao'`: dias desde `data_ultimo_parto` até hoje
- **Fonte:** `SELECT data_ultimo_parto, status_reprodutivo FROM animais WHERE sexo='Fêmea' AND status='Ativo'`
- **Retorna:** `{ media_dias: number; animais_acima_meta: number; meta_psm_dias: number }`

#### `calcularPesoMedioLote(loteId)`
- **Fórmula:** `AVG(peso_atual) WHERE lote_id = X AND deleted_at IS NULL AND status = 'Ativo'`
- **Retorna:** `{ peso_medio: number; total_animais: number; lote_nome: string }`

#### `calcularProjecaoAbate(loteId, pesoAlvo = 450)`
- **Fórmula:** Para cada animal no lote: `(pesoAlvo - peso_atual) / GMD_médio` = dias até abate
- **Retorna:** `Array<{ animal_id: string; brinco: string; peso_atual: number; gmd: number; dias_para_abate: number; data_projetada: string }>`

#### `calcularArrobasProjetadas(loteId, rendimentoCarcaca = 52)`
- **Fórmula:** `SUM(peso_atual × rendimentoCarcaca / 100) / 15` (1 arroba = 15 kg)
- **Retorna:** `{ arrobas_total: number; arrobas_por_animal: number }`

---

## SEÇÃO 5 — COMPONENTES A CRIAR OU REFATORAR

### 5.1 Componentes a Refatorar

| Componente | Arquivo | O que Muda |
|---|---|---|
| Página principal | `app/dashboard/rebanho/page.tsx` | Add filtros: tipo_rebanho, sexo, categoria. Add `BotoesAcessoRapido`. |
| Form novo animal | `app/dashboard/rebanho/novo/page.tsx` | Add campos: nome, origem, peso_nascimento, sisbov_crbio, data_nascimento_estimada. Fix Zod error display. |
| Form editar animal | `app/dashboard/rebanho/[id]/editar/page.tsx` | Fix Select lote com controlled state. Add novos campos. |
| Ficha animal | `app/dashboard/rebanho/[id]/page.tsx` | Implementar `AbaProducaoLeiteira` e `AbaSanidade` (atualmente vazias). |
| Novo lote | `app/dashboard/rebanho/lotes/novo/page.tsx` | Add campo tipo_rebanho (Select: Leiteiro/Corte/Misto). |
| Indicadores | `app/dashboard/rebanho/indicadores/page.tsx` | Add seção de Alertas (vacinações vencidas, partos previstos, animais sem pesagem). |
| Sidebar | `components/Sidebar.tsx` | Expandir `rebanhoSubRoutes` (ver Seção 3). |

### 5.2 Componentes a Criar

#### `components/rebanho/BotoesAcessoRapido.tsx`
- **Cria do zero**
- **Usado em:** `app/dashboard/rebanho/page.tsx` (topo da página)
- **Responsabilidade:** Grade de botões com ícones e links rápidos para todos os sub-módulos
- **Props:** `nenhuma` — links são fixos

#### `components/rebanho/AbaProducaoLeiteira.tsx`
- **Cria do zero**
- **Usado em:** `app/dashboard/rebanho/[id]/page.tsx` (aba "Produção Leiteira")
- **Responsabilidade:** Tabela de produções + botão "Registrar Produção" + gráfico de produção diária
- **Props:** `animalId: string; tipoRebanho: TipoRebanho; sexo: string`
- **Visível apenas quando:** `sexo === 'Fêmea' && tipoRebanho IN ['leiteiro', 'dupla_aptidao']`

#### `components/rebanho/AbaSanidade.tsx`
- **Cria do zero**
- **Usado em:** `app/dashboard/rebanho/[id]/page.tsx` (aba "Sanidade")
- **Responsabilidade:** Histórico de eventos sanitários + botão "Registrar Evento" + alertas de próximas doses
- **Props:** `animalId: string`

#### `components/rebanho/FormProducaoLeiteira.tsx`
- **Cria do zero**
- **Usado por:** `AbaProducaoLeiteira.tsx` (Dialog)
- **Responsabilidade:** Formulário de registro de produção (data, turno, volume, observações)

#### `components/rebanho/FormEventoSanitario.tsx`
- **Cria do zero**
- **Usado por:** `AbaSanidade.tsx` + `app/dashboard/rebanho/sanidade/page.tsx`
- **Responsabilidade:** Formulário discriminado por tipo de evento sanitário (4 tipos com campos dinâmicos)

#### `app/dashboard/rebanho/leiteira/page.tsx`
- **Cria do zero** (RSC)
- **Responsabilidade:** Dashboard leiteiro — KPIs de produção, ranking de vacas, gráfico de produção por período, lista de vacas em lactação/seca
- **Componentes:** `DashboardKPIsLeiteiros`, `GraficoProducaoDiaria`, `TabelaVacasLactacao`, `RankingVacasProducao`

#### `app/dashboard/rebanho/corte/page.tsx`
- **Cria do zero** (RSC)
- **Responsabilidade:** Dashboard de corte — peso médio por lote, GMD médio, projeção de arrobas, lista de animais próximos ao peso-alvo

#### `app/dashboard/rebanho/sanidade/page.tsx`
- **Cria do zero** (RSC)
- **Responsabilidade:** Calendário sanitário, alertas de vacinas vencidas/próximas, histórico geral de eventos sanitários por fazenda

#### `app/dashboard/rebanho/movimentacoes/page.tsx`
- **Cria do zero** (RSC)
- **Responsabilidade:** Lista consolidada de todas as movimentações (entradas por nascimento/compra, saídas por venda/morte/descarte/abate), com filtros por tipo, período e lote

---

## SEÇÃO 6 — BUGS CRÍTICOS A CORRIGIR PRIMEIRO

### Bug #1 — Erro genérico ao criar animal

**Localização:** `app/dashboard/rebanho/actions.ts:41-43` + `app/dashboard/rebanho/novo/page.tsx:55-57`

**Causa raiz:** Quando `criarAnimalSchema.parse(formData)` lança `ZodError`, a propriedade `.message` de um `ZodError` retorna uma string JSON serializada (`[{"code":"too_small","minimum":1,...}]`), não a mensagem legível ao usuário.

**Solução exata em `actions.ts`:**

```typescript
import { z } from 'zod';

export async function criarAnimalAction(
  formData: unknown
): Promise<{ success: boolean; animal_id?: string; error?: string }> {
  try {
    const parsed = criarAnimalSchema.parse(formData);
    const resultado = await criarAnimal(parsed as CriarAnimalInput);
    revalidatePath('/dashboard/rebanho');
    return { success: true, animal_id: resultado.id };
  } catch (error) {
    // CORREÇÃO: tratar ZodError explicitamente
    if (error instanceof z.ZodError) {
      const mensagem = error.errors.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}
```

Aplicar o mesmo padrão em `editarAnimalAction`, `criarLoteAction` e `editarLoteAction`.

### Bug #2 — UUID do lote exibido no Select de edição

**Localização:** `app/dashboard/rebanho/[id]/editar/page.tsx` (campo `lote_id`)

**Causa raiz:** O componente shadcn/ui `<Select defaultValue={animal.lote_id}>` renderiza antes de `lotes` carregarem. Quando não existe `<SelectItem value={animal.lote_id}>` na lista (ainda vazia), o Radix UI exibe o `value` bruto (UUID) no trigger.

**Solução exata no componente:**

```typescript
// Substituir pattern de defaultValue por valor controlado
const [loteId, setLoteId] = useState<string>('');

// Setar APENAS quando lotes já carregaram E animal tem lote_id
useEffect(() => {
  if (lotes.length > 0 && animal?.lote_id) {
    setLoteId(animal.lote_id);
  }
}, [lotes, animal?.lote_id]);

// No JSX, usar value + onValueChange (não defaultValue):
<Select
  name="lote_id"
  value={loteId}
  onValueChange={setLoteId}
>
  <SelectTrigger>
    <SelectValue placeholder="Sem lote" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Sem lote</SelectItem>
    {lotes.map((l) => (
      <SelectItem key={l.id} value={l.id}>
        {l.nome}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Bug #3 — Indicadores invisíveis no menu

**Localização:** `components/Sidebar.tsx` — array `rebanhoSubRoutes` (linha ~70)

**Causa raiz:** `/dashboard/rebanho/indicadores` não está em `rebanhoSubRoutes`, então não aparece no submenu quando o usuário está na seção Rebanho.

**Solução exata:** Adicionar entrada no início de `rebanhoSubRoutes` (ver Seção 3, item "Atualização do Sidebar"). Requer importar `BarChart3` de `lucide-react`.

---

## SEÇÃO 7 — ORDEM DE IMPLEMENTAÇÃO

### Phase 1 — Bugs Críticos (1 sessão) [✅ Implementado]

**Arquivos tocados:**
- `app/dashboard/rebanho/actions.ts` — fix Zod error em criarAnimalAction + editarAnimalAction + criarLoteAction + editarLoteAction
- `app/dashboard/rebanho/[id]/editar/page.tsx` — fix Select lote controlled state com useEffect e onValueChange
- `components/Sidebar.tsx` — add Indicadores + módulos futuros (Leiteira, Corte, Sanidade, Movimentações) com badge 'comingSoon'

**Status:** ✅ Implementado em 2026-05-07

**Mudanças realizadas:**
- Bug #1: Adicionado `import { z } from 'zod'` e tratamento explícito de `z.ZodError` em 4 Server Actions (mapeando `error.issues` para mensagens legíveis)
- Bug #2: Substituído `defaultValue` por estado controlado (`loteId` + `useState` + `useEffect`) + `onValueChange` com wrapper para null-coalescing
- Bug #3: Adicionados ícones `BarChart3`, `Milk`, `Scale`, `Stethoscope`, `ArrowRightLeft` ao import do lucide-react e expandido `rebanhoSubRoutes` com 8 entradas (Indicadores + 4 reprodução + 3 em breve)

**Verificação:**
- ✅ `npm run build` compila sem erros TypeScript
- ✅ Todas as correções aplicadas conforme SPEC seção 6
- ✅ Nenhuma dependência adicionada (Phase 1 é independente)

---

### Phase 2 — Migrations e Tipos (1 sessão) [✅ Implementado]

**Arquivos tocados:**
- `supabase/migrations/20260507000001_rebanho_animais_campos_opcionais.sql` (criar)
- `supabase/migrations/20260507000002_rebanho_status_descartado.sql` (criar)
- `supabase/migrations/20260507000003_rebanho_tipo_dupla_aptidao.sql` (criar)
- `supabase/migrations/20260507000004_fix_natimorto_status.sql` (criar)
- `supabase/migrations/20260507000005_rebanho_lotes_tipo_rebanho.sql` (criar)
- `supabase/migrations/20260507000006_rebanho_pesos_campos.sql` (criar)
- `supabase/migrations/20260507000007_rebanho_producoes_leiteiras.sql` (criar)
- `supabase/migrations/20260507000008_rebanho_eventos_sanitarios.sql` (criar)
- `lib/types/rebanho.ts` — atualizar enums e interfaces
- `lib/types/rebanho-leiteira.ts` (criar)
- `lib/types/rebanho-sanitario.ts` (criar)
- `lib/validations/rebanho.ts` — atualizar schemas Zod

**Dependências:** Nenhuma (pode rodar paralelo a Phase 1 em contexto diferente)

**Verificar antes de começar:**
- Rodar `npm run db:types` após executar migrations para regenerar `types/supabase.ts`
- Rodar `npm run test` para confirmar que os 41+ testes de rebanho ainda passam
- A migration B (status enum) e C (tipo_rebanho constraint) devem ser executadas fora de transação

**Status de Implementação (2026-05-07):**
✅ Todas as 8 migrations criadas e executadas com sucesso no Supabase
✅ `npm run db:types` regenerou types/supabase.ts
✅ `lib/types/rebanho.ts` atualizado: 
   - Enum `TipoRebanho` agora tem `DUPLA_APTIDAO`
   - Enum `StatusAnimal` agora tem `DESCARTADO`
   - Interface `Animal` com 21 campos novos
   - Interface `Lote` com `tipo_rebanho`
   - Interface `PesoAnimal` com `metodo` e `condicao_corporal`
✅ `lib/types/rebanho-leiteira.ts` criado (novo arquivo)
✅ `lib/types/rebanho-sanitario.ts` criado (novo arquivo)
✅ `lib/validations/rebanho.ts` atualizado com 5 novos schemas Zod
✅ Componentes `AnimaisList.tsx` e `AnimalCard.tsx` atualizados com StatusAnimal.DESCARTADO
✅ `indicadores-rebanho.ts` atualizado com `dupla_aptidao` em ComposicaoRebanho
❌ Build falha em Phase 3 (queries do Supabase precisam ser atualizadas)

---

### Phase 3 — Refatoração do Existente (2-3 sessões) [✅ Implementado]

**Arquivos tocados:**
- `app/dashboard/rebanho/novo/page.tsx` — novos campos (nome, origem, peso_nascimento, sisbov_crbio, data_nascimento_estimada) + fix Zod já feito na Phase 1
- `app/dashboard/rebanho/page.tsx` — filtros tipo_rebanho/sexo/categoria + `BotoesAcessoRapido`
- `app/dashboard/rebanho/lotes/novo/page.tsx` — campo tipo_rebanho
- `app/dashboard/rebanho/[id]/page.tsx` — montar AbaProducaoLeiteira e AbaSanidade (skeletons/placeholders funcionais)
- `components/rebanho/BotoesAcessoRapido.tsx` (criar)
- `lib/validations/rebanho.ts` — atualizar criarAnimalSchema e criarLoteSchema

**Dependências:** Phase 2 (tipos precisam estar atualizados)

**Status de Implementação (2026-05-07):**
✅ `app/dashboard/rebanho/novo/page.tsx` refatorado com novos campos (nome, origem, peso_nascimento, sisbov_crbio, data_nascimento_estimada)
✅ `app/dashboard/rebanho/page.tsx` refatorado com filtros tipo_rebanho, sexo, categoria + quick-access buttons
✅ `app/dashboard/rebanho/lotes/novo/page.tsx` refatorado com campo tipo_rebanho
✅ `app/dashboard/rebanho/[id]/page.tsx` atualizado com colunas Método e Condição Corporal na aba Pesagens
✅ `components/rebanho/EventoForm/PesagemForm.tsx` atualizado com campos metodo e condicao_corporal (Select com Controller)
✅ `lib/validations/rebanho.ts` atualizado com novos schemas e error messages alinhadas com testes
✅ `lib/calculos/indicadores-rebanho.ts` corrigido — ComposicaoRebanho.por_sexo com Macho/Fêmea (capital)
✅ Testes corrigidos — 646/646 testes passando
✅ Build completo sem erros TypeScript

---

### Phase 4 — Gestão Reprodutiva Completa (2 sessões) [✅ Implementado]

**Arquivos criados/modificados:**
- ✅ `components/rebanho/reproducao/RegistroEventoDialog.tsx` — Dialog com seleção de tipo de evento
- ✅ `components/rebanho/reproducao/eventos/TipoEventoSelector.tsx` — Seletor visual de tipos
- ✅ `components/rebanho/reproducao/eventos/CoberturaForm.tsx` — Formulário de cobertura/monta
- ✅ `components/rebanho/reproducao/eventos/DiagnosticoForm.tsx` — Formulário de diagnóstico com cálculo de parto previsto
- ✅ `components/rebanho/reproducao/eventos/PartoForm.tsx` — Formulário de parto com múltiplas crias
- ✅ `components/rebanho/reproducao/eventos/SecagemForm.tsx` — Formulário de secagem
- ✅ `components/rebanho/reproducao/eventos/AbortoForm.tsx` — Formulário de aborto/perda
- ✅ `components/rebanho/reproducao/eventos/DescarteForm.tsx` — Formulário de descarte
- ✅ `lib/hooks/useReprodutores.ts` — Hook para carregar lista de reprodutores
- ✅ `app/api/rebanho/reprodutores/route.ts` — API route para GET de reprodutores
- ✅ `lib/supabase/rebanho-reproducao.ts` — 4 funções de indicadores novos:
  - `getTaxaConcepçãoIA()` — Taxa de concepção após IA (%)
  - `getDiasEmAberto()` — Média de dias pós-parto em lactação
  - `getTaxaServiço()` — Coberturas / fêmeas aptas (%)
  - `getIdadePrimeiraPariçao()` — Idade média primeira parição (meses)
- ✅ `app/dashboard/rebanho/reproducao/indicadores/page.tsx` — Integração dos 4 novos indicadores
- ✅ `components/rebanho/reproducao/IndicadoresCard.tsx` — Exibição visual dos novos indicadores (4 cards KPI)

**Indicadores implementados:**
1. ✅ IEP (Intervalo Entre Partos) — já existia via `getIEPMedia()`, mantido
2. ✅ Taxa de Concepção IA — novo, acima de 50% considerado bom
3. ✅ Dias em Aberto — novo, comparado contra meta de PSM
4. ✅ Taxa de Serviço — novo, meta 100%+ coberturas/fêmeas aptas
5. ✅ Idade Primeira Parição — novo, meta <= 28 meses

**Validações de negócio:**
- Parto requer diagnóstico positivo anterior (RPC verifica, admin pode fazer bypass)
- Secagem apenas para status_reprodutivo = 'lactacao' (validação futura no UI)
- Desmame removido (não há evento desmame no schema atual)
- Detecção de cio removida (não há evento no schema atual)

**Verificação final:**
- ✅ `npx tsc --noEmit` — zero erros de TypeScript
- ✅ `npm run build` — build completo sem erros (23.9s)
- ✅ `npm test` — 646/646 testes passando

**Dependências:** Phase 2 (tipos reprodutivos atualizados)

---

### Phase 5 — Gestão Leiteira (1-2 sessões) [✅ Implementado]

**Arquivos tocados:**
- ✅ `app/dashboard/rebanho/leiteira/page.tsx` (criar) — criado com RSC + KPIs + gráfico + ranking + alertas
- ✅ `components/rebanho/leiteira/DashboardLeiteiro.tsx` (criar) — componente client com dashboard interativo
- ✅ `components/rebanho/AbaProducaoLeiteira.tsx` (criar) — aba para ficha do animal com histórico e dialog
- ✅ `lib/supabase/rebanho-leiteira.ts` (criar) — 6 queries (criar, listar, deletar, editar, período, total)
- ✅ `app/dashboard/rebanho/leiteira/actions.ts` (criar) — 3 server actions (criar, editar, deletar)
- ✅ `app/dashboard/rebanho/[id]/page.tsx` — implementar TabsTrigger com aba Produção Leiteira (visível só fêmeas leiteiras)
- ✅ `lib/calculos/indicadores-rebanho.ts` — adicionar calcularIndicadoresLeiteiros (6 métricas)

**Status de Implementação (2026-05-07):**
✅ `lib/supabase/rebanho-leiteira.ts` — 6 queries funcionais com RLS automático
✅ `app/dashboard/rebanho/leiteira/page.tsx` — RSC com KPIs, gráfico barras (30 dias), ranking top 10, alertas de queda/partos
✅ `components/rebanho/leiteira/DashboardLeiteiro.tsx` — client component com visualizações e dialogs
✅ `components/rebanho/AbaProducaoLeiteira.tsx` — aba completa com status lactação, histórico editável, dialog registro
✅ `app/dashboard/rebanho/leiteira/actions.ts` — 3 server actions com validação Zod e permissões (operador/admin)
✅ `app/dashboard/rebanho/[id]/page.tsx` — aba "Produção Leiteira" adicionada (visível só fêmeas leiteiras/dupla-aptidão)
✅ `lib/calculos/indicadores-rebanho.ts` — função `calcularIndicadoresLeiteiros()` com 6 métricas zootécnicas
✅ Correções de TypeScript — 8 arquivos Form corrigidos (renderização de campos nullable)
✅ `npm test` — 646/646 testes passando
✅ `npm run build` — build completo sem erros TypeScript

**Verificações completadas:**
- ✅ Tabela `producoes_leiteiras` existe no banco
- ✅ Trigger `producoes_leiteiras_set_fazenda_id_trigger` funciona e atualiza fazenda_id
- ✅ RLS policies em place (SELECT todos, INSERT operador+admin, UPDATE operador+admin, DELETE admin)
- ✅ Rota `/dashboard/rebanho/leiteira` funcional
- ✅ Aba Produção Leiteira em ficha de animal carrega dados corretamente
- ✅ Dialog de registro opera em modo individual (animal) e coletivo (propriedade)

---

### Phase 6 — Gestão de Corte (1-2 sessões)

**Arquivos tocados:**
- `app/dashboard/rebanho/corte/page.tsx` (criar)
- `lib/services/indicadores-rebanho.ts` — adicionar calcularPesoMedioLote, calcularProjecaoAbate, calcularArrobasProjetadas
- Formulário de pesagem em lote (novo componente em `components/rebanho/FormPesagemLote.tsx`)

**Dependências:** Phase 2 (Migration F — metodo + condicao_corporal em pesos_animal)

**Verificar antes de começar:**
- Confirmar que `pesos_animal` tem os novos campos
- Confirmar que trigger `pesos_animal_atualizar_peso_atual_trigger` funciona
- Verificar badge 'comingSoon' removido do Sidebar para /corte

---

### Phase 7 — Sanidade (1-2 sessões)

**Arquivos tocados:**
- `app/dashboard/rebanho/sanidade/page.tsx` (criar)
- `components/rebanho/AbaSanidade.tsx` (criar)
- `components/rebanho/FormEventoSanitario.tsx` (criar)
- `lib/supabase/rebanho-sanitario.ts` (criar)
- `app/dashboard/rebanho/[id]/page.tsx` — implementar AbaSanidade com dados reais

**Dependências:** Phase 2 (Migration H — tabela eventos_sanitarios)

**Verificar antes de começar:**
- Tabela `eventos_sanitarios` existe no banco
- Trigger `set_fazenda_id` funciona na tabela

---

### Phase 8 — Movimentações (1 sessão)

**Arquivos tocados:**
- `app/dashboard/rebanho/movimentacoes/page.tsx` (criar)
- `lib/supabase/rebanho.ts` — adicionar `listMovimentacoes`

**Dependências:** Nenhuma além do Phase 2 para tipos

**Verificar antes de começar:**
- Confirmar que `eventos_rebanho` tem as colunas necessárias para listagem completa
- Verificar permissões: Operador pode ver movimentações?

---

### Phase 9 — Dashboard + Alertas (1 sessão)

**Arquivos tocados:**
- `app/dashboard/rebanho/indicadores/page.tsx` — adicionar seção de alertas
- `lib/supabase/rebanho-sanitario.ts` — query `listAlertasVacinacao` (criada na Phase 7)
- `lib/supabase/rebanho-indicadores.ts` — adicionar query `listAnimaisSemPesagem`

**Dependências:** Phase 7 (alertas sanitários) + Phase 4 (alertas reprodutivos: partos previstos)

**Verificar antes de começar:**
- `eventos_sanitarios` populada com dados de teste
- Confirmar que `animais.data_parto_previsto` é atualizado pelo trigger

---

## SEÇÃO 8 — PONTOS DE INTEGRAÇÃO COM O GESTSILO

### 8.1 Eficiência Alimentar Leiteira (litros / kg MS)

**Fórmula:** `producao_total_litros_periodo / consumo_total_ms_kg_periodo`

**Origem do Consumo MS — Opção A (Recomendada):**
- Tabela `movimentacoes_silo` — registra saídas em kg/ton
- JOIN: `movimentacoes_silo WHERE tipo = 'saida' AND data_movimentacao BETWEEN data_inicio AND data_fim`
- Coluna de volume: verificar `movimentacoes_silo.volume_kg` ou `movimentacoes_silo.quantidade_ton` (consultar `lib/supabase/silos.ts`)

**Origem do Consumo MS — Opção B (Estimativa):**
- Tabela `categorias_rebanho` — tem `consumo_ms_kg_cab_dia` por categoria
- Calcular: `SUM(animais_por_categoria × consumo_ms_kg_cab_dia × dias_periodo)`

**Nova função necessária em `lib/supabase/silos.ts`:**

```typescript
// Buscar saídas de silagem no período (para cálculo de eficiência)
export async function buscarConsumoSilagemPeriodo(
  dataInicio: string,
  dataFim: string
): Promise<{ total_kg: number; por_silo: Array<{ silo_id: string; silo_nome: string; kg_saido: number }> }>
// Select: SUM de volume nas movimentacoes_silo WHERE tipo='saida' AND período
```

**Nova função necessária em `lib/services/indicadores-rebanho.ts`:**

```typescript
export async function calcularEficienciaAlimentar(
  dataInicio: string,
  dataFim: string
): Promise<{
  litros_total: number;
  consumo_ms_kg: number;
  eficiencia_l_por_kg: number | null;  // null se não houver dados de silos
  fonte_consumo: 'movimentacoes_silo' | 'categorias_rebanho' | 'sem_dados';
}>
```

---

### 8.2 Conversão Alimentar (kg MS / kg de ganho)

**Fórmula:** `consumo_total_ms_kg / ganho_total_kg_no_periodo`

**Ganho total:** `SUM(peso_atual - peso_inicial) para todos os animais do lote no período`
- Fonte: `pesos_animal` — diferença entre primeira e última pesagem de cada animal no período

**Consumo MS:** Mesmo que 8.1 (movimentacoes_silo ou categorias_rebanho)

**Implementar em:** `lib/services/indicadores-rebanho.ts`

```typescript
export async function calcularConversaoAlimentar(
  loteId: string,
  dataInicio: string,
  dataFim: string
): Promise<{
  ganho_total_kg: number;
  consumo_ms_kg: number;
  conversao_alimentar: number | null;  // null se não houver dados suficientes
}>
```

---

### 8.3 Custo por Arroba

**Fórmula:** `custo_total_silagem_reais / arrobas_produzidas_no_periodo`

**Custo da silagem:**
- Tabela `silos` — coluna `custo_producao_ton` (adicionada em migration `20260416090500_alter_talhoes_silos_add_custo_producao.sql`)
- JOIN: `movimentacoes_silo.volume × silos.custo_producao_ton`
- OU: tabela `financeiro` WHERE categoria inclui "Silagem" (verificar schema de categorias financeiras)

**Arrobas produzidas:** Ver `calcularArrobasProjetadas` na Seção 4.4

**Implementar como:** Indicador do painel de Gestão de Corte

---

### 8.4 Verificações Necessárias Antes de Implementar Integração

Antes de implementar as funções de integração (Phases 5 e 6), verificar:

1. **Colunas de `movimentacoes_silo`:** Abrir `lib/supabase/silos.ts` e identificar as colunas exatas de volume/quantidade
2. **Coluna `custo_producao_ton`:** Confirmar que existe em `silos` após a migration de Abril/2026
3. **Relacionamento:** `movimentacoes_silo` tem `fazenda_id`? (necessário para RLS)

---

## RESUMO FINAL

| Categoria | Quantidade |
|---|---|
| **Migrations SQL** | 8 (A a H) |
| **Novos tipos TypeScript** | 2 arquivos novos + 4 interfaces atualizadas |
| **Validações Zod atualizadas/novas** | 6 schemas |
| **Novas queries Supabase** | 14 funções em 3 arquivos |
| **Novos indicadores** | 6 funções de cálculo |
| **Componentes novos** | 9 (incluindo 4 páginas) |
| **Componentes refatorados** | 7 |
| **Bugs críticos documentados** | 3 + 1 bug de migration existente (natimorto) |
| **Phases de implementação** | 9 phases, estimativa total: 14-18 sessões |

**Impacto estimado em testes:**  
A Phase 2 (migrations + tipos) vai requerer atualização dos testes existentes em `tests/security/` e `lib/services/indicadores-rebanho.test.ts` pois as interfaces `Animal` e `PesoAnimal` mudam. Verificar que os 41+ testes existentes ainda passam antes de avançar para Phase 3.
