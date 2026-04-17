# SPEC Técnica — Módulo de Estoque de Insumos (GestSilo Pro)

**Specification Document**  
Data: 2026-04-16  
Versão: 1.0  
Status: Pronto para Implementação

---

## 1. Visão Geral

### Objetivo
Transformar o PRD v2.1 em um plano executável passo a passo para implementação do módulo de Estoque de Insumos. Esta Spec é **auto-suficiente**: um desenvolvedor consegue implementar lendo apenas este documento, com código SQL pronto para executar, snippets TypeScript compiláveis e critérios verificáveis em cada fase.

### Pré-requisitos
- [ ] PRD v2.1 (`docs/insumos/PRD-insumos-v2.1.md`) aprovado por stakeholder
- [ ] Ambiente local configurado: `npm install`, `.env.local` com credenciais Supabase
- [ ] Conta Supabase com acesso ao projeto em desenvolvimento
- [ ] Conhecimento básico de: Next.js 15 (App Router), React Hook Form, Zod, Supabase
- [ ] Git branch limpa para iniciar trabalho

### Estimativa Total
- **Duração:** ~6 semanas (30 dias de trabalho)
- **Phases:** 5 (Correções → DB → Backend → Frontend → Integrações → Testes)
- **Dependências:** Nenhuma crítica; fases podem sobrepor após Fase 2 estável

### Diagrama de Dependências Entre Fases
```
┌─────────────────────────────────────────────────────────────────┐
│ Fase 1: Correções Críticas + Migrations                        │ ← Bloqueador
│ (Bug fazenda_id, deletar insumos.ts, tabelas categorias/tipos) │
└────────────────────────┬────────────────────────────────────────┘
                         │
           ┌─────────────┴──────────────┐
           ▼                            ▼
    ┌──────────────────┐        ┌──────────────────┐
    │ Fase 2: Backend  │        │ Fase 3: Frontend │ (pode iniciar em paralelo)
    │ (Queries, Hooks) │        │ (Components, UI) │
    └────────┬─────────┘        └────────┬─────────┘
             │                           │
             └───────────┬───────────────┘
                         ▼
             ┌──────────────────────────┐
             │ Fase 4: Integrações      │
             │ (Talhões, Frota, Silos)  │
             └────────────┬─────────────┘
                          ▼
             ┌──────────────────────────┐
             │ Fase 5: Testes + Polish  │
             └──────────────────────────┘
```

---

## 2. Decisões Técnicas Consolidadas

| # | Decisão | Escolha | Justificativa |
|---|---------|--------|---------------|
| **1** | **Trigger de Ajuste de Inventário** | Adicionar coluna `sinal_ajuste SMALLINT` em `movimentacoes_insumo` (valores: `+1`, `-1`, NULL). Trigger aplica: `estoque_atual = estoque_atual + (quantidade * sinal_ajuste)` | Simples, direto, sem necessidade de 2 registros separados. Validação de sinal em Zod no cliente garante integridade. |
| **2** | **Link Movimentação ↔ Despesa Financeira** | Adicionar coluna direta `despesa_id UUID REFERENCES financeiro(id) ON DELETE SET NULL` em `movimentacoes_insumo` (relação 1:1) | Mais simples que tabela join. RLS garante isolamento. Justifica coluna sobre nova tabela. |
| **3** | **Lib de Cache/Estado** | **TanStack Query v5** (`@tanstack/react-query`) em lugar de SWR. Configurar `QueryClientProvider` em `app/layout.tsx` | Padrão atual em Next.js 15+. Melhor devX que SWR. Alinhado com React 19. Instalar via `npm install @tanstack/react-query`. |
| **4** | **Server Actions vs Client Mutations** | Usar **Server Actions** do Next.js 15 para todas as mutations (create/update/delete). Validação Zod no servidor. Client components apenas para UI/leitura via TanStack Query. | Next.js 15 recomenda Server Actions. Segurança de primeira classe (validação servidor). Cache automático. |
| **5** | **Categorias e Tipos** | **Tabelas separadas** (`categorias_insumo`, `tipos_insumo`). Não usar ENUM. | Flexibilidade admin (add/edit sem código). Integridade referencial. Query otimizado com índices. Escala bem. |
| **6** | **FKs Dinâmicas para Destino** | Duas colunas simples: `destino_tipo VARCHAR(50)` + `destino_id UUID`. Validação 100% em TypeScript (não FK DB). | Simples, sem CHECK complexo. Mais pragmático para MVP. Flexível para integração futura. |
| **7** | **Soft-delete ou Hard-delete** | **Soft-delete** via coluna `ativo BOOLEAN DEFAULT TRUE`. Hard-delete em produção raramente (auditoria). | Auditoria completa. Recuperação acidental. Alinhado com `queries-audit.ts` pattern. |
| **8** | **CMP ou FIFO/PEPS** | **Custo Médio Ponderado (CMP)**. Recalcular apenas em Entrada. Saída usa CMP histórico. Ajuste não toca CMP. | Norma contábil brasileira. Simples implementar. Melhor reflete custo real produção. |

---

## 3. Estrutura de Arquivos (Antes/Depois)

### Antes (Estado Atual)
```
app/dashboard/insumos/
├── page.tsx                              (27.6 KB — monolítico)
│   ├── Schemas Zod inline
│   ├── Estados (insumos, movimentacoes, dialogs, submitting)
│   ├── Handlers (handleSaveInsumo, handleSaveMovimentacao, etc)
│   └── UI (Cards, Table, Dialogs — tudo inline)

lib/supabase/
├── insumos.ts                            (98 linhas — funções sem auditoria completa)
│   ├── deleteInsumo()
│   ├── getMovimentacoesByInsumo()
│   ├── getTodasMovimentacoesByFazenda()
│   └── createMovimentacaoInsumo()
├── queries-audit.ts                      (padrão já existe)
└── supabase.ts                           (tipos Insumo, MovimentacaoInsumo)

lib/validations/
└── (não existe — schemas inline em page.tsx)

lib/hooks/
└── (não existe — nenhum hook customizado)

types/
└── (tipos genéricos, nada específico de insumos)
```

### Depois (Estado Alvo)
```
app/dashboard/insumos/
├── page.tsx                              ✏️ Refatorado (< 200 linhas)
│   ├── Container que orquestra componentes
│   ├── Fetch dados via hooks TanStack Query
│   └── Layout = Alertas + UltimasMovimentacoes + Tabela + Dialogs
├── actions.ts                            ✨ Novo — Server Actions
│   ├── criarInsumoAction()
│   ├── atualizarInsumoAction()
│   ├── deletarInsumoAction()
│   ├── criarSaidaAction()
│   ├── criarAjusteAction()
│   └── (Todas com validação Zod servidor)
└── components/
    ├── AlertsSection.tsx                 ✨ Novo
    ├── UltimasMovimentacoes.tsx           ✨ Novo
    │   ├── UltimasEntradas.tsx            ✨ Sub-componente
    │   └── UltimasSaidas.tsx              ✨ Sub-componente
    ├── InsumosList.tsx                    ✨ Novo (tabela com filtros/ordenação)
    ├── InsumosFilters.tsx                 ✨ Novo (categoria, tipo, local, busca)
    ├── InsumoForm.tsx                     ✨ Novo (dialog novo + editar insumo)
    ├── SaidaForm.tsx                      ✨ Novo (dialog saída com campos dinâmicos)
    └── AjusteInventario.tsx               ✨ Novo (dialog ajuste)

lib/supabase/
├── insumos.ts                            ❌ Deletar (consolidar em queries-audit.ts)
├── queries-audit.ts                      ✏️ Expandir
│   ├── q.insumos.list(filters?, pagination?)
│   ├── q.insumos.getById(id)
│   ├── q.insumos.create(data)            [já existe padrão]
│   ├── q.insumos.update(id, data)
│   ├── q.insumos.delete(id)              [soft-delete via ativo=false]
│   ├── q.insumos.listAbaixoMinimo()
│   ├── q.insumos.searchByName(term, limit)
│   ├── q.movimentacoes.list(filters?)
│   ├── q.movimentacoes.listUltimas(tipo, limit)
│   ├── q.movimentacoes.create(data)
│   ├── q.movimentacoes.createAjuste(data)
│   ├── q.categorias.list()
│   ├── q.tipos.listByCategoria(categoria_id)
│   └── q.locais.listDistinct()
└── supabase.ts                           ✏️ Expandir tipos
    ├── Insumo (adicionar campos novos)
    ├── MovimentacaoInsumo (adicionar campos novos)
    ├── CategoriaInsumo                   ✨ Novo
    ├── TipoInsumo                        ✨ Novo

lib/validations/
├── insumos.ts                            ✨ Novo
│   ├── insumoFormSchema
│   ├── saidaFormSchema
│   └── ajusteInventarioSchema

lib/hooks/
├── useInsumos.ts                         ✨ Novo
├── useMovimentacoes.ts                   ✨ Novo
└── useCategorias.ts                      ✨ Novo

types/
└── insumos.ts                            ✨ Novo (interfaces + enums)
    ├── Insumo
    ├── MovimentacaoInsumo
    ├── CategoriaInsumo
    ├── TipoInsumo
    ├── TipoSaidaEnum
    └── (enums + tipos auxiliares)

supabase/migrations/
├── 20260416_create_categorias_tipos_insumo.sql                      ✨ Novo
├── 20260416_alter_insumos_add_columns.sql                           ✨ Novo
├── 20260416_alter_movimentacoes_add_columns_sinal_despesa.sql       ✨ Novo
├── 20260416_create_trigger_cmp_e_ajuste.sql                         ✨ Novo
├── 20260416_seed_categorias_tipos_insumo.sql                        ✨ Novo
├── 20260416_alter_talhoes_silos_add_custo_producao.sql              ✨ Novo
└── 20260416_rls_policies_insumos_completo.sql                       ✨ Novo

docs/insumos/
├── PRD-insumos-v2.1.md                   (referência)
├── SPEC-insumos.md                       (este documento)
└── README-implementacao.md                ✨ Novo (guia rápido para devs)
```

---

## 4. Fase 1 — Correções Críticas + Base de Dados

**Objetivo:** Estabelecer base sólida (migração, correção de bugs, dados iniciais) antes de qualquer feature nova.

**Duração Estimada:** 3-4 dias

### 4.1 Migrations SQL (Ordem de Execução)

Cada migration é um arquivo separado no `supabase/migrations/`, em sequência. O Supabase aplica automaticamente ao fazer `git push` ou manualmente via CLI.

#### Migration 1: Criar Categorias e Tipos
**Arquivo:** `supabase/migrations/20260416_create_categorias_tipos_insumo.sql`

```sql
-- supabase/migrations/20260416_create_categorias_tipos_insumo.sql
-- Criar tabelas de categorias e tipos de insumos

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_nome_not_empty CHECK(nome != ''),
  CONSTRAINT chk_nome_length CHECK(LENGTH(nome) >= 2)
);

CREATE INDEX idx_categorias_insumo_ativo ON categorias_insumo(ativo);

-- Tabela de Tipos (Sub-categorias)
CREATE TABLE IF NOT EXISTS tipos_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias_insumo(id) ON DELETE RESTRICT,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_categoria_tipo UNIQUE(categoria_id, nome),
  CONSTRAINT chk_nome_not_empty_tipo CHECK(nome != ''),
  CONSTRAINT chk_nome_length_tipo CHECK(LENGTH(nome) >= 2)
);

CREATE INDEX idx_tipos_insumo_categoria_id ON tipos_insumo(categoria_id);
CREATE INDEX idx_tipos_insumo_ativo ON tipos_insumo(ativo);

-- RLS (será adicionado em migration separada)
ALTER TABLE categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_insumo ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE categorias_insumo IS 'Categorias de insumos agrícolas (ex: Fertilizantes, Defensivos)';
COMMENT ON TABLE tipos_insumo IS 'Sub-tipos dentro de cada categoria (ex: Nitrogenado dentro de Fertilizantes)';
```

**Como Verificar:**
```sql
SELECT * FROM categorias_insumo;
SELECT * FROM tipos_insumo;
-- Deve retornar tabelas vazias, sem erros
```

---

#### Migration 2: Adicionar Colunas em `insumos`
**Arquivo:** `supabase/migrations/20260416_alter_insumos_add_columns.sql`

```sql
-- supabase/migrations/20260416_alter_insumos_add_columns.sql
-- Expandir tabela insumos com novos campos

ALTER TABLE insumos ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias_insumo(id);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS tipo_id UUID REFERENCES tipos_insumo(id);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS custo_medio NUMERIC(12,4) DEFAULT 0;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(255);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS local_armazen VARCHAR(255);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Soft-delete (já deve existir, mas garantir)
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Auditoria (já deve existir, mas garantir)
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS atualizado_por UUID REFERENCES auth.users(id);

-- Constraints
ALTER TABLE insumos ADD CONSTRAINT chk_custo_medio_nonneg CHECK(custo_medio >= 0) NOT VALID;
ALTER TABLE insumos ADD CONSTRAINT chk_fornecedor_min CHECK(fornecedor IS NULL OR LENGTH(TRIM(fornecedor)) > 0) NOT VALID;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_insumos_categoria_id ON insumos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_insumos_tipo_id ON insumos(tipo_id);
CREATE INDEX IF NOT EXISTS idx_insumos_fazenda_ativo ON insumos(fazenda_id, ativo);
CREATE INDEX IF NOT EXISTS idx_insumos_local_armazen ON insumos(local_armazen);

COMMENT ON COLUMN insumos.categoria_id IS 'FK: Categoria do insumo (ex: Fertilizantes)';
COMMENT ON COLUMN insumos.tipo_id IS 'FK: Tipo dentro da categoria (NULL se categoria sem subtipos)';
COMMENT ON COLUMN insumos.custo_medio IS 'Custo Médio Ponderado (CMP) — recalculado em cada entrada';
COMMENT ON COLUMN insumos.fornecedor IS 'Fornecedor principal deste insumo';
COMMENT ON COLUMN insumos.local_armazen IS 'Local de armazenamento (ex: Galpão 1, Hangar A)';
```

**Como Verificar:**
```sql
\d insumos
-- Deve listar as 4 novas colunas + categoria_id, tipo_id, custo_medio, fornecedor, local_armazen, observacoes
```

---

#### Migration 3: Adicionar Colunas em `movimentacoes_insumo`
**Arquivo:** `supabase/migrations/20260416_alter_movimentacoes_add_columns_sinal_despesa.sql`

```sql
-- supabase/migrations/20260416_alter_movimentacoes_add_columns_sinal_despesa.sql
-- Expandir movimentacoes_insumo com novos campos

ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS tipo_saida VARCHAR(50);
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS destino_tipo VARCHAR(50);
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS destino_id UUID;
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'manual';
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS sinal_ajuste SMALLINT;  -- +1 ou -1 para Ajuste
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS despesa_id UUID REFERENCES financeiro(id) ON DELETE SET NULL;

-- Auditoria (já deve existir, mas garantir)
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id);

-- Constraints
ALTER TABLE movimentacoes_insumo ADD CONSTRAINT chk_tipo_saida CHECK(
  tipo_saida IS NULL OR tipo_saida IN ('USO_INTERNO', 'TRANSFERENCIA', 'VENDA', 'DEVOLUCAO', 'DESCARTE', 'TROCA')
) NOT VALID;

ALTER TABLE movimentacoes_insumo ADD CONSTRAINT chk_origem CHECK(
  origem IN ('manual', 'talhao', 'frota', 'silo', 'financeiro')
) NOT VALID;

ALTER TABLE movimentacoes_insumo ADD CONSTRAINT chk_sinal_ajuste CHECK(
  sinal_ajuste IS NULL OR sinal_ajuste IN (-1, 1)
) NOT VALID;

-- Índices
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_saida ON movimentacoes_insumo(tipo_saida);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_origem ON movimentacoes_insumo(origem);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_despesa_id ON movimentacoes_insumo(despesa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_desc ON movimentacoes_insumo(data DESC);

COMMENT ON COLUMN movimentacoes_insumo.tipo_saida IS 'Tipo de saída (NULL para Entrada/Ajuste). Ex: USO_INTERNO, VENDA, DEVOLUCAO';
COMMENT ON COLUMN movimentacoes_insumo.sinal_ajuste IS 'Sinal de ajuste: +1 (ganho) ou -1 (perda). NULL para Entrada/Saída';
COMMENT ON COLUMN movimentacoes_insumo.despesa_id IS 'FK: Despesa financeira associada (1:1). Preenchida se registrar_como_despesa=true';
COMMENT ON COLUMN movimentacoes_insumo.origem IS 'Origem da movimentação: manual, talhao, frota, silo, financeiro';
```

**Como Verificar:**
```sql
\d movimentacoes_insumo
-- Deve listar os novos campos
```

---

#### Migration 4: Criar Trigger CMP e Ajuste
**Arquivo:** `supabase/migrations/20260416_create_trigger_cmp_e_ajuste.sql`

```sql
-- supabase/migrations/20260416_create_trigger_cmp_e_ajuste.sql
-- Triggers para CMP e Ajuste de Inventário

CREATE OR REPLACE FUNCTION atualizar_custo_medio_e_estoque()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'Entrada' THEN
    -- Recalcular CMP e somar estoque
    UPDATE insumos
    SET 
      custo_medio = CASE 
        WHEN estoque_atual > 0 OR NEW.quantidade > 0 THEN
          (estoque_atual * COALESCE(custo_medio, 0) + NEW.quantidade * COALESCE(NEW.valor_unitario, 0)) /
          (estoque_atual + NEW.quantidade)
        ELSE 0
      END,
      estoque_atual = estoque_atual + NEW.quantidade,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id;
    
  ELSIF NEW.tipo = 'Saída' THEN
    -- Verificar estoque suficiente e subtrair
    UPDATE insumos
    SET 
      estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade),
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id
    AND estoque_atual >= NEW.quantidade;
    
  ELSIF NEW.tipo = 'Ajuste' THEN
    -- Aplicar ajuste com sinal
    UPDATE insumos
    SET 
      estoque_atual = GREATEST(0, estoque_atual + (NEW.quantidade * COALESCE(NEW.sinal_ajuste, 1))),
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id;
    -- CMP NÃO é alterado em ajustes
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger (ou recriar se já existe)
DROP TRIGGER IF EXISTS mov_insumo_atualizar_estoque_cmp ON movimentacoes_insumo;
CREATE TRIGGER mov_insumo_atualizar_estoque_cmp
AFTER INSERT ON movimentacoes_insumo
FOR EACH ROW EXECUTE FUNCTION atualizar_custo_medio_e_estoque();

COMMENT ON FUNCTION atualizar_custo_medio_e_estoque() IS 
  'Trigger que atualiza CMP (Entrada), estoque (Saída) e ajuste (Ajuste) automáticamente após INSERT em movimentacoes_insumo';
```

**Como Verificar:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'mov_insumo_atualizar_estoque_cmp';
-- Deve retornar 1 linha
```

---

#### Migration 5: Seed de Categorias e Tipos
**Arquivo:** `supabase/migrations/20260416_seed_categorias_tipos_insumo.sql`

```sql
-- supabase/migrations/20260416_seed_categorias_tipos_insumo.sql
-- Dados iniciais: Categorias e Tipos de Insumos

-- Limpar dados anteriores (se migration for re-executada)
DELETE FROM tipos_insumo;
DELETE FROM categorias_insumo;

-- Inserir Categorias
INSERT INTO categorias_insumo (nome, descricao) VALUES
  ('Fertilizantes/Corretivos', 'Adubos, calcário, gesso e corretivos'),
  ('Defensivos', 'Herbicidas, inseticidas, fungicidas'),
  ('Sementes', 'Sementes agrícolas'),
  ('Combustíveis', 'Diesel, gasolina, arla 32'),
  ('Nutrição Animal', 'Rações, minerais, núcleos, farelos'),
  ('Inoculantes', 'Bactérias e fungos para silos e solo'),
  ('Lonas', 'Lonas para silos'),
  ('Peças e Manutenções', 'Peças de reposição e materiais de manutenção'),
  ('Outros', 'Outros insumos não categorizados');

-- Inserir Tipos por Categoria
-- FERTILIZANTES/CORRETIVOS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Fertilizante', 'Adubos NPK, simples' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Fertilizante Foliar', 'Adubação via folha' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Calcário', 'Correção de acidez' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Gesso', 'Condicionador de solo' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Outros', 'Outros corretivos' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos';

-- DEFENSIVOS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Herbicida', 'Controle de plantas daninhas' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Inseticida', 'Controle de insetos' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Fungicida', 'Controle de doenças fúngicas' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Adjuvantes', 'Potencializadores de eficácia' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Espalhantes', 'Reduzem tensão superficial' FROM categorias_insumo WHERE nome = 'Defensivos';

-- COMBUSTÍVEIS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Diesel', 'Combustível para máquinas' FROM categorias_insumo WHERE nome = 'Combustíveis'
UNION ALL SELECT id, 'Gasolina', 'Combustível alternativo' FROM categorias_insumo WHERE nome = 'Combustíveis'
UNION ALL SELECT id, 'Arla 32', 'Aditivo para motores diesel' FROM categorias_insumo WHERE nome = 'Combustíveis';

-- NUTRIÇÃO ANIMAL
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Sal Mineral', 'Mineral essencial' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Sal Proteinado', 'Mineral + proteína' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Ração', 'Alimento balanceado' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Núcleo', 'Concentrado mineral/vitamínico' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Aditivos', 'Promotores de crescimento/saúde' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Grãos/Farelos', 'Milho, soja, sorgo' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Feno', 'Forragem seca' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Outros', 'Outros alimentos' FROM categorias_insumo WHERE nome = 'Nutrição Animal';

-- LONAS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Convencional', 'Lona padrão' FROM categorias_insumo WHERE nome = 'Lonas'
UNION ALL SELECT id, 'Barreira O2', 'Lona com barreira de oxigênio' FROM categorias_insumo WHERE nome = 'Lonas';

-- Outras categorias não têm tipos (Sementes, Inoculantes, Peças, Outros)
-- Deixar vazias propositalmente

-- Ativar RLS para novas tabelas
ALTER TABLE categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_insumo ENABLE ROW LEVEL SECURITY;

-- RLS Policies serão adicionadas em migration separada

COMMENT ON TABLE categorias_insumo IS 'Dados de seed inseridos em 2026-04-16';
```

**Como Verificar:**
```sql
SELECT COUNT(*) FROM categorias_insumo;  -- Deve retornar 9
SELECT COUNT(*) FROM tipos_insumo;       -- Deve retornar 32
```

---

#### Migration 6: Adicionar `custo_producao` em Talhões e Silos
**Arquivo:** `supabase/migrations/20260416_alter_talhoes_silos_add_custo_producao.sql`

```sql
-- supabase/migrations/20260416_alter_talhoes_silos_add_custo_producao.sql
-- Preparar integração: adicionar coluna custo_producao

ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS custo_producao NUMERIC(12,2) DEFAULT 0;
ALTER TABLE silos ADD COLUMN IF NOT EXISTS custo_producao NUMERIC(12,2) DEFAULT 0;

-- Constraints
ALTER TABLE talhoes ADD CONSTRAINT chk_custo_producao_talhoes CHECK(custo_producao >= 0) NOT VALID;
ALTER TABLE silos ADD CONSTRAINT chk_custo_producao_silos CHECK(custo_producao >= 0) NOT VALID;

COMMENT ON COLUMN talhoes.custo_producao IS 'Custo agregado de insumos + mão de obra aplicados neste talhão';
COMMENT ON COLUMN silos.custo_producao IS 'Custo agregado de insumos (inoculante, lona) usados neste silo';
```

---

#### Migration 7: RLS Policies Completo
**Arquivo:** `supabase/migrations/20260416_rls_policies_insumos_completo.sql`

```sql
-- supabase/migrations/20260416_rls_policies_insumos_completo.sql
-- RLS Policies para insumos, categorias, tipos, movimentacoes

-- CATEGORIAS (acesso global — não isolado por fazenda, admin via role)
CREATE POLICY "categorias_select_public" ON categorias_insumo
  FOR SELECT USING (TRUE);

CREATE POLICY "categorias_insert_admin" ON categorias_insumo
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "categorias_update_admin" ON categorias_insumo
  FOR UPDATE USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- TIPOS (acesso global, igual categorias)
CREATE POLICY "tipos_select_public" ON tipos_insumo
  FOR SELECT USING (TRUE);

CREATE POLICY "tipos_insert_admin" ON tipos_insumo
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "tipos_update_admin" ON tipos_insumo
  FOR UPDATE USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- INSUMOS (isolado por fazenda_id)
CREATE POLICY "insumos_select_by_fazenda" ON insumos
  FOR SELECT USING (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "insumos_insert_by_fazenda" ON insumos
  FOR INSERT WITH CHECK (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "insumos_update_by_fazenda" ON insumos
  FOR UPDATE USING (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "insumos_delete_by_fazenda" ON insumos
  FOR DELETE USING (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

-- MOVIMENTACOES (isolado via JOIN com insumos)
CREATE POLICY "movimentacoes_select_by_fazenda" ON movimentacoes_insumo
  FOR SELECT USING (
    insumo_id IN (
      SELECT id FROM insumos 
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "movimentacoes_insert_by_fazenda" ON movimentacoes_insumo
  FOR INSERT WITH CHECK (
    insumo_id IN (
      SELECT id FROM insumos 
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "movimentacoes_update_by_fazenda" ON movimentacoes_insumo
  FOR UPDATE USING (
    insumo_id IN (
      SELECT id FROM insumos 
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "movimentacoes_delete_by_fazenda" ON movimentacoes_insumo
  FOR DELETE USING (
    insumo_id IN (
      SELECT id FROM insumos 
      WHERE fazenda_id IN (
        SELECT fazenda_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "insumos_select_by_fazenda" ON insumos IS 
  'Usuário vê apenas insumos de sua fazenda (via profiles.fazenda_id)';
```

---

### 4.2 Bug #1 — Corrigir `fazenda_id` Vazio

**Arquivo:** `app/dashboard/insumos/page.tsx:144`

**Antes (ERRADO):**
```typescript
const handleSaveInsumo = async (data: InsumoFormData) => {
  setSubmitting(true);
  try {
    if (editingInsumo) {
      await q.insumos.update(editingInsumo.id, data);
      toast.success('Insumo atualizado com sucesso.');
      setEditingInsumo(null);
    } else {
      await q.insumos.create({ ...data, fazenda_id: '' });  // ❌ ERRADO: '' em vez de injetar
      toast.success('Insumo cadastrado com sucesso.');
      setIsAddInsumoOpen(false);
    }
    // ... resto do código
  }
};
```

**Depois (CORRETO):**
```typescript
const handleSaveInsumo = async (data: InsumoFormData) => {
  setSubmitting(true);
  try {
    if (editingInsumo) {
      await q.insumos.update(editingInsumo.id, data);
      toast.success('Insumo atualizado com sucesso.');
      setEditingInsumo(null);
    } else {
      // ✅ CORRETO: q.insumos.create() já injeta fazenda_id automaticamente
      // (ver queries-audit.ts: async create(payload) => getFazendaId() + insert)
      await q.insumos.create(data);
      toast.success('Insumo cadastrado com sucesso.');
      setIsAddInsumoOpen(false);
    }
    // ... resto do código
  }
};
```

**Como Testar:**
1. Abrir tela de Insumos
2. Cliquar "Novo Insumo", preencher form
3. Salvar
4. Verificar que insumo aparece na lista (não vazio em `fazenda_id`)
5. No banco: `SELECT * FROM insumos WHERE id = '<novo-id>'` → deve ter `fazenda_id` válido (UUID, não '')

---

### 4.3 Bug #2 — Deletar `lib/supabase/insumos.ts`

**Arquivo a Deletar:** `lib/supabase/insumos.ts`

**Funções a Migrar para `queries-audit.ts`:**

1. `deleteInsumo(id)` → `q.insumos.delete(id)` (soft-delete via `ativo = false`)
2. `getMovimentacoesByInsumo(insumoId)` → `q.movimentacoes.listByInsumo(insumoId)`
3. `getTodasMovimentacoesByFazenda(fazendaId)` → `q.movimentacoes.list()` (já filtra por fazenda via queries-audit)
4. `createMovimentacaoInsumo(mov)` → `q.movimentacoes.create(mov)` (com auditoria de `fazenda_id`)

**Passo a passo:**

1. **Copiar o conteúdo de `insumos.ts` para análise** (já realizado — visto na seção de Fase 2)
2. **Adicionar as funções em `queries-audit.ts`** com pattern auditado (ver Seção 5.3)
3. **Atualizar imports em `page.tsx`**:
   - Antes: `import { deleteInsumo, createMovimentacaoInsumo, getTodasMovimentacoesByFazenda } from '@/lib/supabase/insumos';`
   - Depois: `import { q } from '@/lib/supabase/queries-audit';` (já existe em page.tsx)
   - Remover referência ao arquivo antigo
4. **Deletar o arquivo:**
   ```bash
   git rm lib/supabase/insumos.ts
   ```

**Como Verificar:**
```bash
# Não deve haver mais imports de lib/supabase/insumos em nenhum lugar
grep -r "from '@/lib/supabase/insumos'" app/ lib/
# Saída: (vazio)

# Arquivo não deve existir
ls lib/supabase/insumos.ts
# Saída: "No such file or directory"
```

---

### 4.4 Critérios de Conclusão — Fase 1

- [ ] Todas as 7 migrations criadas em `supabase/migrations/` (ordem sequencial)
- [ ] Migrations aplicadas ao banco (verificar: `SELECT * FROM categorias_insumo LIMIT 1`)
- [ ] 9 categorias e 32 tipos seedados (`SELECT COUNT(*) FROM categorias_insumo`, etc.)
- [ ] Trigger CMP funcionando (inserir movimentação de entrada e verificar `custo_medio` atualizado em `insumos`)
- [ ] Bug #1 corrigido: `q.insumos.create()` sem `fazenda_id` manual
- [ ] Bug #2 concluído: `lib/supabase/insumos.ts` deletado e funções migradas
- [ ] RLS policies aplicadas e testadas (não conseguir ver dados de outra fazenda)
- [ ] Sem erros ao rodar `npm run lint`

---

## 5. Fase 2 — Backend Refatorado

**Objetivo:** Consolidar toda lógica de dados em `queries-audit.ts` com auditoria, tipos fortes em TypeScript e validações Zod.

**Duração Estimada:** 5-6 dias

**Dependência:** Fase 1 ✅ completa

### 5.1 Tipos TypeScript

**Arquivo:** `types/insumos.ts` (criar novo)

```typescript
// types/insumos.ts

/**
 * Tipos TypeScript para o módulo de Insumos.
 * Auto-gerados a partir do banco via Supabase Studio ou manualmente definidos.
 */

export interface CategoriaInsumo {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
}

export interface TipoInsumo {
  id: string;
  categoria_id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
}

export interface Insumo {
  id: string;
  fazenda_id: string;
  nome: string;
  unidade: string;
  estoque_minimo: number;
  estoque_atual: number;
  categoria_id?: string;
  tipo_id?: string;
  custo_medio: number;
  fornecedor?: string;
  local_armazen?: string;
  observacoes?: string;
  ativo: boolean;
  criado_em: string;
  criado_por?: string;
  atualizado_em: string;
  atualizado_por?: string;
  // NPK (se categoria == Fertilizantes)
  teor_n_percent?: number;
  teor_p_percent?: number;
  teor_k_percent?: number;
}

export interface MovimentacaoInsumo {
  id: string;
  insumo_id: string;
  tipo: 'Entrada' | 'Saída' | 'Ajuste';
  quantidade: number;
  valor_unitario?: number;
  data: string; // YYYY-MM-DD
  tipo_saida?: 'USO_INTERNO' | 'TRANSFERENCIA' | 'VENDA' | 'DEVOLUCAO' | 'DESCARTE' | 'TROCA';
  destino_tipo?: 'talhao' | 'maquina' | 'silo';
  destino_id?: string;
  observacoes?: string;
  origem: 'manual' | 'talhao' | 'frota' | 'silo' | 'financeiro';
  sinal_ajuste?: 1 | -1; // +1 (ganho) ou -1 (perda) para Ajuste
  despesa_id?: string;
  criado_em: string;
  criado_por?: string;
  responsavel?: string; // Nome do operador
}

export interface MovimentacaoComNome extends MovimentacaoInsumo {
  insumo_nome: string;
  insumo_unidade: string;
}

export enum TipoSaidaEnum {
  USO_INTERNO = 'USO_INTERNO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  VENDA = 'VENDA',
  DEVOLUCAO = 'DEVOLUCAO',
  DESCARTE = 'DESCARTE',
  TROCA = 'TROCA',
}

export enum OrigemMovimentacao {
  MANUAL = 'manual',
  TALHAO = 'talhao',
  FROTA = 'frota',
  SILO = 'silo',
  FINANCEIRO = 'financeiro',
}

export interface ListInsumosFilter {
  categoria_id?: string;
  tipo_id?: string;
  local_armazen?: string;
  busca?: string; // busca por nome, fornecedor, local
  apenasCriticos?: boolean; // apenas estoque_atual < estoque_minimo
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}
```

---

### 5.2 Schemas Zod

**Arquivo:** `lib/validations/insumos.ts` (criar novo)

```typescript
// lib/validations/insumos.ts

import { z } from 'zod';

// Schema para criar/editar insumo
export const insumoFormSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  categoria_id: z.string().uuid('Categoria inválida'),
  tipo_id: z.string().uuid('Tipo inválido').optional().nullable(),
  unidade: z.string().min(1, 'Unidade obrigatória').max(50),
  quantidade_entrada: z.number().positive('Deve ser > 0'),
  valor_unitario: z.number().nonnegative('Não pode ser negativo'),
  fornecedor: z.string().min(1, 'Fornecedor obrigatório').max(255),
  local_armazen: z.string().min(1, 'Local de armazenamento obrigatório').max(255),
  estoque_minimo: z.number().nonnegative('Não pode ser negativo'),
  registrar_como_despesa: z.boolean().default(true),
  observacoes: z.string().optional(),
});

export type InsumoFormData = z.infer<typeof insumoFormSchema>;

// Schema para saída de insumo
export const saidaFormSchema = z.object({
  insumo_id: z.string().uuid('Insumo inválido'),
  tipo_saida: z.enum(['USO_INTERNO', 'TRANSFERENCIA', 'VENDA', 'DEVOLUCAO', 'DESCARTE', 'TROCA']),
  quantidade: z.number().positive('Deve ser > 0'),
  valor_unitario: z.number().nonnegative('Não pode ser negativo'),
  destino_tipo: z.enum(['talhao', 'maquina', 'silo']).optional(),
  destino_id: z.string().uuid().optional(),
  destino_texto: z.string().optional(), // Para saídas que não têm destino fixo
  responsavel: z.string().min(1, 'Responsável obrigatório'),
  data: z.coerce.date(),
  observacoes: z.string().optional(),
}).refine(
  (data) => {
    // Se tipo_saida = USO_INTERNO, destino_tipo e destino_id obrigatórios
    if (data.tipo_saida === 'USO_INTERNO') {
      return data.destino_tipo && data.destino_id;
    }
    // Para outros tipos, destino_texto pode ser preenchido
    return true;
  },
  { message: 'Para Uso Interno, informe destino tipo e ID' }
);

export type SaidaFormData = z.infer<typeof saidaFormSchema>;

// Schema para ajuste de inventário
export const ajusteInventarioSchema = z.object({
  insumo_id: z.string().uuid('Insumo inválido'),
  estoque_real: z.number().nonnegative('Não pode ser negativo'),
  motivo: z.string().min(5, 'Mínimo 5 caracteres'),
}).refine(
  (data) => {
    // Validação customizada, se necessário
    return true;
  }
);

export type AjusteInventarioData = z.infer<typeof ajusteInventarioSchema>;
```

---

### 5.3 Queries Auditadas

**Arquivo:** `lib/supabase/queries-audit.ts` (expandir)

Adicionar ao objeto `q` exportado ao final do arquivo:

```typescript
// --- INSUMOS ---
const insumos = {
  async list(filters?: {
    categoria_id?: string;
    tipo_id?: string;
    local_armazen?: string;
    busca?: string;
    apenasCriticos?: boolean;
  }, pagination?: { limit: number; offset: number }): Promise<Insumo[]> {
    const fazendaId = await getFazendaId();
    let query = supabase
      .from('insumos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (filters?.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id);
    }
    if (filters?.tipo_id) {
      query = query.eq('tipo_id', filters.tipo_id);
    }
    if (filters?.local_armazen) {
      query = query.ilike('local_armazen', `%${filters.local_armazen}%`);
    }
    if (filters?.busca) {
      query = query.or(`nome.ilike.%${filters.busca}%,fornecedor.ilike.%${filters.busca}%`);
    }
    if (filters?.apenasCriticos) {
      // Complexo em Supabase, recomenda-se filtrar no TS
    }

    if (pagination) {
      query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Insumo[];
  },

  async getById(id: string): Promise<Insumo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async listAbaixoMinimo(): Promise<Insumo[]> {
    const fazendaId = await getFazendaId();
    // Supabase não suporta comparação entre 2 colunas, então fetchamos e filtramos TS
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('estoque_atual', { ascending: true });
    if (error) throw error;
    return (data as Insumo[]).filter(i => i.estoque_atual < i.estoque_minimo);
  },

  async searchByName(term: string, limit: number = 10): Promise<Insumo[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .select('id, nome, unidade, categoria_id, tipo_id, estoque_atual, estoque_minimo')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .ilike('nome', `%${term}%`)
      .limit(limit)
      .order('nome');
    if (error) throw error;
    return data as Insumo[];
  },

  async create(payload: Omit<Insumo, 'id' | 'criado_em' | 'atualizado_em' | 'fazenda_id'>): Promise<Insumo> {
    const fazendaId = await getFazendaId();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('insumos')
      .insert({
        ...payload,
        fazenda_id: fazendaId,
        criado_por: user?.id,
        atualizado_por: user?.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async update(id: string, payload: Partial<Omit<Insumo, 'id' | 'fazenda_id' | 'criado_em' | 'criado_por'>>): Promise<Insumo> {
    const fazendaId = await getFazendaId();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('insumos')
      .update({
        ...payload,
        atualizado_por: user?.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async delete(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('insumos')
      .update({ ativo: false })
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

// --- MOVIMENTAÇÕES ---
const movimentacoes = {
  async list(filters?: {
    insumo_id?: string;
    tipo?: 'Entrada' | 'Saída' | 'Ajuste';
    origem?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<MovimentacaoComNome[]> {
    const fazendaId = await getFazendaId();
    let query = supabase
      .from('movimentacoes_insumo')
      .select(`
        *,
        insumos!inner(nome, unidade, fazenda_id)
      `)
      .eq('insumos.fazenda_id', fazendaId)
      .order('data', { ascending: false });

    if (filters?.insumo_id) {
      query = query.eq('insumo_id', filters.insumo_id);
    }
    if (filters?.tipo) {
      query = query.eq('tipo', filters.tipo);
    }
    if (filters?.origem) {
      query = query.eq('origem', filters.origem);
    }
    if (filters?.dataInicio) {
      query = query.gte('data', filters.dataInicio);
    }
    if (filters?.dataFim) {
      query = query.lte('data', filters.dataFim);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      ...row,
      insumo_nome: row.insumos?.nome ?? '',
      insumo_unidade: row.insumos?.unidade ?? '',
      insumos: undefined,
    }));
  },

  async listUltimas(tipo: 'Entrada' | 'Saída', limit: number = 4): Promise<MovimentacaoComNome[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('movimentacoes_insumo')
      .select(`
        *,
        insumos!inner(nome, unidade, fazenda_id)
      `)
      .eq('insumos.fazenda_id', fazendaId)
      .eq('tipo', tipo)
      .order('data', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      ...row,
      insumo_nome: row.insumos?.nome ?? '',
      insumo_unidade: row.insumos?.unidade ?? '',
      insumos: undefined,
    }));
  },

  async create(payload: Omit<MovimentacaoInsumo, 'id' | 'criado_em' | 'criado_por'>): Promise<MovimentacaoInsumo> {
    const fazendaId = await getFazendaId();
    
    // Validar estoque para Saída
    if (payload.tipo === 'Saída') {
      const insumo = await insumos.getById(payload.insumo_id);
      if (insumo.estoque_atual < payload.quantidade) {
        throw new Error(
          `Estoque insuficiente. Disponível: ${insumo.estoque_atual} ${insumo.unidade}, Solicitado: ${payload.quantidade}`
        );
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('movimentacoes_insumo')
      .insert({
        ...payload,
        criado_por: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MovimentacaoInsumo;
  },

  async createAjuste(insumo_id: string, estoque_real: number, motivo: string): Promise<MovimentacaoInsumo> {
    const insumo = await insumos.getById(insumo_id);
    const diferenca = estoque_real - insumo.estoque_atual;

    if (diferenca === 0) {
      throw new Error('Nenhuma divergência de inventário');
    }

    return this.create({
      insumo_id,
      tipo: 'Ajuste',
      quantidade: Math.abs(diferenca),
      sinal_ajuste: diferenca > 0 ? 1 : -1,
      observacoes: motivo,
      origem: 'manual',
      data: new Date().toISOString().split('T')[0],
    } as Omit<MovimentacaoInsumo, 'id' | 'criado_em' | 'criado_por'>);
  },
};

// --- CATEGORIAS ---
const categorias = {
  async list(): Promise<CategoriaInsumo[]> {
    const { data, error } = await supabase
      .from('categorias_insumo')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data as CategoriaInsumo[];
  },
};

// --- TIPOS ---
const tipos = {
  async listByCategoria(categoria_id: string): Promise<TipoInsumo[]> {
    const { data, error } = await supabase
      .from('tipos_insumo')
      .select('*')
      .eq('categoria_id', categoria_id)
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data as TipoInsumo[];
  },
};

// --- LOCAIS DE ARMAZENAMENTO ---
const locais = {
  async listDistinct(): Promise<string[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .select('local_armazen')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .neq('local_armazen', null);
    if (error) throw error;
    
    const locais = new Set(data?.map(d => d.local_armazen).filter(Boolean));
    return Array.from(locais).sort();
  },
};

// Exportar no objeto q
export const q = {
  // ... (outros já existentes: silos, talhoes, etc.)
  insumos,
  movimentacoes,
  categorias,
  tipos,
  locais,
};
```

---

### 5.4 Server Actions

**Arquivo:** `app/dashboard/insumos/actions.ts` (criar novo)

```typescript
// app/dashboard/insumos/actions.ts
'use server';

import { q } from '@/lib/supabase/queries-audit';
import { insumoFormSchema, saidaFormSchema, ajusteInventarioSchema } from '@/lib/validations/insumos';
import { revalidatePath } from 'next/cache';

export async function criarInsumoAction(formData: unknown) {
  const parsed = insumoFormSchema.parse(formData);
  
  try {
    // Criar insumo
    const insumo = await q.insumos.create({
      nome: parsed.nome,
      categoria_id: parsed.categoria_id,
      tipo_id: parsed.tipo_id,
      unidade: parsed.unidade,
      fornecedor: parsed.fornecedor,
      local_armazen: parsed.local_armazen,
      estoque_minimo: parsed.estoque_minimo,
      estoque_atual: 0,
      custo_medio: 0,
      observacoes: parsed.observacoes,
      ativo: true,
    });

    // Criar movimentação de entrada
    await q.movimentacoes.create({
      insumo_id: insumo.id,
      tipo: 'Entrada',
      quantidade: parsed.quantidade_entrada,
      valor_unitario: parsed.valor_unitario,
      data: new Date().toISOString().split('T')[0],
      origem: 'manual',
    } as any);

    // TODO: Se parsed.registrar_como_despesa, criar despesa em financeiro
    // await q.financeiro.create({ ... })

    revalidatePath('/dashboard/insumos');
    return { success: true, insumo };
  } catch (error) {
    console.error('Erro ao criar insumo:', error);
    throw error;
  }
}

export async function atualizarInsumoAction(id: string, formData: unknown) {
  const parsed = insumoFormSchema.parse(formData);

  try {
    const insumo = await q.insumos.update(id, {
      nome: parsed.nome,
      categoria_id: parsed.categoria_id,
      tipo_id: parsed.tipo_id,
      unidade: parsed.unidade,
      fornecedor: parsed.fornecedor,
      local_armazen: parsed.local_armazen,
      estoque_minimo: parsed.estoque_minimo,
      observacoes: parsed.observacoes,
    });

    revalidatePath('/dashboard/insumos');
    return { success: true, insumo };
  } catch (error) {
    console.error('Erro ao atualizar insumo:', error);
    throw error;
  }
}

export async function deletarInsumoAction(id: string) {
  try {
    await q.insumos.delete(id);
    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar insumo:', error);
    throw error;
  }
}

export async function criarSaidaAction(formData: unknown) {
  const parsed = saidaFormSchema.parse(formData);

  try {
    // Buscar CMP atual do insumo
    const insumo = await q.insumos.getById(parsed.insumo_id);

    await q.movimentacoes.create({
      insumo_id: parsed.insumo_id,
      tipo: 'Saída',
      quantidade: parsed.quantidade,
      valor_unitario: parsed.valor_unitario || insumo.custo_medio,
      tipo_saida: parsed.tipo_saida,
      destino_tipo: parsed.destino_tipo,
      destino_id: parsed.destino_id,
      responsavel: parsed.responsavel,
      data: parsed.data.toISOString().split('T')[0],
      observacoes: parsed.observacoes,
      origem: 'manual',
    } as any);

    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar saída:', error);
    throw error;
  }
}

export async function criarAjusteAction(formData: unknown) {
  const parsed = ajusteInventarioSchema.parse(formData);

  try {
    await q.movimentacoes.createAjuste(
      parsed.insumo_id,
      parsed.estoque_real,
      parsed.motivo
    );

    revalidatePath('/dashboard/insumos');
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar ajuste:', error);
    throw error;
  }
}
```

---

### 5.5 Hooks Customizados

**Arquivo:** `lib/hooks/useInsumos.ts` (criar novo)

```typescript
// lib/hooks/useInsumos.ts
'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';

export function useInsumos(filters?: any) {
  return useQuery({
    queryKey: ['insumos', filters],
    queryFn: () => q.insumos.list(filters),
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useInsumoById(id: string) {
  return useQuery({
    queryKey: ['insumo', id],
    queryFn: () => q.insumos.getById(id),
  });
}

export function useInsumosAbaixoMinimo() {
  return useQuery({
    queryKey: ['insumos-criticos'],
    queryFn: () => q.insumos.listAbaixoMinimo(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useInsumosSearch(term: string) {
  return useQuery({
    queryKey: ['insumos-search', term],
    queryFn: () => q.insumos.searchByName(term),
    enabled: term.length > 1,
  });
}

export function useInsumosMutation() {
  const queryClient = useQueryClient();

  return {
    create: useMutation({
      mutationFn: (data: any) => q.insumos.create(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
    update: useMutation({
      mutationFn: ({ id, data }: any) => q.insumos.update(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
    delete: useMutation({
      mutationFn: (id: string) => q.insumos.delete(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
  };
}
```

**Arquivo:** `lib/hooks/useMovimentacoes.ts` (criar novo)

```typescript
// lib/hooks/useMovimentacoes.ts
'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';

export function useMovimentacoes(filters?: any) {
  return useQuery({
    queryKey: ['movimentacoes', filters],
    queryFn: () => q.movimentacoes.list(filters),
    staleTime: 1000 * 30, // 30 segundos
  });
}

export function useUltimasEntradas() {
  return useQuery({
    queryKey: ['ultimas-entradas'],
    queryFn: () => q.movimentacoes.listUltimas('Entrada', 4),
    staleTime: 1000 * 60,
  });
}

export function useUltimasSaidas() {
  return useQuery({
    queryKey: ['ultimas-saidas'],
    queryFn: () => q.movimentacoes.listUltimas('Saída', 4),
    staleTime: 1000 * 60,
  });
}

export function useMovimentacoesMutation() {
  const queryClient = useQueryClient();

  return {
    create: useMutation({
      mutationFn: (data: any) => q.movimentacoes.create(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
    createAjuste: useMutation({
      mutationFn: ({ insumo_id, estoque_real, motivo }: any) =>
        q.movimentacoes.createAjuste(insumo_id, estoque_real, motivo),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
        queryClient.invalidateQueries({ queryKey: ['insumos'] });
      },
    }),
  };
}
```

**Arquivo:** `lib/hooks/useCategorias.ts` (criar novo)

```typescript
// lib/hooks/useCategorias.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { q } from '@/lib/supabase/queries-audit';

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => q.categorias.list(),
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useTiposByCategoria(categoria_id: string) {
  return useQuery({
    queryKey: ['tipos', categoria_id],
    queryFn: () => q.tipos.listByCategoria(categoria_id),
    enabled: !!categoria_id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useLocais() {
  return useQuery({
    queryKey: ['locais'],
    queryFn: () => q.locais.listDistinct(),
    staleTime: 1000 * 60 * 10,
  });
}
```

---

### 5.6 Instalar TanStack Query

```bash
npm install @tanstack/react-query
```

Adicionar `QueryClientProvider` em `app/layout.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

---

### 5.7 Critérios de Conclusão — Fase 2

- [ ] Arquivo `types/insumos.ts` criado com 8+ interfaces/enums
- [ ] Arquivo `lib/validations/insumos.ts` criado com 3 schemas Zod válidos
- [ ] `lib/supabase/queries-audit.ts` expandido com 16+ funções (insumos, movimentacoes, categorias, tipos, locais)
- [ ] Arquivo `app/dashboard/insumos/actions.ts` criado com 5 Server Actions
- [ ] 3 hooks customizados criados em `lib/hooks/` (useInsumos, useMovimentacoes, useCategorias)
- [ ] TanStack Query v5 instalado via `npm install @tanstack/react-query`
- [ ] `QueryClientProvider` configurado em `app/layout.tsx`
- [ ] Sem erros de TypeScript: `npm run build`
- [ ] Hooks usam TanStack Query corretamente (useQuery, useMutation)

---

## 6. Fase 3 — Frontend (Layout + Componentes)

**Objetivo:** Refatorar UI monolítica em componentes reutilizáveis com layout PRD v2.1.

**Duração Estimada:** 3-4 dias

**Dependência:** Fase 2 ✅ completa

### 6.1 Refatoração da `page.tsx`

**Arquivo:** `app/dashboard/insumos/page.tsx` (refatorar completamente)

Nova estrutura (< 200 linhas):

```typescript
'use client';

import { useInsumos, useInsumosAbaixoMinimo } from '@/lib/hooks/useInsumos';
import { useUltimasEntradas, useUltimasSaidas } from '@/lib/hooks/useMovimentacoes';
import { useCategorias, useLocais } from '@/lib/hooks/useCategorias';

import AlertsSection from './components/AlertsSection';
import UltimasMovimentacoes from './components/UltimasMovimentacoes';
import InsumosList from './components/InsumosList';
import InsumoForm from './components/InsumoForm';
import SaidaForm from './components/SaidaForm';
import AjusteInventario from './components/AjusteInventario';

import { AlertTriangle, Plus, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function InsumosPage() {
  const [showNovoInsumo, setShowNovoInsumo] = useState(false);
  const [showSaida, setShowSaida] = useState(false);
  const [showAjuste, setShowAjuste] = useState(false);
  const [selectedInsumoPara, setSelectedInsumoPara] = useState<{ tipo: 'saida' | 'ajuste'; id?: string }>({ tipo: 'saida' });

  const { data: insumos, isLoading: loadingInsumos } = useInsumos();
  const { data: criticos } = useInsumosAbaixoMinimo();
  const { data: entradas } = useUltimasEntradas();
  const { data: saidas } = useUltimasSaidas();
  const { data: categorias } = useCategorias();
  const { data: locais } = useLocais();

  const totalCriticos = criticos?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estoque de Insumos</h2>
          {totalCriticos > 0 && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              {totalCriticos} insumo{totalCriticos > 1 ? 's' : ''} abaixo do estoque mínimo
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSaida(true)}>
            <ArrowDownRight className="mr-2 h-4 w-4" />
            Saídas
          </Button>
          <Button onClick={() => setShowNovoInsumo(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Insumo
          </Button>
        </div>
      </div>

      {/* Seções */}
      <AlertsSection criticos={criticos} />
      <UltimasMovimentacoes entradas={entradas} saidas={saidas} />
      <InsumosList
        insumos={insumos || []}
        loading={loadingInsumos}
        onSaidaClick={(insumo) => {
          setSelectedInsumoPara({ tipo: 'saida', id: insumo.id });
          setShowSaida(true);
        }}
        onAjusteClick={(insumo) => {
          setSelectedInsumoPara({ tipo: 'ajuste', id: insumo.id });
          setShowAjuste(true);
        }}
      />

      {/* Dialogs */}
      <InsumoForm open={showNovoInsumo} onOpenChange={setShowNovoInsumo} categorias={categorias || []} />
      <SaidaForm
        open={showSaida}
        onOpenChange={setShowSaida}
        insumos={insumos || []}
        insumoPredefined={selectedInsumoPara.id}
      />
      <AjusteInventario
        open={showAjuste}
        onOpenChange={setShowAjuste}
        insumos={insumos || []}
        insumoPredefined={selectedInsumoPara.id}
      />
    </div>
  );
}
```

---

### 6.2 Componentes a Criar

Estrutura de componentes em `app/dashboard/insumos/components/`:

#### **AlertsSection.tsx**
```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Insumo } from '@/types/insumos';

interface AlertsSectionProps {
  criticos?: Insumo[];
}

export default function AlertsSection({ criticos = [] }: AlertsSectionProps) {
  if (!criticos.length) {
    return null;
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Alertas de Estoque Crítico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {criticos.slice(0, 5).map((insumo) => (
            <div key={insumo.id} className="flex justify-between items-center p-2 rounded bg-background text-sm">
              <div>
                <div className="font-medium">{insumo.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {insumo.estoque_atual} {insumo.unidade} (mín: {insumo.estoque_minimo})
                </div>
              </div>
              <Badge variant="destructive">Crítico</Badge>
            </div>
          ))}
          {criticos.length > 5 && (
            <p className="text-xs text-muted-foreground">+{criticos.length - 5} outros...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **InsumosList.tsx**
```typescript
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, MoreVertical, ArrowUpRight } from 'lucide-react';
import type { Insumo } from '@/types/insumos';

interface InsumosListProps {
  insumos: Insumo[];
  loading: boolean;
  onSaidaClick: (insumo: Insumo) => void;
  onAjusteClick: (insumo: Insumo) => void;
}

export default function InsumosList({ insumos, loading, onSaidaClick, onAjusteClick }: InsumosListProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Qtde</TableHead>
            <TableHead>Mín</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {insumos.map((insumo) => {
            const critico = insumo.estoque_atual < insumo.estoque_minimo;
            return (
              <TableRow key={insumo.id}>
                <TableCell className="font-medium">{insumo.nome}</TableCell>
                <TableCell>{insumo.categoria_id ? 'Categoria' : '—'}</TableCell>
                <TableCell>{insumo.estoque_atual} {insumo.unidade}</TableCell>
                <TableCell>{insumo.estoque_minimo} {insumo.unidade}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{insumo.local_armazen || '—'}</TableCell>
                <TableCell>
                  {critico ? (
                    <Badge variant="destructive">Crítico</Badge>
                  ) : (
                    <Badge variant="outline">OK</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onSaidaClick(insumo)}>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onAjusteClick(insumo)}>
                      Ajuste
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### **InsumoForm.tsx** (Novo Insumo)
```typescript
'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insumoFormSchema } from '@/lib/validations/insumos';
import { criarInsumoAction } from '../actions';
import { useCategorias, useTiposByCategoria } from '@/lib/hooks/useCategorias';
import { toast } from 'sonner';
import type { CategoriaInsumo, TipoInsumo } from '@/types/insumos';

interface InsumoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: CategoriaInsumo[];
}

export default function InsumoForm({ open, onOpenChange, categorias }: InsumoFormProps) {
  const form = useForm({
    resolver: zodResolver(insumoFormSchema),
    defaultValues: {
      nome: '',
      categoria_id: '',
      tipo_id: '',
      unidade: 'kg',
      quantidade_entrada: 0,
      valor_unitario: 0,
      fornecedor: '',
      local_armazen: '',
      estoque_minimo: 0,
      registrar_como_despesa: true,
    },
  });

  const selectedCategoriaId = form.watch('categoria_id');
  const { data: tipos } = useTiposByCategoria(selectedCategoriaId);

  async function onSubmit(data: any) {
    try {
      await criarInsumoAction(data);
      toast.success('Insumo criado com sucesso');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar insumo');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Insumo</DialogTitle>
          <DialogDescription>Adicione um insumo ao estoque e registre a primeira entrada.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome com autocomplete seria aqui, por simplicidade usando input */}
          <div>
            <Label htmlFor="nome">Nome do Insumo</Label>
            <Input id="nome" placeholder="Ex: Adubo NPK" {...form.register('nome')} />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Controller
                name="categoria_id"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {tipos && tipos.length > 0 && (
              <div>
                <Label>Tipo</Label>
                <Controller
                  name="tipo_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unidade">Unidade</Label>
              <Input id="unidade" placeholder="kg, L, Saco..." {...form.register('unidade')} />
            </div>
            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input id="fornecedor" {...form.register('fornecedor')} />
            </div>
          </div>

          <div>
            <Label htmlFor="local_armazen">Local de Armazenamento</Label>
            <Input id="local_armazen" placeholder="Ex: Galpão 1" {...form.register('local_armazen')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantidade_entrada">Qtde Entrada</Label>
              <Input id="quantidade_entrada" type="number" step="0.01" {...form.register('quantidade_entrada', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="valor_unitario">Valor Unit. (R$)</Label>
              <Input id="valor_unitario" type="number" step="0.01" {...form.register('valor_unitario', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input id="estoque_minimo" type="number" {...form.register('estoque_minimo', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="registrar_como_despesa" className="flex items-center gap-2">
                <Controller
                  name="registrar_como_despesa"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                Registrar como Despesa
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" {...form.register('observacoes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Cadastrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

#### **SaidaForm.tsx**, **AjusteInventario.tsx**, **UltimasMovimentacoes.tsx**

Estrutura similar ao `InsumoForm.tsx`, usando hooks, validações Zod e Server Actions.

---

### 6.3 Componentes shadcn/ui Necessários

Instalar (se não existem):

```bash
npx shadcn@latest add command
npx shadcn@latest add checkbox
npx shadcn@latest add textarea
npx shadcn@latest add dropdown-menu
npx shadcn@latest add pagination
```

---

### 6.4 Critérios de Conclusão — Fase 3

- [ ] `app/dashboard/insumos/page.tsx` refatorado (< 250 linhas)
- [ ] 5+ componentes criados em `components/` (AlertsSection, InsumosList, InsumoForm, SaidaForm, AjusteInventario)
- [ ] Todos componentes usam hooks TanStack Query e validações Zod
- [ ] Autocomplete de insumo implementado (debounce 300ms)
- [ ] Campos dinâmicos funcionam (tipo_saida muda destino)
- [ ] Forms validam em tempo real
- [ ] Responsive em mobile (< 768px)
- [ ] Sem erros de console ao navegar
- [ ] Performance: tela carrega < 2s (com 50+ insumos)

---

## 7. Fase 4 — Integrações com Outros Módulos

**Objetivo:** Conectar saídas automáticas de Insumos com Talhões, Frota, Silos e Financeiro.

**Duração Estimada:** 4-5 dias

**Dependência:** Fase 3 ✅ completa

### 7.1 Integração Talhões → Insumos

**Fluxo:** Ao aplicar insumo em talhão → cria saída automática e registra custo.

**Arquivo a Modificar:** `app/dashboard/talhoes/[id]/aplicar-insumo.tsx` (ou similar)

```typescript
// Pseudo-código: quando usuário clica "Aplicar Insumo" em talhão
async function aplicarInsumo(talhao_id, insumo_id, quantidade) {
  // 1. Validar estoque
  const insumo = await q.insumos.getById(insumo_id);
  if (insumo.estoque_atual < quantidade) {
    throw new Error('Estoque insuficiente');
  }

  // 2. Criar saída automática
  await q.movimentacoes.create({
    insumo_id,
    tipo: 'Saída',
    quantidade,
    valor_unitario: insumo.custo_medio,
    tipo_saida: 'USO_INTERNO',
    destino_tipo: 'talhao',
    destino_id: talhao_id,
    origem: 'talhao',
    data: new Date().toISOString().split('T')[0],
  });

  // 3. Atualizar custo_producao do talhão
  const custo = quantidade * insumo.custo_medio;
  await q.talhoes.update(talhao_id, {
    custo_producao: (existente_custo || 0) + custo,
  });
}
```

---

### 7.2 Integração Frota → Insumos

**Fluxo:** Abastecimento de máquina → saída automática de combustível/óleo.

Similar a 7.1, com `destino_tipo: 'maquina'`.

---

### 7.3 Integração Silos → Insumos

**Fluxo:** Criação de silo com inoculante/lona → saídas automáticas.

Similar, com `destino_tipo: 'silo'`.

---

### 7.4 Integração Financeiro (Despesa Automática)

**Fluxo:** Entrada de insumo com checkbox marcado → criar despesa automática.

**Modificar:** `app/dashboard/insumos/actions.ts` na função `criarInsumoAction`:

```typescript
// Já inserida na Fase 5.4, aqui está completa:
if (parsed.registrar_como_despesa) {
  const despesa = await q.financeiro.create({
    fazenda_id: getFazendaId(),
    categoria: 'Insumos',
    descricao: `Entrada de ${insumo.nome}: ${parsed.quantidade_entrada} ${parsed.unidade}`,
    valor: parsed.quantidade_entrada * parsed.valor_unitario,
    data: new Date().toISOString().split('T')[0],
    tipo: 'Despesa',
    referencia: movimentacao.id,
  });

  // Linkar despesa à movimentação
  await supabase
    .from('movimentacoes_insumo')
    .update({ despesa_id: despesa.id })
    .eq('id', movimentacao.id);
}
```

---

### 7.5 Tratamento de Estoque Insuficiente

**Regra:** Se integração tenta saída > estoque, bloquear com erro descritivo.

Implementado em `q.movimentacoes.create()` (Fase 5.3):

```typescript
if (payload.tipo === 'Saída') {
  const insumo = await insumos.getById(payload.insumo_id);
  if (insumo.estoque_atual < payload.quantidade) {
    throw new Error(`Estoque insuficiente. Disponível: ${insumo.estoque_atual}...`);
  }
}
```

---

### 7.6 Critérios de Conclusão — Fase 4

- [ ] Integração Talhões implementada e testada (saída automática criada)
- [ ] Integração Frota implementada e testada
- [ ] Integração Silos implementada e testada
- [ ] Integração Financeiro implementada (despesa automática)
- [ ] Validação de estoque bloqueia saídas insuficientes
- [ ] `custo_producao` atualizado em talhões/silos
- [ ] Sem erros ao usar integrações
- [ ] Auditoria completa registrada (`origem`, `criado_por`, `criado_em`)

---

## 8. Fase 5 — Testes

**Objetivo:** Cobertura mínima de 80% + testes de integração.

**Duração Estimada:** 3-4 dias

**Dependência:** Fase 4 ✅ completa

### 8.1 Setup de Testes

**Framework:** Vitest (já instalado via `package.json`)

**Estrutura:** `__tests__/insumos/`

```bash
mkdir -p __tests__/insumos
touch __tests__/insumos/queries.test.ts
touch __tests__/insumos/validations.test.ts
touch __tests__/insumos/cmp.test.ts
```

**Configurar vitest em `vitest.config.ts`** (se não existir):

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

---

### 8.2 Testes Unitários

**Arquivo:** `__tests__/insumos/queries.test.ts`

```typescript
// __tests__/insumos/queries.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { q } from '@/lib/supabase/queries-audit';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: '1', nome: 'Ureia' }, error: null }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  },
}));

describe('Insumos Queries', () => {
  it('should create insumo with fazenda_id injected', async () => {
    // Test would verify fazenda_id is auto-injected
    // Expect no empty fazenda_id
  });

  it('should list only insumos from user fazenda', async () => {
    // Test would verify RLS/auditoria
  });

  it('should reject saída if estoque insufficient', async () => {
    // Test error thrown
  });
});

describe('CMP Calculation', () => {
  it('should recalculate CMP on entrada', () => {
    const estoque_atual = 100;
    const custo_medio = 10;
    const quantidade_entrada = 50;
    const valor_unitario = 12;

    const novo_cmp = (estoque_atual * custo_medio + quantidade_entrada * valor_unitario) /
                     (estoque_atual + quantidade_entrada);

    expect(novo_cmp).toBeCloseTo(10.67, 2);
  });

  it('should not change CMP on ajuste', () => {
    // CMP should remain unchanged
  });
});
```

---

### 8.3 Testes de Integração

**Arquivo:** `__tests__/insumos/integration.test.ts`

```typescript
// __tests__/insumos/integration.test.ts
import { describe, it, expect } from 'vitest';

describe('Insumos E2E Flow', () => {
  it('should create insumo -> register entrada -> verify estoque updated', async () => {
    // 1. Create insumo
    // 2. Create entrada movimentacao
    // 3. Assert estoque_atual increased
    // 4. Assert custo_medio calculated
  });

  it('should prevent saída if estoque insufficient', async () => {
    // 1. Create insumo with qty=10
    // 2. Try saída with qty=20
    // 3. Assert error thrown
  });

  it('should create ajuste and recalculate estoque', async () => {
    // 1. Create insumo estoque_atual=100
    // 2. Create ajuste estoque_real=90
    // 3. Assert estoque_atual=90, CMP unchanged
  });
});
```

---

### 8.4 Critérios de Conclusão — Fase 5

- [ ] Testes unitários escritos para queries (CRUD)
- [ ] Testes unitários para CMP (100% cobertura)
- [ ] Testes unitários para validações Zod
- [ ] Testes de integração para fluxo completo
- [ ] Mocks de Supabase configurados
- [ ] Todos testes passam: `npm run test`
- [ ] Cobertura mínima 80%: `npm run test -- --coverage`

---

## 9. Checklist Final de Aceite

### Aceite Funcional — Frontend

- [ ] Tela principal carrega sem erros
- [ ] Seção Alertas Críticos exibida (se houver insumos críticos)
- [ ] Últimas Entradas/Saídas mostram 4 itens máx
- [ ] Tabela de produtos com paginação funciona
- [ ] Filtros (categoria, tipo, local, busca) funcionam
- [ ] Ordenação funciona em todas colunas
- [ ] Dialog "Novo Insumo" abre/fecha
- [ ] Form valida em tempo real (campos obrigatórios, tipos)
- [ ] Salvar novo insumo cria entrada movimentação
- [ ] Checkbox "Registrar como Despesa" cria despesa (ou não)
- [ ] Dialog "Saídas" abre/fecha
- [ ] Saída valida estoque < disponível (erro)
- [ ] Salvar saída reduz estoque visualmente
- [ ] Dialog "Ajuste Inventário" abre/fecha
- [ ] Ajuste valida motivo (5+ chars)
- [ ] Salvar ajuste atualiza estoque
- [ ] Responsive em mobile (viewport < 768px)
- [ ] Sem erros de console
- [ ] Performance: carregamento < 2s

### Aceite Técnico — Backend

- [ ] 7 migrations aplicadas com sucesso
- [ ] 9 categorias, 32 tipos seedados
- [ ] Tabelas `categorias_insumo`, `tipos_insumo`, novas colunas existem
- [ ] Trigger CMP funciona (inserir entrada, verificar `custo_medio` atualizado)
- [ ] RLS policies bloqueiam acesso cross-fazenda
- [ ] `q.insumos.list()` retorna apenas insumos da fazenda
- [ ] `q.insumos.create()` injeta `fazenda_id` automaticamente
- [ ] `q.movimentacoes.create()` valida estoque
- [ ] `q.insumos.listAbaixoMinimo()` retorna apenas críticos
- [ ] `q.categorias.list()` retorna 9 itens
- [ ] `q.tipos.listByCategoria()` retorna tipos corretos
- [ ] Todas queries usam `.select()` específico (não `*`)

### Aceite de Integração

- [ ] Integração Talhões: saída automática criada ao aplicar insumo
- [ ] Integração Frota: abastecimento cria saída combustível
- [ ] Integração Silos: inoculante/lona gera saída automática
- [ ] Integração Financeiro: despesa criada (checkbox marcado)
- [ ] Auditoria completa: `criado_por`, `criado_em`, `origem` registrados
- [ ] Estoque nunca negativo (validação 3 camadas)

### Aceite de Qualidade

- [ ] Sem erros: `npm run lint`
- [ ] TypeScript compila: `npm run build`
- [ ] Testes passam: `npm run test` (cobertura 80%+)
- [ ] Sem warnings de performance
- [ ] Sem SQL injections possível (Supabase + Zod)

### Aceite de Documentação

- [ ] `types/insumos.ts` bem tipado
- [ ] `lib/validations/insumos.ts` schemas documentados
- [ ] `queries-audit.ts` comentários em funções críticas
- [ ] Componentes têm comments explicativos
- [ ] README criado em `docs/insumos/` se necessário

---

## 10. Comandos Úteis

### Desenvolvimento

```bash
# Iniciar dev server
npm run dev

# Lint código
npm run lint

# Build produção
npm run build
```

### Migrations

```bash
# Aplicar migrations pendentes
npx supabase migration up

# Reset banco (dev only!)
npx supabase db reset

# Ver histórico
npx supabase migration list
```

### TanStack Query / shadcn/ui

```bash
# Instalar novo componente shadcn
npx shadcn@latest add <component>

# Ex:
npx shadcn@latest add command

# Ver componentes instalados
ls components/ui
```

### Testes

```bash
# Rodar testes uma vez
npm run test

# Modo watch
npm run test:watch

# Com coverage
npm run test -- --coverage
```

### Git Workflow Sugerido

```bash
# Por fase, criar branch
git checkout -b feat/insumos-fase-1-db

# Commits frequentes
git add lib/supabase/queries-audit.ts
git commit -m "refactor(insumos): expandir queries-audit com funções auditadas"

# Ao final da fase, PR para main
# (Rebase + squash conforme necessário)
git rebase main
git push origin feat/insumos-fase-1-db
# Abrir PR no GitHub
```

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| **Migration falha em produção (RLS ativo)** | Média | Alto | Testar migrations em `supabase db push` local. Validar RLS policies sintaxe antes. Backup de dados antes de aplicar. |
| **Trigger CMP com bug afeta estoque histórico** | Baixa | Alto | Testes 100% cobertura CMP. Validar cálculo em 5+ cenários. Trigger idempotente. |
| **TanStack Query não instalado** | Baixa | Médio | `npm install @tanstack/react-query` na Fase 2. Verificar `package-lock.json`. |
| **Componentes monolíticos não refatoram bem** | Baixa | Médio | Começar Fase 3 com 1 componente pequeno (AlertsSection). Testar importações frequentemente. |
| **Performance degrada com 1000+ insumos** | Média | Médio | Implementar paginação (20/página). Índices em DB. Lazy-load histórico. Monitorar queries via DevTools Supabase. |
| **Estoque fica negativo em integração** | Baixa | Alto | Validação 3 camadas (TS, CHECK, RLS). Teste estresse. Transações atômicas. |
| **Despesa não linkada a movimentação** | Baixa | Baixo | Adicionar despesa_id em UPDATE pós-INSERT. Teste integração. |

---

## 12. Referências

### Documentação Oficial
- **Next.js 15 App Router:** https://nextjs.org/docs/app
- **Next.js Server Actions:** https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- **React 19:** https://react.dev
- **Supabase Docs:** https://supabase.com/docs
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **TanStack Query v5:** https://tanstack.com/query/latest
- **shadcn/ui:** https://ui.shadcn.com
- **React Hook Form:** https://react-hook-form.com
- **Zod:** https://zod.dev
- **TypeScript 5.9:** https://www.typescriptlang.org/docs

### Documentação Interna
- **PRD v2.1:** `docs/insumos/PRD-insumos-v2.1.md`
- **Padrões Projeto:** `CLAUDE.md` (raiz)
- **Queries Audit Pattern:** `lib/supabase/queries-audit.ts` (linhas 39-70)

### Referências de Código
- **Pattern Auditoria:** `lib/supabase/queries-audit.ts` (getFazendaId, silos.create)
- **Hook TanStack Query:** `lib/hooks/` (procurar useQuery/useMutation)
- **Server Actions:** `app/dashboard/planejamento-silagem/actions.ts` (padrão existente)
- **Validações Zod:** `lib/validations/planejamento-silagem.ts` (padrão existente)

---

## Apêndice: Decisões de Design Que Poderiam Mudar

### A1. CMP vs FIFO
**Decidido:** CMP

Se no futuro houver requisito de FIFO (primeiro a entrar, primeiro a sair), converter seria:
- Adicionar `data_entrada` a cada "lote" de estoque
- Implementar queue FIFO ao sair
- Mais complexo, menos comum em agrícola

### A2. Soft-delete vs Hard-delete
**Decidido:** Soft-delete via `ativo=false`

Hard-delete seria mais simples inicialmente, mas auditoria sofreria. Manter soft-delete.

### A3. Tabelas Separadas vs JSON Enum
**Decidido:** Tabelas separadas

Mais flexível. Se escala muito, considerar desnormalização com JSONB cache.

---

**Documento Finalizado — Pronto para Implementação**

Data de Conclusão: 2026-04-16  
Próximo Passo: Iniciar Fase 1 (Migrations + Bug Fixes)  
Responsável: Desenvolvedor (via este documento)
