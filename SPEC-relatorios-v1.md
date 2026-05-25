# SPEC — Módulo de Relatórios v1

> **Data**: 2026-05-25  
> **Baseado em**: PRD-relatorios-auditoria.md (auditoria do commit ff2d8c7)  
> **Fase de execução**: Não iniciada

---

## Resumo Executivo

O módulo `/dashboard/relatorios` exporta 6 relatórios Excel com dados reais, mas cobre apenas 6 dos 14 módulos da plataforma, não tem filtro de período, não bloqueia Operadores, e tem um relatório duplicado e um com escopo enganoso. Esta SPEC organiza a evolução em **3 Fases sequenciais**: Fase 1 corrige todos os problemas existentes (saneamento); Fase 2 adiciona os relatórios de maior impacto — Construtor de Rebanho, Mão de Obra e Pastagens; Fase 3 fecha a cobertura com Produtos, Planejamento de Compras, Balanço Forrageiro, integração dos PDFs existentes e Histórico Sanitário. A arquitetura adota estratégia **híbrida**: relatórios simples permanecem client-side (padrão atual); relatórios com joins pesados ou geração de PDF migram para Server Actions em `app/dashboard/relatorios/actions.ts`. A geração de Excel é centralizada em `lib/relatorios/excel-builder.ts` e PDF em `lib/relatorios/pdf-builder.ts`. O Construtor de Rebanho é o componente mais complexo: catálogo tipado `CAMPOS_REBANHO`, engine whitelist-safe, e view Postgres `vw_animais_completos` com LATERAL JOINs que pré-agrega todos os campos derivados por animal. Filtros de data usam obrigatoriamente `toUtcRangeFromLocal()` de `lib/utils/periodo.ts` para garantir cobertura correta no fuso `America/Sao_Paulo`. Ao final das 3 fases, todos os 14 módulos terão cobertura de relatório e os testes Vitest deverão manter 743+ casos passando.

---

## 0. Princípios & Padrões

### Regras do CLAUDE.md aplicáveis a este módulo

- **Nunca `select('*')`** — todas as queries novas devem listar colunas explicitamente
- **`fazenda_id` nunca em INSERT** — trigger preenche automaticamente
- **`payload: any` proibido** — tipagem com interfaces explícitas ou `Omit<T, 'id' | 'fazenda_id'>`
- **RSC por padrão** — `page.tsx` autentica e busca dados; Client Component recebe via props
- **Validação com Zod** em qualquer formulário ou Server Action (mesmo que não haja formulário — apenas filtros)
- **RLS como barreira de segurança** — mas UI deve bloquear Operador antes via `layout.tsx`
- **`formatBRL()` e `formatDate()`** em `lib/utils.ts` — nunca hardcode de formato
- **Sem `eslint-disable react-hooks/exhaustive-deps`** — corrigir dependências com `useCallback`/`useMemo`
- **Sem comentários de "o que faz"** — apenas comentários de "por que" quando necessário
- **Todas as queries com filtro de período devem usar `toUtcRangeFromLocal()` de `lib/utils/periodo.ts`** — proibido usar `from.toISOString()` ou `to.toISOString()` diretamente em filtros de data; garante que o range cubra 00:00:00–23:59:59 no fuso `America/Sao_Paulo`

### Convenção de nomenclatura

| Tipo | Convenção | Exemplo |
|---|---|---|
| Query de relatório | `getRelatorio[Modulo]` | `getRelatorioFrota` |
| Arquivo de query | `lib/supabase/relatorios/[modulo].ts` | `lib/supabase/relatorios/frota.ts` |
| Componente UI | `[Modulo]RelatorioCard.tsx` ou genérico | `RelatorioCard.tsx` |
| Arquivo de export | `[Modulo]-[timestamp].xlsx` ou `.pdf` | `frota-2026-05-25.xlsx` |
| Teste Vitest | `__tests__/relatorios/[alvo].test.ts` | `__tests__/relatorios/rebanho-builder.test.ts` |

### Estrutura de pastas final do módulo

```
app/dashboard/relatorios/
├── layout.tsx                          # NOVO — bloqueia Operador (client-side via useAuth)
├── page.tsx                            # REFATORAR — agrupado em 5 seções
├── RelatoriosClient.tsx                # REFATORAR — usar <RelatorioCard>
├── rebanho/
│   ├── page.tsx                        # NOVO — Construtor de Relatórios de Rebanho (RSC)
│   └── RebanhoBuilderClient.tsx        # NOVO — checkboxes, preview, export
└── balanco-forrageiro/
    └── page.tsx                        # NOVO — opcional se precisar de UI dedicada

components/
├── ui/
│   └── PeriodoFilter.tsx               # NOVO — presets de período reutilizável
└── relatorios/
    ├── RelatorioCard.tsx               # NOVO — card genérico por relatório
    └── ExportButtons.tsx               # NOVO — botões condicionais Excel/PDF

lib/
├── relatorios/
│   ├── excel-builder.ts                # NOVO — wrapper genérico xlsx
│   ├── pdf-builder.ts                  # NOVO — wrapper genérico jsPDF (reutiliza padrão lib/pdf/)
│   └── rebanho-builder.ts              # NOVO — engine do Construtor de Rebanho
├── utils/
│   └── periodo.ts                      # NOVO — toUtcRangeFromLocal() para filtros de data em America/Sao_Paulo
├── supabase/relatorios/
│   ├── insumos.ts                      # NOVO — movimentações por período
│   ├── frota.ts                        # NOVO — multi-tabela com período
│   ├── mao-de-obra.ts                  # NOVO — atividades + KPIs por período
│   ├── pastagens.ts                    # NOVO — pastagens + ocupações + eventos por período
│   ├── produtos.ts                     # NOVO — produtos + movimentações por período
│   ├── planejamento-compras.ts         # NOVO — atividades + lista consolidada
│   ├── balanco-forrageiro.ts           # NOVO — wrapper de lib/utils/balanco-forrageiro.ts
│   ├── rebanho.ts                      # NOVO — query dinâmica whitelist-safe
│   └── sanidade.ts                     # NOVO — histórico sanitário por período
└── types/
    └── relatorios-rebanho.ts           # NOVO — catálogo CAMPOS_REBANHO
```

---

## 1. Arquitetura Geral

### Camadas

```
UI (RelatoriosClient.tsx)
  ↓ chama
Funções de export no Client Component
  ↓ chama (em Server Actions quando necessário, ou diretamente para downloads client-side)
lib/relatorios/excel-builder.ts  |  lib/relatorios/pdf-builder.ts
  ↓ recebe dados de
lib/supabase/relatorios/*.ts
  ↓ acessa (via createSupabaseServerClient ou queries-audit.ts)
Supabase PostgreSQL (RLS ativo)
```

### Estratégia de execução por relatório

| Relatório | Execução | Justificativa |
|---|---|---|
| Silos, Talhões, Insumos (posição), Financeiro | Cliente (`queries-audit.ts`) | Queries simples; padrão atual mantido |
| Movimentação de Insumos, Custo Operacional da Frota completo | Cliente | Joins leves; performance adequada no browser |
| Construtor de Rebanho, Pastagens (4 abas), Mão de Obra (com agregações) | **Server Action** | Joins pesados; evita exposição de schema no bundle cliente; melhora UX de loading |
| PDFs — Indicadores Zootécnicos, Silagem, Balanço Forrageiro, Histórico Sanitário | **Server Action** | Geração de PDF preferível server-side; preparado para futura geração headless |

**Padrão para Server Actions de relatório**: ficam em `app/dashboard/relatorios/actions.ts` (relatórios gerais) ou `app/dashboard/relatorios/rebanho/actions.ts` (Construtor). Retornam dados tipados; o Client Component recebe os dados e chama `gerarExcel()` / `gerarPdf()` localmente para disparar o download.

```typescript
// Padrão de Server Action de relatório:
'use server';
export async function getRelatorioRebanhoAction(
  campos: string[],
  filtros: FiltrosRebanho
): Promise<{ data: AnimalCompleto[]; fazendaNome: string }>;
// Client Component: const result = await getRelatorioRebanhoAction(...); gerarExcel(result);
```

### Componentes reutilizáveis a criar

#### `<PeriodoFilter>` — `components/ui/PeriodoFilter.tsx`

```typescript
export interface PeriodoFilterProps {
  value: { from: Date; to: Date };
  onChange: (periodo: { from: Date; to: Date }) => void;
  defaultPreset?: PeriodoPreset;
  className?: string;
}

export type PeriodoPreset =
  | 'mes_atual'
  | 'ultimos_30'
  | 'ultimos_60'
  | 'ultimos_90'
  | 'ultimos_180'
  | 'ultimos_365'
  | 'ano_corrente'
  | 'personalizado';

// Sem Server Actions — componente puramente client-side
// Retorna { from: Date, to: Date } para consumo pelo componente pai
```

Presets mapeados:
| Preset | from | to |
|---|---|---|
| `mes_atual` | 1º dia do mês corrente | hoje |
| `ultimos_30` | hoje − 30d | hoje |
| `ultimos_60` | hoje − 60d | hoje |
| `ultimos_90` | hoje − 90d | hoje |
| `ultimos_180` | hoje − 180d | hoje |
| `ultimos_365` | hoje − 365d | hoje |
| `ano_corrente` | 01/01/ano corrente | hoje |
| `personalizado` | seleção livre via `<Calendar>` shadcn/ui (date range picker) |

#### `<RelatorioCard>` — `components/relatorios/RelatorioCard.tsx`

```typescript
export interface RelatorioCardProps {
  titulo: string;
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
  formatos: Array<'excel' | 'pdf'>;
  onExport: (formato: 'excel' | 'pdf') => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  href?: string; // se o relatório tem página dedicada (ex: Construtor de Rebanho)
}
```

Estados do card:
- Normal: botões habilitados
- `isLoading`: spinner no botão que está exportando
- `disabled`: card inteiro desabilitado com tooltip explicativo
- Com `href`: o card redireciona para a página ao invés de exportar inline

#### `<ExportButtons>` — `components/relatorios/ExportButtons.tsx`

```typescript
export interface ExportButtonsProps {
  formatos: Array<'excel' | 'pdf'>;
  onExport: (formato: 'excel' | 'pdf') => Promise<void>;
  isLoading?: boolean;
  loadingFormato?: 'excel' | 'pdf';
}
```

Renderiza botão "Excel" (ícone `FileSpreadsheet`) e/ou "PDF" (ícone `FileText`) condicionalmente ao array `formatos`.

### Helpers de geração

#### Excel — `lib/relatorios/excel-builder.ts`

```typescript
import * as XLSX from 'xlsx';

export type ColunaTipo = 'BRL' | 'date' | 'number' | 'percent' | 'text';

export interface ColunaConfig {
  key: string;
  label: string;
  tipo?: ColunaTipo; // default: 'text'
  largura?: number;  // largura em caracteres para autoFit (default: 20)
}

export interface AbaConfig {
  nome: string;
  colunas: ColunaConfig[];
  linhas: Record<string, unknown>[];
}

export interface ExcelMetadata {
  fazendaNome: string;
  periodo?: { from: Date; to: Date };
  geradoEm: Date;
  nomeRelatorio: string;
}

export interface ExcelReportConfig {
  fileName: string;
  sheets: AbaConfig[];
  metadata: ExcelMetadata;
}

export function gerarExcel(config: ExcelReportConfig): void;
// Dispara download via createObjectURL — sem retorno (side effect)
```

**Cabeçalho obrigatório** nas primeiras 3 linhas de cada aba:
- Linha 1: `"GestSilo — [nomeRelatorio]"`
- Linha 2: `"Fazenda: [fazendaNome] | Período: [from dd/MM/yyyy] – [to dd/MM/yyyy] | Gerado em: [geradoEm dd/MM/yyyy HH:mm]"`
- Linha 3: `""` (vazia)
- Linha 4: headers das colunas (em negrito)
- Linha 5+: dados

**Formatação por tipo**:
- `BRL`: `formatBRL(value)` de `lib/utils.ts` — string formatada
- `date`: `format(value, 'dd/MM/yyyy', { locale: ptBR })` — string
- `percent`: `${(value * 100).toFixed(1)}%` — string
- `number`: `value.toLocaleString('pt-BR')` — string
- `text`: string sem transformação

**Tratamento de aba vazia (empty state)**:
- Aba com `linhas.length === 0`: na linha 5 (logo após os headers), gravar célula mesclada cobrindo todas as colunas com o texto `"Nenhum registro encontrado no período selecionado"` em itálico
- A aba **nunca é omitida** — sua presença no workbook indica que a query foi executada mas retornou zero resultados
- Abas sem `periodo` nos metadados (ex: Produtos cadastrados, sem filtro temporal): usar `"Nenhum registro cadastrado"`

**Decisão técnica — formatação BRL no Excel**:
- Opção A (recomendada): gravar valor como string formatada (`"R$ 1.234,56"`) — garante exibição correta em qualquer locale sem depender de formato de célula XLSX
- Opção B: gravar como número + aplicar `numFmt` XLSX — risco de exibição incorreta em Excel configurado com locale diferente
- **Recomendação**: Opção A para consistência visual; perda: não é somável automaticamente no Excel, mas é adequado para relatórios de leitura

#### Utilitário de timezone — `lib/utils/periodo.ts`

```typescript
import { startOfDay, endOfDay } from 'date-fns';
import { tz } from 'date-fns/tz'; // date-fns v4 nativo — não requer pacote externo

const TZ = 'America/Sao_Paulo';

// Converte um range local (Date objects do browser) para strings ISO UTC
// cobrindo 00:00:00 até 23:59:59.999 no fuso America/Sao_Paulo
export function toUtcRangeFromLocal(from: Date, to: Date): {
  gte: string; // ISO string UTC do início do dia 'from' em Brasília
  lte: string; // ISO string UTC do fim do dia 'to' em Brasília
} {
  const fromLocal = startOfDay(from, { in: tz(TZ) });
  const toLocal = endOfDay(to, { in: tz(TZ) });
  return {
    gte: fromLocal.toISOString(),
    lte: toLocal.toISOString(),
  };
}
```

> **Nota de dependência**: `date-fns` v4 (já presente no projeto como `"date-fns": "^4.1.0"`) inclui suporte nativo a timezone via `tz()` de `date-fns/tz`. **Não é necessário instalar `date-fns-tz`** — o pacote separado é para versões anteriores (v2/v3). A API `startOfDay(date, { in: tz(TZ) })` é a forma correta na v4.

**Uso obrigatório** em todas as queries com filtro de período:
```typescript
// ✅ Correto
const { gte, lte } = toUtcRangeFromLocal(from, to);
query.gte('data_evento', gte).lte('data_evento', lte);

// ❌ Proibido
query.gte('data_evento', from.toISOString()).lte('data_evento', to.toISOString());
```

#### PDF — `lib/relatorios/pdf-builder.ts`

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfColunaConfig {
  key: string;
  label: string;
  tipo?: ColunaTipo;
  largura?: number; // largura relativa em % (soma deve ser ≤ 100)
}

export interface PdfSecaoConfig {
  titulo: string;
  colunas: PdfColunaConfig[];
  linhas: Record<string, unknown>[];
}

export interface PdfReportConfig {
  fileName: string;
  titulo: string;
  secoes: PdfSecaoConfig[];
  metadata: ExcelMetadata; // reutiliza mesmo tipo
  orientacao?: 'portrait' | 'landscape'; // default: 'portrait'
}

export function gerarPdf(config: PdfReportConfig): void;
// Dispara download — sem retorno
```

**Cabeçalho padrão GestSilo** (consistente com `lib/pdf/gerarPdfIndicadoresRebanho.ts`):
- Logo/nome "GestSilo" no topo esquerdo
- Título do relatório centralizado
- Fazenda + Período + Data de emissão no topo direito
- Rodapé: número de página + "Gerado por GestSilo"
- Paleta: fundo header `#161616`, texto branco, linhas alternadas com `#f5f5f5`

**Decisão técnica — gráficos no PDF**:
- Opção A: `chart.js` com `canvas.toDataURL()` → imagem PNG inserida no PDF — funciona no browser
- Opção B (recomendada): não incluir gráficos nos PDFs v1; usar apenas tabelas — evita complexidade de renderização canvas, compatível com geração server-side futura
- **Recomendação**: Opção B para v1; reavaliar em v2 se houver demanda específica

---

## 2. FASE 1 — Saneamento (esforço: M)

*Corrigir todos os problemas existentes sem adicionar novos relatórios.*

### 1.1 Bloquear Operador

**Arquivo a criar**: `app/dashboard/relatorios/layout.tsx`

```typescript
'use client';
// Padrão idêntico a app/dashboard/pastagens/layout.tsx e mao-de-obra/layout.tsx
// Usa useAuth() → if (profile?.perfil === 'Operador') router.replace('/dashboard')
```

**Arquivo a alterar**: `components/Sidebar.tsx`

Adicionar `'/dashboard/relatorios'` ao filtro de `visibleGerencialRoutes` para Operador:

```typescript
const visibleGerencialRoutes = profile?.perfil === 'Operador'
  ? gerencialRoutes.filter(
      (r) =>
        r.href !== '/dashboard/mao-de-obra' &&
        r.href !== '/dashboard/balanco-forrageiro' &&
        r.href !== '/dashboard/relatorios'  // ADICIONAR
    )
  : gerencialRoutes;
```

### 1.2 Corrigir `select('*')` em `q.insumos.list()`

**Arquivo**: `lib/supabase/queries-audit.ts` linha 485

Substituir `select('*')` por colunas explícitas:

```typescript
.select(
  'id, nome, unidade_medida, estoque_atual, estoque_minimo, ' +
  'n_pct, p_pct, k_pct, categoria_id, tipo_id, ' +
  'ativo, local_armazen, fornecedor, valor_unitario, ' +
  'fazenda_id, created_at, updated_at'
)
```

**Verificação de consumidores**: antes de alterar, grep por `q.insumos.list(` para mapear todos os chamadores e garantir que nenhum depende de campo não listado. Se houver dependência de campo adicional, adicioná-lo à lista de colunas — não reverter para `select('*')`.

A mesma correção deve ser aplicada em `queries-audit.ts:562` (`insumos.getById()`), mas o escopo desta SPEC é limitado às linhas que afetam o módulo de relatórios. As demais linhas com `select('*')` (652, 777, 787, 803, 818, 829, 860, 1037, 1387, 1409, 1480, 1652, 1676, 1756, 1784) ficam fora do escopo desta SPEC e devem ser tratadas em tarefa separada.

### 1.3 Eliminar duplicata "Inventário de Estoque" e renomear cards

**Arquivo**: `app/dashboard/relatorios/RelatoriosClient.tsx`

Renomeações:
- `"Consumo de Insumos"` → `"Posição de Estoque (Insumos)"` — mantém a lógica atual (snapshot de estoque)
- `"Inventário de Estoque"` → removido do array de relatórios (card eliminado)
- A chave `estoque: exportInsumos` é removida do `exportFunctions`

**Nova função a criar**: `lib/supabase/relatorios/insumos.ts`

```typescript
import { createClient } from '@/lib/supabase/client';

export interface MovimentacaoInsumoRow {
  id: string;
  insumo_id: string;
  insumo_nome: string;
  tipo: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario: number | null;
  valor_total: number | null;
  data_movimentacao: string;
  origem: string | null;
  responsavel: string | null;
  observacoes: string | null;
}

export async function listMovimentacoesInsumoPorPeriodo(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<MovimentacaoInsumoRow[]>;
// Query:
// const { gte, lte } = toUtcRangeFromLocal(from, to); // obrigatório
// supabase
//   .from('movimentacoes_insumo')
//   .select('id, insumo_id, tipo, quantidade, valor_unitario, data_movimentacao, origem, responsavel, observacoes, insumos(nome, unidade_medida)')
//   .eq('fazenda_id', fazendaId)
//   .gte('data_movimentacao', gte)
//   .lte('data_movimentacao', lte)
//   .order('data_movimentacao', { ascending: false })
//   .limit(10000)
// Resultado achatado (join insumos como objeto único → cast as unknown as TipoLocal[])
```

Novo card "Movimentação de Insumos" adicionado na seção Operação com `<PeriodoFilter>`.

### 1.4 Corrigir relatório de Frota

**Renomear**: `"Custo Operacional"` → `"Custo Operacional da Frota"` no label e descrição do card.

**Nova função a criar**: `lib/supabase/relatorios/frota.ts`

```typescript
export interface FrotaMaquinaRow {
  id: string;
  nome: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  identificacao: string | null;
  consumo_medio_litros_hora: number | null;
  valor_aquisicao: number | null;
  status: string;
}

export interface FrotaManutencaoRow {
  id: string;
  maquina_id: string;
  maquina_nome: string;
  tipo: string;
  descricao: string | null;
  data_prevista: string;
  data_realizada: string | null;
  custo: number | null;
  status: string;
  responsavel: string | null;
}

export interface FrotaAbastecimentoRow {
  id: string;
  maquina_id: string;
  maquina_nome: string;
  data: string;
  litros: number;
  valor_por_litro: number | null;
  valor_total: number | null;
  tipo_combustivel: string | null;
  operador: string | null;
}

export interface FrotaUsoRow {
  id: string;
  maquina_id: string;
  maquina_nome: string;
  data_uso: string;
  horas_trabalhadas: number;
  operacao: string | null;
  operador: string | null;
  observacoes: string | null;
}

export interface RelatorioFrotaResult {
  maquinas: FrotaMaquinaRow[];
  manutencoes: FrotaManutencaoRow[];
  abastecimentos: FrotaAbastecimentoRow[];
  usos: FrotaUsoRow[];
}

export async function getRelatorioFrota(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioFrotaResult>;
```

Queries internas (todas sem `select('*')`):
- `maquinas`: `select('id, nome, tipo, marca, modelo, ano, identificacao, consumo_medio_litros_hora, valor_aquisicao, status')` sem filtro de período
- `manutencoes`: `select('id, maquina_id, tipo, descricao, data_prevista, data_realizada, custo, status, responsavel, maquinas(nome)')` com `.gte('data_prevista', from)` e `.lte('data_prevista', to)`
- `abastecimentos`: `select('id, maquina_id, data, litros, valor_por_litro, valor_total, tipo_combustivel, operador, maquinas(nome)')` com filtro de período em `data`
- `uso_maquinas`: `select('id, maquina_id, data_uso, horas_trabalhadas, operacao, operador, observacoes, maquinas(nome)')` com filtro de período em `data_uso`

Excel gerado com 4 abas: "Máquinas", "Manutenções", "Abastecimentos", "Uso".

### 1.5 Adicionar nome do silo na aba Movimentações

**Arquivo**: `app/dashboard/relatorios/RelatoriosClient.tsx` função `exportSilos()`

A query `q.movimentacoesSilo.listBySilos(siloIds)` deve fazer JOIN com `silos(nome)`. Verificar se a função em `lib/supabase/queries-audit.ts` já suporta JOIN; se não, adicionar a coluna `silos(nome)` ao select da função existente ou criar wrapper em `lib/supabase/relatorios/` que faça a query diretamente.

No Excel, substituir:
```typescript
'Silo ID': m.silo_id,
```
por:
```typescript
'Silo': m.silo_nome, // derivado do join
```

### 1.6 Adicionar `<PeriodoFilter>` no Financeiro

**Arquivo**: `app/dashboard/relatorios/RelatoriosClient.tsx`

- Adicionar estado `periodoFinanceiro: { from: Date; to: Date }` com default = últimos 12 meses
- Renderizar `<PeriodoFilter>` acima do card Financeiro (ou dentro do card, antes dos botões)
- Filtrar a query `q.financeiro.list()` com `toUtcRangeFromLocal(from, to)` → `.gte('data', gte).lte('data', lte)`
- Hard limit: `.limit(10000)` na query; se `data.length === 10000`, exibir toast de aviso: `"Limite de 10.000 registros atingido. Refine o período para garantir dados completos."`

### 1.7 Formatação dos Excels existentes com `gerarExcel()`

Todos os 6 relatórios existentes devem ser refatorados para usar `gerarExcel()` de `lib/relatorios/excel-builder.ts`, garantindo:
- Cabeçalho nas linhas 1-3 de cada aba
- Colunas de valor formatadas como `BRL`
- Colunas de data formatadas como `date` (pt-BR)

Refatoração do `RelatoriosClient.tsx`: remover as funções `exportTalhoes`, `exportSilos`, `exportInsumos`, `exportFrota`, `exportFinanceiro` e substituir por chamadas a `gerarExcel()` com `AbaConfig[]` tipadas.

### Critérios de aceite Fase 1

- [ ] Operador é redirecionado para `/dashboard` ao acessar `/dashboard/relatorios`
- [ ] Item "Relatórios" não aparece no Sidebar para Operador
- [ ] `q.insumos.list()` não usa `select('*')` — colunas explícitas
- [ ] Card "Inventário de Estoque" removido da página
- [ ] Card "Consumo de Insumos" renomeado para "Posição de Estoque (Insumos)"
- [ ] Novo card "Movimentação de Insumos" com `<PeriodoFilter>` funciona
- [ ] Card "Custo Operacional da Frota" exporta Excel com 4 abas (Máquinas, Manutenções, Abastecimentos, Uso)
- [ ] Aba "Movimentações" do relatório de Silos exibe nome do silo (não UUID)
- [ ] Relatório Financeiro tem `<PeriodoFilter>` com default últimos 12 meses
- [ ] Toast de aviso aparece quando limite de 10.000 registros é atingido
- [ ] Todos os Excels têm cabeçalho nas linhas 1-3
- [ ] Valores monetários formatados como BRL, datas como dd/MM/yyyy
- [ ] `npm run lint` sem erros
- [ ] `npm run test` — 743+ testes passando
- [ ] `npm run build` sem erros TypeScript

---

## 3. FASE 2 — Cobertura crítica (esforço: G)

*Adicionar relatórios de alto impacto e maior complexidade técnica.*

### 2.1 Construtor de Relatórios de Rebanho ⭐

Este é o componente mais complexo da SPEC. O usuário seleciona campos via checkbox, aplica filtros e exporta Excel ou PDF dinamicamente.

#### Tipo `CampoRebanho` — `lib/types/relatorios-rebanho.ts`

```typescript
export type CategoriaRebanho =
  | 'identificacao'
  | 'reproducao'
  | 'leiteira'
  | 'sanidade'
  | 'pesagem'
  | 'corte'
  | 'datas';

export type TipoCampo = 'string' | 'number' | 'date' | 'currency';

export type FonteCampo =
  | { tipo: 'coluna'; tabela: string; coluna: string }
  | { tipo: 'computed'; fn: (animal: AnimalCompleto) => unknown };

export interface CampoRebanho {
  id: string;           // snake_case único, usado como key no Excel
  label: string;        // label em pt-BR para cabeçalho do Excel
  categoria: CategoriaRebanho;
  tipo: TipoCampo;
  fonte: FonteCampo;
}

// Tipo agregado — resultado da query de rebanho com todos os joins possíveis
export interface AnimalCompleto {
  id: string;
  brinco: string;
  nome: string | null;
  sexo: string;
  raca: string | null;
  categoria: string | null;
  status: string;
  data_nascimento: string | null;
  data_entrada: string | null;
  data_desmame: string | null;
  lote_nome: string | null;
  ultimo_peso_kg: number | null;
  data_ultimo_peso: string | null;
  gmd_90d: number | null;
  producao_media_30d: number | null;
  dias_lactacao: number | null;
  total_lactacao: number | null;
  ultima_cobertura: string | null;
  data_parto_previsto: string | null;
  iep_dias: number | null;
  qtd_partos: number | null;
  status_reprodutivo: string | null;
  ultima_vacinacao: string | null;
  proxima_vacinacao: string | null;
  ultima_vermifugacao: string | null;
  arroba_estimada: number | null;
  projecao_abate: string | null;
}

export const CAMPOS_REBANHO: CampoRebanho[];
// Catálogo completo — ver seção abaixo
```

#### Catálogo `CAMPOS_REBANHO` — campos disponíveis por categoria

**Identificação** (fonte: tabela `animais`):
| id | label | tipo | coluna |
|---|---|---|---|
| `brinco` | Brinco | string | `animais.brinco` |
| `nome` | Nome | string | `animais.nome` |
| `sexo` | Sexo | string | `animais.sexo` |
| `raca` | Raça | string | `animais.raca` |
| `categoria` | Categoria | string | `animais.categoria` |
| `status` | Status | string | `animais.status` |
| `lote` | Lote | string | `lotes.nome` (join) |

**Pesagem** (fonte: `pesos_animal`, computed):
| id | label | tipo |
|---|---|---|
| `ultimo_peso_kg` | Último Peso (kg) | number |
| `data_ultimo_peso` | Data Última Pesagem | date |
| `gmd_90d` | GMD 90d (kg/dia) | number |

**Reprodução** (fonte: `eventos_rebanho`, computed):
| id | label | tipo |
|---|---|---|
| `ultima_cobertura` | Última Cobertura | date |
| `data_parto_previsto` | Data Parto Previsto | date |
| `iep_dias` | IEP (dias) | number |
| `qtd_partos` | Qtd. Partos | number |
| `status_reprodutivo` | Status Reprodutivo | string |

**Leiteira** (fonte: `producoes_leiteiras`, `lactacoes`, computed):
| id | label | tipo |
|---|---|---|
| `producao_media_30d` | Produção Média 30d (L) | number |
| `dias_lactacao` | Dias em Lactação | number |
| `total_lactacao` | Total Lactação Atual (L) | number |

**Sanidade** (fonte: `eventos_sanitarios`, computed):
| id | label | tipo |
|---|---|---|
| `ultima_vacinacao` | Última Vacinação | date |
| `proxima_vacinacao` | Próxima Vacinação | date |
| `ultima_vermifugacao` | Última Vermifugação | date |

**Corte** (fonte: `pesos_animal`, computed):
| id | label | tipo |
|---|---|---|
| `arroba_estimada` | Arroba Estimada (@) | number |
| `projecao_abate` | Projeção de Abate | date |

**Datas** (fonte: `animais`):
| id | label | tipo | coluna |
|---|---|---|---|
| `data_nascimento` | Nascimento | date | `animais.data_nascimento` |
| `data_entrada` | Entrada no Rebanho | date | `animais.data_entrada` |
| `data_desmame` | Desmame | date | `animais.data_desmame` |

#### Engine — `lib/relatorios/rebanho-builder.ts`

```typescript
import type { CampoRebanho, AnimalCompleto } from '@/lib/types/relatorios-rebanho';

export interface FiltrosRebanho {
  lote_id?: string;
  categoria?: string;
  status?: string;
  sexo?: string;
}

// Monta o select seguro baseado nos campos escolhidos
// Nunca usa select('*') — whitelist rígida mapeada de CAMPOS_REBANHO
export function buildRebanhoSelect(campos: CampoRebanho[]): string;

// Projeta apenas os campos selecionados nas linhas retornadas
// Mantém ordem dos campos conforme escolha do usuário
export function buildRebanhoRows(
  animais: AnimalCompleto[],
  campos: CampoRebanho[]
): Record<string, unknown>[];

// Valida que todos os ids estão em CAMPOS_REBANHO
// Retorna objeto com ids válidos, inválidos e flag booleana
export function validarCamposSelecionados(ids: string[]): {
  valid: boolean;       // true se todos os ids são reconhecidos
  validIds: string[];   // ids presentes em CAMPOS_REBANHO
  invalidIds: string[]; // ids não reconhecidos
};
```

**Comportamento de `validarCamposSelecionados`**:
- Em desenvolvimento (`process.env.NODE_ENV !== 'production'`): `console.warn` listando `invalidIds` para facilitar detecção de bugs
- Em produção: silencioso no console, mas `invalidIds` retornado — o chamador pode logar via Sentry se desejar
- `buildRebanhoSelect` e `buildRebanhoRows` operam **exclusivamente sobre `validIds`** — `invalidIds` são descartados antes de chegar às funções de build

**Segurança crítica**: `buildRebanhoSelect` nunca aceita string arbitrária — monta o select exclusivamente a partir de campos presentes em `CAMPOS_REBANHO`. A separação entre `validarCamposSelecionados` → `buildRebanhoSelect` garante que nenhum id desconhecido chega à query.

#### Estratégia de Agregação — View Postgres

Em vez de montar JOINs condicionais no código TypeScript (frágil e difícil de testar), criar uma view materializada no banco que pré-agrega todos os campos derivados por animal.

**Migration a criar**: `supabase/migrations/[timestamp]_vw_animais_completos.sql`

```sql
CREATE OR REPLACE VIEW vw_animais_completos AS
SELECT
  a.id,
  a.brinco,
  a.nome,
  a.sexo,
  a.raca,
  a.categoria,
  a.status,
  a.data_nascimento,
  a.data_entrada,
  a.data_desmame,
  a.fazenda_id,
  l.nome AS lote_nome,
  -- Pesagem: último peso e GMD 90 dias
  ult_peso.peso_kg AS ultimo_peso_kg,
  ult_peso.data_pesagem AS data_ultimo_peso,
  gmd.gmd_90d,
  -- Reprodução: última cobertura, parto previsto, IEP, contagem partos
  repr.ultima_cobertura,
  repr.data_parto_previsto,
  repr.iep_dias,
  repr.qtd_partos,
  repr.status_reprodutivo,
  -- Leiteira: produção média 30d, dias em lactação, total da lactação atual
  leit.producao_media_30d,
  leit.dias_lactacao,
  leit.total_lactacao,
  -- Sanidade: última vacinação, próxima vacinação, última vermifugação
  san.ultima_vacinacao,
  san.proxima_vacinacao,
  san.ultima_vermifugacao,
  -- Corte: arroba estimada, projeção de abate
  corte.arroba_estimada,
  corte.projecao_abate
FROM animais a
LEFT JOIN lotes l ON a.lote_id = l.id
LEFT JOIN LATERAL (
  SELECT peso_kg, data_pesagem
  FROM pesos_animal
  WHERE animal_id = a.id
  ORDER BY data_pesagem DESC
  LIMIT 1
) ult_peso ON true
LEFT JOIN LATERAL (
  SELECT
    ROUND(
      (ult_peso.peso_kg - ant_peso.peso_kg)
        / NULLIF(ult_peso.data_pesagem - ant_peso.data_pesagem, 0),
      3
    ) AS gmd_90d
  FROM pesos_animal ant_peso
  WHERE animal_id = a.id
    AND data_pesagem >= (CURRENT_DATE - INTERVAL '90 days')
    AND data_pesagem < ult_peso.data_pesagem
  ORDER BY data_pesagem DESC
  LIMIT 1
) gmd ON true
LEFT JOIN LATERAL (
  SELECT
    MAX(CASE WHEN tipo = 'cobertura' THEN data_evento END) AS ultima_cobertura,
    MAX(CASE WHEN tipo = 'parto' THEN data_evento + INTERVAL '283 days' END) AS data_parto_previsto,
    COUNT(CASE WHEN tipo = 'parto' THEN 1 END)::int AS qtd_partos,
    -- IEP = média do intervalo entre partos consecutivos (calculado via window function em subquery)
    NULL::numeric AS iep_dias,
    -- Status reprodutivo derivado dos eventos mais recentes
    NULL::text AS status_reprodutivo
  FROM eventos_rebanho
  WHERE animal_id = a.id
) repr ON true
LEFT JOIN LATERAL (
  SELECT
    ROUND(AVG(quantidade_litros), 2) AS producao_media_30d,
    MAX(lac.data_inicio) AS data_inicio_lactacao,
    (CURRENT_DATE - MAX(lac.data_inicio))::int AS dias_lactacao,
    SUM(pl.quantidade_litros) AS total_lactacao
  FROM producoes_leiteiras pl
  JOIN lactacoes lac ON pl.lactacao_id = lac.id
  WHERE lac.animal_id = a.id
    AND pl.data_producao >= (CURRENT_DATE - INTERVAL '30 days')
    AND lac.data_fim IS NULL
) leit ON true
LEFT JOIN LATERAL (
  SELECT
    MAX(CASE WHEN tipo = 'vacinacao' THEN data_evento END) AS ultima_vacinacao,
    MAX(CASE WHEN tipo = 'vacinacao' THEN proxima_data END) AS proxima_vacinacao,
    MAX(CASE WHEN tipo = 'vermifugacao' THEN data_evento END) AS ultima_vermifugacao
  FROM eventos_sanitarios
  WHERE animal_id = a.id
) san ON true
LEFT JOIN LATERAL (
  SELECT
    ROUND(ult_peso.peso_kg / 15.0, 2) AS arroba_estimada,
    NULL::date AS projecao_abate
  FROM (SELECT 1) dummy
) corte ON true;
```

> ⚠️ Os campos `iep_dias`, `status_reprodutivo` e `projecao_abate` são deixados como `NULL` no SQL acima — sua lógica de cálculo é específica do domínio e deve ser completada durante a implementação consultando `lib/calculos/indicadores-rebanho.ts`. Os campos marcados como `computed` no catálogo `CAMPOS_REBANHO` migram para colunas calculadas na view.

**RLS na view**: a view herda a RLS das tabelas base. Para garantir isolamento por fazenda, adicionar filtro:
```sql
-- Ao criar a view, incluir WHERE a.fazenda_id = get_minha_fazenda_id()
-- OU adicionar policy na view se o banco suportar; caso contrário, filtrar na query TypeScript
```

**Impacto nos tipos**: `FonteCampo` simplificada — todos os campos viram `{ tipo: 'coluna'; tabela: 'vw_animais_completos'; coluna: string }`. O caso `computed` é mantido **apenas** para transformações de exibição em JS que não fazem sentido em SQL (ex: concatenação de label, formatação localizada).

```typescript
// FonteCampo atualizada após Ajuste 3:
export type FonteCampo =
  | { tipo: 'coluna'; tabela: 'vw_animais_completos'; coluna: keyof AnimalCompleto }
  | { tipo: 'computed_display'; fn: (animal: AnimalCompleto) => string }; // apenas formatação de exibição
```

#### Query — `lib/supabase/relatorios/rebanho.ts`

```typescript
export async function getAnimaisParaRelatorio(
  fazendaId: string,
  camposIds: string[], // validados previamente por validarCamposSelecionados()
  filtros: FiltrosRebanho
): Promise<AnimalCompleto[]>;
```

Query simplificada — select direto na view `vw_animais_completos`, sem JOINs condicionais:
```typescript
// Colunas derivadas de camposIds via CAMPOS_REBANHO (whitelist)
// Sempre incluir: id, brinco, fazenda_id (base mínima)
supabase
  .from('vw_animais_completos')
  .select(buildRebanhoSelect(camposValidos)) // nunca select('*')
  .eq('fazenda_id', fazendaId)
  // filtros opcionais: .eq('lote_nome', ...) etc.
  .limit(5000)
```

#### UI — `app/dashboard/relatorios/rebanho/page.tsx`

RSC: autentica + busca lotes disponíveis para filtro.

```typescript
// Dados iniciais passados ao Client Component:
interface RebanhoBuilderPageProps {
  lotes: Array<{ id: string; nome: string }>;
  fazendaNome: string;
}
```

#### UI — `app/dashboard/relatorios/rebanho/RebanhoBuilderClient.tsx`

```typescript
'use client';

// Estado local:
// - camposSelecionados: string[] (ids dos CampoRebanho)
// - filtros: FiltrosRebanho
// - preview: AnimalCompleto[] | null (primeiras 10 linhas)
// - isLoadingPreview: boolean
// - isExporting: 'excel' | 'pdf' | null

// Seções da UI:
// 1. CheckboxGroup agrupado por categoria (usa CAMPOS_REBANHO para renderizar)
// 2. Filtros: lote (Select), categoria (Select), status (Select), sexo (Select)
// 3. Botão "Visualizar Preview" — busca 10 primeiros animais
// 4. Tabela de preview (condicional)
// 5. ExportButtons com formatos ['excel', 'pdf']
//    - PDF limitado a máx. 8 colunas; se > 8 selecionadas, avisar e truncar no PDF
```

**Regra de seleção mínima**: ao menos 1 campo deve estar selecionado para habilitar o preview e o export. Campo `brinco` é pré-selecionado como obrigatório e não pode ser desmarcado.

### 2.2 Relatório de Mão de Obra

**Nova função**: `lib/supabase/relatorios/mao-de-obra.ts`

```typescript
export interface MaoObraAtividadeRow {
  id: string;
  data_inicio: string;
  data_fim: string | null;
  tipo_atividade: string;
  descricao: string | null;
  duracao_tipo: string;
  duracao_valor: number;
  custo_calculado: number;
  custo_manual: number | null;
  custo_final: number;
  colaboradores: string; // nomes concatenados com ", "
  vinculo_tipo: string | null; // 'talhao' | 'silo' | 'maquina' | null
  vinculo_nome: string | null;
}

export interface MaoObraResumoColaboradorRow {
  colaborador_nome: string;
  funcao: string;
  vinculo: string;
  qtd_atividades: number;
  custo_total: number;
}

export interface MaoObraResumoTipoRow {
  tipo_atividade: string;
  qtd_atividades: number;
  custo_total: number;
  duracao_total_horas: number;
}

export interface RelatorioMaoObraResult {
  atividades: MaoObraAtividadeRow[];
  resumoColaboradores: MaoObraResumoColaboradorRow[];
  resumoTipos: MaoObraResumoTipoRow[];
  kpis: {
    custo_total: number;
    qtd_atividades: number;
    colaborador_destaque: string | null;
  };
}

export async function getRelatorioMaoObra(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioMaoObraResult>;
```

Queries internas:
- Atividades: `atividades_mao_obra` com select explícito + join `atividades_mao_obra_colaboradores(colaboradores(nome, funcao, vinculo))` + joins condicionais `talhoes(nome)`, `silos(nome)`, `maquinas(nome)` — filtrar por `data_inicio >= from AND data_inicio <= to`
- Resumo colaboradores: agregar client-side sobre o resultado de atividades (evita query extra)
- Resumo tipos: agregar client-side
- KPIs: reutilizar `getKpisMensais()` de `lib/supabase/mao-de-obra.ts` para o mês se período = mês; caso contrário, calcular sobre o resultado

**Formatos**: Excel (3 abas: Atividades, Resumo por Colaborador, Resumo por Tipo) + PDF (1 página com KPIs + tabela resumida)

**PDF de Mão de Obra**: 1 página, cabeçalho padrão GestSilo, 4 KPI boxes no topo, tabela top 10 colaboradores por custo.

### 2.3 Relatório de Pastagens

**Nova função**: `lib/supabase/relatorios/pastagens.ts`

```typescript
export interface PastagemRow {
  id: string;
  nome: string;
  especie: string | null;
  sistema_pastejo: string;
  area_total_ha: number;
  qtd_piquetes: number;
  piquetes_em_pastejo: number;
  piquetes_descanso: number;
}

export interface PiqueteRow {
  id: string;
  pastagem_nome: string;
  nome: string;
  area_ha: number;
  status: string;
  ua_suportada: number | null;
  ua_atual: number | null;
  lote_atual: string | null;
  dias_descanso_ideal: number | null;
}

export interface OcupacaoRow {
  id: string;
  piquete_nome: string;
  pastagem_nome: string;
  lote_nome: string | null;
  data_entrada: string;
  data_saida_prevista: string | null;
  data_saida_real: string | null;
  dias_ocupacao: number | null;
  ua_real: number | null;
  metodo_calculo_ua: string | null;
}

export interface EventoManejoRow {
  id: string;
  piquete_nome: string;
  pastagem_nome: string;
  data_evento: string;
  tipo: string;
  descricao: string | null;
  custo: number | null;
  insumo_nome: string | null;
  maquina_nome: string | null;
}

export interface RelatorioPastagensResult {
  pastagens: PastagemRow[];
  piquetes: PiqueteRow[];
  ocupacoes: OcupacaoRow[];
  eventos: EventoManejoRow[];
}

export async function getRelatorioPastagens(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioPastagensResult>;
```

Queries (sem `select('*')`):
- `pastagens`: `select('id, nome, especie, sistema_pastejo, area_total_ha')` + contagem de piquetes por status em JS
- `piquetes`: `select('id, nome, area_ha, status, ua_suportada, dias_descanso_ideal, pastagens(nome), ocupacoes_piquete(lote_id, data_saida_real)')` — lote atual = ocupação sem `data_saida_real`
- `ocupacoes_piquete`: `select('id, piquete_id, data_entrada, data_saida_prevista, data_saida_real, ua_real, metodo_calculo_ua, lotes(nome), piquetes(nome, pastagens(nome))')` com filtro `data_entrada >= from AND data_entrada <= to`
- `eventos_manejo_pastagem`: `select('id, piquete_id, data_evento, tipo, descricao, custo, insumo_id, maquina_id, piquetes(nome, pastagens(nome)), insumos(nome), maquinas(nome)')` com filtro em `data_evento`

Excel com 4 abas: "Pastagens", "Piquetes", "Ocupações", "Eventos de Manejo".

### Critérios de aceite Fase 2

- [ ] Construtor de Rebanho: seleção de campos funciona com mínimo 1 campo (brinco obrigatório)
- [ ] Preview exibe primeiras 10 linhas com campos selecionados
- [ ] Excel de Rebanho respeita ordem de campos escolhidos pelo usuário
- [ ] PDF de Rebanho truncado a 8 colunas com aviso ao usuário quando > 8 colunas selecionadas
- [ ] `validarCamposSelecionados()` rejeita ids não presentes em `CAMPOS_REBANHO`
- [ ] Mão de Obra: Excel 3 abas com dados reais + PDF 1 página com KPIs
- [ ] Mão de Obra: filtro de período funciona
- [ ] Pastagens: Excel 4 abas com dados reais
- [ ] Pastagens: filtro de período aplicado em Ocupações e Eventos
- [ ] Visualizador acessa todos os novos relatórios (leitura)
- [ ] Operador bloqueado (guard de Fase 1 cobre todos)
- [ ] Testes Vitest para `rebanho-builder.ts`: mínimo 10 casos (campos válidos, campos inválidos, projeção de linhas, filtros, ordem de colunas, campo brinco obrigatório)
- [ ] `npm run lint`, `npm run test` (743+), `npm run build` passam

---

## 4. FASE 3 — Cobertura complementar (esforço: M)

*Fechar os módulos restantes e integrar os PDFs existentes.*

### 3.1 Relatório de Produtos

**Nova função**: `lib/supabase/relatorios/produtos.ts`

```typescript
export interface ProdutoRow {
  id: string;
  nome: string;
  categoria_nome: string | null;
  unidade_medida: string;
  estoque_atual: number;
  estoque_minimo: number | null;
  valor_unitario: number | null;
  ativo: boolean;
}

export interface MovimentacaoProdutoRow {
  id: string;
  produto_nome: string;
  tipo: string;
  tipo_saida: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_total: number | null;
  data_movimentacao: string;
  descricao: string | null;
  responsavel: string | null;
}

export interface RelatorioProdutosResult {
  produtos: ProdutoRow[];
  movimentacoes: MovimentacaoProdutoRow[];
  vendas: MovimentacaoProdutoRow[]; // filtro: tipo_saida = 'VENDA'
}

export async function getRelatorioProdutos(
  fazendaId: string,
  from: Date,
  to: Date
): Promise<RelatorioProdutosResult>;
```

Queries:
- `produtos`: `select('id, nome, estoque_atual, estoque_minimo, unidade_medida, valor_unitario, ativo, categorias_produto(nome)')` sem filtro de período
- `movimentacoes_produto`: `select('id, produto_id, tipo, tipo_saida, quantidade, valor_unitario, valor_total, data_movimentacao, descricao, responsavel, produtos(nome)')` com filtro em `data_movimentacao`; vendas são filtradas em JS (`tipo_saida === 'VENDA'`)

Excel 3 abas: "Produtos", "Movimentações", "Vendas".

### 3.2 Relatório de Planejamento de Compras

**Nova função**: `lib/supabase/relatorios/planejamento-compras.ts`

```typescript
export interface PlanoAtividadeRow {
  id: string;
  nome: string;
  tipo_operacao: string;
  data_prevista: string;
  talhao_nome: string | null;
  status: string;
  qtd_insumos: number;
  insumos_pendentes: number;
  insumos_comprados: number;
}

export interface ListaComprasRow {
  insumo_nome: string;
  unidade_medida: string;
  quantidade_total: number;
  quantidade_comprada: number;
  quantidade_pendente: number;
  status_compra: string; // 'pendente' | 'parcialmente_comprado' | 'comprado'
  atividades_associadas: string; // nomes concatenados
}

export interface RelatorioPlanejamentoResult {
  atividades: PlanoAtividadeRow[];
  listaCompras: ListaComprasRow[];
}

export async function getRelatorioPlanejamentoCompras(
  fazendaId: string
): Promise<RelatorioPlanejamentoResult>;
// Sem filtro de período — planejamento é forward-looking
// Reutilizar calcularLinhasRelatorio() de lib/supabase/planejamento-compras.ts
// para derivar listaCompras a partir dos dados brutos
```

Excel 2 abas: "Atividades Planejadas", "Lista de Compras".

### 3.3 Relatório de Balanço Forrageiro (PDF executivo)

**Nova função**: `lib/supabase/relatorios/balanco-forrageiro.ts`

```typescript
// Wrapper sobre lib/utils/balanco-forrageiro.ts
// Recebe dados já carregados (evita query duplicada se usuário veio da página de balanço)

export interface RelatorioBalancoForrageiro {
  estoqueAtualTonMS: number;
  consumoDiarioMedioKg: number;
  demandaDiariaKg: number;
  autonomiaHistoricaDias: number;
  autonomiaProjetadaDias: number;
  saldoDiarioKg: number;
  detalhesPorCategoria: Array<{
    categoria: string;
    qtdAnimais: number;
    consumoKgDia: number;
    estimado: boolean;
  }>;
  periodoHistorico: { from: Date; to: Date };
  geradoEm: Date;
}

export async function getDadosBalancoForrageiro(
  fazendaId: string,
  diasHistorico: 7 | 30 | 60 | 90
): Promise<RelatorioBalancoForrageiro>;
// Reutiliza getEstoqueSilos(), getConsumoPorPeriodo(), getAnimaisAtivos()
// de lib/supabase/balanco-forrageiro.ts
// Aplica calcularConsumoHistorico(), calcularDemandaProjetada(), calcularComparativo()
// de lib/utils/balanco-forrageiro.ts
```

PDF 1-2 páginas: cabeçalho padrão GestSilo, 3 KPI boxes (estoque, consumo/dia, autonomia), tabela de demanda por categoria, nota sobre período histórico usado.

### 3.4 Integrar PDFs existentes ao módulo central

**`lib/pdf/gerarPdfIndicadoresRebanho.ts`** — chamada existente em `app/dashboard/rebanho/indicadores/`:
- Criar card "Indicadores Zootécnicos" na seção Rebanho da página de relatórios
- Card com `formatos: ['pdf']` e `onExport` que chama a função existente
- Buscar dados reais (mesma query que a página `/indicadores` usa)

**`lib/pdf/gerarPdfPlanejamento.ts`** — chamada existente em `app/dashboard/planejamento-silagem/`:
- Criar card "Planejamento de Silagem" na seção Produção & Forragem
- `onExport` lista os planejamentos da fazenda e exporta o mais recente como default
- Se houver mais de 1 planejamento, exibir `Select` para escolher qual exportar antes de gerar o PDF

```typescript
// Query para listar planejamentos disponíveis:
// supabase
//   .from('planejamentos_silagem')
//   .select('id, nome, created_at')
//   .eq('fazenda_id', fazendaId)
//   .order('created_at', { ascending: false })
//   .limit(20)
```

### 3.5 Relatório de Histórico Sanitário (PDF)

**Nova função**: `lib/supabase/relatorios/sanidade.ts`

```typescript
export interface EventoSanitarioRelatorio {
  id: string;
  animal_brinco: string;
  animal_nome: string | null;
  lote_nome: string | null;
  tipo: string; // 'vacinacao' | 'vermifugacao' | 'tratamento_veterinario' | 'exame_laboratorial'
  data_evento: string;
  produto_medicamento: string | null;
  dose: string | null;
  via_aplicacao: string | null;
  veterinario: string | null;
  observacoes: string | null;
  proxima_data: string | null;
}

export async function getHistoricoSanitario(
  fazendaId: string,
  from: Date,
  to: Date,
  filtros?: {
    lote_id?: string;
    categoria_animal?: string;
    tipo_evento?: string;
  }
): Promise<EventoSanitarioRelatorio[]>;
// Query:
// const { gte, lte } = toUtcRangeFromLocal(from, to); // obrigatório
// supabase
//   .from('eventos_sanitarios')
//   .select('id, tipo, data_evento, produto_medicamento, dose, via_aplicacao, veterinario, observacoes, proxima_data, animais(brinco, nome, categoria, lotes(nome))')
//   .eq('fazenda_id', fazendaId)
//   .gte('data_evento', gte)
//   .lte('data_evento', lte)
//   .order('data_evento', { ascending: false })
//   .limit(10000)
```

PDF estrutura:
- Cabeçalho padrão GestSilo
- Seção por tipo de evento (vacinação → vermifugação → tratamento → exame)
- Dentro de cada seção: tabela com brinco, nome, data, produto, dose, próxima data
- Rodapé com total de eventos por tipo

Filtros disponíveis na UI: período (`<PeriodoFilter>`) + lote (`Select`) + tipo de evento (`Select`). Filtros opcionais — sem filtro exporta todo o período selecionado.

### Reorganização visual da página `/dashboard/relatorios`

#### Matriz consolidada de relatórios

| # | Relatório | Seção | Formato(s) | Filtro de Período | Execução | Fase |
|---|---|---|---|---|---|---|
| 1 | Movimentação de Silos | Operação | Excel (2 abas) | Não | Cliente | 1 |
| 2 | Produtividade por Talhão | Operação | Excel | Não | Cliente | 1 |
| 3 | Custo Operacional da Frota | Operação | Excel (4 abas) | Sim (abas 2–4) | Cliente | 1 |
| 4 | Posição de Estoque (Insumos) | Operação | Excel | Não | Cliente | 1 |
| 5 | Movimentação de Insumos | Operação | Excel | Sim | Cliente | 1 |
| 6 | Financeiro Geral | Financeiro | Excel | Sim (default 12m) | Cliente | 1 |
| 7 | Mão de Obra | Financeiro | Excel (3 abas) + PDF | Sim (default mês) | Server Action | 2 |
| 8 | Construtor de Rebanho | Rebanho | Excel + PDF (≤8 col) | Não (filtros por campo) | Server Action | 2 |
| 9 | Indicadores Zootécnicos | Rebanho | PDF | Não | Server Action | 3 |
| 10 | Histórico Sanitário | Rebanho | PDF | Sim | Server Action | 3 |
| 11 | Pastagens | Produção & Forragem | Excel (4 abas) | Sim (ocupações/eventos) | Server Action | 2 |
| 12 | Balanço Forrageiro | Produção & Forragem | PDF | Sim (7/30/60/90d) | Server Action | 3 |
| 13 | Planejamento de Silagem | Produção & Forragem | PDF | Não | Server Action | 3 |
| 14 | Planejamento de Compras | Planejamento | Excel (2 abas) | Não | Cliente | 3 |
| 15 | Produtos | Planejamento | Excel (3 abas) | Sim (movimentações) | Cliente | 3 |

Agrupar os cards em 5 seções com títulos visíveis:

**1. Operação**
- Movimentação de Silos (Excel)
- Produtividade por Talhão (Excel)
- Custo Operacional da Frota (Excel)
- Posição de Estoque (Insumos) (Excel)
- Movimentação de Insumos (Excel)

**2. Financeiro**
- Financeiro Geral (Excel)
- Mão de Obra (Excel + PDF)

**3. Rebanho**
- Construtor de Relatórios (Excel + PDF) — card com `href` apontando para `/dashboard/relatorios/rebanho`
- Indicadores Zootécnicos (PDF) — integração `lib/pdf/gerarPdfIndicadoresRebanho.ts`
- Histórico Sanitário (PDF)

**4. Produção & Forragem**
- Pastagens (Excel)
- Balanço Forrageiro (PDF)
- Planejamento de Silagem (PDF) — integração `lib/pdf/gerarPdfPlanejamento.ts`

**5. Planejamento**
- Planejamento de Compras (Excel)
- Produtos (Excel)

**Remover**: botão "Configurar Dashboards" (desabilitado sem estimativa, conforme aprovação do Marcio).

### Critérios de aceite Fase 3

- [ ] Produtos: Excel 3 abas (Produtos, Movimentações, Vendas) com dados reais
- [ ] Planejamento de Compras: Excel 2 abas; `calcularLinhasRelatorio()` reutilizada
- [ ] Balanço Forrageiro: PDF gerado com KPIs e tabela de demanda por categoria
- [ ] Card "Indicadores Zootécnicos" gera PDF idêntico ao da página `/rebanho/indicadores`
- [ ] Card "Planejamento de Silagem" lista planejamentos disponíveis e gera PDF do selecionado
- [ ] Histórico Sanitário PDF: agrupado por tipo de evento, filtros funcionam
- [ ] Página de relatórios reorganizada em 5 seções
- [ ] Botão "Configurar Dashboards" removido
- [ ] `npm run lint`, `npm run test` (743+), `npm run build` passam

---

## 5. Testes Vitest mínimos

### `__tests__/relatorios/excel-builder.test.ts`
- Formatação BRL: `gerarExcel` formata valores como "R$ X.XXX,XX"
- Formatação de data: colunas `date` formatadas como "dd/MM/yyyy"
- Cabeçalho: linha 1 contém "GestSilo", linha 2 contém fazendaNome e período
- Multi-aba: workbook tem exatamente N abas para N `sheets`
- Largura de coluna: propriedade `wch` setada conforme `largura` da `ColunaConfig`
- Limite de linhas: não trunca (responsabilidade da query; builder processa o que recebe)
- **Aba vazia**: aba com `linhas: []` gera linha 5 com célula contendo `"Nenhum registro encontrado no período selecionado"` em itálico; aba está presente no workbook

### `__tests__/relatorios/rebanho-builder.test.ts`
- `validarCamposSelecionados(['brinco', 'nome'])` retorna `true`
- `validarCamposSelecionados(['campo_inexistente'])` retorna `false`
- `buildRebanhoRows` projeta apenas os campos selecionados (sem campos extras)
- `buildRebanhoRows` mantém ordem dos campos conforme array de entrada
- `buildRebanhoRows` com campo `brinco` obrigatório: sempre presente no output
- `buildRebanhoRows` com campo computado `gmd_90d`: aplica `fn` corretamente
- `buildRebanhoSelect` não inclui colunas de categorias não selecionadas
- `buildRebanhoSelect` nunca gera string com `*`
- Filtro por lote: resultado contém apenas animais do lote especificado
- Filtro por status: resultado contém apenas animais com status especificado
- Campo `currency` formatado como BRL no output de `buildRebanhoRows`

### `__tests__/relatorios/periodo-filter.test.ts`
- Preset `mes_atual`: `from` é 1º dia do mês corrente, `to` é hoje
- Preset `ultimos_30`: diferença `to - from` é 30 dias
- Preset `ultimos_365`: diferença `to - from` é 365 dias
- Preset `ano_corrente`: `from` é 01/01 do ano corrente
- Preset `personalizado`: aceita datas arbitrárias sem validação de range
- **`toUtcRangeFromLocal` — timezone**: dado `from = 2026-05-01` e `to = 2026-05-25` no browser com locale qualquer, `gte` deve ser `"2026-05-01T03:00:00.000Z"` (meia-noite de Brasília = UTC-3) e `lte` deve ser `"2026-05-26T02:59:59.999Z"` (23:59:59 de Brasília = UTC-3); garante que registros de qualquer horário do dia em Brasília sejam incluídos

---

## 6. Arquivos finais — Índice completo de mudanças

### Arquivos a criar

| Arquivo | Fase | Tipo |
|---|---|---|
| `app/dashboard/relatorios/layout.tsx` | 1 | Novo |
| `app/dashboard/relatorios/rebanho/page.tsx` | 2 | Novo |
| `app/dashboard/relatorios/rebanho/RebanhoBuilderClient.tsx` | 2 | Novo |
| `components/ui/PeriodoFilter.tsx` | 1 | Novo |
| `components/relatorios/RelatorioCard.tsx` | 1 | Novo |
| `components/relatorios/ExportButtons.tsx` | 1 | Novo |
| `lib/relatorios/excel-builder.ts` | 1 | Novo |
| `lib/relatorios/pdf-builder.ts` | 1 | Novo |
| `lib/relatorios/rebanho-builder.ts` | 2 | Novo |
| `lib/supabase/relatorios/insumos.ts` | 1 | Novo |
| `lib/supabase/relatorios/frota.ts` | 1 | Novo |
| `lib/supabase/relatorios/mao-de-obra.ts` | 2 | Novo |
| `lib/supabase/relatorios/pastagens.ts` | 2 | Novo |
| `lib/supabase/relatorios/produtos.ts` | 3 | Novo |
| `lib/supabase/relatorios/planejamento-compras.ts` | 3 | Novo |
| `lib/supabase/relatorios/balanco-forrageiro.ts` | 3 | Novo |
| `lib/supabase/relatorios/rebanho.ts` | 2 | Novo |
| `lib/supabase/relatorios/sanidade.ts` | 3 | Novo |
| `lib/types/relatorios-rebanho.ts` | 2 | Novo |
| `lib/utils/periodo.ts` | 1 | Novo |
| `supabase/migrations/[timestamp]_vw_animais_completos.sql` | 2 | Novo |
| `__tests__/relatorios/excel-builder.test.ts` | 1 | Novo |
| `__tests__/relatorios/rebanho-builder.test.ts` | 2 | Novo |
| `__tests__/relatorios/periodo-filter.test.ts` | 1 | Novo |

### Arquivos a modificar

| Arquivo | Fase | Mudança |
|---|---|---|
| `app/dashboard/relatorios/page.tsx` | 1 | Reorganizar em seções; sem mudança de lógica RSC |
| `app/dashboard/relatorios/RelatoriosClient.tsx` | 1 | Refatorar cards para `<RelatorioCard>`; corrigir duplicata; adicionar `<PeriodoFilter>` no Financeiro |
| `lib/supabase/queries-audit.ts` | 1 | Linha 485: substituir `select('*')` por colunas explícitas em `insumos.list()` |
| `components/Sidebar.tsx` | 1 | Adicionar `'/dashboard/relatorios'` ao filtro de Operador em `visibleGerencialRoutes` |

---

## 7. Riscos e Mitigações

### R1 — Construtor de Rebanho: dados de join condicional podem ser lentos
**Risco**: A query de `getAnimaisParaRelatorio` pode precisar de múltiplos JOINs simultâneos (pesagem + reprodução + leiteira + sanitário) gerando query pesada em fazendas com rebanho grande.  
**Mitigação**: Limitar preview a 10 linhas; export com hard limit de 5.000 animais (toast de aviso). Monitorar via Sentry se query > 3s.

### R2 — `queries-audit.ts:485` tem consumidores desconhecidos
**Risco**: Corrigir `select('*')` para colunas explícitas pode quebrar código que depende de campos não listados (ex: `local_armazen`, `fornecedor`).  
**Mitigação**: Antes de alterar, executar `grep -r "q.insumos.list\|insumos\.list()"` no projeto inteiro; listar todos os campos referenciados; incluir todos na query explícita.

### R3 — Queries de relatório no lado cliente expõem estrutura de tabelas
**Risco**: Queries de `lib/supabase/relatorios/*.ts` rodam no browser; usuário malicioso pode inspecionar e tentar chamar funções fora do contexto.  
**Mitigação**: RLS garante isolamento por `fazenda_id`. Todas as queries filtram por `fazendaId` recebido como parâmetro. Nenhuma query usa service role key no cliente.

### R4 — PDF do Construtor de Rebanho com muitas colunas
**Risco**: Usuário seleciona 15+ campos; PDF fica ilegível com colunas de 2-3 caracteres.  
**Mitigação**: Limitar PDF a máx. 8 colunas; exibir aviso antes de exportar; sugerir usar Excel para tabelas largas.

### R5 — Integração dos PDFs existentes pode divergir da assinatura atual
**Risco**: `gerarPdfIndicadoresRebanho.ts` e `gerarPdfPlanejamento.ts` foram escritos para contextos específicos; podem receber parâmetros que são difíceis de buscar do módulo de relatórios.  
**Mitigação**: Antes da Fase 3, ler as assinaturas das funções existentes; se os parâmetros forem complexos, criar wrappers que buscam os dados necessários e encapsulam a chamada.

### R6 — Filtros de data sem timezone geram corte errado para usuários em Brasília
**Risco**: Usar `date.toISOString()` diretamente em filtros passa hora UTC; um evento registrado às 22h de Brasília (01h UTC do dia seguinte) seria excluído de relatórios do dia correto.  
**Mitigação**: Todo filtro de data obrigatoriamente usa `toUtcRangeFromLocal()` de `lib/utils/periodo.ts`. Regra documentada na Seção 0. Caso de teste em `periodo-filter.test.ts` valida o offset UTC-3. Durante code review, verificar ausência de `.toISOString()` em filtros de data em `lib/supabase/relatorios/*.ts`.

### R7 — View `vw_animais_completos` pode ficar defasada se o schema mudar
**Risco**: Adição de novas tabelas, renomeação de colunas ou mudança na lógica de categorias de rebanho invalida silenciosamente a view sem erro em tempo de compilação.  
**Mitigação**: (1) Documentar no `database-snapshot.md` que a view existe e depende de `animais`, `lotes`, `pesos_animal`, `eventos_rebanho`, `producoes_leiteiras`, `lactacoes`, `eventos_sanitarios`. (2) Qualquer migration que altere essas tabelas deve incluir `CREATE OR REPLACE VIEW vw_animais_completos` com a definição atualizada. (3) Teste Vitest de integração (opcional, Fase 2+): `getAnimaisParaRelatorio` com campos mínimos (`brinco`) retorna array sem erro — smoke test que detecta view quebrada.

---

## 8. Fora do Escopo desta SPEC

- Dashboards interativos (Power BI-like, gráficos clicáveis)
- Relatórios agendados ou envio automático por email (existe cron de alertas, mas não de relatórios)
- Relatórios comparativos entre fazendas (multi-tenancy de leitura cross-fazenda)
- Personalização de cores ou branding nos PDFs gerados
- Exportação em formato CSV separado (Excel cobre o caso de uso)
- Correção das demais ocorrências de `select('*')` em `queries-audit.ts` fora do escopo de insumos (linhas 562, 652, 777, 787, 803, 818, 829, 860, 1037, 1387, 1409, 1480, 1652, 1676, 1756, 1784)
- Paginação do export (hard limit de 10.000 linhas é suficiente para v1)
- Relatório de Talhões expandido com ciclos agrícolas e atividades de campo (escopo atual é cadastro; expansão é item de backlog)
