# PRD-rebanho1 — Diagnóstico Arquitetural do Módulo de Rebanho (estado atual)

> Documento de investigação **read-only**. Nada foi alterado, criado ou corrigido no código.
> Objetivo: mapear e evidenciar **como o módulo de rebanho está hoje**, e como ele se integra
> aos módulos de silagem, pastagens e balanço forrageiro. Não propõe redesign.
> Data da análise: 2026-06-30.
>
> **Classificação de confiança** por achado: `Verificado` (li o código e a evidência é direta),
> `Provável` (forte inferência a partir de várias evidências), `Hipótese` (plausível, não confirmado no tempo desta análise).
>
> **Profundidade da análise**: o núcleo do rebanho (entrypoints, página do animal, reprodução,
> indicadores, tipos/queries) e as três integrações pedidas (silagem, pastagens, balanço forrageiro)
> receberam **análise profunda**. As páginas internas `corte/`, `sanidade/`, `movimentacoes/` e os
> ~40 componentes de formulário em `components/rebanho/**` receberam **análise de superfície**
> (nome, tamanho, papel, pontos de entrada) — não li cada um linha a linha.

---

# 1. Resumo executivo

1. **O rebanho é o maior e mais ramificado módulo do app**: ~21k linhas só nos arquivos diretamente "rebanho", espalhados por `app/dashboard/rebanho/**`, `components/rebanho/**`, `lib/supabase/rebanho-*.ts`, `lib/types/rebanho-*.ts`, `lib/validations/rebanho-*.ts`, `lib/calculos/`, `lib/relatorios/`. `Verificado` (contagem em §2).

2. **O módulo não tem um "limite" único e coeso** — ele é um guarda-chuva de 7+ sub-áreas (visão geral, indicadores, reprodução, leiteira, corte, sanidade, movimentações, lançamento em lote, lotes, importação) que compartilham só as tabelas `animais`/`lotes`/`eventos_rebanho` e o tipo `Animal`. Cada sub-área tem seu próprio `page.tsx` + `actions.ts` + dashboard. `Verificado`.

3. **A navegação é por "hub + acesso rápido", não por menu lateral**: o Sidebar tem um único item "Rebanho" → `/dashboard/rebanho`; de lá, 6 cards levam às sub-áreas (`RebanhoClient.tsx:252-268`). A reprodução tem sub-navegação própria (`TabsNav.tsx`), mas leiteira/corte/sanidade/movimentações **não** — são páginas soltas alcançáveis só pelos cards. `Verificado`.

4. **Leite e corte NÃO compartilham uma base comum estruturada** — compartilham apenas a tabela `animais` (campo `tipo_rebanho`) e a tabela `pesos_animal`. A lógica de cada um vive em arquivos separados sem abstração comum, e ambos são parcialmente reimplementados dentro da página do animal. `Verificado` (§3, §8).

5. **A página do animal (`[id]/page.tsx`, 688 linhas) é um god-component client-side** que concentra: fetch de tudo, cálculo de GMD/abate/arrobas inline, 7 abas (eventos, movimentações, pesos, genealogia, leiteira, corte, sanidade) e o dialog de exclusão. É o ponto de maior mistura de contextos do módulo. `Verificado`.

6. **Há duas "famílias" de indicadores, vivendo em lugares diferentes e sem unificação**: (a) indicadores **reprodutivos** centralizados em `queryIndicadoresReprodutivos` (`rebanho-reproducao.ts:593+`, 8 funções); (b) indicadores **zootécnicos/corte/leite** em `lib/calculos/indicadores-rebanho.ts` (684 linhas) + `lib/supabase/rebanho-indicadores.ts` + cálculos leiteiros inline na página leiteira. Não existe um "serviço de indicadores do rebanho" único. `Verificado`.

7. **Os indicadores reprodutivos são derivados em runtime a partir de `animais.status_reprodutivo` e de `eventos_rebanho`**, sem materialização — várias funções fazem o mesmo `SELECT status_reprodutivo FROM animais` repetidamente (taxa de prenhez, contagem por status, etc.), cada uma com sua própria query. `Verificado` (`rebanho-reproducao.ts:595-646`).

8. **`eventos_rebanho` é uma tabela-canivete sobrecarregada**: cobre nascimento, pesagem, cobertura, diagnóstico, parto, secagem, aborto, descarte, desmame, morte, venda, transferência de lote, mudança de categoria, + (lote) aspiração OPU, protocolo hormonal, transferência de embrião. Os campos específicos de cada tipo são colunas opcionais na mesma linha (reprodutor_id, resultado_prenhez, comprador, valor_venda, lote_id_destino, etc.). `Verificado` (`rebanho.ts:125-140`, tipos em `rebanho.ts:154-219`).

9. **Existem dois "fluxos de evento" paralelos e divergentes**: (a) evento individual via `[id]/evento/page.tsx` usando `react-hook-form` + `Controller` + `<Label>` (Padrão A legado); (b) lançamento em lote via RPC `registrar_evento_com_status` com `Promise.allSettled` (`eventos/lote/actions.ts:42,109`). Os formulários de reprodução usam ainda um terceiro padrão (dialogs shadcn Padrão B em `components/rebanho/reproducao/`). `Verificado` — três estilos de UI/validação para "registrar evento".

10. **Movimentações de rebanho NÃO se integram ao Financeiro** — diferente de silos, insumos, produtos, mão de obra e pastagens (que criam lançamento em `financeiro`). Uma venda de animal com `valor_venda` é só exibida na UI; não há `receita_id`, não há INSERT em `financeiro`. `Verificado` (grep por `financeiro`/`.insert` em `movimentacoes/actions.ts` → nenhum match).

11. **A integração rebanho→pastagens é direta e por banco**: `lib/supabase/pastagens.ts` lê `animais` e `pesos_animal` para calcular UA por lote (`calcularUADoLote`, `pastagens.ts:451-478`). Pastagens é **consumidor** dos dados do rebanho. `Verificado`.

12. **A integração rebanho→balanço forrageiro é direta e por banco**: `balanco-forrageiro.ts:162-183` (`getAnimaisAtivosPorCategoria`) lê `animais` por `categoria` para projetar demanda de matéria seca. Balanço é **consumidor** do rebanho (e do pasto e dos silos). `Verificado`.

13. **A integração rebanho↔silagem é fraca e majoritariamente não implementada**: existe um campo `eficiencia_alimentar_litros_por_kg_ms` no tipo `IndicadoresLeiteiros` (`rebanho-leiteira.ts:38`) que pressupõe cruzar leite com consumo de silagem, mas **não há query de silos** em `rebanho-leiteira.ts` (grep `movimentacoes_silo`/`silo` → nenhum match). O cruzamento real leite×silagem está documentado como backlog bloqueado. `Verificado`.

14. **O Dashboard principal consome o rebanho diretamente (não via serviço do módulo)**: `app/dashboard/page.tsx` faz `SELECT` em `animais` (3×, por categoria/tipo/lote) e em `eventos_sanitarios` para montar alertas — sem passar pelas funções de `lib/supabase/rebanho*`. Acoplamento por tabela. `Verificado` (`page.tsx:142-191`).

15. **Há acoplamento de versão entre TypeScript e o banco mantido à mão**: os tipos de reprodução comentam explicitamente "bate com CHECK do banco" (`rebanho-reproducao.ts:24,36,58,152`), e `indicadores-rebanho.ts:15-29` replica as strings de categoria do trigger SQL `recalcular_categoria_animal`. Mudança no banco exige edição manual em espelho. `Verificado` — fonte de fragilidade.

16. **Categorias de animal são strings livres replicadas em 3+ lugares** (`rebanho.ts:39-75` `CATEGORIAS_POR_TIPO`, `indicadores-rebanho.ts:17-35`, e o trigger SQL), com divergências (`'Novilha (Prenha)'` no tipo vs `'Novilha Prenha'` no cálculo) — provável causa do teste pré-existente falho de classificação de categoria citado no CLAUDE.md. `Provável`.

17. **A camada de query da reprodução é um monólito de 1056 linhas** (`rebanho-reproducao.ts`) com 6 "namespaces" de query (reprodutores, eventos, lactações, crias, parâmetros, indicadores, repetidoras). É coeso por domínio, mas é o maior arquivo de lib do módulo. `Verificado`.

18. **A página do animal busca TODOS os animais e TODOS os lotes para montar a ficha de UM animal** (`[id]/page.tsx:231-234`, `listAnimais({}, 1000, 0)`), resolvendo mãe/pai/lote em memória em vez de por id. Ineficiência estrutural. `Verificado`.

19. **Reprodução tem sua própria camada offline-sync** (`ReproducaoSyncProvider`, `SyncStatusBadge`, `ConflictResolutionDialog` em `components/rebanho/reproducao/`) além do sistema offline global — só eventos de rebanho têm store dedicada `eventos_rebanho` no IndexedDB. `Verificado` (CLAUDE.md + `RebanhoClient.tsx:70-91` hidrata eventos).

20. **A reprodução foi reestruturada (6→4 abas) deixando código órfão**: `reproducao/indicadores/page.tsx` e `reproducao/repetidoras/page.tsx` são apenas redirects; `CalendarioReprodutivo.tsx`, `IndicadoresCard.tsx`, `RepetidorasAlerta.tsx`, `ReproducaoStats.tsx` são documentados como legados não mais usados. Dívida de limpeza visível. `Verificado` (CLAUDE.md) / `Provável` (não confirmei cada import).

---

# 2. Mapa do repositório relevante

### Frontend — páginas / rotas (`app/dashboard/rebanho/`)
- `page.tsx` + `RebanhoClient.tsx` (448) — **hub**: painel resumo, 6 cards de acesso rápido, tabela de animais com filtros.
- `layout.tsx` — guard de plano (`requirePlano('rebanho')`).
- `[id]/page.tsx` (688) — **ficha do animal** (god-component, 7 abas).
- `[id]/editar/page.tsx`, `[id]/evento/page.tsx` — edição e registro de evento individual.
- `novo/page.tsx` (445), `cadastro-rapido/` (CadastroRapidoClient 505), `importar/page.tsx` — cadastro.
- `lotes/` (`page.tsx`, `novo`, `[id]`, `[id]/editar`) — CRUD de lotes.
- `indicadores/` — `page.tsx`, `IndicadoresClient.tsx` (567), `actions.ts` (569), `components/` (cards + 6 charts).
- `reproducao/` — `page.tsx` (12 queries), `layout.tsx`, `TabsNav.tsx`, `actions.ts` (316), e sub-rotas `eventos/`, `reprodutores/[id]`, `parametros/`, `indicadores/`(redirect), `repetidoras/`(redirect).
- `leiteira/page.tsx` (129) — dashboard leiteiro.
- `corte/page.tsx` + `actions.ts` — dashboard de corte / pesagem em lote.
- `sanidade/page.tsx` + `actions.ts` (124) — sanidade.
- `movimentacoes/` — `page.tsx`, `MovimentacoesClient.tsx` (373), `actions.ts` (146), `RegistrarMovimentacaoDialog`.
- `eventos/lote/novo/` — wizard de lançamento em lote; `eventos/lote/actions.ts` (RPC).
- `components/` (hub-local) — `PainelResumo.tsx` (200), `KpiCard`, `SelecionarAnimalDialog`.

### Frontend — componentes (`components/rebanho/`)
- Raiz: `AnimalForm` (269), `AnimaisList`, `AnimalCard`, `AnimalFiltros`, `LoteForm`, `LotesList`, `EventoDialog`, `EventoForm/{Pesagem,Morte,Nascimento,Venda,TransferenciaLote}`, `HistoricoEventos`, `ImportadorCSV` (365), `RebanhoProjetado`.
- Abas reutilizadas pela ficha: `AbaProducaoLeiteira` (357), `AbaSanidade` (244), `FormEventoSanitario` (542).
- `reproducao/` — 20+ arquivos: `DashboardReprodutivo` (530), dialogs por evento, `eventos/*Form`, sync provider, `EventosListagem`, `ReprodutorListagem`, legados.
- `leiteira/DashboardLeiteiro` (446), `corte/DashboardCorte` (427) + `FormRegistroPesagemLote` (349), `sanidade/SanidadeDashboard` (457), `lote/CamposCompartilhados` (254).

### Backend — Server Actions
`app/dashboard/rebanho/actions.ts` (geral) + 7 actions por sub-área: `reproducao`, `sanidade`, `corte`, `leiteira`, `eventos/lote`, `movimentacoes`, `indicadores`.

### Backend — camada de dados (`lib/supabase/`)
- `rebanho.ts` (1141) — animais, lotes, eventos, pesos, CSV, projeção.
- `rebanho-reproducao.ts` (1056) — reprodutores, eventos reprodutivos, lactações, crias, parâmetros, **indicadores reprodutivos**, repetidoras.
- `rebanho-leiteira.ts` (211), `rebanho-sanitario.ts` (174), `rebanho-movimentacoes.ts` (509), `rebanho-movimentacoes-actions.ts`, `rebanho-indicadores.ts` (351), `rebanho-lote.ts`.
- `relatorios/rebanho.ts` + `lib/relatorios/rebanho-builder.ts`.

### Tipos / validações / cálculos
- `lib/types/rebanho.ts` (371), `rebanho-reproducao.ts` (172), `rebanho-leiteira.ts`, `rebanho-sanitario.ts`, `rebanho-lote.ts`, `relatorios-rebanho.ts`.
- `lib/validations/rebanho.ts` (452), `rebanho-reproducao.ts` (294), `rebanho-lote.ts` (192), `indicadores-rebanho.ts`.
- `lib/calculos/indicadores-rebanho.ts` (684) — GMD, IEP, arrobas, projeção de abate, classificação de categoria.
- `lib/utils/rebanho-lote.ts` — 5 funções puras do lote.

### Banco (via tipos/migrations referenciadas)
Tabelas: `animais`, `lotes`, `eventos_rebanho`, `pesos_animal`, `reprodutores`, `lactacoes`, `producoes_leiteiras`, `eventos_sanitarios`, `eventos_parto_crias`, `parametros_reprodutivos_fazenda`, `categorias_rebanho`. View `vw_animais_completos`. RPC `registrar_evento_com_status`. Trigger `recalcular_categoria_animal`.

### Integrações (consumidores externos do rebanho)
- `lib/supabase/pastagens.ts` — lê `animais` + `pesos_animal`.
- `lib/supabase/balanco-forrageiro.ts` — lê `animais` por categoria.
- `app/dashboard/page.tsx` — lê `animais` + `eventos_sanitarios`.
- `lib/supabase/calendario.ts` — agrega `eventos_sanitarios`, `producoes_leiteiras`, `eventos_rebanho` (documentado no CLAUDE.md).

---

# 3. Arquitetura atual do módulo de rebanho

**Limites do módulo (na prática).** O "rebanho" é definido por convenção de nomes (`rebanho` no path/arquivo) e por um conjunto de tabelas centradas em `animais`. Não há uma fronteira de pacote/serviço; o que une tudo é o tipo `Animal` (`lib/types/rebanho.ts:79-112`) e a tabela `animais`. O `layout.tsx` (`layout.tsx:1-6`) só impõe um guard de **plano** (`requirePlano('rebanho')`), não de perfil — o controle de perfil é feito caso a caso dentro das páginas (`[id]/page.tsx:225-226`).

**Como leite, corte, reprodução, sanidade e indicadores estão distribuídos:**

- **Reprodução** é a sub-área mais estruturada e mais isolada: rota própria com sub-navegação (`TabsNav.tsx`), camada de dados própria e extensa (`rebanho-reproducao.ts`, 1056 linhas), tipos próprios (`rebanho-reproducao.ts`), validações próprias, dashboard dedicado (`DashboardReprodutivo`, 530 linhas) e até **sync/conflitos offline próprios**. É quase um módulo dentro do módulo. `Verificado`.

- **Leiteira** tem dashboard próprio (`leiteira/page.tsx` + `DashboardLeiteiro`), queries próprias (`rebanho-leiteira.ts`) e tipos próprios — mas os **KPIs são calculados inline na page** (`leiteira/page.tsx:55-71`), não em serviço. Além disso, parte da produção leiteira é reimplementada **dentro da ficha do animal** (`AbaProducaoLeiteira`, 357 linhas). `Verificado`.

- **Corte** quase não existe como dado próprio: não há tabela "corte". É puramente derivado de `animais.peso_atual` + `pesos_animal` via `lib/calculos/indicadores-rebanho.ts`. O "Dashboard de Corte" (`DashboardCorte`) e a aba "Desempenho de Corte" da ficha (`[id]/page.tsx:90-204`, `DesempenhoCorteContent`) **reimplementam o mesmo cálculo** (GMD/arrobas/projeção de abate) a partir das mesmas funções puras. `Verificado`.

- **Sanidade** tem tabela própria (`eventos_sanitarios`), queries (`rebanho-sanitario.ts`), dashboard (`SanidadeDashboard`, 457) **e** uma aba na ficha (`AbaSanidade`, 244) **e** alimenta alertas no Dashboard principal e nos Indicadores. Está espalhada por 4 superfícies. `Verificado`.

- **Indicadores** estão **bifurcados**: reprodutivos em `queryIndicadoresReprodutivos`; zootécnicos/corte/leite em `lib/calculos/` + `rebanho-indicadores.ts` + cálculos inline. A página `indicadores/` agrega só uma parte (composição, GMD, natalidade/mortalidade, alertas), enquanto os reprodutivos vivem na página `reproducao/`. Não há tela única de "todos os indicadores do rebanho". `Verificado`.

**Padrão arquitetural geral.** As páginas seguem o padrão RSC do projeto (page server faz `Promise.all`, passa props ao Client), **exceto** a ficha do animal e o registro de evento individual, que são `'use client'` e fazem fetch no mount — desvio explícito do padrão documentado no CLAUDE.md ("Client Component não usa `useAuth()` no mount para buscar dados iniciais"). `Verificado` (`[id]/page.tsx:1,228-281`).

---

# 4. Navegação e estrutura funcional

**Ponto de entrada único:** Sidebar → "Rebanho" → `/dashboard/rebanho` (hub). Não há submenu de rebanho no Sidebar. `Verificado` (CLAUDE.md "item único 'Rebanho' sem submenu" + ausência de outras rotas no Sidebar).

**A partir do hub (`RebanhoClient.tsx`):**
- Topo: ações de admin em 3 dropdowns — *Cadastrar animais* (único / rápido / CSV), *Lotes*, *Lançar eventos* (um animal / lote) (`RebanhoClient.tsx:150-206`).
- `PainelResumo` (visão geral).
- **"Acesso Rápido"**: grid de 6 cards → Indicadores, Reprodução, Leiteira, Corte, Sanidade, Movimentações (`RebanhoClient.tsx:252-258`).
- Tabela de animais com busca + filtros (status/tipo/sexo/categoria/lote); clique na linha → ficha do animal.

**Dentro de Reprodução:** sub-navegação por abas próprias (`TabsNav.tsx:15-20`): Dashboard, Histórico, Reprodutores, Parâmetros. (Indicadores e Repetidoras existem como rotas mas redirecionam para o Dashboard.)

**Dentro da ficha do animal:** abas dinâmicas conforme `sexo`/`tipo_rebanho` (`[id]/page.tsx:445-458`): Eventos, Movimentações, Pesagens, Genealogia (se mãe/pai), Produção Leiteira (fêmea leiteiro/dupla), Desempenho de Corte (corte/dupla), Sanidade.

**Leiteira / Corte / Sanidade / Movimentações:** páginas-folha sem sub-navegação; só alcançáveis pelos cards do hub. `Verificado`.

**Orientação da experiência:** é uma **mistura** — o hub é orientado a *cadastro + listagem*; os cards levam a dashboards *orientados a indicadores*; o registro de eventos é *orientado a operação diária* mas está fragmentado em 3 entradas distintas (dropdown "evento em um animal", "lançamento múltiplo", e botão "Registrar Evento" na ficha). Não há uma "central de tarefas/operação do dia". `Provável`.

---

# 5. Modelo de domínio

| Entidade | Tabela | Responsabilidade | Relacionamentos |
|---|---|---|---|
| **Animal** | `animais` | Entidade central. Carrega identificação, categoria, status, peso atual **e** estado reprodutivo desnormalizado (`status_reprodutivo`, `data_ultimo_parto`, `data_parto_previsto`, `flag_repetidora`, `is_reprodutor`) | `lote_id`→lote, `mae_id`/`pai_id`→animal (genealogia), `reprodutor_vinculado_id` |
| **Lote** | `lotes` | Agrupamento de animais | 1→N animais; referenciado por pastagens/ocupações |
| **Categoria** | `categorias_rebanho` (tabela) **+** strings em `animais.categoria` | Classificação (Bezerro, Vaca em Lactação, Boi…) derivada por trigger | string livre; replicada em TS (`rebanho.ts:39-75`, `indicadores-rebanho.ts:17-35`) |
| **Evento (genérico)** | `eventos_rebanho` | Tabela-canivete de TODOS os eventos do animal (14+ tipos) | `animal_id`, `lote_id_destino`, `reprodutor_id`, colunas opcionais por tipo |
| **Pesagem** | `pesos_animal` | Histórico de pesos + condição corporal | `animal_id`; consumida por corte e por pastagens (UA) |
| **Reprodutor** | `reprodutores` | Touro / sêmen / touro-teste | referenciado por eventos de cobertura |
| **Parto / crias** | `eventos_rebanho` (parto) + `eventos_parto_crias` | Parto e detalhamento de crias | `evento_id`→evento, `animal_criado_id`→animal |
| **Prenhez / diagnóstico** | `eventos_rebanho` (cobertura, diagnóstico_prenhez) | Estado reprodutivo derivado para `animais.status_reprodutivo` | — |
| **Lactação** | `lactacoes` | Ciclo de lactação (parto→secagem, total litros) | `animal_id` |
| **Produção leiteira** | `producoes_leiteiras` | Registro diário/por turno de volume | `animal_id` |
| **Sanidade** | `eventos_sanitarios` | Vacinação/vermifugação/tratamento/exame (discriminated union) | `animal_id` |
| **Movimentação** | derivada de `eventos_rebanho` | View consolidada de entradas/saídas (nascimento, venda, morte, descarte, transferência) | não é tabela própria — `rebanho-movimentacoes.ts` projeta sobre eventos |
| **Descarte / Morte** | `eventos_rebanho` (descarte/morte) + `animais.status` | Baixa do animal (muda `status`) | — |
| **Parâmetros reprodutivos** | `parametros_reprodutivos_fazenda` | Metas da fazenda (gestação, seca, taxa prenhez…) | 1 por fazenda |

**Observações de modelagem:**
- O domínio reprodutivo está **desnormalizado dentro de `animais`** (status/datas) *e* normalizado em `eventos_rebanho`/`lactacoes` — dupla fonte de verdade reconciliada por trigger/RPC. `Verificado` (`rebanho.ts:100-108` + RPC `registrar_evento_com_status`).
- **Não existem entidades "corte" nem "rebanho de corte"** — corte é uma *view* sobre peso. Leite, ao contrário, tem `producoes_leiteiras` + `lactacoes`. Logo **leite e corte são assimétricos**: leite é dado, corte é cálculo. `Verificado`.

---

# 6. Fluxos principais

### 6.1 Cadastro de animal
- Entrada: hub → "Cadastrar animais" → `novo/page.tsx` (445) | `cadastro-rapido/` | `importar/` (CSV via `ImportadorCSV` + `rebanho.ts` Papa-parse).
- Arquivos: `AnimalForm`, `actions.ts` (geral), `lib/validations/rebanho.ts`, `queryAnimais.create` (`rebanho.ts:72-89`).
- Regra aparente: `fazenda_id` não enviado (trigger preenche); `status='Ativo'` forçado; `categoria` derivada/validada por banco.
- Observação: só Admin cadastra (`isAdmin` no hub).

### 6.2 Registro de evento individual
- Entrada: ficha → "Registrar Evento" → `[id]/evento/page.tsx`.
- Arquivos: `registrarEventoAction` (`actions.ts`), tipos `EventoPayload` discriminados (`rebanho.ts:154-219`).
- Regra: formulário superconjunto (`EventoFormValues`) que monta o payload tipado no submit (`[id]/evento/page.tsx:28-40`).
- **Observação crítica:** usa Padrão A legado (`Controller` + `<Label>`), divergente dos forms de reprodução. `Verificado`.

### 6.3 Lançamento de evento em lote
- Entrada: hub → "Lançar eventos" → "Lançamento múltiplo" → `eventos/lote/novo/`.
- Arquivos: `EventosLoteClient`, `CamposCompartilhados`, `eventos/lote/actions.ts`.
- Regra: `Promise.allSettled` por animal (falha individual não cancela lote) chamando RPC `registrar_evento_com_status` (`eventos/lote/actions.ts:42,109`); exclusivo de Admin (guard no layout do lote).

### 6.4 Reprodução: cobertura/IATF → diagnóstico → parto/secagem
- Entrada: `reproducao/` (Dashboard com kanban) + dialogs em `components/rebanho/reproducao/` (`CoberturaFormDialog`, `DiagnosticoFormDialog`, `PartoFormDialog`, `SecagemFormDialog`, `AbortoFormDialog`, `DescarteFormDialog`).
- Arquivos: `reproducao/actions.ts` (316), `rebanho-reproducao.ts` (queries + indicadores).
- Regra: cada evento atualiza `animais.status_reprodutivo` e datas previstas; parto pode gerar crias (`eventos_parto_crias`) e exigir `bypass_justificativa` se sem prenhez confirmada (`rebanho-reproducao.ts` tipos `:58`).

### 6.5 Lançamento de produção de leite
- Entrada: `leiteira/page.tsx` (`DashboardLeiteiro`) **ou** ficha do animal (`AbaProducaoLeiteira`).
- Arquivos: `leiteira/actions.ts`, `rebanho-leiteira.ts`.
- Regra: KPIs (média/dia, média/vaca, DEL médio, eficiência) calculados inline na page (`leiteira/page.tsx:55-71`). **Eficiência alimentar (leite/kg MS) não implementada.**

### 6.6 Pesagem / GMD
- Entrada: evento de pesagem (individual ou lote) → grava `pesos_animal`.
- Cálculo: `calcularGMDUltimasDuas`, `calcularArrobasEstimadas`, `calcularProjecaoAbate` (`indicadores-rebanho.ts`), usados na ficha (`[id]/page.tsx:90-204`) e no `DashboardCorte` — **duplicado**.

### 6.7 Sanidade
- Entrada: `sanidade/page.tsx` (`SanidadeDashboard`) ou ficha (`AbaSanidade`) via `FormEventoSanitario`.
- Arquivos: `sanidade/actions.ts`, `rebanho-sanitario.ts` (`listAlertasVacinacao`, `listAlertasSanitarios`).
- Regra: alertas por `data_proxima_dose`; alimentam Indicadores e Dashboard principal.

### 6.8 Descarte / baixa (morte/venda)
- Entrada: movimentações (`RegistrarMovimentacaoDialog`) ou evento.
- Arquivos: `movimentacoes/actions.ts`, `rebanho-movimentacoes.ts`.
- Regra: muda `animais.status`; **não gera lançamento financeiro** mesmo havendo `valor_venda`. `Verificado`.

---

# 7. Integrações com outros módulos

### 7.1 Rebanho → Pastagens  (direta, por banco; rebanho FORNECE)
`lib/supabase/pastagens.ts` lê o rebanho diretamente para o cálculo de **Unidade Animal**:
- `calcularUADoLote(loteId, areaHa)` busca `animais` por `lote_id`+`status='Ativo'` (`pastagens.ts:451-455`) e `pesos_animal` dos últimos 90 dias (`pastagens.ts:475-480`), pega a pesagem mais recente por animal (`:485-490`) e calcula UA (peso/450, com fallback por categoria).
- Direção: **pastagens consome** dados do rebanho. Mecanismo: query SQL direta (acoplamento por tabela, sem camada de serviço do rebanho).

### 7.2 Rebanho → Balanço Forrageiro  (direta, por banco; rebanho FORNECE)
`lib/supabase/balanco-forrageiro.ts` → `getAnimaisAtivosPorCategoria` lê `animais` (`status='Ativo'`, `deleted_at null`) e agrupa por `categoria` (`balanco-forrageiro.ts:162-183`). Essa contagem alimenta a **demanda projetada de matéria seca** (cruzada com `CONSUMO_MS_POR_CATEGORIA`). Direção: **balanço consome** o rebanho. Mecanismo: query direta + mapa de constantes.

### 7.3 Rebanho ↔ Silagem  (fraca / majoritariamente NÃO implementada)
- O cruzamento "demanda de silagem pelo rebanho" e "autonomia dos silos" ocorre **no Balanço Forrageiro**, não num link direto rebanho↔silos (§7.2 fornece o lado rebanho; o lado silos é lido em `balanco-forrageiro.ts` por outras funções). `Verificado`.
- O cruzamento **leite × consumo de silagem** (eficiência alimentar L/kg MS) é apenas **declarado** no tipo `IndicadoresLeiteiros.eficiencia_alimentar_litros_por_kg_ms` (`rebanho-leiteira.ts:38`) e **não implementado** — `rebanho-leiteira.ts` não consulta `movimentacoes_silo` (grep sem match). Documentado como backlog bloqueado no CLAUDE.md. Direção pretendida: rebanho **consumiria** dados de silos. `Verificado`.

### 7.4 Rebanho → Dashboard principal  (direta, por banco; rebanho FORNECE)
`app/dashboard/page.tsx` consulta `animais` (composição por categoria, por tipo, por lote) e `eventos_sanitarios` (alertas de vacinação) diretamente (`page.tsx:142-191`), sem usar as funções de `lib/supabase/rebanho*`. Acoplamento por tabela.

### 7.5 Rebanho → Calendário  (direta, por banco; rebanho FORNECE)
Documentado no CLAUDE.md: `lib/supabase/calendario.ts` agrega `eventos_sanitarios`, `producoes_leiteiras`, `eventos_rebanho`. `Provável` (não reli o arquivo nesta análise).

### 7.6 Rebanho → Financeiro  (INEXISTENTE)
Ao contrário de silos/insumos/produtos/mão-de-obra/pastagens, **não há integração financeira**. Venda/abate de animal não cria receita; não há `receita_id`/`despesa_id` em `eventos_rebanho`. `Verificado` (grep em `movimentacoes/actions.ts` e em `app/dashboard/rebanho` sem INSERT em `financeiro`). **Lacuna funcional relevante para um SaaS de gestão.**

---

# 8. Pontos de acoplamento e confusão

1. **`[id]/page.tsx` (688) — god-component.** Mistura fetch, cálculo de corte inline, 7 abas (eventos/movimentações/pesos/genealogia/leite/corte/sanidade) e exclusão. Reimplementa corte e embute leite/sanidade que já têm páginas próprias. `Verificado`.

2. **Duplicação leite↔ficha e corte↔ficha.** `DesempenhoCorteContent` (`[id]/page.tsx:90-204`) e `DashboardCorte` calculam GMD/arrobas/abate das mesmas funções. `AbaProducaoLeiteira` reimplementa parte do dashboard leiteiro. `Verificado`.

3. **Indicadores bifurcados sem unificação.** Reprodutivos (`queryIndicadoresReprodutivos`) vs zootécnicos (`lib/calculos/` + `rebanho-indicadores.ts`) vs leite inline (`leiteira/page.tsx`). Três locais, três estilos. `Verificado`.

4. **Três padrões de "registrar evento".** Padrão A (`[id]/evento`), RPC+allSettled (lote), dialogs Padrão B (reprodução). Sem caminho único. `Verificado`.

5. **`eventos_rebanho` sobrecarregada.** 14+ tipos numa tabela com colunas opcionais por tipo; type-safety só na borda TS (unions). Qualquer novo tipo toca enum SQL + tipos TS + validações + RPC. `Verificado`.

6. **Strings de categoria replicadas e divergentes** (`'Novilha (Prenha)'` vs `'Novilha Prenha'`) entre `rebanho.ts`, `indicadores-rebanho.ts` e trigger SQL — provável raiz do teste falho documentado. `Provável`.

7. **Acoplamento por tabela com 4 consumidores externos** (pastagens, balanço, dashboard, calendário) lendo `animais`/`pesos_animal`/`eventos_*` direto, sem fachada. Mudança de schema do rebanho quebra módulos distantes silenciosamente. `Verificado`.

8. **Estado reprodutivo com dupla fonte de verdade** (`animais.status_reprodutivo` desnormalizado vs `eventos_rebanho`). Reconciliação via RPC/trigger; risco de divergência se eventos forem editados/deletados fora do fluxo. `Provável`.

9. **`rebanho.ts` (1141) e `rebanho-reproducao.ts` (1056) — arquivos enormes.** Coesos por domínio, mas grandes demais para navegação/manutenção. `Verificado`.

10. **Ficha do animal carrega 1000 animais + 100 lotes para exibir 1 animal** (`[id]/page.tsx:231-234`). Anti-padrão de performance estrutural. `Verificado`.

11. **Código órfão pós-reestruturação da reprodução** (redirects + 4 componentes legados). Dívida de limpeza. `Verificado`/`Provável`.

12. **Desvio do padrão RSC** na ficha e no evento individual (client + fetch no mount), contrariando o CLAUDE.md. `Verificado`.

**Dependências circulares:** não encontrei evidência direta de import circular nesta análise. `Hipótese` de que não existem (não exaustivamente verificado).

---

# 9. Pontos fortes estruturais

1. **Funções de cálculo puras e testadas** (`lib/calculos/indicadores-rebanho.ts`, `lib/utils/rebanho-lote.ts`) — determinísticas, sem I/O, com testes (`__tests__`). Boa fundação para reuso. `Verificado`.

2. **Reprodução é um subdomínio bem delimitado**: tipos alinhados ao banco, camada de query coesa, sub-navegação própria, sync offline dedicado. Apesar do tamanho, tem fronteira clara. `Verificado`.

3. **Padrão RSC aplicado corretamente nas páginas de dashboard** (`reproducao/page.tsx`, `leiteira/page.tsx`, `indicadores/page.tsx`): `Promise.all` no server, props para client. (A ficha é a exceção.) `Verificado`.

4. **Separação de queries por arquivo de sub-área** (`rebanho-leiteira`, `rebanho-sanitario`, `rebanho-movimentacoes`, `rebanho-indicadores`) — modularização por tema já existe na camada de dados, mesmo que a UI não a espelhe. `Verificado`.

5. **`select` de colunas explícito** em todo o módulo (sem `select('*')`), aderente à regra do projeto. `Verificado`.

6. **Multi-tenancy via RLS/JWT** sem `fazenda_id` manual — consistente. `Verificado`.

7. **Lançamento em lote robusto** (`Promise.allSettled` + RPC transacional) — bom padrão para operação de campo. `Verificado`.

8. **Tipos discriminados por evento** (`EventoPayload`, `EventoReprodutivo`, `EventoSanitario`) dão type-safety na borda apesar da tabela genérica. `Verificado`.

---

# 10. Perguntas em aberto

1. **`animais.status_reprodutivo` (desnormalizado) e `eventos_rebanho` divergem em algum cenário real?** Quem é a fonte de verdade quando um evento reprodutivo é deletado/editado? (Depende de inspeção da RPC/trigger e de dados de produção.) `Lacuna`.
2. **A divergência `'Novilha (Prenha)'` vs `'Novilha Prenha'` é a causa do teste falho de categoria?** Confirmar contra o trigger SQL `recalcular_categoria_animal`. `Lacuna`.
3. **Corte deve virar dado de primeira classe** (com entidade própria, como leite tem `producoes_leiteiras`/`lactacoes`) **ou continuar como view sobre peso?** Decisão de produto.
4. **A integração leite × silagem (eficiência alimentar) é desejada no curto prazo?** Hoje é tipo morto. Decisão de produto + depende de query de consumo de silos por lote/categoria.
5. **Venda/abate de animal deve gerar lançamento no Financeiro** (como silos/produtos)? Hoje não gera. Decisão de produto.
6. **Os 4 componentes legados da reprodução e os redirects podem ser removidos** (nenhum import vivo)? Requer confirmação de grafo de imports. `Lacuna`.
7. **A navegação deve migrar para submenu no Sidebar** ou permanece "hub + cards"? Decisão de UX.
8. **Indicadores devem ser unificados numa única superfície** ("Indicadores do Rebanho" cobrindo reprodução+leite+corte+sanidade) ou permanecem por sub-área? Decisão de produto.
9. **Quais consumidores externos (pastagens, balanço, dashboard, calendário) toleram uma fachada/serviço** em vez de ler tabelas direto? Análise de impacto necessária.
10. **Há um app offline/operador que registra eventos de rebanho em campo?** O sync dedicado sugere que sim; confirmar o fluxo operador→rebanho. `Lacuna`.

---

# 11. Anexo de evidências

**Mapa / tamanho do módulo (§1.1, §2):** contagem de linhas — `rebanho.ts:1141`, `rebanho-reproducao.ts:1056`, `[id]/page.tsx:688`, `indicadores-rebanho.ts:684`, `indicadores/actions.ts:569`, `IndicadoresClient.tsx:567`, `FormEventoSanitario.tsx:542`, `DashboardReprodutivo.tsx:530`, `rebanho-movimentacoes.ts:509`, `CadastroRapidoClient.tsx:505`, `rebanho.ts(validations):452`, `DashboardLeiteiro.tsx:446`, `RebanhoClient.tsx:448`, `novo/page.tsx:445`, `DashboardCorte.tsx:427`.

**Navegação por hub (§1.3, §4):** `app/dashboard/rebanho/RebanhoClient.tsx:252-268` (6 cards de acesso rápido); `app/dashboard/rebanho/reproducao/TabsNav.tsx:15-20` (sub-abas da reprodução); `app/dashboard/rebanho/layout.tsx:1-6` (guard de plano apenas).

**God-component da ficha (§1.5, §3, §8.1):** `app/dashboard/rebanho/[id]/page.tsx:1` (`'use client'`), `:90-204` (`DesempenhoCorteContent` — corte inline), `:228-281` (fetch no mount), `:231-234` (`listAnimais({},1000,0)` + `listLotes(100,0)`), `:445-458` (7 abas dinâmicas).

**Indicadores bifurcados (§1.6, §8.3):** `lib/supabase/rebanho-reproducao.ts:593-646` (`queryIndicadoresReprodutivos`, taxa de prenhez/contagem); `lib/calculos/indicadores-rebanho.ts:1-60` (cálculos zootécnicos puros + replicação de strings de categoria `:17-29`); `app/dashboard/rebanho/leiteira/page.tsx:55-71` (KPIs leiteiros inline).

**eventos_rebanho tabela-canivete (§1.8, §8.5):** `lib/types/rebanho.ts:23-37` (`TipoEvento`), `:125-140` (interface com campos opcionais por tipo), `:154-219` (payloads discriminados).

**Três fluxos de evento (§1.9, §8.4):** `app/dashboard/rebanho/[id]/evento/page.tsx:5,28-40` (Padrão A, `Controller`); `app/dashboard/rebanho/eventos/lote/actions.ts:42,109` (`Promise.allSettled` + RPC `registrar_evento_com_status`); `components/rebanho/reproducao/*FormDialog.tsx` (dialogs Padrão B).

**Sem integração financeira (§1.10, §7.6):** grep `financeiro|.insert|receita_id|despesa_id` em `app/dashboard/rebanho/movimentacoes/actions.ts` → nenhum match; grep no diretório `app/dashboard/rebanho` retorna só labels/UI em `[id]/page.tsx`, `movimentacoes/MovimentacoesClient.tsx`, `[id]/evento/page.tsx` (nenhum INSERT em `financeiro`).

**Integração → pastagens (§7.1):** `lib/supabase/pastagens.ts:451-455` (lê `animais` por lote/status), `:475-480` (lê `pesos_animal` 90d), `:485-490` (pesagem mais recente por animal).

**Integração → balanço forrageiro (§7.2):** `lib/supabase/balanco-forrageiro.ts:162-183` (`getAnimaisAtivosPorCategoria`, contagem por `categoria`).

**Integração leite×silagem não implementada (§7.3):** `lib/types/rebanho-leiteira.ts:37-38` (campo `eficiencia_alimentar_litros_por_kg_ms` declarado); grep `movimentacoes_silo|silo|eficiencia_alimentar` em `lib/supabase/rebanho-leiteira.ts` → nenhum match.

**Dashboard lê rebanho direto (§1.14, §7.4):** `app/dashboard/page.tsx:142-146`, `:152-156`, `:162-168` (3 selects em `animais`), `:184-191` (`eventos_sanitarios` para alertas de vacinação).

**Acoplamento TS↔banco mantido à mão (§1.15):** `lib/types/rebanho-reproducao.ts:24` ("Bate com CHECK em eventos_rebanho.tipo_cobertura"), `:36`, `:58`, `:152`; `lib/calculos/indicadores-rebanho.ts:15` ("STRINGS EXATAS DO TRIGGER recalcular_categoria_animal").

**Divergência de categoria (§1.16, §8.6):** `lib/types/rebanho.ts:43,67` (`'Novilha (Prenha)'`) vs `lib/calculos/indicadores-rebanho.ts:18` (`CATEGORIAS_NOVILHAS = ['Novilha', 'Novilha Prenha']`).

**Estado reprodutivo desnormalizado (§5, §8.8):** `lib/types/rebanho.ts:100-108` (`status_reprodutivo`, `data_ultimo_parto`, `data_parto_previsto`, `data_proxima_secagem`, `flag_repetidora`, `is_reprodutor` em `animais`).

**Reprodução com 12 queries paralelas e indicadores centralizados (§3):** `app/dashboard/rebanho/reproducao/page.tsx:23-55`.

**Sync offline dedicado da reprodução (§1.19):** `components/rebanho/reproducao/ReproducaoSyncProvider.tsx`, `SyncStatusBadge.tsx`, `ConflictResolutionDialog.tsx`; hidratação de eventos em `app/dashboard/rebanho/RebanhoClient.tsx:70-91`.

**Código órfão pós-reestruturação (§1.20, §8.11):** `app/dashboard/rebanho/reproducao/indicadores/page.tsx` e `.../repetidoras/page.tsx` (redirects); `components/rebanho/reproducao/{CalendarioReprodutivo,IndicadoresCard,RepetidorasAlerta,ReproducaoStats}.tsx` (documentados como legados no CLAUDE.md).
