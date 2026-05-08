# SPEC — Módulo de Rebanho — Fase 4: Indicadores Zootécnicos

**Data**: 2026-05-05  
**Status**: Especificação Técnica Completa — Baseado em PRD v1.0  
**Versão**: 1.0  
**Baseado em**: 01-prd.md (v1.0)

---

## Decisões Confirmadas (Arquiteturais)

| Decisão | PRD | Confirmado | Motivo |
|---------|-----|-----------|--------|
| **Tipo Exploração** | Adicionar em `fazendas` | `DEFAULT 'MISTO'` (não LEITE) | MVP flexível para corte+leite+misto |
| **Indicadores Cobertura** | 15 indicadores (7 comuns + 1 corte + 2 leite) | Confirma 14 (MVPFase 4) | P205 é Fase 4.1 |
| **Sexo Crías** | Campo novo em `eventos_rebanho` | Sim, `sexo_crias TEXT` | Cálculo taxa natalidade separado |
| **Cálculo Server-side** | Agregações via SQL | Sim, com índices + cache 5min | Performance <2s garantida |
| **Views SQL** | Materializar se necessário | Avaliar por indicador (seção 1.4) | Evitar SELECT COUNT(*) em tight loop |
| **Export PDF** | Usar jsPDF + autoTable (padrão existente) | Confirmado | Reutiliza `gerarPdfPlanejamento.ts` como template |
| **Export CSV** | papaparse ou nativo | Nativo Blob + UTF-8 BOM | Sem deps adicionais |
| **Cache Server Action** | `revalidateTag('indicadores')` + hash filtros | Server 5min (revalidateTag); sessionStorage filtros UI apenas | Dados sempre servidor, cliente só persiste seleções (UX) |
| **Authenticação** | `supabase.auth.getUser()` server-side | Não `useAuth()` client hook | RLS aplicada no banco automático |

---

## 1. Migration SQL Completa

### 1.1 Coluna `tipo_exploracao` em `fazendas`

```sql
-- supabase/migrations/20260505_tipo_exploracao_fazendas.sql
ALTER TABLE fazendas
ADD COLUMN tipo_exploracao TEXT CHECK (tipo_exploracao IN ('CORTE', 'LEITE', 'MISTO')) DEFAULT 'MISTO';

COMMENT ON COLUMN fazendas.tipo_exploracao IS 'Tipo de exploração: CORTE, LEITE ou MISTO. Define quais indicadores são exibidos.';
```

**Padrão**: `DEFAULT 'MISTO'` para máxima compatibilidade (não força reorientação)

### 1.2 Coluna `sexo_crias` em `eventos_rebanho`

```sql
-- supabase/migrations/20260505_sexo_crias_eventos.sql
ALTER TABLE eventos_rebanho
ADD COLUMN sexo_crias TEXT CHECK (sexo_crias IN ('Macho', 'Fêmea', 'Misto')) DEFAULT NULL;

COMMENT ON COLUMN eventos_rebanho.sexo_crias IS 'Sexo da(s) cria(s) em evento de parto. Obrigatório para registrar corretamente bezerros e calcular taxa de natalidade. Misto = gemelar com sexos diferentes.';
```

**Padrão**: NULL até preenchimento (Operador preenche ao registrar parto)

**Backfill para Partos Históricos**:
- Partos com `sexo_crias = NULL` (registrados antes da migration) contam como bezerros sem distinção de sexo
- Taxa de natalidade total continua válida (usa COUNT(*) sem filtro sexo)
- Análises segmentadas por sexo (ex: "Bezerras nascidas") ignoram registros NULL
- Operador pode editar parto antigo para preencher sexo_crias após migration

### 1.3 Validação Pré-Sprint

- [ ] Tabela `pesos_animal` existe com colunas: `id, fazenda_id, animal_id, data_pesagem, peso_kg, observacoes, created_at`
- [ ] Tabela `eventos_rebanho` tem: `id, tipo (enum), data_evento, animal_id, fazenda_id`
- [ ] Tabela `animais` tem: `id, categoria, status, status_reprodutivo (Fase 2), data_nascimento, sexo`
- [ ] Tabela `lotes` existe com: `id, fazenda_id, nome`
- [ ] RLS ativo em todas as 4 tabelas acima

---

## 2. Índices SQL (Pré-requisito Performance)

```sql
-- Pesagens: velocidade crítica para GMD
CREATE INDEX IF NOT EXISTS idx_pesos_animal_animal_id_data_pesagem
  ON pesos_animal(animal_id, data_pesagem DESC)
  WHERE deleted_at IS NULL;

-- Eventos: filtro por tipo + data (natalidade, mortalidade, partos)
CREATE INDEX IF NOT EXISTS idx_eventos_rebanho_tipo_data_evento_animal_id
  ON eventos_rebanho(tipo, data_evento DESC, animal_id)
  WHERE deleted_at IS NULL;

-- Animais: composição por categoria + status
CREATE INDEX IF NOT EXISTS idx_animais_status_categoria_fazenda_id
  ON animais(status, categoria, fazenda_id)
  WHERE deleted_at IS NULL;
```

**Esperado**: Cálculo de GMD <100ms, Taxa Natalidade <200ms em rebanho 1000 animais

---

## 3. Tipos TypeScript

### 3.1 Enums & Tipos Base

```typescript
// Tipo de Exploração (Fazenda)
type TipoExploracao = 'CORTE' | 'LEITE' | 'MISTO';

// Períodos Preset (UI Filtros)
type PeriodoPreset = '30d' | '90d' | '365d' | 'safra' | 'custom';

// Estados do Card Indicador
type EstadoCard = 'LOADING' | 'OK' | 'INSUFFICIENT_DATA' | 'ERROR';

// Tipo Lote (reutilizado de types/rebanho.ts — Fase 1)
// Definição: { id: string; fazenda_id: string; nome: string; ... }

// Resultado genérico de cálculo
type ResultadoIndicador<T> = {
  valor: T | null;
  estado: EstadoCard;
  erro?: string;
  atualizadoEm?: Date;
  trend?: 'up' | 'down' | 'stable';
  trendValor?: number;
};
```

### 3.2 Filtros

```typescript
interface FiltrosIndicadores {
  periodo: PeriodoPreset;
  dataInicio?: Date;  // se periodo = 'custom'
  dataFim?: Date;     // se periodo = 'custom'
  lotes?: string[];   // multi-select de lote_id
  categorias?: string[];  // multi-select (Bezerra, Vaca, etc.)
  fazendaId?: string;  // se multi-fazenda
}
```

### 3.3 Indicadores (Resultado Aggregado)

```typescript
interface IndicadorRebanho {
  gmd: ResultadoIndicador<number>;
  taxaNatalidade: ResultadoIndicador<number>;  // %
  taxaMortalidadeGeral: ResultadoIndicador<number>;  // %
  taxaMortalidadeBezerros: ResultadoIndicador<number>;  // %
  taxaDescarte: ResultadoIndicador<number>;  // %
  taxaPrenhez: ResultadoIndicador<number>;  // %
  iep: ResultadoIndicador<number>;  // dias
  ipp: ResultadoIndicador<number>;  // meses
  pesoMedioPorCategoria: ResultadoIndicador<Record<string, number>>;  // kg
  taxaReposicao: ResultadoIndicador<number>;  // %
  evolucaoEfetivo: ResultadoIndicador<Array<{ data: Date; quantidade: number }>>;
  composicaoRebanho: ResultadoIndicador<Record<string, number>>;  // %
  
  // Específicos Corte (se tipo_exploracao IN ('CORTE', 'MISTO'))
  taxaDesfrute?: ResultadoIndicador<number>;  // %
  
  // Específicos Leite (se tipo_exploracao IN ('LEITE', 'MISTO'))
  percentualVacasLactacao?: ResultadoIndicador<number>;  // %
  periodoSecoMedio?: ResultadoIndicador<number>;  // dias
}

interface RelatorioRebanho {
  fazendaId: string;
  fazendaNome: string;
  tipoExploracao: TipoExploracao;
  periodo: { dataInicio: Date; dataFim: Date };
  filtros: FiltrosIndicadores;
  indicadores: IndicadorRebanho;
  geradoEm: Date;
  geradoPor: string;  // usuario_id
}
```

### 3.4 Comparativo Entre Lotes

```typescript
interface ComparativoLotes {
  loteId: string;
  loteNome: string;
  quantidadeAnimais: number;
  gmd?: number;
  taxaNatalidade?: number;
  taxaPrenhez?: number;
  pesoMedio?: number;
  trend?: 'up' | 'down' | 'stable';
  trendValor?: number;
}
```

---

## 4. Funções de Cálculo em `lib/supabase/rebanho.ts`

Todas funções retornam `ResultadoIndicador<T>` ou error thrown.

### Comuns (Corte + Leite)

```typescript
// GMD: (Peso_Final - Peso_Inicial) / dias
// Requer ≥2 pesagens no período
async function calcularGMD(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Taxa Natalidade: (Bezerros nascidos) / (Fêmeas aptas) * 100
async function calcularTaxaNatalidade(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Taxa Mortalidade Geral: (Óbitos total) / (Efetivo médio) * 100
async function calcularTaxaMortalidadeGeral(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Taxa Mortalidade Bezerros <Desmame: (Óbitos bezerros) / (Total nascidos) * 100
async function calcularTaxaMortalidadeBezerros(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Taxa Descarte: (Descartados) / (Efetivo inicial) * 100
async function calcularTaxaDescarte(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Taxa Prenhez: (Fêmeas prenhas) / (Fêmeas aptas reprodução) * 100
async function calcularTaxaPrenhez(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// IEP: Média(Data_Parto_N - Data_Parto_N-1) últimos 12 meses, requer ≥2 partos
async function calcularIEP(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// IPP: Data_Primeiro_Parto - Data_Nascimento (em meses), requer ≥1 parto confirmado
async function calcularIPP(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Peso Médio por Categoria: Média(Peso_Atual) GROUP BY Categoria
async function calcularPesoMedioPorCategoria(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<Record<string, number>>>

// Taxa Reposição: (Novilhas 1ª cobertura) / (Fêmeas descartadas) * 100
async function calcularTaxaReposicao(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Evolução do Efetivo: COUNT(Animais Ativos) por mês (série temporal)
async function calcularEvolucaoEfetivo(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<Array<{ data: Date; quantidade: number }>>>

// Composição do Rebanho: (Qtd Categoria) / (Total) * 100 GROUP BY Categoria
async function calcularComposicaoRebanho(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<Record<string, number>>>
```

### Específicos Corte

```typescript
// Taxa de Desfrute: (Animais vendidos/descartados) / (Efetivo médio) * 100
// Período: 12 meses (override interno se filtros.periodo for menor — semanticamente desfrute é anual)
async function calcularTaxaDesfrute(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>
```

### Específicos Leite

```typescript
// % Vacas em Lactação: (Vacas lactação) / (Total fêmeas > 2 anos) * 100
async function calcularPercentualVacasLactacao(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>

// Período Seco Médio: Média(Data_Secagem - Data_Último_Parto), requer evento "secagem"
async function calcularPeriodoSecoMedio(
  filtros: FiltrosIndicadores
): Promise<ResultadoIndicador<number>>
```

### Agregador Principal

```typescript
// Calcula TODOS os 14 indicadores (retorna IndicadorRebanho completo)
// Filtragem por tipo_exploracao: consulta fazendas.tipo_exploracao
// Indicadores não aplicáveis ficam undefined (ex: taxaDesfrute se tipo='LEITE')
// Componente renderiza com guards: if (indicadores.taxaDesfrute) { ... }
// Cache via revalidateTag('indicadores', hashFiltros) — Server 5min
async function calcularIndicadores(
  filtros: FiltrosIndicadores
): Promise<IndicadorRebanho>
```

### Comparativo

```typescript
// Top N lotes por indicador (GMD, Taxa Natalidade, etc.)
// Ranking com trend comparado ao período anterior
async function calcularComparativoLotes(
  filtros: FiltrosIndicadores,
  indicador: 'gmd' | 'natalidade' | 'prenhez' | 'peso',
  top: number = 5
): Promise<ComparativoLotes[]>
```

### Relatório Completo (com Metadados)

```typescript
// Monta RelatorioRebanho com todos metadados para PDF/exportação
// Busca fazenda (nome), tipo_exploracao, usuário logado
// Combina indicadores + filtros + metadados
// Cache 5min via revalidateTag('indicadores', hashFiltros)
async function getRelatorioCompletoAction(
  filtros: FiltrosIndicadores
): Promise<RelatorioRebanho>
  // Validar filtros com Zod
  // Fetch supabase.auth.getUser() (usuário logado)
  // Fetch fazenda.nome + tipo_exploracao
  // Chamar calcularIndicadores(filtros)
  // Retornar RelatorioRebanho (inclui geradoPor + geradoEm)
  // Usado por exportarIndicadoresPDFAction() e exportarIndicadoresCSVAction()
```

---

## 5. Server Actions em `app/dashboard/rebanho/indicadores/actions.ts`

### Autenticação & RLS

```typescript
// Padrão: supabase.auth.getUser() (server-side, não useAuth() client)
// RLS filtra automaticamente por fazenda_id via get_minha_fazenda_id()
// Sem cliente enviar fazenda_id manualmente

async function getIndicadoresAction(filtros: FiltrosIndicadores): Promise<IndicadorRebanho>
  // Validar filtros com Zod
  // Validar datas (dataFim >= dataInicio)
  // Validar período preset (30d, 90d, 365d, safra) ou custom
  // Chamar calcularIndicadores(filtros)
  // Cache com revalidateTag('indicadores') + hash de filtros (5 min)
  // Retornar IndicadorRebanho completo

async function getComparativoLotesAction(
  filtros: FiltrosIndicadores,
  indicador: 'gmd' | 'natalidade' | 'prenhez' | 'peso'
): Promise<ComparativoLotes[]>
  // Validar indicador é válido para tipo_exploracao
  // Chamar calcularComparativoLotes()
  // Cache 5 min
  // Retornar array ranking

async function exportarIndicadoresCSVAction(
  filtros: FiltrosIndicadores
): Promise<Blob>
  // Fetch IndicadorRebanho completo
  // Montar CSV: Indicador,Período,Lote(s),Valor,Unidade,Benchmark,Status
  // Encoding UTF-8 BOM
  // Separador `;` (Excel BR)
  // Retornar Blob para download

async function exportarIndicadoresPDFAction(
  filtros: FiltrosIndicadores
): Promise<Blob>
  // Fetch IndicadorRebanho + RelatorioRebanho
  // Usar jsPDF + autoTable (template: gerarPdfPlanejamento.ts)
  // Seções: Header, Filtros, Tabela Indicadores, Gráficos (3-4), Rodapé
  // Gerado em <3s para rebanho 500 animais
  // Retornar Blob para download
```

---

## 6. Validações com Zod

```typescript
// Schemas em lib/validations/rebanho.ts

FiltrosIndicadoresSchema = z.object({
  periodo: z.enum(['30d', '90d', '365d', 'safra', 'custom']),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
  lotes: z.array(z.string().uuid()).optional(),
  categorias: z.array(
    z.enum(['Bezerra', 'Vaca', 'Novilha', 'Touro', 'Touril', 'Boi', 'Novilho'])  // enum baseado tipos_rebanho sistema
  ).optional(),
  fazendaId: z.string().uuid().optional(),
}).refine(
  (d) => d.periodo !== 'custom' || (d.dataInicio && d.dataFim),
  'dataInicio e dataFim obrigatórios se periodo = custom'
).refine(
  (d) => !d.dataInicio || !d.dataFim || d.dataFim >= d.dataInicio,
  'dataFim deve ser >= dataInicio'
)
```

---

## 7. Views SQL (Avaliar Necessidade)

### Decisão Arquitetural

**Não usar VIEW materializada por padrão**. Em vez disso:
- Cálculos via indexed queries SQL (fast) em Server Actions
- Resultado cacheado em Server via `revalidateTag('indicadores', hashFiltros)` (5 min)
- Sessão cliente mantém apenas **filtros UI** em `sessionStorage` (período, lotes, categorias) — NÃO dados de indicadores
- Dados sempre vêm do servidor (cacheado lá), cliente não armazena resultados

**Usar VIEW apenas se**:
- Consulta é muito complexa (múltiplas JOINs + aggregações)
- Reutilizada por >2 Server Actions
- Performance <100ms crítica para UX

**Candidatos (Fase 4 avaliação)**:
- `vw_indicadores_base` (GMD + Natalidade + Mortalidade precomputadas) — Considerar se >10 queries / request
- `vw_rebanho_snapshot` (COUNT por categoria + status) — Considerar se chamado >3x por request

---

## 8. Componentes React

### 8.1 `CardIndicador.tsx` (use client + 4 Estados)

```typescript
interface CardIndicadorProps {
  nome: string;
  valor: ResultadoIndicador<number>;
  unidade: string;
  benchmark?: { min: number; max: number };
  icon?: React.ReactNode;
  onRefresh?: () => void;
}

// Estados renderizados:
// 1. LOADING: skeleton placeholder (shimmer)
// 2. OK: valor + unidade + benchmark status (✓/⚠️/✗) + trend (↑/↓/→)
// 3. INSUFFICIENT_DATA: aviso "Registre mais pesagens" com botão link
// 4. ERROR: mensagem erro + botão retry

export function CardIndicador(props: CardIndicadorProps): JSX.Element
```

### 8.2 `FiltrosIndicadores.tsx` (use client)

```typescript
interface FiltrosIndicadoresProps {
  filtrosAtuais: FiltrosIndicadores;
  tipoExploracao: TipoExploracao;
  onAplicar: (filtros: FiltrosIndicadores) => Promise<void>;
  onResetar: () => void;
  lotes: Lote[];
  isLoading?: boolean;
}

// Dropdowns:
// - Período: preset (30d, 90d, 365d, safra) ou custom date range
// - Lotes: multi-select (mostrar contagem "Lote A (25 animais)")
// - Categorias: multi-select (Bezerra, Vaca, etc.) — dinâmica por tipo_rebanho
// - Fazenda: dropdown (se multi-fazenda)

// Persistência: URL params + sessionStorage (sync bidirecional)

export function FiltrosIndicadores(props: FiltrosIndicadoresProps): JSX.Element
```

### 8.3 `GraficoGMD.tsx` (use client)

```typescript
interface GraficoGMDProps {
  dados: Array<{
    animal_id: string;
    brinco: string;
    datas: Date[];
    pesos: number[];
    gmd: number;
  }>;
  modo: 'por-animal' | 'por-lote';
  periodo: FiltrosIndicadores;
}

// LineChart (Recharts): tempo X → GMD Y
// Modo 1: linha por animal (colorida, max 10 linhas)
// Modo 2: agregado por lote (2-3 linhas)
// Tooltip: animal_id, peso, data, GMD calc
// XAxis: datas formato DD/MM

export function GraficoGMD(props: GraficoGMDProps): JSX.Element
```

### 8.4 `GraficoComposicao.tsx` (use client)

```typescript
interface GraficoComposicaoProps {
  dados: Record<string, number>;  // categoria → %
  periodo: FiltrosIndicadores;
  onClickCategoria?: (categoria: string) => void;
}

// PieChart (Recharts)
// Label: "Vaca (40%)"
// Cores: padrão (azul, verde, vermelho, laranja)
// Click na fatia → aplica filtro automático por categoria

export function GraficoComposicao(props: GraficoComposicaoProps): JSX.Element
```

### 8.5 `GraficoDistribuicaoEtaria.tsx` (use client)

```typescript
interface GraficoDistribuicaoEtariaProps {
  dados: Array<{ categoria: string; percentual: number }>;
  periodo: FiltrosIndicadores;
}

// DonutChart ou BarChart vertical
// % por categoria
// Rótulo + legenda

export function GraficoDistribuicaoEtaria(props: GraficoDistribuicaoEtariaProps): JSX.Element
```

### 8.6 `GraficoEvolucaoEfetivo.tsx` (use client)

```typescript
interface GraficoEvolucaoEfetivoProps {
  dados: Array<{
    data: Date;
    quantidade: number;
    eventos?: { nascimentos: number; mortes: number; vendas: number };
  }>;
  periodo: FiltrosIndicadores;
}

// LineChart: timeline com marcadores
// Linha: COUNT por mês
// Marcadores: 🟢 nascimentos, 🔴 mortes, 🔵 vendas
// Annotation ao hover

export function GraficoEvolucaoEfetivo(props: GraficoEvolucaoEfetivoProps): JSX.Element
```

### 8.7 `GraficoNatalidadeMortalidade.tsx` (use client)

```typescript
interface GraficoNatalidadeMortalidadeProps {
  dados: Array<{
    mes: string;
    natalidade: number;  // %
    mortalidade: number;  // %
  }>;
  periodo: FiltrosIndicadores;
}

// BarChart agrupado: mês X → (Natalidade verde | Mortalidade vermelho) Y
// XAxis: meses (JAN, FEV, MAR)

export function GraficoNatalidadeMortalidade(props: GraficoNatalidadeMortalidadeProps): JSX.Element
```

### 8.8 `ComparativoLotes.tsx` (use client)

```typescript
interface ComparativoLotesProps {
  dados: ComparativoLotes[];  // ranking 1-5
  indicador: 'gmd' | 'natalidade' | 'prenhez' | 'peso';
  periodo: FiltrosIndicadores;
  onSelectLote?: (loteId: string) => void;
}

// Tabela: Rank | Lote | Valor | n Animais | Trend
// BarChart agrupado: lotes X → indicador Y (cores diferentes)
// Click na linha → aplica filtro por lote

export function ComparativoLotes(props: ComparativoLotesProps): JSX.Element
```

### 8.9 `MiniCardRebanho.tsx` (use client)

```typescript
interface MiniCardRebanhoProps {
  totalAnimais: number;
  gmd: number;
  taxaPrenhez: number;
  trendGMD: 'up' | 'down' | 'stable';
  trendValor?: number;
  href: string;  // /dashboard/rebanho/indicadores
}

// Card compacto no dashboard principal
// 4 linhas: Total | GMD trend | Prenhez | Link "Ver Todos"
// Tamanho: 300px width, responsive em mobile

export function MiniCardRebanho(props: MiniCardRebanhoProps): JSX.Element
```

---

## 9. Página Principal `app/dashboard/rebanho/indicadores/page.tsx`

### Arquitetura RSC + Client

```typescript
// page.tsx (RSC - Server Component)
// 1. Fetch tipo_exploracao da fazenda
// 2. Parse query params → FiltrosIndicadores
// 3. Pass para <IndicadoresClient /> com initialFiltros

export default async function IndicadoresPage(props: {
  searchParams?: Record<string, string | string[]>;
}): Promise<JSX.Element>

// IndicadoresClient.tsx (use client)
// 1. Render FiltrosIndicadores (dropdowns, date pickers)
// 2. Ao aplicar filtros: call getIndicadoresAction()
// 3. Render CardIndicador[]
// 4. Render Gráficos (lazy load com Suspense)
// 5. Render ComparativoLotes + Tabs (GMD, Natalidade, etc.)
// 6. Botões: Export PDF, Export CSV

export function IndicadoresClient(props: {
  initialFiltros: FiltrosIndicadores;
  tipoExploracao: TipoExploracao;
}): JSX.Element
```

---

## 10. Export PDF & CSV

### CSV Export

**Estrutura**:
```
Indicador,Período,Lote(s),Valor,Unidade,Benchmark,Status
GMD,90d,Lote A,1.35,kg/d,0.8-1.5,✓ OK
Taxa Natalidade,90d,Todos,87.5,%,80-95,✓ OK
```

**Implementação**: Nativo Blob + CSV string (sem deps)  
**Encoding**: UTF-8 BOM (Excel BR)  
**Separador**: `;`  
**Acionador**: Botão "Baixar CSV" → Server Action → Blob.download()

### PDF Export

**Estrutura**:
- Header: Título + Fazenda + Período + Filtros aplicados
- Seção 1: Tabela indicadores resumidos (5x4)
- Seção 2: Gráfico GMD timeline
- Seção 3: Gráfico Composição (PieChart)
- Seção 4: Gráfico Natalidade vs. Mortalidade
- Rodapé: Data geração, usuário, versão GestSilo Pro

**Template**: Reutilizar `gerarPdfPlanejamento.ts` (jsPDF + autoTable)  
**Performance**: <3s para rebanho 500 animais  
**Acionador**: Botão "Baixar PDF" → Server Action → exportarIndicadoresPDFAction() → Blob.download()

---

## 11. Mini-Card no Dashboard Principal

### Localização & Design

Adicionar novo card na grid do `/dashboard` (após Silos, Talhões, Frota):

```
┌──────────────────────────────────────┐
│ 📊 Rebanho (novo card)               │
├──────────────────────────────────────┤
│ Total: 125 animais    ↑ +5           │
│ GMD: 1.32 kg/d        ↓ -0.1 kg/d    │
│ Prenhez: 86%          → 86%          │
│                                      │
│           [Ver Indicadores] →        │
└──────────────────────────────────────┘
```

**Dados Exibidos** (período: últimos 90 dias):
- Total de animais ativos
- GMD atual vs. GMD 90d atrás (trend: ↑/↓/→ com delta)
- Taxa de prenhez
- Link: "Ver Indicadores" → `/dashboard/rebanho/indicadores`

**Performance**: Cache 5 min (revalidate 300)  
**Integração**: Renderizar em `components/DashboardGrid.tsx` (RSC fetch inline)

---

## 12. Ordem de Implementação (T38–T47)

### Sprint Structure

**T38**: Migrations SQL + Índices + Tipos TS  
→ Dependência: Seções 1–3 da SPEC

**T39**: Funções de Cálculo (14 indicadores)  
→ Dependência: T38 + `lib/supabase/rebanho.ts`

**T40**: Server Actions + Validação Zod  
→ Dependência: T39

**T41**: Componentes CardIndicador + FiltrosIndicadores  
→ Dependência: T40

**T42**: Gráficos (GraficoGMD + GraficoComposicao + GraficoDistribuicaoEtaria)  
→ Dependência: T40  
→ **Paralelo com T43**

**T43**: Gráficos (GraficoEvolucaoEfetivo + GraficoNatalidadeMortalidade + ComparativoLotes)  
→ Dependência: T40  
→ **Paralelo com T42**

**T44**: Página RSC + IndicadoresClient  
→ Dependência: T41 + T43

**T45**: Export CSV + PDF (Server Actions)  
→ Dependência: T40 + T44

**T46**: Mini-card no Dashboard + integração  
→ Dependência: T44

**T47**: Testes (50+) + Lighthouse + Aceite  
→ Dependência: T38–T46

---

## 13. Checklist de Aceite (Corrigido)

- [ ] **GMD**: calcula corretamente para animal com ≥2 pesagens em período, fórmula (Peso_Final - Peso_Inicial) / dias
- [ ] **Taxa Natalidade**: retorna (Bezerros nascidos) / (Fêmeas aptas) com ±2% margem erro
- [ ] **Taxa Mortalidade**: separa geral ≠ bezerros <desmame via tags SQL corretos
- [ ] **Taxa Prenhez**: filtra fêmeas por status_reprodutivo='prenha' via evento diagnóstico_prenhez positivo
- [ ] **IEP**: calcula média partos por fêmea com histórico 12 meses, rejeita se < 2 partos
- [ ] **Filtros** aplicam <500ms via Server Action com cache 5min (não refetch)
- [ ] **Gráficos**: renderizam em <1s (Recharts, 1000+ data points)
- [ ] **Export CSV**: abre corretamente Excel BR (separador `;`, encoding UTF-8 BOM)
- [ ] **Export PDF**: gera em <3s para rebanho 500 animais, inclui 3+ gráficos + tabela
- [ ] **Mini-card**: carrega em <200ms (cache 5min), atualiza ao mudar período
- [ ] **Indicadores específicos tipo**: corte mostra Desfrute; leite mostra %Lactação/Seco (ocultar outros)
- [ ] **Composição**: % por categoria soma 100% com tolerância arredondamento
- [ ] **RLS**: via `supabase.auth.getUser()` server-side (não `useAuth()` client hook), valida por fazenda em cada query
- [ ] **TypeScript**: 0 erros strict mode, nenhum `any`
- [ ] **Testes**: 50+ testes (indicadores + queries + RLS, Vitest)
- [ ] **Performance Lighthouse**: sem regressão (LCP <2.5s, CLS <0.1)
- [ ] **Dataset Fixture**: cada indicador tem teste com dados conhecidos (ex: 5 animais, 3 pesagens, resultado esperado = X)
- [ ] **Edge Cases**:
  - [ ] GMD com 0 pesagens → retorna null/erro
  - [ ] GMD com 1 pesagem → retorna null (requer ≥2)
  - [ ] Taxa natalidade com 0 fêmeas aptas → retorna 0% (não divide by zero)
  - [ ] Taxa mortalidade com 0 óbitos → retorna 0%
  - [ ] Sem partos registrados → IEP/IPP = null
  - [ ] Rebanho vazio → todos indicadores = 0 ou null, sem erro
- [ ] **Filtros**: período vazio ou inválido (data_fim < data_inicio) → erro legível ao usuário
- [ ] **Indicadores completam em <2s** (incluindo cache hit)
- [ ] **Migrations testadas** em staging com dataset real antes de deploy em produção

---

## 14. Notas Arquiteturais

**Authenticação**: Usar **SEMPRE** `supabase.auth.getUser()` em Server Actions (nunca `useAuth()` hook client-side). RLS filtra automaticamente via `get_minha_fazenda_id()`.

**Queries**: Sempre filtrar por `fazenda_id = get_minha_fazenda_id()` — automático via RLS, sem cliente enviar manualmente.

**Cache Strategy** (CRÍTICO — alinhado pós T1-T3):
- **Server**: `revalidateTag('indicadores', hashFiltros)` → cache 5 min em React Server Component
- **Cliente**: `sessionStorage` armazena **SÓ filtros UI** (período, lotes, categorias, fazenda) — NÃO dados de indicadores
- **Dados**: Sempre vêm do servidor (cacheado lá por 5 min); cliente nunca armazena resultados de cálculos
- **UX**: Manter filtros selecionados ao navegar away/back (via sessionStorage), recarregar dados ao mudar filtro

**Validação**: Zod no servidor (segurança, rejeita payload malformado) + client-side feedback imediato (UX).

**Componentes**: Props interface explícita (não `React.FC`), `use client` apenas se estado/efeitos, nenhum `any` em strict mode.

**Indicadores Opcionais**: Se `tipo_exploracao IN ('CORTE', 'LEITE')`, `calcularIndicadores()` popula indicadores aplicáveis e deixa resto undefined. Componentes usam guards: `if (indicadores.taxaDesfrute) { <CardIndicador ... /> }`.

**Backfill**: Partos com `sexo_crias = NULL` (históricos) contam para taxa natalidade total; análises segmentadas ignoram NULL.

---

## 15. Sucesso da Fase 4

✅ Produtor acessa dashboard indicadores em <2s (cache otimizado)  
✅ 14+ indicadores calculados corretamente (validados contra PRD)  
✅ Gráficos Recharts renderizam em <1s (500+ animais)  
✅ Filtros aplicam <500ms (Server Action + cache)  
✅ Indicadores específicos tipo aparecem/desaparecem corretamente  
✅ Comparativo entre lotes mostra ranking com trend  
✅ Export PDF gera <3s, inclui tabelas + gráficos + rodapé  
✅ Export CSV abre em Excel BR com separador `;` correto  
✅ Mini-card atualiza dashboard a cada 5 min  
✅ RLS valida por fazenda em cada query (0 data leaks)  
✅ 50+ testes passando (indicadores + RLS + performance)  
✅ TypeScript strict, 0 erros de tipo  
✅ Lighthouse score ≥82/100 (sem regressão)

---

**Status**: Pronto para implementação — T38–T47 (estimado 20h)  
**Última atualização**: 2026-05-05  
**Próximo**: Revisão SPEC + kick-off Fase 4
