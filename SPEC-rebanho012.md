# SPEC-rebanho012 — Refatoração Incremental do Módulo de Rebanho (Fases 0, 1 e 2)

> **Tipo**: contrato de execução. Esta SPEC é o documento que uma sessão futura de implementação
> usará para executar **exatamente** as Fases 0, 1 e 2 — sem ambiguidade de escopo.
> **Fontes obrigatórias**: `PRD-rebanho1.md` (estado atual), `PRD-rebanho2.md` (análise de impacto),
> código atual do repositório, e a arquitetura-alvo de 5 camadas.
> **Não inclui** Fases 3, 4 e 5 (apenas referenciadas como continuidade/dependência futura).
> **Restrição absoluta**: nenhuma mudança de schema, RPC, RLS ou contrato de dados central nesta SPEC.
> Data: 2026-06-30.

---

# 1. Contexto e objetivo

O módulo de rebanho é o maior e mais ramificado do app (~21k linhas) e cresceu como um guarda-chuva de 7+ sub-áreas (visão geral, indicadores, reprodução, leiteira, corte, sanidade, movimentações, lançamento em lote, lotes, importação) que compartilham apenas as tabelas `animais`/`lotes`/`eventos_rebanho` e o tipo `Animal`. A navegação é "hub + cards", sem submenu lateral; a ficha do animal (`[id]/page.tsx`, 688 linhas) é um god-component client-side que concentra fetch global, cálculo de corte inline e 7 abas; há strings de categoria divergentes replicadas em 3 lugares; e há código órfão remanescente da reestruturação anterior da reprodução.

A arquitetura-alvo prevê 5 camadas (Núcleo · Operação · Subdomínios técnicos · Indicadores · Planejamento/Integração). O PRD-2 concluiu que **apenas as Fases 0, 1 e 2 estão maduras para SPEC** — elas entregam a casca estrutural (estabilização de contratos + navegação + ficha enxuta) **sem tocar banco, RPC, RLS nem contratos de dados** e preservam todas as operações em massa. As Fases 3–5 dependem de decisões de produto ainda em aberto (definição/fonte de verdade dos indicadores, absorção da pesagem-em-lote, integração leite×silagem e financeiro, fachadas externas) e ficam **fora desta SPEC**.

**Objetivo desta SPEC**: estabilizar os contratos que envenenam a reorganização (Fase 0), entregar a árvore de navegação-alvo reaproveitando o submenu já prototipado (Fase 1) e transformar a ficha do animal em uma ficha enxuta focada no Núcleo, apontando para subáreas próprias (Fase 2) — tudo de forma incremental, revisável e reversível, preservando comportamento.

---

# 2. Escopo

## 2.1 O que entra

**Fase 0 — Estabilização de contratos**
- Consolidar as strings de categoria de animal numa fonte única em TypeScript (sem migração de banco), eliminando a divergência `'Novilha (Prenha)'` (tipo) vs `'Novilha Prenha'` (cálculo).
- Confirmar (via grafo de imports) e remover o código órfão da reprodução: redirects e componentes legados sem import vivo.
- Produzir um **inventário explícito** dos consumidores externos do rebanho (documento), congelando os contratos que a Fase 1 e a Fase 2 não podem quebrar.
- Congelar formalmente (por documentação + testes de borda) os contratos centrais: tipo `Animal`/`Lote`, `CSVValidacaoResult`/`CSVImportResult`, `ResultadoLote`, e a RPC `registrar_evento_com_status` como ponto único de escrita.

**Fase 1 — Casca de navegação**
- Reativar e ajustar o submenu de rebanho já prototipado no `Sidebar.tsx` (linhas 230-238, comentado).
- Agrupar as rotas existentes refletindo as camadas Núcleo/Operação/Subdomínios/Indicadores, **sem mover lógica de negócio pesada**.
- Reposicionar os entrypoints de operações em massa (cadastro rápido, CSV, lançamento em lote) para refletirem a camada de Operação, **mantendo as rotas e ações intactas**.
- Garantir que guards de plano/perfil e o fluxo atual do usuário continuem funcionando.

**Fase 2 — Extração da ficha do animal**
- Transformar a ficha em uma ficha enxuta do Núcleo: identificação + abas naturais por id (Eventos, Movimentações, Pesagens, Genealogia).
- Corrigir o anti-padrão de carregar 1000 animais + 100 lotes para exibir 1 animal — buscar por id.
- Extrair `DesempenhoCorteContent` (corte inline) para componente compartilhado com o `DashboardCorte`, sem reescrever cálculo.
- Transformar as abas de Leite e Sanidade em **resumo + link** para a área própria, reaproveitando os componentes existentes (`AbaProducaoLeiteira`, `AbaSanidade`).
- Alinhar a ficha ao padrão arquitetural do projeto (RSC quando viável), sem mudar regras de negócio.

## 2.2 O que NÃO entra (restrições absolutas)

- ❌ Unificação conceitual completa dos indicadores (Fase 4).
- ❌ Redesign completo da camada Operação com persistência nova de tarefas/agenda (Fase 3).
- ❌ Qualquer mudança de schema em `animais`, `pesos_animal`, `eventos_rebanho` ou qualquer tabela.
- ❌ Refatoração da RPC `registrar_evento_com_status`.
- ❌ Integração nova com Financeiro (venda/abate → receita).
- ❌ Integração nova leite × silagem (eficiência alimentar).
- ❌ Mudança em RLS ou em policies.
- ❌ Migração de dados ou alteração do trigger `recalcular_categoria_animal`.
- ❌ Introdução de fachada/serviço para consumidores externos (Fase 5).
- ❌ Convergência dos 3 padrões de "registrar evento" num caminho único (Fase 3).
- ❌ Absorção/unificação da pesagem-em-lote do corte com o wizard genérico (Fase 3).
- ❌ Big Bang refactor — toda mudança deve ser pequena e mergeável isoladamente.

## 2.3 Dependências futuras

- **Fase 3 (Operação)** depende de que as rotas-alvo desta SPEC existam (Fase 1) e da ficha extraída (Fase 2).
- **Fase 4 (Indicadores)** depende da estabilização de categorias (Fase 0) e de decisão de produto sobre fontes de verdade.
- **Fase 5 (Fachadas/Integração)** depende de categorias estáveis (Fase 0) e do inventário de consumidores externos (Fase 0).

---

# 3. Princípios da refatoração

1. **Preservar comportamento.** Nenhuma fase pode alterar o que o usuário consegue fazer hoje. Toda rota, ação e fluxo atual permanece funcional.
2. **Não tocar dados.** Banco, RPC, RLS, trigger e contratos de dados centrais ficam intocados. A RPC `registrar_evento_com_status` permanece o ponto único de escrita de eventos.
3. **Mudanças pequenas, revisáveis e reversíveis.** Cada passo deve poder ser mergeado e revertido isoladamente. Sem Big Bang.
4. **Diferenciar explicitamente o tipo de cada mudança**, em todo PR:
   - **navegação** (menu/rota/agrupamento),
   - **composição de tela** (o que a página monta),
   - **extração de componente** (mover/encapsular UI existente),
   - **contrato** (tipo/string/assinatura).
5. **Reaproveitar antes de reescrever.** O core de mass-operations, os componentes de subdomínio e as funções puras de cálculo já existem e devem ser reusados.
6. **Segurança acima de ambição.** Em qualquer dúvida entre ambição e segurança, escolher segurança e adiar para fase futura.
7. **Não reabrir decisões já resolvidas no PRD-2.** Não especificar nada que dependa de decisão de produto em aberto (seção 12 do PRD-2).
8. **Aderir aos padrões do projeto** (CLAUDE.md): RSC nas páginas de dashboard, `select` explícito, Padrão B em formulários, design system, sem `any`, sem suprimir `exhaustive-deps`.

---

# 4. Arquitetura-alvo desta etapa (recorte Fases 0–2)

Apenas a **casca estrutural** das 5 camadas é entregue aqui — sem mover lógica pesada nem unificar indicadores.

```
Rebanho (/dashboard/rebanho)
│
├── Visão geral (hub) ............... entrypoint; resumo + inventário de animais
│
├── NÚCLEO
│   ├── Inventário / Animais ........ listagem + filtros (RebanhoClient, parte inventário)
│   ├── Lotes ....................... /dashboard/rebanho/lotes/**  (intacto)
│   ├── Movimentações ............... /dashboard/rebanho/movimentacoes/**  (intacto)
│   └── Ficha do animal ............. /dashboard/rebanho/[id]  (ENXUTA após Fase 2)
│
├── OPERAÇÃO  (apenas reposicionamento de entrypoints nesta SPEC)
│   ├── Cadastro rápido ............. /dashboard/rebanho/cadastro-rapido/**  (intacto)
│   ├── Importação CSV .............. /dashboard/rebanho/importar/**  (intacto)
│   └── Lançamento em lote .......... /dashboard/rebanho/eventos/lote/**  (intacto)
│
├── SUBDOMÍNIOS TÉCNICOS  (reposicionados na navegação; lógica intacta)
│   ├── Reprodução .................. /dashboard/rebanho/reproducao/**  (preservar sync offline)
│   ├── Leiteira ................... /dashboard/rebanho/leiteira
│   ├── Corte ...................... /dashboard/rebanho/corte
│   └── Sanidade ................... /dashboard/rebanho/sanidade
│
└── INDICADORES  (apenas link na navegação; SEM unificação nesta SPEC)
    └── Indicadores ................ /dashboard/rebanho/indicadores
```

**Princípio da casca**: a Fase 1 entrega esta árvore como **navegação e agrupamento**, não como reescrita. As páginas internas permanecem onde estão; o que muda é como o usuário as alcança (submenu) e como os entrypoints de massa são apresentados (camada Operação). A camada Planejamento/Integração **não aparece** nesta etapa.

---

# 5. Preservações obrigatórias

Estas capacidades **devem permanecer 100% funcionais e com comportamento inalterado** ao fim de cada fase:

1. **Cadastro rápido de vários animais** — wizard 3 etapas → `cadastrarAnimaisLoteAction` → core compartilhado (`analisarLinhas`/`persistirAnimaisPreparados`). Gerador de brincos, limite 1–500, resultado parcial (`importados` + `erros[]`).
2. **Importação CSV** — fluxo dry-run → revisão → commit (`validarCSVAction` → `importarCSVAction`); contratos `CSVValidacaoResult`/`CSVImportResult`; mesmo core compartilhado.
3. **Lançamento de evento em lote** — wizard → `criarEventosLoteAction` → RPC `registrar_evento_com_status`; `Promise.allSettled` por animal; resultado parcial `ResultadoLote { inseridos, erros[{brinco,motivo}] }`.
4. **RPC como ponto único de escrita de eventos** — `registrar_evento_com_status` não pode ser duplicada, contornada nem alterada.
5. **Fluxo de reprodução funcional** — 4 abas (Dashboard, Histórico, Reprodutores, Parâmetros), dialogs Padrão B, atualização de `status_reprodutivo`.
6. **Sync offline / provider da reprodução** — `ReproducaoSyncProvider`, store `eventos_rebanho` no IndexedDB, hidratação em `RebanhoClient.tsx:70-91`. Qualquer mudança de rota/estrutura da reprodução **deve preservar** o provider e a hidratação.
7. **Core compartilhado entre CSV e cadastro rápido** — `analisarLinhas`/`analisarCSV` → `persistirAnimaisPreparados`. Shape `Record<string,string>` e contratos de resultado inalterados.
8. **Resultado parcial e `Promise.allSettled`** em todos os lançamentos em lote — falha individual nunca cancela o lote.
9. **Guards** — guard de plano (`requirePlano('rebanho')` no `layout.tsx`) e os checks de perfil caso-a-caso nas páginas continuam ativos.

---

# 6. Fase 0 — Estabilização

## 6.1 Objetivo
Remover divergências e dívidas que envenenam qualquer reorganização posterior, e congelar formalmente os contratos que as Fases 1 e 2 não podem quebrar. **Sem mover arquivos de UI, sem mudar banco.**

## 6.2 Mudanças previstas

### 6.2.1 Consolidar strings de categoria (contrato)
- **Divergência confirmada**: `lib/types/rebanho.ts:44,67` usa `'Novilha (Prenha)'`; `lib/calculos/indicadores-rebanho.ts:18` usa `'Novilha Prenha'`. As constantes de cálculo estão comentadas como "STRINGS EXATAS DO TRIGGER `recalcular_categoria_animal`".
- **Ação**: definir uma **fonte única TypeScript** das strings de categoria, reutilizada por `CATEGORIAS_POR_TIPO` (tipos) e pelos agrupamentos de `indicadores-rebanho.ts` (`CATEGORIAS_NOVILHAS`, etc.).
- **Restrição absoluta**: as strings consolidadas **devem ser exatamente as que o trigger SQL grava** em `animais.categoria`. **Não alterar o trigger nem migrar dados.** Antes de escolher o valor canônico, **confirmar qual string o trigger realmente produz** (consultar `database-snapshot.md` e a migration do trigger). A fonte TS passa a espelhar o banco — o banco é a verdade.
- **Pré-requisito de investigação**: confirmar se a divergência é a causa do teste pré-existente falho `projetar-rebanho.test.ts` (classificação de categoria). Se for, o teste deve passar após a consolidação; se não, documentar que permanece falho por outra causa.
- **Tipo de mudança**: contrato (sem efeito de UI).

### 6.2.2 Limpar código órfão da reprodução
- **Candidatos confirmados** (PRD-1 §1.20, §8.11):
  - Redirects: `app/dashboard/rebanho/reproducao/indicadores/page.tsx`, `app/dashboard/rebanho/reproducao/repetidoras/page.tsx` (ambos existem e apenas redirecionam).
  - Componentes legados: `components/rebanho/reproducao/{CalendarioReprodutivo,IndicadoresCard,RepetidorasAlerta,ReproducaoStats}.tsx`.
- **Ação**: confirmar via grafo de imports (Grep por cada nome de componente/rota) que **não há import vivo**. Remover apenas os que estiverem comprovadamente órfãos.
- **Cautela**: os redirects podem estar protegendo links externos/bookmarks. Decisão: **manter os redirects** (são baratos e evitam 404) e remover **apenas** os 4 componentes legados se sem import vivo. Se algum tiver import, não remover e registrar como pendência.
- **Tipo de mudança**: limpeza (composição/contrato negativo).

### 6.2.3 Inventário de consumidores externos
- **Ação**: produzir um documento (`docs/rebanho-consumidores-externos.md` ou seção em arquivo equivalente) listando, com path e linha, todos os pontos que leem tabelas do rebanho diretamente:
  - `lib/supabase/pastagens.ts:451-490` (lê `animais` por lote/status + `pesos_animal` 90d → UA).
  - `lib/supabase/balanco-forrageiro.ts:162-183` (`getAnimaisAtivosPorCategoria`, lê `animais` por `categoria`).
  - `app/dashboard/page.tsx:142-191` (3 SELECT em `animais` + `eventos_sanitarios` para alertas).
  - `lib/supabase/calendario.ts` (agrega `eventos_sanitarios`, `producoes_leiteiras`, `eventos_rebanho`).
- **Objetivo**: tornar explícito o blast radius para que Fases 1–2 (que não mudam schema) confirmem que não afetam esses consumidores, e preparar a Fase 5 (fachadas).
- **Tipo de mudança**: documentação.

### 6.2.4 Congelar contratos centrais
- **Ação**: documentar (e cobrir com testes de borda onde não houver) que os seguintes contratos estão **congelados** durante Fases 1–2:
  - Tipo `Animal` e `Lote` (`lib/types/rebanho.ts:79-112`).
  - `CSVValidacaoResult` / `CSVImportResult`.
  - `ResultadoLote { inseridos, erros[{brinco,motivo}] }`.
  - Assinatura e semântica da RPC `registrar_evento_com_status` (ponto único de escrita).
- **Tipo de mudança**: documentação + testes (sem alterar os contratos).

## 6.3 Arquivos/áreas impactadas
| Arquivo | Ação |
|---|---|
| `lib/types/rebanho.ts` | Apontar `CATEGORIAS_POR_TIPO` para fonte única de strings |
| `lib/calculos/indicadores-rebanho.ts` | Apontar grupos de categoria para a mesma fonte única |
| (novo) fonte única de categorias | Ex.: `lib/constants/categorias-rebanho.ts` (decisão de local na implementação) |
| `app/dashboard/rebanho/reproducao/indicadores/page.tsx` | **Manter** (redirect) |
| `app/dashboard/rebanho/reproducao/repetidoras/page.tsx` | **Manter** (redirect) |
| `components/rebanho/reproducao/{CalendarioReprodutivo,IndicadoresCard,RepetidorasAlerta,ReproducaoStats}.tsx` | Remover se órfãos |
| (novo) `docs/rebanho-consumidores-externos.md` | Criar inventário |
| `__tests__/` | Ajustar/garantir teste de categoria; testes de borda de contrato |

## 6.4 Decisões
- **D-0.1**: A fonte única de categorias **espelha o banco**, não o contrário. O valor canônico é o que o trigger grava. Nenhuma migração nesta SPEC.
- **D-0.2**: Redirects da reprodução são **mantidos**; só os 4 componentes legados são candidatos a remoção (e somente se órfãos).
- **D-0.3**: O inventário de consumidores externos é **documentação**, não código de fachada (fachada é Fase 5).

## 6.5 Riscos
- **R-0.1**: Escolher a string de categoria errada quebra silenciosamente pastagens/balanço (que casam por string). *Mitigação*: confirmar contra o trigger/`database-snapshot.md` antes de consolidar; rodar suíte completa.
- **R-0.2**: Remover componente "órfão" que na verdade tem import dinâmico. *Mitigação*: Grep exaustivo + build limpo após remoção.
- **R-0.3**: O teste falho de categoria pode não ser causado pela divergência. *Mitigação*: documentar resultado real, não assumir.

## 6.6 Critérios de aceite
- [ ] Existe uma única fonte TS de strings de categoria, consumida por tipos e cálculos.
- [ ] As strings consolidadas batem com o que o trigger grava (confirmado em `database-snapshot.md`/migration).
- [ ] `npm run build` e `npm run test` passam; o número de testes passando ≥ baseline (900+). Se o teste de categoria passar a verde, documentar; se permanecer falho, documentar a causa real.
- [ ] Componentes legados da reprodução removidos **ou** registrados como não-órfãos com evidência.
- [ ] Inventário de consumidores externos existe e está completo (4 entradas mínimas).
- [ ] Contratos centrais documentados como congelados; testes de borda existem.
- [ ] Nenhuma mudança de schema, RPC, RLS ou trigger.

## 6.7 Testes/validação
- Unit: classificação de categoria (`projetar-rebanho.test.ts` e correlatos) usando a fonte única.
- Unit/contrato: testes que fixam o shape de `CSVImportResult`, `ResultadoLote`.
- Build limpo após remoção de órfãos.
- Smoke manual: abrir Balanço Forrageiro e Pastagens — contagens por categoria/UA inalteradas.

---

# 7. Fase 1 — Casca de navegação

## 7.1 Objetivo
Entregar a árvore de navegação-alvo (seção 4) reaproveitando o submenu já prototipado, **sem mover lógica de negócio pesada**. Reorganizar entrypoints e agrupar o módulo nas camadas, sem tocar banco/RPC/RLS/contratos.

## 7.2 Navegação-alvo
- Reativar o submenu de rebanho comentado em `components/Sidebar.tsx:230-239` (`rebanhoSubRoutes`), ajustando os rótulos/ordem para refletir as camadas:
  - **Visão geral** → `/dashboard/rebanho`
  - **Indicadores** → `/dashboard/rebanho/indicadores`
  - **Reprodução** → `/dashboard/rebanho/reproducao` (Dashboard; sub-abas internas via `TabsNav` permanecem)
  - **Leiteira** → `/dashboard/rebanho/leiteira`
  - **Corte** → `/dashboard/rebanho/corte`
  - **Sanidade** → `/dashboard/rebanho/sanidade`
  - **Movimentações** → `/dashboard/rebanho/movimentacoes`
- O item "Rebanho" no grupo "Produção" (`Sidebar.tsx:78`) passa a ser **expansível** (padrão dos grupos gerenciais já existente no Sidebar) ou mantém o link para o hub com submenu abaixo — a implementação deve seguir o padrão de grupos expansíveis já presente no arquivo, sem inventar mecânica nova.
- **Decisão**: a sub-navegação interna da Reprodução (`TabsNav`) **permanece** — não duplicar Reprodutores/Parâmetros no submenu lateral nesta fase (evita dois lugares para a mesma coisa). O submenu lateral aponta para a entrada do subdomínio; o detalhamento fica nas abas internas.

## 7.3 Rotas/telas/agrupamentos
- **Permanecem inalteradas** (apenas reposicionadas na navegação): todas as rotas atuais sob `/dashboard/rebanho/**`.
- **Agrupamento conceitual** (refletido no hub e/ou no submenu, não em movimentação de arquivos):
  - Núcleo: Visão geral, Inventário/Animais, Lotes, Movimentações, Ficha.
  - Operação: Cadastro rápido, CSV, Lançamento em lote.
  - Subdomínios: Reprodução, Leiteira, Corte, Sanidade.
  - Indicadores: Indicadores (link, sem unificação).

## 7.4 Entrypoints reposicionados
No hub (`RebanhoClient.tsx`), hoje os entrypoints estão em 3 dropdowns (`:150-206`) e 6 cards (`:252-258`). Nesta fase:
- **Operações em massa** (cadastro rápido, CSV, lançamento em lote) devem ser apresentadas como pertencentes à camada **Operação** — agrupadas visualmente sob um rótulo "Operação"/"Lançamentos e cadastros em massa", mas **chamando exatamente as mesmas rotas e ações**.
- Os 6 cards de acesso rápido podem ser realinhados às camadas (Subdomínios + Indicadores) **sem remover** nenhum acesso existente.
- **Restrição**: nenhuma action, rota ou contrato muda. Só muda a **organização visual** dos entrypoints (mudança de navegação + composição de tela leve).

## 7.5 Arquivos/áreas impactadas
| Arquivo | Tipo de mudança |
|---|---|
| `components/Sidebar.tsx` | navegação — reativar/ajustar `rebanhoSubRoutes`; tornar "Rebanho" expansível |
| `app/dashboard/rebanho/RebanhoClient.tsx` | composição de tela — reagrupar entrypoints por camada (sem mexer em handlers/rotas) |
| (eventual) `components/rebanho/PainelResumo.tsx` | composição leve, se necessário para agrupamento |

## 7.6 Riscos
- **R-1.1**: Quebrar permissões/visibilidade ao mexer no Sidebar (Operador não pode ver tudo). *Mitigação*: respeitar `OPERADOR_HIDDEN_HREFS` e o padrão de filtro por perfil/módulo já existente; testar com cada perfil.
- **R-1.2**: Submenu expansível conflitar com o padrão de grupos atuais. *Mitigação*: reusar o mecanismo de grupos expansíveis já presente no arquivo (`GroupKeyGerencial`/estado de expansão), não criar novo.
- **R-1.3**: Reagrupar cards/dropdowns e acidentalmente remover um acesso. *Mitigação*: checklist 1:1 de entrypoints antes/depois.
- **R-1.4**: Guard de plano em rotas filhas. *Mitigação*: todas as rotas permanecem sob `/dashboard/rebanho`, herdando o `layout.tsx` (`requirePlano('rebanho')`).

## 7.7 Critérios de aceite
- [ ] Submenu de rebanho visível e funcional no Sidebar, refletindo as camadas (Visão geral, Indicadores, Reprodução, Leiteira, Corte, Sanidade, Movimentações).
- [ ] Todos os entrypoints de massa continuam acessíveis e chamando as mesmas rotas/ações.
- [ ] Operador continua vendo apenas o que via antes (nenhum acesso novo indevido; nenhum acesso perdido).
- [ ] Nenhuma rota foi removida; nenhum arquivo de página/action movido ou reescrito.
- [ ] `npm run build` e `npm run test` passam.

## 7.8 Testes/validação
- Smoke manual por perfil (Administrador, Operador, Visualizador): navegar por cada item do submenu.
- Smoke manual: abrir cadastro rápido, CSV e lançamento em lote a partir dos novos entrypoints e confirmar que abrem as mesmas telas.
- Verificar guard de plano (usuário sem plano de rebanho continua bloqueado).

---

# 8. Fase 2 — Ficha do animal

## 8.1 Objetivo
Tornar a ficha do animal (`app/dashboard/rebanho/[id]/page.tsx`, 688 linhas, god-component client-side) uma **ficha enxuta do Núcleo**, removendo responsabilidades que não lhe pertencem, corrigindo o fetch excessivo, e apontando para as subáreas próprias de Leite, Corte e Sanidade. **Sem mudar schema e sem reescrever regras de negócio.**

## 8.2 Papel final da ficha
A ficha passa a ser a **visão de identidade + linha do tempo do animal**, com resumos enxutos que linkam para a gestão completa em cada subdomínio.

## 8.3 O que permanece na ficha
- **Identificação**: brinco, nome, categoria, status, raça, lote, idade, peso atual.
- **Abas naturais por id** (linha do tempo do animal):
  - **Histórico de Eventos** (`listEventosPorAnimal`).
  - **Movimentações** (`getHistoricoAnimalAction`).
  - **Pesagens** (`listPesosPorAnimal`).
  - **Genealogia** (mãe/pai/lote) — **mas resolvida por id**, não carregando 1000 animais.
- **Ações de admin** existentes: editar, excluir, registrar evento (mantêm permissões atuais).

## 8.4 O que sai da ficha
- **Cálculo de corte inline** (`DesempenhoCorteContent`, `[id]/page.tsx:90-204`): deixa de ser reimplementado na ficha.
- **Fetch global** (`listAnimais({}, 1000, 0)` + `listLotes(100, 0)`, `[id]/page.tsx:231-234`): substituído por busca por id (animal, mãe, pai, lote).
- **`'use client'` + fetch no mount**: converter para RSC conforme o padrão do projeto (server `Promise.all` → props ao Client), **se viável sem regressão**. Se a conversão completa para RSC introduzir risco alto (ex.: dependência de `useAuth` no mount difícil de mover), é aceitável manter Client mas **com busca por id** — a correção do fetch global é obrigatória; a conversão RSC é fortemente desejável mas pode ser parcial.

## 8.5 O que vira link/resumo
- **Produção Leiteira**: resumo enxuto na ficha (reusando `AbaProducaoLeiteira` em modo compacto ou um resumo derivado) + **link** para `/dashboard/rebanho/leiteira`. O registro/curva pertence ao subdomínio Leite.
- **Sanidade**: resumo enxuto na ficha (reusando `AbaSanidade`) + **link** para `/dashboard/rebanho/sanidade`. A gestão completa fica no subdomínio.
- **Desempenho de Corte**: resumo na ficha via componente compartilhado (ver 8.6) + **link** para `/dashboard/rebanho/corte`.

## 8.6 Componentes/queries a extrair ou reaproveitar
- **Extrair** `DesempenhoCorteContent` (`[id]/page.tsx:90-204`) para um **componente compartilhado** consumido tanto pela ficha quanto pelo `DashboardCorte`, sobre as mesmas funções puras (`calcularGMDUltimasDuas`, `calcularProjecaoAbate`, `calcularArrobasEstimadas`). **Não reescrever o cálculo.**
- **Extrair** helpers locais de movimentação (`getBadgeColorMovimentacao`/`getTipoLabelMovimentacao`/`getDetalhesMovimentacao`, `[id]/page.tsx:47-88`) para utilitário de Movimentações do Núcleo.
- **Extrair** o cálculo de idade inline (`[id]/page.tsx:428-438`) para util puro.
- **Reaproveitar** `AbaProducaoLeiteira` e `AbaSanidade` como já são componentes — a mudança é de **orquestração** (modo resumo + link), não de criação.
- **Nova query/ajuste**: uma busca de animal por id (e resolução de mãe/pai/lote por id) substituindo o fetch global. Pode ser nova função em `lib/supabase/rebanho.ts` (`getAnimalById` + resolução de relações) **sem alterar contratos existentes** — adição, não mudança.

## 8.7 Arquivos/áreas impactadas
| Arquivo | Tipo de mudança |
|---|---|
| `app/dashboard/rebanho/[id]/page.tsx` | composição + extração — ficha enxuta, busca por id, resumos+links |
| (novo) componente compartilhado de corte | extração — ex.: `components/rebanho/corte/DesempenhoCorteResumo.tsx` |
| `components/rebanho/corte/DashboardCorte.tsx` | reaproveitar o componente compartilhado (eliminar duplicação) |
| (novo) util de movimentação/idade | extração — helpers puros |
| `lib/supabase/rebanho.ts` | adição de `getAnimalById`/resolução por id (sem mudar funções existentes) |
| `components/rebanho/AbaProducaoLeiteira.tsx` | reaproveitamento (modo resumo, se aplicável) |
| `components/rebanho/AbaSanidade.tsx` | reaproveitamento (modo resumo, se aplicável) |

## 8.8 Riscos
- **R-2.1**: Regressão das abas dinâmicas (que aparecem conforme sexo/tipo_rebanho, `[id]/page.tsx:445-458`). *Mitigação*: preservar a lógica de visibilidade de abas exatamente; testar fêmea leiteira, macho corte, dupla aptidão.
- **R-2.2**: Regressão de permissões (`isAdmin`, `canRegisterEvent`, `[id]/page.tsx:225-226`). *Mitigação*: manter os mesmos checks; testar com 3 perfis.
- **R-2.3**: Conversão para RSC quebrar dependência de `useAuth`/estado client. *Mitigação*: conversão pode ser parcial; a obrigatoriedade é corrigir o fetch global, não necessariamente virar RSC puro.
- **R-2.4**: Extrair corte e divergir do `DashboardCorte`. *Mitigação*: ambos consomem o **mesmo** componente compartilhado; teste visual lado a lado.
- **R-2.5**: Resumo de leite/sanidade na ficha perder informação que o usuário esperava. *Mitigação*: manter o componente existente acessível (resumo + link); não remover dados, apenas mover gestão para o subdomínio.

## 8.9 Critérios de aceite
- [ ] A ficha não chama mais `listAnimais({}, 1000, 0)` nem `listLotes(100, 0)`; resolve animal/mãe/pai/lote por id.
- [ ] Corte na ficha usa o componente compartilhado com `DashboardCorte` (zero duplicação de cálculo de UI).
- [ ] Leite e Sanidade aparecem como resumo + link para o subdomínio.
- [ ] Abas dinâmicas continuam aparecendo nas mesmas condições (sexo/tipo_rebanho).
- [ ] Permissões da ficha (editar/excluir/registrar evento) inalteradas por perfil.
- [ ] Nenhuma mudança de schema; nenhuma regra de negócio reescrita.
- [ ] `npm run build` e `npm run test` passam.

## 8.10 Testes/validação
- Smoke manual: abrir ficha de (a) vaca leiteira em lactação, (b) boi de corte, (c) animal dupla aptidão, (d) animal com mãe/pai — confirmar abas corretas e genealogia resolvida.
- Smoke manual: clicar nos links de resumo Leite/Sanidade/Corte e confirmar que levam aos subdomínios.
- Performance: confirmar que a ficha não dispara mais o fetch de 1000 animais (verificar rede/queries).
- Regressão: corte na ficha vs `DashboardCorte` exibem os mesmos números.
- Permissões: Visualizador não vê botões de ação destrutiva; Operador vê "Registrar Evento"; Admin vê tudo.

---

# 9. Estratégia de implementação

Plano incremental, cada passo mergeável e reversível isoladamente. **Ordem obrigatória entre fases; dentro de uma fase, os passos podem ser PRs separados.**

### Fase 0 (estabilização) — sem dependências
- **P0.1** — Investigar e confirmar a string canônica de categoria contra o trigger/`database-snapshot.md`. (somente leitura)
- **P0.2** — Criar a fonte única de categorias; apontar `rebanho.ts` (tipos) e `indicadores-rebanho.ts` para ela. Rodar testes. *(contrato)*
- **P0.3** — Grep do grafo de imports dos 4 componentes legados + redirects; remover apenas os órfãos. *(limpeza)*
- **P0.4** — Escrever inventário de consumidores externos. *(documentação)*
- **P0.5** — Documentar/cobrir contratos congelados com testes de borda. *(documentação + testes)*

### Fase 1 (navegação) — depende de: nada bloqueante (Fase 0 recomendada antes, não obrigatória)
- **P1.1** — Reativar/ajustar `rebanhoSubRoutes` no Sidebar; tornar "Rebanho" expansível reusando o padrão de grupos. *(navegação)*
- **P1.2** — Reagrupar entrypoints de massa no hub sob rótulo "Operação", sem mudar rotas/ações. *(composição leve)*
- **P1.3** — Realinhar cards de acesso rápido às camadas (sem remover acessos). *(composição leve)*
- **Sinal de pronto p/ merge**: smoke por perfil OK + build/test verdes.

### Fase 2 (ficha) — depende de: Fase 1 (rotas-alvo existem para linkar)
- **P2.1** — Adicionar `getAnimalById`/resolução por id em `lib/supabase/rebanho.ts` (adição). *(contrato — aditivo)*
- **P2.2** — Trocar o fetch global da ficha por busca por id. *(composição)*
- **P2.3** — Extrair `DesempenhoCorteContent` para componente compartilhado; ligar `DashboardCorte` a ele. *(extração)*
- **P2.4** — Extrair helpers de movimentação/idade para utilitários. *(extração)*
- **P2.5** — Transformar abas Leite/Sanidade em resumo + link. *(composição)*
- **P2.6** — (Opcional/desejável) converter a ficha para RSC parcial/total. *(composição)*
- **Sinal de pronto p/ merge**: smoke das 4 variações de animal + regressão corte + permissões OK + build/test verdes.

## 9.1 Rollback / mitigação de risco
- Cada passo é um PR isolado → reversível por revert.
- Fase 0 P0.2 (categorias) é o passo mais sensível: validar com suíte completa + smoke de Balanço/Pastagens antes do merge.
- Fase 2 mantém os componentes existentes (`AbaProducaoLeiteira`, `AbaSanidade`) → se o resumo+link regredir, reverter P2.5 sem afetar P2.1–P2.4.

## 9.2 Dependências entre passos
- P2.5 (links) depende de P1.1 (rotas no submenu existem).
- P2.2 (busca por id) depende de P2.1 (`getAnimalById`).
- P2.3 (corte compartilhado) é independente de P2.2/P2.5.

---

# 10. Arquivos e áreas afetadas

| Arquivo/Path | Papel atual | Papel após esta SPEC | Ação esperada | Fase |
|---|---|---|---|---|
| `lib/types/rebanho.ts` | `CATEGORIAS_POR_TIPO` (strings) + tipo `Animal` | Consome fonte única de categorias; tipo `Animal` congelado | Apontar para fonte única; não mudar `Animal` | 0 |
| `lib/calculos/indicadores-rebanho.ts` | Strings de categoria replicadas | Consome fonte única | Apontar para fonte única | 0 |
| (novo) `lib/constants/categorias-rebanho.ts` | — | Fonte única de strings de categoria | Criar (local exato a decidir) | 0 |
| `app/dashboard/rebanho/reproducao/indicadores/page.tsx` | Redirect | Redirect | Manter | 0 |
| `app/dashboard/rebanho/reproducao/repetidoras/page.tsx` | Redirect | Redirect | Manter | 0 |
| `components/rebanho/reproducao/CalendarioReprodutivo.tsx` | Legado | Removido (se órfão) | Remover se sem import | 0 |
| `components/rebanho/reproducao/IndicadoresCard.tsx` | Legado | Removido (se órfão) | Remover se sem import | 0 |
| `components/rebanho/reproducao/RepetidorasAlerta.tsx` | Legado | Removido (se órfão) | Remover se sem import | 0 |
| `components/rebanho/reproducao/ReproducaoStats.tsx` | Legado | Removido (se órfão) | Remover se sem import | 0 |
| (novo) `docs/rebanho-consumidores-externos.md` | — | Inventário de blast radius | Criar | 0 |
| `components/Sidebar.tsx` | Item único "Rebanho"; submenu comentado | Submenu ativo refletindo camadas | Reativar/ajustar `rebanhoSubRoutes`; tornar expansível | 1 |
| `app/dashboard/rebanho/RebanhoClient.tsx` | Hub: cadastro + cards + tabela | Hub com entrypoints agrupados por camada | Reagrupar entrypoints (sem mudar rotas/ações) | 1 |
| `app/dashboard/rebanho/[id]/page.tsx` | God-component client, fetch global, 7 abas, corte inline | Ficha enxuta do Núcleo, busca por id, resumos+links | Quebrar/extrair/reorganizar | 2 |
| (novo) `components/rebanho/corte/DesempenhoCorteResumo.tsx` | — | Componente de corte compartilhado | Criar a partir de `DesempenhoCorteContent` | 2 |
| `components/rebanho/corte/DashboardCorte.tsx` | Dashboard corte | Reusa componente compartilhado | Ligar ao componente extraído | 2 |
| `lib/supabase/rebanho.ts` | Animais/lotes/eventos/pesos/CSV | + `getAnimalById`/resolução por id (aditivo) | Adicionar função; não mudar existentes | 2 |
| `components/rebanho/AbaProducaoLeiteira.tsx` | Aba leite na ficha | Resumo na ficha + gestão no subdomínio | Reaproveitar (modo resumo) | 2 |
| `components/rebanho/AbaSanidade.tsx` | Aba sanidade na ficha | Resumo na ficha + gestão no subdomínio | Reaproveitar (modo resumo) | 2 |
| `app/dashboard/rebanho/cadastro-rapido/**` | Cadastro em massa | Inalterado; entrypoint na camada Operação | Não tocar lógica; só entrypoint | 1 |
| `app/dashboard/rebanho/importar/**` | CSV | Inalterado; entrypoint na camada Operação | Não tocar lógica; só entrypoint | 1 |
| `app/dashboard/rebanho/eventos/lote/**` | Wizard lote + RPC | Inalterado; entrypoint na camada Operação | Não tocar lógica; só entrypoint | 1 |
| `app/dashboard/rebanho/reproducao/**` | Subdomínio reprodução + sync offline | Inalterado; reposicionado no submenu | Preservar sync; só navegação | 1 |
| RPC `registrar_evento_com_status` | Ponto único de escrita | Ponto único de escrita | **Não tocar** | — |

---

# 11. Critérios gerais de aceite (SPEC inteira)

- [ ] Nenhuma mudança de schema, RPC, RLS ou trigger em nenhuma fase.
- [ ] Cadastro rápido, importação CSV e lançamento em lote permanecem 100% funcionais e com comportamento idêntico (resultado parcial e `allSettled` preservados).
- [ ] A RPC `registrar_evento_com_status` permanece o ponto único de escrita de eventos, intacta.
- [ ] O fluxo de reprodução e seu sync offline (`ReproducaoSyncProvider` + store `eventos_rebanho` + hidratação) continuam funcionando.
- [ ] O core compartilhado CSV↔cadastro rápido (`persistirAnimaisPreparados`) e seus contratos (`CSVValidacaoResult`/`CSVImportResult`) permanecem inalterados.
- [ ] Strings de categoria vêm de uma fonte única e batem com o banco.
- [ ] Submenu de rebanho ativo e refletindo as camadas; nenhum acesso perdido por perfil.
- [ ] Ficha do animal enxuta, sem fetch global, com corte compartilhado e resumos+links.
- [ ] `npm run build` e `npm run test` passam; testes ≥ baseline (900+), sem novas regressões além das 2 falhas pré-existentes documentadas (ou com a de categoria resolvida).
- [ ] Cada mudança foi entregue como PR pequeno e reversível, rotulado por tipo (navegação/composição/extração/contrato).

---

# 12. Smoke tests obrigatórios

Antes de considerar qualquer fase pronta:

**Operações em massa (todas as fases — regressão crítica)**
1. Cadastro rápido: criar 5 animais com gerador de brincos; confirmar resultado parcial e criação de lote automático.
2. CSV: dry-run → revisão → commit de um arquivo com 1 duplicado; confirmar `CSVValidacaoResult` reporta o duplicado e o commit importa o resto.
3. Lançamento em lote: pesagem em 3 animais com 1 forçando erro; confirmar que os outros 2 entram e o erro vem com `brinco` no `ResultadoLote`.

**Navegação (Fase 1)**
4. Por perfil (Admin/Operador/Visualizador): expandir o submenu e abrir cada item.
5. Abrir cadastro rápido, CSV e lançamento em lote pelos entrypoints reposicionados.
6. Usuário sem plano de rebanho continua bloqueado pelo guard.

**Ficha do animal (Fase 2)**
7. Abrir ficha de vaca leiteira, boi de corte, animal dupla aptidão e animal com mãe/pai — abas dinâmicas corretas + genealogia resolvida por id.
8. Confirmar (rede/queries) que a ficha não busca mais 1000 animais.
9. Corte na ficha == números do `DashboardCorte`.
10. Resumos Leite/Sanidade linkam para os subdomínios.
11. Permissões: Visualizador sem ações destrutivas; Operador com "Registrar Evento"; Admin completo.

**Reprodução offline (Fases 1–2 — regressão)**
12. Confirmar que o `ReproducaoSyncProvider` e a hidratação de eventos continuam ativos após mudanças de navegação/rota.

**Consumidores externos (Fase 0)**
13. Abrir Balanço Forrageiro e Pastagens — contagens por categoria e UA inalteradas após consolidação de strings.

---

# 13. Riscos e mitigação

| Risco | Fase | Mitigação |
|---|---|---|
| String de categoria errada quebra balanço/pastagens silenciosamente | 0 | Confirmar contra trigger/`database-snapshot.md`; smoke 13; suíte completa |
| Remover componente "órfão" com import dinâmico | 0 | Grep exaustivo + build limpo |
| Submenu quebrar visibilidade por perfil | 1 | Respeitar `OPERADOR_HIDDEN_HREFS` e padrão de filtro; smoke 4 |
| Reagrupar entrypoints e perder um acesso | 1 | Checklist 1:1 antes/depois; smoke 5 |
| Regressão de abas dinâmicas da ficha | 2 | Preservar lógica de visibilidade; smoke 7 |
| Regressão de permissões na ficha | 2 | Manter checks; smoke 11 |
| Conversão RSC quebrar estado client | 2 | RSC parcial aceitável; obrigatório é só corrigir fetch global |
| Corte da ficha divergir do dashboard | 2 | Componente único compartilhado; smoke 9 |
| Quebrar sync offline da reprodução ao reposicionar | 1–2 | Não mover arquivos da reprodução; só navegação; smoke 12 |
| Tocar acidentalmente RPC/contrato | todas | Contratos congelados (Fase 0) + revisão por tipo de mudança |

---

# 14. Fora de escopo desta SPEC

Explicitamente **não** entram aqui (ficam para SPECs posteriores):
- Unificação conceitual dos indicadores (reprodutivo desnormalizado vs zootécnico histórico) — **Fase 4**.
- Camada Operação completa: "Agenda do dia"/"Pendências"/tarefas persistidas, convergência dos 3 padrões de evento, absorção da pesagem-em-lote do corte — **Fase 3**.
- Qualquer mudança de schema em `animais`/`pesos_animal`/`eventos_rebanho`.
- Refatoração da RPC `registrar_evento_com_status`.
- Integração com Financeiro (venda/abate → receita).
- Integração leite × silagem (eficiência alimentar — tipo morto hoje).
- Mudanças em RLS/policies.
- Fachada/serviço para consumidores externos (pastagens, balanço, dashboard, calendário) — **Fase 5**.
- Migração das strings de categoria no banco/trigger (a Fase 0 só alinha o TS ao banco existente).

---

# 15. Pendências para SPECs futuras

A serem tratadas em SPECs subsequentes, **após** as decisões de produto (PRD-2 §12) — sem detalhamento de implementação agora:

1. **Decisão de categorias no banco**: consolidar definitivamente strings também no banco/trigger (se desejado), com migração de dados.
2. **Indicadores unificados (Fase 4)**: definir se mantém duas fontes de verdade apenas apresentando juntas ou padroniza definição/período/materialização; extrair KPIs leite inline para serviço; realocar `queryIndicadoresReprodutivos`.
3. **Camada Operação (Fase 3)**: caminho único de lançamento; "Agenda do dia"/"Pendências" reusando alertas existentes; decisão sobre absorver a pesagem-em-lote do corte no wizard.
4. **Fachadas e integração (Fase 5)**: expor "demanda animal / UA" como serviço consumido por pastagens e balanço; encapsular leitura do dashboard/calendário.
5. **Integração leite × silagem** e **integração Financeiro** (venda/abate → receita): features novas, não refatoração.
6. **Confirmação do fluxo operador→rebanho offline em campo** antes de mexer na camada Operação.

---

# Anexo A — Comandos de verificação e evidências esperadas

## A.1 Objetivo
Guia operacional para **verificar** a implementação das Fases 0, 1 e 2 — antes de codar (quando há premissa a confirmar) e após cada PR. Para cada item há um comando/verificação plausível e a **evidência esperada**. Os comandos são exemplos para um repositório TypeScript/Next/Supabase; **ajustar ao repositório** onde o nome exato de script/arquivo não estiver confirmado. Este anexo é coerente com as decisões da SPEC (seções 6–8) e não amplia o escopo.

## A.2 Regras de uso
- **Verificar antes de codar** os itens marcados como pré-requisito (notadamente A.3 ID A0-1: string canônica de categoria).
- **Verificar após cada PR** os itens da fase correspondente + os de regressão crítica (operações em massa, sync offline).
- **Não usar este anexo para expandir escopo** — se uma verificação sugerir mudança fora das Fases 0–2, registrar como pendência (seção 15), não executar.
- **Registrar divergências com evidência** (saída de comando, screenshot, trecho de log/grep). Divergência sem evidência não conta como verificada.
- Tipos de verificação usados nas tabelas: **contrato**, **navegação**, **composição de tela**, **extração/reuso**, **regressão**.

## A.3 Verificações da Fase 0

| ID | Passo | Tipo | Objetivo da verificação | Exemplo de comando/verificação | Evidência esperada | Ação se falhar |
|---|---|---|---|---|---|---|
| A0-1 | P0.1 | contrato | Confirmar a **string canônica** de categoria que o trigger grava em `animais.categoria` | Inspecionar `database-snapshot.md` e a migration do trigger `recalcular_categoria_animal` (ex.: `rg -n "recalcular_categoria_animal" supabase/migrations` e `rg -n "Novilha" supabase/migrations database-snapshot.md`) — **confirmar no repositório** o caminho das migrations | Trecho do trigger/snapshot mostrando a string exata (ex.: confirmar se é `'Novilha (Prenha)'` ou `'Novilha Prenha'`) | Não consolidar; escalar a divergência banco↔código antes de prosseguir |
| A0-2 | P0.2 | contrato | Fonte única de categorias consumida por tipos e cálculos | `rg -n "Novilha" lib/types/rebanho.ts lib/calculos/indicadores-rebanho.ts` após a mudança | Nenhuma string de categoria literal duplicada; ambos importam da fonte única | Refatorar import; manter literais só na fonte única |
| A0-3 | P0.2 | regressão | Suíte completa não regride com a consolidação | `npm run build` e `npm run test` | Build verde; testes ≥ baseline (900+) | Reverter P0.2; investigar quebra |
| A0-4 | P0.2 | regressão | Resultado real do teste de classificação de categoria | `npm run test -- projetar-rebanho` (**ajustar ao repositório** o filtro/nome) | Registro do resultado: verde (resolvido) **ou** vermelho com causa documentada | Documentar causa real; não assumir que a divergência era a causa |
| A0-5 | P0.3 | extração/reuso (negativo) | Identificar imports vivos dos 4 componentes legados da reprodução | `rg -n "CalendarioReprodutivo\|IndicadoresCard\|RepetidorasAlerta\|ReproducaoStats"` (incluir imports dinâmicos `import(`) | Lista de ocorrências por componente; zero import vivo ⇒ removível | Se houver import, **não remover**; registrar como não-órfão com evidência |
| A0-6 | P0.3 | navegação | Confirmar que os **redirects** que devem permanecer continuam | `rg -n "redirect" app/dashboard/rebanho/reproducao/indicadores/page.tsx app/dashboard/rebanho/reproducao/repetidoras/page.tsx` | Ambos os arquivos presentes e ainda redirecionando (decisão D-0.2) | Restaurar redirect removido por engano |
| A0-7 | P0.3 | regressão | Build limpo após remoção dos órfãos | `npm run build` | Build verde, sem referência pendente | Reverter remoção; reavaliar grafo de imports |
| A0-8 | P0.4 | contrato (doc) | Inventário de consumidores externos completo | Abrir `docs/rebanho-consumidores-externos.md` (**ajustar ao repositório** o local) | Mínimo 4 entradas com path:linha (pastagens `:451-490`, balanço `:162-183`, dashboard `:142-191`, calendário) | Completar inventário antes de fechar a fase |
| A0-9 | P0.5 | contrato | Contratos congelados continuam inalterados | `git diff --stat` nas assinaturas de `Animal`/`Lote`, `CSVValidacaoResult`/`CSVImportResult`, `ResultadoLote`; `rg -n "registrar_evento_com_status"` (sem alteração da RPC) | Nenhum diff nas assinaturas; RPC não tocada | Reverter qualquer alteração de contrato não autorizada |
| A0-10 | P0.5 | contrato | Testes de borda dos contratos existem | `npm run test -- contrato` (**ajustar ao repositório**) ou listar os testes que fixam o shape | Testes presentes e verdes fixando `CSVImportResult`/`ResultadoLote` | Adicionar os testes de borda faltantes |

## A.4 Verificações da Fase 1

| ID | Passo | Tipo | Objetivo da verificação | Exemplo de comando/verificação | Evidência esperada | Ação se falhar |
|---|---|---|---|---|---|---|
| A1-1 | P1.1 | navegação | Submenu de rebanho reativado | `rg -n "rebanhoSubRoutes" components/Sidebar.tsx` (não comentado) | `rebanhoSubRoutes` ativo e referenciado no render | Reativar; remover comentário |
| A1-2 | P1.1 | navegação | Ordem/rótulos do submenu refletem as camadas | Inspeção visual + `rg -n "/dashboard/rebanho/" components/Sidebar.tsx` | Itens: Visão geral, Indicadores, Reprodução, Leiteira, Corte, Sanidade, Movimentações (seção 7.2) | Ajustar ordem/rótulos |
| A1-3 | P1.1 | composição de tela | Reuso do padrão de **grupos expansíveis** existente | `rg -n "GroupKeyGerencial\|isOpen\|expand" components/Sidebar.tsx` | "Rebanho" usa o mesmo mecanismo de expansão dos grupos atuais, sem mecânica nova | Refatorar para reusar o padrão existente |
| A1-4 | P1.1 | navegação | Visibilidade por perfil/permissão preservada | Smoke manual por perfil + `rg -n "OPERADOR_HIDDEN_HREFS" components/Sidebar.tsx` | Operador não ganha acesso indevido nem perde acesso; filtro por perfil/módulo intacto | Corrigir filtro de visibilidade |
| A1-5 | P1.x | navegação/regressão | Guard de plano mantido | Abrir rota de rebanho sem plano; `rg -n "requirePlano" app/dashboard/rebanho/layout.tsx` | Usuário sem plano continua bloqueado; `layout.tsx` inalterado | Restaurar guard |
| A1-6 | P1.2 | composição de tela | Mesmos entrypoints de cadastro rápido / CSV / evento em lote | Smoke manual a partir do hub + confirmar destinos | Os entrypoints abrem `cadastro-rapido`, `importar`, `eventos/lote/novo` (mesmas rotas/ações) | Religar entrypoint ao destino correto |
| A1-7 | P1.x | navegação | Nenhuma rota removida | `git diff --stat app/dashboard/rebanho` (nenhum `page.tsx`/`actions.ts` deletado ou movido) | Diff só em Sidebar e composição do hub; nenhuma rota apagada | Restaurar rota removida |
| A1-8 | P1.x | regressão | Build/test verdes | `npm run build` e `npm run test` | Build verde; testes ≥ baseline | Investigar/reverter |

## A.5 Verificações da Fase 2

| ID | Passo | Tipo | Objetivo da verificação | Exemplo de comando/verificação | Evidência esperada | Ação se falhar |
|---|---|---|---|---|---|---|
| A2-1 | P2.2 | composição de tela | Fim do fetch global de 1000 animais / 100 lotes | `rg -n "listAnimais\(\{\}, *1000\|listLotes\(100" app/dashboard/rebanho/[id]/page.tsx` | Zero ocorrências na ficha | Substituir por busca por id |
| A2-2 | P2.1 | contrato (aditivo) | Busca por id implementada (aditiva) | `rg -n "getAnimalById" lib/supabase/rebanho.ts` + `git diff` confirmando que funções existentes não mudaram | Nova função presente; funções existentes intactas | Tornar a mudança aditiva; reverter alteração de função existente |
| A2-3 | P2.3 | extração/reuso | Corte da ficha usa componente compartilhado com o dashboard | `rg -n "DesempenhoCorteResumo\|DesempenhoCorte" app/dashboard/rebanho/[id]/page.tsx components/rebanho/corte/DashboardCorte.tsx` (**ajustar ao repositório** o nome final do componente) | Ficha e `DashboardCorte` importam o mesmo componente; nenhum cálculo de corte inline na ficha | Eliminar duplicação; ligar ambos ao componente único |
| A2-4 | P2.5 | composição de tela | Leite e Sanidade como **resumo + link** | Inspeção visual da ficha + `rg -n "/dashboard/rebanho/leiteira\|/dashboard/rebanho/sanidade" app/dashboard/rebanho/[id]/page.tsx` | Resumo enxuto + link para os subdomínios; gestão completa fora da ficha | Ajustar para resumo+link sem remover dados |
| A2-5 | P2.x | regressão | Abas dinâmicas por sexo/tipo_rebanho preservadas | Smoke: vaca leiteira, boi de corte, dupla aptidão, animal com mãe/pai | Abas aparecem nas mesmas condições de antes | Restaurar lógica de visibilidade de abas |
| A2-6 | P2.x | regressão | Permissões da ficha inalteradas | Smoke por perfil (Admin/Operador/Visualizador) | Visualizador sem ações destrutivas; Operador com "Registrar Evento"; Admin completo | Restaurar checks `isAdmin`/`canRegisterEvent` |
| A2-7 | P2.x | contrato | Nenhuma mudança de schema/RPC | `git diff --stat supabase/` (vazio) + `rg -n "registrar_evento_com_status"` sem alteração da RPC | Sem diffs em migrations/RPC | Reverter qualquer toque em banco/RPC |
| A2-8 | P2.x | regressão (performance) | Comportamento observável da ficha | Abrir ficha com DevTools → aba Rede/queries; comparar nº de queries antes/depois | Ficha não dispara mais a busca de 1000 animais; carrega por id | Investigar fetch residual |
| A2-9 | P2.6 | composição de tela | Conversão RSC (parcial aceitável) | `rg -n "use client" app/dashboard/rebanho/[id]/page.tsx` + revisão do padrão RSC | RSC total ou parcial; **obrigatório** é o fim do fetch global (A2-1), não o RSC puro | Se RSC introduzir risco, manter Client com busca por id e registrar |

## A.6 Evidências mínimas por merge
Anexar/registrar em **todo** PR das Fases 0–2:
- Saída de `npm run build` e `npm run test` (verde; nº de testes vs baseline).
- **Screenshots** quando o PR tocar navegação/UI (submenu, hub, ficha) — antes/depois quando aplicável.
- **Logs/grep relevantes** que comprovem a verificação (ex.: grep do fetch global zerado, grep de imports órfãos).
- Resultado dos **smoke tests do escopo** da fase (seção 12) executados.
- Observações de **risco/resíduo** (ex.: componente não removido por ter import, RSC mantido parcial) com justificativa.
- Declaração do **tipo de mudança** (navegação / composição / extração / contrato).

---

# Anexo B — Checklist de PR por passo

## B.1 Objetivo
Transformar a SPEC em unidades práticas de implementação: **PRs pequenos, revisáveis e reversíveis**, um por passo lógico, alinhados à estratégia da seção 9. Cada checklist delimita o que pode e o que **não** pode entrar no PR.

## B.2 Regras de fatiamento
- **Um PR por passo lógico** sempre que possível (P0.1, P0.2, …).
- **Não misturar Fase 0 com Fase 2** no mesmo PR; não misturar fases distintas.
- **Não misturar contrato com UI** sem necessidade — se inevitável, justificar no PR.
- **Qualquer mudança fora da SPEC deve ser bloqueada** (ver B.6).
- O PR deve **declarar claramente o tipo de mudança**: navegação / composição / extração / contrato.

## B.3 Checklist de PR — Fase 0

### P0.1 — Confirmar string canônica de categoria
- **Objetivo**: descobrir a string exata que o trigger grava, para a fonte única espelhar o banco (D-0.1).
- **Tipo de mudança**: nenhuma (somente leitura/investigação).
- **Arquivos prováveis**: `database-snapshot.md`, migrations do trigger (**confirmar no repositório**).
- **O que pode entrar**: nota/registro da string canônica (pode ir no PR seguinte ou em comentário).
- **O que NÃO pode entrar**: qualquer alteração de código/banco.
- **Verificações obrigatórias**: A0-1.
- **Evidências obrigatórias no PR**: trecho do trigger/snapshot com a string.
- **Critério de pronto para merge**: string canônica documentada e referenciada por P0.2.
- **Riscos específicos**: escolher string sem confirmar ⇒ quebra silenciosa em balanço/pastagens.

### P0.2 — Fonte única de categorias
- **Objetivo**: eliminar a divergência `'Novilha (Prenha)'` vs `'Novilha Prenha'` com fonte única TS espelhando o banco.
- **Tipo de mudança**: contrato.
- **Arquivos prováveis**: novo `lib/constants/categorias-rebanho.ts` (local a decidir), `lib/types/rebanho.ts`, `lib/calculos/indicadores-rebanho.ts`.
- **O que pode entrar**: criação da fonte única e os imports correspondentes.
- **O que NÃO pode entrar**: alterar o trigger, migrar dados, mudar o tipo `Animal`.
- **Verificações obrigatórias**: A0-2, A0-3, A0-4.
- **Evidências obrigatórias no PR**: grep sem literais duplicadas; build/test; resultado real do teste de categoria.
- **Critério de pronto para merge**: strings vêm de uma fonte só; batem com o banco; suíte ≥ baseline.
- **Riscos específicos**: string errada; teste de categoria pode não depender da divergência (documentar).

### P0.3 — Limpeza de código órfão da reprodução
- **Objetivo**: remover os 4 componentes legados se comprovadamente sem import; manter redirects (D-0.2).
- **Tipo de mudança**: extração/reuso (remoção) + limpeza.
- **Arquivos prováveis**: `components/rebanho/reproducao/{CalendarioReprodutivo,IndicadoresCard,RepetidorasAlerta,ReproducaoStats}.tsx`; (manter) os dois `reproducao/{indicadores,repetidoras}/page.tsx`.
- **O que pode entrar**: remoção dos órfãos confirmados.
- **O que NÃO pode entrar**: remover redirects; remover componente com import (mesmo dinâmico).
- **Verificações obrigatórias**: A0-5, A0-6, A0-7.
- **Evidências obrigatórias no PR**: grep de imports por componente; build verde.
- **Critério de pronto para merge**: só órfãos removidos; redirects intactos; build limpo.
- **Riscos específicos**: import dinâmico não detectado.

### P0.4 — Inventário de consumidores externos
- **Objetivo**: documentar o blast radius (quem lê tabelas do rebanho direto).
- **Tipo de mudança**: documentação.
- **Arquivos prováveis**: `docs/rebanho-consumidores-externos.md` (**ajustar ao repositório**).
- **O que pode entrar**: o documento com path:linha das 4 fontes (pastagens, balanço, dashboard, calendário).
- **O que NÃO pode entrar**: criar fachada/serviço (isso é Fase 5).
- **Verificações obrigatórias**: A0-8.
- **Evidências obrigatórias no PR**: o próprio arquivo com as 4 entradas mínimas.
- **Critério de pronto para merge**: inventário completo e correto.
- **Riscos específicos**: inventário incompleto subestima impacto futuro.

### P0.5 — Congelar contratos centrais
- **Objetivo**: documentar e cobrir com testes de borda os contratos congelados durante Fases 1–2.
- **Tipo de mudança**: documentação + testes (sem alterar contratos).
- **Arquivos prováveis**: seção/doc de contratos; `__tests__/` (testes de shape).
- **O que pode entrar**: testes que fixam `CSVValidacaoResult`/`CSVImportResult`, `ResultadoLote`; nota sobre RPC como ponto único.
- **O que NÃO pode entrar**: qualquer alteração nos contratos ou na RPC.
- **Verificações obrigatórias**: A0-9, A0-10.
- **Evidências obrigatórias no PR**: testes verdes; `git diff` sem mudança de assinatura.
- **Critério de pronto para merge**: contratos documentados como congelados + testes de borda presentes.
- **Riscos específicos**: introduzir mudança de contrato disfarçada de "ajuste".

## B.4 Checklist de PR — Fase 1

### P1.1 — Reativar/ajustar submenu do rebanho
- **Objetivo**: submenu refletindo as camadas, reusando o padrão de grupos expansíveis.
- **Tipo de mudança**: navegação.
- **Arquivos prováveis**: `components/Sidebar.tsx`.
- **O que pode entrar**: reativar `rebanhoSubRoutes`; tornar "Rebanho" expansível; ajustar rótulos/ordem.
- **O que NÃO pode entrar**: mover páginas; duplicar Reprodutores/Parâmetros no submenu (ficam no `TabsNav`).
- **Verificações obrigatórias**: A1-1, A1-2, A1-3, A1-4.
- **Evidências obrigatórias no PR**: screenshots do submenu por perfil; grep de `rebanhoSubRoutes`.
- **Critério de pronto para merge**: submenu funcional, ordem/rótulos corretos, visibilidade por perfil OK.
- **Riscos específicos**: quebrar visibilidade do Operador; criar mecânica de expansão nova.

### P1.2 — Reagrupar entrypoints de massa sob "Operação"
- **Objetivo**: apresentar cadastro rápido / CSV / lançamento em lote como camada Operação.
- **Tipo de mudança**: composição de tela.
- **Arquivos prováveis**: `app/dashboard/rebanho/RebanhoClient.tsx`.
- **O que pode entrar**: reorganização visual dos entrypoints (rótulo/agrupamento).
- **O que NÃO pode entrar**: mudar rotas, handlers ou actions; tocar a lógica de massa.
- **Verificações obrigatórias**: A1-6, A1-7.
- **Evidências obrigatórias no PR**: screenshots antes/depois; smoke tests 1–3 (regressão de massa).
- **Critério de pronto para merge**: mesmos destinos/ações; nenhum acesso perdido.
- **Riscos específicos**: religar entrypoint ao destino errado.

### P1.3 — Realinhar cards de acesso rápido às camadas
- **Objetivo**: cards de acesso rápido alinhados a Subdomínios + Indicadores, sem remover acessos.
- **Tipo de mudança**: composição de tela.
- **Arquivos prováveis**: `app/dashboard/rebanho/RebanhoClient.tsx` (e `PainelResumo.tsx` se necessário).
- **O que pode entrar**: reorganização/realinhamento dos cards.
- **O que NÃO pode entrar**: remover qualquer acesso existente; mudar rotas.
- **Verificações obrigatórias**: A1-7, A1-8.
- **Evidências obrigatórias no PR**: checklist 1:1 de entrypoints antes/depois; build/test.
- **Critério de pronto para merge**: todos os acessos preservados; build verde.
- **Riscos específicos**: perder um card/acesso no rearranjo.

## B.5 Checklist de PR — Fase 2

### P2.1 — Adicionar busca por id (aditivo)
- **Objetivo**: introduzir `getAnimalById`/resolução por id sem mudar funções existentes.
- **Tipo de mudança**: contrato (aditivo).
- **Arquivos prováveis**: `lib/supabase/rebanho.ts`.
- **O que pode entrar**: nova função de busca por id + resolução de mãe/pai/lote por id.
- **O que NÃO pode entrar**: alterar assinaturas existentes; `select('*')`; mudar schema.
- **Verificações obrigatórias**: A2-2.
- **Evidências obrigatórias no PR**: grep da nova função; `git diff` confirmando funções existentes intactas.
- **Critério de pronto para merge**: função aditiva presente, testada; nada existente alterado.
- **Riscos específicos**: alterar inadvertidamente uma função compartilhada.

### P2.2 — Trocar fetch global por busca por id na ficha
- **Objetivo**: eliminar `listAnimais({},1000,0)` + `listLotes(100,0)` na ficha.
- **Tipo de mudança**: composição de tela.
- **Arquivos prováveis**: `app/dashboard/rebanho/[id]/page.tsx`.
- **O que pode entrar**: uso de `getAnimalById` e resolução por id.
- **O que NÃO pode entrar**: mudar regras de negócio; alterar abas/permissões.
- **Verificações obrigatórias**: A2-1, A2-8.
- **Evidências obrigatórias no PR**: grep do fetch global zerado; comparação de queries na aba Rede.
- **Critério de pronto para merge**: ficha não busca mais 1000 animais; comportamento idêntico ao usuário.
- **Riscos específicos**: genealogia/lote deixarem de resolver por engano.

### P2.3 — Extrair corte para componente compartilhado
- **Objetivo**: `DesempenhoCorteContent` vira componente único usado por ficha e `DashboardCorte`.
- **Tipo de mudança**: extração/reuso.
- **Arquivos prováveis**: novo `components/rebanho/corte/DesempenhoCorteResumo.tsx` (**ajustar nome ao repositório**), `[id]/page.tsx`, `components/rebanho/corte/DashboardCorte.tsx`.
- **O que pode entrar**: extração do componente e ligação de ambos os consumidores.
- **O que NÃO pode entrar**: reescrever as funções puras de cálculo (`calcularGMD*`/`calcularProjecaoAbate`/`calcularArrobasEstimadas`).
- **Verificações obrigatórias**: A2-3; smoke test 9 (números iguais ficha vs dashboard).
- **Evidências obrigatórias no PR**: grep do import único; comparação visual dos números.
- **Critério de pronto para merge**: zero duplicação de UI de corte; números idênticos.
- **Riscos específicos**: divergência sutil entre ficha e dashboard.

### P2.4 — Extrair helpers de movimentação/idade
- **Objetivo**: mover helpers locais (`getBadgeColorMovimentacao`/`getTipoLabelMovimentacao`/`getDetalhesMovimentacao`, cálculo de idade) para utilitários.
- **Tipo de mudança**: extração/reuso.
- **Arquivos prováveis**: novo util (Movimentações/Núcleo) + `[id]/page.tsx`.
- **O que pode entrar**: extração de funções puras; reuso na ficha.
- **O que NÃO pode entrar**: mudar comportamento dos helpers.
- **Verificações obrigatórias**: build/test; revisão de que a saída é idêntica.
- **Evidências obrigatórias no PR**: diff mostrando função movida sem alteração lógica; build verde.
- **Critério de pronto para merge**: helpers extraídos, comportamento idêntico.
- **Riscos específicos**: alterar formatação/labels ao mover.

### P2.5 — Leite e Sanidade como resumo + link
- **Objetivo**: ficha mostra resumo enxuto e linka para os subdomínios.
- **Tipo de mudança**: composição de tela.
- **Arquivos prováveis**: `[id]/page.tsx`, reuso de `AbaProducaoLeiteira.tsx` e `AbaSanidade.tsx`.
- **O que pode entrar**: modo resumo + links para `/dashboard/rebanho/leiteira` e `/sanidade`.
- **O que NÃO pode entrar**: remover dados que o usuário via; reescrever os componentes; depende de P1.1 (rotas no submenu).
- **Verificações obrigatórias**: A2-4; smoke test 10.
- **Evidências obrigatórias no PR**: screenshots da ficha; verificação dos links.
- **Critério de pronto para merge**: resumo + link funcionais; gestão completa fica no subdomínio.
- **Riscos específicos**: perda de informação esperada na ficha.

### P2.6 — (Opcional/desejável) conversão RSC
- **Objetivo**: alinhar a ficha ao padrão RSC do projeto, total ou parcial.
- **Tipo de mudança**: composição de tela.
- **Arquivos prováveis**: `[id]/page.tsx` (e eventual `*Client.tsx`).
- **O que pode entrar**: mover fetch para server `Promise.all` → props ao Client (parcial aceitável).
- **O que NÃO pode entrar**: forçar RSC se introduzir regressão; o obrigatório é o fim do fetch global (já em P2.2).
- **Verificações obrigatórias**: A2-9; smoke tests 7 e 11.
- **Evidências obrigatórias no PR**: grep de `use client`; smoke por perfil/variação de animal.
- **Critério de pronto para merge**: sem regressão de abas/permissões; RSC total ou parcial justificado.
- **Riscos específicos**: dependência de `useAuth`/estado client difícil de mover.

## B.6 Sinais de alerta para bloquear merge
Bloquear o PR (não mergear) se qualquer um ocorrer:
- **Mexeu em schema** (diff em `supabase/migrations` ou em `types/supabase.ts`).
- **Mexeu na RPC** `registrar_evento_com_status` (assinatura/corpo).
- **Mudou comportamento das mass operations** (cadastro rápido, CSV, lançamento em lote) — incluindo perda de resultado parcial ou de `Promise.allSettled`.
- **Quebrou o sync offline da reprodução** (`ReproducaoSyncProvider`, store `eventos_rebanho`, hidratação em `RebanhoClient.tsx:70-91`).
- **Removeu uma rota existente** ou moveu/renomeou página sem necessidade declarada.
- **Introduziu mudança de Fase 3+** (caminho único de evento, agenda/pendências, indicadores unificados, fachadas, financeiro, leite×silagem).
- **Expandiu escopo sem decisão registrada** na SPEC (seções 14/15).
- **Alterou contrato congelado** (`Animal`/`Lote`, `CSVValidacaoResult`/`CSVImportResult`, `ResultadoLote`) sem justificativa explícita e aprovada.
- **Mudou strings de categoria** divergindo do que o trigger grava no banco.
- **PR sem declaração do tipo de mudança** ou sem as evidências mínimas (A.6).
