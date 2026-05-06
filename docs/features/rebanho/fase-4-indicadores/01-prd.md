# Fase 4 — Indicadores Zootécnicos | PRD

**Status**: 📋 Especificação  
**Data**: 2026-05-05  
**Branch**: `feat/rebanho-modulo` (pós-Fase 3)  
**Impacto**: Dashboard novo (`/dashboard/rebanho/indicadores`) + mini-card no dashboard principal  

---

## 0. Dependências Bloqueadoras (Pré-requisitos)

Estas migrations **DEVEM estar prontas** antes de iniciar Fase 4:

### 0.1 Migration: Tipo de Exploração em `fazendas`

```sql
-- supabase/migrations/20260505_tipo_exploracao_fazendas.sql
ALTER TABLE fazendas
ADD COLUMN tipo_exploracao TEXT CHECK (tipo_exploracao IN ('CORTE', 'LEITE', 'MISTO')) DEFAULT 'LEITE';

COMMENT ON COLUMN fazendas.tipo_exploracao IS 'Tipo de exploração: CORTE, LEITE ou MISTO. Define quais indicadores são exibidos no dashboard.';
```

### 0.2 Migration: Sexo das Crías em `eventos_rebanho`

```sql
-- supabase/migrations/20260505_sexo_crias_eventos.sql
ALTER TABLE eventos_rebanho
ADD COLUMN sexo_crias TEXT CHECK (sexo_crias IN ('Macho', 'Fêmea', 'Misto')) DEFAULT NULL;

COMMENT ON COLUMN eventos_rebanho.sexo_crias IS 'Sexo da(s) cria(s) em evento de parto. Obrigatório para registrar corretamente bezerros e calcular taxa de natalidade. Misto = gemelar com sexos diferentes.';
```

### 0.3 Validações Pré-Sprint

- [ ] Nome tabela de pesagens é **`pesos_animal`** (confirmar em schema)
- [ ] Campo **`status_reprodutivo`** em `animais` existe (vide Fase 2)
- [ ] Tabela **`eventos_rebanho`** tem colunas: `tipo`, `data_evento`, `animal_id`, `fazenda_id`
- [ ] RLS ativo em todas as 3 tabelas acima

---

## 1. Objetivo da Fase 4

Transformar dados brutos de rebanho (animais, pesagens, eventos reprodutivos) em **indicadores zootécnicos** operacionais, com foco em corte e leite. Produtor consegue monitorar eficiência reprodutiva, ganho de peso, composição do rebanho com visualizações em tempo real, filtros inteligentes, exportação PDF/CSV e comparativos entre lotes.

**Resultado esperado ao final da Fase 4**:
- Produtor visualiza 15+ indicadores em < 2s (performance otimizada)
- Dashboard dedicado mostra GMD, taxa de natalidade, prenhez, mortalidade por período
- Gráficos evolutivos (linha do tempo) de GMD, composição, natalidade vs. mortalidade
- Exportação PDF com relatório completo (indicadores + gráficos + rodapé)
- Mini-card no dashboard principal com "📊 +5 animais | GMD ↑3,5 kg/d"
- Indicadores filtráveis por lote, categoria, período (presets: 30d, 90d, ano, safra, custom)
- Comparativo entre lotes (tabela ranqueada por indicador)

---

## 2. Tipo de Exploração: Corte vs. Leite

### 2.1 Decisão Arquitetural

Hoje, `tipo_rebanho` é **por animal** (campo em `animais` table). **Não existe** campo `tipo_exploracao` na tabela `fazendas`.

**Solução adotada** (Fase 4 MVP):
- ✅ **Adicionar coluna `tipo_exploracao` em `fazendas`** (migration em seção 0.1)
- Valores: `'CORTE' | 'LEITE' | 'MISTO'`
- Admin consegue editar em `Configurações → Tipo de Exploração`
- Indicadores específicos de corte (desfrute, taxa de reposição) aparecem SÓ se tipo = CORTE
- Indicadores específicos de leite (% lactação, período seco) aparecem SÓ se tipo = LEITE
- Default ao criar fazenda: `'LEITE'` (ajustável pelo admin)

### 2.2 Por que não inferir via moda de `tipo_rebanho`?

- ❌ **Computacionalmente caro**: requer agregação em cada acesso (sem cache estável)
- ❌ **Semântica ambígua**: produtor pode misturar tipos propositalmente (pecuária integrada)
- ❌ **Sem auditoria**: impossível saber quando/por quem mudou tipo
- ✅ **Melhor**: coluna explícita, editável, auditável

---

## 3. Lista de Indicadores (MVP — Fase 4)

### 3.1 Indicadores Comuns (Corte + Leite)

| Indicador | Unidade | Período Padrão | Fórmula | Viabilidade | Benchmark |
|-----------|---------|---|---------|---| --- |
| **GMD** | kg/dia | 90 dias | `(Peso_Final - Peso_Inicial) / (Data_Final - Data_Inicial)` | ✅ Peso via pesagens | 0,8-1,5 kg/d |
| **Taxa Natalidade** | % | 90 dias | `(Bezerros nascidos) / (Fêmeas aptas) * 100` | ✅ Partos via eventos | 80-95% |
| **Taxa Mortalidade Geral** | % | 90 dias | `(Óbitos total) / (Efetivo médio) * 100` | ✅ Morte via eventos | 1-3% |
| **Taxa Mortalidade Bezerros <Desmame** | % | 90 dias | `(Óbitos bezerros) / (Total nascidos) * 100` | ✅ Filtered por categoria | 3-8% |
| **Taxa Descarte** | % | 90 dias | `(Descartados) / (Efetivo inicial) * 100` | ✅ Descarte via eventos | 15-25% |
| **Taxa Prenhez** | % | 90 dias | `(Fêmeas prenhas) / (Fêmeas aptas reprodução) * 100` | ✅ Status via diagnóstico | 80-90% |
| **Intervalo Entre Partos (IEP)** | dias | 12 meses | `Média(Data_Parto_N - Data_Parto_N-1)` | ✅ Partos por animal | 380-420 dias |
| **Idade Primeiro Parto (IPP)** | meses | Lifetime | `Data_Primeiro_Parto - Data_Nascimento (em meses)` | ✅ Primeira prenha confirmada | 24-28 meses |
| **Peso Médio por Categoria** | kg | 90 dias | `Média(Peso_Atual) GROUP BY Categoria` | ✅ Peso atual do animal | Varia por tipo |
| **Taxa Reposição** | % | 90 dias | `(Novilhas 1ª cobertura) / (Fêmeas descartadas) * 100` | ⚠️ Depende de status_reprodutivo | 100-150% |
| **Evolução do Efetivo** | cabeças | Série temporal | `COUNT(Animais Ativos) por data` | ✅ Snapshots históricos | Trending |
| **Composição do Rebanho** | % | 90 dias | `(Qtd Categoria) / (Total) * 100` | ✅ Categoria automática | Varia por tipo |

### 3.2 Indicadores Específicos de Corte

Mostrar **APENAS se `tipo_exploracao IN ('CORTE', 'MISTO')`**:

| Indicador | Unidade | Período | Fórmula | Viabilidade | Benchmark |
|-----------|---------|---------|---------|--| --- |
| **Taxa de Desfrute** | % | 12 meses | `(Animais vendidos/descartados) / (Efetivo médio) * 100` | ✅ Venda + descarte via eventos | 40-60% |

### 3.3 Indicadores Específicos de Leite

Mostrar **APENAS se `tipo_exploracao IN ('LEITE', 'MISTO')`**:

| Indicador | Unidade | Período | Fórmula | Viabilidade | Benchmark |
|-----------|---------|---------|---------|--| --- |
| **% Vacas em Lactação** | % | 90 dias | `(Vacas lactação) / (Total fêmeas > 2 anos) * 100` | ✅ Status via eventos | 55-70% |
| **Período Seco Médio** | dias | 12 meses | `Média(Data_Secagem - Data_Último_Parto)` | ⚠️ Requer evento "secagem" | 45-75 dias |

---

## 4. Detalhamento por Indicador

### Para Cada Indicador (Template):

```markdown
#### Nome do Indicador
- **Fórmula**: LaTeX ou pseudocódigo
- **Dados Necessários**: Tabelas/colunas exatas
- **Viabilidade**: ✅/⚠️/❌ + motivo
- **Período Padrão**: dias/meses/ano/safra
- **Benchmark**: valor ruim → bom para Brasil Central
- **Unidade**: kg, %, dias, cabeças, etc.
- **Tipo de Cálculo**: server-side vs client-side vs view materializada
```

**Exemplos detalhados**:

### ✅ Ganho Médio Diário (GMD)

$$\text{GMD} = \frac{\text{Peso}_\text{final} - \text{Peso}_\text{inicial}}{\text{Dias entre pesagens}}$$

- **Dados**: `pesos_animal(animal_id, data_pesagem, peso_kg)` — histórico de pesagens de um animal
- **Viabilidade**: ✅ Calculável com schema atual (pesagens em `pesos_animal`)
- **Período**: 30/90/180 dias (padrão 90)
- **Benchmark**: 0,8-1,5 kg/d (corte), 0,3-0,7 kg/d (leite manutenção)
- **Cálculo**: SQL aggregation com `pesos_animal` filtrado por animal_id e data_pesagem >= N (mínimo 2 pesagens)

### ✅ Taxa de Natalidade

$$\text{Taxa Natalidade} = \frac{\text{Bezerros nascidos}}{\text{Fêmeas aptas reprodução}} \times 100$$

- **Dados**: `eventos_rebanho(tipo='parto', animal_id, data_evento)` + `animais(sexo, status_reprodutivo)`
- **Viabilidade**: ✅ Requer sexo do bezerro (novo campo em `parto`? Hoje é None)
- **Período**: 90 dias
- **Benchmark**: 80-95%
- **Cálculo**: Trigger parto cria 1-2 bezerros; contar by data_evento

### ⚠️ Taxa de Reposição

$$\text{Taxa Reposição} = \frac{\text{Novilhas 1ª cobertura confirmada}}{\text{Fêmeas descartadas}} \times 100$$

- **Dados**: `eventos_rebanho(tipo='diagnostico_prenhez', resultado='positivo')` filtered por idade < 2 anos
- **Viabilidade**: ⚠️ Requer lógica de "primeira cobertura confirmada" (complexo: pode ter repetidas antes)
- **Período**: 90 dias
- **Benchmark**: 100-150%
- **Cálculo**: Server Action + indexed query

---

## 5. Filtros & Períodos

### 5.1 Filtros Disponíveis

1. **Período** (obrigatório):
   - Presets: `30d`, `90d`, `365d`, `safra` (1 jan - 31 dez)
   - Custom: date range (data_inicio, data_fim)
   - Default: 90 dias

2. **Lote** (multi-select, opcional):
   - Carrega de `lotes` table
   - Filtra `animais` por lote_id
   - Mostrar contagem: "Lote A (25 animais)"

3. **Categoria** (multi-select, opcional):
   - Estático: Bezerra, Vaca, Novilha, Touro, etc. (por tipo_rebanho)
   - Filtra `animais` by categoria

4. **Fazenda** (dropdown, se usuário > 1 fazenda):
   - Carrega de `profiles.fazenda_id` + acesso via RLS
   - Mudar fazenda recarrega todos os indicadores

### 5.2 Persistência de Filtros

- Salvar seleção em `sessionStorage` (URL encoded via query params)
- Ex: `/dashboard/rebanho/indicadores?lotes=abc,def&categoria=vaca&periodo=90d`

---

## 6. Comparativo Entre Lotes

### UI Proposta

```
┌────────────────────────────────────────────────┐
│ TABELA: Top 5 Lotes por GMD (90 dias)         │
├──────┬──────────┬──────────┬────────┬────────┤
│ Rank │ Lote     │ GMD (kg) │ n Anim │ Trend  │
├──────┼──────────┼──────────┼────────┼────────┤
│  1   │ Lote A   │ 1.35     │ 25     │ ↑ +0.1 │
│  2   │ Lote B   │ 1.22     │ 18     │ →      │
│  3   │ Lote C   │ 1.10     │ 42     │ ↓ -0.2 │
└──────┴──────────┴──────────┴────────┴────────┘

Gráfico: Barras agrupadas (GMD por lote)
```

**Indicadores comparáveis**:
- GMD (corte), Taxa Natalidade, Taxa Prenhez, Peso Médio

**Implementação**:
- Tabela com ranking (1-5 lotes top)
- Gráfico de barras (Recharts BarChart) com legenda
- Click no lote → filtro aplicado automático

---

## 7. Gráficos (Recharts)

### 7.1 GMD Timeline

```
LineChart: tempo no eixo X, GMD no eixo Y
- Linha por animal ou por lote (agrupável)
- Tooltip com animal_id, peso, data, GMD calculado
- XAxis: datas (format DD/MM)
```

### 7.2 Distribuição Etária (Composição)

```
PieChart ou DonutChart: % por categoria
- Cores: azul (Bezerro), verde (Novilha), vermelho (Vaca), laranja (Touro)
- Label: "Vaca (40%)" 
- Click na fatia → filtro por categoria
```

### 7.3 Evolução do Efetivo

```
LineChart: timeline com marcadores de eventos
- Linha: COUNT(Animais Ativos) por mês
- Marcadores: 🟢 nascimentos, 🔴 mortes, 🔵 vendas
- Annotation com números exatos ao hover
```

### 7.4 Natalidade vs. Mortalidade

```
BarChart agrupado: meses no eixo X
- Duas barras por mês: Natalidade (verde) | Mortalidade (vermelho)
- Stacked alternativo se preferir
- XAxis: meses (JAN, FEV, MAR, etc.)
```

### 7.5 Composição do Rebanho (Stacked Bar)

```
BarChart 100% stacked: periodos (30d, 60d, 90d) no X
- Segmentos: Bezerro, Novilha, Vaca, Touro
- Proporcional ao total de cabeças
- Legenda com cores + % ao hover
```

### 7.6 Comparativo Entre Lotes

```
BarChart agrupado: lotes no X, GMD/Taxa Natalidade no Y
- Cores diferentes por lote
- Tooltip: lote, indicador, valor
```

---

## 8. Export PDF & CSV

### 8.1 CSV Export

**Estrutura**:
```
Indicador,Período,Lote(s),Valor,Unidade,Benchmark,Status
GMD,90d,Lote A,1.35,kg/d,0.8-1.5,✓ OK
Taxa Natalidade,90d,Todos,87.5,%,80-95,✓ OK
...
```

**Biblioteca**: usar `papaparse` (já no projeto?) ou nativa `Blob` + CSV
**Encoding**: UTF-8 BOM (Excel BR)
**Separador**: `;` (padrão Excel Brasil)

### 8.2 PDF Export

**Estrutura**:
```
┌────────────────────────────────────────────────┐
│            📊 RELATÓRIO DE INDICADORES         │
│            GestSilo Pro — Rebanho              │
├────────────────────────────────────────────────┤
│ Fazenda: Exemplo                              │
│ Período: 01/03/2026 a 30/05/2026              │
│ Filtros: Lotes A, B | Tipo: Leite             │
├────────────────────────────────────────────────┤
│                                                │
│ INDICADORES RESUMIDOS (Tabela)                │
│ ┌─────────────────┬──────┬─────┐             │
│ │ Indicador       │ Valor│ Meta│             │
│ │ GMD             │ 1.35 │ 1.2 │             │
│ │ Taxa Natalidad │ 87%  │ 80% │             │
│ │ ...             │      │     │             │
│ └─────────────────┴──────┴─────┘             │
│                                                │
│ [GRÁFICO 1: GMD Timeline]                    │
│ [GRÁFICO 2: Composição]                      │
│ [GRÁFICO 3: Natalidade vs Mortalidade]      │
│                                                │
│ ─────────────────────────────────────────    │
│ Gerado: 05/05/2026 às 14:32 por João Silva  │
│ Versão: 1.0 | GestSilo Pro                   │
└────────────────────────────────────────────────┘
```

**Biblioteca**:
- ⚠️ Investigar se `jsPDF` + `html2canvas` já está instalado
- Alternativa: `react-pdf` (lighter) ou `puppeteer` em server-side

**Geração**: Server Action `/api/rebanho/export-pdf` (renderizar HTML → PDF)

---

## 9. Mini-Card no Dashboard Principal

### Posição & Design

```
┌──────────────────────────────┐
│ 📊 Rebanho                   │  (novo card em grid)
├──────────────────────────────┤
│ Total: 125 animais    ↑ +5   │
│ GMD: 1.32 kg/d        ↓ -0.1 │
│ Prenhez: 86%          → 86%  │
│                               │
│        [Ver Todos] →         │
└──────────────────────────────┘
```

**Dados exibidos** (período: últimos 90 dias):
- Total de animais ativos
- GMD atual vs. GMD 90d atrás (trend: ↑/↓/→)
- Taxa de prenhez
- Link: "Ver Todos → `/dashboard/rebanho/indicadores`"

**Performance**: cache com `revalidate: 300` (5 min) em server action

---

## 10. Estrutura de Rotas & Componentes

### Rota: `/dashboard/rebanho/indicadores`

```
app/dashboard/rebanho/indicadores/
├── page.tsx                    # RSC → layout + load indicators
├── IndicadoresClient.tsx       # Filtros + gráficos (use client)
├── TablesIndicadores.tsx       # Tabelas comparativas
├── actions.ts                  # Server Actions (queries + export)
└── GraficosRebanho.tsx         # Componente Recharts reutilizável
```

### Componentes a Criar

1. **FiltrosIndicadores.tsx** (`use client`)
   - Dropdowns: período, lotes, categorias, fazenda
   - Aplicar/Resetar
   - Persist em queryParams

2. **CardIndicador.tsx**
   - Nome, valor, unidade, benchmark, status (✓/⚠️/✗)
   - Trend (↑/↓/→)
   - Responsive grid 2-4 colunas

3. **GraficoGMD.tsx**
   - LineChart com configuração dinâmica
   - Props: animais[], periodo

4. **GraficoComposicao.tsx**
   - PieChart ou DonutChart
   - Animação ao carregar

5. **ComparativoLotes.tsx**
   - Tabela + BarChart agrupado
   - Ranking 1-5

### Functions em `lib/supabase/rebanho.ts` (estender)

```typescript
export async function calcularGMD(
  animalIds: string[], 
  dataInicio: Date, 
  dataFim: Date
): Promise<{ animal_id: string; gmd: number }[]>

export async function calcularIndicadores(
  filtros: FiltrosIndicadores
): Promise<IndicadoresRebanho>

export async function exportarIndicadoresCSV(
  filtros: FiltrosIndicadores
): Promise<Blob>

export async function exportarIndicadoresPDF(
  filtros: FiltrosIndicadores
): Promise<Blob>
```

---

## 10.5 Estados do Componente CardIndicador

Cada card de indicador suporta 4 estados:

```
┌─────────────────────────┐
│ LOADING                 │
├─────────────────────────┤
│ ⌛ Carregando...        │
│    (skeleton placeholder)
│                         │
└─────────────────────────┘

┌─────────────────────────┐
│ OK (sucesso)            │
├─────────────────────────┤
│ 📊 GMD                  │
│ Valor: 1.35 kg/d        │
│ Meta:  1.20 kg/d ✓      │
│ ↑ +0.15 (trend)        │
└─────────────────────────┘

┌─────────────────────────┐
│ INSUFFICIENT_DATA       │
├─────────────────────────┤
│ ⚠️ Dados insuficientes │
│ GMD precisa ≥2 pesagens │
│ Registre mais pesagens  │
└─────────────────────────┘

┌─────────────────────────┐
│ ERROR                   │
├─────────────────────────┤
│ ❌ Erro ao calcular    │
│ Tente novamente →      │
│ (botão refresh)        │
└─────────────────────────┘
```

---

## 11. Performance & Caching

### Padrão de Cálculo

| Indicador | Onde | Caching |
|-----------|------|---------|
| GMD | SQL aggregation | 5 min (revalidate 300) |
| Taxa Natalidade | SQL COUNT | 5 min |
| Composição | Categoria + COUNT | 1 min (frequente) |
| Gráficos | Server → JSON | 5 min |
| PDF/CSV | Server Action | 0 (gerado ao request) |

### Otimizações

1. **Índices esperados** (validar após implementar):
   - `idx_pesos_animal_animal_id_data_pesagem`
   - `idx_eventos_rebanho_tipo_data_evento_animal_id`
   - `idx_animais_status_categoria_fazenda_id`

2. **Lazy loading**:
   - Gráficos carregam após tabelas (skeleton placeholder)
   - Paginação: primeiros 50 lotes (se houver)

3. **Server Actions com Cache (5 min)**:
   - Filtros (período, lote, categoria) enviados ao Server Action `calcularIndicadores()`
   - Server Action cacheia via `revalidateTag('indicadores')` + hash de filtros
   - React state mantém resultado em sessionStorage (para UX responsiva)
   - Ao mudar fazenda: limpar cache, refetch obrigatório
   - Não usar client-side filtering (impossível cachear, viola RLS)

### 11.5 Índices SQL (Pré-requisito)

Criar antes de iniciar implementação:

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

---

## 12. Critérios de Aceite (Mensuráveis)

- [ ] **GMD**: calcula corretamente para animal com ≥2 pesagens em 90d, considerando (Peso_Final - Peso_Inicial) / dias
- [ ] **Taxa Natalidade**: retorna (Bezerros nascidos) / (Fêmeas aptas) com ±2% margem de erro
- [ ] **Taxa Mortalidade**: separa geral ≠ bezerros <desmame (tags SQL corretos)
- [ ] **Taxa Prenhez**: filtra fêmeas por status_reprodutivo='prenha' via evento diagnóstico_prenhez positivo
- [ ] **IEP**: calcula média de partos por fêmea com histórico de 12 meses, rejeita se < 2 partos
- [ ] **Filtros**: aplicar período + lote + categoria <500ms (sem refetch de dados)
- [ ] **Gráficos**: renderizam em <1s (Recharts, 1000+ data points)
- [ ] **Export CSV**: abre corretamente no Excel BR (separador `;`, encoding UTF-8 BOM)
- [ ] **Export PDF**: gera em <3s para rebanho 500 animais, inclui 3+ gráficos + tabela
- [ ] **Mini-card**: carrega em <200ms (cache 5min), atualiza ao mudar período
- [ ] **Indicadores específicos tipo**: corte mostra Desfrute; leite mostra %Lactação/Seco (ocultar outros)
- [ ] **Composição**: % por categoria soma 100% com tolerância arredondamento
- [ ] **RLS**: operador vê apenas dados fazenda (validado em cada query)
- [ ] **TypeScript**: 0 erros strict mode, nenhum `any`
- [ ] **Testes**: 50+ testes (indicadores + queries + RLS, Vitest)
- [ ] **Performance Lighthouse**: sem regressão (LCP <2.5s, CLS <0.1)
- [ ] **Testes com Dataset Fixture**: cada indicador tem teste com dados conhecidos (ex: 5 animais, 3 pesagens, resultado esperado = X)
- [ ] **Edge Cases**: 
  - [ ] GMD com 0 pesagens → retorna null/erro
  - [ ] GMD com 1 pesagem → retorna null (requer ≥2)
  - [ ] Taxa natalidade com 0 fêmeas aptas → retorna 0% (não divide by zero)
  - [ ] Taxa mortalidade com 0 óbitos → retorna 0%
  - [ ] Sem partos registrados → IEP/IPP = null
  - [ ] Rebanho vazio → todos indicadores = 0 ou null, sem erro
- [ ] **Filtros**: período vazio ou inválido (data_fim < data_inicio) → erro legível ao usuário
- [ ] **RLS em Server Actions**: cada query filtra por `fazenda_id = get_minha_fazenda_id()` via `useAuth()` no servidor

---

## 13. Decisões Confirmadas

Estas decisões já foram aprovadas:

- ✅ **Tipo de Exploração**: Campo `tipo_exploracao` em `fazendas` (migration em seção 0.1)
- ✅ **Sexo das Crías**: Campo `sexo_crias` em `eventos_rebanho` (migration em seção 0.2)
- ✅ **Período de Safra**: Padrão 01 JAN - 31 DEZ (safra civil)
- ✅ **Benchmarks**: Hardcoded em Fase 4, tabela `benchmark_zootecnico_fazenda` em Fase 4.1
- ✅ **P205 fora do MVP**: Removido de indicadores Fase 4, será Fase 4.1

---

## 14. Fora de Escopo

### 14.1 Fase 4.1+ (Indicadores secundários)

- 📏 **Peso ao Desmame (P205)**: requer novo campo `data_desmame` em animais ou evento `desmame` em eventos_rebanho
- 🔄 **Alertas automáticos**: notificar se GMD cair <0.8 kg/d, prenhez <75% (requer Background Jobs)
- 💰 **Custo por @ / por litro**: integração com financeiro (custo ração + manutenção)
- 🏆 **Ranking entre lotes**: comparativo entre todos os lotes (atual é top-5)

### 14.2 Fase 5+ (Indicadores avançados)

- 🧬 **Eficiência alimentar**: conversão MS → GMD (requer consumo ração registrado)
- 🥛 **Qualidade do leite**: CCS, CBT, gordura % (requer integração com laborat.)
- 🔪 **Rendimento de carcaça**: % peso vivo → carcaça (pós-abate, sem dados)
- 🎯 **Previsão de rentabilidade**: margem líquida por animal (modelo econômico complexo)
- 📱 **Notificações mobile**: alertas de desvio de meta no app
- 🏆 **Ranking entre fazendas**: comparativo anônimo com produtor similar

---

## 15. Fórmulas em LaTeX

$$\text{GMD} = \frac{P_f - P_i}{t_f - t_i}$$

$$\text{TaxaNatalidade} = \frac{B_{nascidos}}{F_{aptas}} \times 100$$

$$\text{IEP} = \overline{t_i - t_{i-1}} \text{ (últimos 12 meses)}$$

$$\text{Composição}_c = \frac{N_c}{N_{total}} \times 100$$

---

## 17. Observações sobre Nome de Tabelas

- **Pesagens**: tabela `pesos_animal` (confirmado em database-snapshot.md)
  - Colunas: `id`, `fazenda_id`, `animal_id`, `data_pesagem`, `peso_kg`, `observacoes`, `created_at`
  - RLS ativa com filtro `fazenda_id`
  - Índices esperados: `idx_pesos_animal_animal_id_data_pesagem`

---

## 16. Sucesso da Fase 4

✅ Produtor acessa dashboard de indicadores em <2s (cache otimizado)  
✅ 15+ indicadores calculados corretamente (auditados contra literatura)  
✅ Gráficos Recharts renderizam em <1s mesmo com 500+ animais  
✅ Filtros por período/lote/categoria aplicam <500ms  
✅ Indicadores específicos de tipo aparecem/desaparecem corretamente  
✅ Comparativo entre lotes mostra ranking com trend (↑/↓/→)  
✅ Export PDF gera em <3s, inclui tabelas + gráficos + rodapé  
✅ Export CSV abre em Excel BR com separador `;` correto  
✅ Mini-card atualiza no dashboard principal a cada 5 min  
✅ RLS valida por fazenda em cada query (0 data leaks)  
✅ 50+ testes passando (validação + RLS + performance)  
✅ TypeScript strict, 0 erros de tipo  
✅ Lighthouse score ≥82/100 (sem regressão)  

---

**Status**: Pronto para detalhamento arquitetural (definir 13.1, 13.2, 13.3)  
**Próximo**: Decisões em aberto + estimativa de esforço = ~20h (3 dias)

