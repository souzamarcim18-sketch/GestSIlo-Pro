# PRD — Balanço Forrageiro

**Status**: Aguardando aprovação para SPEC
**Data**: 2026-05-22
**Fase**: Pesquisa concluída — PRD gerado

---

## 1. Contexto

O GestSilo tem como diferencial central a gestão de silos de silagem. Hoje, o módulo já calcula:
- Autonomia de estoque baseada no consumo histórico real dos últimos 30 dias (`app/dashboard/silos/helpers.ts`)
- Demanda projetada pelo rebanho usando parâmetros técnicos por categoria animal (`lib/services/planejamento-silagem.ts`)

Porém, **as duas lógicas nunca são cruzadas numa mesma tela**. O produtor precisa alternar entre o dashboard de silos e o wizard de planejamento para tentar estimar se o estoque vai durar até a próxima colheita — um exercício manual e sujeito a erros.

O Balanço Forrageiro resolve isso: **uma única tela que confronta o que o rebanho consome com o que o silo tem**, gerando dois números acionáveis — autonomia real e autonomia projetada — com destaque visual de criticidade.

Esse é o diferencial que justifica o GestSilo frente a planilhas: a plataforma sabe simultaneamente quanto silagem existe, quanto o rebanho precisa por dia e quanto tempo o estoque dura em cada cenário.

---

## 2. Rota e Navegação

**Rota**: `/dashboard/balanco-forrageiro`

**Sidebar**: Novo item no grupo `gerencialRoutes`, após "Silos" e antes de "Lavouras".
- Label: `Balanço Forrageiro`
- Ícone: `Scale` (Lucide React — representa equilíbrio/balanço)
- Visível para: **Administrador** e **Visualizador**
- Oculto para: **Operador** (mesmo padrão de `mao-de-obra` e `produtos`)

**Guard de acesso**: `layout.tsx` com redirect client-side para `/dashboard` quando `perfil === 'Operador'`, seguindo o padrão do módulo `pastagens/layout.tsx`.

---

## 3. Seletor de Período

O usuário escolhe o período de referência para o cálculo do **consumo histórico real**:

| Opção | Valor |
|---|---|
| 7 dias | `7` |
| 30 dias | `30` ← padrão |
| 60 dias | `60` |
| 90 dias | `90` |

**Importante**: O seletor afeta **apenas o Bloco A** (consumo histórico). O Bloco B (demanda projetada) é sempre calculado com base no rebanho atual — sem recorte temporal.

Implementado como `<ToggleGroup>` ou `<Tabs>` do shadcn/ui no topo da página, acima dos dois blocos.

---

## 4. KPIs no Topo

Quatro cards de leitura rápida, exibidos acima dos dois blocos:

| KPI | Fonte | Unidade |
|---|---|---|
| Estoque total atual | Soma de `movimentacoes_silo` (todas as entradas − todas as saídas) | toneladas MV |
| Consumo médio real/dia | Total de saídas no período selecionado ÷ número de dias | kg/dia |
| Autonomia real | `(estoque_total_kg) / consumo_real_dia` | dias |
| Autonomia projetada | `(estoque_total_kg) / demanda_projetada_dia` | dias |

As duas autonomias recebem coloração por criticidade:
- `< 10 dias` → vermelho (crítico)
- `10–29 dias` → âmbar (urgente)
- `≥ 30 dias` → verde (ok)

---

## 5. Dois Blocos Lado a Lado

### Bloco A — Consumo Histórico Real

**Fonte de dados**: `movimentacoes_silo` com `tipo = 'Saída'` e `subtipo != 'Descarte'`, filtradas pela `fazenda_id` e pelo período selecionado (últimos N dias a partir de hoje).

**Exibe**:
- Consumo total no período (kg)
- Consumo médio diário (kg/dia)
- Projeção de autonomia com base no consumo real: `estoque_atual_kg / consumo_diario_real`
- Nome dos silos que tiveram saídas no período, com sua contribuição individual

**Lógica existente a reaproveitar**:
A função `calcularConsumoDiario()` em `app/dashboard/silos/helpers.ts` já calcula consumo por silo a partir de um array de movimentações. A diferença é que ela usa `data_abertura_real` como ponto de partida; aqui o corte será pelo período selecionado. A mesma estrutura de cálculo se aplica.

O dashboard hoje usa esta fórmula (hardcoded em 30 dias):
```
consumoDiario = totalSaídas30dias / 30
autonomiaDias = Math.round((totalEstoqueAtual * 1000) / consumoDiario)
```
O Bloco A parametriza o `30` com o período selecionado pelo usuário.

---

### Bloco B — Demanda Projetada pelo Rebanho

**Fonte de dados**: tabela `animais` (filtrada por `status = 'Ativo'`) com contagem por `categoria`, cruzada com os parâmetros técnicos de `lib/constants/planejamento-silagem.ts` (CATEGORIAS_LEITE e CATEGORIAS_CORTE).

**Exibe**:
- Tabela de categorias com: categoria, quantidade de animais, demanda unitária (kg MS/dia), demanda total da categoria (kg MS/dia)
- Demanda total consolidada (kg MS/dia)
- Projeção de autonomia com base na demanda projetada: `estoque_atual_kg / demanda_total_kg_dia`

**Lógica existente a reaproveitar**:
`lib/services/planejamento-silagem.ts` já calcula `silagem_ms_dia_kg` por categoria via:
```
silagem_ms_dia_kg = cms_base_kg_dia × fator_consumo × pct_silagem_base × fator_silagem
```
Porém o wizard usa categorias predefinidas (L1-L7, C1-C6) com `quantidade_cabecas` manual. O Balanço Forrageiro usará as categorias reais do banco (`animais.categoria`) e precisará de um mapeamento entre os nomes do banco e os parâmetros do wizard.

**Desafio de mapeamento**: Os nomes de categoria no banco (ex: "Vaca em Lactação", "Novilha (Prenha)") não são idênticos aos IDs das categorias do wizard (L1, L2, etc.). O SPEC definirá o mapeamento exato com base nos valores reais do banco.

**Sistema de produção**: Para o cálculo de demanda projetada, será necessário um valor padrão de sistema de produção. Proposta: usar `semiconfinado` como padrão (fatores 1.0 para consumo e silagem), com possibilidade futura de vir da configuração da fazenda.

---

## 6. Comparativo

Seção abaixo dos dois blocos, com destaque visual:

| Métrica | Cálculo |
|---|---|
| Saldo diário (superávit/déficit) | `consumo_real_dia − demanda_projetada_dia` |
| Diferença de autonomia | `autonomia_real_dias − autonomia_projetada_dias` |
| Status | Déficit (consumo > projetado), Superávit, ou Equilibrado (±5%) |

Exibido como um card com badge colorido: **Déficit** (vermelho), **Superávit** (verde), **Equilibrado** (cinza/neutro).

---

## 7. Permissões

| Perfil | Acesso |
|---|---|
| Administrador | Acesso total (leitura) |
| Visualizador | Acesso total (leitura) |
| Operador | Sem acesso — `layout.tsx` redireciona para `/dashboard` |

Nenhuma escrita no banco. Todas as operações são somente leitura (SELECT).

---

## 8. Tabelas Envolvidas

Com base na pesquisa do código:

| Tabela | Uso |
|---|---|
| `silos` | Lista de silos da fazenda (id, nome, volume_ensilado_ton_mv) |
| `movimentacoes_silo` | Cálculo de estoque atual e consumo histórico (tipo, subtipo, quantidade, data, silo_id) |
| `animais` | Contagem de animais ativos por categoria (status = 'Ativo', categoria) |
| `fazendas` | fazenda_id do usuário (via RLS, implícito) |

Nenhuma migration necessária. Todas as tabelas já existem e têm RLS configurado.

---

## 9. Queries Necessárias

### Q1 — Estoque atual por silo
Já existe parcialmente no `app/dashboard/page.tsx` (linhas de `estoquePorSilo`). Precisa ser extraída para uma função reutilizável em `lib/supabase/silos.ts` (ou equivalente). Busca todas as movimentacoes_silo da fazenda (sem filtro de data), agrupando entradas − saídas por silo_id. **Não existe como função isolada** — precisa ser criada.

### Q2 — Consumo histórico por período parametrizável
Hoje hardcoded em 30 dias no `page.tsx`. Precisa se tornar uma query que aceita `periodo_dias` como parâmetro, filtrando movimentacoes_silo com `tipo = 'Saída'`, `subtipo != 'Descarte'`, e `data >= (hoje − periodo_dias)`. **Não existe como função isolada com parâmetro** — precisa ser criada (adaptação da lógica existente).

### Q3 — Contagem de animais ativos por categoria
Já existe no `app/dashboard/page.tsx` (query que seleciona `categoria` de `animais` com `status = 'Ativo'` e agrupa em JS). Precisa ser extraída para função reutilizável em `lib/supabase/rebanho.ts`. **Existe inline no page.tsx** — precisa ser extraída.

### Q4 — Dados dos silos (metadados)
Já existe via `q.silos.list()` em `lib/supabase/queries-audit.ts`. Usada apenas para exibir nomes dos silos no Bloco A. **Já existe** — reaproveitar.

---

## 10. Componentes a Criar

| Componente | Caminho | Responsabilidade |
|---|---|---|
| `layout.tsx` | `app/dashboard/balanco-forrageiro/layout.tsx` | Guard client-side: redireciona Operador para `/dashboard` |
| `page.tsx` | `app/dashboard/balanco-forrageiro/page.tsx` | RSC: autenticação + Promise.all das 3 queries paralelas (estoque, consumo histórico, animais por categoria) + passa props para Client |
| `BalancoForrageiroClient.tsx` | `app/dashboard/balanco-forrageiro/BalancoForrageiroClient.tsx` | Client hub: estado do período selecionado, re-fetch ao mudar período, composição dos sub-componentes |
| `PeriodoSelector.tsx` | `app/dashboard/balanco-forrageiro/components/PeriodoSelector.tsx` | Toggle de 4 opções (7/30/60/90 dias); dispara refetch no Client |
| `KpisSection.tsx` | `app/dashboard/balanco-forrageiro/components/KpisSection.tsx` | 4 cards: estoque total, consumo real/dia, autonomia real, autonomia projetada — com badge de criticidade |
| `ConsumoHistoricoCard.tsx` | `app/dashboard/balanco-forrageiro/components/ConsumoHistoricoCard.tsx` | Bloco A: consumo total, médio diário, projeção de autonomia real, breakdown por silo |
| `DemandaProjetadaCard.tsx` | `app/dashboard/balanco-forrageiro/components/DemandaProjetadaCard.tsx` | Bloco B: tabela categoria × demanda, demanda total, projeção de autonomia projetada |
| `ComparativoSection.tsx` | `app/dashboard/balanco-forrageiro/components/ComparativoSection.tsx` | Saldo diário e diferença de autonomia com badge Déficit/Superávit/Equilibrado |

---

## 11. Fora do Escopo desta Versão

- Nenhuma escrita no banco (zero mutações, zero Server Actions)
- Nenhuma migration de banco de dados
- Nenhuma integração com o módulo Financeiro
- Nenhum gráfico de série temporal (histórico de autonomia ao longo do tempo) — v2
- Nenhum configurador de sistema de produção por fazenda — v2 (default `semiconfinado`)
- Nenhuma exportação PDF/XLSX do balanço — v2
- Nenhum alerta proativo por email baseado no balanço — v2

---

## 12. Dependências e Riscos

### Mapeamento de categorias (risco médio)
Os nomes de categoria no banco (`animais.categoria`) são strings livres definidas historicamente. O SPEC precisa mapear cada valor possível do banco para as categorias técnicas do wizard (L1-L7, C1-C6). Categorias sem mapeamento receberão um valor padrão conservador (proposta: `L3 — Vaca seca` como fallback, que tem consumo menor e não superestima a demanda).

### Silos sem movimentação recente (risco baixo)
Se não houver saídas no período selecionado, `consumoDiario = 0` e a autonomia real seria infinita. O componente exibirá "—" ou "Sem dados no período" nesse caso — mesma abordagem do dashboard hoje.

### Performance (risco baixo)
As 3 queries são simples agregações em tabelas com RLS por `fazenda_id`. O estoque total já é calculado em tempo real no dashboard principal sem problemas de performance. O Promise.all no RSC mantém o carregamento paralelo.

---

**PRD gerado em PRD-balanco-forrageiro.md — aguardando aprovação para gerar SPEC.**
