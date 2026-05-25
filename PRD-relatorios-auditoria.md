# PRD — Auditoria do Módulo de Relatórios

> **Data da auditoria**: 2026-05-25  
> **Auditor**: Claude Sonnet 4.6 (assistente técnico)  
> **Branch**: main  
> **Commit de referência**: ff2d8c7

---

## Resumo Executivo (5 linhas)

O módulo `/dashboard/relatorios` existe e funciona, mas cobre apenas **6 dos 14 módulos** da plataforma, todos exportando exclusivamente **Excel** via `xlsx`. Não há PDF, nenhum filtro de período, e o relatório "Estoque" é um alias duplicado do relatório "Insumos". Os módulos com **zero cobertura** incluem todos os sub-módulos de Rebanho, Produtos, Pastagens, Mão de Obra, Planejamento de Compras e Balanço Forrageiro — representando a maior parte da evolução recente da plataforma. Os dados existentes são **100% reais** (sem mock), mas a query `q.insumos.list()` viola o padrão do projeto com `select('*')`. O módulo é **visível e acessível para Operadores**, sem qualquer restrição de perfil.

---

## 1. Estado Atual (snapshot)

### Estrutura de arquivos

```
app/dashboard/relatorios/
├── page.tsx                  # RSC — valida auth + getCurrentFazendaId(), passa fazendaId ao Client
└── RelatoriosClient.tsx      # Client Component — grid de 6 cards, funções exportXxx(), xlsx

lib/pdf/
├── gerarPdfIndicadoresRebanho.ts   # jsPDF + autoTable — PDF de indicadores zootécnicos (SEPARADO)
└── gerarPdfPlanejamento.ts         # jsPDF + autoTable — PDF de planejamento de silagem (SEPARADO)

lib/supabase/
└── queries-audit.ts          # Camada central de queries auditadas — usada pelo módulo via q.*
```

**Total**: 2 arquivos no módulo (nenhum `layout.tsx`, nenhum `actions.ts`, nenhum `components/`).

### Bibliotecas de export

| Biblioteca | Onde | Uso |
|---|---|---|
| `xlsx` | `RelatoriosClient.tsx:4` | Geração de `.xlsx` (todos os 6 relatórios) |
| `jsPDF` + `jspdf-autotable` | `lib/pdf/*.ts` | PDF — **não integrado** ao módulo Relatórios |

---

## 2. Inventário de Relatórios

| # | Relatório (label UI) | Função | Arquivo:linha | Status | Fonte de dados | Colunas exportadas | Export | Filtros |
|---|---|---|---|---|---|---|---|---|
| 1 | Produtividade por Talhão | `exportTalhoes` | `RelatoriosClient.tsx:66` | ✅ Dados reais | `q.talhoes.list()` → tabela `talhoes` | Nome, Área (ha), Tipo de Solo, Status | Excel (.xlsx) | Nenhum |
| 2 | Movimentação de Silos | `exportSilos` | `RelatoriosClient.tsx:38` | ✅ Dados reais | `q.silos.list()` + `q.movimentacoesSilo.listBySilos()` | Aba Silos: Nome, Tipo, Vol. Ensilado, MS%; Aba Movs: Silo ID, Data, Tipo, Quantidade, Responsável, Obs | Excel (.xlsx, 2 abas) | Nenhum |
| 3 | Consumo de Insumos | `exportInsumos` | `RelatoriosClient.tsx:54` | ✅ Dados reais | `q.insumos.list()` → `select('*')` ⚠️ | Nome, Unidade, Estoque Atual, Estoque Mínimo, N(%), P(%), K(%) | Excel (.xlsx) | Nenhum |
| 4 | Custo Operacional (Frota) | `exportFrota` | `RelatoriosClient.tsx:77` | ⚠️ Parcial | `q.maquinas.list()` → tabela `maquinas` | Nome, Tipo, Marca, Modelo, Ano, Identificação, Consumo Médio, Valor Aquisição | Excel (.xlsx) | Nenhum |
| 5 | Financeiro Geral | `exportFinanceiro` | `RelatoriosClient.tsx:27` | ✅ Dados reais | `q.financeiro.list()` → tabela `financeiro` | Data, Tipo, Categoria, Descrição, Valor (R$) | Excel (.xlsx) | Nenhum |
| 6 | Inventário de Estoque | `exportInsumos` (alias) | `RelatoriosClient.tsx:98` | ⚠️ Duplicado | Idêntico ao relatório #3 | Idem relatório #3 | Excel (.xlsx) | Nenhum |

**Legenda**:
- ✅ Dados reais e funcionais
- ⚠️ Parcial: dados reais mas escopo ou qualidade incompleta
- ❌ Ausente: nenhum relatório

**Notas sobre relatório #4 (Frota)**:
O label da UI promete "análise de gastos com manutenção e combustível por máquina", mas a query retorna apenas o cadastro da máquina (`maquinas`), sem cruzar com `manutencoes`, `abastecimentos` ou `uso_maquinas`. Classificado como ⚠️ porque os dados são reais, mas não entregam o que o título promete.

---

## 3. Gap Analysis por Módulo

| Módulo | Relatório existente | Status | Observações |
|---|---|---|---|
| **Silos / Silagem** | Movimentação de Silos (#2) | ✅ Parcial | Sem autonomia em dias, sem perdas calculadas, sem estoque atual por silo |
| **Talhões / Lavouras** | Produtividade por Talhão (#1) | ⚠️ Parcial | Exporta cadastro; sem ciclos agrícolas, sem produtividade real (ton/ha), sem atividades de campo |
| **Frota** | Custo Operacional (#4) | ⚠️ Parcial | Exporta cadastro de máquinas; sem custos de manutenção, abastecimentos ou diário de bordo |
| **Insumos** | Consumo de Insumos (#3) | ⚠️ Parcial | Exporta posição de estoque; sem movimentações históricas, sem consumo por período |
| **Financeiro** | Financeiro Geral (#5) | ✅ Funcional | DRE simplificado; sem filtro de período, sem separação Receita/Despesa em abas, sem fluxo de caixa |
| **Rebanho — Leiteira** | — | ❌ Ausente | `lib/pdf/gerarPdfIndicadoresRebanho.ts` existe mas não está integrado ao módulo |
| **Rebanho — Corte** | — | ❌ Ausente | GMD, arrobas, projeção de abate — nenhuma cobertura |
| **Rebanho — Sanidade** | — | ❌ Ausente | Vacinações, vermifugações, histórico sanitário — nenhuma cobertura |
| **Rebanho — Reprodução** | — | ❌ Ausente | Taxa prenhez, IEP, IATF, repetidoras — nenhuma cobertura |
| **Produtos** | — | ❌ Ausente | Movimentações, vendas, estoque de produtos — nenhuma cobertura |
| **Planejamento de Compras** | — | ❌ Ausente | Lista de compras, status por insumo — nenhuma cobertura |
| **Pastagens** | — | ❌ Ausente | UA/ha, ocupações, histórico de manejo — nenhuma cobertura |
| **Mão de Obra** | — | ❌ Ausente | Custos mensais, KPIs, colaboradores, atividades — nenhuma cobertura |
| **Balanço Forrageiro** | — | ❌ Ausente | Consumo real vs. demanda projetada — nenhuma cobertura |

**Resumo**: 2 relatórios funcionais, 3 parciais (escopo aquém do prometido), 1 duplicado, **8 módulos sem nenhuma cobertura**.

---

## 4. Problemas Encontrados

### P1 — `select('*')` na query de Insumos ❌ (viola padrão do projeto)

**Arquivo**: `lib/supabase/queries-audit.ts:485`

```typescript
// queries-audit.ts:483-487
let query = supabase
  .from('insumos')
  .select('*')           // ← VIOLAÇÃO: CLAUDE.md exige colunas explícitas
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
```

A mesma violação ocorre em múltiplas linhas do mesmo arquivo relacionadas a insumos e a outras entidades (ver lista completa abaixo). O módulo de relatórios usa `q.insumos.list()` que chama essa query.

**Linhas com `select('*')` em `queries-audit.ts`**:
- `485` — `insumos.list()`
- `562` — `insumos.getById()`
- `652` — `movimentacoes_insumo.listByInsumo()`
- `777`, `787`, `803` — `categorias_insumo`
- `818`, `829` — `tipos_insumo`
- `860` — server-side `insumos.getById()`
- `1037` — server-side `tipos_insumo.getById()`
- `1387`, `1409` — `atividades_campo`
- `1480` — `eventos_dap`
- `1652`, `1676`, `1756`, `1784` — `planejamentos_silagem`

> ⚠️ Escopo desta auditoria: as violações impactam o módulo de relatórios via `q.insumos.list()`. As demais ocorrências são em outros contextos e devem ser corrigidas separadamente.

### P2 — Relatório "Custo Operacional (Frota)" com escopo enganoso ⚠️

**Arquivo**: `RelatoriosClient.tsx:112`

A `CardDescription` diz: *"Análise de gastos com manutenção e combustível por máquina"*, mas `exportFrota()` (linha 77) consulta apenas `maquinas` — sem cruzar com `manutencoes`, `abastecimentos` ou `uso_maquinas`. O usuário baixa um Excel com dados de cadastro, não de custo.

### P3 — Relatório "Inventário de Estoque" é alias de "Consumo de Insumos" ⚠️

**Arquivo**: `RelatoriosClient.tsx:98`

```typescript
const exportFunctions: Record<ReportKey, () => Promise<void>> = {
  ...
  estoque: exportInsumos,  // ← idêntico ao relatório 'insumos'
};
```

O usuário vê dois cards distintos na UI que geram o mesmo arquivo com o mesmo conteúdo.

### P4 — Operador tem acesso ao módulo Relatórios ⚠️

**Arquivo**: `components/Sidebar.tsx:214-217`

```typescript
const visibleGerencialRoutes = profile?.perfil === 'Operador'
  ? gerencialRoutes.filter(
      (r) =>
        r.href !== '/dashboard/mao-de-obra' &&
        r.href !== '/dashboard/balanco-forrageiro'
      // 'relatorios' NÃO está filtrado aqui
    )
  : gerencialRoutes;
```

O Operador vê e acessa o item "Relatórios" no Sidebar. Dependendo do modelo de autorização, isso pode ou não ser intencional. Nenhum `layout.tsx` existe em `relatorios/` para bloquear via redirect.

Pela lógica atual das queries auditadas, o Operador provavelmente só vê dados permitidos pelo RLS, mas o acesso à rota não é barrado na UI.

### P5 — Sem filtro de período em nenhum relatório ⚠️

Todos os 6 relatórios exportam **todo o histórico** sem possibilidade de filtrar por data. O relatório Financeiro, em particular, pode retornar anos de lançamentos em uma única aba, sem qualquer segmentação.

### P6 — PDFs em `lib/pdf/` não integrados ao módulo ⚠️

| Arquivo | PDF gerado | Onde é chamado |
|---|---|---|
| `lib/pdf/gerarPdfIndicadoresRebanho.ts` | Indicadores zootécnicos (GMD, taxa natalidade, etc.) | `app/dashboard/rebanho/indicadores/` (isolado) |
| `lib/pdf/gerarPdfPlanejamento.ts` | Planejamento de silagem (rebanho, área, resultados) | `app/dashboard/planejamento-silagem/` (isolado) |

Esses geradores existem e funcionam, mas não aparecem no módulo centralizado de Relatórios.

### P7 — Coluna "Silo ID" em vez de nome do silo ⚠️

**Arquivo**: `RelatoriosClient.tsx:44-45`

```typescript
const wbMovs = XLSX.utils.json_to_sheet(movs.map((m) => ({
  'Silo ID': m.silo_id,   // ← UUID no Excel — inutilizável pelo usuário
  ...
})));
```

A aba "Movimentações" do relatório de silos exporta o UUID do silo em vez do nome. Para cruzar com a aba "Silos" o usuário precisaria fazer VLOOKUP manualmente.

### P8 — Botão "Configurar Dashboards" desabilitado sem estimativa ⚠️

**Arquivo**: `RelatoriosClient.tsx:141`

```tsx
<Button variant="outline" disabled>
  Configurar Dashboards
</Button>
```

Funcionalidade desabilitada sem qualquer indicação ao usuário de quando estará disponível (sem tooltip, sem badge "Em breve").

---

## 5. Oportunidades Prioritárias

Ordenadas por impacto estimado para o usuário final:

### Alta Prioridade

1. **Relatório de Rebanho** — Módulo mais completo da plataforma, com 6 sub-módulos (leiteira, corte, sanidade, reprodução, indicadores, movimentações), sem nenhum relatório exportável além do PDF isolado em `/indicadores`. Um relatório Excel ou PDF consolidado teria altíssima demanda.

2. **Filtro de período no Financeiro** — O relatório mais estratégico carece de recorte temporal. Um select de "mês/ano" ou "período personalizado" permitiria DRE mensal e fluxo de caixa real.

3. **Corrigir escopo do relatório de Frota** — Cruzar `maquinas` com `manutencoes`, `abastecimentos` e `uso_maquinas` para entregar custo real por máquina, que é o que o título promete.

4. **Mão de Obra** — Módulo completo desde 22/05, com KPIs mensais já calculados (`getKpisMensais`). Um relatório Excel com custo por colaborador e por tipo de atividade seria direto de implementar.

5. **Pastagens** — Módulo completo desde 21/05 com dados de UA/ha, ocupações e eventos. Exportação de histórico de ocupações e eventos de manejo é alta demanda para decisão agronômica.

### Média Prioridade

6. **Relatório de Produtos** — Tabelas prontas, queries existem em `lib/supabase/produtos.ts`. Relatório de movimentações e posição de estoque é extensão natural.

7. **Melhorar relatório de Insumos** — Incluir histórico de movimentações (entradas/saídas) além da posição atual de estoque.

8. **Integrar PDFs de lib/pdf/ ao módulo central** — Expor "PDF de Indicadores Zootécnicos" e "PDF de Planejamento de Silagem" como opções dentro de `/dashboard/relatorios`.

9. **Balanço Forrageiro** — Lógica já implementada em `app/dashboard/balanco-forrageiro/`. Exportação do comparativo consumo real × demanda projetada seria extensão direta.

10. **Corrigir duplicata Estoque/Insumos** — Unificar os dois cards em um único relatório mais completo, ou diferenciá-los de forma significativa (ex: "Posição de Estoque" vs. "Histórico de Movimentações").

### Baixa Prioridade

11. **Nome do silo em vez de UUID na aba Movimentações** — Correção simples de UX no relatório de silos.
12. **Bloquear Operador no módulo via layout.tsx** — Decidir e documentar se Operador deve ou não ter acesso.
13. **Corrigir `select('*')` em `q.insumos.list()`** — Conformidade com padrão do projeto.

---

## 6. Perguntas em Aberto

Itens que precisam de decisão do Marcio antes de qualquer SPEC:

1. **Operador pode acessar relatórios?** O modelo de autorização atual (CLAUDE.md, 2026-05-21) diz que Operador acessa exclusivamente `/operador`. Relatórios é `/dashboard/*`. Deve-se redirecionar o Operador da mesma forma que outros módulos gerenciais?

2. **Qual formato preferido para novos relatórios: Excel, PDF ou ambos?** Os PDFs em `lib/pdf/` têm padrão visual consistente com cabeçalho GestSilo. Novos relatórios devem seguir esse padrão ou Excel é suficiente para todos?

3. **Filtro de período deve ser global ou por relatório?** Um seletor único de período no topo da página aplicaria a todos os relatórios simultaneamente, ou cada relatório deve ter seu próprio filtro?

4. **O relatório "Inventário de Estoque" deve ser diferenciado de "Consumo de Insumos"?** Se sim, qual seria o escopo de cada um? (Ex: Insumos = movimentações históricas; Estoque = posição atual por insumo e categoria.)

5. **Os relatórios de Rebanho devem ser agrupados em um único relatório multitabela (Excel com abas) ou relatórios separados por sub-módulo?** O módulo tem 6 dimensões: leiteira, corte, sanidade, reprodução, indicadores, composição.

6. **Planejamento de Compras deve ter relatório próprio ou é parte do relatório de Insumos?** A lista consolidada de compras (`calcularLinhasRelatorio()` em `lib/supabase/planejamento-compras.ts`) já está implementada como função pura, reutilizável.

7. **Há restrição de volume de dados para export?** Fazendas com histórico longo podem ter milhares de lançamentos no Financeiro. Deve-se impor limite ou paginar o export?

---

## Apêndice — Conformidade Técnica

| Critério | Status | Detalhes |
|---|---|---|
| `select('*')` em relatórios | ❌ | `q.insumos.list()` usa `select('*')` (queries-audit.ts:485) |
| Filtro por `fazenda_id` | ✅ | Todas as queries filtram via `getFazendaId()` obrigatório |
| Tipagem correta (sem `any`) | ✅ | Nenhum `any` no módulo `relatorios/` |
| Permissão Admin/Visualizador | ⚠️ | Nenhum guard implementado; Operador tem acesso |
| Validação auth no RSC | ✅ | `page.tsx:13` valida `getUser()` antes de renderizar |
| Formato de moeda/data | ⚠️ | Excel exporta valores numéricos brutos, sem formatação BRL ou pt-BR |
| Cabeçalho nos arquivos exportados | ⚠️ | Excel não tem linha de cabeçalho com fazenda/data; PDFs em lib/pdf/ têm |
| RLS como barreira de segurança | ✅ | RLS garante isolamento mesmo se query não filtrar explicitamente |
