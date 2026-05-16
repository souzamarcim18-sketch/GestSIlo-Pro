# SPEC de Implementação — Redesign GestSilo (Fases 2-5)

**Data:** 11/05/2026  
**Versão:** 1.0 (atualizada para incluir Talhões + Frota)  
**Origem:** PRD-design.md (v1.0)  
**Status:** Pronto para Execução  
**Total de Arquivos a Atualizar:** 140 (11 widgets + 11 silos + 18 talhões + 13 frota + 85 rebanho)

---

## 📋 Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Tabela de Conversão de Tipografia (Mapeamento Reverso)](#tabela-de-conversão)
3. [Pré-requisitos](#pré-requisitos)
4. [Inventário de Arquivos](#inventário-de-arquivos)
5. [Mapa de Componentes Compartilhados](#mapa-de-componentes-compartilhados)
6. [Ordem de Execução (Fases)](#ordem-de-execução)
7. [Especificações por Arquivo](#especificações-por-arquivo)
8. [Critérios de DONE por Fase](#critérios-de-done-por-fase)
9. [Riscos e Pontos de Atenção](#riscos-e-pontos-de-atenção)
10. [Regras Invioláveis](#regras-invioláveis)

---

## Resumo Executivo

O redesign do GestSilo foi iniciado em 11/05/2026 com a atualização da Fase 1 (Dashboard principal). Esta SPEC detalha as Fases 2-5, cobrindo:

- **Fase 2:** 11 widgets reutilizáveis
- **Fase 3a:** 11 silos + 18 talhões + 13 frota = 42 arquivos (módulos core)
- **Fase 3b:** 85 componentes + páginas do módulo Rebanho
- **Fase 3c:** Páginas de Auth e Root (fora de escopo desta SPEC)
- **Fase 3d:** Planejamento, Calculadoras, Configurações (fora de escopo)
- **Fase 3e:** Financeiro, Insumos, Calendário, Relatórios, Tempo (fora de escopo)
- **Fase 4:** Forms e Dialogs (baixa prioridade — post-launch)
- **Fase 5:** QA, Polish, Validação

**Escopo desta SPEC:** Fases 2, 3a, 3b (140 arquivos)

### Mudança Principal
Unificação da hierarquia tipográfica: todos os **labels secundários, descriptions, badges, table headers, section labels** mudam de `text-[0.475rem]` / `text-xs` → `text-sm` (14px), tornando o texto legível e alinhado com padrões web atuais.

---

## Tabela de Conversão de Tipografia (Mapeamento Reverso)

| Classe Atual | Nova Classe | Aplicável a | Tamanho | Observação |
|---|---|---|---|---|
| `text-[0.475rem]` | `text-sm` | Labels secundários, section labels, KPI labels | 6px → 14px | Aumenta significativamente; sempre usar `uppercase tracking-[0.13em]` |
| `text-[0.6rem]` | `text-sm` | Labels menores (captions) | 7.5px → 14px | Usar apenas quando legibilidade é crítica |
| `text-[11px]` | `text-sm` | Labels de cards, badges, nomes de sections | 11px → 14px | Padroniza com design system |
| `text-[10px]` (donut center) | `text-[12px]` | Números no centro de gráficos (pie/donut) | 10px → 12px | Pequeno mas legível |
| `text-xs` (labels/sublabels) | `text-sm` | Descrições em cards, detalhes de KPI | 12px → 14px | Sobe um passo na escala |
| `text-xs` (small text) | **PRESERVAR** | Notas inline, avisos, timestamps, helper text | 12px | Permanece 12px — nenhuma alteração |
| `text-2xl` / `text-3xl` | **PRESERVAR** | KPIs principais, números grandes, valores monetários | 1.5rem / 1.875rem | Nunca alterar — núcleo do design |
| Shimmer lines | **PRESERVAR** | `::before` element em cards | — | Mantém `1px linear-gradient(90deg, transparent, rgba(255,255,255,.055), transparent)` |
| Box shadows | **PRESERVAR** | Cards, buttons, KPI cards | — | Sem alteração; usar vars CSS existentes |

### Regras de Aplicação
- ✅ Sempre use classes Tailwind (`text-sm`, `text-xs`), nunca valores hardcoded `px` inline
- ✅ Labels UPPERCASE devem ter `tracking-[0.13em]` ou `tracking-widest`
- ✅ KPI values mantêm `font-black` (weight 900) e negative letter-spacing
- ✅ `text-xs` permanece **apenas** em notas muito pequenas (timestamps, helpers) — tudo mais sobe para `text-sm`

---

## Pré-requisitos

Antes de começar qualquer fase:

- [ ] Branch `redesign/design-system` está sincronizado com `main`
- [ ] `npm run build` roda sem erros TypeScript
- [ ] `npm run test` passa todos os 646+ testes
- [ ] `npm run lint` retorna 0 warnings/errors
- [ ] Nenhum arquivo `.env`, `.env.local`, `next.config.ts`, `turbo.json`, `colors_and_type.css`, `globals.css` foi alterado
- [ ] `CLAUDE.md` foi revisado e mantido atualizado

---

## Inventário de Arquivos

**Total: 140 arquivos distribuídos em 6 categorias**

### Categoria 1: Widgets Reutilizáveis (11 arquivos)
Localização: `components/widgets/`

| # | Arquivo | Fase | Tipo | Atualização Necessária |
|---|---|---|---|---|
| 1 | `GaugeOcupacaoSilos.tsx` | 2 | Widget | Labels dos ticks, sublabel de capacidade |
| 2 | `KpiChartCard.tsx` | 2 | Widget | Label, sublabel, chart wrapper |
| 3 | `LotesAtivosCard.tsx` | 2 | Widget | Card title, section labels, list items |
| 4 | `MiniCardRebanho.tsx` | 2 | Widget | Card title, metrics labels, badges |
| 5 | `MiniCardRebanhoClient.tsx` | 2 | Widget | Condicional ao MiniCardRebanho |
| 6 | `PieCategoriasRebanho.tsx` | 2 | Widget | Legend text, donut center label |
| 7 | `PieComposicaoRebanho.tsx` | 2 | Widget | Legend text, percentage labels |
| 8 | `PieCulturasAtivas.tsx` | 2 | Widget | Legend text, labels |
| 9 | `SilagemMetricasCard.tsx` | 2 | Widget | Section labels, metric descriptions |
| 10 | `SilosInfoCard.tsx` | 2 | Widget | Section headers, list labels, badges |
| 11 | `SilosStatusCard.tsx` | 2 | Widget | Card title, status labels, badges |

---

### Categoria 2: Componentes Rebanho (48 arquivos)
Localização: `components/rebanho/`

| # | Arquivo | Fase | Tipo | Atualização Necessária |
|---|---|---|---|---|
| 12 | `AbaProducaoLeiteira.tsx` | 3b | Component | Card headers, KPI labels, table headers |
| 13 | `AbaSanidade.tsx` | 3b | Component | Card headers, alert labels, badges |
| 14 | `AnimaisList.tsx` | 3b | Component | Table headers, status labels |
| 15 | `AnimalCard.tsx` | 3b | Component | Card titles, info labels, badges |
| 16 | `AnimalFiltros.tsx` | 3b | Component | Filter labels, select labels |
| 17 | `AnimalForm.tsx` | 3b | Form | Form labels, input helpers |
| 18 | `EventoDialog.tsx` | 3b | Dialog | Dialog title, section labels |
| 19 | `EventoForm/MorteForm.tsx` | 3b | Form | Form labels, descriptions |
| 20 | `EventoForm/NascimentoForm.tsx` | 3b | Form | Form labels |
| 21 | `EventoForm/PesagemForm.tsx` | 3b | Form | Form labels, unit labels |
| 22 | `EventoForm/TransferenciaLoteForm.tsx` | 3b | Form | Form labels |
| 23 | `EventoForm/VendaForm.tsx` | 3b | Form | Form labels, price labels |
| 24 | `FormEventoSanitario.tsx` | 3b | Form | Form labels, type selector labels |
| 25 | `HistoricoEventos.tsx` | 3b | Component | Timeline labels, event types |
| 26 | `ImportadorCSV.tsx` | 3b | Component | Headers, feedback messages, column labels |
| 27 | `LoteForm.tsx` | 3b | Form | Form labels |
| 28 | `LotesList.tsx` | 3b | Component | Table headers, list labels |
| 29 | `RebanhoProjetado.tsx` | 3b | Component | Section labels, metric descriptions |
| 30 | `corte/DashboardCorte.tsx` | 3b | Dashboard | KPI labels, chart labels, section headers |
| 31 | `corte/FormRegistroPesagemLote.tsx` | 3b | Form | Form labels, unit labels |
| 32 | `leiteira/DashboardLeiteiro.tsx` | 3b | Dashboard | KPI labels, chart legends, table headers |
| 33 | `reproducao/AbortoFormDialog.tsx` | 3b | Dialog/Form | Dialog title, form labels |
| 34 | `reproducao/CalendarioReprodutivo.tsx` | 3b | Component | Event labels, date labels, legend |
| 35 | `reproducao/CoberturaFormDialog.tsx` | 3b | Dialog/Form | Dialog title, form labels |
| 36 | `reproducao/ConflictResolutionDialog.tsx` | 3b | Dialog | Dialog labels, conflict descriptions |
| 37 | `reproducao/DescarteFormDialog.tsx` | 3b | Dialog/Form | Dialog title, form labels |
| 38 | `reproducao/DiagnosticoFormDialog.tsx` | 3b | Dialog/Form | Dialog title, form labels |
| 39 | `reproducao/EventosListagem.tsx` | 3b | Component | Table headers, event type badges |
| 40 | `reproducao/IndicadoresCard.tsx` | 3b | Component | KPI labels, metric descriptions |
| 41 | `reproducao/ParametrosReprodutivosForm.tsx` | 3b | Form | Form labels, descriptions |
| 42 | `reproducao/PartoFormDialog.tsx` | 3b | Dialog/Form | Dialog title, form labels |
| 43 | `reproducao/RegistroEventoDialog.tsx` | 3b | Dialog | Dialog title, section labels |
| 44 | `reproducao/RepetidorasAlerta.tsx` | 3b | Component | Alert headers, labels |
| 45 | `reproducao/ReproducaoStats.tsx` | 3b | Component | KPI labels, stat descriptions |
| 46 | `reproducao/ReproducaoSyncProvider.tsx` | 3b | Provider | Sync status text |
| 47 | `reproducao/ReprodutorFormDialog.tsx` | 3b | Dialog/Form | Dialog title, form labels |
| 48 | `reproducao/ReprodutorListagem.tsx` | 3b | Component | Table headers, list labels |
| 49 | `reproducao/SecagemFormDialog.tsx` | 3b | Dialog/Form | Dialog title, form labels |
| 50 | `reproducao/SyncStatusBadge.tsx` | 3b | Component | Status text, badge labels |
| 51 | `reproducao/eventos/AbortoForm.tsx` | 3b | Form | Form labels |
| 52 | `reproducao/eventos/CoberturaForm.tsx` | 3b | Form | Form labels |
| 53 | `reproducao/eventos/DescarteForm.tsx` | 3b | Form | Form labels |
| 54 | `reproducao/eventos/DiagnosticoForm.tsx` | 3b | Form | Form labels |
| 55 | `reproducao/eventos/PartoForm.tsx` | 3b | Form | Form labels |
| 56 | `reproducao/eventos/SecagemForm.tsx` | 3b | Form | Form labels |
| 57 | `reproducao/eventos/TipoEventoSelector.tsx` | 3b | Component | Selector labels, type descriptions |
| 58 | `sanidade/SanidadeDashboard.tsx` | 3b | Dashboard | KPI labels, chart labels, alerts headers |

---

### Categoria 3: Páginas e Componentes Rebanho (37 arquivos)
Localização: `app/dashboard/rebanho/`

| # | Arquivo | Fase | Tipo | Atualização Necessária |
|---|---|---|---|---|
| 59 | `page.tsx` | 3b | Page (Hub) | Section labels, card titles, action labels |
| 60 | `novo/page.tsx` | 3b | Page | Page title, form labels, button text |
| 61 | `[id]/page.tsx` | 3b | Page | Page title, tab labels, section headers |
| 62 | `[id]/editar/page.tsx` | 3b | Page | Page title, form labels |
| 63 | `[id]/evento/page.tsx` | 3b | Page | Page title, form labels, event type labels |
| 64 | `lotes/page.tsx` | 3b | Page | Page title, table headers, action labels |
| 65 | `lotes/novo/page.tsx` | 3b | Page | Page title, form labels |
| 66 | `lotes/[id]/page.tsx` | 3b | Page | Page title, section headers, list labels |
| 67 | `lotes/[id]/editar/page.tsx` | 3b | Page | Page title, form labels |
| 68 | `importar/page.tsx` | 3b | Page | Page title, upload labels, result headers |
| 69 | `movimentacoes/page.tsx` | 3b | Page | Page title, tab labels, table headers, KPI labels |
| 70 | `movimentacoes/components/RegistrarMovimentacaoDialog.tsx` | 3b | Dialog | Dialog title, form labels |
| 71 | `indicadores/page.tsx` | 3b | Page | Page title, filter labels, KPI labels |
| 72 | `indicadores/IndicadoresClient.tsx` | 3b | Component | Chart labels, legend text |
| 73 | `indicadores/components/CardIndicador.tsx` | 3b | Component | Card title, KPI labels |
| 74 | `indicadores/components/FiltrosIndicadores.tsx` | 3b | Component | Filter labels, select options |
| 75 | `indicadores/components/IndicadoresSkeleton.tsx` | 3b | Component | Skeleton labels |
| 76 | `indicadores/components/charts/ComparativoLotes.tsx` | 3b | Chart | Chart title, axis labels, legend |
| 77 | `indicadores/components/charts/GraficoComposicao.tsx` | 3b | Chart | Legend labels, percentages |
| 78 | `indicadores/components/charts/GraficoDistribuicaoEtaria.tsx` | 3b | Chart | Chart labels, legend |
| 79 | `indicadores/components/charts/GraficoEvolucaoEfetivo.tsx` | 3b | Chart | Chart labels, axis text |
| 80 | `indicadores/components/charts/GraficoGMD.tsx` | 3b | Chart | Chart labels, metric descriptions |
| 81 | `indicadores/components/charts/GraficoNatalidadeMortalidade.tsx` | 3b | Chart | Chart labels, axis text |
| 82 | `leiteira/page.tsx` | 3b | Page | Page title, tab labels, KPI labels |
| 83 | `corte/page.tsx` | 3b | Page | Page title, tab labels, KPI labels |
| 84 | `sanidade/page.tsx` | 3b | Page | Page title, tab labels, alert headers |
| 85 | `reproducao/page.tsx` | 3b | Page | Page title, tab labels, section headers |
| 86 | `reproducao/layout.tsx` | 3b | Layout | Tab nav styling (se houver) |
| 87 | `reproducao/TabsNav.tsx` | 3b | Component | Tab labels |
| 88 | `reproducao/eventos/page.tsx` | 3b | Page | Page title, section labels, table headers |
| 89 | `reproducao/reprodutores/page.tsx` | 3b | Page | Page title, table headers, action labels |
| 90 | `reproducao/reprodutores/ReprodutoresClient.tsx` | 3b | Component | Table headers, status labels |
| 91 | `reproducao/reprodutores/[id]/page.tsx` | 3b | Page | Page title, section headers |
| 92 | `reproducao/reprodutores/[id]/ReprodutorDetailClient.tsx` | 3b | Component | Detail labels, edit/delete button text |
| 93 | `reproducao/parametros/page.tsx` | 3b | Page | Page title, form labels |
| 94 | `reproducao/indicadores/page.tsx` | 3b | Page | Page title, KPI labels |
| 95 | `reproducao/repetidoras/page.tsx` | 3b | Page | Page title, alert headers |

---

### Categoria 4: Páginas e Componentes Silos (11 arquivos)
Localização: `app/dashboard/silos/`

| # | Arquivo | Fase | Tipo | Atualização Necessária |
|---|---|---|---|---|
| 96 | `page.tsx` | 3a | Page | Page title, section labels, filter labels |
| 97 | `[id]/page.tsx` | 3a | Page | Page title, tab labels, section headers |
| 98 | `components/SiloCard.tsx` | 3a | Component | Card title, info labels, status badges |
| 99 | `components/SiloDetailHeader.tsx` | 3a | Component | Header labels, section titles |
| 100 | `components/tabs/VisaoGeralTab.tsx` | 3a | Tab | Section labels, metric descriptions |
| 101 | `components/tabs/EstoqueTab.tsx` | 3a | Tab | Table headers, movement labels |
| 102 | `components/tabs/QualidadeTab.tsx` | 3a | Tab | Quality parameter labels, status badges |
| 103 | `components/dialogs/SiloForm.tsx` | 3a | Dialog/Form | Form labels, input helpers |
| 104 | `components/dialogs/MovimentacaoDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |
| 105 | `components/dialogs/AvaliacaoBromatologicaDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |
| 106 | `components/dialogs/AvaliacaoPspsDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |

---

### Categoria 5: Páginas e Componentes Talhões/Lavouras (18 arquivos)
Localização: `app/dashboard/talhoes/`

| # | Arquivo | Fase | Tipo | Atualização Necessária |
|---|---|---|---|---|
| 107 | `page.tsx` | 3a | Page | Page title, section labels, filter labels |
| 108 | `[id]/page.tsx` | 3a | Page | Page title, tab labels, section headers |
| 109 | `components/TalhaoCard.tsx` | 3a | Component | Card title, info labels, status badges |
| 110 | `components/TalhaoDetailHeader.tsx` | 3a | Component | Header labels, section titles |
| 111 | `components/tabs/TalhaoResumoTab.tsx` | 3a | Tab | Section labels, metric descriptions, KPI labels |
| 112 | `components/tabs/TalhaoOperacoesTab.tsx` | 3a | Tab | Section labels, operation headers, table headers |
| 113 | `components/tabs/TalhaoHistoricoTab.tsx` | 3a | Tab | Timeline labels, event type badges |
| 114 | `components/dialogs/TalhaoForm.tsx` | 3a | Dialog/Form | Form labels, input helpers |
| 115 | `components/dialogs/CicloForm.tsx` | 3a | Dialog/Form | Form labels, cycle step descriptions |
| 116 | `components/dialogs/AtividadeDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |
| 117 | `components/dialogs/fields/PlantioFields.tsx` | 3a | Form Fields | Field labels, unit labels |
| 118 | `components/dialogs/fields/PreparoSoloFields.tsx` | 3a | Form Fields | Field labels |
| 119 | `components/dialogs/fields/ColheitaFields.tsx` | 3a | Form Fields | Field labels, metric labels |
| 120 | `components/dialogs/fields/AnaliseSoloFields.tsx` | 3a | Form Fields | Field labels, parameter descriptions |
| 121 | `components/dialogs/fields/CalagemFields.tsx` | 3a | Form Fields | Field labels |
| 122 | `components/dialogs/fields/GessagemFields.tsx` | 3a | Form Fields | Field labels |
| 123 | `components/dialogs/fields/IrrigacaoFields.tsx` | 3a | Form Fields | Field labels |
| 124 | `components/dialogs/fields/PulverizacaoFields.tsx` | 3a | Form Fields | Field labels |

---

### Categoria 6: Páginas e Componentes Frota/Maquinário (13 arquivos)
Localização: `app/dashboard/frota/`

| # | Arquivo | Fase | Tipo | Atualização Necessária |
|---|---|---|---|---|
| 125 | `page.tsx` | 3a | Page | Page title, section labels, tab labels |
| 126 | `components/FrotaOverview.tsx` | 3a | Component | Card title, KPI labels, section headers |
| 127 | `components/FrotaCadastro.tsx` | 3a | Component | Form title, form labels, action text |
| 128 | `components/FrotaManutencoes.tsx` | 3a | Component | Section title, table headers, status badges |
| 129 | `components/FrotaAbastecimento.tsx` | 3a | Component | Section title, table headers, metric labels |
| 130 | `components/FrotaDiarioBordo.tsx` | 3a | Component | Section title, log headers, entry labels |
| 131 | `components/FrotaCustos.tsx` | 3a | Component | Section title, table headers, cost labels |
| 132 | `components/FrotaRelatorios.tsx` | 3a | Component | Section title, report headers |
| 133 | `components/dialogs/MaquinaDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |
| 134 | `components/dialogs/PlanoManutencaoDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |
| 135 | `components/dialogs/ManutencaoDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |
| 136 | `components/dialogs/AbastecimentoDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |
| 137 | `components/dialogs/UsoDialog.tsx` | 3a | Dialog/Form | Dialog title, form labels |

---

## Mapa de Componentes Compartilhados

Componentes usados em múltiplos módulos (requerem revisão dupla após cada atualização):

| # | Componente | Localização | Usado em | Impacto | Ação |
|---|---|---|---|---|---|
| 1 | `KpiChartCard.tsx` | `components/widgets/` | `app/dashboard/page.tsx` | Baixo (1 página) | Atualizar widget primeiro, depois revisar dashboard |
| 2 | `GaugeOcupacaoSilos.tsx` | `components/widgets/` | `app/dashboard/page.tsx` | Baixo (1 página) | Atualizar widget primeiro, depois revisar dashboard |
| 3 | `PieCategoriasRebanho.tsx` | `components/widgets/` | `app/dashboard/page.tsx` | Baixo (1 página) | Atualizar widget primeiro, depois revisar dashboard |
| 4 | `PieComposicaoRebanho.tsx` | `components/widgets/` | `app/dashboard/page.tsx` | Baixo (1 página) | Atualizar widget primeiro, depois revisar dashboard |
| 5 | `SilagemMetricasCard.tsx` | `components/widgets/` | `app/dashboard/page.tsx` | Baixo (1 página) | Atualizar widget primeiro, depois revisar dashboard |
| 6 | `SilosInfoCard.tsx` | `components/widgets/` | `app/dashboard/page.tsx` | Baixo (1 página) | Atualizar widget primeiro, depois revisar dashboard |
| 7 | `LotesAtivosCard.tsx` | `components/widgets/` | `app/dashboard/page.tsx` | Baixo (1 página) | Atualizar widget primeiro, depois revisar dashboard |
| 8 | `DashboardLeiteiro.tsx` | `components/rebanho/leiteira/` | `app/dashboard/rebanho/leiteira/page.tsx` | Médio (1 submodule) | Atualizar componente, testar page, visual review |
| 9 | `DashboardCorte.tsx` | `components/rebanho/corte/` | `app/dashboard/rebanho/corte/page.tsx` | Médio (1 submodule) | Atualizar componente, testar page, visual review |
| 10 | `IndicadoresCard.tsx` | `components/rebanho/reproducao/` | `app/dashboard/rebanho/reproducao/indicadores/page.tsx` | Médio (1 submodule) | Atualizar componente, testar page, visual review |
| 11 | `SanidadeDashboard.tsx` | `components/rebanho/sanidade/` | `app/dashboard/rebanho/sanidade/page.tsx` | Médio (1 submodule) | Atualizar componente, testar page, visual review |

**Regra**: Atualizar sempre o componente ANTES da página que o consome.

---

## Ordem de Execução (Fases)

```
┌─────────────────────────────────────────────────────────────┐
│ Fase 1: Dashboard ✅ CONCLUÍDO (11/05/2026)                │
│ ✓ app/dashboard/page.tsx + 7 componentes (1 dia)            │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 2: Widgets Reutilizáveis (2-3 horas)                  │
│ • 11 widgets em components/widgets/                         │
│ ✓ Todas as tipografias de labels, legends                  │
│ ✓ Preservar KPI values (text-2xl/3xl), shimmer, shadows    │
│ → Validar com npm run build + test                          │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 3a: Módulos Core (8-10 horas)                          │
│ • Silos: 11 arquivos em app/dashboard/silos/                │
│ • Talhões: 18 arquivos em app/dashboard/talhoes/            │
│ • Frota: 13 arquivos em app/dashboard/frota/                │
│ • Trechos: Cards, tabs, dialogs, section headers            │
│ → Validar com npm run build + test + visual review desktop  │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 3b: Módulo Rebanho (5-6 horas)                         │
│ • 48 componentes em components/rebanho/                     │
│ • 37 páginas em app/dashboard/rebanho/                      │
│ ✓ Dashboard* → DashboardLeiteiro → page rebanho/leiteira   │
│ ✓ Dashboard* → DashboardCorte → page rebanho/corte         │
│ ✓ IndicadoresCard → page rebanho/reproducao/indicadores    │
│ ✓ SanidadeDashboard → page rebanho/sanidade                │
│ → Validar com npm run build + test + responsividade 375px  │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 3c: Auth + Root (fora de escopo desta SPEC)            │
│ • app/page.tsx, app/login/*, app/register/*, etc.          │
│ • Será documentado em SPEC adicional                        │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 3d: Admin Pages (fora de escopo desta SPEC)            │
│ • planejamento-silagem/, calculadoras/, configuracoes/     │
│ • Será documentado em SPEC adicional                        │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 3e: Auxiliar + Financeiro (fora de escopo desta SPEC)  │
│ • relatorios/, calendario/, insumos/, financeiro/, tempo/   │
│ • Será documentado em SPEC adicional                        │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 4: Forms e Dialogs (post-launch, baixa prioridade)     │
│ • ~25 arquivos em components/rebanho/*Form*, *Dialog*       │
│ • Será documentado em SPEC adicional                        │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Fase 5: QA, Polish, Validação Final (2 horas)              │
│ ✓ npm run build (zero erros)                               │
│ ✓ npm run test (646+ passando)                             │
│ ✓ npm run lint (zero warnings)                             │
│ ✓ Visual review dark + light modes                         │
│ ✓ Contraste WCAG AA (axe DevTools)                         │
│ ✓ Responsividade 375px / 768px / 1440px                    │
│ → Merge para main após aprovação                            │
└─────────────────────────────────────────────────────────────┘
```

**Tempo Total (Fases 2-5):** ~24-30 horas de desenvolvimento + QA
- Fase 2 (Widgets): 2-3h
- Fase 3a (Silos + Talhões + Frota): 8-10h
- Fase 3b (Rebanho): 5-6h
- Fase 5 (QA + validation): 2-3h

---

## Especificações por Arquivo

### Fase 2: Widgets Reutilizáveis

---

#### 1. `components/widgets/GaugeOcupacaoSilos.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Labels dos ticks da gauge
   - Procure por: `text-[0.475rem]`, `text-xs`
   - Substitua por: `text-sm`
   - Contexto: Se houver labels de capacidade ao redor do gauge (ex: "Vazio", "Normal", "Cheio")

2. **Localização:** Sublabel abaixo do gauge (percentual/toneladas)
   - Procure por: `text-xs` ou `text-[0.6rem]`
   - Substitua por: `text-sm`

**O que Preservar:**
- Tamanho do gauge (cx, cy, r)
- Cores semânticas (verde, dourado, vermelho, azul)
- Shadows e glow effects
- Animações de transição

---

#### 2. `components/widgets/KpiChartCard.tsx`

**Status:** Parcialmente atualizado em Fase 1 — verificar integridade  
**Trechos a Modificar:**

1. **Localização:** Prop `label` (section label acima do chart)
   - Procure por: `className="...text-[0.475rem]..."`
   - Substitua por: `className="...text-sm..."`
   - Usar: `uppercase tracking-[0.13em]` junto

2. **Localização:** Prop `sublabel` (descrição)
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Chart wrapper (flex, gap)
- Card styling (rounded-[13px], shadow)
- Shimmer line `::before`

---

#### 3. `components/widgets/LotesAtivosCard.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Card title ("LOTES ATIVOS")
   - Procure por: `text-[0.475rem]` ou `text-[11px]`
   - Substitua por: `text-sm`
   - Manter: `uppercase font-bold`

2. **Localização:** Lista de lotes (nomes, contagens)
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

3. **Localização:** Badges (quantidade de animais)
   - Procure por: `text-[11px]` ou `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Badge colors (verde/dourado/vermelho)
- Card structure (padding, gaps)
- Hover states

---

#### 4. `components/widgets/MiniCardRebanho.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Card title
   - Procure por: `text-[0.475rem]`, `text-[11px]`
   - Substitua por: `text-sm`

2. **Localização:** Metric labels (ex: "Total", "Lotes")
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

3. **Localização:** Values/numbers
   - Procure por: `text-xl`, `text-2xl`
   - **PRESERVAR** — não alterar

**O que Preservar:**
- Card layout e design
- Metric values sizing
- Shadows e borders

---

#### 5. `components/widgets/MiniCardRebanhoClient.tsx`

**Status:** Necessita revisão conforme MiniCardRebanho  
**Ação:** Mesmo padrão do `MiniCardRebanho.tsx` (condicional)

---

#### 6. `components/widgets/PieCategoriasRebanho.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Legend labels (nomes de categorias)
   - Procure por: `text-[11px]`, `text-xs`
   - Substitua por: `text-sm`

2. **Localização:** Donut center text (ex: "animais" / "Ativo")
   - Procure por: `text-[10px]`
   - Substitua por: `text-[12px]`
   - Contexto: Número no centro do donut deve ser legível

**O que Preservar:**
- Donut colors (semânticas por categoria)
- Chart animation
- Responsive sizing

---

#### 7. `components/widgets/PieComposicaoRebanho.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Legend labels
   - Procure por: `text-[11px]`, `text-xs`
   - Substitua por: `text-sm`

2. **Localização:** Percentage text (se houver)
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Donut colors
- Chart animation

---

#### 8. `components/widgets/PieCulturasAtivas.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Legend labels
   - Procure por: `text-[10px]`, `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Chart styling
- Colors

---

#### 9. `components/widgets/SilagemMetricasCard.tsx`

**Status:** Parcialmente atualizado em Fase 1 — verificar integridade  
**Trechos a Modificar:**

1. **Localização:** Metric labels ("Autonomia", "Consumo", "Taxa Perdas")
   - Procure por: `text-[11px]` ou `text-xs`
   - Substitua por: `text-sm`
   - Manter: `uppercase`

2. **Localização:** Metric values (dias, kg/dia, %)
   - Procure por: `text-2xl`, `text-xl`
   - **PRESERVAR**

3. **Localização:** Sublabels (descriptions)
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- KPI values sizing
- Card padding/gaps
- Colors

---

#### 10. `components/widgets/SilosInfoCard.tsx`

**Status:** Parcialmente atualizado em Fase 1 — verificar integridade  
**Trechos a Modificar:**

1. **Localização:** Section headers ("SILOS ABERTOS", "CULTURAS")
   - Procure por: `text-[11px]`, `text-xs`
   - Substitua por: `text-sm`
   - Manter: `uppercase tracking-[0.13em]`

2. **Localização:** Lista de nomes/valores
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

3. **Localização:** Badges (percentuais)
   - Procure por: `text-[11px]`
   - Substitua por: `text-sm`

**O que Preservar:**
- Card structure
- List styling
- Badge colors

---

#### 11. `components/widgets/SilosStatusCard.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Card title
   - Procure por: `text-[0.475rem]`, `text-[11px]`
   - Substitua por: `text-sm`

2. **Localização:** Status labels (ex: "Aberto", "Crítico")
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

3. **Localização:** List items
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Card layout
- Badge colors
- Shadows

---

### Fase 3a: Módulo Silos

---

#### 12. `app/dashboard/silos/page.tsx`

**Status:** Necessita revisão completa de tipografia  
**Trechos a Modificar:**

1. **Localização:** Section labels (ex: "Filtros", "Silos")
   - Procure por: `text-[0.475rem]`, `text-xs`
   - Substitua por: `text-sm`
   - Manter: `uppercase tracking-[0.13em]`

2. **Localização:** Filter label text
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

3. **Localização:** Card grid titles
   - Se houver títulos de seção inline, usar `text-sm`

**O que Preservar:**
- Grid layout (grid-cols-N)
- Card styling
- Filter component structure

---

#### 13. `app/dashboard/silos/[id]/page.tsx`

**Status:** Necessita revisão completa de tipografia  
**Trechos a Modificar:**

1. **Localização:** Page title (h1)
   - Procure por: `text-3xl` / `text-4xl`
   - **PRESERVAR**

2. **Localização:** Tab labels
   - Procure por: `text-xs`, `text-sm`
   - Substitua por: `text-sm` (se estiver `text-xs`)

3. **Localização:** Section headers dentro das tabs
   - Procure por: `text-[0.475rem]`, `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Page title sizing
- Tab styling/borders
- Grid layouts

---

#### 14. `app/dashboard/silos/components/SiloCard.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Card title (silo name)
   - Procure por: `text-sm`, `text-[11px]`
   - Se for `text-[11px]`, substitua por `text-sm`
   - Se for `text-sm`, verificar se é consistente

2. **Localização:** Info labels (ex: "Volume", "Estoque", "Status")
   - Procure por: `text-xs`, `text-[0.475rem]`
   - Substitua por: `text-sm`

3. **Localização:** Status badges
   - Procure por: `text-xs`, `text-[11px]`
   - Substitua por: `text-sm`

**O que Preservar:**
- Card structure
- Badge colors (semânticas)
- Shadows/borders

---

#### 15. `app/dashboard/silos/components/SiloDetailHeader.tsx`

**Status:** Necessita revisão de tipografia  
**Trechos a Modificar:**

1. **Localização:** Breadcrumb ou navigation labels
   - Procure por: `text-xs`, `text-[0.475rem]`
   - Substitua por: `text-sm`

2. **Localização:** Header title/subtitle
   - Procure por: `text-xs` (para subtitles)
   - Substitua por: `text-sm`

**O que Preservar:**
- Breadcrumb structure
- Header layout

---

#### 16-18. `app/dashboard/silos/components/tabs/*.tsx` (VisaoGeralTab, EstoqueTab, QualidadeTab)

**Status:** Necessita revisão de tipografia  
**Trechos Genéricos a Modificar (em cada arquivo):**

1. **Localização:** Section labels
   - Procure por: `text-[0.475rem]`, `text-xs`
   - Substitua por: `text-sm`

2. **Localização:** Table headers
   - Procure por: `text-xs`, `text-[11px]`
   - Substitua por: `text-sm`

3. **Localização:** List/table item text
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

4. **Localização:** Metric descriptions
   - Procure por: `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Table/list structure
- Badge colors
- Grid layouts

---

#### 19-22. `app/dashboard/silos/components/dialogs/*.tsx` (SiloForm, MovimentacaoDialog, AvaliacaoBromatologicaDialog, AvaliacaoPspsDialog)

**Status:** Necessita revisão de tipografia  
**Trechos Genéricos a Modificar (em cada arquivo):**

1. **Localização:** Dialog title
   - Se houver `text-[0.475rem]`, substitua por `text-sm`
   - Títulos maiores (h2, h3) **PRESERVAR**

2. **Localização:** Form labels
   - Procure por: `text-xs`, `text-[0.475rem]`
   - Substitua por: `text-sm`
   - Manter: shadcn `<Label>` styling (já tem classes corretas)

3. **Localização:** Help text / descriptions
   - Procure por: `text-xs`
   - Se for muito pequeno, substituir por `text-sm`
   - **PRESERVAR** apenas `text-xs` se for nota tiny (timestamps, etc.)

4. **Localização:** Badges / status indicators
   - Procure por: `text-[11px]`, `text-xs`
   - Substitua por: `text-sm`

**O que Preservar:**
- Dialog structure/layout
- Input styling (shadcn)
- Button styling
- Form validation colors

---

### Fase 3a (continuação): Talhões e Frota

#### Padrão Genérico para Talhões (`app/dashboard/talhoes/`)

Mesmo padrão dos Silos:

1. **Section labels:** `text-[0.475rem]` → `text-sm`
2. **Table headers:** `text-xs` → `text-sm`
3. **Card titles:** `text-[11px]` → `text-sm`
4. **Status badges:** `text-xs` → `text-sm`
5. **Form labels:** `text-xs` → `text-sm`

**O que PRESERVAR:**
- Page title sizing
- Tab styling
- Grid layouts
- Card structure
- Metric values

---

#### Padrão Genérico para Frota (`app/dashboard/frota/`)

Mesmo padrão:

1. **Card titles / Section headers:** `text-[0.475rem]`, `text-[11px]` → `text-sm`
2. **Table headers:** `text-xs` → `text-sm`
3. **KPI labels:** `text-[0.475rem]` → `text-sm`
4. **Status badges:** `text-xs` → `text-sm`
5. **Form labels:** `text-xs` → `text-sm`

**O que PRESERVAR:**
- Component structure
- Badge colors (semânticas)
- Shadows/borders
- KPI values sizing

---

### Fase 3b: Módulo Rebanho (48 componentes + 37 páginas)

Dada a extensão da Fase 3b (85 arquivos), segue um **padrão genérico aplicável a todos**, com exemplos de trechos específicos.

---

#### Padrão Genérico para Componentes Rebanho

**Para cada arquivo em `components/rebanho/`:**

1. **Card Titles / Headers:**
   - Procure por: `text-[0.475rem]`, `text-[11px]`, `text-xs`
   - Substitua por: `text-sm`
   - Contexto: Títulos de cards, seções, abas

2. **Section Labels (uppercase):**
   - Procure por: `text-[0.475rem]`
   - Substitua por: `text-sm`
   - Manter: `uppercase tracking-[0.13em]` ou `tracking-widest`

3. **Table Headers:**
   - Procure por: `text-xs`, `text-[0.475rem]`
   - Substitua por: `text-sm`

4. **Badge Text:**
   - Procure por: `text-[11px]`, `text-xs`
   - Substitua por: `text-sm`

5. **KPI Labels (não values):**
   - Procure por: `text-[0.475rem]`, `text-xs`
   - Substitua por: `text-sm`
   - **PRESERVAR** KPI values (`text-2xl`, `text-3xl`, `text-xl`)

6. **Form Labels:**
   - Se usar shadcn `<Label>`, verificar que tem class `text-sm` já
   - Se tiver labels custom, garantir `text-sm`

7. **Help Text / Descriptions:**
   - Procure por: `text-xs`
   - Substituir por `text-sm` se for crítico para UX
   - **PRESERVAR** `text-xs` apenas para notas muito pequenas

**O que SEMPRE PRESERVAR:**
- Component structure (div, flex, grid layouts)
- Color codes (verde, dourado, vermelho, azul)
- Shadows, borders, radius
- Animations/transitions
- Icons (size, color)

---

#### 23-58: Componentes Rebanho (resumido)

Aplicar o **Padrão Genérico acima** a cada arquivo:

| Arquivo | Exemplos de Trechos |
|---|---|
| `AbaProducaoLeiteira.tsx` | Card headers (`text-[11px]`→`text-sm`), KPI labels (`text-[0.475rem]`→`text-sm`), table headers (`text-xs`→`text-sm`) |
| `AbaSanidade.tsx` | Alert headers (`text-[0.475rem]`→`text-sm`), badge text (`text-xs`→`text-sm`), section labels |
| `AnimalCard.tsx` | Card title (`text-[11px]`→`text-sm`), info labels (`text-xs`→`text-sm`), status badges |
| `DashboardLeiteiro.tsx` | **PRIORIDADE ALTA** — KPI labels (`text-[0.475rem]`→`text-sm`), chart legends (`text-xs`→`text-sm`), table headers |
| `DashboardCorte.tsx` | **PRIORIDADE ALTA** — KPI labels, metric descriptions, chart labels |
| `IndicadoresCard.tsx` | **PRIORIDADE ALTA** — Card title, metric labels, KPI descriptions |
| `SanidadeDashboard.tsx` | **PRIORIDADE ALTA** — Dashboard headers, alert labels, chart text |
| `CalendarioReprodutivo.tsx` | Event labels, date labels, legend text (`text-xs`→`text-sm`) |
| `ReprodutorListagem.tsx` | Table headers, list labels, status badges |
| (outros 30+ arquivos) | Aplicar padrão genérico acima |

---

#### Padrão Genérico para Páginas Rebanho

**Para cada arquivo em `app/dashboard/rebanho/` e subpastas:**

1. **Page Title (h1):**
   - Procure por: `text-3xl`, `text-4xl`
   - **PRESERVAR** — nunca alterar

2. **Section Headers:**
   - Procure por: `text-[0.475rem]`, `text-xs`
   - Substitua por: `text-sm`
   - Manter: `uppercase` se aplicável

3. **Tab Labels:**
   - Procure por: `text-xs`, `text-sm`
   - Se muito pequeno (`text-xs` em tab label), substituir por `text-sm`

4. **Filter/Control Labels:**
   - Procure por: `text-xs`, `text-[0.475rem]`
   - Substitua por: `text-sm`

5. **Table Headers / List Headers:**
   - Procure por: `text-xs`, `text-[0.475rem]`
   - Substitua por: `text-sm`

6. **Action Button Text:**
   - Usar `text-sm` ou conforme shadcn Button defaults

**O que SEMPRE PRESERVAR:**
- Page grid/layout
- Sidebar navigation
- Breadcrumbs styling
- Modal/dialog structure

---

#### 59-95: Páginas Rebanho (resumido)

Aplicar o **Padrão Genérico acima** a cada página:

| Página | Exemplos de Trechos |
|---|---|
| `page.tsx` (hub) | Section labels (`text-[0.475rem]`→`text-sm`), card titles, action text |
| `novo/page.tsx` | Form labels (`text-sm`), button text |
| `[id]/page.tsx` | Page title (**PRESERVAR**), tab labels, section headers |
| `lotes/page.tsx` | Table headers (`text-xs`→`text-sm`), action labels |
| `importar/page.tsx` | Upload labels, result headers |
| `movimentacoes/page.tsx` | Tab labels, table headers, KPI labels |
| `indicadores/page.tsx` | **PRIORIDADE ALTA** — Filter labels, KPI labels, chart labels |
| `leiteira/page.tsx` | **PRIORIDADE ALTA** — Tab labels, KPI labels, chart legends |
| `corte/page.tsx` | **PRIORIDADE ALTA** — Tab labels, metric labels |
| `sanidade/page.tsx` | **PRIORIDADE ALTA** — Alert headers, calendar labels |
| `reproducao/**` | Tab labels, section headers, form labels |

---

## Critérios de DONE por Fase

### Fase 2: Widgets (após completar todos os 11)

- [ ] `npm run build` executa sem erros TypeScript
- [ ] `npm run test` — 646+ testes passando
- [ ] `npm run lint` — 0 warnings novos introduzidos
- [ ] **Visual Review (Desktop 1440px, Dark Mode):**
  - [ ] Todos os widgets renderizam sem quebra visual
  - [ ] Tipografia legível (labels em `text-sm` — 14px)
  - [ ] Spacing/padding sem alterações
  - [ ] Shadows e borders intactos
- [ ] **Teste de Responsividade:**
  - [ ] 375px (mobile) — widgets adaptativos
  - [ ] 768px (tablet) — layout adequado
  - [ ] 1440px (desktop) — padrão
- [ ] **Contraste WCAG AA:**
  - [ ] Usar axe DevTools: verificar que `text-sm` em labels tem contraste ≥ 4.5:1
  - [ ] Labels em `text-[#688070]` (muted) vs fundo `#080e0a` = ✅ passa
- [ ] **Nenhum arquivo das Regras Invioláveis foi alterado**
- [ ] Todos os widgets ainda usados em `app/dashboard/page.tsx` aparecem corretos

---

### Fase 3a: Silos (após completar todos os 11)

- [ ] `npm run build` executa sem erros TypeScript
- [ ] `npm run test` — 646+ testes passando
- [ ] `npm run lint` — 0 warnings novos
- [ ] **Visual Review (Desktop 1440px, Dark Mode):**
  - [ ] Page `/dashboard/silos` renderiza sem quebra
  - [ ] Cards, tabs, dialogs têm tipografia consistente
  - [ ] Spacing/padding intactos
- [ ] **Teste de Responsividade:**
  - [ ] 375px (mobile) — cards responsivos
  - [ ] 768px (tablet) — grid adequado
  - [ ] 1440px (desktop) — padrão
- [ ] **Contraste WCAG AA:**
  - [ ] Todos os labels em `text-sm` tem contraste adequado
- [ ] **Teste de Funcionalidade:**
  - [ ] Abrir modal de cadastro silo — form labels visíveis
  - [ ] Navegar entre tabs — labels legíveis
  - [ ] Clicar em cards — nenhuma quebra visual
- [ ] **Nenhum arquivo das Regras Invioláveis foi alterado**

---

### Fase 3b: Rebanho (após completar todos os 85)

- [ ] `npm run build` executa sem erros TypeScript
- [ ] `npm run test` — 646+ testes passando
- [ ] `npm run lint` — 0 warnings novos
- [ ] **Visual Review (Desktop 1440px, Dark Mode):**
  - [ ] Hub rebanho (`/dashboard/rebanho`) — cards, labels, section headers
  - [ ] Cada submodule:
    - [ ] Reprodução (`/rebanho/reproducao`) — tabs, calendário, eventos
    - [ ] Leiteira (`/rebanho/leiteira`) — KPIs, gráficos, tabelas
    - [ ] Corte (`/rebanho/corte`) — métricas, gráficos
    - [ ] Sanidade (`/rebanho/sanidade`) — alertas, calendário
    - [ ] Indicadores (`/rebanho/indicadores`) — dashboard, charts
    - [ ] Movimentações (`/rebanho/movimentacoes`) — tabelas, filtros
- [ ] **Teste de Responsividade:**
  - [ ] 375px (mobile) — sem overflow, text wrapping adequado
  - [ ] 768px (tablet) — grids adaptáveis
  - [ ] 1440px (desktop) — padrão
- [ ] **Contraste WCAG AA:**
  - [ ] Todas as mudanças de `text-xs` → `text-sm` tem contraste ≥ 4.5:1
- [ ] **Teste de Funcionalidade:**
  - [ ] Cadastrar novo animal — form labels visíveis
  - [ ] Registrar evento — dialog labels legíveis
  - [ ] Navegar entre tabs — nenhuma quebra
  - [ ] Abrir importador CSV — headers/feedback visível
- [ ] **Nenhum arquivo das Regras Invioláveis foi alterado**

---

### Fase 5: QA Final (após completar 2, 3a, 3b)

- [ ] **Build & Tests:**
  - [ ] `npm run build` — zero erros TypeScript
  - [ ] `npm run test` — 646+ testes passando
  - [ ] `npm run lint` — zero warnings/errors novos
- [ ] **Visual Review Completo:**
  - [ ] Dark mode: todas as páginas tocadas aparecem corretas
  - [ ] Light mode (se houver): verificar contraste, readability
  - [ ] Desktop (1440px), Tablet (768px), Mobile (375px)
  - [ ] Nenhuma quebra visual, overflow, ou misalignment
- [ ] **Contraste WCAG AA (completo):**
  - [ ] Usar axe DevTools ou Lighthouse
  - [ ] Todas as mudanças de tipografia passam em AA (4.5:1)
  - [ ] Nenhum elemento novo com contraste < 4.5:1
- [ ] **Funcionalidade Cruzada:**
  - [ ] Dashboard principal (`/dashboard`) — todos os widgets aparecem
  - [ ] Clicar em cards para navegar a subpáginas — funciona
  - [ ] Forms e dialogs abrem/fecham — sem erros
  - [ ] Responsividade real em DevTools (375/768/1440px)
- [ ] **Nenhum Regression:**
  - [ ] Páginas não modificadas (Auth, Admin, Financeiro, etc.) ainda funcionam
  - [ ] Nenhum CSS global foi alterado (verificar `app/globals.css` intacto)
  - [ ] `colors_and_type.css` intacto
- [ ] **Arquivo de Regras Invioláveis:**
  - [ ] `.env.local` não foi alterado
  - [ ] `next.config.ts` não foi alterado (headers, Sentry, etc.)
  - [ ] `turbo.json` não foi alterado
  - [ ] `types/supabase.ts` não foi editado manualmente
- [ ] **Merge para Main:**
  - [ ] Todos os critérios acima ✅
  - [ ] Commit message clara (ex: "redesign: fases 2-3b tipografia labels")
  - [ ] PR description detalha mudanças
  - [ ] Review + aprovação

---

## Riscos e Pontos de Atenção

### 1. Componentes com Condicional de `text-xs` → `text-sm`

⚠️ **Alguns componentes podem ter `text-xs` deliberadamente para notas pequenas.**

**Exemplos:**
- Timestamps ("Hoje · 06:30")
- Help text muito pequeno
- Version numbers / credits
- Inline disclaimers

**Ação:** Ao encontrar `text-xs`, verificar contexto:
- Se for label/description → substituir por `text-sm`
- Se for nota tiny / timestamp → **PRESERVAR** `text-xs`

---

### 2. Forms com shadcn `<Label>`

⚠️ **shadcn/ui `<Label>` já pode ter estilos corretos aplicados globalmente.**

**Verificação:**
- Procure por: `import { Label } from "@/components/ui/label"`
- Se houver classe inline em `<Label>`, atualizar conforme padrão
- Se não houver classe inline, verificar que shadcn está com `text-sm` no global CSS

**Ação:** Não remover classes; apenas adicionar/atualizar se necessário

---

### 3. Gráficos (Charts) — Recharts, Chart.js

⚠️ **Gráficos podem ter tooltips, legends, axis labels com tipografia customizada.**

**Problemas Potenciais:**
- `Tooltip` componentes podem ter `text-xs` hardcoded
- Legends podem estar em `text-[10px]` ou `text-xs`
- Y-axis labels podem estar em `text-xs`

**Ação:**
- Procurar por `ResponsiveContainer`, `Legend`, `Tooltip`, `YAxis`
- Se houver `fontSize: "12px"` ou classes `text-xs`, atualizar para `text-sm`
- Testar visual após mudança (legend pode ficar mais espaçada)

---

### 4. Shimmer Lines e Shadows

⚠️ **Cards têm `::before` element (shimmer line) — nunca remover.**

**Verificação:**
```tsx
// PRESERVAR SEMPRE:
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 1.125rem;
  right: 1.125rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent);
}
```

**Ação:** Buscar por `::before`, `shimmer`, `gradient` — só mexer se quebrou

---

### 5. Componentes Compartilhados

⚠️ **11 componentes aparentam em múltiplas páginas (veja Mapa acima).**

**Exemplo:**
- `DashboardLeiteiro.tsx` é usado em `/rebanho/leiteira/page.tsx`
- Se atualizar o componente, verificar que a página ainda renderiza corretamente

**Ação:** Após atualizar componente compartilhado:
1. `npm run build`
2. Navegar manualmente para página que usa
3. Visual review
4. Se houver quebra, reverter e investigar

---

### 6. Dark Mode vs. Light Mode

⚠️ **O projeto usa Tailwind dark mode — verificar contraste em ambos.**

**Verificação:**
- Dark mode: fundo `#080e0a`, texto `#dceede` — padrão ✅
- Light mode (se houver): fundo claro, texto escuro — verificar contraste

**Ação:** Se o projeto suporta light mode, testar mudanças de tipografia em ambos

---

### 7. Mobile Responsividade

⚠️ **Em 375px (mobile), texto em `text-sm` (14px) pode ficar apertado em cards.**

**Verificação:**
- Abrir DevTools → 375px viewport
- Navegar a páginas modificadas
- Verificar que texto não wrap de forma estranha
- Cards/containers não quebram

**Ação:** Se houver overflow:
- Reduzir padding em mobile
- Usar `text-xs` apenas em mobile (com media query)
- Ou manter `text-sm` e aceitar que card fica mais compacto

---

### 8. Caso Especial: Donut/Pie Chart Center

⚠️ **Gráficos de donut têm número no centro — muito pequeno em `text-[10px]`.**

**Padrão:**
- Antes: `text-[10px]` (10px)
- Depois: `text-[12px]` (12px)
- Nunca: `text-xs` (12px) — seria redundante

**Ação:** Procurar por `text-[10px]` especificamente em charts, substituir por `text-[12px]`

---

### 9. Loading States e Skeletons

⚠️ **Components com `<Skeleton>` podem ter labels que precisam atualizar.**

**Verificação:**
- Procurar por arquivos com `IndicadoresSkeleton`, `*Skeleton.tsx`
- Verificar que labels/text têm `text-sm`

**Ação:** Atualizar conforme padrão

---

### 10. Integração com Shadcn/ui

⚠️ **shadcn/ui é usado para Button, Dialog, Input, etc. — alguns têm estilos globais.**

**Exemplo:**
- `<Button>` pode ter `text-sm` por default
- `<Input label>` pode ter label com estilo global
- `<Dialog>` pode ter title com estilo definido

**Ação:**
- Verificar que não há classe conflitante (ex: `<Button className="text-xs">` sobrescrevendo global)
- Se houver, atualizar para `text-sm` ou remover inline class

---

## Regras Invioláveis

### ❌ Nunca Faça

1. Altere `.env`, `.env.local`, `next.config.ts`, `turbo.json`, `colors_and_type.css`, `app/globals.css`
2. Remova ou reescreva o bloco `headers()` em `next.config.ts` (segurança HTTP)
3. Remova o `withSentryConfig()` do `next.config.ts`
4. Edite manualmente `types/supabase.ts` (gerado automaticamente)
5. Use `select('*')` em queries Supabase
6. Envie `fazenda_id: ''` manualmente em payloads INSERT
7. Suprima `eslint-disable react-hooks/exhaustive-deps` — corrigir dependências
8. Ignore erros de TypeScript ou ESLint
9. Reescreva componentes inteiros sem instrução explícita
10. Delete ou remova espaços em branco como "cleanup"

### ✅ Sempre Faça

1. Leia o arquivo completo antes de editar
2. Use classes Tailwind, nunca valores `px` hardcoded inline
3. Mantenha shimmer lines (`::before`) em cards
4. Preserve KPI values (`text-2xl`, `text-3xl`)
5. Preserve colors semânticas (verde, dourado, vermelho, azul)
6. Preserve shadows, borders, radius
7. Preserve component structure (layout, gaps, flex/grid)
8. Teste com `npm run build` + `npm run test` após cada arquivo
9. Valide visual em dark mode, 375px + 1440px
10. Commit com mensagem clara (ex: "redesign(widgets): tipografia labels fase 2")

---

## Apêndice: Checklist de Execução Rápido

Use este checklist durante a execução para marcar progresso:

### Fase 2: Widgets (11 arquivos)

- [ ] 1. `GaugeOcupacaoSilos.tsx`
- [ ] 2. `KpiChartCard.tsx`
- [ ] 3. `LotesAtivosCard.tsx`
- [ ] 4. `MiniCardRebanho.tsx`
- [ ] 5. `MiniCardRebanhoClient.tsx`
- [ ] 6. `PieCategoriasRebanho.tsx`
- [ ] 7. `PieComposicaoRebanho.tsx`
- [ ] 8. `PieCulturasAtivas.tsx`
- [ ] 9. `SilagemMetricasCard.tsx`
- [ ] 10. `SilosInfoCard.tsx`
- [ ] 11. `SilosStatusCard.tsx`
- [ ] ✅ `npm run build` + `npm run test`

### Fase 3a: Silos + Talhões + Frota (42 arquivos)

**Silos (11):**
- [ ] 12. `silos/page.tsx`
- [ ] 13. `silos/[id]/page.tsx`
- [ ] 14. `components/SiloCard.tsx`
- [ ] 15. `components/SiloDetailHeader.tsx`
- [ ] 16. `components/tabs/VisaoGeralTab.tsx`
- [ ] 17. `components/tabs/EstoqueTab.tsx`
- [ ] 18. `components/tabs/QualidadeTab.tsx`
- [ ] 19. `components/dialogs/SiloForm.tsx`
- [ ] 20. `components/dialogs/MovimentacaoDialog.tsx`
- [ ] 21. `components/dialogs/AvaliacaoBromatologicaDialog.tsx`
- [ ] 22. `components/dialogs/AvaliacaoPspsDialog.tsx`

**Talhões (18):**
- [ ] 23. `talhoes/page.tsx`
- [ ] 24. `talhoes/[id]/page.tsx`
- [ ] 25-32. (componentes, tabs, dialogs - aplicar padrão genérico)

**Frota (13):**
- [ ] 33. `frota/page.tsx`
- [ ] 34-42. (componentes, dialogs - aplicar padrão genérico)

- [ ] ✅ `npm run build` + `npm run test`
- [ ] ✅ Visual review desktop + mobile + responsividade 375px

### Fase 3b: Rebanho (85 arquivos)

**Componentes (48):**
- [ ] 43-90. (aplicar padrão genérico a cada arquivo)
- [ ] ✅ `npm run build` + `npm run test`

**Páginas (37):**
- [ ] 91-127. (aplicar padrão genérico a cada página)
- [ ] ✅ `npm run build` + `npm run test`
- [ ] ✅ Visual review desktop + mobile + contraste WCAG AA

### Fase 5: QA Final

- [ ] `npm run build` ✅
- [ ] `npm run test` ✅
- [ ] `npm run lint` ✅
- [ ] Visual review completo de todas as 140 páginas (dark + light, 375/768/1440px)
- [ ] Contraste WCAG AA (axe DevTools) — todas as mudanças
- [ ] Funcionalidade cruzada:
  - [ ] Dashboard principal → widgets → navigation para subpáginas
  - [ ] Silos: cadastro, edição, dialogs
  - [ ] Talhões: cadastro, ciclo, atividades
  - [ ] Frota: manutenção, abastecimento, custos
  - [ ] Rebanho: todos os 6 submodules + forms/dialogs
- [ ] Responsividade real (375/768/1440px) em todos os módulos
- [ ] ✅ Merge para main

---

## Fase 9 — Consolidação de Módulos Pendentes (Fases 3c, 3d, 3e, 4)

**Status:** Planejado  
**Contexto:** Esta fase consolida os itens que ficaram de fora das SPEC Fases 2-5, agrupando as seções de Auth, Admin, Financeiro e Forms numa visão estratégica única.

---

### 9.1 — Auth + Operador (ex-Fase 3c)

**Objetivo:**  
Refinar a experiência de autenticação (login, registro, recuperação de senha) e implementar o dashboard do operador com suas permissões específicas e fluxos isolados.

**Entregáveis:**
- `app/page.tsx` — Landing page com cards de features
- `app/login/page.tsx` — Form de login com email/senha
- `app/register/page.tsx` — Form de cadastro (Admin/Operador)
- `app/forgot-password/page.tsx` — Recuperação de senha
- `app/reset-password/page.tsx` — Reset de senha via link
- `app/operador/page.tsx` — Dashboard do operador (retirada/perda de silagem)
- `app/operador/silos/page.tsx` — Lista de silos (operador, acesso restrito)
- **Componentes auth:** `LoginForm.tsx`, `RegisterForm.tsx`, `PasswordRecoveryForm.tsx`
- **Páginas legais:** `app/termos/page.tsx`, `app/privacidade/page.tsx`

**Mudanças de Tipografia:**
- Section labels: `text-[0.475rem]` → `text-sm`
- Form labels: `text-xs` → `text-sm`
- Error/info messages: `text-xs` → `text-sm`
- Feature card titles: `text-xs`/`text-[11px]` → `text-sm`
- Status badges: `text-xs` → `text-sm`

**Dependências:**
- Fase 2 completa (widgets com tipografia atualizada)
- Middleware de autenticação (já implementado em `middleware.ts`)
- RLS + policies de operador (já em banco de dados)

**Prioridade:** 🔴 Alta

**Risco de Regressão:** Médio
- Risco: Alterar fluxo de login pode quebrar sessões de usuários existentes
- Mitigação: Não alterar lógica de autenticação; apenas tipografia e UI

**Critério de Aceite:**
- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run test` passa todos os testes de auth (se houver)
- [ ] Páginas de auth renderizam com tipografia consistente
- [ ] Operador consegue fazer login e acessar dashboard restrito
- [ ] Admin consegue ver painel completo (contraste com operador)
- [ ] Contraste WCAG AA em todos os forms
- [ ] Responsividade 375px / 768px / 1440px
- [ ] Visual review dark + light mode

---

### 9.2 — Planejamento, Calculadoras e Configurações (ex-Fase 3d)

**Objetivo:**  
Atualizar módulos administrativos de planejamento agrícola, ferramentas de cálculo e configurações de fazenda/perfil com hierarquia tipográfica uniforme.

**Entregáveis:**

#### Planejamento de Silagem
- `app/dashboard/planejamento-silagem/page.tsx` — Wizard container (4 etapas)
- `app/dashboard/planejamento-silagem/historico/page.tsx` — Histórico de simulações
- **Componentes:** `WizardContainer.tsx`, `TabelaHistorico.tsx`, `DialogDetalhes.tsx`, `DialogExcluir.tsx`, `DialogEditarNome.tsx`

#### Calculadoras Agronômicas
- `app/dashboard/calculadoras/page.tsx` — Tabs (Calagem, Adubação NPK)
- **Componentes:** `CalagemCalculator.tsx`, `NPKCalculator.tsx`

#### Configurações
- `app/dashboard/configuracoes/page.tsx` — Tabbed settings (Perfil, Propriedade, Usuários)
- **Componentes:** `FormPerfil.tsx`, `CardFazenda.tsx`, `TabelaUsuarios.tsx`

**Mudanças de Tipografia:**
- Form labels: `text-xs` → `text-sm`
- Wizard step headers: `text-[11px]` → `text-sm`
- Table headers: `text-xs` → `text-sm`
- Section labels: `text-[0.475rem]` → `text-sm`
- Input helpers: `text-xs` → `text-sm` (se crítico para UX)
- Status badges: `text-xs` → `text-sm`
- Result/info cards: labels `text-xs` → `text-sm`

**Dependências:**
- Fases 2, 3a, 3b completas
- Database schema para fazendas, usuários, configurações (já pronto)

**Prioridade:** 🟠 Média

**Risco de Regressão:** Baixo
- Apenas tipografia e UI — sem alteração de lógica de dados
- Formulários já estão consolidados

**Critério de Aceite:**
- [ ] `npm run build` sem erros
- [ ] `npm run test` passa
- [ ] Wizard de planejamento renderiza com labels legíveis em todas as 4 etapas
- [ ] Calculadoras exibem results com `text-sm` (labels) e valores grandes (KPI)
- [ ] Tela de configurações com tabs e forms consistentes
- [ ] Contraste WCAG AA em todos os formulários
- [ ] Responsividade mobile adequada
- [ ] Visual review completo

---

### 9.3 — Financeiro, Relatórios, Calendário, Insumos e Tempo (ex-Fase 3e)

**Objetivo:**  
Atualizar módulos auxiliares (financeiro, insumos, relatórios, calendário, previsão de tempo) com tipografia unificada e padrão de labels/KPIs.

**Entregáveis:**

#### Financeiro
- `app/dashboard/financeiro/page.tsx` — DRE, fluxo de caixa, análise de lucratividade
- **Componentes:** Charts (Recharts), tabelas de lançamentos, KPI cards

#### Insumos
- `app/dashboard/insumos/page.tsx` — Inventory dashboard (estoque, movimentações, alertas)
- **Componentes:** Cards de estoque, tabelas, modais de entrada/saída

#### Relatórios
- `app/dashboard/relatorios/page.tsx` — Report builder (cards com export options)
- Exporta: Financeiro, Silos, Talhões, Animais (XLSX)

#### Calendário
- `app/dashboard/calendario/page.tsx` — Calendar/Timeline view (3 tabs: mensal, semanal, lista)
- **Componentes:** `CalendarioView.tsx`, `EventoCard.tsx`

#### Previsão de Tempo
- `app/dashboard/previsao-tempo/page.tsx` — Weather dashboard (forecast + current conditions)

**Mudanças de Tipografia:**
- Card titles: `text-[11px]`/`text-xs` → `text-sm`
- Section headers: `text-[0.475rem]` → `text-sm`
- Table headers: `text-xs` → `text-sm`
- Legend text (charts): `text-xs` → `text-sm`
- KPI labels: `text-[0.475rem]` → `text-sm` (preservar values `text-2xl`/`text-3xl`)
- Event/activity labels: `text-xs` → `text-sm`
- Status badges: `text-xs` → `text-sm`
- Weather condition labels: `text-xs` → `text-sm`

**Dependências:**
- Fases 2, 3a, 3b completas
- Database: `financeiro`, `insumos`, `movimentacoes_insumo` (já prontos)
- API de clima (OpenWeather — já integrada)

**Prioridade:** 🟠 Média

**Risco de Regressão:** Baixo-Médio
- Gráficos (charts) podem ter quebras visuais se legends forem alteradas
- Mitigação: Testar visualmente após mudanças em gráficos

**Critério de Aceite:**
- [ ] `npm run build` sem erros
- [ ] `npm run test` passa
- [ ] Financeiro: DRE, fluxo de caixa, gráficos com labels legíveis
- [ ] Insumos: cards de estoque, tabelas, KPIs com tipografia consistente
- [ ] Relatórios: cards com títulos e botões de download visíveis
- [ ] Calendário: tabs funcionando, eventos com labels legíveis
- [ ] Tempo: forecast com labels e temperatura legível
- [ ] Contraste WCAG AA em todas as mudanças
- [ ] Responsividade 375px / 768px / 1440px
- [ ] Gráficos (charts) não sofrem quebra visual após atualização de legends

---

### 9.4 — Forms e Dialogs Adicionais (ex-Fase 4)

**Objetivo:**  
Consolidar padrão de formulários e diálogos em todos os módulos, garantindo acessibilidade, validação Zod e responsividade.

**Entregáveis:**

#### Formulários e Diálogos por Módulo
- **Silos:** `SiloForm.tsx`, `MovimentacaoDialog.tsx`, `AvaliacaoBromatologicaDialog.tsx`, `AvaliacaoPspsDialog.tsx` (4)
- **Talhões:** `TalhaoForm.tsx`, `CicloForm.tsx`, `AtividadeDialog.tsx`, `*Fields.tsx` (8)
- **Frota:** `MaquinaDialog.tsx`, `PlanoManutencaoDialog.tsx`, `ManutencaoDialog.tsx`, `AbastecimentoDialog.tsx`, `UsoDialog.tsx` (5)
- **Rebanho:** `AnimalForm.tsx`, `LoteForm.tsx`, `EventoDialog.tsx`, `*Form*.tsx` (15+)
- **Auth:** `LoginForm.tsx`, `RegisterForm.tsx`, `PasswordRecoveryForm.tsx` (3)
- **Configurações:** `FormPerfil.tsx`, `FormFazenda.tsx`, `FormUsuarios.tsx` (3)

**Total:** ~25-30 formulários/diálogos

**Mudanças Padronizadas:**
- Todos os `<Label>` devem ter `text-sm` (shadcn default ou explicit)
- Form section headers: `text-[0.475rem]` → `text-sm`
- Input helpers/descriptions: `text-xs` → `text-sm` (se crítico)
- Error messages: `text-xs` → `text-sm`
- Dialog titles: `text-lg` / `text-xl` (preservar — maiores)
- Buttons: usar shadcn defaults (já com estilos corretos)

**Dependências:**
- Fases 2, 3a, 3b, 3c, 3d, 3e completas
- React Hook Form + Zod (já integrados)
- shadcn/ui (Form, Input, Label, Dialog) — já configurados

**Prioridade:** 🟡 Baixa (post-launch)

**Risco de Regressão:** Baixo
- Apenas tipografia — sem alteração de validação/lógica
- shadcn componentes já estão bem integrados

**Critério de Aceite:**
- [ ] `npm run build` sem erros
- [ ] `npm run test` passa (incluindo validação Zod)
- [ ] Todos os formulários renderizam com `<Label>` em `text-sm`
- [ ] Error messages legíveis (`text-sm`)
- [ ] Dialogs com títulos claros e labels consistentes
- [ ] Botões com estilos consolidados (shadcn)
- [ ] Acessibilidade: labels associados a inputs, focus states visíveis
- [ ] Responsividade mobile: forms não overflow, inputs redimensionam
- [ ] Contraste WCAG AA em todos os inputs/labels
- [ ] Visual review de 5-10 formulários representativos

---

## Resumo Executivo — Fase 9

**📊 Consolidação de Módulos Pendentes**

| Seção | # Arquivos | Prioridade | Tempo Est. | Status |
|---|---|---|---|---|
| 9.1 Auth + Operador | 9 | 🔴 Alta | 2-3h | Planejado |
| 9.2 Planejamento + Calc + Config | 10 | 🟠 Média | 2-3h | Planejado |
| 9.3 Financeiro + Insumos + Relatórios + Calendário + Tempo | 15+ | 🟠 Média | 3-4h | Planejado |
| 9.4 Forms + Dialogs | 25-30 | 🟡 Baixa | 3-4h | Planejado |
| **Total Fase 9** | **59-64** | — | **10-14h** | **Planejado** |

### Itens Consolidados na Fase 9

**De Fase 3c (Auth):**
- Landing page, Login, Register, Forgot-password, Reset-password
- Operador dashboard e silos restrito
- Termos e Privacidade

**De Fase 3d (Admin):**
- Planejamento de Silagem (4 etapas + histórico)
- Calculadoras Agronômicas (Calagem, NPK)
- Configurações (Perfil, Propriedade, Usuários)

**De Fase 3e (Auxiliar + Financeiro):**
- Financeiro (DRE, fluxo de caixa)
- Insumos (estoque, movimentações)
- Relatórios (export XLSX)
- Calendário (eventos, timeline)
- Previsão de Tempo

**De Fase 4 (Forms):**
- ~25-30 formulários e diálogos consolidados
- Padrão React Hook Form + Zod
- Acessibilidade + responsividade garantidas

### Sugestão de Ordem de Execução

1. **Fase 9.1 (Auth + Operador)** — 2-3h
   - Depende: Fases 2-3b ✅
   - Risco: Médio (lógica de auth sensível)
   - Pode ser executada primeiro após Fase 3b

2. **Fase 9.2 (Planejamento + Calc + Config)** — 2-3h
   - Depende: Fases 2-3b ✅
   - Risco: Baixo (apenas UI)
   - Executar após 9.1

3. **Fase 9.3 (Financeiro + Auxiliares)** — 3-4h
   - Depende: Fases 2-3b ✅
   - Risco: Baixo-Médio (charts podem quebrar)
   - Executar após 9.2 (paralelo possível com 9.1)

4. **Fase 9.4 (Forms + Dialogs)** — 3-4h
   - Depende: Fases 2-3b + 9.1, 9.2, 9.3 (parcialmente)
   - Risco: Baixo (post-launch, não bloqueia release)
   - Executar **após** release das Fases 2-3b (lower priority)

### Timeline Recomendado

```
Fase 1 (Dashboard)        ✅ Completo
   ↓
Fase 2 (Widgets)          ⏳ ~2-3h
   ↓
Fase 3a (Silos+Tal+Frota) ⏳ ~8-10h
   ↓
Fase 3b (Rebanho)         ⏳ ~5-6h
   ↓ (Validação + QA)
Fase 5 (QA Final)         ⏳ ~2h
   ↓ RELEASE
Fase 9.1 (Auth)           ⏳ ~2-3h (paralelo com 9.2/9.3 possível)
Fase 9.2 (Admin)          ⏳ ~2-3h
Fase 9.3 (Auxiliar)       ⏳ ~3-4h
Fase 9.4 (Forms)          ⏳ ~3-4h (post-launch, low priority)
   ↓ (QA)
Fase 5b (QA Final Phase 9) ⏳ ~1-2h
   ↓ RELEASE 2
```

**Total Fases 2-5:** ~17-19h (release principal)  
**Total Fase 9:** ~10-14h (release secundário ou post-launch)  
**Tempo Total:** ~27-33h de desenvolvimento + QA

---

**Data de Geração:** 11/05/2026 (atualizada com Talhões + Frota + Fase 9)  
**Pronto para Execução:** Sim ✅  
**Próxima Ação:** Iniciar Fase 2 (11 Widgets) → Fases 3a/3b → Fase 5 (QA) → Fase 9  
**Escopo Total Confirmado:** 200+ arquivos (Fase 2: 11 + Fase 3a: 42 + Fase 3b: 85 + Fase 9: 59-64 + Fase 5: QA)
