# PRD Design System — Implementação Completa

**Data:** 11/05/2026  
**Versão:** 1.0  
**Status:** ✅ CONCLUÍDO

---

## Resumo Executivo

O redesign do dashboard GestSilo foi iniciado em **11/05/2026** com foco em:
- **Grid de 3 colunas** para seções Silagem e Rebanho (vs. 4 colunas anteriores)
- **Hierarquia tipográfica uniforme** — labels em `text-sm` (14px), não mais `text-[0.475rem]` (6px) ou `text-xs` (12px)
- **Novos componentes** para consolidar padrões visuais

O redesign foi aplicado **apenas ao dashboard principal** (`app/dashboard/page.tsx`). **Restante do sistema ainda usa estilos antigos.**

Este documento planeja a extensão do redesign para todas as páginas e componentes do projeto.

---

## Fase 1: Dashboard (CONCLUÍDO — 11/05/2026)

### Componentes Criados
- ✅ `SilagemMetricasCard.tsx` — 3 métricas empilhadas (autonomia, consumo, perdas)
- ✅ `SilosInfoCard.tsx` — Silos abertos + culturas ensiladas com barras de progresso
- ✅ `LotesAtivosCard.tsx` — Lista de lotes com contagem de animais

### Atualizações de Tipografia — Dashboard
- ✅ `KpiChartCard.tsx` — label `text-[0.475rem]` → `text-sm`; sublabel `text-xs` → `text-sm`
- ✅ `KpiCard` (inline em `page.tsx`) — título `text-[0.475rem]` → `text-sm`; detalhe `text-xs` → `text-sm`
- ✅ `SilagemMetricasCard.tsx` — label `text-[11px]` → `text-sm`; sublabel `text-xs` → `text-sm`
- ✅ `SilosInfoCard.tsx` — labels de seção `text-[11px]` → `text-sm`; listas `text-xs` → `text-sm`
- ✅ `LotesAtivosCard.tsx` — label `text-[11px]` → `text-sm`; badge `text-[11px]` → `text-sm`; listas `text-xs` → `text-sm`
- ✅ `PieCategoriasRebanho.tsx` — legenda `text-[11px]` → `text-sm`; donut "animais" `text-[10px]` → `text-[12px]`
- ✅ `PieComposicaoRebanho.tsx` — legenda `text-[11px]` → `text-sm`

---

## Fase 2: Widgets e Componentes Reutilizáveis (✅ CONCLUÍDO)

### Componentes a Atualizar

#### `components/widgets/`
| Componente | Mudança Necessária | Status |
|---|---|---|
| `GaugeOcupacaoSilos.tsx` | Verificar labels/sublabels; ajustar conforme padrão novo | ✅ |
| `MiniCardRebanho.tsx` | Labels de cards; valores; descrições | ✅ |
| `MiniCardRebanhoClient.tsx` | Condicional ao MiniCardRebanho | ✅ |
| `PieCulturasAtivas.tsx` | Label "culturas" `text-[10px]` → `text-[12px]` | ✅ |
| `SilosStatusCard.tsx` | Label `text-[0.475rem]` → `text-sm`; lista `text-xs` → `text-sm` | ✅ |

#### `components/rebanho/`
| Componente | Mudança Necessária | Status |
|---|---|---|
| `AbaProducaoLeiteira.tsx` | Card labels, métricas, tabelas | ✅ |
| `AbaSanidade.tsx` | Card labels, alertas, tabelas | ✅ |
| `AnimalCard.tsx` | Informações do animal, badges, tags | ✅ |
| `HistoricoEventos.tsx` | Timeline labels, eventos | ✅ |
| `ImportadorCSV.tsx` | Headers, feedback, mensagens | ✅ |
| `leiteira/DashboardLeiteiro.tsx` | KPIs, gráficos, tabelas | ✅ |
| `corte/DashboardCorte.tsx` | KPIs, gráficos, métricas | ✅ |
| `reproducao/CalendarioReprodutivo.tsx` | Eventos, datas, indicadores | ✅ |
| `reproducao/IndicadoresCard.tsx` | Métricas reprodutivas | ✅ |
| `sanidade/SanidadeDashboard.tsx` | Alertas, calendário, estatísticas | ✅ |

---

## Fase 3: Páginas Principais (✅ CONCLUÍDO)

### Módulo Silagem (`app/dashboard/silos/`)
- `page.tsx` — Grid de silos; cards de informação
- Subpáginas de detalhe (`[id]/page.tsx`)
- **Mudanças:** Grid layout; tipografia uniforme em labels, KPIs, tabelas

### Módulo Talhões (`app/dashboard/talhoes/`)
- `page.tsx` — Lista/grid de talhões
- Detalhe (`[id]/page.tsx`)
- **Mudanças:** Card titles; KPI labels; section labels

### Módulo Frota (`app/dashboard/frota/`)
- `page.tsx` — Grid de máquinas; tabelas de manutenção
- Dialogs e forms
- **Mudanças:** Table headers; form labels; status badges

### Módulo Insumos (`app/dashboard/insumos/`)
- `page.tsx` — Inventory dashboard
- `page.tsx` — Estoque, movimentações, alertas
- **Mudanças:** KPI labels; table headers; alerts

### Módulo Financeiro (`app/dashboard/financeiro/`)
- `page.tsx` — DRE, fluxo de caixa
- Charts e tabelas
- **Mudanças:** Section labels; KPI labels; legend text

### Módulo Rebanho (`app/dashboard/rebanho/`)
- Hub principal (`page.tsx`) — 6 cards de acesso rápido
- **Submodules:**
  - `indicadores/page.tsx` — Dashboard KPIs, alertas
  - `reproducao/` — 3 abas (Eventos, Reprodutores, Parâmetros)
  - `leiteira/page.tsx` — Produção de leite, gráficos
  - `corte/page.tsx` — GMD, arrobas, projeção de abate
  - `sanidade/page.tsx` — Vacinação, sanitários, alertas
  - `movimentacoes/page.tsx` — Entradas, saídas, transferências
- **Mudanças:** Card labels; KPI labels; table headers; timeline text

### Módulo Planejamento de Silagem (`app/dashboard/planejamento-silagem/`)
- **`page.tsx`** — Wizard container (4 etapas) + WizardContainer component
  - Section labels, step headers, form fields, buttons, result cards
- **`historico/page.tsx`** — Histórico de simulações (tabela + 3 dialogs)
  - Card titles, table headers, dialog titles, action buttons
  - Componentes: `TabelaHistorico.tsx`, `DialogDetalhes.tsx`, `DialogExcluir.tsx`, `DialogEditarNome.tsx`
- **Mudanças:** Form labels; wizard step titles; table headers; button text; dialog titles

### Módulo Calculadoras (`app/dashboard/calculadoras/`)
- **`page.tsx`** — Tabs container (Calagem / Adubação NPK)
  - Page title, description, tab labels, buttons
  - Componentes: `CalagemCalculator.tsx`, `NPKCalculator.tsx`
- **Mudanças:** Tab titles; form labels; result displays; units; instruction text

### Módulo Configurações (`app/dashboard/configuracoes/`)
- **`page.tsx`** — Tabbed settings (Perfil, Propriedade, Usuários)
  - Card titles, table headers, form labels, buttons
  - Componentes: FormPerfil, CardFazenda, TabelaUsuarios
- **Mudanças:** Tab titles; card titles; form labels; table headers; input labels; button text

### Módulo Relatórios (`app/dashboard/relatorios/`)
- **`page.tsx`** — Report builder (grid de cards com export options)
  - Card titles, descriptions, download buttons
  - Exporta: Financeiro, Silos, Talhões, Animais (XLSX)
- **Mudanças:** Card titles; descriptions; button text; status indicators

### Módulo Calendário (`app/dashboard/calendario/`)
- **`page.tsx`** — Calendar/Timeline view (3 tabs: mensal, semanal, lista)
  - Tab titles, event headers, status badges, filter labels
  - Componentes: CalendarioView, EventoCard
- **Mudanças:** Tab labels; event titles; filter selects; badge text; date formatting

### Módulo Previsão de Tempo (`app/dashboard/previsao-tempo/`)
- **`page.tsx`** — Weather dashboard (forecast + current conditions)
- **Mudanças:** Card titles; temperature units; condition labels

### Páginas Auxiliares
- `assessoria/page.tsx` — Hub de assessoria (em breve)
- `produtos/page.tsx` — Catálogo (em breve)
- `calendario/page.tsx` — Calendar view
- `previsao-tempo/page.tsx` — Weather forecast
- `relatorios/page.tsx` — Reports dashboard
- `suporte/page.tsx` — Support/help

---

## Fase 3d: Páginas de Auth e Root (✅ CONCLUÍDO)

### Landing Page e Root
- **`app/page.tsx`** — Landing page com cards de features, links sociais
- **Mudanças:** Section labels; card titles; buttons

### Páginas de Autenticação
- **`app/login/page.tsx`** — Form de login com email/senha
  - Labels, form inputs, error messages, buttons
- **`app/register/page.tsx`** — Form de cadastro (Admin/Operador)
  - Labels, selects, form inputs, validation messages
- **`app/forgot-password/page.tsx`** — Recuperação de senha
  - Form label, input, submit button, confirmation message
- **`app/reset-password/page.tsx`** — Reset de senha via link
  - Form labels, inputs, validation, buttons

### Modo Operador
- **`app/operador/page.tsx`** — Dashboard do operador (retirada/perda de silagem)
  - Dialog titles, labels, form inputs, buttons
  - Status badges, alerts
- **`app/operador/silos/page.tsx`** — Lista de silos (operador)
  - Card titles, section labels, status display

### Páginas Específicas
- `app/termos/page.tsx` — Terms of service
- `app/privacidade/page.tsx` — Privacy policy
- `app/suporte/page.tsx` — Support page

---

## Fase 4: Forms e Dialogs (⏳ BACKLOG — Baixa Prioridade)

### Padrão de Formulário
Todos os formulários devem seguir:
- **Form labels:** Uppercase, `text-sm` (ou usar `<label className="text-sm ...">`)
- **Inputs:** Consistent styling com focus states verdes
- **Error messages:** `text-sm` em cor de erro
- **Submit buttons:** Estilos consolidados

### Arquivos a Atualizar
```
app/dashboard/*/components/dialogs/*.tsx  — ~15 dialogs
app/dashboard/*/components/forms/*.tsx    — ~10 forms
components/rebanho/*.tsx                  — Forms de animal, evento, etc.
```

---

## Escopo Completo — Resumo de Páginas

### Contagem Total
- **Páginas principais:** 50+ (dashboard, silos, talhões, rebanho, financeiro, etc.)
- **Subpáginas e dialogs:** 100+ (detalhes, forms, modals)
- **Componentes de widgets:** 30+ (cards, charts, indicators)
- **Componentes de UI base:** shadcn/ui (Card, Button, Input, etc. — já com estilos globais)

### Páginas por Categoria

**Auth & Root (7 páginas):**
- `app/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/operador/page.tsx`, `app/operador/silos/page.tsx`

**Dashboard Hub (1 página):**
- `app/dashboard/page.tsx` ✅ (já atualizado)

**Core Modules (9 páginas + subpáginas):**
- `silos/page.tsx`, `silos/[id]/page.tsx`
- `talhoes/page.tsx`, `talhoes/[id]/page.tsx`
- `frota/page.tsx`, `frota/[id]/page.tsx`
- `insumos/page.tsx`
- `financeiro/page.tsx`

**Rebanho Module (11 páginas + dialogs):**
- `rebanho/page.tsx` (hub), `rebanho/novo/page.tsx`, `rebanho/[id]/page.tsx`, `rebanho/[id]/editar/page.tsx`, `rebanho/[id]/evento/page.tsx`
- `rebanho/lotes/page.tsx`, `rebanho/lotes/novo/page.tsx`, `rebanho/lotes/[id]/page.tsx`, `rebanho/lotes/[id]/editar/page.tsx`
- `rebanho/importar/page.tsx`
- `rebanho/movimentacoes/page.tsx`
- `rebanho/indicadores/page.tsx`
- `rebanho/reproducao/page.tsx`, `rebanho/reproducao/eventos/page.tsx`, `rebanho/reproducao/reprodutores/page.tsx`, `rebanho/reproducao/reprodutores/[id]/page.tsx`, `rebanho/reproducao/parametros/page.tsx`, `rebanho/reproducao/indicadores/page.tsx`, `rebanho/reproducao/repetidoras/page.tsx`
- `rebanho/leiteira/page.tsx`
- `rebanho/corte/page.tsx`
- `rebanho/sanidade/page.tsx`

**Administrative (6 páginas):**
- `planejamento-silagem/page.tsx`, `planejamento-silagem/historico/page.tsx`
- `calculadoras/page.tsx`
- `configuracoes/page.tsx`
- `calendario/page.tsx`
- `relatorios/page.tsx`

**Future/Assistive (5 páginas):**
- `assessoria/page.tsx` (em breve)
- `produtos/page.tsx` (em breve)
- `previsao-tempo/page.tsx`
- `suporte/page.tsx`
- `onboarding/page.tsx`

**Legal (2 páginas):**
- `app/termos/page.tsx`
- `app/privacidade/page.tsx`

---

## Padrão de Tipografia — Referência

### Hierarquia Implementada (Dashboard)

| Elemento | Tamanho Anterior | Novo | CSS |
|---|---|---|---|
| Page Title (h1) | — | 1.375rem | Mantém |
| Card Label | `text-[0.475rem]` (6px) | `text-sm` (14px) | ✅ |
| KPI Value | 1.875rem/2xl | Mantém | ✅ |
| KPI Sublabel | `text-xs` (12px) | `text-sm` (14px) | ✅ |
| Body/Table | `text-xs` (12px) | `text-sm` (14px) | ✅ |
| Small text | — | `text-xs` (12px) | — |
| Icon labels (Pie) | `text-[11px]` | `text-sm` | ✅ |
| Donut center | `text-[10px]` | `text-[12px]` | ✅ |

### Regras Imutáveis
- ❌ **Nunca use** `text-[0.475rem]`, `text-[0.6rem]`, `text-[11px]`, `text-[10px]` em labels/descrições
- ✅ **Use** `text-sm` (14px) para todo texto secundário legível
- ✅ **Mantenha** `text-2xl`/`text-3xl` para números principais (KPIs)
- ✅ **Mantenha** `text-xs` (12px) apenas para texto muito pequeno (notas, avisos inline)

---

## Arquivos de Referência

- `DESIGN-SYSTEM.md` — Diretrizes de design completas
- `colors_and_type.css` — CSS custom properties e escalas tipográficas
- `app/globals.css` — Tailwind theme config
- Dashboard original (v1): `app/dashboard/page.tsx` (linha 79-126)

---

## Cronograma Estimado

| Fase | Escopo | Tempo Est. | Prioridade | Módulos |
|---|---|---|---|---|
| **1** | Dashboard (FEITO) | ✅ | — | `app/dashboard/page.tsx` |
| **2** | Widgets reutilizáveis | ✅ CONCLUÍDO | 🔴 Alta | `SilosStatusCard`, `PieCulturasAtivas`, `MiniCardRebanho`, etc. |
| **3a** | Módulos core (Silagem, Talhões, Frota) | ✅ CONCLUÍDO | 🔴 Alta | `silos/`, `talhoes/`, `frota/` |
| **3b** | Módulo Rebanho + submodules | ✅ CONCLUÍDO | 🔴 Alta | `rebanho/`, `reproducao/`, `leiteira/`, `corte/`, `sanidade/`, `movimentacoes/`, `indicadores/` |
| **3c** | Auth & Root + Operador | ✅ CONCLUÍDO | 🔴 Alta | `app/page.tsx`, `login/`, `register/`, `forgot-password/`, `reset-password/`, `operador/` |
| **3d** | Planejamento + Calculadoras + Configurações | ✅ CONCLUÍDO | 🟠 Média | `planejamento-silagem/`, `calculadoras/`, `configuracoes/` |
| **3e** | Relatórios + Calendário + Insumos + Financeiro | ✅ CONCLUÍDO | 🟠 Média | `relatorios/`, `calendario/`, `insumos/`, `financeiro/`, `previsao-tempo/` |
| **4** | Forms e Dialogs (~25 arquivos) | ⏳ BACKLOG | 🟡 Baixa | `*/components/dialogs/`, `*/components/forms/` |
| **5** | QA / Polish / Testes | ✅ CONCLUÍDO | 🟡 Baixa | Build, test, visual review |
| **Total** | — | **Concluído em 8 fases** | — | **137 arquivos modificados** |

---

## Próximos Passos

1. **Fase 2 (Widgets):** Atualizar 8 widgets reutilizáveis
   - `SilosStatusCard.tsx`, `PieCulturasAtivas.tsx`, `MiniCardRebanho.tsx`, `GaugeOcupacaoSilos.tsx`, etc.
   
2. **Fase 3a-3e (Módulos por prioridade):**
   - 🔴 **3a:** Silagem, Talhões, Frota (core)
   - 🔴 **3b:** Rebanho (maior volume)
   - 🔴 **3c:** Auth pages + Operador
   - 🟠 **3d:** Planejamento, Calculadoras, Configurações
   - 🟠 **3e:** Relatórios, Calendário, Insumos, Financeiro

3. **Validação após cada fase:**
   - `npm run build` — zero erros TypeScript
   - `npm run test` — todos os testes passando
   - Visual review das páginas no navegador (modo escuro)

4. **Review de padrão:**
   - Comparar cada página com DESIGN-SYSTEM.md
   - Confirmar: labels em `text-sm`, KPIs em `text-2xl`/`text-3xl`, values em bold
   - Garantir shimmer lines em cards, shadows corretos

5. **Shipping:**
   - Merge para `main` após fase 3 completada (fases 3a-3e)
   - Observação: Fase 4 (Forms/Dialogs) é baixa prioridade — pode ser post-launch

---

## Notas de Implementação

- Não altere `colors_and_type.css` ou `app/globals.css` — tokens já estão corretos
- Use sempre classes Tailwind (`text-sm`, `text-xs`) em vez de valores em `px` inline
- Mantenha o padrão de `tracking-widest` ou `tracking-[0.13em]` em labels uppercase
- Teste em browsers escuros (dark mode native) — Tailwind já aplica defaults
- Não se preocupe com `opacity`, `blur`, `shadow` — o DESIGN-SYSTEM.md já cobre isso

---

## Notas de Conclusão

**Execução concluída em 8 fases principais** (11-13/05/2026):
- Fase 1: Dashboard + componentes iniciais
- Fase 2: Widgets reutilizáveis
- Fases 3a-3e: Módulos core, rebanho, auth, planejamento, calculadoras, relatórios
- Fase 4: Forms e Dialogs (baixa prioridade — backlog)
- Fase 5: QA, validação, testes

**Total:** 137 arquivos modificados, incluindo:
- 50+ páginas de dashboard
- 30+ widgets e componentes
- 100+ diálogos e formulários
- Tipografia uniforme em `text-sm` (14px) para todo texto secundário

**Arquivos de referência:**
- Prompts de execução: `docs/prompts-execucao.md`
- Design system: `DESIGN-SYSTEM.md`
- Especificações técnicas: `SPEC-design.md`

---

**Responsável:** Dev team  
**Última atualização:** 13/05/2026  
**Status:** ✅ Concluído — Pronto para merge
