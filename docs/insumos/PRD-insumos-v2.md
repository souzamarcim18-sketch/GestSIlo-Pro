# PRD — Módulo de Estoque de Insumos (GestSilo Pro) — v2.0

**Product Requirements Document**  
Data: 2026-04-16  
Status: Em Revisão  
Versão: 2.0 (Refatoração Completa)

---

## 1. Visão Geral

### 1.1 Objetivo
Refatorar e expandir o módulo de **Estoque de Insumos** do GestSilo Pro para suportar gestão completa e rastreável de insumos agrícolas, com categorização hierárquica, custo médio ponderado, integração com outros módulos e rastreabilidade total de movimentações.

### 1.2 Escopo
Este PRD cobre:
- ✅ Refatoração da tela principal com novo layout (alertas + listas curtas + tabela de produtos)
- ✅ Fluxo de cadastro de novo insumo (com lista suspensa inteligente + produto novo livre)
- ✅ Fluxo de saída/movimentação (renomeação, tipos expandidos, campos obrigatórios)
- ✅ Categorização hierárquica (Categoria > Tipo)
- ✅ Custo Médio Ponderado (CMP) com histórico
- ✅ Ajuste de inventário manual
- ✅ Integrações com Talhões, Frota, Silos e Financeiro
- ✅ Rastreabilidade completa (auditoria de usuário, timestamp, origem)
- ✅ Modelo de dados expandido e otimizado

### 1.3 Fora de Escopo (desta refatoração)
- ❌ Relatórios avançados (PDF/Excel — será Fase 2)
- ❌ Notificações automáticas por email/SMS (será Fase 2)
- ❌ Previsão de consumo via IA/ML (será Fase 3+)
- ❌ Rastreamento de lotes com data de validade (será Fase 2)
- ❌ Integração com APIs de fornecedores (será Fase 3+)

---

## 2. Contexto Atual

### 2.1 Diagnóstico do Estado Existente
O módulo está **funcional mas com arquitetura frágil**, segundo diagnóstico em `docs/PRD-insumos.md`:

| Aspecto | Status |
|---|---|
| Cadastro básico | ✅ Funciona |
| Movimentações | ✅ Registra (entrada/saída) |
| RLS e isolamento | ✅ Implementado |
| Categorias | ❌ Enum simples (sem hierarquia) |
| Custo médio | ❌ Não existe |
| Integrações | ⚠️ Textos livres, sem FK |
| Rastreabilidade | ⚠️ Parcial (sem auditoria de usuário) |
| Testes | ⚠️ Incompletos |
| Componentes | ❌ Monolíticos (tudo em page.tsx) |

### 2.2 Arquitetura Atual
```
app/dashboard/insumos/
└── page.tsx                          (27.6 KB, monolítico)
    ├─ Estados: insumos, movimentacoes, loading, dialogs
    ├─ Handlers: handleSaveInsumo, handleSaveMovimentacao, handleConfirmDelete
    └─ UI: Cards, Tabelas, Dialogs (inline)

lib/supabase/
├── queries-audit.ts                  (auditadas ✅)
├── insumos.ts                        (sem auditoria ❌)
└── supabase.ts                       (tipos)
```

---

## 3. Bugs Críticos a Corrigir

### 3.1 Bug #1: `fazenda_id` Vazio ao Criar Insumo
**Arquivo:** `app/dashboard/insumos/page.tsx:144`  
**Severidade:** 🔴 CRÍTICO

**Problema:**
```typescript
// ❌ ERRADO: passando fazenda_id vazio
await q.insumos.create({ ...data, fazenda_id: '' });
```

**Resultado:**
- Novo insumo criado com `fazenda_id = ''` em vez de UUID
- RLS policy falha em SELECT posterior
- Usuário não consegue ver insumo criado

**Solução:**
```typescript
// ✅ CORRETO: queries-audit.ts já injeta automaticamente
await q.insumos.create(data);
```

---

### 3.2 Bug #2: Queries Não Auditadas em `insumos.ts`
**Arquivo:** `lib/supabase/insumos.ts`  
**Severidade:** 🔴 CRÍTICO

**Problema:**
- `deleteInsumo()`, `getMovimentacoesByInsumo()` não validam `fazenda_id`
- Apenas RLS DB-side protege (falha em desenvolvimento sem RLS ativo)
- Violação de padrão definido em `queries-audit.ts`

**Solução:**
- Mover todas as funções para `queries-audit.ts` E injetas auditoria de `fazenda_id`
- OU deletar `insumos.ts` se todas as queries já existem em `queries-audit.ts`

---

## 4. Requisitos Funcionais

### 4.1 Tela Principal — Estoque de Insumos

#### 4.1.1 Alteração de Layout
**Remover:** Cards de resumo atuais (ocupam espaço horizontal)

**Adicionar:** Novo layout estruturado:
```
┌─────────────────────────────────────────────┐
│ 📢 ALERTAS DE ESTOQUE CRÍTICO               │
│ ├─ Insumo A: 5 un (mín 10) — 2 dias atrás  │
│ ├─ Insumo B: 200 L (mín 500) — 5 dias      │
│ └─ Total: 3 produtos críticos               │
│                                              │
│ 📥 ÚLTIMAS ENTRADAS (máx 4)                │
│ ├─ Adubo NPK — 1.000 kg — 2026-04-15      │
│ └─ Diesel — 500 L — 2026-04-14            │
│                                              │
│ 📤 ÚLTIMAS SAÍDAS (máx 4)                  │
│ ├─ Talhão 03 — 150 kg Ureia — 2026-04-14 │
│ └─ Máquina X — 80 L Diesel — 2026-04-13  │
│                                              │
│ 🗂️ LISTA DE PRODUTOS EM ESTOQUE            │
│ [Filtrar por Categoria] [Filtrar por Tipo]  │
│ [Buscar por Nome]        [Ordenar por...]   │
│                                              │
│ Tabela:                                      │
│ Produto | Categoria | Tipo | Qtde | Mín | Status │
│ ─────────────────────────────────────────────   │
│ Ureia   | Fertil.   | Nit. │ 500  │ 100│ ✅    │
│ Diesel  | Combust.  | Dsl. │ 200  │ 300│ ⚠️    │
│ ...     │ ...       │ ...  │ ...  │ ...│ ...   │
└─────────────────────────────────────────────┘
```

#### 4.1.2 Seção de Alertas
**Requisitos:**
- Exibir insumos com `estoque_atual < estoque_minimo`
- Mostrar: nome, quantidade atual, mínimo, dias desde última movimentação
- Cor: vermelho/laranja para destaque
- Contagem total de produtos críticos
- Click em alerta → scroll para produto na tabela (ou abre dialog de saída rápida)

#### 4.1.3 Listas Curtas (Últimas Entradas/Saídas)
**Requisitos:**
- Máximo 4 itens cada (scrollável se houver mais)
- **Últimas Entradas**: Produto, Qtde, Data, Fornecedor (se disponível)
- **Últimas Saídas**: Produto, Qtde, Data, Destino/Responsável
- Animação de entrada (fade-in ao carregar página)

#### 4.1.4 Tabela de Produtos em Estoque
**Colunas obrigatórias:**
| Coluna | Tipo | Ordenável | Filtrável | Notas |
|---|---|---|---|---|
| Produto | String | ✅ A-Z | ✅ Busca livre | Campo "nome" |
| Categoria | Select | ✅ Sim | ✅ Dropdown | Novo enum hierarchical |
| Tipo | Select | ✅ Sim | ✅ Dropdown | Subtipo de categoria |
| Quantidade | Number | ✅ Asc/Desc | ❌ Não | Estoque atual |
| Mínimo | Number | ✅ Asc/Desc | ❌ Não | Threshold de alerta |
| Status | Badge | ❌ Não | ❌ Não | Verde (OK) / Vermelho (Crítico) |
| Ações | Buttons | ❌ Não | ❌ Não | Editar, Saída, Deletar |

**Filtros dinâmicos:**
- Categoria: dropdown (valores únicos do banco)
- Tipo: dropdown (sub-valores, depende de categoria)
- Busca: input text (busca em nome, fornecedor, local de armazenamento)
- Aplicação: multi-filtro (AND entre eles)

**Paginação:** Opcional para MVP, mas recomendado se > 100 produtos
- Padrão: 20 produtos por página
- Suportado em `queries-audit.ts` com `.range(offset, limit)`

---

### 4.2 Card "Cadastrar Novo Insumo" (Entrada)

#### 4.2.1 Campos do Formulário

| Campo | Tipo | Validação | Preenchimento | Notas |
|---|---|---|---|---|
| **Nome do Insumo** | Autocomplete + Free | Min 2 | Combo: lista + novo | Busca produtos já cadastrados |
| **Categoria** | Select Hierárquico | Obrigatório | Dropdown | Valores do enum/tabela |
| **Tipo** | Select Dependente | Obrigatório | Dropdown | Depende de categoria |
| **Unidade** | Select ou Text | Obrigatório | Auto-preenche | Se existe; editável se novo |
| **Qtde de Entrada** | Number | > 0 | Manual | Obrigatório |
| **Valor Unitário (R$)** | Currency | ≥ 0 | Manual | **Obrigatório** — crítico para CMP |
| **Fornecedor** | Text | Min 1 | Manual | **Novo campo obrigatório** |
| **Local de Armazenamento** | Select ou Text | Min 1 | Manual | Ex: "Galpão 1", "Hangar A" |
| **Estoque Mínimo** | Number | ≥ 0 | Editável | Pode mudar a cada entrada |
| **Estoque Atual (Leitura)** | Number (disabled) | ✅ | Auto-calc | Se novo: 0; se existe: atual |
| **Observações** | Textarea | Opcional | Manual | Notas de qualidade, lote, etc. |

#### 4.2.2 Fluxo de Autocomplete de Nome
1. Usuário digita "U" → mostra lista de produtos que começam com U (Ureia, Uréia, etc.)
2. Usuário seleciona "Ureia" existente → auto-preenche:
   - Categoria: Fertilizantes
   - Tipo: Nitrogenado
   - Unidade: kg
   - Estoque Mínimo: (mantém valor anterior ou sugerido)
   - Estoque Atual: bloqueado (mostra 500 kg, por exemplo)
3. Usuário digita produto novo "Óleo de Neem" → permite:
   - Categoria, Tipo, Unidade: manuais
   - Estoque Atual: bloqueado em 0
   - Ao salvar: cria novo insumo + registra primeira entrada

#### 4.2.3 Comportamento ao Salvar
```
1. Validar todos os campos obrigatórios
2. Se produto novo (não existe no banco):
   a. Criar registro em `insumos` com estoque_atual = 0
   b. Criar registro em `movimentacoes_insumo` com tipo = 'Entrada'
3. Se produto existe:
   a. Criar apenas `movimentacoes_insumo`
   b. Recalcular `custo_medio` (ver 6.1 Custo Médio Ponderado)
   c. Atualizar `estoque_atual` = anterior + qtde entrada
4. Opcionalmente: criar despesa automática em Financeiro?
   a. Categoria: "Insumos"
   b. Descrição: "{Insumo} - Entrada de {Qtde} {Unidade}"
   c. Valor: Qtde × Valor Unitário
   ⚠️ Flag de config: criar automaticamente ou apenas registrar?
5. Toast: "Insumo {nome} criado e movimentação registrada"
6. Limpar form e recarregar lista
```

---

### 4.3 Card "Registrar Saídas" (renomear de "Registrar Movimentação")

#### 4.3.1 Alteração de Nome
- Botão atual: "Registrar Movimentação" → "Saídas"
- Rationale: Entradas agora via "Novo Insumo", saídas via "Saídas"
- Mais claro semanticamente

#### 4.3.2 Campos do Formulário

| Campo | Tipo | Validação | Preenchimento | Notas |
|---|---|---|---|---|
| **Insumo** | Autocomplete | Obrigatório | Dropdown filtrado | Apenas insumos com estoque > 0 |
| **Tipo de Saída** | Select | Obrigatório | Radio/Dropdown | Ver enum abaixo |
| **Quantidade** | Number | > 0, ≤ atual | Manual | Validar contra estoque |
| **Valor Unitário (R$)** | Currency | ≥ 0 | Auto-preenche | Preenchido com custo médio; editável |
| **Destino/Fornecedor** | Select ou Text | Condicional | Dinâmico | Depende do tipo de saída |
| **Responsável** | Select | Obrigatório | Auto (usuário) | Quem realizou a saída |
| **Data** | Date Picker | Passada/hoje | Hoje (default) | Permitir retrodatar? |
| **Observações** | Textarea | Opcional | Manual | Notas adicionais |

#### 4.3.3 Enum: Tipos de Saída
```typescript
enum TipoSaida {
  USO_INTERNO = 'Uso Interno',          // Talhão, Máquina, Silo
  TRANSFERENCIA = 'Transferência',       // Para outra fazenda/fazenda-filha
  VENDA = 'Venda',                       // Venda a terceiros
  DEVOLUCAO = 'Devolução',              // Retorno ao fornecedor
  AJUSTE = 'Ajuste',                     // Inventário (sem FiscalValue)
  DESCARTE = 'Descarte',                 // Produto vencido/danificado
  TROCA = 'Troca',                       // Troca por outro produto (com FK)
}
```

#### 4.3.4 Comportamento Dinâmico do "Destino/Fornecedor"

| Tipo de Saída | Campo Destino | Tipo | Validação |
|---|---|---|---|
| **Uso Interno** | Tipo de destino (Talhão/Máquina/Silo) + ID | FK | Validar contra `talhoes.id` / `maquinas.id` / `silos.id` |
| **Transferência** | Fazenda destino | Text | Nome/ID de outra fazenda (ou select se integrado) |
| **Venda** | Cliente/Nome | Text | Livre |
| **Devolução** | Fornecedor | Select | Referenciar fornecedor da entrada (novo campo?) |
| **Ajuste** | Motivo | Text | Justificativa (quebra, roubo, etc.) |
| **Descarte** | Motivo | Text | Vencimento, dano, etc. |
| **Troca** | Insumo/Fornecedor | FK | Insumo novo (referência) |

#### 4.3.5 Fluxo de Validação de Saída
```
1. Verificar estoque_atual >= quantidade_saida
   ✅ Se >= permitir
   ❌ Se < mostrar erro: "Estoque insuficiente. Disponível: {qtde}"
   
2. Se tipo = USO_INTERNO:
   a. Validar FK talhao_id / maquina_id / silo_id
   b. Registrar integração (ex: talhao.custo_producao += valor)
   
3. Recalcular custo_medio (saída por FIFO ou CMP?)
   
4. Atualizar estoque_atual = anterior - quantidade
   
5. Criar registro em movimentacoes_insumo
   
6. Registrar auditoria (usuario_id, timestamp, origem_manual/integracao)
   
7. Toast: "Saída registrada. {Insumo} reduzido em {Qtde}"
```

---

### 4.4 Ajuste de Inventário (Funcionalidade Nova)

#### 4.4.1 Propósito
Permitir correção manual de divergências de estoque (quebra, roubo, desvio de balança, etc.).

#### 4.4.2 Dialog/Formulário
```
┌─────────────────────────────────┐
│ 🔧 Ajuste de Inventário         │
├─────────────────────────────────┤
│ Insumo:           [Dropdown]     │
│ Estoque Atual:    500 kg ⓘ       │
│ Estoque Real:     [Input]        │
│ Diferença:        -50 kg (Calc.) │
│ Motivo:           [Textarea]     │
│                                  │
│ [ Ajustar ]  [ Cancelar ]        │
└─────────────────────────────────┘
```

#### 4.4.3 Campos
| Campo | Tipo | Validação | Notas |
|---|---|---|---|
| Insumo | Select | Obrigatório | Todos os insumos cadastrados |
| Estoque Atual | Number (read) | N/A | Mostra valor no sistema |
| Estoque Real | Number | Obrigatório | Valor após inventário físico |
| Diferença | Number (auto) | N/A | Estoque Real - Estoque Atual |
| Motivo | Textarea | Obrigatório | Ex: "Quebra de embalagem", "Roubo suspeito" |

#### 4.4.4 Fluxo ao Salvar
```
1. Validar que "Estoque Real" é preenchido
2. Calcular diferença = real - atual
3. Se diferença > 0 (ganho):
   a. Criar movimentacao tipo "Ajuste" (Entrada)
   b. Registrar motivo em observacoes
4. Se diferença < 0 (perda):
   a. Criar movimentacao tipo "Ajuste" (Saída)
   b. Registrar motivo em observacoes
5. Se diferença = 0: mensagem "Nenhuma divergência"
6. Atualizar estoque_atual
7. Toast: "Inventário ajustado. Diferença: {diferença}"
```

---

## 5. Modelo de Dados

### 5.1 Alterações na Tabela `insumos`

#### 5.1.1 Estrutura Expandida
```sql
CREATE TABLE insumos (
  -- Existentes
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id      UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome            VARCHAR(255) NOT NULL,
  unidade         VARCHAR(50) NOT NULL,           -- kg, L, Saco, Un, etc.
  estoque_minimo  NUMERIC(10,2) NOT NULL,
  estoque_atual   NUMERIC(10,2) NOT NULL DEFAULT 0,
  teor_n_percent  NUMERIC(5,2) DEFAULT 0,
  teor_p_percent  NUMERIC(5,2) DEFAULT 0,
  teor_k_percent  NUMERIC(5,2) DEFAULT 0,
  
  -- Novos campos
  categoria_id    UUID REFERENCES categorias_insumo(id),  -- FK para categoria
  tipo_id         UUID REFERENCES tipos_insumo(id),       -- FK para tipo (sub-categoria)
  custo_medio     NUMERIC(12,4) DEFAULT 0,               -- Custo médio ponderado
  fornecedor      VARCHAR(255),                           -- Fornecedor principal
  local_armazen   VARCHAR(255),                           -- Galpão 1, Hangar A, etc.
  observacoes     TEXT,                                   -- Notas gerais
  ativo           BOOLEAN DEFAULT TRUE,                   -- Soft-delete
  
  -- Auditoria
  criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  criado_por      UUID REFERENCES auth.users(id),
  atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_por  UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(fazenda_id, nome),  -- Um nome por fazenda
  CHECK(estoque_atual >= 0),
  CHECK(estoque_minimo >= 0),
  CHECK(custo_medio >= 0)
);

-- Índices
CREATE INDEX idx_insumos_fazenda_id ON insumos(fazenda_id);
CREATE INDEX idx_insumos_categoria_id ON insumos(categoria_id);
CREATE INDEX idx_insumos_tipo_id ON insumos(tipo_id);
CREATE INDEX idx_insumos_ativo ON insumos(ativo);
```

#### 5.1.2 Novas Tabelas: Categorias e Tipos

**Opção A: Tabelas Separadas (Recomendado)**
```sql
-- Tabela de categorias (flat)
CREATE TABLE categorias_insumo (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      VARCHAR(100) NOT NULL UNIQUE,  -- "Fertilizantes", "Defensivos", etc.
  descricao TEXT,
  ativo     BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT check_nome NOT NULL CHECK(nome != '')
);

-- Tabela de tipos (sub-categorias)
CREATE TABLE tipos_insumo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id    UUID NOT NULL REFERENCES categorias_insumo(id) ON DELETE RESTRICT,
  nome            VARCHAR(100) NOT NULL,  -- "Nitrogenado", "Inseticida", etc.
  descricao       TEXT,
  ativo           BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_categoria_tipo UNIQUE(categoria_id, nome),
  CONSTRAINT check_nome_tipo NOT NULL CHECK(nome != '')
);

-- Índices
CREATE INDEX idx_tipos_categoria_id ON tipos_insumo(categoria_id);
```

**Opção B: JSON no Enum (Mais Simples, Menos Flexível)**
```typescript
// Em TypeScript (ENUM estruturado)
const CATEGORIAS_INSUMOS = {
  FERTILIZANTES: {
    tipos: ['Fertilizante', 'Fertilizante Foliar', 'Calcário', 'Gesso', 'Outros']
  },
  DEFENSIVOS: {
    tipos: ['Herbicida', 'Inseticida', 'Fungicida', 'Adjuvantes', 'Espalhantes']
  },
  // ...
};

// Armazenado como JSON na tabela ou como ENUM simples
```

**Decisão Final:** ✅ **Usar Opção A (Tabelas Separadas)**

**Por quê:**
- ✅ Flexibilidade: admin pode adicionar novas categorias/tipos sem código
- ✅ Integridade: FKs garantem relacionamento válido
- ✅ Query: Fácil filtrar por categoria no frontend
- ✅ Performance: Índices otimizam SELECT by categoria/tipo

**Trade-offs:**
- ⚠️ Mais complexo que ENUM
- ⚠️ Requer seed data inicial
- ✅ Mas vale a pena para escala

#### 5.1.3 Dados Iniciais (Seed)

```sql
-- Categorias
INSERT INTO categorias_insumo (nome) VALUES
  ('Fertilizantes/Corretivos'),
  ('Defensivos'),
  ('Sementes'),
  ('Combustíveis'),
  ('Nutrição Animal'),
  ('Inoculantes'),
  ('Lonas'),
  ('Peças e Manutenções'),
  ('Outros');

-- Tipos para Fertilizantes
INSERT INTO tipos_insumo (categoria_id, nome) 
SELECT id, 'Fertilizante' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL
SELECT id, 'Fertilizante Foliar' FROM ...
-- ... (ver tabela em seção 4.2)
```

---

### 5.2 Alterações na Tabela `movimentacoes_insumo`

#### 5.2.1 Estrutura Expandida
```sql
CREATE TABLE movimentacoes_insumo (
  -- Existentes
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id     UUID NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  tipo          VARCHAR(50) NOT NULL,  -- 'Entrada', 'Saída', 'Ajuste'
  quantidade    NUMERIC(10,2) NOT NULL,
  data          DATE NOT NULL,
  valor_unitario NUMERIC(12,4),
  responsavel   VARCHAR(255),
  
  -- Novos campos
  tipo_saida    VARCHAR(50),  -- 'USO_INTERNO', 'VENDA', 'DEVOLUÇÃO', etc.
  destino_tipo  VARCHAR(50),  -- 'talhao', 'maquina', 'silo' (se tipo_saida = USO_INTERNO)
  destino_id    UUID,         -- ID de talhao/maquina/silo (FK dinâmica?)
  observacoes   TEXT,         -- Notas, justificativa de ajuste
  origem        VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'talhao', 'frota', 'silo'
  
  -- Auditoria
  criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  criado_por    UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT check_quantidade CHECK(quantidade > 0),
  CONSTRAINT check_tipo CHECK(tipo IN ('Entrada', 'Saída', 'Ajuste')),
  CONSTRAINT check_origem CHECK(origem IN ('manual', 'talhao', 'frota', 'silo', 'financeiro'))
);

-- Índices
CREATE INDEX idx_movimentacoes_insumo_id ON movimentacoes_insumo(insumo_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_insumo(data DESC);
CREATE INDEX idx_movimentacoes_origem ON movimentacoes_insumo(origem);
CREATE INDEX idx_movimentacoes_criado_por ON movimentacoes_insumo(criado_por);
```

#### 5.2.2 Questão Design: FKs Dinâmicas para Destino
**Problema:** Um destino pode ser talhão, máquina ou silo (3 tabelas diferentes).

**Opção A: Duas Colunas (destino_tipo + destino_id)**
```sql
-- destino_tipo: 'talhao' | 'maquina' | 'silo'
-- destino_id: UUID de uma das 3 tabelas
-- Pro: Simples, permite query flexível
-- Con: Sem FK real (validação no TS/ORM)
```

**Opção B: Tabela de Destinos (Polimórfica)**
```sql
CREATE TABLE destinos_insumo (
  id UUID PRIMARY KEY,
  tipo VARCHAR(50),  -- 'talhao', 'maquina', 'silo'
  talhao_id UUID REFERENCES talhoes(id),
  maquina_id UUID REFERENCES maquinas(id),
  silo_id UUID REFERENCES silos(id),
  CONSTRAINT only_one_destination CHECK(
    (talhao_id IS NOT NULL)::int + 
    (maquina_id IS NOT NULL)::int + 
    (silo_id IS NOT NULL)::int = 1
  )
);

-- movimentacoes_insumo teria:
destino_insumo_id UUID REFERENCES destinos_insumo(id)
```

**Opção C: Sem FK (Apenas Validação em TS)**
```
- Colunas: destino_tipo, destino_id
- Validação 100% em TypeScript/queries-audit
- Pro: Mais flexível, sem overhead DB
- Con: Sem garantia referencial
```

**Decisão:** ✅ **Usar Opção A (Duas Colunas)**

**Por quê:** Simpleza + validação em TypeScript (mais flexível). FK em DB adicionaria complexidade com CONSTRAINT CHECK.

---

### 5.3 Resumo de Tabelas Novas/Alteradas

| Tabela | Status | Mudanças Principais |
|---|---|---|
| `insumos` | Alterada ✏️ | +categoria_id, +tipo_id, +custo_medio, +fornecedor, +local_armazen, +auditoria |
| `movimentacoes_insumo` | Alterada ✏️ | +tipo_saida, +destino_tipo, +destino_id, +origem, +auditoria |
| `categorias_insumo` | ✨ Nova | Enum de categorias (Fertilizantes, Defensivos, etc.) |
| `tipos_insumo` | ✨ Nova | Sub-tipos por categoria |

---

## 6. Regras de Negócio

### 6.1 Custo Médio Ponderado (CMP)

#### 6.1.1 Cálculo
**Fórmula:**
```
CMP = [(Estoque Atual × CMP Anterior) + (Qtde Entrada × Valor Unitário)] / 
      (Estoque Atual + Qtde Entrada)
```

**Exemplo:**
```
Estado Inicial:
  - Estoque Atual: 100 kg
  - CMP: R$ 10/kg
  - Saldo: 100 × 10 = R$ 1.000

Entrada:
  - Qtde: 50 kg
  - Valor: R$ 12/kg
  - Total entrada: 50 × 12 = R$ 600

Novo CMP:
  CMP = (100 × 10 + 50 × 12) / (100 + 50)
  CMP = (1.000 + 600) / 150
  CMP = R$ 10,67/kg

Novo Estoque: 150 kg a R$ 10,67/kg
```

#### 6.1.2 Quando Recalcular
- ✅ **Entrada de insumo:** trigger + função PostgreSQL
- ✅ **Saída de insumo:** usar CMP histórico (FIFO vs CMP vs PEPS)
- ❌ **Ajuste de inventário:** não recalcular (apenas registrar diferença)

#### 6.1.3 Implementação
```sql
-- Trigger ao inserir em movimentacoes_insumo (tipo = 'Entrada')
CREATE FUNCTION atualizar_custo_medio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'Entrada' THEN
    UPDATE insumos
    SET custo_medio = (
      (estoque_atual * custo_medio + NEW.quantidade * NEW.valor_unitario) /
      (estoque_atual + NEW.quantidade)
    ),
    estoque_atual = estoque_atual + NEW.quantidade,
    atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id;
  ELSIF NEW.tipo = 'Saída' THEN
    UPDATE insumos
    SET estoque_atual = estoque_atual - NEW.quantidade,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id
    AND estoque_atual >= NEW.quantidade;  -- Validação
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mov_insumo_trigger
AFTER INSERT ON movimentacoes_insumo
FOR EACH ROW EXECUTE FUNCTION atualizar_custo_medio();
```

---

### 6.2 Estoque Nunca Negativo

#### 6.2.1 Validação em 3 Camadas

**Camada 1: TypeScript (Imediato)**
```typescript
if (quantidade > estoque_atual) {
  throw new Error(
    `Estoque insuficiente. Disponível: ${estoque_atual}, Solicitado: ${quantidade}`
  );
}
```

**Camada 2: PostgreSQL (Constraint Check)**
```sql
CHECK(estoque_atual >= 0)  -- Sempre
```

**Camada 3: RLS Policy (Segurança)**
```sql
-- Impedir UPDATE se deixaria estoque negativo
CREATE POLICY ... USING (estoque_atual >= quantidade_solicitada)
```

#### 6.2.2 Comportamento em Saídas Automáticas
Se uma integração (ex: uso em talhão) gera saída automática > estoque:
- ❌ **Não fazer:** Deixar negativo ou ignorar
- ✅ **Fazer:** Criar fila de avisos, registrar "saída pendente" com status "falta de estoque"
- ⚠️ **Alternatively:** Bloquear atividade em talhão se insumo insuficiente

---

### 6.3 Rastreabilidade Completa

#### 6.3.1 Auditoria de Movimentação
Toda movimentação registra:

| Campo | Tipo | Fonte | Notas |
|---|---|---|---|
| `criado_em` | Timestamp | `CURRENT_TIMESTAMP` | Automático |
| `criado_por` | UUID (user_id) | `auth.users(id)` | Quem fez |
| `origem` | Enum | Manual ou código | `'manual'` \| `'talhao'` \| `'frota'` \| `'silo'` |
| `responsavel` | String | Usuário input | Nome/ID do operador |
| `observacoes` | Text | Usuário input | Justificativa, notas |

**Exemplo de auditoria:**
```json
{
  "id": "mov-123",
  "insumo_id": "insumo-456",
  "tipo": "Saída",
  "quantidade": 50,
  "valor_unitario": 12.50,
  "criado_em": "2026-04-16T14:30:00Z",
  "criado_por": "user-789",
  "responsavel": "João da Frota",
  "origem": "manual",
  "observacoes": "Abastecimento de Máquina X",
  "destino_tipo": "maquina",
  "destino_id": "maquina-001"
}
```

#### 6.3.2 Histórico Editável ou Imutável?
- **Decidido:** ✅ **Imutável** (melhor para auditoria)
- Nenhuma edição post-criar movimentação
- Se errada: criar "Ajuste" compensatório (entrada + saída)

---

## 7. Integrações com Outros Módulos

### 7.1 Insumos ↔ Talhões

#### 7.1.1 Fluxo
```
Usuário em Talhão:
  1. Registra atividade: "Aplicar Ureia em Talhão 03"
  2. Informa quantidade: 150 kg
  
Sistema (automático):
  3. Verifica estoque de Ureia: 500 kg (OK)
  4. Cria movimentacao_insumo:
     - tipo: 'Saída'
     - tipo_saida: 'USO_INTERNO'
     - destino_tipo: 'talhao'
     - destino_id: <talhao_03_id>
     - origem: 'talhao'
  5. Reduz Ureia: 500 - 150 = 350 kg
  6. Registra custo em talhao.custo_producao:
     - custo_insumo_ureia = 150 × 12.50 = R$ 1.875
```

#### 7.1.2 Requisitos de Banco
**Nova FK em talhoes (ou tabela join)?**
- Opção: Usar `movimentacoes_insumo.destino_id` → talhao_id (sem FK, apenas validação TS)

**Nova coluna em talhoes:**
```sql
ALTER TABLE talhoes ADD COLUMN
  custo_producao NUMERIC(12,2) DEFAULT 0;  -- Agregado de insumos + mão de obra
```

---

### 7.2 Insumos ↔ Frota

#### 7.2.1 Fluxo (Combustível)
```
Usuário em Frota:
  1. Registra "Abastecimento de Máquina X"
  2. Informa: Diesel, 80 L
  
Sistema:
  3. Verifica estoque de Diesel: 300 L (OK)
  4. Cria movimentacao_insumo:
     - tipo: 'Saída'
     - tipo_saida: 'USO_INTERNO'
     - destino_tipo: 'maquina'
     - destino_id: <maquina_x_id>
     - origem: 'frota'
  5. Reduz Diesel: 300 - 80 = 220 L
  6. Registra em maquinas.horas_operacao (se integrado)
```

#### 7.2.2 Outros Insumos
- Óleos, graxas, peças de reposição também via "Uso Interno"
- Mesmo padrão de saída automática

---

### 7.3 Insumos ↔ Silos

#### 7.3.1 Fluxo
```
Usuário em Silos:
  1. Registra novo silo de silagem
  2. Informa: inoculante utilizado, lona tipo
  
Sistema:
  3. Cria movimentacoes_insumo:
     - Inoculante: saída tipo USO_INTERNO → silo_id
     - Lona: saída tipo USO_INTERNO → silo_id
  4. Registra custos em silo.custo_producao
```

#### 7.3.2 Requisitos
```sql
ALTER TABLE silos ADD COLUMN
  custo_producao NUMERIC(12,2) DEFAULT 0;  -- Inoculante + lona
```

---

### 7.4 Insumos ↔ Financeiro

#### 7.4.1 Fluxo de Entrada (Compra)
```
Opção A: Criar Despesa Automática
  Usuário clica "Cadastrar Novo Insumo" + "Criar Despesa"
  → Sistema cria:
    - Movimentacao em insumos
    - Despesa em financeiro (categoria: "Insumos")
    - Tabela: financeiro.id → movimentacao_insumo.id (relação 1:1)

Opção B: Apenas Registrar (Usuário cria depois)
  Usuário cadastra insumo
  → Sistema sugere: "Deseja registrar como despesa?" (botão rápido)
```

**Decisão:** ✅ **Opção A (Automática)**
- Mais completo, evita inconsistência
- Flag de config por fazenda: "Criar despesa automática em insumos?"

#### 7.4.2 Estrutura
```sql
-- Nova tabela: link entre movimentacoes_insumo e financeiro
CREATE TABLE movimentacoes_insumo_despesas (
  movimentacao_id UUID PRIMARY KEY REFERENCES movimentacoes_insumo(id),
  despesa_id UUID REFERENCES financeiro(id),
  UNIQUE(movimentacao_id)
);

-- Ou: adicionar coluna direto
ALTER TABLE movimentacoes_insumo ADD COLUMN despesa_id UUID REFERENCES financeiro(id);
```

#### 7.4.3 Valores Registrados em Financeiro
```
Despesa (Entrada de insumo):
  - Categoria: "Insumos"
  - Descrição: "Entrada de {nome_insumo}: {qtde} {unidade}"
  - Valor: quantidade × valor_unitário
  - Data: data da entrada
  - Referência: movimentacao_insumo.id
  - Status: "Confirmado" (se entrada é sempre real)
```

---

## 8. Requisitos Não-Funcionais

### 8.1 Segurança e Autorização

#### 8.1.1 Row-Level Security (RLS)
```sql
-- Reforçar políticas existentes
CREATE POLICY "insumos_audit_fazenda" ON insumos
  FOR SELECT USING (fazenda_id = (SELECT fazenda_id FROM auth.users_profiles WHERE id = auth.uid()));

-- Idem para movimentacoes, categorias, tipos
```

#### 8.1.2 Validação de Auditoria (TS)
```typescript
// Sempre injatar fazenda_id automaticamente
const insumo = await q.insumos.create({
  nome, tipo_id, categoria_id, ...
  // fazenda_id NÃO aceito como parâmetro
  // injeta: fazenda_id = getUserFazendaId()
});
```

---

### 8.2 Performance

#### 8.2.1 Índices (DB)
```sql
CREATE INDEX idx_insumos_fazenda_ativo ON insumos(fazenda_id, ativo);
CREATE INDEX idx_movimentacoes_insumo_data ON movimentacoes_insumo(data DESC);
CREATE INDEX idx_movimentacoes_origem ON movimentacoes_insumo(origem);
CREATE INDEX idx_tipos_categoria ON tipos_insumo(categoria_id);
```

#### 8.2.2 Paginação (Frontend)
- Implementar `.range(offset, limit)` em queries
- Default: 20 produtos por página
- Total de registros retornado com count

#### 8.2.3 Cache
- React Query (SWR) para queries de insumos (refetch on focus)
- Invalidate cache ao criar/atualizar/deletar

#### 8.2.4 Queries Otimizadas
- Usar `.select('id, nome, categoria_id, estoque_atual, ...')` (nunca `select('*')`)
- `JOIN` com categorias/tipos apenas quando necessário
- Lazy-load histórico de movimentações (mostrar últimas 10, com "carregar mais")

---

### 8.3 Componentização

#### 8.3.1 Arquitetura de Componentes
```
app/dashboard/insumos/
├── page.tsx                          (Container principal)
├── components/
│   ├── InsumosList.tsx               (Tabela de produtos)
│   ├── AlertsSection.tsx             (Seção de alertas críticos)
│   ├── UltimasMovimentacoes.tsx       (Entradas/Saídas recentes)
│   ├── InsumoForm.tsx                (Form de novo insumo)
│   ├── SaidaForm.tsx                 (Form de saída)
│   ├── AjusteInventario.tsx          (Dialog de ajuste)
│   └── InsumoCard.tsx                (Card individual — se necessário)

lib/
├── hooks/
│   ├── useInsumos.ts                 (Estado + queries)
│   ├── useMovimentacoes.ts           (Movimentações)
│   └── useCategorias.ts              (Categorias/tipos)
├── validations/
│   └── insumos.ts                    (Zod schemas)
├── supabase/
│   ├── queries-audit.ts              (Queries auditadas)
│   ├── insumos.ts                    (Consolidar com queries-audit)
│   └── supabase.ts                   (Types)
```

#### 8.3.2 Hooks Customizados
```typescript
// lib/hooks/useInsumos.ts
export function useInsumos() {
  const { data, isLoading, error, refetch } = useQuery(
    'insumos',
    () => q.insumos.list()
  );
  return { insumos: data, loading: isLoading, error, refetch };
}

// Uso em componentes:
const { insumos, loading, error } = useInsumos();
```

---

### 8.4 Validações

#### 8.4.1 Schemas Zod (Extraídos para `lib/validations/insumos.ts`)
```typescript
export const insumoFormSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  categoria_id: z.string().uuid('Categoria inválida'),
  tipo_id: z.string().uuid('Tipo inválido'),
  unidade: z.string().min(1),
  quantidade_entrada: z.number().positive('Deve ser > 0'),
  valor_unitario: z.number().nonnegative('Não pode ser negativo'),
  fornecedor: z.string().min(1, 'Obrigatório'),
  local_armazen: z.string().min(1, 'Obrigatório'),
  estoque_minimo: z.number().nonnegative(),
  observacoes: z.string().optional(),
});

export const saidaFormSchema = z.object({
  insumo_id: z.string().uuid(),
  tipo_saida: z.enum(['USO_INTERNO', 'VENDA', 'DEVOLUCAO', 'AJUSTE', 'DESCARTE', 'TROCA']),
  quantidade: z.number().positive(),
  valor_unitario: z.number().nonnegative(),
  destino_tipo: z.string().optional(),  // Se tipo_saida = USO_INTERNO
  destino_id: z.string().uuid().optional(),
  responsavel: z.string().min(1),
  data: z.coerce.date(),
  observacoes: z.string().optional(),
});

export const ajusteInventarioSchema = z.object({
  insumo_id: z.string().uuid(),
  estoque_real: z.number().nonnegative(),
  motivo: z.string().min(5, 'Mínimo 5 caracteres'),
});
```

#### 8.4.2 Validações em Runtime
- Server Actions em Next.js validam schemas antes de DB insert
- Toast de erro se validação falha
- Campo problemático fica em destaque no form

---

### 8.5 Testes

#### 8.5.1 Testes Unitários
```
__tests__/insumos.test.ts:
  ✅ listAbaixoMinimo()
  ⬜ createInsumo() — novo
  ⬜ updateInsumo() — novo
  ⬜ deleteInsumo() — novo
  ⬜ createMovimentacao() — novo
  ⬜ calcularCustoMedio() — novo
```

#### 8.5.2 Testes de Integração
```
⬜ Entrada de insumo novo → cria no banco + movimentacao
⬜ Saída de insumo → reduz estoque, calcula CMP
⬜ Ajuste de inventário → registra diferença
⬜ Integrações (talhão saída → silo saída) — mock
```

#### 8.5.3 Cobertura Mínima
- CRUD: 80%
- Validações: 100%
- Cálculos (CMP): 100%

---

## 9. Fora de Escopo desta Refatoração

### 9.1 Funcionalidades Adiadas
- 📋 **Relatórios (PDF/Excel)** → Fase 2
- 📧 **Notificações (Email/SMS)** → Fase 2
- 📦 **Rastreamento de Lote + Validade** → Fase 2
- 🤖 **Previsão de Consumo (ML)** → Fase 3+
- 🔗 **APIs de Fornecedores** (SAP, Agrodefesa, etc.) → Fase 3+
- 📊 **Dashboard de Análise de Custos** → Fase 2
- 🔄 **Recebimento de Nota Fiscal (XML)** → Fase 3+

### 9.2 Por que não incluir
- Requer pesquisa adicional de UX/integrações
- Complexidade > ROI imediato
- Melhor abordar após MVP estar estável

---

## 10. Critérios de Aceite

### 10.1 Frontend

#### 10.1.1 Tela Principal
- [ ] Seção de alertas (críticos) renderiza corretamente
- [ ] Últimas entradas/saídas mostram 4 itens máx
- [ ] Tabela de produtos carrega com paginação (20/página)
- [ ] Filtros funcionam: categoria, tipo, busca
- [ ] Ordenação funciona em todas as colunas
- [ ] Responsive em mobile (< 768px)
- [ ] Performance: carregamento < 2s

#### 10.1.2 Form "Novo Insumo"
- [ ] Autocomplete de nome funciona
- [ ] Seleção de produto existente pre-preenche categoria/tipo/unidade
- [ ] Produto novo: permite escrita livre + unidade manual
- [ ] Validações Zod funcionam (mostra erro em tempo real)
- [ ] Salvar cria insumo + movimentação (entrada) no banco
- [ ] Despesa automática criada em Financeiro (se configurado)
- [ ] Toast de sucesso

#### 10.1.3 Form "Saídas"
- [ ] Autocomplete de insumo funciona
- [ ] Tipo de saída muda campos dinâmicos (destino)
- [ ] Validação de estoque: bloqueia se quantidade > atual
- [ ] CMP pré-preenchido (editável)
- [ ] Salvar reduz estoque, registra movimentacao
- [ ] Toast de sucesso

#### 10.1.4 Ajuste de Inventário
- [ ] Dialog abre corretamente
- [ ] Mostra estoque atual (read-only)
- [ ] Calcula diferença automáticamente
- [ ] Requer motivo (validação)
- [ ] Salvar cria movimentacao tipo "Ajuste"
- [ ] Estoque atualizado

### 10.2 Backend

#### 10.2.1 Banco de Dados
- [ ] Tabelas `categorias_insumo` e `tipos_insumo` criadas com migrations
- [ ] Colunas novas em `insumos` (categoria_id, tipo_id, custo_medio, etc.)
- [ ] Colunas novas em `movimentacoes_insumo` (tipo_saida, destino_tipo, origem, etc.)
- [ ] Índices criados (performance)
- [ ] RLS policies reforçadas
- [ ] Trigger de atualização de CMP funciona
- [ ] Dados iniciais (categorias/tipos) seedados

#### 10.2.2 Queries e Mutations
- [ ] Bug #1 corrigido: fazenda_id não é vazio em create
- [ ] Bug #2 corrigido: queries em `insumos.ts` movidas/auditadas
- [ ] `q.insumos.list()` com paginação
- [ ] `q.insumos.listAbaixoMinimo()` funciona
- [ ] `q.insumos.create()` injeta fazenda_id automaticamente
- [ ] `q.movimentacoes.create()` valida estoque antes
- [ ] `q.categorias.list()` e `q.tipos.listByCategoria()`
- [ ] Todas queries com `.select()` específico (não `*`)

#### 10.2.3 Integrações
- [ ] Entrada de insumo em talhão cria saída automática
- [ ] Abastecimento de máquina cria saída automática
- [ ] Uso de inoculante em silo cria saída automática
- [ ] Entrada de insumo cria despesa em Financeiro
- [ ] Auditoria completa registrada (criado_por, criado_em, origem)

### 10.3 Testes
- [ ] Testes unitários de CRUD passam (80%+ cobertura)
- [ ] Testes de CMP passam (100% cobertura)
- [ ] Testes de validação de estoque passam
- [ ] Testes de integração com talhões passam (mock)

### 10.4 Segurança
- [ ] RLS policies bloqueiam acesso cross-fazenda
- [ ] fazenda_id não pode ser manipulado por usuário
- [ ] Movimentações registram criado_por corretamente
- [ ] Sem SQL injection possível (Supabase + Zod)

### 10.5 Documentação
- [ ] README em `docs/insumos/` explicando estrutura
- [ ] Schema SQL documentado (comentários em migrations)
- [ ] Tipos TypeScript exportados e tipados corretamente
- [ ] Comentários em funções complexas (CMP, validações)

### 10.6 Performance
- [ ] Tela principal carrega < 2s (inclusive Últimas Entradas/Saídas)
- [ ] Tabela com 1000+ produtos não congela
- [ ] Filtros aplicam em < 500ms
- [ ] Sem N+1 queries

---

## 11. Roadmap de Implementação (Estimativa)

| Fase | Sprint | Tarefas | Dias |
|---|---|---|---|
| **1. Correções Críticas** | Week 1 | Bug fazenda_id, Consolidar queries | 2-3 |
| **2. Base de Dados** | Week 1-2 | Migrations, categorias, tipos, triggers | 3-4 |
| **3. Backend Refatorado** | Week 2-3 | Queries-audit, hooks, validações | 5-6 |
| **4. Frontend — Layout** | Week 3 | Alertas, listas curtas, tabela | 3-4 |
| **5. Frontend — Forms** | Week 4 | Novo Insumo, Saídas, Ajuste | 4-5 |
| **6. Integrações** | Week 4-5 | Talhões, Frota, Silos, Financeiro | 4-5 |
| **7. Testes + Polish** | Week 5-6 | Testes, UI/UX, performance | 3-4 |
| **TOTAL** | 6 semanas | — | ~30 dias |

---

## 12. Apêndice: Decisões de Design

### 12.1 Por que Tabelas Separadas para Categorias?
✅ **Pros:**
- Admin pode gerenciar sem código
- Flexível para novos tipos
- Integridade referencial
- Fácil query/filter

❌ **Cons:**
- Mais overhead inicial
- Mais 2 tabelas

**Decisão:** Usar tabelas. Manutenibilidade > simplicidade inicial.

---

### 12.2 Por que CMP (não FIFO)?
- CMP reflete melhor o custo real de produção
- Mais simples implementar (1 valor por insumo)
- Alinhado com normas contábeis brasileiras

---

### 12.3 FKs Dinâmicas para Destino (Talhão/Máquina/Silo)?
**Opção A:** Validação 100% em TS (sem FK DB)
- ✅ Flexível, sem CHECK complexo
- ✅ Menos overhead
- ❌ Sem garantia referencial

**Opção B:** Tabela polimórfica
- ✅ Integridade garantida
- ❌ Mais complexa

**Decisão:** Opção A (Validação em TS). Mais pragmático para MVP.

---

**Documento Completo — Pronto para Revisão e Implementação**

Data de Geração: 2026-04-16  
Próximo Passo: Feedback de stakeholders → Iniciar Fase 1 (Correções Críticas)
