# SPEC — Balanço Forrageiro

**Status**: Aguardando aprovação para implementação
**Data**: 2026-05-22
**Baseado em**: PRD-balanco-forrageiro.md (aprovado)

---

## 1. Estrutura de Arquivos

### Arquivos a criar

| Caminho | Responsabilidade |
|---|---|
| `lib/constants/balanco-forrageiro.ts` | Map estático `CONSUMO_MS_POR_CATEGORIA`: string → number (kg MS/cab/dia). Constante `CONSUMO_MS_PADRAO = 7.0`. |
| `lib/utils/balanco-forrageiro.ts` | Funções puras de cálculo: estoque total, consumo histórico real, demanda projetada por categoria, comparativo. Importável em RSC e Client. |
| `lib/supabase/balanco-forrageiro.ts` | Duas funções de query Supabase: `getEstoqueEConsumo` e `getAnimaisPorCategoria`. |
| `app/dashboard/balanco-forrageiro/layout.tsx` | Guard client-side: redireciona Operador para `/dashboard`. Padrão idêntico a `mao-de-obra/layout.tsx`. |
| `app/dashboard/balanco-forrageiro/page.tsx` | RSC: autenticação + `Promise.all` com 2 queries paralelas + passa props para `BalancoForrageiroClient`. |
| `app/dashboard/balanco-forrageiro/BalancoForrageiroClient.tsx` | Client hub (`'use client'`): estado do período selecionado, re-fetch ao mudar período, composição dos sub-componentes. |
| `app/dashboard/balanco-forrageiro/components/PeriodoSelector.tsx` | Toggle 7/30/60/90 dias. Dispara callback para atualizar estado no Client hub. |
| `app/dashboard/balanco-forrageiro/components/KpisSection.tsx` | 4 cards de KPI: estoque total, consumo real/dia, autonomia real, autonomia projetada — com badge de criticidade. |
| `app/dashboard/balanco-forrageiro/components/ConsumoHistoricoCard.tsx` | Bloco A: consumo total no período, consumo médio diário, autonomia real, breakdown por silo. |
| `app/dashboard/balanco-forrageiro/components/DemandaProjetadaCard.tsx` | Bloco B: tabela categoria × demanda, demanda total consolidada, autonomia projetada. |
| `app/dashboard/balanco-forrageiro/components/ComparativoSection.tsx` | Saldo diário e diferença de autonomia com badge Déficit/Superávit/Equilibrado. |

### Arquivos a modificar

| Caminho | Modificação |
|---|---|
| `components/Sidebar.tsx` | Adicionar item `Balanço Forrageiro` com ícone `Scale` em `gerencialRoutes`, após `Silos` e antes de `Lavouras`. Filtrar para Operador em `visibleGerencialRoutes`. |

---

## 2. Constantes — `lib/constants/balanco-forrageiro.ts`

### Mapa de consumo por categoria

```
CONSUMO_MS_POR_CATEGORIA: Map<string, number>
```

Mapeamento completo (chave = valor exato de `animais.categoria` no banco):

| Chave (categoria no banco) | Valor (kg MS/cab/dia) |
|---|---|
| `'Vaca em Lactação'` | `14.0` |
| `'Vaca Prenha'` | `10.0` |
| `'Vaca Seca'` | `8.0` |
| `'Vaca Vazia'` | `8.0` |
| `'Novilha (Prenha)'` | `8.5` |
| `'Novilha'` | `7.0` |
| `'Novilho'` | `7.0` |
| `'Bezerro'` | `2.5` |
| `'Bezerra'` | `2.5` |
| `'Touro'` | `10.0` |
| `'Boi'` | `9.0` |
| `'Vaca Matriz'` | `8.5` |
| `'Boi Descartado'` | `8.0` |
| `'Fêmea Descartada'` | `7.5` |

```
CONSUMO_MS_PADRAO: number = 7.0
```

Categorias não presentes no mapa recebem `CONSUMO_MS_PADRAO` com `estimado: true`.

---

## 3. Schema de Dados — `lib/utils/balanco-forrageiro.ts`

### Tipos de entrada (dados brutos das queries)

```typescript
// Linha de movimentação de silo (resultado da query Q1/Q2)
type MovimentacaoSiloRow = {
  silo_id: string;
  silo_nome: string;
  tipo: 'Entrada' | 'Saída';
  subtipo: string | null;
  quantidade: number; // em toneladas MV
  data: string;       // ISO date string
};

// Linha de animal por categoria (resultado da query Q3)
type AnimalPorCategoriaRow = {
  categoria: string;
  quantidade: number;
};
```

### Tipos intermediários de cálculo

```typescript
// Contribuição individual de um silo ao consumo histórico
type ConsumoSilo = {
  silo_id: string;
  nome: string;
  consumo_total_kg: number;
  percentual: number; // participação % no consumo total
};

// Linha de demanda por categoria animal
type DemandaCategoria = {
  categoria: string;
  quantidade: number;
  consumo_unitario_kg_ms_dia: number;
  consumo_total_kg_ms_dia: number;
  estimado: boolean; // true quando categoria não está no Map e usou o padrão
};
```

### Tipos de saída (passados como props para componentes)

```typescript
// Resultado completo do cálculo de consumo histórico real (Bloco A)
type ResultadoConsumoReal = {
  periodo_dias: number;
  consumo_total_kg: number;
  consumo_medio_diario_kg: number;    // null quando sem saídas no período
  autonomia_real_dias: number | null; // null quando consumo_medio_diario_kg é null
  por_silo: ConsumoSilo[];
  sem_dados: boolean; // true quando não há saídas no período
};

// Resultado completo do cálculo de demanda projetada (Bloco B)
type ResultadoDemandaProjetada = {
  por_categoria: DemandaCategoria[];
  demanda_total_kg_ms_dia: number;
  autonomia_projetada_dias: number | null; // null quando demanda é 0 ou sem animais
  tem_categorias_estimadas: boolean; // true quando ao menos uma categoria usou valor padrão
};

// Resultado do comparativo (seção inferior)
type ResultadoComparativo = {
  saldo_diario_kg: number;           // consumo_real − demanda_projetada (positivo = superávit)
  diferenca_autonomia_dias: number | null;
  status: 'superavit' | 'equilibrado' | 'deficit';
  // equilibrado quando |saldo_diario_kg| / max(consumo, demanda) <= 0.05 (±5%)
};

// Período de consulta (estado do seletor)
type PeriodoBalanco = 7 | 30 | 60 | 90;

// Props completas do Client hub
type BalancoForrageiroClientProps = {
  // Dados iniciais pré-calculados para o período padrão (30 dias)
  estoqueTotal_kg: number;
  initialConsumo: ResultadoConsumoReal;
  initialDemanda: ResultadoDemandaProjetada;
  // Para re-filtrar client-side ao mudar período (já filtrado a 90 dias no banco)
  saidasUltimos90Dias: MovimentacaoSiloRow[];
  animaisPorCategoria: AnimalPorCategoriaRow[];
};
```

---

## 4. Queries — `lib/supabase/balanco-forrageiro.ts`

### `getEstoqueSilos()`

| Atributo | Valor |
|---|---|
| **Tabela** | `movimentacoes_silo` (join com `silos` para nome) |
| **Colunas selecionadas** | `silo_id`, `tipo`, `quantidade`, `silos(nome)` |
| **Filtros** | RLS implícito por `fazenda_id`; **sem filtro de data** |
| **Ordenação** | nenhuma (ordem irrelevante para soma) |
| **Tipo de retorno** | `Pick<MovimentacaoSiloRow, 'silo_id' | 'tipo' | 'quantidade' | 'silo_nome'>[]` |
| **Observação** | Necessário buscar toda a vida do silo para calcular estoque correto (entradas − saídas acumuladas). Sem `limit`. O join many-to-one `silos(nome)` requer `as unknown as ...[]` no TypeScript. Não inclui `subtipo` nem `data` — não são necessários para este cálculo. |

### `getConsumoPorPeriodo(dataCorte: Date)`

| Atributo | Valor |
|---|---|
| **Tabela** | `movimentacoes_silo` (join com `silos` para nome) |
| **Colunas selecionadas** | `silo_id`, `tipo`, `subtipo`, `quantidade`, `data`, `silos(nome)` |
| **Filtros** | RLS implícito por `fazenda_id`; `tipo = 'Saída'`; `.gte('data', dataCorte.toISOString().split('T')[0])` |
| **Ordenação** | `data` ASC |
| **Tipo de retorno** | `MovimentacaoSiloRow[]` |
| **Observação** | `dataCorte` é sempre `hoje − 90 dias` (período máximo do seletor) — filtro aplicado **no banco**, não em memória. Ao trocar o período no seletor (7/30/60 dias), re-filtra sobre este array em JS sem novo fetch. O join many-to-one requer `as unknown as MovimentacaoSiloRow[]`. |

### `getAnimaisAtivosPorCategoria()`

| Atributo | Valor |
|---|---|
| **Tabela** | `animais` |
| **Colunas selecionadas** | `categoria` |
| **Filtros** | `status = 'Ativo'`; RLS implícito por `fazenda_id` |
| **Agrupamento** | Feito em JS após a query: reduzir array para `Map<categoria, count>` |
| **Tipo de retorno** | `AnimalPorCategoriaRow[]` (já agregado) |
| **Observação** | Supabase não suporta `GROUP BY` nativo em client SDK — agregar em JS após `select('categoria').eq('status', 'Ativo')`. |

---

## 5. Lógica de Cálculo — `lib/utils/balanco-forrageiro.ts`

### `calcularEstoqueTotal(movimentacoes: MovimentacaoSiloRow[]): number`

```
estoque_total_ton = 0
para cada mov em movimentacoes:
  se mov.tipo == 'Entrada':
    estoque_total_ton += mov.quantidade
  senão:
    estoque_total_ton -= mov.quantidade
retornar estoque_total_ton * 1000  // converter ton para kg
```

### `calcularConsumoHistorico(saidasUltimos90Dias, periodosDias): ResultadoConsumoReal`

```
// saidasUltimos90Dias já contém apenas saídas (tipo='Saída') dos últimos 90 dias — filtrado no banco
dataCorte = hoje - periodo_dias dias  // re-filtro local para 7, 30 ou 60 dias

saidasNoPeriodo = saidasUltimos90Dias
  .filter(m => m.subtipo != 'Descarte')
  .filter(m => m.data >= dataCorte)

se saidasNoPeriodo.length == 0:
  retornar { sem_dados: true, consumo_medio_diario_kg: null, autonomia_real_dias: null, ... }

consumo_total_kg = soma(s.quantidade * 1000 para s em saidasNoPeriodo)  // ton → kg
consumo_medio_diario_kg = consumo_total_kg / periodo_dias

// Agrupamento por silo
silosMap = Map<silo_id, { nome, consumo_kg }>
para cada saida em saidasNoPeriodo:
  silosMap[saida.silo_id].consumo_kg += saida.quantidade * 1000

por_silo = para cada entry em silosMap:
  { silo_id, nome, consumo_total_kg, percentual: consumo_kg / consumo_total_kg * 100 }

retornar {
  periodo_dias,
  consumo_total_kg,
  consumo_medio_diario_kg,
  autonomia_real_dias: Math.floor(estoqueTotal_kg / consumo_medio_diario_kg),
  por_silo,
  sem_dados: false
}
```

> **Nota**: `estoqueTotal_kg` é passado como parâmetro (já calculado via `calcularEstoqueTotal`).

### `calcularDemandaProjetada(animaisPorCategoria, estoqueTotal_kg): ResultadoDemandaProjetada`

```
por_categoria = []
tem_categorias_estimadas = false

para cada { categoria, quantidade } em animaisPorCategoria:
  consumo_unitario = CONSUMO_MS_POR_CATEGORIA.get(categoria)
  estimado = false

  se consumo_unitario é undefined:
    consumo_unitario = CONSUMO_MS_PADRAO
    estimado = true
    tem_categorias_estimadas = true

  por_categoria.push({
    categoria,
    quantidade,
    consumo_unitario_kg_ms_dia: consumo_unitario,
    consumo_total_kg_ms_dia: consumo_unitario * quantidade,
    estimado
  })

demanda_total_kg_ms_dia = soma(p.consumo_total_kg_ms_dia para p em por_categoria)

se demanda_total_kg_ms_dia == 0:
  autonomia_projetada_dias = null
senão:
  autonomia_projetada_dias = Math.floor(estoqueTotal_kg / demanda_total_kg_ms_dia)

retornar { por_categoria, demanda_total_kg_ms_dia, autonomia_projetada_dias, tem_categorias_estimadas }
```

### `calcularComparativo(consumo, demanda): ResultadoComparativo`

```
se consumo.consumo_medio_diario_kg é null OU demanda.demanda_total_kg_ms_dia == 0:
  retornar { saldo_diario_kg: 0, diferenca_autonomia_dias: null, status: 'equilibrado' }

saldo_diario_kg = consumo.consumo_medio_diario_kg - demanda.demanda_total_kg_ms_dia
// positivo = consumo real maior que demanda (estoque durando menos que o esperado)
// negativo = consumo real menor que demanda (sobra)

referencia = max(consumo.consumo_medio_diario_kg, demanda.demanda_total_kg_ms_dia)
desvio_percentual = abs(saldo_diario_kg) / referencia

se desvio_percentual <= 0.05:
  status = 'equilibrado'
senão se saldo_diario_kg > 0:
  status = 'deficit'   // consumo real > demanda projetada → estoque acabando mais rápido
senão:
  status = 'superavit' // consumo real < demanda projetada → estoque durando mais

diferenca_autonomia_dias = null
se consumo.autonomia_real_dias != null E demanda.autonomia_projetada_dias != null:
  diferenca_autonomia_dias = consumo.autonomia_real_dias - demanda.autonomia_projetada_dias

retornar { saldo_diario_kg, diferenca_autonomia_dias, status }
```

---

## 6. Componentes

### `layout.tsx` — Guard de Perfil

- **Tipo**: `'use client'`
- **Props**: `{ children: React.ReactNode }`
- **Responsabilidade**: Usar `useAuth()`, redirecionar para `/dashboard` + toast de erro quando `profile?.perfil === 'Operador'`. Retornar `null` enquanto `loading` ou quando Operador. Idêntico a `mao-de-obra/layout.tsx`.

---

### `page.tsx` — RSC

- **Tipo**: `async` RSC (sem `'use client'`)
- **Props**: nenhuma (rota)
- **Responsabilidade**:
  1. `createSupabaseServerClient()` + `getUser()` → redirect `/login` se não autenticado
  2. `Promise.all([getMovimentacoesSilo(), getAnimaisAtivosPorCategoria()])` em paralelo
  3. Calcular `estoqueTotal_kg`, `initialConsumo` (período 30 dias) e `initialDemanda` chamando as funções puras de `lib/utils/balanco-forrageiro.ts`
  4. Passar tudo como props para `BalancoForrageiroClient`

---

### `BalancoForrageiroClient.tsx` — Client Hub

- **Tipo**: `'use client'`
- **Props**: `BalancoForrageiroClientProps`
- **Estado interno**:
  - `periodo: PeriodoBalanco` — padrão `30`
  - `consumo: ResultadoConsumoReal` — inicializado com `initialConsumo`
  - `demanda: ResultadoDemandaProjetada` — não muda com período (rebanho atual)
- **Responsabilidade**:
  - Ao mudar `periodo`: re-calcular `consumo` chamando `calcularConsumoHistorico(movimentacoes, periodo)` — **sem re-fetch ao banco** (usa `movimentacoes` recebido via props)
  - `comparativo` derivado via `useMemo` de `consumo` + `demanda`
  - Renderizar: `PeriodoSelector`, `KpisSection`, dois blocos lado a lado (`ConsumoHistoricoCard` + `DemandaProjetadaCard`), `ComparativoSection`

---

### `PeriodoSelector.tsx`

- **Tipo**: `'use client'`
- **Props**:
  ```typescript
  type PeriodoSelectorProps = {
    value: PeriodoBalanco;
    onChange: (periodo: PeriodoBalanco) => void;
  };
  ```
- **Responsabilidade**: Renderizar `<ToggleGroup>` do shadcn/ui com 4 opções (7d / 30d / 60d / 90d). Chamar `onChange` ao clicar. Sem estado interno.

---

### `KpisSection.tsx`

- **Tipo**: pode ser RSC puro (sem estado)
- **Props**:
  ```typescript
  type KpisSectionProps = {
    estoqueTotal_kg: number;
    consumo: ResultadoConsumoReal;
    demanda: ResultadoDemandaProjetada;
  };
  ```
- **Responsabilidade**: Renderizar 4 cards horizontais.
  - Card 1 — Estoque Total: `(estoqueTotal_kg / 1000).toFixed(1)} t MV`
  - Card 2 — Consumo Real/Dia: `consumo.consumo_medio_diario_kg` em kg/dia (ou "—" se `sem_dados`)
  - Card 3 — Autonomia Real: `consumo.autonomia_real_dias` em dias com badge de criticidade
  - Card 4 — Autonomia Projetada: `demanda.autonomia_projetada_dias` em dias com badge de criticidade
- **Dados recebidos via props** (do Client hub)

---

### `ConsumoHistoricoCard.tsx`

- **Tipo**: pode ser RSC puro
- **Props**:
  ```typescript
  type ConsumoHistoricoCardProps = {
    consumo: ResultadoConsumoReal;
  };
  ```
- **Responsabilidade** (Bloco A):
  - Exibir consumo total no período (kg)
  - Exibir consumo médio diário (kg/dia)
  - Exibir autonomia real com badge de criticidade
  - Lista de silos com barra de progresso proporcional ao `percentual`
  - Exibir estado vazio ("Sem saídas no período") quando `consumo.sem_dados === true`
- **Dados recebidos via props**

---

### `DemandaProjetadaCard.tsx`

- **Tipo**: pode ser RSC puro
- **Props**:
  ```typescript
  type DemandaProjetadaCardProps = {
    demanda: ResultadoDemandaProjetada;
    estoqueTotal_kg: number;
  };
  ```
- **Responsabilidade** (Bloco B):
  - Tabela: categoria | qtd animais | kg MS/dia unitário | kg MS/dia total
  - Linhas com `estimado: true` exibem tooltip ou ícone `~` indicando valor estimado
  - Rodapé com demanda total consolidada (kg MS/dia)
  - Autonomia projetada com badge de criticidade
  - Exibir estado vazio ("Sem animais cadastrados") quando `demanda.por_categoria.length === 0`
  - Nota de rodapé quando `tem_categorias_estimadas === true`: "* Categorias marcadas com ~ usam valor estimado de 7 kg MS/cab/dia"
- **Dados recebidos via props**

---

### `ComparativoSection.tsx`

- **Tipo**: pode ser RSC puro
- **Props**:
  ```typescript
  type ComparativoSectionProps = {
    comparativo: ResultadoComparativo;
    consumo: ResultadoConsumoReal;
    demanda: ResultadoDemandaProjetada;
  };
  ```
- **Responsabilidade**:
  - Badge de status: `Déficit` (vermelho), `Superávit` (verde), `Equilibrado` (cinza)
  - Saldo diário: `|saldo_diario_kg|` kg/dia com sinal e label "Consumo real {acima/abaixo} da demanda projetada"
  - Diferença de autonomia em dias (quando disponível)
  - Exibir estado neutro quando consumo ou demanda sem dados
- **Dados recebidos via props**

---

## 7. Layout da Página

```
┌─────────────────────────────────────────────────────┐
│  Título: "Balanço Forrageiro"  (h1, text-2xl)        │
│  Subtítulo: "Confronte estoque e demanda do rebanho" │
├─────────────────────────────────────────────────────┤
│  PeriodoSelector  [7d] [30d✓] [60d] [90d]           │
├─────────────────────────────────────────────────────┤
│  KpisSection                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Estoque  │ │ Consumo  │ │Autonomia │ │Autonomia│ │
│  │ Total    │ │ Real/Dia │ │ Real     │ │Projetada│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├──────────────────────┬──────────────────────────────┤
│  ConsumoHistorico    │  DemandaProjetada             │
│  (Bloco A)           │  (Bloco B)                    │
│                      │                               │
│  Consumo total: Xkg  │  Tabela categoria × demanda   │
│  Média/dia: Xkg/dia  │  ─────────────────────────── │
│  Autonomia: X dias   │  Cat.  | Qtd | Unit | Total  │
│                      │  ─────────────────────────── │
│  Por silo:           │  Vaca Lact | 10 | 14 | 140   │
│  ■ Silo A  60%       │  Vaca Seca |  5 |  8 |  40   │
│  ■ Silo B  40%       │  ─────────────────────────── │
│                      │  Total: X kg MS/dia           │
│                      │  Autonomia: X dias            │
├──────────────────────┴──────────────────────────────┤
│  ComparativoSection                                  │
│  Badge [Déficit / Superávit / Equilibrado]           │
│  Saldo diário: X kg/dia acima/abaixo                 │
│  Diferença de autonomia: X dias                      │
└─────────────────────────────────────────────────────┘
```

**Grid CSS**: Dois blocos lado a lado usam `grid grid-cols-1 md:grid-cols-2 gap-4`.

---

## 8. Regras de Cor para Autonomia

Aplicadas nos badges dos KPIs (Autonomia Real e Autonomia Projetada) e nas projeções dentro dos Blocos A e B.

| Condição | Cor | Classe Tailwind / CSS var |
|---|---|---|
| `autonomia < 10 dias` | Vermelho (crítico) | `text-destructive` / `bg-destructive/10` |
| `10 ≤ autonomia < 30 dias` | Âmbar (urgente) | `text-yellow-600 dark:text-yellow-400` / `bg-yellow-500/10` |
| `autonomia ≥ 30 dias` | Verde (ok) | `text-green-600 dark:text-green-400` / `bg-green-500/10` |
| `autonomia === null` | Neutro (sem dados) | `text-muted-foreground` |

**Função auxiliar interna** (em `KpisSection` ou exportada de `lib/utils/balanco-forrageiro.ts`):
```typescript
// Assinatura — sem implementação nesta SPEC
function classesAutonomia(dias: number | null): {
  text: string;
  bg: string;
  label: 'critico' | 'urgente' | 'ok' | 'sem-dados';
}
```

---

## 9. Guard de Perfil — `layout.tsx`

Padrão exato de `app/dashboard/mao-de-obra/layout.tsx`:

```typescript
// Assinatura — sem implementação nesta SPEC
// 'use client'
// Imports: useEffect, useRouter, useAuth, toast
// Lógica:
//   useEffect: se !loading && perfil === 'Operador' → toast.error + router.replace('/dashboard')
//   Render: null se loading || perfil === 'Operador'
//   Render: <>{children}</> caso contrário
```

---

## 10. Item no Sidebar — `components/Sidebar.tsx`

### Grupo
`gerencialRoutes` — após o item `Silos` e antes de `Lavouras`.

### Definição do item
```typescript
// Inserir como segundo elemento de gerencialRoutes (índice 1):
{ label: 'Balanço Forrageiro', icon: Scale, href: '/dashboard/balanco-forrageiro', badge: null }
```

> `Scale` já está importado em `Sidebar.tsx` (linha 26 do arquivo atual).

### Visibilidade por perfil
Filtrar o item para Operador no mesmo mecanismo já existente de `visibleGerencialRoutes` (filtro que oculta `mao-de-obra`, `produtos`, etc. para Operador). O item **não aparece** para Operador.

---

## 11. Fluxo de Dados

```
page.tsx (RSC)
  └─ dataCorte90 = hoje − 90 dias
  └─ Promise.all
       ├─ getEstoqueSilos()                      → MovimentacaoSiloRow[] (todas as datas, sem tipo filter)
       ├─ getConsumoPorPeriodo(dataCorte90)       → MovimentacaoSiloRow[] (saídas últimos 90 dias)
       └─ getAnimaisAtivosPorCategoria()          → AnimalPorCategoriaRow[]
  └─ calcularEstoqueTotal(estoqueMovs)            → estoqueTotal_kg
  └─ calcularConsumoHistorico(saidas90, 30, estoqueTotal_kg) → initialConsumo
  └─ calcularDemandaProjetada(animais, estoqueTotal_kg)      → initialDemanda
  └─ <BalancoForrageiroClient props={...} />

BalancoForrageiroClient (Client)
  └─ estado: periodo (padrão 30)
  └─ ao mudar periodo:
       calcularConsumoHistorico(saidasUltimos90Dias, novoPeriodo, estoqueTotal_kg)
       → re-filtra em JS sobre array já limitado a 90 dias — sem fetch ao banco
  └─ comparativo = useMemo(() => calcularComparativo(consumo, demanda), [consumo, demanda])
  └─ renderiza: PeriodoSelector + KpisSection + [ConsumoHistoricoCard | DemandaProjetadaCard] + ComparativoSection
```

**Estratégia de duas queries separadas**: `getEstoqueSilos` busca todas as movimentações históricas (necessário para estoque correto); `getConsumoPorPeriodo` aplica filtro de 90 dias no banco — volume controlado. Ao trocar o período no seletor, re-filtra sobre `saidasUltimos90Dias` em JS sem novo fetch.

---

## 12. Estados Vazios

| Situação | Componente afetado | Exibição |
|---|---|---|
| Sem saídas no período selecionado | `ConsumoHistoricoCard`, `KpisSection` (Autonomia Real) | Texto "Sem saídas registradas nos últimos N dias". KPI mostra "—". |
| Sem animais ativos | `DemandaProjetadaCard`, `KpisSection` (Autonomia Projetada) | Texto "Nenhum animal ativo cadastrado". KPI mostra "—". |
| Consumo ou demanda ambos vazios | `ComparativoSection` | Texto "Dados insuficientes para comparativo". Badge oculto. |
| Estoque zero | `KpisSection` (Autonomia Real e Projetada) | Ambas autonomias = 0 dias → badge vermelho "Crítico". |

---

## 13. Dependências Externas

Nenhuma nova dependência a instalar. Todos os recursos já disponíveis:
- `shadcn/ui`: `ToggleGroup`, `Card`, `Badge`, `Tooltip`
- `lucide-react`: `Scale` (já importado em `Sidebar.tsx`)
- `@supabase/ssr`: via `createSupabaseServerClient()` (padrão do projeto)
- `sonner`: toast de acesso negado no layout

---

## 14. Testes

Funções puras em `lib/utils/balanco-forrageiro.ts` são testáveis sem RSC ou Supabase. Suíte esperada em `__tests__/balanco-forrageiro/utils.test.ts`:

| Caso de teste |
|---|
| `calcularEstoqueTotal` — entradas e saídas mistas |
| `calcularEstoqueTotal` — array vazio retorna 0 |
| `calcularConsumoHistorico` — corte temporal correto por período |
| `calcularConsumoHistorico` — exclui subtipos 'Descarte' |
| `calcularConsumoHistorico` — retorna `sem_dados: true` quando sem saídas |
| `calcularConsumoHistorico` — agrupamento por silo correto |
| `calcularDemandaProjetada` — categoria mapeada usa valor do Map |
| `calcularDemandaProjetada` — categoria desconhecida usa `CONSUMO_MS_PADRAO` com `estimado: true` |
| `calcularDemandaProjetada` — array vazio retorna `autonomia_projetada_dias: null` |
| `calcularComparativo` — status 'deficit' quando consumo > demanda + 5% |
| `calcularComparativo` — status 'superavit' quando demanda > consumo + 5% |
| `calcularComparativo` — status 'equilibrado' quando desvio ≤ 5% |
| `calcularComparativo` — retorna null para `diferenca_autonomia_dias` quando algum é null |

---

**SPEC gerada — aguardando aprovação para iniciar implementação.**
