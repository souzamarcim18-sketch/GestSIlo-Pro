# PRD-rebanho2 — Análise de Impacto da Arquitetura-Alvo do Módulo de Rebanho

> Documento de investigação **read-only**. Nada foi alterado, criado ou corrigido no código.
> Objetivo: medir o **impacto técnico e funcional** de migrar o módulo de rebanho para a
> arquitetura-alvo de 5 camadas (Núcleo · Operação · Subdomínios técnicos · Indicadores · Planejamento/Integração).
> Não escreve a SPEC, não propõe código.
> Base: `PRD-rebanho1.md` (estado atual) + arquitetura-alvo fornecida pelo solicitante.
> Data: 2026-06-30.
>
> **Classificação**: `Verificado` (li o código), `Provável` (inferência forte de várias evidências), `Hipótese` (plausível, não confirmado).
> **Profundidade**: análise profunda nos fluxos críticos (ficha do animal, cadastro rápido, CSV, lançamento em lote, navegação, indicadores). Análise de superfície nas páginas `corte`/`sanidade`/`movimentacoes` e nos ~40 componentes de formulário.

---

# 1. Decisão suportada

Esta pesquisa permite decidir **iniciar a refatoração do rebanho em fases, começando pela camada de navegação e pela extração da ficha do animal — sem reescrever banco nem regras de negócio na primeira onda** — porque o código já oferece uma fundação reaproveitável muito maior do que o PRD-1 sugeria à primeira vista: o núcleo de mass-operations (`persistirAnimaisPreparados` + `analisarLinhas`/`analisarCSV`) é compartilhado entre CSV e cadastro rápido; a navegação-alvo já está **prototipada e comentada** no Sidebar (`Sidebar.tsx:230-238`); a camada de dados já é modular por subdomínio (`rebanho-leiteira`, `rebanho-sanitario`, `rebanho-movimentacoes`, `rebanho-reproducao`); e as funções de cálculo são puras e testadas. O maior risco não está nos dados, e sim em (a) 4 consumidores externos que leem tabelas do rebanho diretamente sem fachada, e (b) a unificação de indicadores, que é conceitual (duas famílias com fontes de verdade distintas) antes de ser técnica.

---

# 2. Resumo executivo

1. O núcleo de cadastro em massa (CSV + cadastro rápido) **já compartilha um core único** — `analisarLinhas`/`analisarCSV` → `persistirAnimaisPreparados` (`rebanho.ts:406,483,541,638,656`). A camada "Núcleo do rebanho" é majoritariamente reaproveitável. `Verificado`.
2. A navegação-alvo (submenu de rebanho com Indicadores/Reprodução/Leiteira/Corte/Sanidade/Movimentações) **já foi escrita e comentada** no Sidebar (`Sidebar.tsx:230-238`). A reorganização de menu é de baixo risco técnico. `Verificado`.
3. A ficha do animal (`[id]/page.tsx`, 688 linhas) é o item de maior alavancagem: é client-side god-component, reimplementa corte inline (`:90-204`) e embute leite/sanidade que já têm páginas próprias. Extraí-la é pré-requisito da camada "Subdomínios técnicos". `Verificado`.
4. A camada "Operação do rebanho" (agenda do dia, pendências, protocolos/tarefas, lançamentos, operações em massa) **não existe como superfície** — hoje os entrypoints estão dispersos em 3 dropdowns do hub e na ficha. É majoritariamente **construção nova orquestrando peças existentes**, não refatoração. `Verificado`.
5. Existem **duas implementações de "pesagem em lote"**: o wizard genérico de eventos em lote (`eventos/lote/`) cobre `pesagem` e `corte/actions.ts:11` tem `registrarPesagemLoteAction` próprio. Há duplicação a unificar na camada de Operação. `Verificado`.
6. O lançamento em lote genérico **já suporta** `pesagem`, `transferencia_lote`, `protocolo_hormonal`, `aspiracao_opu`, `transferencia_embriao` (`rebanho-lote.ts:7-18`). "Protocolo em lote" e "TE em lote" da arquitetura-alvo **já estão implementados** dentro desse wizard. `Verificado`.
7. Indicadores estão bifurcados em duas famílias com **fontes de verdade diferentes**: reprodutivos derivados de `animais.status_reprodutivo` em runtime (`rebanho-reproducao.ts:593+`) vs zootécnicos/corte calculados de `pesos_animal` (`lib/calculos/indicadores-rebanho.ts`). Unificar exige decisão conceitual antes da técnica. `Verificado`.
8. Corte é **cálculo, não dado** — não há tabela "corte". `DesempenhoCorteContent` (ficha) e `DashboardCorte` derivam GMD/arrobas/abate das mesmas funções puras. Unificar a camada "Produção > Corte" é eliminar duplicação de UI sobre cálculo compartilhado. `Verificado`.
9. Quatro consumidores externos leem tabelas do rebanho **direto, sem fachada**: pastagens (`pastagens.ts:451-490`), balanço (`balanco-forrageiro.ts:162-183`), dashboard principal (`page.tsx:142-191`), calendário. Reorganizar tabelas/colunas quebra esses módulos silenciosamente. `Verificado`.
10. A camada "Planejamento e integração" (demanda animal, lotação, consumo projetado) **já tem o lado consumidor implementado em pastagens e balanço** — o que falta é trazer essa leitura para dentro do domínio rebanho como serviço/fachada, e a integração leite×silagem que é **tipo morto** (`rebanho-leiteira.ts:38`, sem query de silos). `Verificado`.
11. Há **três padrões de "registrar evento"**: Padrão A legado (`[id]/evento/page.tsx`), RPC+`allSettled` (lote), dialogs Padrão B (reprodução). A camada "Operação" pede convergência para um caminho único — risco médio. `Verificado`.
12. `eventos_rebanho` é tabela-canivete com 14+ tipos e colunas opcionais por tipo (`rebanho.ts:125-140`); a RPC `registrar_evento_com_status` é o ponto único de escrita de eventos. Qualquer nova fronteira de subdomínio **não deve** quebrar essa RPC. `Verificado`.
13. Movimentações de rebanho **não integram ao Financeiro** (venda/abate sem `receita_id`), ao contrário de 5 outros módulos. Lacuna que a camada "Integração" pode endereçar — mas é feature nova, não refatoração. `Verificado`.
14. Strings de categoria estão replicadas/divergentes em 3 lugares (`rebanho.ts:43,67` `'Novilha (Prenha)'` vs `indicadores-rebanho.ts:18` `'Novilha Prenha'` + trigger SQL). É candidato a contrato central e provável causa do teste falho documentado. `Provável`.
15. A camada de dados **já é modular por subdomínio** (`rebanho-leiteira.ts`, `rebanho-sanitario.ts`, `rebanho-movimentacoes.ts`, `rebanho-reproducao.ts`). A arquitetura-alvo de subdomínios técnicos espelha uma separação que **já existe no backend** — falta espelhá-la na UI/navegação. `Verificado`.
16. A ficha carrega **1000 animais + 100 lotes** para exibir 1 animal (`[id]/page.tsx:231-234`). A extração da ficha pode corrigir isso de graça (buscar por id). `Verificado`.
17. Reprodução tem **sync offline dedicado** (`ReproducaoSyncProvider`, store `eventos_rebanho` no IndexedDB). Mover reprodução de lugar exige preservar esse provider e a hidratação em `RebanhoClient.tsx:70-91`. `Verificado`.
18. Há código órfão da reestruturação anterior da reprodução (redirects + 4 componentes legados). A refatoração é boa janela para limpá-los, mas exige confirmar grafo de imports. `Provável`.
19. O guard do módulo é só de **plano** (`layout.tsx`, `requirePlano('rebanho')`), não de perfil — perfil é checado caso a caso nas páginas. Novas rotas/camadas herdam o guard de plano automaticamente se ficarem sob `/dashboard/rebanho`. `Verificado`.
20. A primeira onda da SPEC pode ser **puramente de UI/navegação + extração de componentes**, sem tocar banco, RPC, RLS ou contratos — entregando a estrutura de 5 camadas como casca antes de mover lógica. `Provável`.

---

# 3. Reaproveitamento por área

| Área/Fluxo | Estado atual | Reaproveitamento | Tipo de ação | Evidência |
|---|---|---|---|---|
| Listagem de animais | `listAnimais()` com filtros server-side + paginação | Alto, sem mudança grande | manter | `rebanho.ts:672-712` |
| Filtros da tabela | Estado client + refetch por filtro; categoria filtrada em memória | Alto; reusável como "Inventário" do Núcleo | manter / extrair | `RebanhoClient.tsx:95-141` |
| Tabela principal de animais | Inline no `RebanhoClient` | Médio; extrair p/ componente do Núcleo | extrair | `RebanhoClient.tsx` (Table inline) |
| Cadastro rápido (vários) | Wizard 3 etapas → `cadastrarAnimaisLoteAction` | Alto; core compartilhado com CSV | manter | `CadastroRapidoClient.tsx`, `actions.ts:341` |
| Importação CSV | `validarCSVAction`/`importarCSVAction` → core compartilhado | Alto | manter | `actions.ts:220,277`; `rebanho.ts:638,656` |
| **Core de persistência em massa** | `analisarLinhas`/`analisarCSV` → `persistirAnimaisPreparados` | **Muito alto — base do Núcleo** | manter | `rebanho.ts:406,483,541` |
| Lançamento de evento em lote | Wizard + RPC + `Promise.allSettled` | Alto; base da camada Operação | manter / unificar | `eventos/lote/actions.ts:42,109` |
| Pesagem em lote (corte) | `registrarPesagemLoteAction` separado do wizard | Médio; **duplica** o caminho do wizard | unificar | `corte/actions.ts:11` |
| CRUD de lotes | `criar/editar/deletarLote` + páginas próprias | Alto, sem mudança | manter | `actions.ts:105-153`; `lotes/**` |
| Dashboard/queries de reprodução | `queryIndicadoresReprodutivos` + `DashboardReprodutivo` | Alto; subdomínio já delimitado | manter | `rebanho-reproducao.ts:593+` |
| Dashboard leite | KPIs **inline na page** + `DashboardLeiteiro` | Médio; KPIs devem virar serviço | adaptar / extrair | `leiteira/page.tsx:55-71` |
| Dashboard corte | Cálculo puro reusado, **UI duplicada com a ficha** | Médio; unificar UI sobre cálculo | unificar | `corte/page.tsx`, `[id]/page.tsx:90-204` |
| Sanidade | Tabela própria + queries + dashboard + aba na ficha | Médio; espalhada em 4 superfícies | adaptar | `rebanho-sanitario.ts`; `AbaSanidade.tsx` |
| Funções de cálculo puras | GMD/IEP/arrobas/abate, testadas | Muito alto | manter | `lib/calculos/indicadores-rebanho.ts` |
| Tipos discriminados de evento | `EventoPayload`, `EventoReprodutivo`, `EventoSanitario` | Alto na borda; candidatos a contrato central | adaptar / unificar | `rebanho.ts:154+` |
| Categorias (strings) | Replicadas/divergentes em 3 lugares | Baixo como está; precisa virar contrato | substituir | `rebanho.ts:39-75` vs `indicadores-rebanho.ts:17-35` |
| Ficha do animal | God-component client, 7 abas, fetch global | Baixo como bloco; alto após extração | extrair / substituir | `[id]/page.tsx` (688) |
| Sync offline reprodução | Provider + store IndexedDB dedicados | Alto; preservar ao mover reprodução | manter | `ReproducaoSyncProvider.tsx`; `RebanhoClient.tsx:70-91` |

---

# 4. Superfície de mudança

| Arquivo/Path | Papel atual | Camada-alvo | Tipo de impacto | Risco |
|---|---|---|---|---|
| `components/Sidebar.tsx` | Item único "Rebanho"; submenu comentado | (transversal) Navegação | Reativar/ajustar submenu | Baixo |
| `app/dashboard/rebanho/RebanhoClient.tsx` | Hub: cadastro + cards + tabela | Núcleo + (entrypoints Operação) | Dividir: inventário (Núcleo) vs ações (Operação) | Médio |
| `app/dashboard/rebanho/[id]/page.tsx` | Ficha god-component (7 abas) | Núcleo (ficha enxuta) + links p/ subdomínios | Quebrar em ficha + abas extraídas | Alto |
| `components/rebanho/AbaProducaoLeiteira.tsx` | Aba leite na ficha | Produção > Leite | Mover/encapsular; linkar | Médio |
| `components/rebanho/AbaSanidade.tsx` | Aba sanidade na ficha | Sanidade | Mover/encapsular; linkar | Médio |
| `[id]/page.tsx` `DesempenhoCorteContent` | Corte inline na ficha | Produção > Corte | Eliminar duplicação; reusar dashboard | Médio |
| `app/dashboard/rebanho/cadastro-rapido/**` | Cadastro em massa via grade | Operação (operações em massa) | Manter; reposicionar entrypoint | Baixo |
| `app/dashboard/rebanho/importar/**` | Importação CSV | Operação (operações em massa) | Manter; reposicionar entrypoint | Baixo |
| `app/dashboard/rebanho/eventos/lote/**` | Wizard evento em lote | Operação (lançamentos/massa) | Manter; tornar caminho único | Médio |
| `app/dashboard/rebanho/corte/actions.ts` | `registrarPesagemLoteAction` | Operação / Produção > Corte | Unificar com wizard | Médio |
| `app/dashboard/rebanho/[id]/evento/page.tsx` | Evento individual (Padrão A) | Operação (lançamentos) | Convergir p/ padrão único | Médio |
| `app/dashboard/rebanho/reproducao/**` | Subdomínio reprodução (4 abas) | Reprodução | Reposicionar; preservar sync | Médio |
| `app/dashboard/rebanho/leiteira/page.tsx` | Dashboard leite + KPIs inline | Produção > Leite + Indicadores | Extrair KPIs p/ serviço | Médio |
| `app/dashboard/rebanho/corte/page.tsx` | Dashboard corte | Produção > Corte + Indicadores | Reusar p/ ficha | Baixo |
| `app/dashboard/rebanho/sanidade/**` | Dashboard sanidade | Sanidade | Reposicionar | Baixo |
| `app/dashboard/rebanho/movimentacoes/**` | View consolidada de eventos | Núcleo (Movimentações) | Reposicionar | Baixo |
| `app/dashboard/rebanho/indicadores/**` | Indicadores zootécnicos | Indicadores | Base da camada unificada | Médio |
| `lib/supabase/rebanho-reproducao.ts` (`queryIndicadoresReprodutivos`) | Indicadores reprodutivos | Indicadores | Realocar p/ camada unificada | Médio |
| `lib/types/rebanho.ts` (`Animal`, `CATEGORIAS_POR_TIPO`) | Contrato central de fato | (transversal) Contratos | Estabilizar; centralizar categorias | Alto |
| `lib/supabase/pastagens.ts` | Consumidor externo (UA) | Integração/Planejamento | Introduzir fachada | Alto |
| `lib/supabase/balanco-forrageiro.ts` | Consumidor externo (demanda) | Integração/Planejamento | Introduzir fachada | Alto |
| `app/dashboard/page.tsx` | Consumidor externo (alertas) | (externo) | Possível fachada | Médio |
| `lib/supabase/calendario.ts` | Consumidor externo (eventos) | (externo) | Possível fachada | Médio |
| RPC `registrar_evento_com_status` | Ponto único de escrita de evento | (transversal) Contratos | **Não quebrar** | Alto |

---

# 5. Blast radius por camada

## 5.1 Núcleo do rebanho (Inventário, Animais, Lotes, Categorias, Movimentações, Ficha)
- **Arquivos centrais**: `lib/supabase/rebanho.ts` (animais/lotes/eventos/pesos/CSV); `lib/types/rebanho.ts`; `lib/validations/rebanho.ts`; `RebanhoClient.tsx` (parte inventário); `lotes/**`; `movimentacoes/**`; `[id]/page.tsx` (ficha enxuta).
- **Dependências afetadas**: tipo `Animal`/`Lote` importados em quase todo o módulo e nos consumidores externos; `CATEGORIAS_POR_TIPO` replicado.
- **Consumidores afetados**: pastagens, balanço, dashboard, calendário leem `animais`/`lotes`/`pesos_animal` — qualquer mudança de schema do Núcleo é blast radius externo.
- **Risco**: Médio-alto. O Núcleo é estável em dados, mas é o contrato que todo o resto depende. Mudar **estrutura de UI** é seguro; mudar **forma de `Animal` ou strings de categoria** é perigoso.

## 5.2 Operação do rebanho (Agenda, Pendências, Protocolos/Tarefas, Lançamentos, Massa)
- **Arquivos centrais**: `eventos/lote/**`, `cadastro-rapido/**`, `importar/**`, `[id]/evento/page.tsx`, `corte/actions.ts` (pesagem lote), dropdowns de `RebanhoClient.tsx:150-206`.
- **Dependências afetadas**: RPC `registrar_evento_com_status` (todo lançamento passa por ela); `SelecionarAnimalDialog`; validações `rebanho-lote.ts`.
- **Consumidores afetados**: nenhum externo direto — é camada interna de escrita.
- **Risco**: Médio. "Agenda do dia"/"Pendências" são **superfícies novas** (não existem); reusam alertas já calculados (`rebanho-indicadores.ts`, `rebanho-sanitario.ts`). O risco está em unificar os 3 padrões de evento e as 2 pesagens-em-lote sem regredir o offline.

## 5.3 Reprodução
- **Arquivos centrais**: `reproducao/**` (page 12 queries, `TabsNav`, `actions.ts`), `rebanho-reproducao.ts` (1056), `components/rebanho/reproducao/**` (20+), `ReproducaoSyncProvider`.
- **Dependências afetadas**: `animais.status_reprodutivo`/datas desnormalizadas; store `eventos_rebanho` no IndexedDB; hidratação em `RebanhoClient.tsx:70-91`.
- **Consumidores afetados**: leiteira lê `status_reprodutivo` (`leiteira/page.tsx:52,64,67`).
- **Risco**: Médio. Subdomínio bem delimitado, **mas tem sync próprio** — mover de path sem preservar provider/hidratação quebra offline. Código órfão pode ser removido aqui.

## 5.4 Produção > Leite
- **Arquivos centrais**: `leiteira/page.tsx` (KPIs inline), `DashboardLeiteiro`, `rebanho-leiteira.ts`, `AbaProducaoLeiteira` (na ficha).
- **Dependências afetadas**: `producoes_leiteiras`, `lactacoes`; `status_reprodutivo='lactacao'`.
- **Consumidores afetados**: calendário agrega `producoes_leiteiras`.
- **Risco**: Médio. KPIs inline precisam virar serviço para alimentar a camada Indicadores; a aba da ficha duplica parte do dashboard.

## 5.5 Produção > Corte
- **Arquivos centrais**: `corte/page.tsx`, `DashboardCorte`, `lib/calculos/indicadores-rebanho.ts`, `DesempenhoCorteContent` (ficha), `corte/actions.ts`.
- **Dependências afetadas**: `pesos_animal`, `animais.peso_atual`.
- **Consumidores afetados**: nenhum externo.
- **Risco**: Baixo-médio. Corte é cálculo puro; risco é só de **duplicação de UI** (ficha vs dashboard) e da pesagem-em-lote redundante.

## 5.6 Sanidade
- **Arquivos centrais**: `sanidade/**`, `rebanho-sanitario.ts`, `SanidadeDashboard`, `AbaSanidade`, `FormEventoSanitario` (542).
- **Dependências afetadas**: `eventos_sanitarios`.
- **Consumidores afetados**: **dashboard principal** (`page.tsx:184-191` alertas de vacinação) e **indicadores** (`listAlertasVacinacao`) e calendário leem `eventos_sanitarios`.
- **Risco**: Médio. Espalhada em 4 superfícies; reposicionar a UI é seguro, mas os alertas são consumidos externamente.

## 5.7 Indicadores
- **Arquivos centrais**: `indicadores/**` (page, `IndicadoresClient` 567, `actions.ts` 569, charts); `queryIndicadoresReprodutivos` (`rebanho-reproducao.ts:593+`); KPIs leite inline; `lib/calculos/`.
- **Dependências afetadas**: duas fontes de verdade (status desnormalizado vs `pesos_animal`/`producoes_leiteiras`).
- **Consumidores afetados**: PDF/CSV de indicadores (`lib/pdf/gerarPdfIndicadoresRebanho.ts`, `lib/relatorios/rebanho-builder.ts`).
- **Risco**: Médio-alto **conceitual**. Unificar a superfície é viável; unificar as **definições/fontes** dos KPIs reprodutivos vs zootécnicos exige decisão.

## 5.8 Planejamento e integração
- **Arquivos centrais (lado consumidor já pronto)**: `pastagens.ts:451-490` (UA por lote), `balanco-forrageiro.ts:162-183` (demanda por categoria).
- **Dependências afetadas**: leem `animais`/`pesos_animal` direto, sem fachada.
- **Consumidores afetados**: silagem/autonomia (via balanço), pastagens, dashboard.
- **Risco**: Alto se reorganizarmos tabelas; baixo se só **encapsularmos a leitura** numa fachada do rebanho. Integração leite×silagem é feature nova (tipo morto hoje).

---

# 6. Operações em massa

## 6.1 Cadastro rápido de vários animais
- **Implementação atual**: wizard client 3 etapas (`padrao` → `grade` → `concluido`) em `CadastroRapidoClient.tsx`; gerador de brincos sequenciais; aplica "dados em comum" por padrão a cada linha; submete via `cadastrarAnimaisLoteAction` (`actions.ts:341`) → `cadastrarAnimaisLote` (`rebanho.ts:656`) → `analisarLinhas` + `persistirAnimaisPreparados` (core compartilhado com CSV).
- **Validações**: limite 1–500 linhas (`actions.ts:330-335`); só linhas com brinco preenchido (`CadastroRapidoClient.tsx:143-146`); guard `sou_admin()` no core (`rebanho.ts:659`); validação de duplicados (arquivo + banco) dentro do core.
- **Regras de negócio**: `peso_nascimento` só p/ origem `nascido`; criação automática de lote por nome; resultado parcial (`importados` + `erros[]`).
- **Riscos na refatoração**: o wizard depende do shape `Record<string,string>` esperado pelo core; reposicionar o entrypoint (de dropdown do hub p/ camada Operação) é seguro, mas **não alterar o contrato `CSVImportResult`** nem o core compartilhado.
- **Preservação obrigatória (SPEC)**: manter o gerador de brincos, o limite 500, o resultado parcial e o reaproveitamento do core CSV. Não acoplar o cadastro rápido a UI específica de subdomínio.

## 6.2 Importação CSV
- **Implementação atual**: `importar/page.tsx` + `ImportadorCSV.tsx` (365); dry-run via `validarCSVAction` (`actions.ts:220`) → `validarAnimaisCSV` (`rebanho.ts:493`) alimenta tela de revisão; commit via `importarCSVAction` (`actions.ts:277`) → `importarAnimaisCSV` (`rebanho.ts:638`) → mesmo `persistirAnimaisPreparados`.
- **Validações**: schema `importarCSVSchema` (arquivo + `criar_lote_automatico`); Zod no shape do arquivo (`actions.ts:247`); duplicados arquivo/banco reportados na validação (`CSVValidacaoResult`).
- **Regras de negócio**: criação automática de lote opcional; resultado parcial; guard admin.
- **Riscos na refatoração**: forte acoplamento ao formato `FormData`/`File` nas actions; a tela de revisão depende de `CSVValidacaoResult`. Mover entrypoint é seguro; **não mexer no parser nem no contrato de validação**.
- **Preservação obrigatória (SPEC)**: manter o fluxo dry-run → revisão → commit; manter `CSVValidacaoResult`/`CSVImportResult`; manter core compartilhado com o cadastro rápido.

## 6.3 Lançamento de evento em lote
- **Implementação atual**: wizard `eventos/lote/novo/` (`EventosLoteClient` + `CamposCompartilhados`); submete via `criarEventosLoteAction` (`eventos/lote/actions.ts:10`); guard `sou_admin()` (`:14`); `Promise.allSettled` por animal (`:42`) chamando RPC `registrar_evento_com_status` (`:109`); monta payload por tipo (campos compartilhados vs individuais).
- **Tipos suportados** (`rebanho-lote.ts:7-18`): `pesagem`, `transferencia_lote`, `descarte`, `aspiracao_opu`, `protocolo_hormonal`, `transferencia_embriao` (+ reprodutivos). **Logo "protocolo em lote", "TE em lote", "mudança de lote em lote" e "pesagem em lote" já existem aqui.**
- **Validações**: `criarEventosLoteSchema` com discriminated unions por tipo (`rebanho-lote.ts` validations); `superRefine` p/ OPU.
- **Regras de negócio**: falha individual não cancela o lote; RPC resolve `fazenda_id` e muda `status_animal` (Descartado/Morto/Vendido); retorna `ResultadoLote { inseridos, erros[{brinco,motivo}] }`.
- **Riscos na refatoração**: **duplicação** com `corte/actions.ts:registrarPesagemLoteAction` — a pesagem em lote existe em dois caminhos; unificar sem regredir nenhum. A montagem de payload por tipo (`actions.ts:54-105`) é frágil a novos tipos — qualquer novo subdomínio que adicione tipo de evento toca esse switch + enum SQL + RPC + validações.
- **Preservação obrigatória (SPEC)**: manter `Promise.allSettled` e o resultado parcial; manter a RPC como ponto único de escrita; preservar o offline (store `eventos_rebanho`) ao mover a superfície; **decidir** se a pesagem-em-lote do corte é absorvida pelo wizard.

---

# 7. Ficha do animal

**O que deve continuar na ficha (Núcleo)**: identificação (brinco/nome/categoria/status/raça/lote/idade/peso) e as abas de **Histórico de Eventos**, **Movimentações** e **Pesagens** — são a "linha do tempo" natural do animal e leem dados já específicos por id. `Verificado` (`[id]/page.tsx:370-586`). Genealogia pode continuar como detalhe leve, **mas corrigindo** o anti-padrão de carregar 1000 animais (`:231-234`) para resolver mãe/pai por id.

**O que deve sair da ficha**:
- **Cálculo de corte inline** (`DesempenhoCorteContent`, `:90-204`): hoje reimplementa GMD/arrobas/abate. Deve consumir o mesmo componente/serviço da Produção > Corte, não ter cópia própria.
- **Fetch global** (`listAnimais({},1000,0)` + `listLotes(100,0)`): substituir por busca por id (Núcleo).
- **`'use client'` + fetch no mount**: converter p/ RSC conforme padrão do projeto.

**O que deve virar link para área própria**:
- **Produção Leiteira** (`AbaProducaoLeiteira`): manter um resumo enxuto na ficha, mas o registro/curva pertence à Produção > Leite. Linkar.
- **Sanidade** (`AbaSanidade` + `FormEventoSanitario`): idem — resumo na ficha, gestão na camada Sanidade.
- **Desempenho de Corte**: resumo na ficha, dashboard na Produção > Corte.

**Já extraíveis (bons candidatos)**:
- `DesempenhoCorteContent` → componente compartilhado com `DashboardCorte`.
- Helpers locais `getBadgeColorMovimentacao`/`getTipoLabelMovimentacao`/`getDetalhesMovimentacao` (`:47-88`) → utilitário de Movimentações (Núcleo).
- O cálculo de idade inline (`:428-438`) → util puro.
- As abas leite/sanidade já **são** componentes (`AbaProducaoLeiteira`, `AbaSanidade`) — a extração é de orquestração, não de criação.

---

# 8. Indicadores

**Estado atual** (duas famílias, três locais):
1. **Reprodutivos** — `queryIndicadoresReprodutivos` (`rebanho-reproducao.ts:593+`, 8 funções: contagem por status, taxa de prenhez, PSM, IEP, concepção IA, dias em aberto, taxa de serviço, idade 1ª parição), derivados **em runtime** de `animais.status_reprodutivo` + `eventos_rebanho`, sem materialização.
2. **Zootécnicos/corte** — `lib/calculos/indicadores-rebanho.ts` (puro: GMD/arrobas/abate/categoria) + `rebanho-indicadores.ts` (alertas: partos, pesagens, vacas secas) + página `indicadores/` (composição, natalidade/mortalidade, charts).
3. **Leite** — KPIs **inline na page** (`leiteira/page.tsx:55-71`).

**Oportunidades de unificação**:
- Superfície única "Indicadores do Rebanho" com seções (Estrutura, Reprodução, Leite, Corte, Sanidade, Comparativos) é **viável** — os charts e cards já existem em `indicadores/components/`.
- Os KPIs leite inline devem virar serviço para alimentar a seção Leite da camada unificada (hoje não são reusáveis).
- Os alertas (sanidade, partos, pesagens) já estão como funções de query reusáveis — bons candidatos a "Resumo executivo".

**Obstáculos / dependências conceituais**:
- **Fontes de verdade divergentes**: reprodutivos usam estado desnormalizado em runtime; zootécnicos usam histórico (`pesos_animal`). Unificar a *apresentação* é fácil; unificar a *definição* (período, base de cálculo, materialização) exige decisão de produto antes da técnica.
- **Strings de categoria divergentes** (`'Novilha (Prenha)'` vs `'Novilha Prenha'`) afetam composição/estrutura — precisa virar contrato central antes de "Estrutura do rebanho" ser confiável.
- "Comparativos" (entre lotes/períodos) é citado como backlog bloqueado por critério de ordenação (PRD-1, T43) — **não maduro**.

---

# 9. Integrações externas

## 9.1 Pastagens
- **Estado atual**: `pastagens.ts` lê `animais` por lote/status (`:451-455`) e `pesos_animal` 90d (`:475-490`) para calcular UA. Consumidor direto, por tabela.
- **Risco de impacto**: Alto se mudarmos schema/colunas de `animais`/`pesos_animal`; baixo se só reorganizarmos UI/rotas.
- **Necessidade de fachada**: Sim — candidato a "serviço de UA/demanda" exposto pelo rebanho, consumido por pastagens.
- **Evidência**: `pastagens.ts:451-490`.

## 9.2 Silagem
- **Estado atual**: integração **fraca/indireta** — o cruzamento rebanho×silagem acontece dentro do Balanço; o link direto leite×silagem é **tipo morto** (`rebanho-leiteira.ts:38`, sem query de silos).
- **Risco de impacto**: Baixo (quase nada a quebrar).
- **Necessidade de fachada**: Não no curto prazo; a integração leite×silagem é **feature nova** da camada Planejamento.
- **Evidência**: PRD-1 §7.3; `rebanho-leiteira.ts` sem `movimentacoes_silo`.

## 9.3 Balanço Forrageiro
- **Estado atual**: `balanco-forrageiro.ts:162-183` (`getAnimaisAtivosPorCategoria`) lê `animais` por categoria p/ demanda de MS.
- **Risco de impacto**: Alto se mudarmos `categoria`/strings (que já são divergentes); a demanda depende do mapa `CONSUMO_MS_POR_CATEGORIA` casado por string.
- **Necessidade de fachada**: Sim — expor "demanda animal por categoria" como serviço do rebanho. **Pré-condição: estabilizar as strings de categoria.**
- **Evidência**: `balanco-forrageiro.ts:162-183`.

## 9.4 Dashboard principal
- **Estado atual**: `app/dashboard/page.tsx:142-191` faz 3 `SELECT` em `animais` + 1 em `eventos_sanitarios` para alertas, sem usar `lib/supabase/rebanho*`.
- **Risco de impacto**: Médio — quebra silenciosa se colunas mudarem.
- **Necessidade de fachada**: Desejável, não bloqueante.
- **Evidência**: `page.tsx:142-191`.

## 9.5 Calendário
- **Estado atual**: `calendario.ts` agrega `eventos_sanitarios`, `producoes_leiteiras`, `eventos_rebanho` (documentado; não reli linha a linha).
- **Risco de impacto**: Médio — depende dos nomes de tabela/colunas de eventos.
- **Necessidade de fachada**: Desejável.
- **Evidência**: PRD-1 §7.5 / CLAUDE.md.

## 9.6 Financeiro
- **Estado atual**: **inexistente** — venda/abate de animal não gera lançamento; sem `receita_id` em `eventos_rebanho`.
- **Risco de impacto**: Nenhum (não há contrato a quebrar).
- **Necessidade de adaptação**: É **feature nova** (lacuna), candidata à camada Integração — fora do escopo de refatoração estrutural.
- **Evidência**: PRD-1 §7.6.

---

# 10. Sequência recomendada

## Fase 0 — Estabilizar contratos (pré-refatoração)
- **Objetivo**: remover divergências que envenenam qualquer reorganização.
- **Entra**: unificar strings de categoria numa fonte única; confirmar/limpar código órfão da reprodução (grafo de imports); inventário explícito de quem lê tabelas do rebanho.
- **Não entra**: mover arquivos, mudar UI.
- **Risco**: Baixo. **Pré-requisitos**: confirmar causa do teste falho de categoria; mapear imports.

## Fase 1 — Casca de navegação (5 camadas como estrutura)
- **Objetivo**: entregar a árvore de navegação-alvo sem mover lógica.
- **Entra**: reativar/ajustar submenu do Sidebar (`Sidebar.tsx:230-238`); criar agrupamento de rotas refletindo Núcleo/Operação/Subdomínios/Indicadores; reposicionar entrypoints de massa do dropdown para "Operação".
- **Não entra**: extração da ficha, unificação de indicadores, fachadas.
- **Risco**: Baixo. **Pré-requisitos**: Fase 0 não é bloqueante aqui.

## Fase 2 — Extração da ficha do animal
- **Objetivo**: ficha enxuta (Núcleo) + links para subdomínios.
- **Entra**: converter ficha p/ RSC + busca por id; extrair `DesempenhoCorteContent` p/ componente compartilhado; transformar abas leite/sanidade em resumo + link.
- **Não entra**: mudança de banco; unificação de indicadores.
- **Risco**: Médio (regressão de abas/permissões). **Pré-requisitos**: Fase 1 (rotas-alvo existem para linkar).

## Fase 3 — Camada Operação (convergência de lançamentos)
- **Objetivo**: caminho único de lançamento + base de "agenda/pendências".
- **Entra**: unificar os 3 padrões de evento; absorver/alinhar a pesagem-em-lote do corte ao wizald; "Agenda do dia"/"Pendências" reusando alertas existentes.
- **Não entra**: mudar a RPC; novos tipos de evento.
- **Risco**: Médio-alto (offline + RPC). **Pré-requisitos**: Fase 2; preservar `ReproducaoSyncProvider` e store `eventos_rebanho`.

## Fase 4 — Indicadores unificados
- **Objetivo**: superfície única com seções por subdomínio.
- **Entra**: extrair KPIs leite inline p/ serviço; realocar `queryIndicadoresReprodutivos`; montar "Resumo executivo".
- **Não entra**: "Comparativos" (backlog bloqueado); redefinição de fontes de verdade sem decisão de produto.
- **Risco**: Médio. **Pré-requisitos**: Fase 0 (categorias); decisão sobre definições de KPI.

## Fase 5 — Fachadas e integração
- **Objetivo**: encapsular leitura externa; abrir caminho p/ leite×silagem e financeiro.
- **Entra**: fachada de "demanda animal / UA" consumida por pastagens e balanço; (opcional) integração financeira de venda/abate.
- **Não entra**: nada que mude o schema de `animais`/`pesos_animal` sem migrar os 4 consumidores juntos.
- **Risco**: Alto se acoplado a mudança de schema. **Pré-requisitos**: Fase 0 (categorias estáveis).

---

# 11. Pronto para SPEC?

**Sim, já dá para escrever a SPEC — porém apenas das Fases 0, 1 e 2.**

As Fases 0–2 (estabilização de contratos, casca de navegação, extração da ficha) estão **maduras**: o estado atual está mapeado com evidência direta, a navegação-alvo já existe prototipada, o core de mass-operations está confirmado como reaproveitável, e a ficha tem fronteiras claras de extração. Essas fases **não tocam banco, RPC, RLS nem contratos de dados** e preservam todas as operações em massa.

As Fases 3–5 **ainda não estão maduras para SPEC**: dependem de decisões de produto (definição/fonte de verdade dos indicadores, absorção da pesagem-em-lote, integração leite×silagem e financeiro) e de investigação adicional do offline e da RPC. Escrever SPEC dessas fases agora arriscaria especificar sobre premissas não confirmadas.

**Recomendação**: SPEC incremental — primeiro contrato de Fases 0–2; Fases 3–5 entram em SPECs subsequentes após as decisões de produto da seção 12.

---

# 12. Perguntas abertas (necessárias para fechar a SPEC das fases avançadas)

1. **Categorias**: pode-se consolidar as strings de categoria numa fonte única (TS + banco) já na Fase 0, aceitando a migração de dados/trigger? (Bloqueia integração balanço e seção "Estrutura" dos indicadores.)
2. **Indicadores**: a camada unificada deve **manter as duas fontes de verdade atuais** (reprodutivo desnormalizado vs zootécnico histórico) apenas apresentando juntas, ou padronizar definição/período/materialização? (Decisão de produto.)
3. **Pesagem em lote**: a `registrarPesagemLoteAction` do corte deve ser **absorvida** pelo wizard de eventos em lote, ou os dois caminhos coexistem? (Afeta Fase 3.)
4. **Operação do dia**: "Agenda do dia"/"Pendências" devem ser superfície nova reusando alertas existentes, ou há expectativa de tabela/estado de tarefa persistido? (Define escopo da Fase 3.)
5. **Fachada externa**: pastagens/balanço/dashboard/calendário podem passar a consumir um serviço do rebanho em vez de ler tabelas, ou a leitura direta deve permanecer por ora? (Define Fase 5.)
6. **Leite×silagem e Financeiro**: são desejados nesta refatoração (camada Integração) ou ficam como features separadas pós-refatoração?
7. **Offline**: há app operador que registra eventos de rebanho em campo? Confirmar o fluxo antes de mexer na camada Operação (preservar sync).
8. **Código órfão**: os 4 componentes legados + redirects da reprodução podem ser removidos na Fase 0?

---

# 13. Anexo de evidências

- **Core de mass-operations compartilhado**: `lib/supabase/rebanho.ts:406` (`analisarLinhas`), `:483` (`analisarCSV`), `:541` (`persistirAnimaisPreparados`), `:638` (`importarAnimaisCSV`), `:656` (`cadastrarAnimaisLote`).
- **Cadastro rápido (wizard + submit)**: `app/dashboard/rebanho/cadastro-rapido/CadastroRapidoClient.tsx:148-185` (`salvar`), `:123-141` (gerador de brincos); action `app/dashboard/rebanho/actions.ts:341` + schema `:330-335`.
- **CSV (dry-run + commit)**: `app/dashboard/rebanho/actions.ts:220` (`validarCSVAction`), `:277` (`importarCSVAction`); core `rebanho.ts:493,638`.
- **Lançamento em lote (RPC + allSettled)**: `app/dashboard/rebanho/eventos/lote/actions.ts:10,14,42,109`; tipos suportados `lib/types/rebanho-lote.ts:7-18`.
- **Pesagem-em-lote duplicada**: `app/dashboard/rebanho/corte/actions.ts:11` (`registrarPesagemLoteAction`) vs wizard genérico.
- **Ficha god-component**: `app/dashboard/rebanho/[id]/page.tsx:1` (`'use client'`), `:90-204` (corte inline), `:228-281` (fetch no mount), `:231-234` (`listAnimais({},1000,0)`+`listLotes(100,0)`), `:445-458` (7 abas).
- **Navegação-alvo já prototipada**: `components/Sidebar.tsx:78` (item único atual), `:230-238` (submenu comentado: Indicadores/Reprodução/Reprodutores/Parâmetros/Leiteira/Corte/Sanidade/Movimentações).
- **Entrypoints de operação dispersos**: `app/dashboard/rebanho/RebanhoClient.tsx:150-206` (3 dropdowns), `:252-258` (6 cards de acesso rápido).
- **Indicadores bifurcados**: `lib/supabase/rebanho-reproducao.ts:593,595,628` (`queryIndicadoresReprodutivos`); `lib/calculos/indicadores-rebanho.ts` (puros); `app/dashboard/rebanho/leiteira/page.tsx:55-71` (KPIs inline).
- **Corte = cálculo, não dado**: `app/dashboard/rebanho/corte/page.tsx` (deriva de `pesos_animal`/`peso_atual`); duplicação com `[id]/page.tsx:90-204`.
- **Strings de categoria divergentes**: `lib/types/rebanho.ts:43,67` (`'Novilha (Prenha)'`); replicação documentada no PRD-1 contra `indicadores-rebanho.ts:18`.
- **Contrato central `Animal`**: `lib/types/rebanho.ts:79-112` (inclui campos reprodutivos desnormalizados).
- **Consumidores externos diretos**: `lib/supabase/pastagens.ts:451-490` (UA), `lib/supabase/balanco-forrageiro.ts:162-183` (demanda), `app/dashboard/page.tsx:142-191` (alertas).
- **Guard só de plano**: `app/dashboard/rebanho/layout.tsx` (`requirePlano('rebanho')`).
- **Sync offline da reprodução**: `app/dashboard/rebanho/RebanhoClient.tsx:70-91` (hidratação); `components/rebanho/reproducao/ReproducaoSyncProvider.tsx`.
- **RPC ponto único de escrita**: `app/dashboard/rebanho/actions.ts:191` e `eventos/lote/actions.ts:109` (`registrar_evento_com_status`).
