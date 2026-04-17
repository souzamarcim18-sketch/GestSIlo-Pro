# PRD — Módulo de Estoque de Insumos (GestSilo Pro)

**Documento de Pesquisa e Diagnóstico**  
Data: 2026-04-16  
Autor: Claude Code

---

## 1. ESTRUTURA DE ARQUIVOS

### Arquivos Principais do Módulo
```
app/dashboard/insumos/
├── page.tsx                              (27.6 KB) — Página principal com formulários e tabelas
    ├─ Schemas Zod: insumoSchema, movimentacaoSchema
    ├─ Estados: insumos, movimentacoes, dialogs, forms
    ├─ Handlers: handleSaveInsumo, handleSaveMovimentacao, handleConfirmDelete
    ├─ UI: Cards de estoque, Tabela de movimentações, Dialogs de CRUD

lib/supabase/
├── insumos.ts                            (98 linhas) — Queries diretas (não auditadas)
│   ├─ deleteInsumo(id)
│   ├─ getMovimentacoesByInsumo(insumoId)
│   ├─ getTodasMovimentacoesByFazenda(fazendaId)
│   └─ createMovimentacaoInsumo(mov)
│
├── queries-audit.ts                      (1200+ linhas) — Queries com auditoria de fazenda_id
│   ├─ insumos.list()                    — Lista todos insumos da fazenda
│   ├─ insumos.listAbaixoMinimo()        — RPC: insumos com estoque crítico
│   ├─ insumos.create(payload)
│   ├─ insumos.update(id, payload)
│   ├─ insumos.remove(id)
│   ├─ movimentacoesInsumo.listByInsumo(insumoId)
│   ├─ movimentacoesInsumo.create(payload)
│   └─ movimentacoesInsumo.remove(id)
│
├── supabase.ts                           (200+ linhas) — Client e tipos TypeScript
│   ├─ type Insumo = {...}               — 9 propriedades (id, nome, tipo, unidade, estoque_*, teor_NPK)
│   └─ type MovimentacaoInsumo = {...}   — 8 propriedades (id, insumo_id, tipo, quantidade, data, ...)

supabase/migrations/
├── 20260407_insumos_npk.sql              — Adiciona colunas de teor NPK
├── 009_rpc_insumos_abaixo_minimo.sql     — RPC para listar insumos críticos
└── 20260407_rls_completo.sql             — RLS policies para insumos e movimentações_insumo

__tests__/
└── insumos.test.ts                       (122 linhas) — Testes de listAbaixoMinimo()

components/
└── Sidebar.tsx                           (linha 32) — Link para /dashboard/insumos
```

### Arquivos Ausentes / Não Encontrados
- ❌ `lib/validations/insumos.ts` — Schemas Zod estão inline em page.tsx (não reutilizáveis)
- ❌ `app/dashboard/insumos/components/` — Nenhum componente compartilhável (monolítico)
- ❌ `lib/hooks/useInsumos.ts` — Sem hook customizado para gerenciamento de estado
- ❌ Migrations para criação inicial da tabela `insumos` — Não localizada (pode estar em arquivo anterior)
- ❌ `lib/services/insumos.ts` — Sem camada de serviço

---

## 2. BANCO DE DADOS (Supabase)

### Tabelas e Schema

#### **Tabela: `insumos`**
```sql
CREATE TABLE insumos (
  id              UUID PRIMARY KEY,
  nome            VARCHAR(255) NOT NULL,
  tipo            ENUM('Fertilizante', 'Defensivo', 'Semente', 'Combustível', 'Outros'),
  unidade         VARCHAR(50) NOT NULL,           -- Ex: kg, L, Saco, Un
  estoque_minimo  NUMERIC(10,2) NOT NULL,        -- Threshold para alertas
  estoque_atual   NUMERIC(10,2) NOT NULL,        -- Quantidade em estoque
  fazenda_id      UUID NOT NULL (FK → fazendas),
  teor_n_percent  NUMERIC(5,2) DEFAULT 0,        -- Teor de Nitrogênio (%) — Added 2026-04-07
  teor_p_percent  NUMERIC(5,2) DEFAULT 0,        -- Teor de Fósforo P₂O₅ (%)
  teor_k_percent  NUMERIC(5,2) DEFAULT 0,        -- Teor de Potássio K₂O (%)
  
  -- Colunasprovinciais (não encontradas no schema):
  -- custo_medio_ponderado? (sugerido para controle financeiro)
  -- categoria_pai_id? (para hierarquia de categorias)
  -- data_cadastro? (auditoria)
  -- created_at? updated_at?
);
```

#### **Tabela: `movimentacoes_insumo`**
```sql
CREATE TABLE movimentacoes_insumo (
  id              UUID PRIMARY KEY,
  insumo_id       UUID NOT NULL (FK → insumos),
  tipo            ENUM('Entrada', 'Saída') NOT NULL,
  quantidade      NUMERIC(10,2) NOT NULL,
  data            DATE NOT NULL,
  destino         VARCHAR(255) NULL,              -- Ex: "Talhão 02", "AgroSementes"
  responsavel     VARCHAR(255) NULL,              -- Quem fez a movimentação
  valor_unitario  NUMERIC(12,2) NULL,             -- R$ — Entrada opcional, Saída opcional
  
  -- Colunas faltando:
  -- fazenda_id? (para auditoria direta — atualmente via FK insumos)
  -- lote_id? (rastreabilidade)
  -- observacoes? (notas)
  -- created_at? (auditoria)
);
```

### RLS Policies

**Insumos** (línhas 314-328 em `20260407_rls_completo.sql`)
```sql
-- SELECT/INSERT/UPDATE/DELETE restritos a insumos onde fazenda_id = usuário's fazenda
CREATE POLICY "insumos_select" ON public.insumos
  FOR SELECT USING (fazenda_id = get_my_fazenda_id());

CREATE POLICY "insumos_insert" ON public.insumos
  FOR INSERT WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "insumos_update" ON public.insumos
  FOR UPDATE USING (fazenda_id = get_my_fazenda_id()) 
         WITH CHECK (fazenda_id = get_my_fazenda_id());

CREATE POLICY "insumos_delete" ON public.insumos
  FOR DELETE USING (fazenda_id = get_my_fazenda_id());
```

**Movimentações de Insumo** (línhas 331-355 em `20260407_rls_completo.sql`)
```sql
-- Isolamento via subquery (sem fazenda_id direto)
CREATE POLICY "mov_insumo_select" ON public.movimentacoes_insumo
  FOR SELECT USING (
    insumo_id IN (SELECT id FROM public.insumos WHERE fazenda_id = get_my_fazenda_id())
  );
-- ... INSERT, UPDATE, DELETE análogos
```

### Função RPC (Procedure)

**`get_insumos_abaixo_minimo(p_fazenda_id UUID)`** (009_rpc_insumos_abaixo_minimo.sql)
```sql
CREATE OR REPLACE FUNCTION get_insumos_abaixo_minimo(p_fazenda_id uuid)
RETURNS SETOF insumos
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM insumos
  WHERE fazenda_id = p_fazenda_id
    AND estoque_atual < estoque_minimo
  ORDER BY nome;
$$;
```

---

## 3. FUNCIONALIDADES ATUAIS vs ESTRUTURADAS

### ✅ Implementado e Funcional

| Funcionalidade | Status | Detalhes |
|---|---|---|
| **Cadastro de Insumo** | ✅ Completo | Nome, Tipo, Unidade, Estoque Mín/Atual, NPK (se Fertilizante) |
| **Edição de Insumo** | ✅ Completo | Dialog inline com form reutilizável |
| **Exclusão de Insumo** | ✅ Completo | Com confirmação, deleta também movimentações relacionadas |
| **Listagem de Insumos** | ✅ Completo | Grid de cards, ordenação alfabética, filtro visual por estoque |
| **Movimentação de Entrada** | ✅ Completo | Registra entrada com quantidade, valor unitário, destino, responsável |
| **Movimentação de Saída** | ✅ Completo | Registra saída com mesmos campos |
| **Histórico de Movimentações** | ✅ Completo | Tabela ordenada por data (desc), com formatação de valores e ícones |
| **Alerta de Estoque Crítico** | ✅ Completo | Badge vermelha em cards, contador no header |
| **RLS e Isolamento de Dados** | ✅ Completo | Policies em vigor, segregação por fazenda_id |
| **NPK de Fertilizantes** | ✅ Completo | Campos opcionais N%, P₂O₅%, K₂O% visíveis só para tipo Fertilizante |
| **Testes Unitários** | ⚠️ Parcial | Apenas `listAbaixoMinimo()` testada |

### ⚠️ Estruturado mas Incompleto / Placeholder

| Funcionalidade | Status | Detalhes |
|---|---|---|
| **Categorias Hierárquicas** | ❌ Não existe | Sem campo `categoria_id` ou `categoria_pai_id` |
| **Custo Médio Ponderado** | ❌ Não existe | Sem cálculo automático de FIFO/PEPS |
| **Integração com Financeiro** | ⚠️ Mínima | `valor_unitario` registrado mas não vinculado a `financeiro` |
| **Integração com Talhões** | ❌ Não existe | `destino` é texto livre, não referencia `talhoes.id` |
| **Integração com Frota** | ❌ Não existe | Combustível como tipo, mas sem vínculo a `maquinas` |
| **Rastreabilidade Completa** | ⚠️ Limitada | `responsavel` e `destino` são texto, sem auditoria de usuário |
| **Relatórios** | ❌ Não existe | Sem export, sem gráficos, sem consolidação por período |
| **Lote / Série** | ❌ Não existe | Sem rastreamento de validade ou lote |

---

## 4. COMPONENTES E UI

### Componentes do Módulo (em page.tsx)

1. **Card de Resumo de Insumo**
   - Componente inline dentro do `.map()` (linhas 459-528)
   - Mostra: nome, tipo, estoque atual vs mínimo, barra de progresso, NPK
   - Estados: Normal (verde) ou Crítico (vermelho)
   - Ações inline: Editar, Deletar

2. **Dialogs de CRUD**
   - "Novo Insumo" (linhas 420-437)
   - "Editar Insumo" (linhas 473-487)
   - "Confirmar Exclusão" (linhas 595-611)
   - "Registrar Movimentação" (linhas 319-417)

3. **Tabela de Histórico de Movimentações**
   - Componente Table (linhas 539-591)
   - Colunas: Data, Insumo, Tipo (com ícone), Quantidade, Destino, Valor Unit., Responsável
   - Formatação: Data pt-BR, Valor em BRL com toLocaleString, ícones seta entrada/saída

### Formulários (React Hook Form + Zod)

**Schema: insumoSchema** (linhas 46-55)
```typescript
{
  nome: string (min 2),
  tipo: enum ['Fertilizante', 'Defensivo', 'Semente', 'Combustível', 'Outros'],
  unidade: string (min 1),
  estoque_minimo: number (≥ 0),
  estoque_atual: number (≥ 0),
  teor_n_percent: number (0-100, optional),
  teor_p_percent: number (0-100, optional),
  teor_k_percent: number (0-100, optional),
}
```

**Schema: movimentacaoSchema** (linhas 57-65)
```typescript
{
  insumo_id: string (min 1),
  tipo: enum ['Entrada', 'Saída'],
  quantidade: number (> 0),
  valor_unitario: number (≥ 0, optional),
  destino: string (min 1),
  responsavel: string (min 1),
  data: string (ISO date),
}
```

### Estado e Lógica

**Estados Mantidos em Page Component:**
- `insumos: Insumo[]` — Lista de insumos da fazenda
- `movimentacoes: (MovimentacaoInsumo & { insumo_nome, insumo_unidade })[]`
- `loading` — Spinner durante fetch
- `submitting` — Desabilita botões durante operações
- `isAddInsumoOpen, isAddMovOpen` — Dialogs de CRUD
- `editingInsumo, deletingInsumo` — Estados de operação específica

**Fetch:**
- `useCallback fetchData()` chamada ao montar e quando `fazendaId` muda
- Promise.all para paralelizar: `q.insumos.list()` + `getTodasMovimentacoesByFazenda()`

**Handlers:**
- `handleSaveInsumo()` — Create ou Update via `q.insumos.create/update()`
- `handleSaveMovimentacao()` — Registra movimentação via `createMovimentacaoInsumo()`
- `handleConfirmDelete()` — Delete com confirmação

---

## 5. INTEGRAÇÕES COM OUTROS MÓDULOS

| Módulo | Tipo | Status | Detalhes |
|---|---|---|---|
| **Silos** | ❌ Não existe | Não há | Insumos (especialmente inoculantes) usados em silos não estão vinculados |
| **Talhões** | ❌ Referência Fraca | Texto livre | Campo `destino` em movimentações poderia ser FK → talhoes.id |
| **Frota** | ❌ Referência Fraca | Texto livre | Combustível é um tipo de insumo, mas sem vínculo a máquinas |
| **Financeiro** | ⚠️ Mínima | Parcial | `valor_unitario` registrado, mas não sincroniza com `financeiro` table |
| **Relatórios** | ❌ Não existe | Não há | Sem agregação de movimentações para períodos |
| **Calculadoras** | ❌ Não existe | Não há | Sem calculadora de dosagem ou custo-benefício |

---

## 6. TIPAGEM TYPESCRIPT

### Types Exportados (lib/supabase.ts linhas 98-120)

```typescript
export type Insumo = {
  id: string;
  nome: string;
  tipo: 'Fertilizante' | 'Defensivo' | 'Semente' | 'Combustível' | 'Outros';
  unidade: string;
  estoque_minimo: number;
  estoque_atual: number;
  fazenda_id: string;
  teor_n_percent?: number;
  teor_p_percent?: number;
  teor_k_percent?: number;
};

export type MovimentacaoInsumo = {
  id: string;
  insumo_id: string;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  data: string;
  destino: string | null;
  responsavel: string | null;
  valor_unitario: number | null;
};
```

### Schemas Zod (Inline em page.tsx, NÃO reutilizáveis)

- `insumoSchema` — Define validações para form de cadastro
- `movimentacaoSchema` — Define validações para form de movimentação
- **Problema**: Não estão em `lib/validations/insumos.ts`, repetindo lógica em outros componentes

### Type Auxiliar (page.tsx linha 73)

```typescript
type MovComNome = MovimentacaoInsumo & { insumo_nome: string; insumo_unidade: string };
```
- Necessário porque a query em `getTodasMovimentacoesByFazenda()` faz JOIN com insumos
- Duplica dados mas facilita renderização em tabela

---

## 7. GESTÃO DE ESTADO E QUERIES

### Padrão Utilizado

**Não há:**
- ❌ Redux / Zustand / Jotai
- ❌ React Context para compartilhar estado
- ❌ React Query / SWR para caching
- ❌ Custom hook useInsumos()

**Há:**
- ✅ `useState` local em page component (monolítico)
- ✅ Queries diretas ao Supabase via `q.insumos.*` e `insumos.ts`
- ✅ `useCallback` para memoizar `fetchData()`
- ✅ `useForm` + `useController` para validação

### Queries ao Supabase

**Via `queries-audit.ts`** (com auditoria de fazenda_id)
```typescript
// ✅ Auditado — sempre filtra por fazenda_id
const insumos = await q.insumos.list();
const criticos = await q.insumos.listAbaixoMinimo();
await q.insumos.create({ ...data, fazenda_id: getFazendaId() });
await q.insumos.update(id, payload);
await q.insumos.remove(id);
```

**Via `lib/supabase/insumos.ts`** (sem auditoria integrada)
```typescript
// ⚠️ Sem fazenda_id obrigatório — confia no RLS
const delOk = await deleteInsumo(id);  // Apenas deleta movimentações + insumo
const movs = await getMovimentacoesByInsumo(insumoId);
const movsAll = await getTodasMovimentacoesByFazenda(fazendaId);  // Passa fazenda_id manualmente
const movCreated = await createMovimentacaoInsumo(mov);
```

**Problemas identificados:**
- `deleteInsumo()` em `insumos.ts` não é auditada — deveria estar em `queries-audit.ts`
- `getMovimentacoesByInsumo()` não filtra por fazenda — RLS deveria cobrir, mas sem auditoria no TS
- `createMovimentacaoInsumo()` não passa por `getFazendaId()` — apenas confia na RLS

### Otimizações (ou falta delas)

✅ **Bom:**
- `select('id', { count: 'exact', head: true })` em alguns checks (em `queries-audit.ts`)
- RLS applica-se a todas as queries (barreira em nível DB)

❌ **Ruim:**
- `select('*')` em algumas queries — específico seria melhor
- Sem paginação em listas
- Sem filtros avançados (apenas alfabético)
- Sem cache entre recarregamentos da página
- Cada click em "Registrar Movimentação" refetch tudo

---

## 8. PROBLEMAS IDENTIFICADOS

### 🔴 Críticos

#### **1. BUG: fazenda_id vazio ao criar insumo**
**Arquivo:** `app/dashboard/insumos/page.tsx:144`

```typescript
// ❌ ERRADO
await q.insumos.create({ ...data, fazenda_id: '' });

// ✅ Deveria ser (queries-audit.ts já injeta automaticamente):
await q.insumos.create(data);
```

**Impacto:** Novo insumo é criado com `fazenda_id = ''` (empty string) em vez de UUID real.  
**Resultado:** 
- Registro fica órfão no banco
- RLS policy `fazenda_id = get_my_fazenda_id()` falha em SELECT posterior
- Usuário não consegue ver o insumo criado

**Solução Rápida:** Remover `fazenda_id: ''` da chamada em line 144 e 139.

---

#### **2. Queries não auditadas em `insumos.ts`**
**Arquivo:** `lib/supabase/insumos.ts`

Funções como `deleteInsumo()`, `getMovimentacoesByInsumo()` não passam por `getFazendaId()`.

**Impacto:** 
- Sem camada de auditoria no TypeScript (apenas RLS DB-side)
- Se RLS estiver desativado em desenvolvimento, qualquer usuário consegue ver dados de outra fazenda
- Violação de padrão definido em `queries-audit.ts`

**Solução:** Mover todas as funções para `queries-audit.ts` ou deletar `insumos.ts`.

---

### 🟡 Não-Críticos

#### **3. Ausência de Validação de Categorias Hierárquicas**
- Tipo é apenas enum, sem estrutura de categoria pai/filha
- Impossível organizar "Fertilizante > Nitrogenado > Ureia"
- Campo `tipo` é genérico demais para granularidade necessária em operações reais

#### **4. Sem Custo Médio Ponderado**
- Não há cálculo automático de FIFO/PEPS/CMP
- `valor_unitario` é registrado, mas sem histórico agregado
- Financeiro não recebe dados consolidados

#### **5. Destino e Responsável são Texto Livre**
- `destino` deveria referenciar `talhoes.id` ou `maquinas.id`
- `responsavel` deveria referenciar `profiles.id`
- Sem validação FK = sem integridade referencial

#### **6. Sem Rastreabilidade de Lote/Série/Validade**
- Movimento não registra lote
- Impossível rastrear "este lote venceu" ou "este lote foi para talhão X"
- Crítico para garantia de qualidade

#### **7. Esquemas Zod Inline**
- Estão em `page.tsx`, não em `lib/validations/insumos.ts`
- Se outro componente precisar validar insumo, precisa copiar o schema
- Violação DRY

#### **8. Sem Paginação**
- Se usuário tem 1000+ insumos, table carrega tudo de uma vez
- Sem filtros avançados (tipo, nome, status crítico)

#### **9. Sem Testes Completos**
- Apenas `listAbaixoMinimo()` testada
- Sem testes para create, update, delete, ou movimentações
- Sem testes de integração com UI

#### **10. Falta de Componentes Reutilizáveis**
- Tudo está em `page.tsx` — se outro módulo precisar form de insumo, duplica código
- Card de insumo, tabela de movimentações, dialogs — todos monolíticos

---

## 9. GAPS vs FUNCIONALIDADE DESEJADA

Considerando que o módulo deveria suportar:
- ✅ Cadastro de insumos com categorias hierárquicas
- ✅ Movimentações de entrada/saída
- ✅ Custo médio ponderado
- ✅ Estoque mínimo com alertas
- ✅ Integrações com talhões/frota/silos/financeiro
- ✅ Rastreabilidade completa

**Resultado:**

| Requisito | Status | Gap |
|---|---|---|
| Cadastro | ✅ Básico | Sem categorias hierárquicas |
| Movimentações | ✅ Registrada | Sem lote/série, sem rastreamento de destino real |
| Custo Médio | ❌ Não | Sem tabela de histórico de preços, sem agregação FIFO |
| Estoque Mínimo | ✅ Sim | Apenas alert visual, sem notificação automática |
| Integ. Talhões | ❌ Fraca | Destino é texto, não FK |
| Integ. Frota | ❌ Fraca | Combustível é tipo, não vínculo a máquinas |
| Integ. Silos | ❌ Não | Inoculantes/lonas não vinculadas |
| Integ. Financeiro | ⚠️ Mínima | Valor registrado, não sincronizado em despesa |
| Rastreabilidade | ⚠️ Parcial | Responsável e destino texto, sem auditoria de usuário |
| Relatórios | ❌ Não | Sem export, sem agregação por período |

---

## 10. RECOMENDAÇÕES PRIORITÁRIAS

### Fase 1: Correções Críticas (Sprint 1)
1. **Fixar bug de `fazenda_id` vazio** — Linha 144 em `page.tsx`
2. **Mover queries não auditadas** — Consolidar em `queries-audit.ts` ou deletar
3. **Adicionar testes** — Pelo menos CRUD e movimentações

### Fase 2: Estrutura (Sprint 2-3)
4. **Extrair schemas Zod** — Para `lib/validations/insumos.ts`
5. **Componentizar** — Card, Dialog, Table em componentes reutilizáveis
6. **Adicionar categories e subcategories** — FK na tabela

### Fase 3: Integrações (Sprint 4-5)
7. **Integrar com Talhões** — `destino` vira `talhao_id` FK
8. **Integrar com Frota** — Combustível vira referência a máquinas
9. **Integrar com Financeiro** — Sincronizar despesas de insumo
10. **Adicionar rastreabilidade de lote** — Nova tabela `lotes_insumo`

### Fase 4: Features Avançadas (Sprint 6+)
11. **Custo Médio Ponderado** — Cálculo automático com histórico de preços
12. **Relatórios e Export** — PDF, Excel
13. **Notificações** — Email/SMS quando estoque crítico
14. **Previsão de Consumo** — IA / ML para alertar compras futuras

---

## 11. RESUMO EXECUTIVO

**Status Geral:** ⚠️ **Funcional mas com Bugs Críticos**

### O que Funciona
- Cadastro, edição, exclusão de insumos ✅
- Registro de movimentações ✅
- Visual de estoque crítico ✅
- RLS e isolamento de dados ✅
- NPK para fertilizantes ✅

### O que Está Quebrado
- 🔴 `fazenda_id` vazio ao criar insumo (BUG CRÍTICO)
- 🔴 Queries não auditadas em `insumos.ts` (PADRÃO VIOLADO)

### O que Falta
- Categorias hierárquicas
- Custo médio ponderado
- Integrações solidas com talhões/frota/silos/financeiro
- Rastreabilidade de lote
- Testes completos
- Componentes reutilizáveis
- Relatórios

**Conclusão:** Módulo é um MVP funcional, pronto para uso básico, mas requer correções imediatas e refatoração para produção em escala.

---

## Apêndice A: Arquivos de Referência

### Migrations Relevantes
- `supabase/migrations/20260407_rls_completo.sql` — RLS policies (linhas 314-355)
- `supabase/migrations/20260407_insumos_npk.sql` — Colunas NPK
- `supabase/migrations/009_rpc_insumos_abaixo_minimo.sql` — RPC

### Tipos
- `lib/supabase.ts:98-120` — Types Insumo e MovimentacaoInsumo

### Queries Auditadas
- `lib/supabase/queries-audit.ts:334-432` — `insumos` e `movimentacoesInsumo`

### Página Principal
- `app/dashboard/insumos/page.tsx` — UI completa

### Testes
- `__tests__/insumos.test.ts` — Testes de `listAbaixoMinimo()`

---

**Relatório Gerado em:** 2026-04-16  
**Próximo Passo:** Gerar PRD detalhado baseado neste diagnóstico
