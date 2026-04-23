# SPEC — Módulo de Gestão de Frota (GestSilo Pro)

**Documento de Especificação Técnica**
Data: 2026-04-23
Referência: PRD-frota.md v1.0
Status: Pronto para implementação

---

## 1. VISÃO GERAL DA ARQUITETURA PROPOSTA

A implementação transforma a `page.tsx` monolítica (1.053 linhas) em uma estrutura modular com 7 abas, cada uma em componente próprio. O estado compartilhado é elevado para um hook customizado, e toda lógica de cálculo é extraída para funções puras testáveis.

### Diagrama de Dependências

```
page.tsx
  └── useFrotaData (hook)           — carrega dados, expõe refresh callbacks
  └── Tabs (shadcn/ui)
       ├── FrotaOverview             — lê dados do hook, sem IO próprio
       ├── FrotaCadastro             ── MaquinaDialog
       ├── FrotaDiarioBordo          ── UsoDialog
       ├── FrotaManutencoes          ── ManutencaoDialog + PlanoManutencaoDialog
       ├── FrotaAbastecimento        ── AbastecimentoDialog
       ├── FrotaCustos               — lib/utils/frota.ts
       └── FrotaRelatorios           — lib/utils/frota.ts (exportações)

lib/utils/frota.ts                  — funções puras, sem IO
lib/supabase.ts                     — tipos (atualizado)
lib/supabase/queries-audit.ts       — queries (expandido)
lib/supabase/safe-delete.ts         — deleção segura (expandido)
supabase/migrations/*.sql           — schema (novo arquivo)
```

---

## 2. ARQUIVOS A CRIAR

### 2.1 — Migration de Banco de Dados

**Arquivo:** `supabase/migrations/20260423_frota_expansao.sql`
**Propósito:** Adicionar todos os novos campos e a tabela `planos_manutencao` ao schema.

**Blocos SQL contidos:**

| Bloco | Descrição |
|-------|-----------|
| `ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS ...` | 9 novos campos: `status`, `numero_serie`, `placa`, `potencia_cv`, `horimetro_atual`, `valor_residual`, `vida_util_horas`, `largura_trabalho_metros`, `tratores_compativeis TEXT[]` |
| `ALTER TABLE maquinas ADD CONSTRAINT maquinas_tipo_check` | CHECK com enum expandido: adiciona `'Ensiladeira'` e `'Plantadeira/Semeadora'` e `'Implemento'` |
| `ALTER TABLE maquinas ADD CONSTRAINT maquinas_status_check` | CHECK enum: `'Ativo'`, `'Em manutenção'`, `'Parado'`, `'Vendido'` |
| `UPDATE maquinas SET status = 'Ativo' WHERE status IS NULL` | Backfill de dados existentes |
| `ALTER TABLE uso_maquinas ADD COLUMN IF NOT EXISTS ...` | 6 novos campos: `horimetro_inicio`, `horimetro_fim`, `implemento_id UUID REFERENCES maquinas(id)`, `talhao_id UUID REFERENCES talhoes(id)`, `tipo_operacao TEXT`, `area_ha NUMERIC(10,4)`, `origem TEXT DEFAULT 'manual'` |
| `ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS ...` | 8 novos campos: `status TEXT DEFAULT 'aberta'`, `data_prevista DATE`, `data_realizada DATE`, `horimetro NUMERIC(10,2)`, `proxima_manutencao_horimetro NUMERIC(10,2)`, `responsavel TEXT`, `mao_de_obra_tipo TEXT`, `mao_de_obra_valor NUMERIC(10,2)`, `pecas JSONB DEFAULT '[]'` |
| `ALTER TABLE abastecimentos ADD COLUMN IF NOT EXISTS ...` | 3 novos campos: `preco_litro NUMERIC(8,3)`, `fornecedor TEXT`, `horimetro NUMERIC(10,2)` |
| `CREATE TABLE IF NOT EXISTS planos_manutencao (...)` | Nova tabela com: `id UUID`, `maquina_id UUID FK`, `descricao TEXT NOT NULL`, `intervalo_horas INTEGER`, `intervalo_dias INTEGER`, `horimetro_base NUMERIC(10,2)`, `data_base DATE`, `ativo BOOLEAN DEFAULT true`, `fazenda_id UUID FK`, `created_at TIMESTAMPTZ DEFAULT NOW()` |
| `ALTER TABLE planos_manutencao ENABLE ROW LEVEL SECURITY` | RLS obrigatório |
| `CREATE POLICY "planos_manutencao_fazenda"` | Policy de isolamento por `fazenda_id` via `profiles.fazenda_id = auth.uid()` |

---

### 2.2 — Funções Puras de Cálculo

**Arquivo:** `lib/utils/frota.ts`
**Propósito:** Centralizar toda lógica de cálculo de custo operacional em funções puras, testáveis via `npm run test`, sem dependência de IO.

**Funções exportadas:**

| Função | Assinatura | O que calcula |
|--------|-----------|---------------|
| `calcularDepreciacaoPorHora` | `(maquina: Maquina, horasNoAno: number): number` | `(valor_aquisicao - valor_residual) / vida_util_anos / horasNoAno`; retorna 0 se dados insuficientes |
| `calcularCustoCombustivelPorHora` | `(abastecimentos: Abastecimento[], horasTotais: number): number` | `SUM(valor) / horasTotais`; retorna 0 se horasTotais = 0 |
| `calcularCustoManutencaoPorHora` | `(manutencoes: Manutencao[], horasTotais: number): number` | `SUM(custo) / horasTotais` |
| `calcularCustoTotalPorHora` | `(params: CustoHoraParams): CustoHoraResult` | Agrega as três funções acima; retorna `{ fixo, combustivel, manutencao, total }` |
| `calcularConsumoMedioReal` | `(abastecimentos: Abastecimento[], usos: UsoMaquina[]): number \| null` | `SUM(litros) / SUM(horas)`; null se denominador 0 |
| `detectarAnomaliaConsumo` | `(consumoAtual: number, mediaHistorica: number, limiar?: number): boolean` | `consumoAtual > mediaHistorica * (1 + limiar)`, default limiar 0.3 (30%) |
| `calcularRendimentoOperacional` | `(uso: UsoMaquina): number \| null` | `area_ha / horas`; null se dados ausentes |
| `verificarAlertaPlanoManutencao` | `(plano: PlanoManutencao, horimetroAtual: number): AlertaManutencao` | Retorna `{ emAlerta, urgente, horasRestantes }` baseado em intervalo_horas e horimetro_base |
| `filtrarManutencoesPorPeriodo` | `(manutencoes: Manutencao[], inicio: Date, fim: Date): Manutencao[]` | Filtra por `data_realizada` ou `data_prevista` no intervalo |
| `agruparCustosPorMaquina` | `(maquinas, abastecimentos, manutencoes, usos): CustoMaquinaRow[]` | Tabela final para aba Custos: uma linha por máquina com todos os componentes de custo |

**Tipos internos definidos neste arquivo:**
```typescript
type CustoHoraParams = { maquina: Maquina; abastecimentos: Abastecimento[]; manutencoes: Manutencao[]; horasNoAno: number }
type CustoHoraResult = { fixo: number; combustivel: number; manutencao: number; total: number }
type AlertaManutencao = { emAlerta: boolean; urgente: boolean; horasRestantes: number | null }
type CustoMaquinaRow = { maquina: Maquina; custoHora: CustoHoraResult; horasTotais: number; ranking: number }
```

---

### 2.3 — Hook de Dados

**Arquivo:** `app/dashboard/frota/hooks/useFrotaData.ts`
**Propósito:** Centralizar carregamento de dados para todas as abas, com lazy loading por aba, evitando N fetches redundantes na `page.tsx`.

**Estrutura exportada:**
```typescript
export function useFrotaData(activeTab: string) {
  // Estado: maquinas, usos, manutencoes, abastecimentos, planosManutencao, talhoes
  // loadingStates por tab
  // Retorna: { maquinas, usos, manutencoes, abastecimentos, planosManutencao, talhoes, loading, refresh }
}
```

**Lógica de lazy loading:**
- `maquinas` carrega imediatamente (necessário para todas as abas)
- `usos`, `manutencoes`, `abastecimentos` carregam quando a aba respectiva é ativada pela primeira vez
- `planosManutencao` carrega junto com `manutencoes`
- `talhoes` carrega quando aba `uso` é ativada (necessário para o select de talhão)
- Flag `initialized[tab]` impede re-fetch ao trocar entre abas já carregadas

**Callbacks de refresh expostos:** `refreshMaquinas`, `refreshUsos`, `refreshManutencoes`, `refreshAbastecimentos`, `refreshPlanos`

---

### 2.4 — Componente: Aba Visão Geral

**Arquivo:** `app/dashboard/frota/components/FrotaOverview.tsx`
**Propósito:** Dashboard com KPIs, alertas e gráficos da frota.

**Props:**
```typescript
interface FrotaOverviewProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  manutencoes: Manutencao[];
  abastecimentos: Abastecimento[];
  planosManutencao: PlanoManutencao[];
  loading: boolean;
}
```

**Seções renderizadas:**

1. **Grid de KPI cards** (5 cards):
   - "Máquinas Ativas" — `count(maquinas.filter(m => m.status === 'Ativo'))` — ícone `Truck`
   - "Em Manutenção" — `count(maquinas.filter(m => m.status === 'Em manutenção'))` — ícone `Wrench`
   - "Horas no Mês" — `sum(usos[mesAtual].horas)` — ícone `Clock`
   - "Diesel no Mês" — `sum(abastecimentos[mesAtual].litros) L` + `R$ valor` — ícone `Fuel`
   - "Custo Operacional" — `sum(manutencoes[mesAtual].custo) + sum(abastecimentos[mesAtual].valor)` — ícone `DollarSign`

2. **Seção de Alertas** (lista de badges vermelhos/amarelos):
   - Manutenções com `data_prevista < hoje` e `status !== 'concluída'`
   - Planos onde `verificarAlertaPlanoManutencao` retorna `emAlerta = true`
   - Empty state: "Nenhum alerta pendente"

3. **Gráficos Recharts** (3):
   - `BarChart` — Horas trabalhadas por máquina no mês (eixo X: nome, eixo Y: horas)
   - `BarChart` — Custo operacional por máquina no mês (empilhado: combustível + manutenção)
   - `LineChart` — Consumo de diesel nos últimos 6 meses (eixo X: mês/ano, eixo Y: litros)

**Skeleton loaders:** Grid 5-cards skeleton + placeholder de gráfico enquanto `loading = true`

---

### 2.5 — Componente: Aba Cadastro

**Arquivo:** `app/dashboard/frota/components/FrotaCadastro.tsx`
**Propósito:** Grid de cards de máquinas/implementos com ações de criar, editar e excluir.

**Props:**
```typescript
interface FrotaCadastroProps {
  maquinas: Maquina[];
  loading: boolean;
  onRefresh: () => void;
}
```

**Blocos renderizados:**

1. **Barra de ações**: botão "Nova Máquina" + filtro por tipo (Select: Todos, Trator, Implemento, etc.)
2. **Grid responsivo** (1 → 2 → 3 colunas): card por máquina com:
   - Badge de status com cor semântica (verde=Ativo, amarelo=Em manutenção, vermelho=Parado, cinza=Vendido)
   - Depreciação calculada via `calcularDepreciacaoPorHora` (mantém lógica atual)
   - Menu de ações (editar, excluir)
3. **Empty state**: "Nenhuma máquina cadastrada. [Cadastrar primeira máquina]"

**Dispara `<MaquinaDialog>` para criação e edição.**

---

### 2.6 — Componente: Aba Diário de Bordo

**Arquivo:** `app/dashboard/frota/components/FrotaDiarioBordo.tsx`
**Propósito:** Registro e histórico de operações diárias por máquina.

**Props:**
```typescript
interface FrotaDiarioBordoProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  talhoes: Talhao[];
  loading: boolean;
  onRefresh: () => void;
}
```

**Blocos renderizados:**

1. **Barra de ações**: botão "Registrar Uso" + filtros (máquina: Select, período: DateRangePicker)
2. **Tabela de histórico** com colunas: Data, Máquina, Operador, Atividade, Horímetro Início, Horímetro Fim, Horas, Implemento, Talhão, Rendimento (ha/h calculado via `calcularRendimentoOperacional`), Ações (excluir)
3. **Empty state** por filtro ativo

**Dispara `<UsoDialog>` para novo registro.**

---

### 2.7 — Componente: Aba Manutenções

**Arquivo:** `app/dashboard/frota/components/FrotaManutencoes.tsx`
**Propósito:** Controle de manutenções preventivas e corretivas, e gestão de planos de manutenção.

**Props:**
```typescript
interface FrotaManutencoesProps {
  maquinas: Maquina[];
  manutencoes: Manutencao[];
  planosManutencao: PlanoManutencao[];
  loading: boolean;
  onRefreshManutencoes: () => void;
  onRefreshPlanos: () => void;
  onRefreshMaquinas: () => void;
}
```

**Blocos renderizados:**

1. **Sub-tabs internas** (Tabs menores dentro da aba): "Registros" e "Planos de Manutenção"
2. **Sub-aba Registros**:
   - Barra de ações: "Nova Manutenção" + filtros (máquina, tipo, status, período)
   - Tabela com colunas: Data Prevista, Data Realizada, Máquina, Tipo (badge), Descrição, Status (badge), Responsável, Custo Total, Ações (editar, excluir)
3. **Sub-aba Planos**:
   - Barra de ações: "Novo Plano"
   - Lista de planos por máquina com indicador de progresso (horímetro atual vs. próxima revisão)
   - Badge de alerta quando próximo do intervalo (via `verificarAlertaPlanoManutencao`)

**Dispara `<ManutencaoDialog>` e `<PlanoManutencaoDialog>`.**

---

### 2.8 — Componente: Aba Abastecimento

**Arquivo:** `app/dashboard/frota/components/FrotaAbastecimento.tsx`
**Propósito:** Registro de consumo de diesel e indicadores de eficiência. Migra conteúdo existente da aba "Abastecimentos" da page.tsx atual.

**Props:**
```typescript
interface FrotaAbastecimentoProps {
  maquinas: Maquina[];
  abastecimentos: Abastecimento[];
  usos: UsoMaquina[];
  loading: boolean;
  onRefresh: () => void;
}
```

**Blocos renderizados:**

1. **Cards de indicadores** (linha superior):
   - Consumo médio real por máquina selecionada (via `calcularConsumoMedioReal`)
   - Alerta de anomalia se `detectarAnomaliaConsumo` retornar `true` (badge vermelho)
2. **Barra de ações**: "Registrar Abastecimento" + filtro por máquina
3. **Tabela**: Data, Máquina, Combustível, Litros, Preço/L, Valor Total, Fornecedor, Horímetro, Ações (excluir)
4. **Empty state**

**Migra o formulário de abastecimento existente para `<AbastecimentoDialog>`, mantendo integração com insumos.**

---

### 2.9 — Componente: Aba Custos

**Arquivo:** `app/dashboard/frota/components/FrotaCustos.tsx`
**Propósito:** Análise de custo operacional por hora (R$/h) por máquina.

**Props:**
```typescript
interface FrotaCustosProps {
  maquinas: Maquina[];
  abastecimentos: Abastecimento[];
  manutencoes: Manutencao[];
  usos: UsoMaquina[];
  loading: boolean;
}
```

**Blocos renderizados:**

1. **Seletor de período**: DateRangePicker que refiltra os dados passados (sem nova query)
2. **Tabela de custo por máquina** com colunas: Máquina, Tipo, Horas Totais, Deprec./h, Comb./h, Manut./h, **Total R$/h** (destaque), Ranking (posição ordinal)
   - Ordenável por Total R$/h (clique no cabeçalho)
   - Dados calculados via `agruparCustosPorMaquina`
3. **Card de comparativo terceirização**: input manual "Preço de mercado (R$/h)" → calcula diferença (próprio vs. terceiro) por máquina selecionada
4. **Empty state**: "Cadastre máquinas com valor de aquisição para ver análise de custos"

---

### 2.10 — Componente: Aba Relatórios

**Arquivo:** `app/dashboard/frota/components/FrotaRelatorios.tsx`
**Propósito:** Exportação de dados da frota em CSV e impressão.

**Props:**
```typescript
interface FrotaRelatoriosProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  manutencoes: Manutencao[];
  abastecimentos: Abastecimento[];
  loading: boolean;
}
```

**Blocos renderizados:**

1. **Seletor de tipo de relatório** (RadioGroup):
   - "Relatório por Máquina": Select de máquina + DateRangePicker → filtra todos os dados da máquina
   - "Relatório Consolidado da Frota": sem filtro de máquina, todos os ativos
   - "Histórico de Manutenções": filtro por tipo e período
   - "Ranking por Custo/Hora": tabela de custos completa
2. **Preview em tabela** do relatório selecionado com dados filtrados
3. **Botões de exportação**:
   - "Exportar CSV" → função `exportarCSV(dados, nomeArquivo)` (Blob API, sem dependência)
   - "Imprimir / PDF" → `window.print()` com classe CSS `print:block` no preview

**Função auxiliar `exportarCSV`:** Converte array de objetos em string CSV com headers, cria Blob, dispara download via `URL.createObjectURL`.

---

### 2.11 — Dialog: Formulário de Máquina

**Arquivo:** `app/dashboard/frota/components/dialogs/MaquinaDialog.tsx`
**Propósito:** Criar e editar máquinas/implementos. Substitui e expande o dialog de cadastro atual.

**Props:**
```typescript
interface MaquinaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquina?: Maquina;        // undefined = modo criação
  onSuccess: () => void;
}
```

**Schema Zod `maquinaSchema`:**
- Campos obrigatórios: `nome` (string min 2), `tipo` (enum expandido), `status` (enum)
- Campos opcionais: `marca`, `modelo`, `ano`, `identificacao`, `placa`, `numero_serie`, `potencia_cv`, `horimetro_atual`, `consumo_medio_lh`, `valor_aquisicao`, `data_aquisicao`, `vida_util_anos`, `valor_residual`, `vida_util_horas`
- Campos condicionais via `superRefine`: `consumo_medio_lh` obrigatório se `tipo === 'Trator'`
- Campos de implemento: `largura_trabalho_metros`, `tratores_compativeis` — visíveis apenas se `tipo === 'Implemento'`

**Seções do formulário** (visualmente separadas por `<Separator>` com label):
1. "Dados Básicos": nome, tipo, status
2. "Identificação": marca, modelo, ano, placa, numero_serie (campo `identificacao` mantido como "Patrimônio")
3. "Operação": potencia_cv (oculto se Implemento), horimetro_atual (oculto se Implemento), consumo_medio_lh (oculto se Implemento)
4. "Implemento" (visível apenas se tipo = Implemento): largura_trabalho_metros, tratores_compativeis
5. "Aquisição e Depreciação": valor_aquisicao, data_aquisicao, vida_util_anos, valor_residual, vida_util_horas

**Ação submit**: chama `q.maquinas.create(payload)` ou `q.maquinas.update(id, payload)` → toast success/error → `onSuccess()`

---

### 2.12 — Dialog: Registro de Uso Diário

**Arquivo:** `app/dashboard/frota/components/dialogs/UsoDialog.tsx`
**Propósito:** Registrar operação diária de máquina. Corrige o botão atualmente desabilitado (`aria-disabled="true"`).

**Props:**
```typescript
interface UsoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  talhoes: Talhao[];
  onSuccess: () => void;
}
```

**Schema Zod `usoSchema`:**
- Obrigatórios: `maquina_id`, `data`
- Opcionais: `operador`, `atividade`, `tipo_operacao` (enum), `horimetro_inicio`, `horimetro_fim`, `km`, `implemento_id`, `talhao_id`, `area_ha`, `origem` (default `'manual'`)
- `horas` calculado automaticamente: `watch(['horimetro_inicio', 'horimetro_fim'])` → `horas = fim - inicio` (exibido como campo somente-leitura)

**Campos do formulário:**
- Select de máquina (filtra apenas `status !== 'Vendido'`)
- Data (DatePicker)
- Operador (Input)
- Tipo de operação (Select): 'Operação agrícola' | 'Manutenção' | 'Deslocamento' | 'Limpeza de área' | 'Outros'
- Horímetro início / fim (NumberInput) + campo calculado "Horas trabalhadas" (readonly)
- Hodômetro km (NumberInput)
- Implemento acoplado (Select filtrando `maquinas WHERE tipo = 'Implemento'`)
- Talhão (Select)
- Área ha (NumberInput)
- Atividade / Observações (Textarea)

**Ação submit**: `q.usoMaquinas.create(payload)` → toast → `onSuccess()`

---

### 2.13 — Dialog: Manutenção

**Arquivo:** `app/dashboard/frota/components/dialogs/ManutencaoDialog.tsx`
**Propósito:** Registrar e editar manutenções corretivas e preventivas. Corrige o formulário que atualmente não salva no BD.

**Props:**
```typescript
interface ManutencaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  manutencao?: Manutencao;  // undefined = criação
  onSuccess: () => void;
  onMaquinaStatusChange?: (maquinaId: string, status: Maquina['status']) => void;
}
```

**Schema Zod `manutencaoSchema`:**
- Obrigatórios: `maquina_id`, `tipo`, `descricao`
- Opcionais: `data_prevista`, `data_realizada`, `status` (default `'aberta'`), `horimetro`, `proxima_manutencao`, `proxima_manutencao_horimetro`, `responsavel`, `mao_de_obra_tipo`, `mao_de_obra_valor`, `pecas`
- `custo` calculado: `mao_de_obra_valor + sum(pecas[].quantidade * pecas[].valor_unitario)` (campo readonly)

**Campos do formulário:**
- Select de máquina
- Tipo (RadioGroup: Preventiva | Corretiva)
- Status (Select: aberta | em andamento | concluída)
- Datas: prevista + realizada (ambas DatePicker)
- Horímetro na manutenção (NumberInput)
- Próxima manutenção: data (DatePicker) + horímetro (NumberInput)
- Responsável + tipo mão de obra (Select: própria | terceirizada) + valor mão de obra
- **Lista dinâmica de peças**: botão "Adicionar Peça" → linha com `descrição`, `quantidade`, `valor_unitário`; botão "×" por linha; total calculado
- Campo readonly "Custo Total" (soma automática)
- Atividade / Observações

**Efeito colateral**: se `tipo === 'Corretiva'` e status muda para `'em andamento'`, chamar `q.maquinas.update(maquinaId, { status: 'Em manutenção' })`; se status muda para `'concluída'`, reverter para `'Ativo'`. Isso é comunicado ao pai via `onMaquinaStatusChange`.

**Ação submit**: `q.manutencoes.create(payload)` ou `q.manutencoes.update(id, payload)` → toast → `onSuccess()`

---

### 2.14 — Dialog: Abastecimento

**Arquivo:** `app/dashboard/frota/components/dialogs/AbastecimentoDialog.tsx`
**Propósito:** Migrar o formulário de abastecimento existente da `page.tsx` para componente isolado, adicionando novos campos.

**Props:**
```typescript
interface AbastecimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  onSuccess: () => void;
}
```

**Schema Zod `abastecimentoSchema`:** Mantém campos existentes (`maquina_id`, `data`, `combustivel`, `litros`, `valor`) + adiciona `preco_litro` (auto-calcula `valor = litros * preco_litro`), `fornecedor`, `horimetro`, `hodometro`, `registrar_como_saida` (boolean, integração insumos).

**Lógica de `preco_litro`**: `watch(['litros', 'preco_litro'])` → `setValue('valor', litros * preco_litro)` em tempo real via `useEffect`.

**Integração com insumos**: mantida exatamente como está na `page.tsx` atual (não alterar a lógica de `movimentacao_insumo`).

---

### 2.15 — Dialog: Plano de Manutenção

**Arquivo:** `app/dashboard/frota/components/dialogs/PlanoManutencaoDialog.tsx`
**Propósito:** Criar e editar planos de manutenção preventiva.

**Props:**
```typescript
interface PlanoManutencaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maquinas: Maquina[];
  plano?: PlanoManutencao;
  onSuccess: () => void;
}
```

**Schema Zod `planoSchema`:**
- Obrigatórios: `maquina_id`, `descricao`
- `intervalo_horas` ou `intervalo_dias`: pelo menos um deve ser preenchido (validado via `superRefine`)
- Opcionais: `horimetro_base`, `data_base`, `ativo` (default `true`)

**Campos do formulário:**
- Select de máquina (filtra apenas autopropelidos: `tipo !== 'Implemento'`)
- Descrição do serviço (Input)
- Modo de intervalo (RadioGroup: "Por horímetro" | "Por tempo" | "Ambos")
- Intervalo em horas (NumberInput — visível se modo inclui horímetro)
- Intervalo em dias (NumberInput — visível se modo inclui tempo)
- Horímetro base (NumberInput — último serviço realizado)
- Data base (DatePicker — último serviço realizado)
- Toggle "Plano ativo"

**Ação submit**: `q.planosManutencao.create(payload)` ou `q.planosManutencao.update(id, payload)` → toast → `onSuccess()`

---

## 3. ARQUIVOS A MODIFICAR

### 3.1 — Tipagens TypeScript

**Arquivo:** [lib/supabase.ts](lib/supabase.ts)
**O que alterar:** Atualizar 4 tipos existentes e adicionar 2 novos tipos.

**Tipo `Maquina`** — adicionar campos:
```typescript
status: 'Ativo' | 'Em manutenção' | 'Parado' | 'Vendido';
tipo: 'Trator' | 'Ensiladeira' | 'Colheitadeira' | 'Pulverizador' | 'Plantadeira/Semeadora' | 'Implemento' | 'Caminhão' | 'Outros';
numero_serie: string | null;
placa: string | null;
potencia_cv: number | null;
horimetro_atual: number | null;
valor_residual: number | null;
vida_util_horas: number | null;
largura_trabalho_metros: number | null;
tratores_compativeis: string[] | null;
```

**Tipo `UsoMaquina`** — adicionar campos:
```typescript
horimetro_inicio: number | null;
horimetro_fim: number | null;
implemento_id: string | null;
talhao_id: string | null;
tipo_operacao: string | null;
area_ha: number | null;
origem: 'manual' | 'operacao_agricola' | null;
```

**Tipo `Manutencao`** — adicionar campos:
```typescript
status: 'aberta' | 'em andamento' | 'concluída';
data_prevista: string | null;
data_realizada: string | null;
horimetro: number | null;
proxima_manutencao_horimetro: number | null;
responsavel: string | null;
mao_de_obra_tipo: 'própria' | 'terceirizada' | null;
mao_de_obra_valor: number | null;
pecas: PecaManutencao[] | null;
```

**Tipo `Abastecimento`** — adicionar campos:
```typescript
preco_litro: number | null;
fornecedor: string | null;
horimetro: number | null;
```

**Novo tipo `PlanoManutencao`:**
```typescript
export type PlanoManutencao = {
  id: string;
  maquina_id: string;
  descricao: string;
  intervalo_horas: number | null;
  intervalo_dias: number | null;
  horimetro_base: number | null;
  data_base: string | null;
  ativo: boolean;
  fazenda_id: string;
};
```

**Novo tipo `PecaManutencao`:**
```typescript
export type PecaManutencao = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
};
```

---

### 3.2 — Camada de Queries

**Arquivo:** [lib/supabase/queries-audit.ts](lib/supabase/queries-audit.ts)
**O que alterar:** Expandir 4 namespaces existentes e adicionar 1 novo.

**`q.maquinas.list()`** — atualizar o `select()` para incluir todos os novos campos: `status, numero_serie, placa, potencia_cv, horimetro_atual, valor_residual, vida_util_horas, largura_trabalho_metros, tratores_compativeis`

**`q.maquinas.create(payload)` e `q.maquinas.update(id, payload)`** — aceitar `Partial<Maquina>` com os novos campos. Os tipos já cobrirão isso após a atualização de `lib/supabase.ts`.

**`q.usoMaquinas.create(payload)`** — aceitar novos campos: `horimetro_inicio`, `horimetro_fim`, `implemento_id`, `talhao_id`, `tipo_operacao`, `area_ha`, `origem`

**`q.usoMaquinas.listByMaquina()` e `listByMaquinas()`** — atualizar `select()` para listar os novos campos

**`q.manutencoes.create(payload)` e `q.manutencoes.update(id, payload)`** — aceitar novos campos: `status`, `data_prevista`, `data_realizada`, `horimetro`, `proxima_manutencao_horimetro`, `responsavel`, `mao_de_obra_tipo`, `mao_de_obra_valor`, `pecas`

**`q.manutencoes.listByMaquina()` e `listByMaquinas()`** — atualizar `select()` para novos campos

**`q.abastecimentos.create(payload)`** — aceitar novos campos: `preco_litro`, `fornecedor`, `horimetro`

**`q.abastecimentos.listByMaquina()` e `listByMaquinas()`** — atualizar `select()` para novos campos

**Novo namespace `q.planosManutencao`** — adicionar ao final do arquivo, seguindo o padrão existente:
```typescript
// Namespace: q.planosManutencao
planosManutencao: {
  listByMaquina(maquinaId: string): Promise<PlanoManutencao[]>
    // SELECT id,maquina_id,descricao,intervalo_horas,intervalo_dias,
    //        horimetro_base,data_base,ativo,fazenda_id
    // WHERE maquina_id = maquinaId AND fazenda_id validado
  
  listByMaquinas(maquinaIds: string[]): Promise<PlanoManutencao[]>
    // Batch: .in('maquina_id', maquinaIds)
  
  create(payload: Omit<PlanoManutencao, 'id'>): Promise<PlanoManutencao>
    // INSERT com fazenda_id via getFazendaId()
  
  update(id: string, payload: Partial<PlanoManutencao>): Promise<void>
    // UPDATE com validação de fazenda_id
  
  remove(id: string): Promise<void>
    // DELETE com validação de fazenda_id
}
```

---

### 3.3 — Deleção Segura

**Arquivo:** [lib/supabase/safe-delete.ts](lib/supabase/safe-delete.ts)
**O que alterar:** Atualizar `deleteMaquinaSafely()` para também verificar `planos_manutencao`.

**Mudança específica:**
- Adicionar ao bloco de contagens existente: query que conta `planos_manutencao WHERE maquina_id = maquinaId`
- Incluir `planosCount` no objeto retornado
- Atualizar a condição `permitir`: bloquear se `planosCount > 0` (ou opcionalmente deletar em cascata, já que a migration usa `ON DELETE CASCADE` — verificar comportamento desejado e alinhar com usuário)
- Atualizar mensagem `mensagem` para mencionar planos de manutenção quando aplicável

---

### 3.4 — Página Principal da Frota

**Arquivo:** [app/dashboard/frota/page.tsx](app/dashboard/frota/page.tsx)
**O que alterar:** Refatoração estrutural. A página passa de 1.053 linhas de componente monolítico para ~150 linhas de container com Tabs.

**O que REMOVER da page.tsx:**
- Todos os estados locais de dados (`maquinas`, `usos`, `manutencoes`, `abastecimentos`) — migram para `useFrotaData`
- Todos os `useEffect` de fetch — migram para `useFrotaData`
- Todo JSX das seções de listagem e formulários — migram para componentes de aba
- Schemas Zod inline — migram para os dialogs respectivos
- Funções de submit inline — migram para os dialogs respectivos

**O que MANTER/ADICIONAR na page.tsx:**
- Import do hook `useFrotaData`
- Import dos 7 componentes de aba
- Estrutura `<Tabs>` do shadcn/ui com `defaultValue="visao-geral"`
- Passagem de props do hook para cada aba
- Header com título "Gestão de Frota" e breadcrumb (mantido como está)
- `'use client'` directive

**Estrutura final aproximada da page.tsx:**
```tsx
'use client'
export default function FrotaPage() {
  const { activeTab, setActiveTab } = useState('visao-geral')
  const { maquinas, usos, manutencoes, abastecimentos, planosManutencao, talhoes, loading, refresh } = useFrotaData(activeTab)

  return (
    <div>
      {/* Header existente */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList> {/* 7 TabsTrigger */} </TabsList>
        <TabsContent value="visao-geral"><FrotaOverview ... /></TabsContent>
        <TabsContent value="cadastro"><FrotaCadastro ... /></TabsContent>
        {/* ... demais abas */}
      </Tabs>
    </div>
  )
}
```

---

## 4. MAPA COMPLETO DE ARQUIVOS

### Arquivos a CRIAR (15 arquivos)

| # | Caminho | Tipo |
|---|---------|------|
| 1 | `supabase/migrations/20260423_frota_expansao.sql` | SQL Migration |
| 2 | `lib/utils/frota.ts` | Utilitários TS |
| 3 | `app/dashboard/frota/hooks/useFrotaData.ts` | Hook React |
| 4 | `app/dashboard/frota/components/FrotaOverview.tsx` | Componente |
| 5 | `app/dashboard/frota/components/FrotaCadastro.tsx` | Componente |
| 6 | `app/dashboard/frota/components/FrotaDiarioBordo.tsx` | Componente |
| 7 | `app/dashboard/frota/components/FrotaManutencoes.tsx` | Componente |
| 8 | `app/dashboard/frota/components/FrotaAbastecimento.tsx` | Componente |
| 9 | `app/dashboard/frota/components/FrotaCustos.tsx` | Componente |
| 10 | `app/dashboard/frota/components/FrotaRelatorios.tsx` | Componente |
| 11 | `app/dashboard/frota/components/dialogs/MaquinaDialog.tsx` | Dialog |
| 12 | `app/dashboard/frota/components/dialogs/UsoDialog.tsx` | Dialog |
| 13 | `app/dashboard/frota/components/dialogs/ManutencaoDialog.tsx` | Dialog |
| 14 | `app/dashboard/frota/components/dialogs/AbastecimentoDialog.tsx` | Dialog |
| 15 | `app/dashboard/frota/components/dialogs/PlanoManutencaoDialog.tsx` | Dialog |

### Arquivos a MODIFICAR (4 arquivos)

| # | Caminho | Escopo da Alteração |
|---|---------|---------------------|
| 1 | `lib/supabase.ts` | Tipos: atualizar 4, criar 2 |
| 2 | `lib/supabase/queries-audit.ts` | Queries: expandir 4 namespaces, criar 1 novo |
| 3 | `lib/supabase/safe-delete.ts` | Adicionar checagem de `planos_manutencao` |
| 4 | `app/dashboard/frota/page.tsx` | Refatoração estrutural para tabs |

**Total: 19 arquivos afetados**

---

## 5. ORDEM DE IMPLEMENTAÇÃO

A ordem é projetada para minimizar risco: cada fase entrega código funcional e não quebra o que está funcionando.

### Fase 1 — Fundação (sem UI ainda)

**Objetivo:** Schema, tipos e queries prontos. Nada visível ao usuário muda.

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | `supabase/migrations/20260423_frota_expansao.sql` | Criar e aplicar migration |
| 2 | `lib/supabase.ts` | Atualizar tipos (`Maquina`, `UsoMaquina`, `Manutencao`, `Abastecimento`, `PlanoManutencao`, `PecaManutencao`) |
| 3 | `lib/supabase/queries-audit.ts` | Expandir selects existentes + adicionar `q.planosManutencao` |
| 4 | `lib/supabase/safe-delete.ts` | Adicionar checagem de planos |
| 5 | `lib/utils/frota.ts` | Implementar todas as funções puras |

**Validação da fase:** `npm run build` sem erros de tipo; `npm run test` para as funções puras de `frota.ts`.

---

### Fase 2 — Correção dos Formulários Incompletos

**Objetivo:** Tornar funcionais os dois formulários quebrados sem alterar estrutura visual.

| Passo | Arquivo | Ação |
|-------|---------|------|
| 6 | `app/dashboard/frota/components/dialogs/UsoDialog.tsx` | Criar dialog com schema Zod + submit funcional |
| 7 | `app/dashboard/frota/components/dialogs/ManutencaoDialog.tsx` | Criar dialog com schema Zod + submit funcional (com lista de peças) |
| 8 | `app/dashboard/frota/page.tsx` | **Substituição cirúrgica**: trocar os dois dialogs quebrados pelos novos componentes, sem alterar o restante da estrutura da página |

**Validação da fase:** Testar manualmente o registro de uso diário e manutenção no browser.

---

### Fase 3 — Reorganização em Tabs

**Objetivo:** Reestruturar a página sem quebrar funcionalidades existentes.

| Passo | Arquivo | Ação |
|-------|---------|------|
| 9 | `app/dashboard/frota/components/dialogs/AbastecimentoDialog.tsx` | Migrar formulário de abastecimento existente |
| 10 | `app/dashboard/frota/components/dialogs/MaquinaDialog.tsx` | Migrar + expandir formulário de cadastro existente |
| 11 | `app/dashboard/frota/hooks/useFrotaData.ts` | Criar hook centralizando todos os fetches |
| 12 | `app/dashboard/frota/components/FrotaCadastro.tsx` | Migrar grid de máquinas + usar `MaquinaDialog` |
| 13 | `app/dashboard/frota/components/FrotaDiarioBordo.tsx` | Migrar tabela de uso + usar `UsoDialog` |
| 14 | `app/dashboard/frota/components/FrotaManutencoes.tsx` | Migrar tabela de manutenções + usar `ManutencaoDialog` |
| 15 | `app/dashboard/frota/components/FrotaAbastecimento.tsx` | Migrar tabela de abastecimento + usar `AbastecimentoDialog` |
| 16 | `app/dashboard/frota/page.tsx` | **Refatoração completa**: substituir corpo por estrutura de Tabs + `useFrotaData` |

**Validação da fase:** `npm run build`; testar todas as funcionalidades das abas Cadastro, Diário, Manutenções e Abastecimento.

---

### Fase 4 — Novas Funcionalidades

**Objetivo:** Implementar as funcionalidades inexistentes.

| Passo | Arquivo | Ação |
|-------|---------|------|
| 17 | `app/dashboard/frota/components/FrotaOverview.tsx` | Criar aba Visão Geral com KPIs, alertas e gráficos Recharts |
| 18 | `app/dashboard/frota/components/FrotaCustos.tsx` | Criar aba de análise de custo/hora |
| 19 | `app/dashboard/frota/components/dialogs/PlanoManutencaoDialog.tsx` | Criar dialog de planos preventivos |
| 20 | `app/dashboard/frota/components/FrotaManutencoes.tsx` | Adicionar sub-aba de planos + integrar `PlanoManutencaoDialog` |

**Validação da fase:** Testar KPIs contra dados reais; verificar cálculos de custo/hora com máquinas que têm `valor_aquisicao` preenchido.

---

### Fase 5 — Relatórios e Exportação

**Objetivo:** Fechar o módulo com capacidade de exportação.

| Passo | Arquivo | Ação |
|-------|---------|------|
| 21 | `app/dashboard/frota/components/FrotaRelatorios.tsx` | Criar aba de relatórios com preview e exportação CSV |

**Validação da fase:** Testar exportação CSV de cada tipo de relatório; testar `window.print()` e verificar CSS de impressão.

---

## 6. RISCOS E PONTOS DE ATENÇÃO

| Risco | Mitigação |
|-------|-----------|
| Migration irreversível em produção | Executar em ambiente de staging primeiro; todos os `ALTER TABLE` usam `IF NOT EXISTS` |
| `queries-audit.ts` já tem 1.809 linhas — risco de conflito em merge | Implementar namespaces novos no final do arquivo, não intercalado |
| Integração frota→insumos pode quebrar ao migrar `AbastecimentoDialog` | Mover o código de integração sem alteração lógica; adicionar teste manual |
| `page.tsx` atual pode ter estado local que não está óbvio na leitura | Fazer extração incremental (Fase 2 antes da Fase 3) para descobrir dependências ocultas |
| Recharts pode ter API diferente da versão instalada | Verificar versão em `package.json` e consultar docs antes de implementar gráficos |

---

*Fim do documento. SPEC v1.0 — baseado em PRD-frota.md v1.0*
