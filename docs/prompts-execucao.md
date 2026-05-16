# Prompts de Execução — Design System Redesign (2026-05-11 a 13)

**Documento de referência**: Registra os prompts utilizados em cada fase da implementação do redesign.

---

## Fase 1: Dashboard Principal (11/05/2026)

### Prompt Base
```
Redesign do dashboard GestSilo com:
1. Grid de 3 colunas para Silagem e Rebanho (vs. 4 colunas antes)
2. Tipografia uniforme: labels em text-sm (14px), não mais text-[0.475rem] ou text-xs
3. Novos componentes para consolidar padrões

Atualize:
- SilagemMetricasCard.tsx (criar)
- SilosInfoCard.tsx (criar)
- LotesAtivosCard.tsx (criar)
- KpiChartCard.tsx (tipografia)
- PieCategoriasRebanho.tsx (tipografia)
- PieComposicaoRebanho.tsx (tipografia)
- app/dashboard/page.tsx (grid 3 colunas)
```

**Resultado**: ✅ Concluído — 3 novos componentes, 7 arquivos atualizados

---

## Fase 2: Widgets Reutilizáveis (12/05/2026)

### Prompt Base
```
Atualizar widgets de reuso com novo padrão de tipografia:

Componentes a atualizar:
- GaugeOcupacaoSilos.tsx → labels em text-sm
- MiniCardRebanho.tsx / MiniCardRebanhoClient.tsx → labels em text-sm
- PieCulturasAtivas.tsx → text-[10px] → text-[12px]
- SilosStatusCard.tsx → text-[0.475rem] → text-sm

Padrão:
- Labels secundários: text-sm (14px)
- Valores principais: text-2xl/text-3xl + bold
- Descrições: text-xs (12px)
```

**Resultado**: ✅ Concluído — 5 widgets atualizados

---

## Fase 3a: Módulos Core (12/05/2026)

### Prompt Silagem
```
Atualizar módulo Silos com novo padrão:

Páginas:
- app/dashboard/silos/page.tsx (grid + cards KPI)
- app/dashboard/silos/[id]/page.tsx (detalhe)

Componentes:
- SiloForm.tsx (formulário)
- MovimentacaoDialog.tsx (diálogo)
- AvaliacaoBromatologicaDialog.tsx, AvaliacaoPspsDialog.tsx

Aplicar:
- KPI labels em text-sm
- Tabelas: headers em text-sm
- Tipografia uniforme
- Grid de 3 colunas para lista de silos
```

**Resultado**: ✅ Concluído — 8+ arquivos atualizados

### Prompt Talhões
```
Atualizar módulo Talhões com novo padrão:

Páginas:
- app/dashboard/talhoes/page.tsx
- app/dashboard/talhoes/[id]/page.tsx

Componentes:
- TalhaoForm.tsx
- AtividadeDialog.tsx
- AnaliseSoloFields.tsx

Aplicar:
- Card titles em text-sm
- KPI labels em text-sm
- Divider-based sections
- Padrão de tipografia uniforme
```

**Resultado**: ✅ Concluído — 8+ arquivos atualizados

### Prompt Frota
```
Atualizar módulo Frota:

Páginas:
- app/dashboard/frota/page.tsx
- app/dashboard/frota/[id]/page.tsx

Diálogos:
- AbastecimentoDialog.tsx
- ManutencaoDialog.tsx
- MaquinaDialog.tsx
- PlanoManutencaoDialog.tsx
- UsoDialog.tsx

Aplicar padrão:
- Dialog titles em text-sm
- Form labels em text-sm
- Table headers em text-sm
- Valores em text-2xl/text-3xl + bold
```

**Resultado**: ✅ Concluído — 12+ arquivos atualizados

---

## Fase 3b: Módulo Rebanho — Sub-módulos (12/05/2026)

### Prompt Hub Principal
```
Atualizar rebanho/page.tsx (hub):

Componentes:
- 6 cards de acesso rápido
- AnimaisList.tsx com filtros
- AnimalCard.tsx com badges
- AnimalFiltros.tsx

Aplicar:
- Card labels em text-sm
- Badge text em text-sm
- Filtros labels em text-sm
- Grid responsivo 3 colunas
```

**Resultado**: ✅ Concluído — 8+ arquivos atualizados

### Prompt Leiteira & Reprodução
```
Atualizar componentes de rebanho:

Componentes:
- AbaProducaoLeiteira.tsx
- AbaSanidade.tsx
- leiteira/DashboardLeiteiro.tsx
- reproducao/IndicadoresCard.tsx
- reproducao/CalendarioReprodutivo.tsx

Aplicar:
- Card labels em text-sm
- KPI labels em text-sm
- Table headers em text-sm
- Gráficos: legenda em text-sm
```

**Resultado**: ✅ Concluído — 10+ arquivos atualizados

### Prompt Corte & Sanidade
```
Atualizar dashboards de corte e sanidade:

Componentes:
- corte/DashboardCorte.tsx
- sanidade/SanidadeDashboard.tsx

Aplicar:
- Métrica labels em text-sm
- Calendário eventos em text-sm
- Alertas em text-sm
```

**Resultado**: ✅ Concluído — 5+ arquivos atualizados

### Prompt Reprodução Detalhes
```
Atualizar reprodução/reprodutores/:

Componentes:
- ReprodutoresClient.tsx
- ReprodutorDetailClient.tsx
- TabsNav.tsx

Aplicar:
- Abas labels em text-sm
- Reprodutor info em text-sm
- Cobertura table headers em text-sm
```

**Resultado**: ✅ Concluído — 6+ arquivos atualizados

### Prompt Eventos & Forms
```
Atualizar eventos rebanho:

Componentes:
- EventoDialog.tsx
- EventoForm/MorteForm.tsx
- EventoForm/NascimentoForm.tsx
- EventoForm/PesagemForm.tsx

Aplicar:
- Dialog titles em text-sm
- Form labels em text-sm
- Button text em text-sm
```

**Resultado**: ✅ Concluído — 6+ arquivos atualizados

### Prompt Extras Rebanho
```
Atualizar componentes auxiliares:

Componentes:
- HistoricoEventos.tsx
- ImportadorCSV.tsx
- AnimalForm.tsx

Aplicar:
- Timeline labels em text-sm
- Feedback messages em text-sm
- Form labels em text-sm
```

**Resultado**: ✅ Concluído — 5+ arquivos atualizados

---

## Fase 3c: Auth & Root Pages (12/05/2026)

### Prompt Auth Pages
```
Atualizar páginas de autenticação:

Páginas:
- app/login/page.tsx
- app/register/page.tsx
- app/forgot-password/page.tsx
- app/reset-password/page.tsx

Aplicar:
- Form labels em text-sm
- Error messages em text-sm
- Button text em text-sm
- Input labels em text-sm
```

**Resultado**: ✅ Concluído — 4 páginas atualizadas

### Prompt Root & Operador
```
Atualizar páginas root:

Páginas:
- app/page.tsx (landing)
- app/operador/page.tsx
- app/operador/silos/page.tsx

Aplicar:
- Section labels em text-sm
- Card titles em text-sm
- Button text em text-sm
- Dialog labels em text-sm
```

**Resultado**: ✅ Concluído — 3 páginas atualizadas

---

## Fase 3d: Planejamento, Calculadoras, Configurações (13/05/2026)

### Prompt Planejamento Silagem
```
Atualizar planejamento-silagem/:

Páginas:
- app/dashboard/planejamento-silagem/page.tsx
- app/dashboard/planejamento-silagem/historico/page.tsx

Componentes:
- Etapa1Sistema.tsx
- Etapa2Rebanho.tsx
- WizardContainer.tsx

Aplicar:
- Wizard step labels em text-sm
- Form labels em text-sm
- Result cards labels em text-sm
- Table headers em text-sm
```

**Resultado**: ✅ Concluído — 7+ arquivos atualizados

### Prompt Calculadoras
```
Atualizar calculadoras/:

Páginas:
- app/dashboard/calculadoras/page.tsx

Componentes:
- NPKCalculator.tsx
- CalagemCalculator.tsx

Aplicar:
- Tab titles em text-sm
- Form labels em text-sm
- Result labels em text-sm
- Unit text em text-sm
```

**Resultado**: ✅ Concluído — 3+ arquivos atualizados

### Prompt Configurações
```
Atualizar configuracoes/page.tsx:

Componentes:
- FormPerfil
- CardFazenda
- TabelaUsuarios

Aplicar:
- Tab titles em text-sm
- Form labels em text-sm
- Table headers em text-sm
- Input labels em text-sm
```

**Resultado**: ✅ Concluído — 2+ arquivos atualizados

---

## Fase 3e: Relatórios, Calendário, Insumos, Financeiro (13/05/2026)

### Prompt Relatórios & Calendário
```
Atualizar relatorios/ e calendario/:

Páginas:
- app/dashboard/relatorios/page.tsx
- app/dashboard/calendario/page.tsx

Aplicar:
- Card titles em text-sm
- Tab labels em text-sm
- Event labels em text-sm
- Button text em text-sm
```

**Resultado**: ✅ Concluído — 2 páginas atualizadas

### Prompt Insumos & Financeiro
```
Atualizar insumos/ e financeiro/:

Páginas:
- app/dashboard/insumos/page.tsx
- app/dashboard/financeiro/page.tsx

Componentes:
- AjusteInventario.tsx
- AlertsSection.tsx
- InsumoAutocomplete.tsx
- InsumoForm.tsx
- SaidaForm.tsx
- UltimasMovimentacoes.tsx

Aplicar:
- KPI labels em text-sm
- Table headers em text-sm
- Alert text em text-sm
- Form labels em text-sm
```

**Resultado**: ✅ Concluído — 8+ arquivos atualizados

---

## Fase 4: Forms & Dialogs (Backlog)

### Status
⏳ **Não executado** — 25+ arquivos  
**Motivo**: Prioridade baixa — podem ser atualizados em futuras iterações

**Arquivos pendentes:**
```
app/dashboard/*/components/dialogs/*.tsx (~15 files)
app/dashboard/*/components/forms/*.tsx (~10 files)
components/rebanho/*.tsx (formulários específicos)
```

---

## Fase 5: QA & Validação (13/05/2026)

### Validações Executadas
```bash
npm run build        # ✅ Zero erros TypeScript
npm run test         # ✅ Testes passando (646/646)
npm run lint         # ✅ Sem warnings novos
npm run clean        # Cache limpo
```

### Visual Review
- ✅ Light mode — tipografia legível
- ✅ Dark mode — contraste adequado
- ✅ Responsivo — mobile/tablet/desktop
- ✅ Cross-browser — Chrome, Firefox, Edge

---

## Template para Futuros Prompts

Use este template para manter consistência:

```
Atualizar módulo [NOME]:

Páginas:
- [path/page.tsx]

Componentes:
- [ComponentName.tsx]

Aplicar padrão:
✅ Labels: text-sm (14px)
✅ Valores: text-2xl/text-3xl + bold
✅ Descrições: text-xs (12px)
✅ Tabelas: headers em text-sm
✅ Diálogos: titles em text-sm
✅ Forms: labels em text-sm

Evitar:
❌ text-[0.475rem], text-[11px], text-[10px]
❌ Valores inline em px
❌ Mistura de escalas Tailwind
```

---

**Documentação completa**: Ver `CHANGELOG-redesign.md` e `PRD-design.md`
