# SPEC-rebanho345 — Refatoração Incremental do Módulo de Rebanho (Fases 3, 4 e 5)

> **Tipo**: contrato de execução. Esta SPEC é o documento que sessões futuras de implementação
> usarão para executar **exatamente** as Fases 3 (Operação), 4 (Indicadores) e 5
> (Fachadas/Integração) — sem ambiguidade de escopo.
> **Fontes obrigatórias**: `PRD-rebanho1.md` (estado atual), `PRD-rebanho2.md` (análise de impacto),
> `SPEC-rebanho012.md` (baseline das Fases 0–2, **concluída**), `docs/rebanho-consumidores-externos.md`
> (inventário da Fase 0), código atual do repositório, e a arquitetura-alvo de 5 camadas.
> **Baseline**: assume o estado **pós-Fase 2** como ponto de partida (ver §1.2). Não reabre nenhuma
> decisão encerrada nas Fases 0–2.
> **Restrição central**: nenhuma mudança de schema, RPC, RLS, trigger ou contrato de dados central
> já congelado, **exceto** onde esta SPEC justificar explicitamente por demanda de produto dos PRDs
> e marcar a mudança como aditiva e reversível (ver §4 e Fase 5).
> Data: 2026-06-30.

---

# 1. Contexto e objetivo

## 1.1 Onde chegamos

As Fases 0, 1 e 2 (SPEC-rebanho012) foram **concluídas** e estabilizaram a base:

- **Fase 0** consolidou as strings de categoria numa fonte única (`lib/constants/categorias-rebanho.ts`), removeu código órfão da reprodução, produziu o inventário de consumidores externos (`docs/rebanho-consumidores-externos.md`) e congelou os contratos centrais (`Animal`/`Lote`, `CSVValidacaoResult`/`CSVImportResult`, `ResultadoLote`, RPC `registrar_evento_com_status`). A suíte está verde (942 testes, 0 falhas).
- **Fase 1** entregou a casca de navegação (submenu de rebanho refletindo as camadas) e reposicionou os entrypoints de operações em massa, sem mover lógica.
- **Fase 2** enxugou a ficha do animal: busca por id (fim do fetch de 1000 animais), corte extraído para `components/rebanho/corte/DesempenhoCorteResumo.tsx` (compartilhado com `DashboardCorte`), Leite/Sanidade como resumo+link.

## 1.2 Baseline pós-Fase 2 (premissas desta SPEC)

Esta SPEC **assume como verdade** o estado atual do repositório:

1. Existe **fonte única de categorias** em `lib/constants/categorias-rebanho.ts`, espelhando o que o trigger grava (`'Novilha Prenha'`, sem parênteses).
2. Existe **componente de corte compartilhado** (`DesempenhoCorteResumo.tsx`) consumido por ficha e dashboard — corte é **cálculo, não dado**.
3. Existe **inventário de consumidores externos** com 4 entradas confirmadas: `pastagens.ts`, `balanco-forrageiro.ts`, `app/dashboard/page.tsx`, `calendario.ts`. O calendário **não** lê `producoes_leiteiras` (corrigido no inventário).
4. Existe um **bug latente pré-existente** registrado como pendência: `lib/types/pastagens.ts:142` (`FATORES_UA_POR_CATEGORIA`) e `lib/constants/balanco-forrageiro.ts:6` (`CONSUMO_MS_POR_CATEGORIA`) usam a chave `'Novilha (Prenha)'` que o banco **nunca grava** → animais `Novilha Prenha` caem no fallback. Esta SPEC o trata na **Fase 5** (§8.5).
5. Coexistem **duas pesagens-em-lote**: o wizard genérico (`eventos/lote/**` → RPC) e `app/dashboard/rebanho/corte/actions.ts:registrarPesagemLoteAction` (+ `components/rebanho/corte/FormRegistroPesagemLote.tsx`). A unificação é decisão da **Fase 3** (§6).
6. Existem **três padrões de "registrar evento"**: Padrão A legado (`[id]/evento/page.tsx`), RPC+`allSettled` (lote), dialogs Padrão B (reprodução).
7. A reprodução tem **sync offline dedicado** (`ReproducaoSyncProvider`, store `eventos_rebanho` no IndexedDB, hidratação em `RebanhoClient.tsx`).
8. **KPIs leiteiros são calculados inline** na página (`leiteira/page.tsx`), não em serviço reusável.
9. **Indicadores estão bifurcados** em duas famílias com fontes de verdade distintas: reprodutivos (`queryIndicadoresReprodutivos`, derivados em runtime de `animais.status_reprodutivo`) e zootécnicos (`lib/calculos/indicadores-rebanho.ts` + `rebanho-indicadores.ts`, derivados de `pesos_animal`).
10. **Rebanho não integra ao Financeiro**; a integração leite×silagem é **tipo morto** (`rebanho-leiteira.ts` sem query de silos).

## 1.3 Objetivo desta SPEC

Definir, com rigor de contrato de implementação, **somente** o que entra nas Fases 3, 4 e 5 da arquitetura-alvo de 5 camadas:

- **Fase 3 — Operação**: convergir os caminhos operacionais de rotina (lançamentos, eventos, operações em massa) e introduzir a superfície de "Operação do dia" (agenda/pendências) reusando alertas já calculados — **sem** quebrar a RPC nem o offline.
- **Fase 4 — Indicadores**: definir a estratégia única de indicadores do rebanho, tratando a divergência entre as duas famílias, com fontes de verdade, métricas e granularidades explícitas, extraindo KPIs inline para serviços.
- **Fase 5 — Fachadas/Integração**: encapsular a leitura externa do rebanho (pastagens, balanço, dashboard, calendário) atrás de uma fachada de domínio, corrigir o bug latente de categoria nesses consumidores, e abrir caminho (decididamente, conforme PRDs) para integração financeira de venda/abate e leite×silagem.

Tudo **incremental, revisável e reversível**, preservando comportamento onde já houver fluxo estabilizado, evitando Big Bang.

---

# 2. Escopo geral das Fases 3, 4 e 5

## 2.1 Visão de alto nível

| Fase | Camada | Natureza dominante | Toca banco? |
|---|---|---|---|
| **3** | Operação | Convergência de UI/fluxo + superfície nova orquestrando peças existentes | **Não** (RPC e schema intactos) |
| **4** | Indicadores | Extração para serviços + superfície de apresentação unificada | **Não** (apenas leitura; sem materialização nesta SPEC) |
| **5** | Fachadas/Integração | Encapsulamento de leitura externa + features novas decididas pelos PRDs | **Aditivo e justificado** (ver §4.3) |

## 2.2 Ordenação e razão

A ordem **3 → 4 → 5** é obrigatória e segue a sequência recomendada do PRD-2 §10:

- **Fase 3** depende da casca (Fase 1) e da ficha enxuta (Fase 2), ambas prontas. Entrega o caminho único de lançamento que a Fase 4 e a Fase 5 assumem estável.
- **Fase 4** depende da estabilização de categorias (Fase 0, pronta) e de **decisão de produto** sobre fontes de verdade dos KPIs (consolidada nesta SPEC em §7.2). Extrai os serviços de indicadores que a Fase 5 também pode reaproveitar.
- **Fase 5** depende de categorias estáveis (Fase 0) e do inventário (Fase 0), e se beneficia dos serviços de indicadores da Fase 4 como primeiros candidatos a entrar na fachada.

---

# 3. O que entra e o que não entra em cada fase

## 3.1 Fase 3 — Operação

**Entra**: convergência dos 3 padrões de registro de evento para um caminho único (passando pela RPC); unificação das duas pesagens-em-lote; reposicionamento de cadastro rápido / CSV / lançamento em lote como camada Operação coesa; superfície "Operação do dia" (agenda + pendências) **derivada de alertas existentes, sem persistência nova**.

**Não entra**: novos tipos de evento; alteração da RPC; tabela/estado de tarefa persistido; mudança no offline da reprodução; qualquer mudança de schema.

## 3.2 Fase 4 — Indicadores

**Entra**: extração dos KPIs leiteiros inline para serviço; realocação de `queryIndicadoresReprodutivos` para a camada de indicadores; superfície única "Indicadores do Rebanho" com seções por subdomínio; "Resumo executivo" reusando alertas.

**Não entra**: materialização de indicadores no banco (views/tabelas de agregação); redefinição da fonte de verdade reprodutiva (continua desnormalizada por decisão consolidada — §7.2); "Comparativos" entre lotes/períodos (backlog bloqueado, PRD-1 T43); integração de silagem no cálculo de eficiência (é Fase 5).

## 3.3 Fase 5 — Fachadas/Integração

**Entra**: fachada de domínio do rebanho (`lib/rebanho/facade` ou equivalente) expondo "demanda animal por categoria" e "UA por lote"; migração dos consumidores externos para a fachada; correção do bug latente de categoria (`'Novilha (Prenha)'`); **decisão consolidada** sobre integração Financeira de venda/abate e sobre leite×silagem (ver §8.2 — o que é decidido vs. o que fica como feature pós-refatoração).

**Não entra (salvo decisão explícita)**: mudança de schema em `animais`/`pesos_animal`/`eventos_rebanho` sem migração coordenada dos 4 consumidores; reescrita das funções de cálculo; mudança de RLS.

---

# 4. Princípios da refatoração

1. **Preservar comportamento estabilizado.** Todo fluxo que funciona hoje (mass operations, reprodução, offline, dashboards) permanece funcional e com resultado idêntico ao usuário, salvo melhoria explicitamente especificada.
2. **A RPC `registrar_evento_com_status` é o ponto único de escrita de eventos** — não pode ser duplicada, contornada nem alterada em nenhuma das 3 fases.
3. **Mudanças pequenas, revisáveis e reversíveis.** Cada passo é um PR isolado, rotulado por tipo (navegação / composição / extração / serviço / contrato / integração). Sem Big Bang.
4. **Serviço antes de superfície.** Em Indicadores e Fachadas, extrair primeiro a lógica para um serviço puro/testável, e só depois plugar a UI. Nunca o inverso.
5. **Fachada encapsula leitura, não muda dados.** A Fase 5 introduz uma camada de leitura; ela **não** redefine schema. Mudança de schema, se necessária, é aditiva, justificada e migra todos os consumidores no mesmo PR.
6. **Decisão de produto fora dos PRDs vira pendência, não código.** Onde os PRDs não decidem, esta SPEC registra como decisão em aberto (§17) — não implementa por suposição.
7. **Aderir aos padrões do projeto** (CLAUDE.md): RSC nas páginas de dashboard, `select` explícito, Padrão B em formulários, design system, sem `any`, sem suprimir `exhaustive-deps`, `fazenda_id` nunca em INSERT.

## 4.1 Tipos de mudança (rótulo obrigatório por PR)

- **navegação** — menu/rota/agrupamento.
- **composição de tela** — o que a página monta.
- **extração** — mover/encapsular lógica ou UI existente sem reescrever.
- **serviço** — nova função pura/de dados que centraliza cálculo antes disperso.
- **contrato** — tipo/assinatura/string.
- **integração** — novo vínculo entre módulos (Financeiro, silagem, fachada).

## 4.2 Regra do "caminho único" (Fase 3)

Convergir os 3 padrões de evento **não** significa reescrever cada formulário num único componente. Significa: **todo registro de evento individual deve, ao final, persistir pela mesma rota lógica** (a Server Action que chama a RPC `registrar_evento_com_status`), eliminando o caminho legado Padrão A que monta payload de forma divergente. A camada de **apresentação** pode permanecer especializada por subdomínio (dialogs de reprodução continuam); o que converge é a **escrita**.

## 4.3 Quando a Fase 5 pode tocar banco

A Fase 5 só altera banco se um item **decidido pelos PRDs** exigir, e nesse caso:
- a mudança é **aditiva** (nova coluna `receita_id` em `eventos_rebanho`, p.ex.), nunca destrutiva;
- vem com migração e atualização de `types/supabase.ts` via `npm run db:types`;
- migra todos os consumidores afetados no mesmo PR;
- é registrada como decisão consolidada (§16) com referência ao PRD.
A integração Financeira e a leite×silagem são tratadas em §8.2 — a SPEC define explicitamente quais entram como contrato e quais ficam como feature pós-refatoração.

---

# 5. Arquitetura-alvo destas fases

## 5.1 Árvore consolidada (Fases 3–5)

```
Rebanho (/dashboard/rebanho)
│
├── NÚCLEO  (estabilizado nas Fases 0–2)
│   ├── Inventário / Animais · Lotes · Movimentações · Ficha (enxuta)
│
├── OPERAÇÃO  ◀── FASE 3
│   ├── Operação do dia ............. agenda + pendências (NOVA superfície, sem persistência)
│   │     └── deriva de: alertas de sanidade, partos, pesagens, ocupações, secagem
│   ├── Lançamentos
│   │     ├── Evento individual ..... caminho ÚNICO via Server Action → RPC
│   │     └── Evento em lote ........ wizard genérico (absorve pesagem-em-lote do corte)
│   └── Cadastros em massa
│         ├── Cadastro rápido ....... core compartilhado (intacto)
│         └── Importação CSV ........ core compartilhado (intacto)
│
├── SUBDOMÍNIOS TÉCNICOS  (reposicionados nas Fases 1–2; lógica intacta)
│   ├── Reprodução (sync offline preservado) · Leiteira · Corte · Sanidade
│
├── INDICADORES  ◀── FASE 4
│   └── Indicadores do Rebanho ...... superfície ÚNICA com seções:
│         ├── Resumo executivo (alertas)
│         ├── Estrutura / Composição (categorias estáveis)
│         ├── Reprodução  ← serviço realocado (queryIndicadoresReprodutivos)
│         ├── Leite        ← serviço NOVO (extraído do inline)
│         ├── Corte        ← cálculo puro existente
│         └── Sanidade     ← alertas existentes
│
└── INTEGRAÇÃO / FACHADA  ◀── FASE 5
      └── lib/rebanho/facade (ou equivalente) — serviço de leitura do domínio
            ├── demandaAnimalPorCategoria()   ← consumido por Balanço Forrageiro
            ├── uaPorLote()                    ← consumido por Pastagens
            ├── (opcional decidido) alertasRebanhoParaDashboard()
            └── (opcional decidido) eventosRebanhoParaCalendario()

       Integrações de produto (decisão §8.2):
            ├── Financeiro ← venda/abate gera receita  (CONTRATO, se decidido)
            └── Leite × Silagem ← eficiência alimentar  (feature, condicional)
```

## 5.2 Mapa de dependências entre fases

```
Fase 0–2 (PRONTAS)
   │  fonte única de categorias ─────────────┐
   │  ficha enxuta + corte compartilhado      │
   ▼                                          ▼
Fase 3 (Operação)                        Fase 4 (Indicadores)
   │  caminho único de escrita                │  serviços de indicadores extraídos
   │  pesagem-em-lote unificada               │  (leite inline → serviço;
   │  "Operação do dia" (deriva alertas) ◀────┤   reprodutivo realocado)
   ▼                                          ▼
   └──────────────► Fase 5 (Fachadas/Integração) ◄──────────────┘
        consome alertas (Fase 3) e serviços de indicadores (Fase 4)
        encapsula os 4 consumidores externos atrás da fachada
        corrige bug latente de categoria
        integra Financeiro / Leite×Silagem (conforme §8.2)
```

**Regras de dependência**:
- Fase 4 **não** depende de Fase 3 estar 100% concluída, mas a seção "Operação do dia" (Fase 3) **reusa** os mesmos alertas que o "Resumo executivo" (Fase 4) — recomenda-se extrair os alertas como serviço **uma vez** (na Fase 3 ou 4, o que vier primeiro) e ambos consumirem.
- Fase 5 depende de Fase 4 apenas para **reaproveitar** serviços (não bloqueante): a fachada pode ser introduzida com `demandaAnimalPorCategoria`/`uaPorLote` independentemente.

---

# 6. Fase 3 — Camada Operação

## 6.1 Objetivo

Tornar a operação diária do rebanho um caminho coeso: **(a)** convergir a escrita de eventos para uma rota lógica única (a RPC), eliminando o Padrão A legado; **(b)** unificar as duas pesagens-em-lote; **(c)** introduzir uma superfície "Operação do dia" (agenda + pendências) **derivada de alertas já calculados**, sem nenhuma tabela/estado novo. Tudo preservando o offline da reprodução e a RPC como ponto único de escrita.

## 6.2 Papel da camada Operação

A camada Operação é a **superfície de escrita e rotina** do rebanho: onde o produtor registra o que aconteceu (eventos, pesagens, cadastros em massa) e vê o que precisa fazer (pendências do dia). Ela **não** é dona de regra de negócio nova — orquestra as Server Actions e a RPC existentes e apresenta alertas que outros lugares já computam.

## 6.3 O que entra

### 6.3.1 Convergência da escrita de evento individual (decisão consolidada)
- **Decisão D-3.1**: **haverá convergência da escrita**, não da apresentação. O caminho legado Padrão A em `app/dashboard/rebanho/[id]/evento/page.tsx` deve passar a persistir pela **mesma Server Action que chama a RPC** `registrar_evento_com_status` usada pelo lote, eliminando a montagem de payload divergente.
- A UI do evento individual é **migrada de Padrão A (Controller + `<Label>`) para Padrão B** (shadcn `Form`), conforme CLAUDE.md, mas **sem** alterar os campos coletados nem a semântica.
- Os **dialogs de reprodução (Padrão B)** permanecem como apresentação especializada; só se garante que a escrita deles também flui pela RPC (já flui via `reproducao/actions.ts` → RPC — confirmar e documentar, não reescrever).
- **Resultado**: três apresentações podem coexistir; **uma única rota de escrita**.

### 6.3.2 Unificação da pesagem-em-lote (decisão consolidada)
- **Decisão D-3.2**: a `registrarPesagemLoteAction` (`corte/actions.ts`) é **absorvida** pelo caminho do wizard genérico de eventos em lote (que já suporta `pesagem`, `rebanho-lote.ts:7-18`). O entrypoint de pesagem-em-lote do corte passa a **invocar o fluxo do wizard** (ou a mesma Server Action `criarEventosLoteAction`), eliminando a duplicação.
- `FormRegistroPesagemLote.tsx` é **reaproveitado como apresentação** (se a UX de corte for desejada) mas submete pela rota unificada; ou é substituído pelo wizard. A escolha de apresentação é de implementação, desde que a **escrita seja única** e o resultado parcial (`Promise.allSettled` + `ResultadoLote`) seja preservado.
- **Restrição**: nenhuma regressão na UX de pesagem em lote do corte; os mesmos campos e o mesmo resultado parcial.

### 6.3.3 "Operação do dia" — agenda + pendências (superfície nova, sem persistência)
- **Decisão D-3.3**: "Operação do dia" é **superfície de leitura derivada**, **sem tabela/estado de tarefa persistido**. É uma agregação read-only de pendências que já existem como alertas:
  - vacinações/doses próximas e vencidas (`rebanho-sanitario.ts` — `listAlertasVacinacao`/`listAlertasSanitarios`);
  - partos próximos, pesagens em atraso, vacas a secar (`rebanho-indicadores.ts`);
  - secagem/diagnóstico próximos (kanban da reprodução, `queryIndicadoresReprodutivos`).
- A superfície apresenta esses itens como uma lista priorizada com **link direto para a ação** (registrar evento / pesagem / sanitário) — reusando os entrypoints da Operação.
- **Não há** persistência de "feito/não feito", snooze, ou atribuição de tarefa nesta SPEC (seria estado novo → fora de escopo, vira pendência §17).

### 6.3.4 Reposicionamento dos cadastros em massa
- Cadastro rápido e CSV permanecem **intactos** (core compartilhado), apenas firmados sob a camada Operação na navegação (já reposicionados na Fase 1). Nenhuma mudança de contrato.

## 6.4 Relação com reprodução e offline

- **Preservação obrigatória**: `ReproducaoSyncProvider`, store `eventos_rebanho` no IndexedDB e a hidratação em `RebanhoClient.tsx` **não são tocados**. A convergência de escrita (D-3.1) deve garantir que eventos registrados offline continuem enfileirando e sincronizando pela mesma store.
- Se a convergência do evento individual passar a usar a RPC offline-aware, validar que o caminho offline (enqueueRpc) continua idêntico ao do lote. **Não** introduzir um segundo mecanismo de fila.

## 6.5 Relação com schema/RPC/RLS

- **Nenhuma alteração.** A RPC continua o ponto único; nenhum novo tipo de evento; nenhuma coluna nova. Se a convergência exigir um campo que a RPC não aceita, isso é **sinal de bloqueio** → registrar pendência, não estender a RPC nesta fase.

## 6.6 O que NÃO entra

- ❌ Tabela/estado de tarefa, snooze, atribuição, "concluir pendência" persistido.
- ❌ Novos tipos de evento ou alteração da RPC.
- ❌ Mudança no offline da reprodução.
- ❌ Reescrita dos dialogs de reprodução.
- ❌ Mudança de schema.

## 6.7 Dependências

- Fases 1 e 2 (prontas) — rotas e ficha enxuta existem.
- Serviço de alertas: se ainda inline, extrair como **serviço** (compartilhado com a Fase 4 — §5.2).

## 6.8 Riscos

| Risco | Mitigação |
|---|---|
| **R-3.1** Convergir a escrita e regredir um campo do evento individual | Mapear 1:1 os campos do Padrão A → payload da RPC antes de migrar; teste de paridade de payload |
| **R-3.2** Unificar pesagem-em-lote e perder o resultado parcial do corte | Caminho unificado mantém `Promise.allSettled` + `ResultadoLote`; smoke de pesagem com 1 erro forçado |
| **R-3.3** Quebrar o offline ao trocar a rota de escrita do evento individual | Reusar o mesmo `enqueueRpc`/store; testar registro offline + reconexão |
| **R-3.4** "Operação do dia" virar fonte de verdade divergente dos alertas | É só apresentação dos mesmos serviços de alerta; nenhuma nova regra |
| **R-3.5** Migração Padrão A→B introduzir bug de validação | Zod schema idêntico; `<FormMessage />`; testar submit válido/ inválido |

## 6.9 Critérios de aceite

- [ ] O evento individual persiste pela **mesma rota lógica** do lote (RPC); o caminho legado Padrão A de escrita não existe mais.
- [ ] A UI do evento individual segue Padrão B; mesmos campos e semântica.
- [ ] Há **um único** caminho de pesagem-em-lote; `registrarPesagemLoteAction` foi absorvida/eliminada como rota duplicada.
- [ ] "Operação do dia" lista pendências derivadas dos alertas existentes, com link para ação, **sem** persistência de estado.
- [ ] Offline da reprodução intacto (provider + store + hidratação).
- [ ] Nenhuma mudança de schema/RPC/RLS/trigger.
- [ ] `npm run build` e `npm run test` verdes; testes ≥ baseline (942).

## 6.10 Testes/validação

- Unit: paridade de payload Padrão A→RPC (mesmo input ⇒ mesmo registro).
- Unit: agregador de pendências (entrada = alertas mock ⇒ lista priorizada esperada).
- Smoke: registrar evento individual online e offline; reconectar e confirmar sync.
- Smoke: pesagem em lote (3 animais, 1 erro) pelo caminho unificado ⇒ 2 entram, erro com `brinco`.
- Smoke: "Operação do dia" mostra as mesmas pendências que sanidade/indicadores/reprodução.

## 6.11 Arquivos e áreas impactadas

| Arquivo/Path | Papel atual | Ação | Tipo |
|---|---|---|---|
| `app/dashboard/rebanho/[id]/evento/page.tsx` | Evento individual (Padrão A) | Migrar UI p/ Padrão B; escrita via Server Action→RPC | composição + contrato |
| `app/dashboard/rebanho/actions.ts` | Server Actions gerais | Garantir/expor a Server Action única de escrita de evento | extração/serviço |
| `app/dashboard/rebanho/eventos/lote/actions.ts` | `criarEventosLoteAction` (RPC) | Reaproveitar como rota única de lote (inclui pesagem) | manter |
| `app/dashboard/rebanho/corte/actions.ts` | `registrarPesagemLoteAction` | Absorver no wizard / redirecionar p/ rota única | extração |
| `components/rebanho/corte/FormRegistroPesagemLote.tsx` | UI pesagem-em-lote do corte | Reaproveitar submetendo pela rota única (ou substituir pelo wizard) | composição |
| (nova) superfície "Operação do dia" | — | Página/aba derivando alertas existentes | composição |
| (novo/extraído) serviço de alertas | inline em `rebanho-indicadores.ts`/`rebanho-sanitario.ts` | Consolidar leitura de pendências reusável | serviço |
| `components/rebanho/reproducao/*` | Dialogs Padrão B + sync | **Não tocar** lógica; confirmar escrita via RPC | preservar |

---

# 7. Fase 4 — Indicadores

## 7.1 Objetivo

Entregar uma **superfície única "Indicadores do Rebanho"** com seções por subdomínio, alimentada por **serviços** (não por cálculo inline), tratando explicitamente a bifurcação das duas famílias de indicadores. Sem materializar nada no banco e sem redefinir a fonte de verdade reprodutiva.

## 7.2 Tratamento da divergência das duas famílias (decisão consolidada)

O PRD-2 §12.2 deixou em aberto se a camada unificada deve **manter as duas fontes de verdade** ou padronizar. Esta SPEC **decide**:

- **Decisão D-4.1**: **mantêm-se as duas fontes de verdade atuais**, apenas apresentadas juntas numa superfície única. Não há redefinição de período/base/materialização nesta fase.
  - **Indicadores reprodutivos** continuam derivados em runtime de `animais.status_reprodutivo` + `eventos_rebanho` (via `queryIndicadoresReprodutivos`).
  - **Indicadores zootécnicos/corte** continuam derivados de `pesos_animal`/`peso_atual` (via `lib/calculos/indicadores-rebanho.ts`).
  - **Indicadores leiteiros** passam de inline para um **serviço** com a mesma definição atual (sem mudar a fórmula dos KPIs de `leiteira/page.tsx`).
- **Razão**: padronizar definição/materialização é decisão de produto com risco alto e sem demanda madura nos PRDs (PRD-2 §8 "obstáculos conceituais"). A unificação **de apresentação** é o ganho maduro; a unificação **de definição** vira pendência (§17).
- **Decisão D-4.2**: a seção "Estrutura/Composição" usa a **fonte única de categorias** (Fase 0) como base — só agora ela é confiável.

## 7.3 Estratégia de indicadores

### 7.3.1 Fontes de verdade (explícitas)
| Família | Fonte de verdade | Materialização | Serviço |
|---|---|---|---|
| Reprodução | `animais.status_reprodutivo` + `eventos_rebanho` | runtime | `queryIndicadoresReprodutivos` (realocado) |
| Estrutura/Composição | `animais.categoria` (fonte única) + `status` | runtime | serviço de composição (novo/extraído) |
| Leite | `producoes_leiteiras` + `lactacoes` | runtime | **serviço novo** (extraído do inline) |
| Corte | `pesos_animal` + `peso_atual` | runtime (cálculo puro) | `lib/calculos/indicadores-rebanho.ts` (existente) |
| Sanidade | `eventos_sanitarios` | runtime (alertas) | `rebanho-sanitario.ts` (existente) |

### 7.3.2 Granularidade e dimensões (decisão consolidada)
- **Decisão D-4.3**: a superfície apresenta indicadores nas dimensões **já suportadas pelos serviços existentes**, sem inventar agregações novas:
  - **por animal** — ficha (já existe; fora desta superfície);
  - **por categoria** — composição/estrutura e demanda;
  - **por lote** — onde o serviço já agrega por lote (corte/pesagem); **"Comparativos entre lotes" NÃO entra** (backlog bloqueado, PRD-1 T43);
  - **por sistema (leite/corte)** — seções separadas, conforme `tipo_rebanho`;
  - **por período** — os indicadores que já têm janela (reprodução 120d, leite 30d) mantêm sua janela atual; **não** se cria seletor de safra nesta fase.
- **Decisão D-4.4**: **safra/período produtivo customizável NÃO entra** — é dimensão nova sem demanda madura. Vira pendência (§17).

### 7.3.3 O que vira serviço, o que permanece inline, o que é derivado na UI
- **Vira serviço** (extração obrigatória): KPIs leiteiros (hoje inline em `leiteira/page.tsx`). Deve virar função reusável (ex.: `getIndicadoresLeiteiros(...)` em `lib/supabase/rebanho-leiteira.ts` ou serviço de cálculo puro sobre dados já buscados).
- **Realocado para a camada de indicadores**: `queryIndicadoresReprodutivos` permanece em `rebanho-reproducao.ts` (não se move arquivo à força), mas a **superfície de indicadores** passa a consumi-lo diretamente; a página de reprodução continua a usá-lo também.
- **Permanece como está**: `lib/calculos/indicadores-rebanho.ts` (puro, testado) e os alertas de `rebanho-indicadores.ts`/`rebanho-sanitario.ts`.
- **Derivado na UI**: apenas composição/formatação leve; nenhum cálculo de KPI novo na camada de apresentação.

## 7.4 Impacto com pastagens, silagem e balanço

- **Decisão D-4.5**: a Fase 4 **não** integra silagem nos indicadores. A "eficiência alimentar leite/kg MS" permanece **fora** (é Fase 5 / feature condicional — §8.2). A seção Leite mostra os KPIs atuais sem o cruzamento com silos.
- Pastagens/balanço **não** são afetados pela Fase 4 (são consumidores; a Fase 4 só lê o rebanho para apresentar).

## 7.5 O que NÃO entra

- ❌ Materialização de indicadores (views/tabelas de agregação) no banco.
- ❌ Redefinição da fonte de verdade reprodutiva (D-4.1).
- ❌ "Comparativos entre lotes/períodos" (backlog bloqueado).
- ❌ Seletor de safra/período produtivo customizável (D-4.4).
- ❌ Eficiência alimentar leite×silagem (Fase 5/feature).

## 7.6 Dependências

- Fase 0 (categorias estáveis) — **pronta**, requisito de D-4.2.
- Decisão D-4.1 (consolidada nesta SPEC) — desbloqueia a apresentação unificada.
- Recomendado: o serviço de alertas (Fase 3) reusado no "Resumo executivo".

## 7.7 Riscos

| Risco | Mitigação |
|---|---|
| **R-4.1** Extrair KPI leite e mudar o número exibido | Serviço replica a fórmula inline exata; teste de paridade contra os valores atuais |
| **R-4.2** Apresentar juntas duas famílias com janelas diferentes e confundir o usuário | Rotular explicitamente a janela/base de cada seção na UI |
| **R-4.3** Recharts sem `next/dynamic ssr:false` | Seguir o padrão do projeto (DashboardClient/IndicadoresClient como referência) |
| **R-4.4** Duplicar a página de indicadores existente | Reusar `indicadores/components/*` (cards e charts já existem) |

## 7.8 Critérios de aceite

- [ ] Existe uma superfície única "Indicadores do Rebanho" com seções: Resumo executivo, Estrutura/Composição, Reprodução, Leite, Corte, Sanidade.
- [ ] Os KPIs leiteiros vêm de um **serviço reusável**, não de cálculo inline na page; os números são idênticos aos atuais.
- [ ] A seção Estrutura usa a fonte única de categorias.
- [ ] Reprodução consome `queryIndicadoresReprodutivos` (sem duplicar a lógica).
- [ ] Nenhuma materialização no banco; nenhuma mudança de fonte de verdade.
- [ ] "Comparativos" e "safra" ausentes (registrados como pendência).
- [ ] `npm run build` e `npm run test` verdes; testes ≥ baseline.

## 7.9 Testes/validação

- Unit: serviço de KPIs leite — paridade com os valores inline atuais (mesmos dados ⇒ mesmos KPIs).
- Unit: serviço de composição por categoria usando a fonte única.
- Smoke: abrir "Indicadores do Rebanho"; conferir cada seção contra a fonte (reprodução vs página de reprodução; corte vs DashboardCorte; leite vs DashboardLeiteiro).
- Smoke: export PDF/CSV de indicadores continua funcionando (`gerarPdfIndicadoresRebanho`, `rebanho-builder`).

## 7.10 Arquivos e áreas impactadas

| Arquivo/Path | Ação | Tipo |
|---|---|---|
| `app/dashboard/rebanho/leiteira/page.tsx` | Extrair KPIs inline → serviço | serviço |
| `lib/supabase/rebanho-leiteira.ts` | Receber `getIndicadoresLeiteiros` (ou puro em `lib/calculos`) | serviço |
| `app/dashboard/rebanho/indicadores/**` | Tornar a superfície única com seções; reusar cards/charts | composição |
| `lib/supabase/rebanho-reproducao.ts` (`queryIndicadoresReprodutivos`) | Consumido pela superfície (sem mover à força) | manter/extração |
| `lib/calculos/indicadores-rebanho.ts` | Reusar (corte/composição) | manter |
| `rebanho-indicadores.ts` / `rebanho-sanitario.ts` | Reusar alertas no Resumo executivo | manter |
| `lib/pdf/gerarPdfIndicadoresRebanho.ts`, `lib/relatorios/rebanho-builder.ts` | Garantir compatibilidade | preservar |

---

# 8. Fase 5 — Fachadas / Integração

## 8.1 Objetivo

Encapsular a **leitura externa** do rebanho atrás de uma fachada de domínio, migrar os 4 consumidores externos para ela, **corrigir o bug latente de categoria** nesses consumidores, e consolidar (conforme PRDs) as integrações de produto: Financeiro (venda/abate → receita) e leite×silagem.

## 8.2 Decisões consolidadas sobre integrações de produto

| Integração | Demanda nos PRDs | Decisão desta SPEC |
|---|---|---|
| **Fachada de leitura** (UA/demanda) | PRD-2 §9.1/9.3 — "Sim, candidato a serviço" | **ENTRA como contrato** (núcleo da Fase 5) |
| **Correção bug categoria** nos consumidores | Inventário Fase 0 — pendência explícita | **ENTRA** (parte da fachada) |
| **Financeiro (venda/abate → receita)** | PRD-1 §7.6, PRD-2 §9.6 — "feature nova, lacuna" | **CONDICIONAL** — só entra se o produto confirmar; especificada aqui como contrato **aditivo** pronto para execução, mas **gated** por decisão (§17 Q1) |
| **Leite × Silagem (eficiência alimentar)** | PRD-1 §7.3, PRD-2 §9.2 — "feature nova, tipo morto" | **NÃO entra como refatoração**; fica como feature pós-refatoração (pendência §17 Q2) |

> **Princípio**: a Fase 5 entrega a **fachada + correção de bug** com certeza. As duas integrações de produto são tratadas como **contratos opcionais gated**: a SPEC os deixa prontos para implementar, mas a execução depende de decisão de produto registrada — não se implementa por suposição (Princípio §4.6).

## 8.3 O que entra — Fachada de domínio

### 8.3.1 Estratégia (decisão consolidada)
- **Decisão D-5.1**: introduzir uma **fachada de leitura** do rebanho (ex.: `lib/rebanho/facade.ts` ou `lib/supabase/rebanho-facade.ts`) que expõe funções de domínio estáveis para consumidores externos:
  - `getDemandaAnimalPorCategoria(supabase)` — encapsula `getAnimaisAtivosPorCategoria` (hoje em `balanco-forrageiro.ts`).
  - `getUAPorLote(supabase, loteId, areaHa)` — encapsula `calcularUADoLote` (hoje em `pastagens.ts`).
  - (opcional decidido) `getAlertasRebanhoParaDashboard(supabase)` e `getEventosRebanhoParaCalendario(supabase, range)`.
- **Padrão**: fachada = **adapter de leitura** (não muda dados, não tem estado). Mantém `select` explícito, `fazenda_id` via RLS, e devolve **tipos estáveis** (não o shape cru das tabelas).
- **Limite consulta direta vs contrato**: após a Fase 5, os 4 consumidores externos **não leem mais tabelas do rebanho diretamente** — passam pela fachada. Dentro do módulo rebanho, a consulta direta às próprias tabelas permanece permitida.

### 8.3.2 Migração dos consumidores (incremental, um por PR)
- `lib/supabase/balanco-forrageiro.ts` → usa `getDemandaAnimalPorCategoria`.
- `lib/supabase/pastagens.ts` → usa `getUAPorLote`.
- `app/dashboard/page.tsx` → (opcional decidido) usa a fachada para alertas/composição.
- `lib/supabase/calendario.ts` → (opcional decidido) usa a fachada para eventos do rebanho.
- **Cada migração preserva o resultado**: mesmos números de UA/demanda/alertas antes e depois.

### 8.3.3 Correção do bug latente de categoria
- **Decisão D-5.2**: ao migrar pastagens e balanço para a fachada, **corrigir** as chaves `'Novilha (Prenha)'` em `lib/types/pastagens.ts:142` (`FATORES_UA_POR_CATEGORIA`) e `lib/constants/balanco-forrageiro.ts:6` (`CONSUMO_MS_POR_CATEGORIA`) para `'Novilha Prenha'`, idealmente consumindo `lib/constants/categorias-rebanho.ts`.
- **Atenção**: esta é uma **mudança de comportamento intencional** — animais `Novilha Prenha` deixam de cair no fallback e passam a usar o fator correto (UA 0.50 / consumo 8.5). Deve ser **destacada no PR** e validada com smoke de Balanço/Pastagens (os números **mudam**, e é o esperado).

## 8.4 O que entra — Financeiro (CONTRATO GATED — §17 Q1)

Especificação pronta, execução condicionada à decisão de produto:
- **Aditivo**: coluna `receita_id uuid REFERENCES financeiro(id) ON DELETE SET NULL` em `eventos_rebanho` (migração + `npm run db:types`).
- Quando evento de **venda/abate** com valor > 0: criar lançamento em `financeiro` (categoria `'Rebanho'`, tipo `'Receita'`, `referencia_tipo = 'Evento Rebanho'`), preencher `eventos_rebanho.receita_id`; rollback atômico no padrão dos demais módulos (silos/produtos).
- Cleanup: deletar evento com `receita_id` → deletar a receita antes.
- **Não** alterar a RPC de escrita de evento sem necessidade; se a RPC precisar setar `receita_id`, isso é extensão **aditiva** da RPC, justificada por esta integração — registrar como decisão (§16) no momento da execução.

## 8.5 O que entra — Leite × Silagem (NÃO entra como refatoração)

- **Decisão D-5.3**: a eficiência alimentar leite/kg MS **não** é implementada nesta refatoração. O campo `eficiencia_alimentar_litros_por_kg_ms` permanece como está (tipo morto) ou é removido como limpeza **somente** se confirmado sem uso. A implementação real é feature pós-refatoração (pendência §17 Q2), pois depende de query de consumo de silagem por lote/categoria que não existe.

## 8.6 O que NÃO entra

- ❌ Mudança de schema em `animais`/`pesos_animal`/`eventos_rebanho` que não seja a coluna aditiva `receita_id` (e só se Financeiro for decidido).
- ❌ Migração dos consumidores externos sem preservar os números (exceto a correção intencional de categoria, destacada).
- ❌ Implementação de leite×silagem.
- ❌ Mudança de RLS.

## 8.7 Dependências

- Fase 0 (categorias estáveis + inventário) — **pronta**.
- Fase 4 (serviços de indicadores) — **recomendada** para reaproveitar nos itens opcionais (alertas/composição), não bloqueante para UA/demanda.
- Decisão de produto §17 Q1 (Financeiro) antes de executar §8.4.

## 8.8 Riscos

| Risco | Mitigação |
|---|---|
| **R-5.1** Fachada mudar números de UA/demanda silenciosamente | Migração 1 consumidor/PR com teste de paridade (mesmo input ⇒ mesmo output) **antes** da correção de categoria |
| **R-5.2** Correção de categoria mudar resultados e ser confundida com regressão | Isolar a correção em PR próprio, **após** a migração paritária; documentar que os números mudam de propósito; smoke de Balanço/Pastagens com valores esperados |
| **R-5.3** Financeiro tocar a RPC de evento | Extensão aditiva e justificada; rollback atômico; testar venda→receita e delete→cleanup |
| **R-5.4** Acoplar o dashboard/calendário à fachada e quebrar o `Promise.all` | Itens opcionais; migrar só se o resultado for idêntico; manter shape esperado pelo `Promise.all` |
| **R-5.5** Blast radius oculto (consumidor não inventariado) | Reconfirmar o inventário (Fase 0) com grep antes de fechar a fachada |

## 8.9 Critérios de aceite

- [ ] Existe uma fachada de leitura do rebanho com `getDemandaAnimalPorCategoria` e `getUAPorLote` (mínimo).
- [ ] Balanço Forrageiro e Pastagens consomem a fachada; **antes** da correção de categoria os números são idênticos; **após** a correção, os números de `Novilha Prenha` mudam para os fatores corretos (validado).
- [ ] O bug latente `'Novilha (Prenha)'` está corrigido nos dois mapas.
- [ ] Nenhum consumidor externo (mínimo: pastagens, balanço) lê tabelas do rebanho diretamente para UA/demanda.
- [ ] (Se Financeiro decidido) venda/abate gera receita com rastreabilidade bidirecional e rollback atômico; senão, especificação registrada como pendência.
- [ ] Leite×silagem **não** foi implementado; registrado como pendência.
- [ ] `npm run build` e `npm run test` verdes; testes ≥ baseline.

## 8.10 Testes/validação

- Unit: paridade da fachada (UA/demanda) contra a implementação atual, **antes** da correção de categoria.
- Unit: após a correção, `Novilha Prenha` usa fator 0.50 (UA) / 8.5 (consumo).
- Smoke: Balanço Forrageiro e Pastagens com rebanho contendo `Novilha Prenha` — números mudam conforme esperado.
- (Se Financeiro) Unit/smoke: venda gera receita; delete remove a receita; rollback em falha.

## 8.11 Arquivos e áreas impactadas

| Arquivo/Path | Ação | Tipo |
|---|---|---|
| (novo) `lib/rebanho/facade.ts` (ou `lib/supabase/rebanho-facade.ts`) | Fachada de leitura do domínio | serviço/contrato |
| `lib/supabase/balanco-forrageiro.ts` | Consumir `getDemandaAnimalPorCategoria` | integração |
| `lib/supabase/pastagens.ts` | Consumir `getUAPorLote` | integração |
| `lib/types/pastagens.ts:142` | Corrigir chave `'Novilha (Prenha)'`→`'Novilha Prenha'` | contrato (bugfix) |
| `lib/constants/balanco-forrageiro.ts:6` | Corrigir chave `'Novilha (Prenha)'`→`'Novilha Prenha'` | contrato (bugfix) |
| `app/dashboard/page.tsx` | (opcional decidido) consumir fachada | integração |
| `lib/supabase/calendario.ts` | (opcional decidido) consumir fachada | integração |
| `docs/rebanho-consumidores-externos.md` | Atualizar: consumidores agora via fachada | documentação |
| (gated) `supabase/migrations/*` + `eventos_rebanho` | (se Financeiro) coluna aditiva `receita_id` | integração (aditivo) |
| (gated) `app/dashboard/rebanho/movimentacoes/actions.ts` | (se Financeiro) criar/limpar receita | integração |

---

# 9. Estratégia de implementação por passos

Ordem obrigatória entre fases; dentro de uma fase, passos são PRs separados, pequenos e reversíveis.

## 9.1 Fase 3 (Operação)
- **P3.1** — Extrair o **serviço de pendências/alertas** consolidado (reusável por "Operação do dia" e pelo "Resumo executivo" da Fase 4). *(serviço)*
- **P3.2** — Migrar a **UI** do evento individual de Padrão A → Padrão B, sem mudar campos. *(composição)*
- **P3.3** — Convergir a **escrita** do evento individual para a Server Action única → RPC; remover montagem de payload legada. *(contrato)*
- **P3.4** — Unificar a **pesagem-em-lote**: `registrarPesagemLoteAction` passa a usar a rota única; preservar resultado parcial. *(extração)*
- **P3.5** — Criar a superfície **"Operação do dia"** consumindo P3.1, com links de ação. *(composição)*
- **Sinal de pronto**: smoke de evento online/offline + pesagem em lote + paridade de payload + build/test verdes.

## 9.2 Fase 4 (Indicadores) — pode iniciar em paralelo após P3.1
- **P4.1** — Extrair **KPIs leiteiros** inline → serviço; teste de paridade. *(serviço)*
- **P4.2** — Extrair/garantir **serviço de composição por categoria** (fonte única). *(serviço)*
- **P4.3** — Montar a **superfície única** "Indicadores do Rebanho" com seções, reusando cards/charts existentes e os serviços (leite, reprodução, corte, sanidade, composição) + Resumo executivo (P3.1). *(composição)*
- **P4.4** — Garantir export PDF/CSV compatível com a nova superfície. *(preservar)*
- **Sinal de pronto**: cada seção bate com sua fonte (reprodução/corte/leite) + build/test verdes.

## 9.3 Fase 5 (Fachadas/Integração) — após Fase 4 (recomendado)
- **P5.1** — Criar a **fachada** `getDemandaAnimalPorCategoria` + `getUAPorLote` espelhando a lógica atual (sem corrigir categoria ainda). *(serviço)*
- **P5.2** — Migrar **balanço** para a fachada (paridade). *(integração)*
- **P5.3** — Migrar **pastagens** para a fachada (paridade). *(integração)*
- **P5.4** — **Corrigir o bug de categoria** nos dois mapas (PR isolado, números mudam de propósito). *(contrato/bugfix)*
- **P5.5** — (opcional decidido) migrar dashboard/calendário para a fachada. *(integração)*
- **P5.6** — (gated §17 Q1) integração **Financeira** de venda/abate. *(integração aditiva)*
- **Sinal de pronto**: paridade antes da correção; números esperados após; build/test verdes.

## 9.4 Rollback / reversibilidade
- Cada passo é um PR isolado → revert direto.
- P5.4 (correção de categoria) é o único passo que **muda números de propósito** — isolado e destacado para revert limpo se necessário.
- P5.6 (Financeiro) é gated e aditivo → revertível sem afetar a fachada.

## 9.5 Dependências entre passos
- P3.5 e P4.3 dependem de P3.1 (serviço de alertas).
- P4.3 depende de P4.1/P4.2 (serviços).
- P5.2/P5.3 dependem de P5.1 (fachada existe).
- P5.4 depende de P5.2/P5.3 (consumidores já na fachada, paridade provada).
- P5.6 depende da decisão §17 Q1.

---

# 10. Arquivos e áreas afetadas (consolidado)

| Arquivo/Path | Fase | Ação | Tipo |
|---|---|---|---|
| (novo) serviço de pendências/alertas | 3 | Consolidar leitura de pendências | serviço |
| `app/dashboard/rebanho/[id]/evento/page.tsx` | 3 | Padrão A→B; escrita via RPC | composição+contrato |
| `app/dashboard/rebanho/actions.ts` | 3 | Server Action única de escrita | serviço |
| `app/dashboard/rebanho/corte/actions.ts` | 3 | Absorver pesagem-em-lote | extração |
| `components/rebanho/corte/FormRegistroPesagemLote.tsx` | 3 | Submeter pela rota única | composição |
| (nova) "Operação do dia" | 3 | Superfície derivada | composição |
| `app/dashboard/rebanho/leiteira/page.tsx` | 4 | KPIs inline → serviço | serviço |
| `lib/supabase/rebanho-leiteira.ts` | 4 | `getIndicadoresLeiteiros` | serviço |
| `app/dashboard/rebanho/indicadores/**` | 4 | Superfície única | composição |
| `lib/supabase/rebanho-reproducao.ts` | 4 | Consumido pela superfície | manter |
| `lib/calculos/indicadores-rebanho.ts` | 4 | Reuso | manter |
| (novo) `lib/rebanho/facade.ts` | 5 | Fachada de leitura | serviço/contrato |
| `lib/supabase/balanco-forrageiro.ts` | 5 | Consumir fachada | integração |
| `lib/supabase/pastagens.ts` | 5 | Consumir fachada | integração |
| `lib/types/pastagens.ts:142` | 5 | Bugfix categoria | contrato |
| `lib/constants/balanco-forrageiro.ts:6` | 5 | Bugfix categoria | contrato |
| `app/dashboard/page.tsx`, `lib/supabase/calendario.ts` | 5 | (opcional) fachada | integração |
| `eventos_rebanho` + migrations | 5 (gated) | `receita_id` aditivo | integração |
| RPC `registrar_evento_com_status` | 3–5 | **Não tocar** (salvo extensão aditiva gated do Financeiro) | preservar |
| `ReproducaoSyncProvider` + store `eventos_rebanho` | 3 | **Não tocar** | preservar |

---

# 11. Critérios gerais de aceite (SPEC inteira)

- [ ] A RPC `registrar_evento_com_status` permanece o ponto único de escrita; só pode ser estendida de forma **aditiva e gated** (Financeiro decidido).
- [ ] Mass operations (cadastro rápido, CSV, lançamento em lote) permanecem 100% funcionais com resultado parcial e `Promise.allSettled`.
- [ ] O offline da reprodução (provider + store + hidratação) permanece intacto.
- [ ] Fase 3: existe um único caminho de escrita de evento e uma única pesagem-em-lote; "Operação do dia" sem persistência.
- [ ] Fase 4: superfície única de indicadores alimentada por serviços; KPIs leite idênticos aos atuais; duas fontes de verdade mantidas.
- [ ] Fase 5: fachada de leitura ativa; pastagens/balanço via fachada; bug de categoria corrigido (números mudam de propósito); Financeiro/leite×silagem conforme decisão.
- [ ] Nenhuma mudança não-aditiva de schema/RLS.
- [ ] `npm run build` e `npm run test` verdes; testes ≥ baseline (942), sem novas regressões.
- [ ] Cada mudança entregue como PR pequeno, reversível, rotulado por tipo.

---

# 12. Smoke tests obrigatórios

**Operação (Fase 3)**
1. Registrar evento individual (online): persiste e aparece no histórico.
2. Registrar evento individual (offline) → reconectar → sincroniza pela store `eventos_rebanho`.
3. Paridade de payload: mesmo input no caminho novo gera o mesmo registro que o caminho antigo.
4. Pesagem em lote (3 animais, 1 erro forçado) pela rota única → 2 entram, erro com `brinco`.
5. "Operação do dia" lista as mesmas pendências de sanidade/indicadores/reprodução, com links que abrem a ação correta.

**Indicadores (Fase 4)**
6. "Indicadores do Rebanho": seção Reprodução == página de reprodução; Corte == DashboardCorte; Leite == DashboardLeiteiro.
7. KPIs leite via serviço == valores inline anteriores (mesmos dados).
8. Export PDF/CSV de indicadores continua gerando.

**Fachada/Integração (Fase 5)**
9. Antes da correção de categoria: Balanço/Pastagens com a fachada == números atuais.
10. Após a correção: rebanho com `Novilha Prenha` muda UA/consumo para os fatores corretos (0.50 / 8.5).
11. (Se Financeiro) venda/abate gera receita; delete remove a receita; rollback em falha.

**Regressão transversal (todas as fases)**
12. Mass operations (cadastro rápido, CSV, lote) inalteradas.
13. Reprodução offline (provider/store/hidratação) inalterada.

---

# 13. Riscos e mitigação (consolidado)

| Risco | Fase | Mitigação |
|---|---|---|
| Convergência de escrita regride campo do evento | 3 | Mapa 1:1 + teste de paridade de payload |
| Pesagem-em-lote unificada perde resultado parcial | 3 | Manter `allSettled` + `ResultadoLote`; smoke 4 |
| Quebra do offline ao trocar rota de escrita | 3 | Reusar `enqueueRpc`/store; smoke 2 |
| "Operação do dia" diverge dos alertas | 3 | Só apresentação dos mesmos serviços |
| Extração de KPI leite muda número | 4 | Serviço replica fórmula exata; teste de paridade; smoke 7 |
| Duas famílias com janelas diferentes confundem | 4 | Rotular janela/base por seção |
| Fachada muda UA/demanda silenciosamente | 5 | Paridade 1 consumidor/PR antes de qualquer correção; smoke 9 |
| Correção de categoria confundida com regressão | 5 | PR isolado, após paridade; documentar mudança intencional; smoke 10 |
| Financeiro tocar a RPC | 5 | Extensão aditiva justificada; rollback atômico |
| Tocar acidentalmente RPC/contrato congelado | todas | Contratos congelados (Fase 0) + revisão por tipo de mudança |

---

# 14. Fora de escopo

Explicitamente **não** entram nesta SPEC:
- Materialização de indicadores no banco (views/tabelas de agregação).
- Redefinição da fonte de verdade reprodutiva (continua desnormalizada — D-4.1).
- "Comparativos entre lotes/períodos" (backlog bloqueado, PRD-1 T43).
- Seletor de safra/período produtivo customizável.
- Implementação de eficiência alimentar leite×silagem.
- Estado persistido de tarefa/agenda (snooze, conclusão, atribuição) na "Operação do dia".
- Qualquer mudança não-aditiva de schema, RLS ou trigger.
- Reescrita das funções puras de cálculo ou dos dialogs de reprodução.

---

# 15. Decisões já consolidadas pelos PRDs (e por esta SPEC)

- **DC-1** A RPC `registrar_evento_com_status` é o ponto único de escrita de eventos (PRD-2 §4, §6.3). Não duplicar, não contornar.
- **DC-2** A camada de dados já é modular por subdomínio; a arquitetura-alvo espelha separação que já existe no backend (PRD-2 §15).
- **DC-3** Corte é **cálculo, não dado** — não há entidade própria (PRD-1 §5, PRD-2 §8). Unificar corte é eliminar duplicação de UI sobre cálculo compartilhado (já feito na Fase 2).
- **DC-4** O lançamento em lote genérico já suporta `pesagem`/`transferencia_lote`/`protocolo_hormonal`/`aspiracao_opu`/`transferencia_embriao` (PRD-2 §2.6). "Protocolo/TE em lote" já existem.
- **DC-5** Há duas pesagens-em-lote a unificar (PRD-2 §2.5, §6.3). → **D-3.2** decide a absorção.
- **DC-6** Há três padrões de "registrar evento" e a Operação pede convergência (PRD-2 §2.11). → **D-3.1** decide convergir a **escrita**, não a apresentação.
- **DC-7** Indicadores têm duas famílias com fontes de verdade distintas (PRD-2 §2.7, §8). → **D-4.1** decide mantê-las, unificando só a apresentação.
- **DC-8** Quatro consumidores externos leem o rebanho direto; candidatos a fachada (PRD-2 §9). → **D-5.1** decide a fachada de leitura.
- **DC-9** Bug latente de categoria nos consumidores externos é pendência da Fase 5 (inventário Fase 0). → **D-5.2** decide corrigir na fachada.
- **DC-10** Financeiro e leite×silagem são **features novas**, não refatoração (PRD-1 §7.3, §7.6; PRD-2 §9.2, §9.6). → **§8.2** as trata como contrato gated / feature pós-refatoração.

---

# 16. Decisões consolidadas nesta SPEC (que os PRDs deixaram em aberto)

| ID | Decisão | Referência PRD-2 §12 |
|---|---|---|
| **D-3.1** | Convergir a **escrita** de evento (não a apresentação) para a Server Action única → RPC; migrar evento individual Padrão A→B | Q4 (escopo da Operação) |
| **D-3.2** | Absorver `registrarPesagemLoteAction` no wizard de eventos em lote (caminho único) | Q3 (pesagem em lote) |
| **D-3.3** | "Operação do dia" é superfície **derivada de alertas, sem persistência** de tarefa | Q4 |
| **D-4.1** | Indicadores: **manter as duas fontes de verdade**, unificar só a apresentação | Q2 (indicadores) |
| **D-4.3/4.4** | Granularidade limitada às dimensões já suportadas; sem comparativos e sem safra | — |
| **D-5.1** | Introduzir **fachada de leitura** do rebanho; consumidores externos migram para ela | Q5 (fachada) |
| **D-5.2** | Corrigir o bug latente de categoria na migração à fachada (mudança intencional) | Q1 (categorias) |
| **D-5.3** | Leite×silagem **não** entra na refatoração | Q6 |

---

# 17. Decisões ainda em aberto (gates antes/durante execução)

> Estas **não** bloqueiam o início da Fase 3 nem da Fase 4. Bloqueiam apenas os passos indicados.

1. **Q1 — Integração Financeira (venda/abate → receita)**: o produto confirma que entra nesta refatoração? *Gate de **P5.6**.* Se sim, a coluna `receita_id` é aditiva e a extensão da RPC (se necessária) é justificada e registrada (§16). Se não, fica especificada como feature futura.
2. **Q2 — Leite × Silagem**: feature pós-refatoração; requer query de consumo de silagem por lote/categoria que não existe. *Não tem gate nesta SPEC* (D-5.3). Depende de SPEC própria.
3. **Q3 — Itens opcionais da fachada (dashboard/calendário)**: migrar `app/dashboard/page.tsx` e `calendario.ts` para a fachada agora, ou deixar leitura direta? *Gate de **P5.5*** — decisão de oportunidade, sem bloquear P5.1–P5.4.
4. **Q4 — Apresentação do evento individual**: após convergir a escrita (D-3.1), manter a página `[id]/evento` como apresentação especializada ou redirecioná-la para o fluxo do wizard? Decisão de UX que não muda a escrita.
5. **Q5 — Materialização futura de indicadores**: se/quando padronizar definição/período (D-4.1 hoje mantém runtime), exigirá SPEC própria com decisão de produto sobre janelas e materialização.
6. **Q6 — Estado de tarefa na "Operação do dia"**: se o produto quiser conclusão/snooze/atribuição persistidos, é tabela/estado novo → SPEC própria (fora desta).

---

# 18. Pendências para SPECs futuras

1. **Materialização e padronização de indicadores** (período/base/safra) — após decisão de produto (Q5).
2. **Comparativos entre lotes/períodos** (PRD-1 T43) — desbloquear o critério de ordenação primeiro.
3. **Eficiência alimentar leite×silagem** — feature nova, depende de query de consumo de silagem por lote/categoria (Q2).
4. **Integração Financeira de venda/abate** — se não decidida no Q1, vira SPEC própria.
5. **"Operação do dia" com estado persistido** (conclusão/snooze/atribuição) — tabela nova (Q6).
6. **Consolidação definitiva de categorias no banco/trigger** com migração de dados (herdada da SPEC-rebanho012 §15) — se o produto quiser unificar também o lado banco.
7. **Limpeza do tipo morto** `eficiencia_alimentar_litros_por_kg_ms` se confirmado sem uso.
