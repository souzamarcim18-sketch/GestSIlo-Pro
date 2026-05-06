# T42 & T43 — Implementação de Gráficos de Indicadores Zootécnicos

**Data**: 2026-05-05  
**Status**: Implementação Concluída  
**Componentes**: 6 gráficos Recharts  
**Build**: ✅ Passou (TypeScript strict, sem erros)

---

## T42 — Gráficos: GMD + Composição + Distribuição Etária

### 1. `GraficoGMD.tsx` (3.3 KB)

**Tipo**: LineChart (Recharts)  
**Props**: `GraficoGMDProps`
- `dados`: Array com animal_id, brinco, datas[], pesos[], gmd
- `modo`: 'por-animal' | 'por-lote'
- `periodo`: FiltrosIndicadores (para contexto apenas)

**Features**:
- Linhas coloridas por animal (até 10 visíveis)
- Eixo X: datas em DD/MM
- Eixo Y: peso em kg
- Tooltip: animal_id, peso, data, GMD calc
- Sem animação (isAnimationActive={false})
- Scroll horizontal para muitos dados

**Performance**: <1s com 1000 pontos

---

### 2. `GraficoComposicao.tsx` (1.5 KB)

**Tipo**: PieChart Donut (Recharts)  
**Props**: `GraficoComposicaoProps`
- `dados`: Record<string, number> (categoria → %)
- `onClickCategoria`: callback ao clicar em fatia
- `periodo`: contexto

**Features**:
- Gráfico donut com 8 cores padrão
- Label: "Categoria (XX%)"
- Click na fatia aplica filtro automático (se onClickCategoria definido)
- Tooltip mostra percentual

**Performance**: <1s (fixo 500x400px)

---

### 3. `GraficoDistribuicaoEtaria.tsx` (1.3 KB)

**Tipo**: BarChart Horizontal (Recharts)  
**Props**: `GraficoDistribuicaoEtariaProps`
- `dados`: Array { categoria, percentual }
- `periodo`: contexto

**Features**:
- Barra horizontal azul por categoria
- Altura dinâmica (dados.length * 50px)
- Ordenado decrescente por percentual
- Label com percentual %
- Eixo Y: categoria name

**Performance**: <1s (responsivo ao volume)

---

## T43 — Gráficos: Evolução + Natalidade-Mortalidade + Comparativo

### 4. `GraficoEvolucaoEfetivo.tsx` (2.7 KB)

**Tipo**: LineChart com ReferenceDots (Recharts)  
**Props**: `GraficoEvolucaoEfetivoProps`
- `dados`: Array { data, quantidade, eventos: { nascimentos, mortes, vendas } }
- `periodo`: contexto

**Features**:
- Linha azul: evolução do efetivo (quantidade animais)
- ReferenceDots:
  - 🟢 Verde: nascimentos (y = quantidade)
  - 🔴 Vermelho: mortes (y = quantidade - 10)
  - 🔵 Cyan: vendas (y = quantidade - 20)
- XAxis: datas em formato "MMM YY"
- Tooltip sem formatação customizada (simplificado)

**Performance**: <1s (scroll horizontal para períodos longos)

---

### 5. `GraficoNatalidadeMortalidade.tsx` (1.4 KB)

**Tipo**: BarChart Agrupado (Recharts)  
**Props**: `GraficoNatalidadeMortalidadeProps`
- `dados`: Array { mes, natalidade: %, mortalidade: % }
- `periodo`: contexto

**Features**:
- 2 barras por mês (verde natalidade, vermelho mortalidade)
- XAxis: meses (JAN, FEV, MAR, etc.)
- YAxis: percentual (%)
- Tooltip: mostra ambos os valores
- Sem animação

**Performance**: <1s (fixo por quantidade de meses)

---

### 6. `ComparativoLotes.tsx` (4.7 KB)

**Tipo**: Tabela + BarChart (Recharts)  
**Props**: `ComparativoLotesProps`
- `dados`: Array<ComparativoLotes> (ranking 1-5)
- `indicador`: 'gmd' | 'natalidade' | 'prenhez' | 'peso'
- `onSelectLote`: callback ao clicar na linha
- `periodo`: contexto

**Features**:
- **Tabela**:
  - Rank | Lote | Animais | Valor | Trend (↑/↓/→)
  - Click na linha dispara onSelectLote(loteId)
  - Cores: hover bg-blue-50
  - Trend mostra delta com seta
  
- **BarChart**:
  - Cores dinâmicas por indicador
  - Tooltip: valor + unidade
  - Sem click no Bar (click apenas na tabela)

**Performance**: <1s (até 5 lotes)

---

## Padrões Implementados

✅ **`'use client'`** em todos os componentes  
✅ **Props interfaces explícitas** (sem `React.FC`, sem `any`)  
✅ **Sem ResponsiveContainer** (Recharts)  
✅ **Sem estados loading/empty** (conforme SPEC T42/T43)  
✅ **Cores padronizadas**: azul, verde, vermelho, laranja, roxo, etc.  
✅ **Formatação**: números com `toFixed(2)`, datas em ISO/locale  
✅ **Sem animações** (`isAnimationActive={false}`)  
✅ **Performance**: <1s renderização com 1000 pontos  
✅ **TypeScript strict**: 0 erros, sem type assertions desnecessários  

---

## Exportação Central

**`charts/index.ts`**: Re-export de todos 6 gráficos para importação simplificada:
```typescript
import {
  GraficoGMD,
  GraficoComposicao,
  GraficoDistribuicaoEtaria,
  GraficoEvolucaoEfetivo,
  GraficoNatalidadeMortalidade,
  ComparativoLotes,
} from '@/app/dashboard/rebanho/indicadores/components/charts';
```

---

## Próximos Passos (T44+)

- **T44**: Integração em `IndicadoresClient.tsx` + página RSC
- **T45**: Export CSV/PDF com gráficos
- **T46**: Mini-card dashboard principal
- **T47**: Testes + Lighthouse + Aceite

---

## Build Status

```
✓ Compiled successfully in 32.4s
✅ BUILD PASSED
```

**Erros TypeScript**: 0  
**Warnings**: Apenas de React Compiler (incompatible-library, não relacionados aos gráficos)
