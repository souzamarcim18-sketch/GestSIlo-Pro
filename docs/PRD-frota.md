# PRD — Módulo de Gestão de Frota (GestSilo Pro)

**Documento de Requisitos de Produto**  
Data: 2026-04-23  
Autor: Claude Code  
Status: Rascunho — aguardando revisão

---

## 1. DESCRIÇÃO DA FUNCIONALIDADE

O módulo de Gestão de Frota é responsável por centralizar o controle de máquinas agrícolas, implementos e equipamentos de uma fazenda. O objetivo é dar ao produtor uma visão integrada dos ativos operacionais, seus custos reais, histórico de uso e manutenções, possibilitando decisões gerenciais como: precificação de serviços, avaliação de terceirização versus compra, e identificação de máquinas com custo operacional desproporcional ao uso.

O módulo abrange sete grandes áreas funcionais:

1. **Visão Geral** — dashboard com KPIs, alertas e gráficos
2. **Cadastro** — registro detalhado de máquinas, tratores e implementos
3. **Diário de Bordo** — apontamento de operações diárias (horas, horímetro, talhão, implemento)
4. **Manutenções** — controle preventivo (por horímetro/tempo) e corretivo (quebras)
5. **Abastecimento** — registro de consumo de diesel por máquina
6. **Custos e Análise** — cálculo de custo operacional por hora (R$/h), depreciação, custo total
7. **Relatórios** — exportação de histórico consolidado por máquina ou por frota

---

## 2. CONTEXTO TÉCNICO — O QUE JÁ EXISTE NO PROJETO

### 2.1 Estrutura de Arquivos Atual

```
app/dashboard/frota/
└── page.tsx                        (1.053 linhas) — Página única monolítica

lib/supabase/
├── maquinas.ts                     (2 funções: update / delete)
├── queries-audit.ts                (namespaces maquinas, usoMaquinas, manutencoes, abastecimentos)
└── safe-delete.ts                  (deleteMaquinaSafely — valida dependências antes de deletar)

lib/supabase.ts                     (tipos TypeScript: Maquina, UsoMaquina, Manutencao, Abastecimento)

supabase/migrations/
└── 20240407_maquinas_depreciacao.sql  (adiciona consumo_medio_lh, valor_aquisicao, data_aquisicao, vida_util_anos)
```

### 2.2 Banco de Dados — Tabelas e Schema Atual

#### Tabela: `maquinas`
```sql
id              UUID PRIMARY KEY
nome            TEXT NOT NULL
tipo            TEXT  -- 'Trator' | 'Colheitadeira' | 'Pulverizador' | 'Caminhão' | 'Outros'
marca           TEXT
modelo          TEXT
ano             INTEGER
identificacao   TEXT  -- placa ou número de patrimônio
fazenda_id      UUID NOT NULL REFERENCES fazendas(id)
consumo_medio_lh  NUMERIC(6,2)   -- L/hora
valor_aquisicao   NUMERIC(12,2)
data_aquisicao    DATE
vida_util_anos    INTEGER DEFAULT 10
```

#### Tabela: `uso_maquinas`
```sql
id          UUID PRIMARY KEY
maquina_id  UUID NOT NULL REFERENCES maquinas(id)
data        DATE NOT NULL
operador    TEXT
atividade   TEXT
horas       NUMERIC(6,2)
km          NUMERIC(8,2)
```

#### Tabela: `manutencoes`
```sql
id                   UUID PRIMARY KEY
maquina_id           UUID NOT NULL REFERENCES maquinas(id)
data                 DATE NOT NULL
tipo                 TEXT  -- 'Preventiva' | 'Corretiva'
descricao            TEXT
custo                NUMERIC(10,2)
proxima_manutencao   DATE
```

#### Tabela: `abastecimentos`
```sql
id          UUID PRIMARY KEY
maquina_id  UUID NOT NULL REFERENCES maquinas(id)
data        DATE NOT NULL
combustivel TEXT  -- 'Diesel' | 'Gasolina' | 'Etanol' | 'GNV'
litros      NUMERIC(8,2)
valor       NUMERIC(10,2)  -- valor total (não preço por litro)
hodometro   NUMERIC(10,2)
```

### 2.3 Tipagens TypeScript Atuais (`lib/supabase.ts`)

```typescript
export type Maquina = {
  id: string;
  nome: string;
  tipo: 'Trator' | 'Colheitadeira' | 'Pulverizador' | 'Caminhão' | 'Outros';
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  identificacao: string | null;
  fazenda_id: string;
  consumo_medio_lh: number | null;
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  vida_util_anos: number | null;
};

export type UsoMaquina = { id, maquina_id, data, operador, atividade, horas, km };
export type Manutencao  = { id, maquina_id, data, tipo, descricao, custo, proxima_manutencao };
export type Abastecimento = { id, maquina_id, data, combustivel, litros, valor, hodometro };
```

### 2.4 Camada de Queries (`queries-audit.ts`)

Todos os namespaces já existem e seguem o padrão `q.*`:

```typescript
q.maquinas.list()
q.maquinas.create(payload)
q.maquinas.update(id, payload)
q.maquinas.remove(id)

q.usoMaquinas.listByMaquina(maquinaId)
q.usoMaquinas.listByMaquinas(maquinaIds[])   // batch
q.usoMaquinas.create(payload)
q.usoMaquinas.remove(id)

q.manutencoes.listByMaquina(maquinaId)
q.manutencoes.listByMaquinas(maquinaIds[])   // batch
q.manutencoes.create(payload)
q.manutencoes.update(id, payload)
q.manutencoes.remove(id)

q.abastecimentos.listByMaquina(maquinaId)
q.abastecimentos.listByMaquinas(maquinaIds[]) // batch
q.abastecimentos.create(payload)
q.abastecimentos.remove(id)
```

### 2.5 O Que Está Funcional vs. Incompleto

| Funcionalidade | Status | Observação |
|---|---|---|
| Listagem de máquinas em cards | ✅ Funcional | Grid com depreciação calculada |
| Cadastro de máquinas (Dialog) | ✅ Funcional | Zod + React Hook Form |
| Cálculo de depreciação linear | ✅ Funcional | (anos_uso / vida_util) × valor_aquisicao |
| Registro de abastecimento | ✅ Funcional | Integração com módulo Insumos |
| Histórico de abastecimentos | ✅ Funcional | Tabela por máquina |
| Histórico de manutenções | ✅ Funcional (display) | Sem formulário de cadastro funcional |
| Histórico de uso diário | ✅ Funcional (display) | Sem formulário de cadastro funcional |
| Formulário de manutenção | ❌ Incompleto | Dialog existe mas não salva no BD |
| Formulário de uso diário | ❌ Incompleto | Botão desabilitado (`aria-disabled="true"`) |
| Abas (Visão Geral, Cadastro, etc.) | ❌ Ausente | Não há estrutura de tabs |
| Dashboard KPIs | ❌ Ausente | Cards de resumo não existem na página |
| Gráficos | ❌ Ausente | Recharts não utilizado no módulo |
| Alertas de manutenção | ❌ Ausente | Nenhum mecanismo de alerta |
| Análise de custo/hora | ❌ Ausente | Cálculo não implementado |
| Planos de manutenção preventiva | ❌ Ausente | Sem tabela ou UI |
| Implementos como entidade separada | ❌ Ausente | Implementos tratados como máquinas |
| Relatórios e exportação | ❌ Ausente | Não implementado |
| Status da máquina (Ativo/Parado) | ❌ Ausente | Campo não existe no schema |

### 2.6 Integrações Existentes

- **Frota → Insumos**: Registro de abastecimento cria automaticamente uma `movimentacao_insumo` do tipo saída. Há reversão automática se a integração falhar.
- **Frota → Dashboard**: O card "Frota em Operação" em `/dashboard` exibe `maquinasTotal`.
- **Frota → Financeiro**: Tipo `Financeiro` já tem campo `referencia_tipo: 'Máquina'`, indicando que despesas de manutenção podem ser linkadas a máquinas.
- **TODO pendente**: `queries-audit.ts` linha ~1310 tem TODO para integrar `custo_hora` com `atividades_campo`.

### 2.7 Segurança e RLS

- RLS habilitado em todas as 4 tabelas
- Isolamento por `fazenda_id` garantido em dupla camada: código (`getFazendaId()`) + RLS policy
- `deleteMaquinaSafely()` valida dependências antes de deletar (uso, manutenções, abastecimentos)

---

## 3. REQUISITOS FUNCIONAIS

### RF-01 — Estrutura de Abas (Tabs)

A página `/dashboard/frota` deve ser reorganizada em **7 abas**:

| Tab | Rota/Anchor | Descrição |
|---|---|---|
| Visão Geral | `#visao-geral` | Dashboard KPIs + gráficos + alertas |
| Cadastro | `#cadastro` | Grid de máquinas e implementos cadastrados |
| Diário de Bordo | `#uso` | Registro e histórico de operações |
| Manutenções | `#manutencoes` | Preventiva e corretiva |
| Abastecimento | `#abastecimento` | Registro de consumo de diesel |
| Custos | `#custos` | Análise de custo operacional por hora |
| Relatórios | `#relatorios` | Exportação PDF/CSV |

---

### RF-02 — Visão Geral (Dashboard)

**Cards de KPI (topo da aba):**

| Card | Cálculo | Ícone |
|---|---|---|
| Máquinas ativas | `COUNT(maquinas WHERE status = 'Ativo')` | Truck |
| Em manutenção | `COUNT(maquinas WHERE status = 'Em manutenção')` | Wrench |
| Horas trabalhadas no mês | `SUM(uso_maquinas.horas WHERE mes_atual)` | Clock |
| Consumo de diesel no mês | `SUM(abastecimentos.litros WHERE mes_atual)` e `SUM(abastecimentos.valor)` | Fuel |
| Custo operacional do mês | manutenções + abastecimento + depreciação proporcional | DollarSign |

**Alertas críticos** (seção abaixo dos KPIs):
- Manutenções com `data_prevista < hoje` e status ≠ 'concluída'
- Máquinas com horímetro dentro de 10% do próximo plano preventivo
- Documentos/seguros vencendo nos próximos 30 dias (se campo existir)

**Gráficos** (usando Recharts, já dependência do projeto):
- Barras: Horas trabalhadas por máquina no mês
- Barras empilhadas ou pizza: Custo operacional por máquina no mês
- Linha: Consumo de diesel nos últimos 6 meses

---

### RF-03 — Cadastro de Máquinas e Implementos

#### RF-03.1 — Expansão dos Tipos de Ativo

O campo `tipo` deve ser expandido:

```typescript
tipo: 'Trator' | 'Ensiladeira' | 'Colheitadeira' | 'Pulverizador' 
     | 'Plantadeira/Semeadora' | 'Implemento' | 'Caminhão' | 'Outros'
```

#### RF-03.2 — Novos Campos no Cadastro

**Campos adicionais necessários em `maquinas`:**

| Campo | Tipo SQL | Tipo TS | Obrigatoriedade | Observação |
|---|---|---|---|---|
| `status` | TEXT | enum | Obrigatório | 'Ativo' \| 'Em manutenção' \| 'Parado' \| 'Vendido' |
| `numero_serie` | TEXT | string \| null | Opcional | Chassi ou número de série |
| `placa` | TEXT | string \| null | Opcional | Substitui campo `identificacao` genérico |
| `potencia_cv` | INTEGER | number \| null | Opcional | Apenas para autopropelidos |
| `horimetro_atual` | NUMERIC(10,2) | number \| null | Opcional | Base para planos de manutenção |
| `valor_residual` | NUMERIC(12,2) | number \| null | Opcional | Para cálculo de depreciação |
| `vida_util_horas` | INTEGER | number \| null | Opcional | Alternativa a `vida_util_anos` |

> **Nota sobre `identificacao`**: O campo genérico `identificacao` existente pode ser mantido para compatibilidade ou migrado para `placa`. Recomendado: manter ambos, usando `identificacao` como fallback.

#### RF-03.3 — Implementos como Entidade Diferenciada

Implementos (`tipo = 'Implemento'`) exibem campos adicionais no formulário:

| Campo | Tipo | Observação |
|---|---|---|
| `largura_trabalho_metros` | NUMERIC(5,2) | Para cálculo de capacidade operacional (ha/h) |
| `tratores_compativeis` | TEXT[] ou JSONB | IDs ou nomes dos tratores compatíveis |

> **Decisão de implementação**: Esses campos podem ser armazenados como colunas nullable em `maquinas` (mais simples) ou em tabela separada `implementos` com FK. Recomendado: colunas nullable em `maquinas` para evitar JOIN.

#### RF-03.4 — UI do Formulário de Cadastro

- Dialog com seções colapsáveis: Dados Básicos, Identificação, Aquisição e Depreciação, Configuração de Manutenção
- Campos condicionais: potência CV e horímetro aparecem apenas para `tipo ≠ 'Implemento'`; largura de trabalho e tratores compatíveis aparecem apenas para `tipo = 'Implemento'`
- Consumo de diesel (L/h): obrigatório para `tipo = 'Trator'`, opcional para demais
- Validação via Zod com mensagens em português

---

### RF-04 — Diário de Bordo (Registro de Uso)

#### RF-04.1 — Novos Campos em `uso_maquinas`

| Campo | Tipo SQL | Tipo TS | Observação |
|---|---|---|---|
| `horimetro_inicio` | NUMERIC(10,2) | number \| null | Leitura no início da operação |
| `horimetro_fim` | NUMERIC(10,2) | number \| null | Leitura no fim; `horas` = fim - início |
| `implemento_id` | UUID | string \| null | FK para maquinas WHERE tipo = 'Implemento' |
| `talhao_id` | UUID | string \| null | FK para talhoes |
| `tipo_operacao` | TEXT | enum | 'Operação agrícola' \| 'Manutenção' \| 'Deslocamento' \| 'Limpeza de área' \| 'Outros' |
| `area_ha` | NUMERIC(10,4) | number \| null | Área trabalhada (calcula rendimento ha/h) |

> O campo `horas` existente deve ser calculado automaticamente a partir de `horimetro_fim - horimetro_inicio` quando ambos estiverem preenchidos. O campo `km` existente permanece para hodômetro.

#### RF-04.2 — Origem do Registro

Registros de uso podem ter duas origens:
1. **Automática**: Criados pelo módulo de Operações Agrícolas (futuro) ao registrar uma operação que envolva máquina.
2. **Manual**: Criados diretamente na aba Diário de Bordo (esta implementação).

O campo `origem` (TEXT: 'manual' | 'operacao_agricola') pode ser adicionado para rastreabilidade.

#### RF-04.3 — UI do Diário de Bordo

- Formulário Dialog: máquina (Select), data, horimetro início/fim (com cálculo automático de horas), implemento acoplado (Select filtrando tipo='Implemento'), talhão (Select), tipo de operação, área (ha), observações
- Tabela de histórico com filtros por máquina e período
- Coluna de rendimento calculado: `area_ha / horas` quando disponível

---

### RF-05 — Manutenções

#### RF-05.1 — Dois Tipos Distintos

**a) Preventiva (planejada)**
- Definida por um **Plano de Manutenção**: checklist com intervalo em horas ou dias
- Sistema gera alertas automáticos quando horímetro atingir limiar
- Exemplos: troca de óleo a cada 250h, filtro de ar a cada 500h, revisão anual

**b) Corretiva (quebra)**
- Registro imediato do problema
- Muda `status` da máquina para 'Em manutenção' automaticamente
- Registra data de abertura e fecha ao marcar como 'concluída'

#### RF-05.2 — Novos Campos em `manutencoes`

| Campo | Tipo SQL | Tipo TS | Observação |
|---|---|---|---|
| `status` | TEXT | enum | 'aberta' \| 'em andamento' \| 'concluída' |
| `data_prevista` | DATE | string \| null | Para preventivas planejadas |
| `data_realizada` | DATE | string \| null | Quando foi efetivamente feita |
| `horimetro` | NUMERIC(10,2) | number \| null | Leitura do horímetro na manutenção |
| `proxima_manutencao_horimetro` | NUMERIC(10,2) | number \| null | Horímetro para próxima preventiva |
| `responsavel` | TEXT | string \| null | Nome do mecânico/oficina |
| `mao_de_obra_tipo` | TEXT | enum | 'própria' \| 'terceirizada' |
| `mao_de_obra_valor` | NUMERIC(10,2) | number \| null | Custo de mão de obra (separado de peças) |
| `pecas` | JSONB | PecaManutencao[] | Lista de peças com qtd e valor unitário |

> `custo` existente = soma automática de `mao_de_obra_valor` + soma dos valores em `pecas`.

Estrutura JSONB de `pecas`:
```typescript
type PecaManutencao = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
};
```

#### RF-05.3 — Nova Tabela: `planos_manutencao`

Para as preventivas recorrentes:

```sql
CREATE TABLE planos_manutencao (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id        UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  descricao         TEXT NOT NULL,       -- Ex: "Troca de óleo motor"
  intervalo_horas   INTEGER,             -- null se baseado em tempo
  intervalo_dias    INTEGER,             -- null se baseado em horímetro
  horimetro_base    NUMERIC(10,2),       -- Horímetro do último serviço
  data_base         DATE,                -- Data do último serviço
  ativo             BOOLEAN DEFAULT true,
  fazenda_id        UUID NOT NULL REFERENCES fazendas(id)
);
```

#### RF-05.4 — UI de Manutenções

- **Formulário Dialog** com campos condicionais: se Corretiva, exibe status; se Preventiva, exibe plano associado e datas previstas
- **Lista de peças dinâmica**: adicionar/remover itens com cálculo de custo automático
- **Alerta visual**: máquinas com manutenção vencida recebem badge vermelho no card
- Ao registrar manutenção Corretiva, atualizar `maquinas.status = 'Em manutenção'`; ao concluir, reverter para 'Ativo'

---

### RF-06 — Abastecimento

#### RF-06.1 — Expansão dos Campos em `abastecimentos`

| Campo | Tipo SQL | Tipo TS | Observação |
|---|---|---|---|
| `preco_litro` | NUMERIC(8,3) | number \| null | Preço por litro; `valor = litros × preco_litro` |
| `fornecedor` | TEXT | string \| null | Posto ou "Tanque da fazenda" |
| `horimetro` | NUMERIC(10,2) | number \| null | Unifica com campo `hodometro` existente |

> Manter `hodometro` por compatibilidade; adicionar `horimetro` como campo separado para máquinas que não têm hodômetro.

#### RF-06.2 — Indicadores Calculados

- **Consumo médio real (L/h)** por máquina: `SUM(litros) / SUM(horas_uso_no_período)`
- **Detecção de anomalia**: consumo > 30% acima da média histórica → alerta visual
- **Custo de combustível por hora**: `SUM(valor) / SUM(horas_uso)`

#### RF-06.3 — Integração com Insumos

A integração existente (abastecimento cria saída de `movimentacao_insumo`) deve ser mantida e aprimorada:
- O campo `fornecedor` deve ser preenchido automaticamente se o insumo for do "Tanque da fazenda"

---

### RF-07 — Custos e Análise

#### RF-07.1 — Custo Operacional por Hora (R$/h)

Para cada máquina, calcular:

```
Custo Fixo Anual = (valor_aquisicao - valor_residual) / vida_util_anos
Custo Fixo por Hora = Custo Fixo Anual / Horas trabalhadas no ano

Custo Variável por Hora = 
  (Combustível R$ / horas) + 
  (Manutenções R$ / horas) + 
  (Outros variáveis / horas)

Custo Total por Hora = Custo Fixo/h + Custo Variável/h
```

#### RF-07.2 — UI de Custos

- Tabela por máquina com colunas: Depreciação/h, Combustível/h, Manutenção/h, **Total R$/h**
- Ranking das máquinas por custo/hora (mais cara → mais barata)
- Seletor de período para recalcular com dados do intervalo
- Card de comparativo: custo próprio vs. estimativa de terceirização (input manual do preço de mercado)

---

### RF-08 — Relatórios

- **Relatório por máquina**: histórico de uso, manutenções e abastecimentos em período selecionável
- **Relatório consolidado da frota**: todos os ativos com KPIs principais
- **Histórico de manutenções**: filtrado por tipo (preventiva/corretiva) e período
- **Ranking por custo/hora**: tabela ordenável
- Exportação: CSV (implementação via `Blob` e `URL.createObjectURL`)
- Exportação PDF: via `window.print()` com CSS de impressão ou biblioteca `jspdf` (a definir)

---

## 4. REQUISITOS NÃO FUNCIONAIS

### RNF-01 — Segurança

- **RLS obrigatório**: toda nova tabela criada deve ter policy de isolamento por `fazenda_id`
- **Dupla validação**: todas as queries em `queries-audit.ts` devem validar `fazenda_id` via `getFazendaId()` antes de qualquer operação
- **Deleção segura**: `deleteMaquinaSafely()` deve ser atualizada para incluir `planos_manutencao` nas verificações de dependência

### RNF-02 — Performance

- **Batch loading**: todas as queries secundárias (uso, manutenções, abastecimentos) devem usar `listByMaquinas(ids[])` em vez de N queries individuais
- **Lazy loading**: dados de abas não ativas não devem ser carregados até o usuário acessar a aba
- **Cálculos no cliente**: KPIs de custo/hora calculados em JavaScript após uma única carga de dados (sem RPCs extras para agregações simples)
- **Select específico**: nenhuma query usa `select('*')`; sempre listar colunas necessárias

### RNF-03 — UX e Acessibilidade

- Skeleton loaders em todas as seções enquanto dados carregam
- Empty states descritivos com CTA (ex: "Nenhuma máquina cadastrada. [Cadastrar primeira máquina]")
- Toast notifications (Sonner) para todas as ações CRUD
- Formulários com validação em tempo real via Zod
- Badges de status com cores semânticas: verde (Ativo), amarelo (Em manutenção), vermelho (Parado), cinza (Vendido)
- Responsividade: grid de cards deve adaptar de 1 a 3 colunas

### RNF-04 — Consistência com Padrões do Projeto

- UI exclusivamente com componentes `shadcn/ui` + Tailwind CSS 4.1
- Ícones via `lucide-react` apenas
- Formulários via `react-hook-form` + Zod (sem form elements nativos não validados)
- Queries centralizadas em `queries-audit.ts` sob namespace `q.*`
- Tipagens TypeScript atualizadas em `lib/supabase.ts`
- Nenhuma query em `page.tsx` diretamente (usar apenas `q.*`)

### RNF-05 — Testabilidade

- Novos namespaces em `queries-audit.ts` devem ser mockáveis (sem acoplamento direto ao client Supabase)
- Lógica de cálculo de custo/hora deve ser extraída para funções puras em `lib/utils/frota.ts` (testáveis via `npm run test`)

---

## 5. RESTRIÇÕES E DEPENDÊNCIAS IDENTIFICADAS

### 5.1 Migrações de Banco Necessárias

As seguintes alterações de schema são necessárias antes da implementação da UI:

```sql
-- 1. Expansão da tabela maquinas
ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'Ativo',
  ADD COLUMN IF NOT EXISTS numero_serie      TEXT,
  ADD COLUMN IF NOT EXISTS placa             TEXT,
  ADD COLUMN IF NOT EXISTS potencia_cv       INTEGER,
  ADD COLUMN IF NOT EXISTS horimetro_atual   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_residual    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS vida_util_horas   INTEGER,
  ADD COLUMN IF NOT EXISTS largura_trabalho_metros NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS tratores_compativeis    TEXT[];

-- Constraint no enum de tipo (recomendado: TEXT com CHECK)
ALTER TABLE maquinas ADD CONSTRAINT maquinas_tipo_check 
  CHECK (tipo IN ('Trator','Ensiladeira','Colheitadeira','Pulverizador',
                  'Plantadeira/Semeadora','Implemento','Caminhão','Outros'));

ALTER TABLE maquinas ADD CONSTRAINT maquinas_status_check
  CHECK (status IN ('Ativo','Em manutenção','Parado','Vendido'));

-- 2. Expansão da tabela uso_maquinas
ALTER TABLE uso_maquinas
  ADD COLUMN IF NOT EXISTS horimetro_inicio  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS horimetro_fim     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS implemento_id     UUID REFERENCES maquinas(id),
  ADD COLUMN IF NOT EXISTS talhao_id         UUID REFERENCES talhoes(id),
  ADD COLUMN IF NOT EXISTS tipo_operacao     TEXT,
  ADD COLUMN IF NOT EXISTS area_ha           NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS origem            TEXT DEFAULT 'manual';

-- 3. Expansão da tabela manutencoes
ALTER TABLE manutencoes
  ADD COLUMN IF NOT EXISTS status                      TEXT DEFAULT 'aberta',
  ADD COLUMN IF NOT EXISTS data_prevista               DATE,
  ADD COLUMN IF NOT EXISTS data_realizada              DATE,
  ADD COLUMN IF NOT EXISTS horimetro                   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS proxima_manutencao_horimetro NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS responsavel                 TEXT,
  ADD COLUMN IF NOT EXISTS mao_de_obra_tipo            TEXT,
  ADD COLUMN IF NOT EXISTS mao_de_obra_valor           NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pecas                       JSONB DEFAULT '[]'::jsonb;

-- 4. Expansão da tabela abastecimentos
ALTER TABLE abastecimentos
  ADD COLUMN IF NOT EXISTS preco_litro  NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS fornecedor   TEXT,
  ADD COLUMN IF NOT EXISTS horimetro    NUMERIC(10,2);

-- 5. Nova tabela: planos_manutencao
CREATE TABLE IF NOT EXISTS planos_manutencao (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id        UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  descricao         TEXT NOT NULL,
  intervalo_horas   INTEGER,
  intervalo_dias    INTEGER,
  horimetro_base    NUMERIC(10,2),
  data_base         DATE,
  ativo             BOOLEAN DEFAULT true,
  fazenda_id        UUID NOT NULL REFERENCES fazendas(id)
);

-- RLS para planos_manutencao
ALTER TABLE planos_manutencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_manutencao_fazenda" ON planos_manutencao
  USING (fazenda_id = (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));
```

### 5.2 Impacto em Arquivos Existentes

| Arquivo | Tipo de Alteração | Risco |
|---|---|---|
| `lib/supabase.ts` | Atualização dos tipos `Maquina`, `UsoMaquina`, `Manutencao`, `Abastecimento`; novos tipos `PlanoManutencao`, `PecaManutencao` | Baixo — aditivo |
| `lib/supabase/queries-audit.ts` | Novos métodos nos namespaces existentes; novo namespace `planosManutencao` | Médio — arquivo grande (1.809 linhas) |
| `lib/supabase/safe-delete.ts` | Adicionar `planos_manutencao` na verificação de `deleteMaquinaSafely()` | Baixo |
| `app/dashboard/frota/page.tsx` | Refatoração estrutural para tabs; correção de formulários incompletos | Alto — reescreve lógica existente |
| `supabase/migrations/` | 1 novo arquivo de migration | Médio — irreversível em produção |

### 5.3 Dependências com Outros Módulos

- **Talhões**: Diário de Bordo usa `talhao_id` como FK → tabela `talhoes` deve existir (já existe)
- **Insumos**: Integração de abastecimento já implementada; expansão do campo `fornecedor` não quebra a integração
- **Financeiro**: Despesas de manutenção podem ser registradas em `financeiro` com `referencia_tipo = 'Máquina'` — integração opcional, a ser decidida na implementação
- **Operações Agrícolas (futuro)**: O campo `origem = 'operacao_agricola'` em `uso_maquinas` antecipa essa integração sem bloquear o desenvolvimento atual

### 5.4 Dados Existentes — Compatibilidade

- Máquinas já cadastradas com `tipo` fora dos novos valores aceitos precisam de migration de dados:
  ```sql
  UPDATE maquinas SET status = 'Ativo' WHERE status IS NULL;
  ```
- O campo `identificacao` existente não conflita com os novos campos `placa` e `numero_serie`; pode ser mantido como campo legado ou exibido como "Identificação" no formulário
- `hodometro` em `abastecimentos` coexiste com o novo `horimetro`; ambos são nullable

### 5.5 Restrições Técnicas

- **Recharts**: já é dependência do projeto (usado em silos e financeiro) — pode ser usado nos gráficos sem instalação adicional
- **Exportação PDF**: `jspdf` não está instalado. A implementação inicial deve usar `window.print()` com CSS de impressão. Instalação de nova dependência requer aprovação.
- **Exportação CSV**: implementável sem nova dependência (Blob API nativa)
- **Sem backend/API Routes**: todas as operações são diretas ao Supabase via client-side (padrão do projeto)

---

## 6. ORDEM SUGERIDA DE IMPLEMENTAÇÃO

Para minimizar risco e permitir entregas incrementais:

**Fase 1 — Fundação (Migration + Tipos + Queries)**
1. Criar migration SQL com todas as alterações de schema
2. Atualizar tipagens TypeScript em `lib/supabase.ts`
3. Expandir namespaces em `queries-audit.ts` (novos métodos CRUD)
4. Adicionar funções puras de cálculo em `lib/utils/frota.ts`

**Fase 2 — Correção dos Formulários Incompletos**
5. Implementar formulário de Uso Diário (botão atualmente desabilitado)
6. Corrigir formulário de Manutenção para salvar no BD

**Fase 3 — Reorganização em Tabs**
7. Reestruturar `app/dashboard/frota/page.tsx` em abas com shadcn/ui `Tabs`
8. Distribuir conteúdo existente nas abas correspondentes

**Fase 4 — Novas Funcionalidades**
9. Aba Visão Geral: KPIs + gráficos Recharts + alertas
10. Aba Custos: cálculo de R$/h e tabela de ranking
11. Planos de manutenção preventiva (nova tabela)
12. Implementos como tipo diferenciado no cadastro

**Fase 5 — Relatórios e Exportação**
13. Aba Relatórios com filtros e exportação CSV

---

*Fim do documento. Versão 1.0 — sujeito a revisão antes da implementação.*
