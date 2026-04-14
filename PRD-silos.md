# PRD — Reformulação do Módulo de Gestão de Silos

**Data:** Abril 2026  
**Status:** ✍️ Rascunho — Aguardando revisão  
**Versão:** 1.0

---

## 1. ANÁLISE DO CÓDIGO ATUAL

### 1.1 Estrutura Existente

#### Banco de Dados
**Tabela principal: `silos`** (atual, será reformulada)
```
- id (UUID, PK)
- nome (texto)
- tipo (enum: 'Bolsa' | 'Bunker' | 'Convencional') → MIGRAR PARA 'Superfície'|'Trincheira'|'Bag'|'Outros'
- talhao_id (FK → talhoes, NOVO — origem principal)
- cultura_ensilada (texto, NOVO — desnormalização, salva no cadastro)
- capacidade (número) — REMOVER
- localizacao (texto) — REMOVER
- consumo_medio_diario_ton (numérico) — REMOVER
- fazenda_id (FK, RLS)
- materia_seca_percent (numérico)
- insumo_lona_id (FK → insumos)
- insumo_inoculante_id (FK → insumos)

NOVOS (na migration):
- data_fechamento (DATE)
- data_abertura_prevista (DATE)
- data_abertura_real (DATE)
- volume_ensilado_ton_mv (NUMERIC)
- comprimento_m (NUMERIC)
- largura_m (NUMERIC)
- altura_m (NUMERIC)
- observacoes_gerais (TEXT)
```

**Tabela: `movimentacoes_silo`**
```
- id (UUID, PK)
- silo_id (FK → silos)
- tipo (enum: 'Entrada' | 'Saída')
- quantidade (número)
- data (timestamp)
- talhao_id (FK → talhoes, nullable)
- responsavel (texto)
- observacao (texto)
```

#### Frontend
- **Localização:** `app/dashboard/silos/page.tsx` (1 arquivo monolítico, ~700 linhas)
- **Padrões:**
  - Client component com `'use client'`
  - React Hook Form + Zod para validação
  - Dialogs modais para criar/editar
  - Cards em grid (responsive: md:2 cols, lg:3 cols)
  - Tabela para histórico
  - Integração com `q` (camada audit queries-audit.ts)
  - Toast notifications (sonner)

#### API/Queries
- **Arquivo:** `lib/supabase/queries-audit.ts`
- **Padrão:** Objeto `q` com namespaces (`q.silos.*`, `q.movimentacoesSilo.*`)
- **Funcionalidades:**
  - `q.silos.list()` — lista silos da fazenda
  - `q.silos.create()` — cria silo
  - `q.silos.update()` — atualiza silo
  - `q.silos.remove()` — deleta silo
  - `q.movimentacoesSilo.listBySilo()` — movimentações de um silo
  - `q.movimentacoesSilo.listBySilos()` — batch de múltiplos silos
  - `q.movimentacoesSilo.create()` — registra movimentação
  - `q.movimentacoesSilo.remove()` — deleta movimentação

#### Utilitários
- **Arquivo:** `lib/supabase/silos.ts`
- **Funções:**
  - `updateSilo(id, partial)` — atualiza direto (sem check de fazenda_id no TS)
  - `deleteSilo(id)` — deleta direto
  - `getCustoProducaoSilagem(siloId)` — calcula custo: talhão → ciclo → financeiro + atividades

#### Integrações Existentes
- **Talhões:** `talhao_id` em `movimentacoes_silo`, passagem de dados via primeira entrada
- **Insumos:** Referências `insumo_lona_id` e `insumo_inoculante_id` em `silos`
- **Financeiro:** Via `getCustoProducaoSilagem()` — custo_total do silo
- **Atividades de Campo:** Via `getCustoProducaoSilagem()` → ciclo_id

---

### 1.2 Padrões Identificados

#### Componentes
- **Cards:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` (shadcn)
- **Formulários:** Dialog modal com react-hook-form + zod
- **Inputs:** `Input`, `Label`, `Select`, `Controller` (para selects)
- **Feedback visual:** `Badge`, `Progress`, `Toast` (sonner)
- **Ícones:** Lucide React (ArrowDownRight, ArrowUpRight, Plus, Database, etc.)

#### UX/UI
- Layout de seções com `div.space-y-6`
- Cards em grid responsivo
- Dialogs para criar/editar (não pages separadas)
- Status badges com cores: `variant="destructive"`, `"secondary"`, `"outline"`
- Barra de progresso visual para ocupação
- Cálculos em tempo real (occupancy %)

#### Validação & Segurança
- RLS (Row Level Security) em Supabase (na tabela `silos` e `movimentacoes_silo`)
- Filtro obrigatório por `fazenda_id` no TS via `getFazendaId()`
- Schemas Zod para form validation
- `eq('fazenda_id', fazendaId)` em todas as queries

---

## 2. ESTADO ATUAL vs. NOVO

### Remoções
| Campo | Motivo |
|-------|--------|
| `capacidade` (toneladas) | Substituído por "Volume ensilado (ton MV)" — representa dado real ensilado, não capacidade teórica |
| `localizacao` | Removido do cadastro principal (informação pouco crítica) |
| `consumo_medio_diario_ton` (coluna da tabela) | Será calculado em tempo real: Σ saídas(uso) / dias desde abertura. Não é persistido no BD (quantidade de silos <50, cálculo é negligenciável) |

### Adições — Campos de Entrada
| Campo | Seção | Tipo | Obrigatório | Observação |
|-------|-------|------|:-----------:|-----------|
| `talhao_id` | A — Dados Gerais | FK dropdown | Sim | Origem principal do silo |
| `cultura_ensilada` (auto) | A | Read-only (do talhão) | Sim | Desnormalizada: salva no cadastro, não muda se talhão mudar |
| `data_fechamento` | A | Date picker | Sim | Data da ensilagem |
| `data_abertura_prevista` | A | Date picker | Não | Pré-preenchida: data_fechamento + 60 dias |
| `observacoes_gerais` | A | Textarea | Não | Anotações livres |
| `volume_ensilado_ton_mv` | B — Dados Quantitativos | Numérico | Sim | Quantidade real ensilada em ton MV |
| `materia_seca_percent` | B | Numérico | Sim | MS original da cultura no momento |
| `comprimento_m` | B | Numérico | Sim | Dimensão do silo |
| `largura_m` | B | Numérico | Sim | Dimensão do silo |
| `altura_m` | B | Numérico | Sim | Dimensão do silo |
| `insumo_lona_id` | C — Insumos | FK dropdown | Sim | Lona utilizada |
| `insumo_inoculante_id` | C | FK dropdown | Não | Inoculante (opcional) |

### Adições — Campos Calculados
| Campo | Cálculo | Display | Local |
|-------|---------|---------|-------|
| `densidade_kg_m3` | (vol_mv × 1000) / (C × L × A) | Com indicador: ≥650🟢, 550-649🟡, <550🔴 | Dialog cadastro + Aba Visão Geral |
| `estoque_atual_ton` | Σ Entradas − Σ Saídas | Dinâmico (não persistido) | Card + Aba Estoque |
| `consumo_medio_diario_ton` | Σ Saídas(uso) / dias_desde_abertura | Dinâmico (cálculo em tempo real, <50 silos = negligenciável) | Card + Aba Estoque |
| `estoque_para_dias` | estoque_atual / consumo_diário | Dinâmico | Card (destacado em badge) |
| `status_silo` | Lógica de datas + estoque | Dinâmico | Card header + Aba Visão Geral |
| `ms_atual` | Último `avaliacoes_bromatologicas.ms` | Dinâmico | Card + Aba Qualidade |
| `custo_por_ton_mv` | Retornado por `getCustoProducaoSilagem()` | Estático (calcula uma vez) | Aba Visão Geral |
| `custo_total_silo_r` | vol_mv × custoPorTonelada | Estático (calcula uma vez) | Aba Visão Geral |

### Novas Tabelas Necessárias
```sql
CREATE TABLE avaliacoes_bromatologicas (
  id UUID PK,
  silo_id FK,
  data DATE,
  momento ENUM('Fechamento' | 'Abertura' | 'Monitoramento'),
  ms NUMERIC, pb, fdn, fda, ee, mm, amido, ndt NUMERIC,
  ph NUMERIC,
  created_at TIMESTAMP
)

CREATE TABLE avaliacoes_psps (
  id UUID PK,
  silo_id FK,
  data DATE,
  momento ENUM('Fechamento' | 'Abertura' | 'Monitoramento'),
  peneira_19mm NUMERIC, peneira_8_19mm NUMERIC,
  peneira_4_8mm NUMERIC, peneira_fundo_4mm NUMERIC,
  tamanho_teorico_corte_mm NUMERIC,
  kernel_processor BOOLEAN,
  avaliador VARCHAR,
  — Calculados:
  tmp_mm NUMERIC,
  status_peneira_19mm ENUM('ok' | 'fora'),
  status_peneira_8_19mm ENUM('ok' | 'fora'),
  status_peneira_4_8mm ENUM('ok' | 'fora'),
  status_peneira_fundo_4mm ENUM('ok' | 'fora'),
  created_at TIMESTAMP
)

ALTER TABLE silos ADD (
  talhao_id FK → talhoes,
  data_fechamento DATE,
  data_abertura_prevista DATE,
  data_abertura_real DATE,
  volume_ensilado_ton_mv NUMERIC,
  comprimento_m NUMERIC,
  largura_m NUMERIC,
  altura_m NUMERIC,
  observacoes_gerais TEXT
)

ALTER TABLE movimentacoes_silo ADD (
  subtipo ENUM('Uso na alimentação' | 'Descarte' | 'Transferência' | 'Venda') — obrigatório para saídas
)
```

---

## 3. INTERFACE DETALHADA

### 3.1 Tela Principal — Listagem de Silos

**URL:** `/dashboard/silos`

**Layout:**
```
┌─ Gestão de Silos ─────────────────────────────────── [+ Novo Silo] [+ Registrar Movimentação]
│
├─ GRID: Cards de Silos (md:2 cols, lg:3 cols)
│  ┌─ Card Silo ─────────────────────────────────────────────────
│  │ ┌─────────────────────────────────────────────────────────┐
│  │ │ Silo Norte 01      [Superfície]                      🟢
│  │ │ Milho — Talhão 005 |  Aberto
│  │ ├─────────────────────────────────────────────────────────┤
│  │ │ [████████░░░░░░░░░░░░] 62% (155 / 250 ton)
│  │ │ MS: 32.5% | MS atual: 31.8% (última análise: há 3 dias)
│  │ │ Estoque para: 25 dias | Consumo: 6.2 t/dia
│  │ │ Fechado em: 15/02/2026 | Aberto em: 16/03/2026
│  │ │ [Clicável → Tela detalhada]
│  │ └─────────────────────────────────────────────────────────┘
│  └──────────────────────────────────────────────────────────────
│
├─ Card Status Vazio
│  └─ "Nenhum silo cadastrado. Clique em 'Novo Silo' para começar."
│
├─ Tabela: Histórico de Movimentações (últimas 20)
│  │ Data  │ Silo │ Tipo │ Subtipo │ Quantidade │ Responsável │ Obs
│  │ ... movimentações mais recentes ...
│  └─ (Clicável no card leva para aba "Estoque e Movimentações")
```

**Comportamento:**
- Cards são clicáveis → navegam para tela detalhada
- Botões no header abrem dialogs (não navegar para outra página)
- Status badge muda cor conforme estado (vide seção 3.3)

---

### 3.2 Dialog — "Novo Silo"

**Trigger:** Botão "+ Novo Silo"

**Estrutura: 3 seções com scroll interno**

```
┌─ Cadastrar Novo Silo ───────────────────────────────────────────
│
│ ╔ Seção A — Dados Gerais ═════════════════════════════════════╗
│ ║ Nome do silo *           [____________________]             ║
│ ║ Tipo de estrutura *      [Superfície ▼]                    ║
│ ║ Talhão de origem *       [Talhão 005 — Milho ▼]            ║
│ ║ Cultura ensilada *       Milho (read-only, do talhão)      ║
│ ║ Data de fechamento *     [2026-04-13]                      ║
│ ║ Data de abertura prev.   [2026-06-12] (fechamento + 60d)   ║
│ ║ Observações gerais       [_________________________]         ║
│ ╚═════════════════════════════════════════════════════════════╝
│
│ ╔ Seção B — Dados Quantitativos ══════════════════════════════╗
│ ║ Volume ensilado (ton MV) *       [250.5]                   ║
│ ║ Matéria Seca (%) *               [32.5]                    ║
│ ║ Comprimento (m) *                [15]                      ║
│ ║ Largura (m) *                    [10]                      ║
│ ║ Altura (m) *                     [2.5]                     ║
│ ║ Densidade estimada (kg/m³)       667.3 🟢 (calculado)      ║
│ ╚═════════════════════════════════════════════════════════════╝
│
│ ╔ Seção C — Insumos ═══════════════════════════════════════════╗
│ ║ Lona utilizada *         [Lona Preta 150μ ▼]               ║
│ ║ Inoculante               [Nenhum selecionado ▼]            ║
│ ╚═════════════════════════════════════════════════════════════╝
│
│                         [Cancelar] [Cadastrar]
└─────────────────────────────────────────────────────────────────
```

**Validações:**
- Nome: mín 2 caracteres
- Tipo: obrigatório (enum)
- Talhão: obrigatório (FK)
- Data fechamento: obrigatório
- Volume, MS, C, L, A: números positivos, obrigatórios
- Lona: obrigatória
- Ao sair do dropdown "Talhão", preencher automaticamente "Cultura ensilada"
- Ao sair de "Data fechamento", pré-preencher "Data abertura prevista" (+ 60 dias)

---

### 3.3 Tela Detalhada — Silo Individual

**URL:** `/dashboard/silos/[id]`  
**Trigger:** Clique no card

**Layout: Header + 3 Abas**

```
┌─ Silo Norte 01   [Superfície]  Milho — Talhão 005   [Status: Aberto 🟢] ─────
│                                                                    [← Voltar]
│
├─ Tab 1: Visão Geral  │ Tab 2: Estoque e Movimentações  │ Tab 3: Qualidade
│
├─────────────────────────────────────────────────────────────────────────────
│ TAB 1: VISÃO GERAL (conteúdo ativo abaixo)
│
│ ┌─ Dados do Silo ──────────────────────────────────────────────────────────┐
│ │ Nome: Silo Norte 01                                                      │
│ │ Tipo: Superfície                                                         │
│ │ Cultura ensilada: Milho (salva no cadastro)                              │
│ │ Dimensões: 15m (C) × 10m (L) × 2.5m (A)                                 │
│ │ Volume ensilado: 250.5 ton MV                                            │
│ │ Matéria Seca (original): 32.5%                                           │
│ │ Densidade estimada: 667.3 kg/m³ 🟢 (dentro do ideal: ≥650)              │
│ └──────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Rastreabilidade & Custo ────────────────────────────────────────────────┐
│ │ Talhão de origem: Talhão 005                                             │
│ │ Ciclo agrícola: Plantio 15/10/2025 | Colheita 28/02/2026                │
│ │ Custo produção do talhão: R$ 1.250,00/ton (via getCustoProducaoSilagem) │
│ │ Custo total do silo: R$ 313.125,00 (250.5 × 1.250)                      │
│ └──────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Datas ──────────────────────────────────────────────────────────────────┐
│ │ Data de fechamento: 15/02/2026                                           │
│ │ Data de abertura prevista: 16/04/2026                                    │
│ │ Data de abertura real: 16/03/2026 (10 dias antes do previsto)            │
│ │ Fermentação: 29 dias                                                     │
│ └──────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Insumos Utilizados ─────────────────────────────────────────────────────┐
│ │ Lona: Lona Preta 150μ (Lote: 2025-001, Est: 2 rolos em estoque)          │
│ │ Inoculante: Não utilizado                                                │
│ └──────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Observações ────────────────────────────────────────────────────────────┐
│ │ "Silo de contenção durante pico de colheita. Não há sinais de           │
│ │  efluente. Cobertura bem vedada."                                        │
│ └──────────────────────────────────────────────────────────────────────────┘
│
│                                                      [✏️ Editar Dados do Silo]
│
├─────────────────────────────────────────────────────────────────────────────
│ TAB 2: ESTOQUE E MOVIMENTAÇÕES
│
│ ┌─ Resumo ──────────────────────────────────────────────────────────────────┐
│ │ Entrada total: 250.5 ton MV                                              │
│ │ Saídas (alimentação): 95.2 ton                                            │
│ │ Saídas (descarte): 3.1 ton                                               │
│ │ Saídas (transferência): 0 ton                                             │
│ │ Saídas (venda): 0 ton                                                     │
│ │ ────────────────────────────────                                          │
│ │ Estoque atual: 155.0 ton (62%)                                           │
│ │ Consumo médio diário: 6.2 ton/dia                                        │
│ │ Estoque para: 25 dias                                                    │
│ └──────────────────────────────────────────────────────────────────────────┘
│
│ [🔄 Atualizar] [+ Registrar Movimentação]
│
│ ┌─ Histórico de Movimentações ──────────────────────────────────────────────┐
│ │ Data    │ Tipo  │ Subtipo          │ Quantidade │ Responsável │ Obs     │
│ │ 13/04   │ Saída │ Uso na alimentação│ 8.2 ton   │ João Silva  │ Lote 3 │
│ │ 12/04   │ Saída │ Uso na alimentação│ 6.5 ton   │ Maria Costa │ —      │
│ │ 10/04   │ Saída │ Descarte         │ 3.1 ton   │ João Silva  │ Mofo   │
│ │ 16/03   │ Entrada │ Ensilagem       │ 250.5 ton │ Operador A  │ —      │
│ └──────────────────────────────────────────────────────────────────────────┘
│
├─────────────────────────────────────────────────────────────────────────────
│ TAB 3: QUALIDADE
│
│ ┌─ Avaliação Bromatológica ─────────────────────────────────────────────────┐
│ │ [+ Nova Avaliação Bromatológica]                                          │
│ │
│ │ Avaliação 01 (Mais recente)
│ │ ┌──────────────────────────────────────────────────────────────────────┐
│ │ │ Data: 10/04/2026 | Momento: Monitoramento | Avaliador: Lab Agro    │
│ │ │ MS: 31.8% | PB: 8.5% | FDN: 65.2% | FDA: 32.1%                     │
│ │ │ EE: 2.3% | MM: 5.1% | Amido: 22.5% | NDT: 62.3% | pH: 3.8          │
│ │ └──────────────────────────────────────────────────────────────────────┘
│ │
│ │ Avaliação 02
│ │ ┌──────────────────────────────────────────────────────────────────────┐
│ │ │ Data: 17/03/2026 | Momento: Abertura | Avaliador: Lab Agro         │
│ │ │ MS: 32.1% | PB: 8.2% | FDN: 66.0% | FDA: 33.2%                     │
│ │ │ EE: 2.1% | MM: 4.8% | Amido: 23.5% | NDT: 61.8% | pH: 3.9          │
│ │ └──────────────────────────────────────────────────────────────────────┘
│ └──────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Avaliação de Partículas (PSPS) ──────────────────────────────────────────┐
│ │ [+ Nova Avaliação PSPS]                                                   │
│ │
│ │ Avaliação 01 (Mais recente)
│ │ ┌──────────────────────────────────────────────────────────────────────┐
│ │ │ Data: 10/04/2026 | Momento: Monitoramento | Avaliador: João Silva  │
│ │ │ Tamanho teórico corte: 15mm | Kernel Processor: Sim                 │
│ │ │
│ │ │ Peneira >19mm:    3.2%  ✅ (ideal: 3–8%)                            │
│ │ │ [███░░░░░░░░░░░░░░░░░░░░░]                                         │
│ │ │
│ │ │ Peneira 8-19mm:  54.5%  ✅ (ideal: 45–65%)                          │
│ │ │ [██████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]│
│ │ │
│ │ │ Peneira 4-8mm:   27.3%  ✅ (ideal: 20–30%)                          │
│ │ │ [███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]│
│ │ │
│ │ │ Fundo <4mm:       5.0%  ✅ (ideal: 0–10%)                           │
│ │ │ [██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]│
│ │ │
│ │ │ TMP calculado: 12.8 mm (tamanho médio ponderado de partículas)      │
│ │ │ Status geral: ✅ Todas as faixas dentro do ideal                     │
│ │ └──────────────────────────────────────────────────────────────────────┘
│ └──────────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────
```

---

### 3.4 Lógica de Status Badge

**Badges exibidos no card e header da tela detalhada:**

| Status | Badge | Lógica | Cores |
|--------|-------|--------|-------|
| 🟡 Enchendo | "Enchendo" | `data_fechamento` NULL | Yellow |
| 🔴 Fechado | "Fechado" | `data_fechamento` NOT NULL AND `data_abertura_real` NULL | Red |
| 🟢 Aberto | "Aberto" | `data_abertura_real` NOT NULL AND estoque > 0 | Green |
| ⚫ Vazio | "Vazio" | estoque = 0 | Gray/Black |
| 🟠 Atenção | "Atenção" | estoque_para < 15 dias (sobrepõe "Aberto") | Orange |

---

## 4. ESPECIFICAÇÃO TÉCNICA

### 4.1 Mudanças no Banco de Dados

#### Nota Importante: Rastreabilidade com `talhao_id`

**Dois contextos diferentes para `talhao_id`:**

1. **`silos.talhao_id`** — origem principal
   - Obrigatório
   - Identifica de qual talhão a silagem foi originária
   - Usado para traçar custo de produção via ciclo agrícola
   - Imutável (não deve mudar após cadastro)

2. **`movimentacoes_silo.talhao_id`** — rastreabilidade por operação
   - Opcional/nullable
   - Pode diferir de `silos.talhao_id` em cenários de transferência entre talhões
   - Rastreia de onde a silagem foi retirada em cada movimentação
   - Exemplo: Silo criado do Talhão 001, mas saída registrada para alimentação do rebanho no Talhão 002

Ambos os campos coexistem: rastreia origem AND operações.

#### Migrations necessárias

**Arquivo:** `supabase/migrations/20260413_silos_reformulacao.sql`

```sql
-- Passo 1: Adicionar coluna temporária para tipo (VARCHAR)
ALTER TABLE silos
  ADD COLUMN IF NOT EXISTS tipo_novo VARCHAR(20);

-- Passo 2: Migrar valores antigos para novos tipos
UPDATE silos SET tipo_novo = 
  CASE 
    WHEN tipo = 'Bolsa' THEN 'Bag'
    WHEN tipo = 'Bunker' THEN 'Trincheira'
    WHEN tipo = 'Convencional' THEN 'Outros'
    ELSE tipo
  END;

-- Passo 3: Dropar coluna tipo antiga (enum) e renomear a nova
ALTER TABLE silos DROP COLUMN tipo;
ALTER TABLE silos RENAME COLUMN tipo_novo TO tipo;

-- Passo 4: Adicionar colunas novas
ALTER TABLE silos
  ADD COLUMN IF NOT EXISTS talhao_id UUID REFERENCES talhoes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS cultura_ensilada VARCHAR(100),
  ADD COLUMN IF NOT EXISTS data_fechamento DATE,
  ADD COLUMN IF NOT EXISTS data_abertura_prevista DATE,
  ADD COLUMN IF NOT EXISTS data_abertura_real DATE,
  ADD COLUMN IF NOT EXISTS volume_ensilado_ton_mv NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS comprimento_m NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS largura_m NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS altura_m NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT;

-- Passo 5: Remover colunas obsoletas
ALTER TABLE silos
  DROP COLUMN IF EXISTS capacidade,
  DROP COLUMN IF EXISTS localizacao,
  DROP COLUMN IF EXISTS consumo_medio_diario_ton;

-- Criar tabelas de qualidade
CREATE TABLE IF NOT EXISTS avaliacoes_bromatologicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  momento VARCHAR(20) NOT NULL, -- 'Fechamento' | 'Abertura' | 'Monitoramento'
  ms NUMERIC(5, 2),
  pb NUMERIC(5, 2),
  fdn NUMERIC(5, 2),
  fda NUMERIC(5, 2),
  ee NUMERIC(5, 2),
  mm NUMERIC(5, 2),
  amido NUMERIC(5, 2),
  ndt NUMERIC(5, 2),
  ph NUMERIC(3, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avaliacoes_psps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  momento VARCHAR(20) NOT NULL,
  peneira_19mm NUMERIC(5, 2) NOT NULL,
  peneira_8_19mm NUMERIC(5, 2) NOT NULL,
  peneira_4_8mm NUMERIC(5, 2) NOT NULL,
  peneira_fundo_4mm NUMERIC(5, 2) NOT NULL,
  tamanho_teorico_corte_mm NUMERIC(5, 2),
  kernel_processor BOOLEAN DEFAULT FALSE,
  avaliador VARCHAR(100),
  -- Campos calculados
  tmp_mm NUMERIC(5, 2) GENERATED ALWAYS AS (
    (peneira_19mm / 100 * 26.9) +
    (peneira_8_19mm / 100 * 13.5) +
    (peneira_4_8mm / 100 * 6.0) +
    (peneira_fundo_4mm / 100 * 1.18)
  ) STORED,
  status_peneira_19mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_19mm >= 3 AND peneira_19mm <= 8 THEN 'ok' ELSE 'fora' END
  ) STORED,
  status_peneira_8_19mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_8_19mm >= 45 AND peneira_8_19mm <= 65 THEN 'ok' ELSE 'fora' END
  ) STORED,
  status_peneira_4_8mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_4_8mm >= 20 AND peneira_4_8mm <= 30 THEN 'ok' ELSE 'fora' END
  ) STORED,
  status_peneira_fundo_4mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_fundo_4mm >= 0 AND peneira_fundo_4mm <= 10 THEN 'ok' ELSE 'fora' END
  ) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna subtipo em movimentacoes_silo
-- talhao_id já existe — mantido para rastreabilidade por operação (diferente de silos.talhao_id que é origem principal)
ALTER TABLE movimentacoes_silo
  ADD COLUMN IF NOT EXISTS subtipo VARCHAR(50);
-- Populate com valores padrão baseado no tipo existente
UPDATE movimentacoes_silo SET subtipo = 'Uso na alimentação' WHERE tipo = 'Saída' AND subtipo IS NULL;
UPDATE movimentacoes_silo SET subtipo = NULL WHERE tipo = 'Entrada' AND subtipo IS NULL;

-- RLS
CREATE POLICY "silos_select_by_fazenda" ON silos FOR SELECT USING (
  fazenda_id = auth.jwt() ->> 'fazenda_id'::text
);
CREATE POLICY "avaliacoes_bromatologicas_select_by_fazenda" ON avaliacoes_bromatologicas FOR SELECT
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id'
    )
  );
CREATE POLICY "avaliacoes_psps_select_by_fazenda" ON avaliacoes_psps FOR SELECT
  USING (
    silo_id IN (
      SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id'
    )
  );
```

---

### 4.2 Tipos TypeScript

**Arquivo:** `lib/supabase.ts` — Atualizar tipos existentes

```typescript
export type Silo = {
  id: string;
  nome: string;
  tipo: 'Superfície' | 'Trincheira' | 'Bag' | 'Outros';
  talhao_id: string; // NOVO: origem principal do silo
  cultura_ensilada: string; // NOVO: desnormalização — salva no cadastro (não muda mesmo se talhão mudar)
  fazenda_id: string;
  
  // Dados gerais
  data_fechamento: string | null;
  data_abertura_prevista: string | null;
  data_abertura_real: string | null;
  observacoes_gerais: string | null;
  
  // Dados quantitativos
  volume_ensilado_ton_mv: number | null;
  materia_seca_percent: number | null; // "MS original" no cadastro
  comprimento_m: number | null; // NOVO
  largura_m: number | null; // NOVO
  altura_m: number | null; // NOVO
  
  // Insumos
  insumo_lona_id: string | null;
  insumo_inoculante_id: string | null;
  
  // REMOVIDO: capacidade, localizacao, consumo_medio_diario_ton (será calculado em tempo real)
};

export type AvaliacaoBromatologica = {
  id: string;
  silo_id: string;
  data: string;
  momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
  ms: number | null;
  pb: number | null;
  fdn: number | null;
  fda: number | null;
  ee: number | null;
  mm: number | null;
  amido: number | null;
  ndt: number | null;
  ph: number | null;
  created_at: string;
  updated_at: string;
};

export type AvaliacaoPsps = {
  id: string;
  silo_id: string;
  data: string;
  momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
  peneira_19mm: number;
  peneira_8_19mm: number;
  peneira_4_8mm: number;
  peneira_fundo_4mm: number;
  tamanho_teorico_corte_mm: number | null;
  kernel_processor: boolean;
  avaliador: string | null;
  tmp_mm: number; // CALCULADO
  status_peneira_19mm: 'ok' | 'fora';
  status_peneira_8_19mm: 'ok' | 'fora';
  status_peneira_4_8mm: 'ok' | 'fora';
  status_peneira_fundo_4mm: 'ok' | 'fora';
  created_at: string;
  updated_at: string;
};

export type MovimentacaoSilo = {
  id: string;
  silo_id: string;
  tipo: 'Entrada' | 'Saída';
  subtipo: string | null; // NOVO: 'Uso na alimentação' | 'Descarte' | 'Transferência' | 'Venda' (obrigatório se tipo='Saída')
  quantidade: number;
  data: string;
  talhao_id: string | null;
  responsavel: string | null;
  observacao: string | null;
};
```

---

### 4.3 Queries & APIs

**Arquivo:** `lib/supabase/queries-audit.ts` — Adicionar funções

```typescript
// SILOS
const silos = {
  async list(): Promise<Silo[]> { /* ... */ },
  async create(payload: Omit<Silo, 'id'>): Promise<Silo> { /* ... */ },
  async update(id: string, payload: Partial<Silo>): Promise<Silo> { /* ... */ },
  async remove(id: string): Promise<void> { /* ... */ },
  
  // NOVO: buscar estoque atual
  async getEstoque(siloId: string): Promise<{ total: number; percentage: number }> {
    const movs = await movimentacoesSilo.listBySilo(siloId);
    const total = movs.reduce((acc, m) =>
      m.tipo === 'Entrada' ? acc + m.quantidade : acc - m.quantidade,
      0
    );
    const silo = await supabase.from('silos').select('volume_ensilado_ton_mv').eq('id', siloId).single();
    const percentage = (total / silo.data.volume_ensilado_ton_mv) * 100;
    return { total, percentage };
  },
  
  // NOVO: calcular densidade
  async getDensidade(siloId: string): Promise<number> {
    const silo = await supabase.from('silos').select('*').eq('id', siloId).single();
    const vol = silo.data.volume_ensilado_ton_mv;
    const volume_m3 = silo.data.comprimento_m * silo.data.largura_m * silo.data.altura_m;
    return (vol * 1000) / volume_m3;
  }
};

// MOVIMENTAÇÕES DE SILO
const movimentacoesSilo = {
  async listBySilo(siloId: string): Promise<MovimentacaoSilo[]> { /* ... */ },
  async listBySilos(siloIds: string[]): Promise<MovimentacaoSilo[]> { /* ... */ },
  async create(payload: Omit<MovimentacaoSilo, 'id'>): Promise<MovimentacaoSilo> { /* ... */ },
  async remove(id: string): Promise<void> { /* ... */ },
};

// AVALIAÇÕES BROMATOLÓGICAS (novo)
const avaliacoesBromatologicas = {
  async listBySilo(siloId: string): Promise<AvaliacaoBromatologica[]> {
    const fazendaId = await getFazendaId();
    // Verificar que silo pertence à fazenda
    const { count } = await supabase.from('silos')
      .select('id', { count: 'exact', head: true })
      .eq('id', siloId)
      .eq('fazenda_id', fazendaId);
    if (count === 0) throw new Error('Silo não encontrado');
    
    const { data, error } = await supabase
      .from('avaliacoes_bromatologicas')
      .select('*')
      .eq('silo_id', siloId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as AvaliacaoBromatologica[];
  },
  
  async create(payload: Omit<AvaliacaoBromatologica, 'id' | 'created_at' | 'updated_at'>): Promise<AvaliacaoBromatologica> {
    const fazendaId = await getFazendaId();
    // Verificar que silo pertence à fazenda
    const { count } = await supabase.from('silos')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.silo_id)
      .eq('fazenda_id', fazendaId);
    if (count === 0) throw new Error('Silo não encontrado');
    
    const { data, error } = await supabase
      .from('avaliacoes_bromatologicas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AvaliacaoBromatologica;
  },
};

// AVALIAÇÕES PSPS (novo)
const avaliacoesPsps = {
  async listBySilo(siloId: string): Promise<AvaliacaoPsps[]> { /* ... similar ... */ },
  
  async create(payload: Omit<AvaliacaoPsps, 'id' | 'tmp_mm' | 'status_*' | 'created_at' | 'updated_at'>): Promise<AvaliacaoPsps> {
    // Validação: soma de peneiras = 100% (±0.5%)
    const soma = payload.peneira_19mm + payload.peneira_8_19mm + payload.peneira_4_8mm + payload.peneira_fundo_4mm;
    if (Math.abs(soma - 100) > 0.5) {
      throw new Error('Soma das peneiras deve ser 100% (tolerância ±0.5%)');
    }
    
    const fazendaId = await getFazendaId();
    const { count } = await supabase.from('silos')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.silo_id)
      .eq('fazenda_id', fazendaId);
    if (count === 0) throw new Error('Silo não encontrado');
    
    const { data, error } = await supabase
      .from('avaliacoes_psps')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AvaliacaoPsps;
  },
};

// Exportar
export const q = {
  silos,
  movimentacoesSilo,
  avaliacoesBromatologicas,
  avaliacoesPsps,
  talhoes,
  insumos,
  // ... outros
};
```

---

### 4.4 Arquivo de Validações

**Arquivo:** `lib/validations/silos.ts` (novo)

```typescript
import { z } from 'zod';

export const TIPOS_SILO = ['Superfície', 'Trincheira', 'Bag', 'Outros'] as const;
export const MOMENTOS_AVALIACAO = ['Fechamento', 'Abertura', 'Monitoramento'] as const;
export const SUBTIPOS_MOVIMENTACAO = [
  'Uso na alimentação',
  'Descarte',
  'Transferência',
  'Venda'
] as const;

export const siloSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  tipo: z.enum(TIPOS_SILO),
  talhao_id: z.string().uuid('Talhão inválido'),
  cultura_ensilada: z.string().min(1, 'Cultura deve estar preenchida'), // Preenchida automaticamente ao selecionar talhão
  data_fechamento: z.string().date(),
  data_abertura_prevista: z.string().date().optional(),
  observacoes_gerais: z.string().optional(),
  volume_ensilado_ton_mv: z.number().positive('Volume deve ser positivo'),
  materia_seca_percent: z.number().min(0).max(100),
  comprimento_m: z.number().positive('Comprimento deve ser positivo'),
  largura_m: z.number().positive('Largura deve ser positivo'),
  altura_m: z.number().positive('Altura deve ser positivo'),
  insumo_lona_id: z.string().uuid('Lona inválida'),
  insumo_inoculante_id: z.string().uuid('Inoculante inválido').optional(),
});

export const movimentacaoSiloSchema = z.object({
  silo_id: z.string().uuid(),
  tipo: z.enum(['Entrada', 'Saída']),
  subtipo: z.enum(SUBTIPOS_MOVIMENTACAO).nullable(),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  responsavel: z.string().min(1, 'Informe o responsável').optional(),
  observacao: z.string().optional(),
  data: z.string().datetime().optional(),
});

export const avaliacaoBromatologicaSchema = z.object({
  silo_id: z.string().uuid(),
  data: z.string().date(),
  momento: z.enum(MOMENTOS_AVALIACAO),
  ms: z.number().min(0).max(100).optional(),
  pb: z.number().min(0).max(100).optional(),
  fdn: z.number().min(0).max(100).optional(),
  fda: z.number().min(0).max(100).optional(),
  ee: z.number().min(0).max(100).optional(),
  mm: z.number().min(0).max(100).optional(),
  amido: z.number().min(0).max(100).optional(),
  ndt: z.number().min(0).max(100).optional(),
  ph: z.number().min(0).max(14).optional(),
});

export const avaliacaoPspsSchema = z.object({
  silo_id: z.string().uuid(),
  data: z.string().date(),
  momento: z.enum(MOMENTOS_AVALIACAO),
  peneira_19mm: z.number().min(0).max(100),
  peneira_8_19mm: z.number().min(0).max(100),
  peneira_4_8mm: z.number().min(0).max(100),
  peneira_fundo_4mm: z.number().min(0).max(100),
  tamanho_teorico_corte_mm: z.number().positive().optional(),
  kernel_processor: z.boolean().optional(),
  avaliador: z.string().optional(),
}).refine(
  (data) => {
    const soma = data.peneira_19mm + data.peneira_8_19mm + data.peneira_4_8mm + data.peneira_fundo_4mm;
    return Math.abs(soma - 100) <= 0.5;
  },
  {
    message: 'Soma das peneiras deve ser 100% (tolerância ±0.5%)',
    path: ['peneira_19mm'],
  }
);

export type SiloFormData = z.infer<typeof siloSchema>;
export type MovimentacaoSiloFormData = z.infer<typeof movimentacaoSiloSchema>;
export type AvaliacaoBromatologicaFormData = z.infer<typeof avaliacaoBromatologicaSchema>;
export type AvaliacaoPspsFormData = z.infer<typeof avaliacaoPspsSchema>;
```

---

## 5. ESTRUTURA DE ARQUIVOS NOVA (recomendado)

```
app/dashboard/silos/
├── page.tsx                      — Tela principal (listagem)
├── [id]/
│   └── page.tsx                  — Tela detalhada (abas)
├── components/
│   ├── SiloCard.tsx              — Card individual
│   ├── SiloForm.tsx              — Dialog "Novo Silo"
│   ├── SiloDetailHeader.tsx       — Header com status badge
│   ├── tabs/
│   │   ├── VisaoGeralTab.tsx      — Aba 1
│   │   ├── EstoqueTab.tsx         — Aba 2
│   │   └── QualidadeTab.tsx       — Aba 3
│   ├── dialogs/
│   │   ├── MovimentacaoDialog.tsx
│   │   ├── AvaliacaoBromatologicaDialog.tsx
│   │   └── AvaliacaoPspsDialog.tsx

lib/
├── validations/
│   └── silos.ts                  — Schemas Zod
├── supabase.ts                   — Tipos (update)
└── supabase/
    ├── queries-audit.ts          — Queries (update)
    ├── silos.ts                  — Funções helper (update)

supabase/migrations/
└── 20260413_silos_reformulacao.sql
```

---

## 6. COMPORTAMENTOS & CÁLCULOS AUTOMÁTICOS

### 6.1 No Formulário "Novo Silo"

1. **Ao selecionar Talhão:**
   - Buscar `cultura` do ciclo ativo ou mais recente do talhão
   - Preencher campo `cultura_ensilada` (read-only no formulário)
   - Campo será persistido como desnormalização — mesmo que o talhão mude de cultura futuramente, o silo mantém a cultura original
   - Se nenhum ciclo encontrado, exibir aviso: "Nenhuma cultura encontrada neste talhão"
   - Validar que talhão pertence à mesma fazenda

2. **Ao sair do campo "Data de fechamento":**
   - Calcular `data_abertura_prevista = data_fechamento + 60 dias`
   - Pré-preencher o campo

3. **Ao sair do campo "Altura (m)" (último campo de dimensões):**
   - Calcular densidade: `(volume × 1000) / (C × L × A)`
   - Exibir com indicador visual:
     - ≥650: 🟢 "Ótima densidade"
     - 550–649: 🟡 "Densidade aceitável"
     - <550: 🔴 "Densidade baixa — revisar compactação"

### 6.2 No Card Resumo (Listagem)

- **Estoque atual:** Calculado em tempo real (Σ Entradas − Σ Saídas)
- **Porcentagem:** `(estoque_atual / volume_ensilado) × 100`
- **MS atual:** Último registro em `avaliacoes_bromatologicas.ms` (se existir)
- **Consumo diário:** Σ Saídas com `subtipo='Uso na alimentação'` / dias desde `data_abertura_real`
- **Estoque para X dias:** `estoque_atual / consumo_diário` (arredondado para inteiro)
- **Status badge:** Lógica descrita em 3.4

### 6.3 Na Tela Detalhada — Aba 2 (Estoque)

- **Consumo médio diário:** Calculado em tempo real (não persistido no BD)
  - Fórmula: `Σ Saídas com subtipo='Uso na alimentação'` / `dias desde data_abertura_real`
  - Recalculado toda vez que carrega a aba
  - Justificativa: <50 silos por fazenda = performance negligenciável
- **Estoque atual:** Também calculado em tempo real a partir de movimentações
- Ao registrar nova movimentação, atualizar tela sem refresh (otimista ou refetch)

### 6.4 Na Tela Detalhada — Aba 3 (Qualidade)

**PSPS:**
- Ao preencher os 4 campos de peneiras, validar soma = 100% (±0.5%)
- Se fora da faixa, exibir erro em vermelho e desabilitar botão "Salvar"
- Após salvar, calcular automaticamente `tmp_mm` (fórmula descrita em 2)
- Exibir barras de progresso com cores: ✅ ok | ⚠️ fora da faixa

---

## 7. DEPENDÊNCIAS EXTERNAS & INTEGRAÇÕES

### Módulo de Talhões
- **Leitura:** `talhao_id` → buscar `cultura` e `nome` do talhão
- **Leitura:** `getCustoTalhaoPeriodo()` → custo total do silo
- **RLS:** Validar que talhão pertence à mesma fazenda

### Módulo de Insumos
- **Leitura:** Dropdown com lonas (tipo='Outros' ou filtragem por categoria/tag)
- **Leitura:** Dropdown com inoculantes
- **RLS:** Validar que insumos pertencem à mesma fazenda

### Módulo Financeiro
- **Leitura:** Via `getCustoProducaoSilagem(siloId)` que retorna:
  - `custoTotal` — custo total agregado (financeiro + atividades)
  - `totalToneladas` — total ensilado no silo
  - `custoPorTonelada` — custoTotal / totalToneladas
- **Integridade:** Função busca `financeiro.referencia_tipo='Talhão'` + atividades do ciclo
- **Display:** Aba "Visão Geral" exibe ambos: custo/ton e custo total

### Autenticação & RLS
- **Todas as queries** obrigam `fazenda_id` via `getFazendaId()`
- **RLS policies** implementadas em silos, movimentacoes_silo, avaliacoes_bromatologicas, avaliacoes_psps

---

## 8. CASOS DE TESTE (smoke)

- [ ] Criar novo silo com todas as seções preenchidas
- [ ] Verificar que "Cultura ensilada" é preenchida automaticamente ao selecionar talhão
- [ ] Verificar que "Data abertura prevista" é calculada automaticamente
- [ ] Verificar que "Densidade" é calculada corretamente
- [ ] Listar silos e verificar cards exibem status correto
- [ ] Clicar em card e abrir tela detalhada
- [ ] Verificar aba "Visão Geral" exibe todos os dados
- [ ] Registrar movimentação e verificar que "Estoque atual" recalcula
- [ ] Registrar avaliação bromatológica e verificar que "MS atual" atualiza no card
- [ ] Registrar avaliação PSPS e verificar validação de peneiras (deve bloquear se soma ≠ 100%)
- [ ] Verificar que barras visuais de PSPS mostram status correto (ok/fora)
- [ ] Editar dados do silo e verificar que mudanças são persistidas
- [ ] Deletar silo e verificar que movimentações também são deletadas (cascade)

---

## 9. PRÓXIMOS PASSOS

Este PRD descreve:
1. ✅ Análise do código atual
2. ✅ Funcionalidades completas (campos, validações, cálculos)
3. ✅ Interface detalhada (wireframes em markdown)
4. ✅ Mudanças no BD e tipos
5. ✅ Integrações com outros módulos

**Ação solicitada:**
- [ ] Revisar este PRD
- [ ] Validar requisitos e escopo
- [ ] Aprovar ou solicitar ajustes
- Após aprovação: proceder para **Specification (Spec.md)** com detalhes técnicos e implementação step-by-step
