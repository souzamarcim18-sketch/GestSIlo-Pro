# PRD — Calendário Unificado

**Versão**: 1.0  
**Data**: 2026-05-24  
**Status**: Aprovado para especificação

---

## 1. Contexto e Motivação

O módulo Calendário atual (`/dashboard/calendario`) exibe exclusivamente eventos DAP da tabela `eventos_dap` — operações agrícolas planejadas por Dias Após o Plantio. O produtor que quiser saber o que aconteceu ou vai acontecer na propriedade precisa visitar 7 módulos distintos.

O dashboard possui um card "Atividades Recentes" sem implementação: botão "Ver tudo" é `<button>` sem `href`, e o corpo exibe apenas um empty state com ícone `TrendingUp`.

A demanda é consolidar **todos os eventos temporais de todos os módulos** em um único feed cronológico, com hierarquia visual por módulo, filtro por fonte e navegação para registros individuais.

---

## 2. Objetivos

1. Transformar `/dashboard/calendario` em um calendário unificado que agrega eventos de 11 fontes distintas.
2. Implementar o card "Atividades Recentes" no dashboard como uma janela de 3 dias do mesmo feed, reutilizando a mesma lógica de agregação.
3. Conectar o botão "Ver tudo" do card ao `/dashboard/calendario`.
4. Manter as três visões existentes (Lista, Semanal, Mensal) e os filtros.

---

## 3. Fontes de Eventos (todas as fontes na v1)

A diferenciação entre fontes é visual (cor/ícone por módulo), não por exclusão. Filtro por módulo na UI resolve o volume.

### 3.1 Tabela de mapeamento

| # | Tabela | Campo de data principal | Campo secundário | Nota |
|---|--------|------------------------|------------------|------|
| 1 | `eventos_dap` | `data_esperada` | `data_realizada` | Já no calendário atual |
| 2 | `atividades_campo` | `data` | — | Operações reais de talhão |
| 3 | `manutencoes` | `data_realizada` (se preenchida) ou `data_prevista` | `proxima_manutencao` | Ver §3.2 |
| 4 | `eventos_rebanho` | `data_evento` | — | Soft-delete via `deleted_at` |
| 5 | `eventos_sanitarios` | `data_evento` | `data_proxima_dose` | `data_proxima_dose` = evento futuro separado |
| 6 | `atividades_mao_obra` | `data` | — | |
| 7 | `eventos_manejo_pastagem` | `data` | — | |
| 8 | `ocupacoes_piquete` | `data_entrada` | `data_saida_prevista`, `data_saida_real` | Gera 2 eventos: entrada e saída |
| 9 | `movimentacoes_silo` | `data` | — | |
| 10 | `movimentacoes_insumo` | `data` | — | |
| 11 | `movimentacoes_produto` | `data` | — | |

### 3.2 Regra de data para `manutencoes`

- Se `data_realizada IS NOT NULL` → evento aparece em `data_realizada` com status "Concluído"
- Se `data_realizada IS NULL` → evento aparece em `data_prevista` com status "Planejado" (ou "Atrasado" se `data_prevista < hoje`)
- `proxima_manutencao` gera um segundo evento separado com label "Próxima manutenção" se preenchido e no futuro

### 3.3 Regra de data para `eventos_sanitarios`

- `data_evento` → evento passado (vacinação/tratamento realizado)
- `data_proxima_dose` → evento futuro separado com label "Próxima dose" se preenchido e no futuro

### 3.4 Regra de data para `ocupacoes_piquete`

- `data_entrada` → evento "Entrada no piquete"
- `data_saida_real` (se preenchida) → evento "Saída do piquete" na data real
- `data_saida_prevista` (se `data_saida_real IS NULL`) → evento "Saída prevista" na data planejada

### 3.5 Regra de exclusão de `eventos_rebanho`

Filtrar `deleted_at IS NULL` — eventos com soft-delete não aparecem.

---

## 4. Tipo Unificado de Evento

```typescript
type ModuloCalendario =
  | 'lavoura_dap'
  | 'lavoura_atividade'
  | 'frota'
  | 'rebanho'
  | 'sanidade'
  | 'mao_obra'
  | 'pastagem_manejo'
  | 'pastagem_ocupacao'
  | 'silo'
  | 'insumo'
  | 'produto';

type StatusEventoCalendario = 'planejado' | 'realizado' | 'atrasado' | 'concluido';

interface EventoCalendario {
  id: string;               // id original da tabela fonte
  fonte: string;            // nome da tabela fonte (para rastreabilidade)
  modulo: ModuloCalendario;
  titulo: string;           // ex: "Adubação — Talhão Norte"
  subtitulo?: string;       // ex: "Milho Safrinha" ou "R$ 1.200,00"
  data: string;             // ISO date string (a data que aparece no calendário)
  status: StatusEventoCalendario;
  href?: string;            // link de navegação para o registro (quando existir)
}
```

---

## 5. Hierarquia Visual por Módulo

| Módulo | Cor de acento | Ícone Lucide |
|--------|--------------|--------------|
| `lavoura_dap` | verde (`#00A651`) | `Sprout` |
| `lavoura_atividade` | verde-escuro | `Shovel` |
| `frota` | azul | `Wrench` |
| `rebanho` | âmbar | `Beef` |
| `sanidade` | vermelho-suave | `Syringe` |
| `mao_obra` | roxo | `HardHat` |
| `pastagem_manejo` | verde-lima | `Leaf` |
| `pastagem_ocupacao` | verde-lima claro | `PawPrint` |
| `silo` | laranja | `Archive` |
| `insumo` | ciano | `Package` |
| `produto` | índigo | `ShoppingBag` |

As cores devem usar CSS custom props (`var(--...)`) ou classes Tailwind — nunca hardcode inline.

---

## 6. Filtros da UI

Manter filtros atuais (talhão, cultura, status) e acrescentar:

- **Módulo** (multiselect): checkboxes ou Select múltiplo com todos os 11 módulos; padrão = todos marcados
- **Período**: seletor de data início / fim (além da navegação mensal/semanal já existente)

Os filtros de talhão e cultura passam a ser específicos do módulo lavoura e ficam visíveis apenas quando `lavoura_dap` ou `lavoura_atividade` estão selecionados no filtro de módulo.

---

## 7. Card "Atividades Recentes" no Dashboard

### 7.1 Comportamento

- Exibe os eventos dos **últimos 3 dias** (D-2, D-1 e hoje) do mesmo feed unificado
- Ordenação: data desc (mais recente primeiro), depois por módulo como critério de desempate
- Limite: máximo 8 itens na listagem
- Se não houver eventos: exibe empty state (manter ícone `TrendingUp` atual)

### 7.2 Alterações no DashboardClient.tsx

- Botão "Ver tudo" → `<Link href="/dashboard/calendario">Ver tudo</Link>` (Nextjs `Link`, não `<a>`)
- Substituir o corpo vazio do card por lista de eventos (componente `AtividadesRecentesList`)
- Os dados chegam via prop do RSC (`page.tsx`), **não via fetch client-side**
- O RSC de `page.tsx` já faz ~18 queries paralelas; as queries do feed dos 3 dias se somam nesse `Promise.all`

### 7.3 Queries necessárias no dashboard RSC (janela 3 dias)

As queries filtram `data >= D-2` para cada uma das 11 tabelas. Como volume é pequeno (3 dias), podem ser queries simples sem paginação. Resultado é passado como `initialAtividadesRecentes: EventoCalendario[]` para `DashboardClient`.

---

## 8. Arquitetura de Implementação

### 8.1 Arquivo de queries centralizado

```
lib/supabase/calendario.ts
```

Exporta:
- `getEventosCalendario(supabase, filtros: FiltrosCalendario): Promise<EventoCalendario[]>`
  - Executa `Promise.allSettled` nas 11 fontes (falha em uma não bloqueia as demais)
  - Recebe `dataInicio` e `dataFim` obrigatórios para aplicar `.gte/.lte` em cada tabela
  - Recebe `modulos?: ModuloCalendario[]` para pular tabelas não selecionadas
  - Normaliza cada resultado para `EventoCalendario[]`
  - Ordena o array final por `data` (asc para calendário, desc para dashboard)

- `getAtividadesRecentes(supabase): Promise<EventoCalendario[]>`
  - Chama `getEventosCalendario` com janela D-2 até hoje
  - Limita a 8 itens após ordenação desc

### 8.2 Arquivo de tipos

```
lib/types/calendario.ts
```

Exporta `ModuloCalendario`, `StatusEventoCalendario`, `EventoCalendario`, `FiltrosCalendario`.

### 8.3 Estrutura de arquivos alterados/criados

```
lib/
├── types/
│   └── calendario.ts                    # NOVO — tipos unificados
└── supabase/
    └── calendario.ts                    # NOVO — queries agregadas

app/dashboard/
├── page.tsx                             # ALTERADO — adicionar getAtividadesRecentes ao Promise.all
├── DashboardClient.tsx                  # ALTERADO — AtividadesRecentesList + Link "Ver tudo"
└── calendario/
    ├── page.tsx                         # ALTERADO — passar filtros para getEventosCalendario
    └── CalendarioClient.tsx             # ALTERADO — filtro de módulo, cores, ícones por módulo

components/
└── dashboard/
    └── AtividadesRecentesList.tsx       # NOVO — lista compacta reutilizável
```

### 8.4 Padrão RSC obrigatório

- `calendario/page.tsx` é RSC: busca dados iniciais (mês atual) via `getEventosCalendario`, passa como `initialEventos`
- Re-fetch ao mudar mês/filtros: substituir o `fetch` client-side atual (que usa cliente anônimo) por `router.refresh()` + searchParams na URL, ou Server Action — **nunca usar `import { supabase } from '@/lib/supabase'` no Client Component do calendário** (violação atual a corrigir)
- Dashboard: `page.tsx` chama `getAtividadesRecentes` no `Promise.all` existente

---

## 9. Permissões por Perfil

| Perfil | Acesso ao Calendário |
|---|---|
| **Administrador** | Vê todos os módulos |
| **Visualizador** | Vê todos os módulos (somente leitura — sem ações) |
| **Operador** | Sem acesso — `layout.tsx` deve redirecionar para `/operador` (comportamento atual do dashboard) |

As queries em `getEventosCalendario` já são filtradas por RLS (`fazenda_id` via `get_minha_fazenda_id()`). Tabelas com `sou_admin_ou_visualizador()` (insumos, produtos) retornam vazio para Operador via RLS sem necessidade de lógica condicional.

---

## 10. Navegação para Registros (href por módulo)

| Módulo | href template |
|---|---|
| `lavoura_dap` | `/dashboard/talhoes` (não há rota de detalhe por evento DAP) |
| `lavoura_atividade` | `/dashboard/talhoes` |
| `frota` | `/dashboard/frota` |
| `rebanho` | `/dashboard/rebanho/${animal_id}` (se `animal_id` disponível) |
| `sanidade` | `/dashboard/rebanho/sanidade` |
| `mao_obra` | `/dashboard/mao-de-obra` |
| `pastagem_manejo` | `/dashboard/pastagens/${pastagem_id}` (via join com `piquetes`) |
| `pastagem_ocupacao` | `/dashboard/pastagens/${pastagem_id}` |
| `silo` | `/dashboard/silos` |
| `insumo` | `/dashboard/insumos` |
| `produto` | `/dashboard/produtos` |

Quando não houver rota de detalhe por registro, `href` aponta para o hub do módulo. Itens sem `href` não são clicáveis.

---

## 11. Visões do Calendário

Manter as três visões existentes com adaptações:

### Lista
- Coluna "Módulo" com badge colorido por `modulo`
- Coluna "Título" com subtítulo abaixo em `text-xs text-muted-foreground`
- Linha clicável quando `href` estiver preenchido

### Semanal e Mensal
- Ponto/chip colorido por módulo (não emoji — usar `<span>` com `className` baseado no módulo)
- Tooltip ou popover com título + subtítulo ao hover (opcional na v1)
- Limite de eventos visíveis por célula: 3 (mensal), 4 (semanal); excedente como "+N"

---

## 12. Fora do Escopo da v1

- Criação de eventos diretamente pelo calendário (o calendário é somente leitura)
- Drag-and-drop para reagendar eventos
- Exportação iCal / Google Calendar
- Notificações push por evento do calendário (já coberto pelo cron de alertas)
- Filtro por responsável/colaborador

---

## 13. Critérios de Aceitação

1. `/dashboard/calendario` exibe eventos de todas as 11 fontes, diferenciados por cor/ícone
2. Filtro de módulo oculta/exibe fontes sem re-fetch ao banco
3. Navegação mensal/semanal busca novos dados sem usar cliente anônimo no Client Component
4. Card "Atividades Recentes" no dashboard lista eventos dos últimos 3 dias (máx 8)
5. Botão "Ver tudo" navega para `/dashboard/calendario`
6. Operador é redirecionado — não vê o calendário
7. `npm run build` sem erros TypeScript
8. `npm run test` com 741+ testes passando (sem regressões)

---

## 14. Dependências e Riscos

| Risco | Mitigação |
|---|---|
| Volume alto de queries (11 tabelas) no RSC do dashboard | `Promise.allSettled` — falha individual não bloqueia; janela de 3 dias mantém resultado pequeno |
| Re-fetch client-side atual usa cliente anônimo (violação de padrão) | Refatorar para searchParams + RSC ou Server Action durante a implementação |
| `movimentacoes_insumo` não tem `fazenda_id` explícito na Row | RLS via join com `insumos` (verificar se policy existe antes de implementar) |
| `manutencoes.fazenda_id` é `null \| string` (não obrigatório) | Filtrar `WHERE fazenda_id = get_minha_fazenda_id()` — registros sem fazenda_id não aparecem |

---

## 15. Glossário

| Termo | Significado |
|---|---|
| Feed unificado | Array `EventoCalendario[]` normalizado de todas as 11 fontes |
| Evento DAP | Operação agrícola planejada em Dias Após o Plantio (`eventos_dap`) |
| Janela de 3 dias | Intervalo `[hoje - 2 dias, hoje]` usado no card do dashboard |
| Módulo | Agrupamento lógico de fontes por área da propriedade (lavoura, frota, rebanho, etc.) |
