# GestSilo — Plataforma de Gestão Agrícola

## Sobre a Aplicação
**GestSilo** é uma plataforma SaaS de gestão agrícola completa para pequenos e médios produtores brasileiros, com foco especializado em **gestão de silos de silagem**. Oferece visão integrada da propriedade rural através de módulos especializados (silos, talhões, frota, financeiro, etc.), funcionando tanto via web (Vercel) quanto como PWA (offline-ready).

---

## Stack Técnico

### Core
- **Frontend**: Next.js 15.5+ com App Router, React 19+
- **Banco de Dados**: Supabase (PostgreSQL) — região: West US (Oregon)
- **Deploy**: Vercel (production + preview automático por branch)
- **Linguagem**: TypeScript 5.9 strict
- **UI**: shadcn/ui + Tailwind CSS 4.1 + Lucide React
- **Recursos**: PWA offline-ready (`@serwist/next` + `serwist`), temas escuro/claro, gráficos (Recharts com `next/dynamic` + `ssr: false`), formulários (React Hook Form + Zod)

### Segurança & Infraestrutura
- **Rate Limiting**: Upstash Redis (`@upstash/ratelimit`) — rotas de auth protegidas
- **Headers HTTP**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy configurados em `next.config.ts`
- **Monitoramento**: Sentry (`@sentry/nextjs`) — captura erros em Client/Server Components e Server Actions
- **Backup**: GitHub Actions + Cloudflare R2 — backup semanal automatizado (toda domingo 3h UTC)
- **Testes**: Vitest — 900+ testes passando (inclui suite de auditoria RLS em `tests/security/`; 2 falhos pré-existentes documentados)

### Configuração de Tooling (auditoria 2026-05-29)
- **TypeScript target**: `ES2020` em `tsconfig.json` — habilita `Promise.allSettled`, `BigInt`, `globalThis` nativos sem polyfill
- **ESLint**: regra `@typescript-eslint/no-explicit-any: "error"` ativa em `eslint.config.mjs` — zero ocorrências de `any` no codebase
- **Dependências**: `shadcn` movido para `devDependencies` (sem import runtime); `@types/jspdf` removido (jsPDF 2.x expõe seus próprios tipos); `@testing-library/react` e `@testing-library/jest-dom` removidos (sem uso nos testes); `use-debounce` removido — hook debounce implementado localmente em `lib/hooks/useInsumos.ts`
- **CSP `unsafe-eval`**: remoção condicional (prod vs dev) pendente de aprovação — aguardar instrução explícita antes de alterar `next.config.ts`
- **PWA — migração Serwist (2026-05-29)**: `next-pwa` v5.6.0 (abandonado, sem suporte ao App Router) substituído por `@serwist/next` + `serwist` v9.5.x. Service Worker em `app/sw.ts` com 14 estratégias de cache. `tsconfig.json` recebeu `"webworker"` em `lib` e `public/sw.js` em `exclude`. `next.config.ts` usa `withSerwistInit` (wrapping externo, antes do `withSentryConfig`). SW desabilitado em `development`. Arquivos `workbox-*.js` removidos do `public/`.
- **Offline-Sync — épico T-OS (2026-05-29)**: sistema offline expandido com renovação de JWT antes de `syncAll`, `useSyncOnReconnect` ativado como fallback com backoff exponencial em `/operador`, `hydrateEventosFromServer` chamado na inicialização (RebanhoClient + operador), UX de conflitos com `ConflictResolutionModal` e badge no `SyncStatusBar`, prefetch proativo de dados críticos via `lib/db/prefetch.ts`, hook `useDadosOffline`, e badge offline no DashboardClient. Rota legada `/operador/silos` substituída por redirect para `/operador`.

---

## Autenticação & Autorização

### Perfis (roles)
O banco define **exatamente 3 perfis**:
```
'Administrador' | 'Operador' | 'Visualizador'
```
> ⚠️ `Gerente` **não existe** no banco. Se for criado futuramente, revisar condicionais de permissão em 6 arquivos (ver seção Regras Invioláveis).

### Fluxo de Login
- Login passa por API route `/api/auth/login` (rate limiting via Upstash)
- A rota usa `createServerClient` do `@supabase/ssr` e retorna redirect 303 com cookies
- Middleware usa `getUser()` (não `getSession()`) para validar sessão
- Middleware implementa `setAll()`/`remove()` de cookies (padrão correto do Supabase SSR)
- `AuthProvider` carrega perfil do `user_metadata` do JWT (rápido, sem query ao banco)
- `fetchProfile` existe como sincronização opcional em background

### Fonte de Verdade do Perfil
```typescript
// CORRETO — usar sempre:
profile.perfil  // 'Administrador' | 'Operador' | 'Visualizador'

// ERRADO — não usar:
profile.role    // campo legado removido
```

### Modelo de Autorização (definido em 2026-05-21)

| Perfil | Acesso |
|---|---|
| **Administrador** | Acesso total: todo o `/dashboard/*`, todas as operações CRUD |
| **Visualizador** | Apenas leitura: todo o `/dashboard/*`, nenhuma escrita |
| **Operador** | Exclusivamente `/operador` — registra saídas/fornecimentos/descartes de silos |

- **Operador nunca acessa `/dashboard`** — bloqueado em duas camadas (ver abaixo)
- **Visualizador nunca escreve** — bloqueado via RLS (`sou_admin_ou_visualizador()`) e ausência de botões de ação na UI
- `sou_gerente_ou_admin()` existe no banco mas equivale a `sou_admin()` na prática (perfil Gerente não existe)
- **Nunca usar `sou_operador_ou_admin()`** em novas Server Actions — função obsoleta, não reflete o modelo atual

### Camadas de Proteção do Operador (implementadas em 2026-05-28)

**Camada 1 — Middleware SSR** (`middleware.ts`): lê `user_metadata.perfil` do JWT e redireciona para `/operador` qualquer Operador que tente acessar qualquer rota `/dashboard/*`. Executado antes do React, sem custo de hidratação.

**Camada 2 — Layout Guards** (`app/dashboard/*/layout.tsx`): guards client-side com `useAuth()` + `useEffect` em todos os módulos. Padrão de implementação:
```tsx
'use client';
export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && profile?.perfil === 'Operador') {
      toast.error('Acesso não permitido.');
      router.replace('/dashboard');
    }
  }, [profile, isLoading, router]);
  if (isLoading || profile?.perfil === 'Operador') return null;
  return <>{children}</>;
}
```
Módulos com guard de layout (criados em 2026-05-28): `silos`, `talhoes`, `frota`, `insumos`, `rebanho`, `financeiro`, `configuracoes`, `calculadoras` — somados aos 9 já existentes (`produtos`, `planejamento-compras`, `pastagens`, `mao-de-obra`, `balanco-forrageiro`, `calendario`, `assessoria`, `relatorios`, `planejamento-silagem`).

**Camada 3 — Helper RSC** (`lib/auth/guards.ts`): funções assíncronas para uso em Server Components quando necessário:
- `requirePerfil(perfisPermitidos[])` — base; redireciona via `redirect()` se perfil não consta na lista
- `requireAdmin()` — atalho para `['Administrador']`
- `requireAdminOuVisualizador()` — atalho para `['Administrador', 'Visualizador']`

### Proteção de Rotas UI
Botões de DELETE e ações destrutivas devem verificar perfil antes de renderizar:
```tsx
{profile?.perfil === 'Administrador' && (
  <Button onClick={() => setIsDeleteOpen(true)}>Excluir</Button>
)}
```
O banco bloqueia via RLS, mas a UI deve esconder o botão para evitar erro genérico ao usuário.

---

## Banco de Dados

### Padrões Obrigatórios
- **Nunca usar** `select('*')` — sempre listar colunas explicitamente
- Queries devem filtrar por `fazenda_id` (multi-tenancy via RLS)
- `fazenda_id` **nunca deve ser enviado manualmente** no payload de INSERT — o trigger do banco preenche automaticamente via `get_minha_fazenda_id()`
- Tipos TypeScript gerados automaticamente: `npm run db:types` (requer `SUPABASE_PROJECT_ID`)

### RLS (Row Level Security)
- Todas as tabelas autenticadas têm RLS ativo
- Policies usam `get_minha_fazenda_id()`, `sou_admin()`, `sou_gerente_ou_admin()`
- Essas funções usam `auth.jwt()` como fonte primária (rápido, sem query ao banco)
- A policy `profiles_select_mesma_fazenda` usa subquery inline (não chama `get_minha_fazenda_id()`) para evitar loop infinito

### Funções SQL Críticas
```sql
-- Retorna fazenda_id do usuário autenticado via JWT
get_minha_fazenda_id() → uuid

-- Verifica se usuário é Administrador via JWT
sou_admin() → boolean

-- Verifica se usuário é Administrador ou Visualizador via JWT (bloqueia Operador)
-- ✅ Usar esta para SELECT em módulos que Operador não acessa (produtos, planejamentos, financeiro)
sou_admin_ou_visualizador() → boolean

-- Existe no banco mas equivale a sou_admin() na prática (Gerente não existe)
-- ⚠️ Não usar em novas policies — preferir sou_admin() explicitamente
sou_gerente_ou_admin() → boolean
```

### Tabelas Principais
`silos`, `talhoes`, `maquinas`, `financeiro`, `profiles`, `fazendas`, `configuracoes_fazenda`,
`insumos`, `movimentacoes_insumo`, `ciclos_agricolas`, `atividades_campo`,
`planejamentos_silagem`, `planos_manutencao`, `manutencoes`,
`abastecimentos`, `uso_maquinas`,
`animais`, `lotes`, `eventos_rebanho`, `pesos_animal`, `reprodutores`,
`lactacoes`, `producoes_leiteiras`, `eventos_sanitarios`,
`eventos_parto_crias`, `parametros_reprodutivos_fazenda`,
`categorias_rebanho`,
`produtos`, `movimentacoes_produto`, `categorias_produto`,
`planejamentos_atividade`, `planejamento_insumos`,
`pastagens`, `piquetes`, `ocupacoes_piquete`, `eventos_manejo_pastagem`,
`colaboradores`, `atividades_mao_obra`, `atividades_mao_obra_colaboradores`,
`registros_colaborador`

### Índices Existentes (criados em 29/04/2026)
- `idx_planos_manutencao_fazenda_id`
- `idx_manutencoes_fazenda_id`
- `idx_abastecimentos_fazenda_id`
- `idx_uso_maquinas_fazenda_id`

### Índices Existentes — Pastagens (criados em 21/05/2026)
- `idx_pastagens_fazenda_id`
- `idx_piquetes_pastagem_id`
- `idx_piquetes_fazenda_id`
- `idx_piquetes_status`
- `idx_ocupacoes_piquete_id`
- `idx_ocupacoes_data_saida_real`
- `idx_ocupacoes_fazenda_id`
- `idx_eventos_manejo_piquete_id`

### Índices Existentes — Mão de Obra (criados em 22/05/2026)
- `idx_colaboradores_fazenda_id`
- `idx_colaboradores_fazenda_ativo`
- `idx_atividades_mao_obra_fazenda_id`
- `idx_atividades_mao_obra_fazenda_data`
- `idx_atv_mao_obra_colab_atividade_id`
- `idx_atv_mao_obra_colab_colaborador_id`

### Índices Existentes — Rastreabilidade de Colaboradores (criados em 22/05/2026)
- `idx_registros_colaborador_fazenda`
- `idx_registros_colaborador_ref`
- `idx_registros_colaborador_colaborador`

### Índices Existentes — Calendário (criados em 24/05/2026)
- `idx_atividades_campo_data_inicio`
- `idx_atividades_campo_data_fim`
- `idx_manutencoes_data_prevista`
- `idx_eventos_sanitarios_data_evento`
- `idx_producoes_leiteiras_data`
- `idx_eventos_rebanho_data`
- `idx_abastecimentos_data`
- `idx_uso_maquinas_data_uso`

---

## Estrutura Principal

```
app/
├── api/
│   ├── auth/
│   │   ├── login/route.ts          # Rate limiting + Zod (loginSchema) — erro genérico "Credenciais inválidas"
│   │   ├── register/route.ts       # Rate limiting + Zod (registerSchema)
│   │   ├── forgot-password/route.ts # Rate limiting + Zod (forgotPasswordSchema)
│   │   └── invite/route.ts         # Rate limiting + Zod (inviteSchema) — apenas Admin
│   ├── assessoria/
│   │   ├── solicitar-consulta/route.ts  # Zod inline (solicitarConsultaSchema); envia email ao consultor
│   │   └── agendamentos/
│   │       ├── route.ts            # GET (listar) apenas — PATCH removido desta rota estática
│   │       └── [id]/route.ts       # PATCH /api/assessoria/agendamentos/{id} — rota dinâmica correta
│   ├── weather/route.ts
│   └── geocoding/route.ts
├── dashboard/                       # Rotas autenticadas
│   ├── dashboard-data.ts            # Tipos DashboardData, AlertaCritico, AlertaTipo, AlertaSeveridade
│   ├── alertas-helpers.ts           # Funções puras: derivarAlertasEtapa1, derivarAlertasPastagens, formatarDataBR (re-exporta daysBetween de lib/utils)
│   ├── page.tsx                     # RSC: 18+ queries paralelas + construção de alertas
│   ├── DashboardClient.tsx          # Card Alertas Críticos dinâmico (ordenado por severidade); badge offline "Dados de HH:MM" via useMemo quando !isOnline
│   ├── silos/
│   ├── talhoes/
│   ├── frota/
│   ├── insumos/                     # Integrado com financeiro (registrar_como_despesa)
│   ├── calculadoras/
│   ├── planejamento-silagem/
│   ├── calendario/
│   ├── previsao-tempo/
│   ├── financeiro/
│   ├── relatorios/
│   ├── assessoria/                  # Em breve (badge no Sidebar)
│   ├── produtos/                    # Módulo completo (2026-05-19)
│   │   ├── layout.tsx               # Guard: redireciona Operador → /dashboard
│   │   ├── page.tsx                 # Página principal (estado, hooks, composição)
│   │   ├── actions.ts               # 7 Server Actions (criar/atualizar/deletar produto, entrada, saída, ajuste, deletar mov)
│   │   └── components/
│   │       ├── ProdutoForm.tsx       # Modal criar/editar produto
│   │       ├── EntradaForm.tsx       # Modal registrar entrada
│   │       ├── SaidaForm.tsx         # Modal registrar saída (+ campos condicionais por tipo_saida)
│   │       ├── TransferenciaInsumoForm.tsx  # Modal saída tipo TRANSFERENCIA_INSUMO
│   │       ├── AjusteInventario.tsx  # Modal ajuste de estoque
│   │       ├── AlertsSection.tsx     # Faixa de alertas estoque abaixo do mínimo
│   │       ├── ProdutosList.tsx      # Tabela de produtos com ações inline
│   │       ├── ProdutosFilters.tsx   # Busca + filtros categoria/status
│   │       ├── UltimasMovimentacoes.tsx  # Card com 10 movimentações mais recentes
│   │       ├── DeleteProdutoDialog.tsx   # Confirm dialog exclusão
│   │       └── ProdutoAutocomplete.tsx   # Combobox assíncrono (usado em TransferenciaInsumoForm)
│   ├── planejamento-compras/           # Módulo completo (2026-05-19)
│   │   ├── layout.tsx                   # Guard: redireciona Operador → /dashboard
│   │   ├── page.tsx                     # 2 abas: Atividades Planejadas + Lista de Compras
│   │   ├── actions.ts                   # 8 Server Actions
│   │   └── [id]/page.tsx                # Detalhe da atividade com insumos vinculados
│   ├── pastagens/                       # Módulo completo (2026-05-21)
│   │   ├── layout.tsx                   # Guard: redireciona Operador → /dashboard (client-side via useAuth)
│   │   ├── page.tsx                     # RSC hub: KPIs + grid de pastagens
│   │   ├── PastagensClient.tsx          # Client hub: KPIs, alertas, grid PastagemCard, modal nova pastagem
│   │   ├── actions.ts                   # 11 Server Actions (pastagem, piquete, ocupação, evento manejo)
│   │   ├── components/
│   │   │   ├── PastagemCard.tsx         # Card pastagem: nome, espécie, sistema, counters por status, ações
│   │   │   ├── PastagemForm.tsx         # Modal criar/editar pastagem (React Hook Form + Zod)
│   │   │   ├── DeletePastagemDialog.tsx # Confirm dialog exclusão pastagem (cascade warning)
│   │   │   ├── PiqueteCard.tsx          # Card piquete: status badge, UA/ha progress bar, lote, alertas
│   │   │   ├── PiqueteForm.tsx          # Modal criar/editar piquete
│   │   │   ├── DeletePiqueteDialog.tsx  # Confirm dialog exclusão piquete
│   │   │   ├── OcupacaoForm.tsx         # Modal entrada de lote: cálculo UA em tempo real, badge Peso real/Estimativa
│   │   │   ├── FecharOcupacaoDialog.tsx # Modal fechamento de ocupação (data saída, dossel, obs)
│   │   │   ├── HistoricoOcupacoes.tsx   # Tabela histórico de ocupações por piquete (até 50 registros)
│   │   │   ├── EventoManejoForm.tsx     # Modal evento de manejo: condicional por tipo (insumo, máquina, altera status)
│   │   │   └── EventosManejoList.tsx    # Timeline de eventos de manejo com delete
│   │   └── [id]/
│   │       ├── page.tsx                 # RSC detalhe pastagem: generateMetadata + dados paralelos por piquete
│   │       └── PastagemDetailClient.tsx # Client: breadcrumb, KPI grid, tabs (Piquetes/Histórico/Eventos)
│   ├── mao-de-obra/                     # Módulo completo (2026-05-22)
│   │   ├── layout.tsx                   # Guard: redireciona Operador → /dashboard (client-side via useAuth)
│   │   ├── page.tsx                     # RSC hub: auth + Promise.all 7 queries (colaboradores, atividades, KPIs, talhões, silos, máquinas)
│   │   ├── MaoDeObraClient.tsx          # Client hub: 2 abas (Atividades | Colaboradores), KPIs, modais
│   │   ├── actions.ts                   # 6 Server Actions + 2 auxiliares
│   │   └── components/
│   │       ├── KpisSection.tsx          # 4 cards: custo do mês, qtd atividades, colaborador destaque, top 3 tipos
│   │       ├── ColaboradoresList.tsx    # Tabela: nome, função, vínculo, valor ref, status ativo/inativo, ações
│   │       ├── ColaboradorForm.tsx      # Modal criar/editar colaborador (RHF + Zod)
│   │       ├── DeleteColaboradorDialog.tsx  # Confirm dialog: soft-delete se tem histórico, hard-delete se não tem
│   │       ├── AtividadesList.tsx       # Tabela com 4 filtros (colaborador, tipo, data início/fim) + rodapé custo total
│   │       ├── AtividadeForm.tsx        # Modal criar/editar: multi-select colaboradores, preview custo em tempo real, vínculo RadioGroup
│   │       └── DeleteAtividadeDialog.tsx    # Confirm dialog com aviso de remoção da despesa em Financeiro
│   ├── suporte/
│   ├── configuracoes/
│   │   └── sincronizacao/page.tsx   # Página Admin: lista conflitos pendente_revisao, Descartar/Forçar envio, botão Sincronizar agora
│   ├── onboarding/
│   └── rebanho/
│       ├── page.tsx                 # Hub: 6 cards grandes + listagem de animais com filtros
│       ├── actions.ts               # Server Actions (criar/editar animal, lote)
│       ├── novo/page.tsx            # Cadastro de animal
│       ├── [id]/page.tsx            # Ficha do animal (abas: geral, pesagens, reprodução, leiteira, sanidade, histórico, corte)
│       ├── [id]/editar/page.tsx
│       ├── [id]/evento/page.tsx     # Registro de evento por animal
│       ├── lotes/
│       ├── importar/
│       ├── indicadores/             # Dashboard geral + KPIs + 4 alertas proativos
│       ├── reproducao/              # 4 abas: Dashboard, Histórico, Reprodutores, Parâmetros
│       │   ├── page.tsx             # Dashboard de reprodução (RSC — 12 queries paralelas)
│       │   ├── layout.tsx
│       │   ├── TabsNav.tsx
│       │   ├── eventos/page.tsx     # Aba "Histórico" — lista eventos reprodutivos filtráveis
│       │   ├── reprodutores/
│       │   │   ├── page.tsx
│       │   │   ├── ReprodutoresClient.tsx
│       │   │   └── [id]/
│       │   │       ├── page.tsx               # Server Component — busca reprodutor + coberturas
│       │   │       └── ReprodutorDetailClient.tsx  # Client Component — useAuth, permissões, UI
│       │   ├── parametros/page.tsx
│       │   ├── indicadores/page.tsx # redirect → /dashboard/rebanho/reproducao
│       │   └── repetidoras/page.tsx # redirect → /dashboard/rebanho/reproducao
│       ├── leiteira/page.tsx        # Dashboard leiteiro + registro de produção
│       ├── corte/page.tsx           # Dashboard de corte + pesagem em lote + projeção de abate
│       ├── sanidade/page.tsx        # Alertas sanitários + calendário + registro de eventos
│       └── movimentacoes/page.tsx   # Movimentações consolidadas (entradas/saídas/transferências)
├── login/
├── register/
├── forgot-password/
└── page.tsx

components/
├── ui/                              # shadcn/ui
│   └── EmptyState.tsx               # Componente reutilizável para estados vazios (title, description?, icon?, action?)
├── widgets/
├── offline/
│   └── ConflictResolutionModal.tsx  # Modal de resolução de conflitos offline (Descartar / Forçar envio)
├── planejamento-compras/                # 10 componentes UI do módulo
├── Header.tsx
├── Sidebar.tsx                      # Item "Sincronização" adicionado (visível a Admin/Visualizador)
├── SyncStatusBar.tsx                # Exibe badge de conflitos clicável; polling de getSyncConflitos() a cada 10s
├── Breadcrumbs.tsx
└── CityAutocomplete.tsx

lib/
├── supabase/
│   ├── queries-audit.ts             # Queries principais (auditadas — select explícito)
│   ├── silos.ts
│   ├── talhoes.ts
│   ├── maquinas.ts
│   ├── financeiro.ts
│   ├── fazenda.ts
│   ├── operador.ts
│   ├── configuracoes.ts
│   ├── rebanho.ts                   # Queries animais, lotes, eventos, pesos, importação CSV
│   ├── rebanho-reproducao.ts        # Queries reprodutores, eventos reprodutivos, coberturas, lactações, parâmetros
│   ├── rebanho-leiteira.ts          # Queries producoes_leiteiras
│   ├── rebanho-sanitario.ts         # Queries eventos_sanitarios + listAlertasSanitarios()
│   ├── rebanho-movimentacoes.ts     # Queries de movimentações consolidadas
│   ├── rebanho-movimentacoes-actions.ts  # Helpers de movimentações
│   ├── rebanho-indicadores.ts       # Queries de alertas: partos, pesagens, vacas secas
│   ├── produtos.ts                  # Queries produtos, movimentacoes_produto, categorias_produto; listCategoriasProduto usa unstable_cache (TTL 1h, tag 'categorias-produto')
│   ├── planejamento-compras.ts      # Queries + função pura calcularLinhasRelatorio()
│   ├── pastagens.ts                 # Queries pastagens, piquetes, ocupações, eventos manejo, listPastagensParaAlertas(); getPastagemComResumo e getPiqueteById filtram fazenda_id explicitamente via getUser()+profiles
│   └── mao-de-obra.ts               # listColaboradores, getColaboradorComHistorico, listAtividades, getKpisMensais, hasAtividades, hasAtividadesFuturas, getAtividadeById, listColaboradoresDaAtividade
├── sentry/
│   └── allowlist.ts                 # Padrões de dados sensíveis filtrados do Sentry
├── auth/
│   ├── logger.ts
│   ├── rate-limit.ts                # Helpers Upstash ratelimit
│   └── guards.ts                    # requirePerfil(), requireAdmin(), requireAdminOuVisualizador() — para RSC
├── hooks/
│   ├── useOfflineSync.ts            # isOnline, pendentes, isSyncing; verifica JWT + refreshSession antes do syncAll; catch 401/JWT com toast
│   ├── useDadosOffline.ts           # lê qualquer TableName do IndexedDB; retorna { dados, isLoading }
│   └── (demais hooks via lib/hooks/)
├── types/
│   ├── pastagens.ts                 # SistemaPastejo, StatusPiquete, TipoEventoManejo, Pastagem, Piquete, OcupacaoPiquete, PastagemComResumo, FATORES_UA_POR_CATEGORIA
│   ├── mao-de-obra.ts               # FuncaoColaborador, VinculoColaborador, TipoValorColaborador, TipoAtividade, DuracaoTipo, Colaborador, AtividadeMaoObra, AtividadeComColaboradores, KpisMaoObra, HORAS_POR_DIA, FUNCOES_COLABORADOR, VINCULOS_COLABORADOR, TIPOS_ATIVIDADE
│   ├── rebanho-lote.ts              # TipoEventoRebanho (alias do enum, inclui aspiracao_opu, protocolo_hormonal, transferencia_embriao), TIPOS_EVENTO_LOTE, LABEL_TIPO_EVENTO, AnimalParaLote, WizardState, ResultadoLote
│   └── ...outros tipos por módulo
├── services/
├── db/
│   ├── localDb.ts                   # IndexedDB PWA (DB_VERSION=3; stores: sync_queue, movimentacoes_silo, atividades_campo, movimentacoes_insumo, financeiro, uso_maquinas, abastecimentos, eventos_rebanho)
│   ├── syncQueue.ts                 # enqueue(), enqueueRpc(), syncAll(), getSyncStatus(), getSyncConflitos()
│   ├── eventosRebanho.ts            # saveEventoLocal(), hydrateEventosFromServer(), getEventosByAnimal(), markAsSynced(), deleteEventoLocal(); EventoReprodutivoLocal union expandida com aspiracao_opu, protocolo_hormonal, transferencia_embriao
│   └── prefetch.ts                  # prefetchDadosCriticos(supabase, fazendaId) — Promise.allSettled; getPrefetchTimestamp()
├── validations/
│   ├── auth.ts                      # loginSchema, registerSchema, forgotPasswordSchema, inviteSchema
│   ├── silos.ts                     # siloSchema (lona2 adicionada), movimentacaoSiloSchema, avaliacaoBromatologicaSchema, avaliacaoPspsSchema, abrirSiloSchema
│   ├── mao-de-obra.ts               # colaboradorFormSchema, atividadeFormSchema (refine: max 1 vínculo)
│   ├── rebanho-lote.ts              # dadosCompartilhadosPorTipo, dadosIndividuaisPorTipo (discriminated unions), superRefine opu, criarEventosLoteSchema
│   └── README.md                    # Padrão B oficial (RHF + Zod + shadcn/ui); lista features com Padrão A pendentes de migração
├── calculadoras/
├── pdf/
├── constants/
├── utils.ts                         # formatBRL, formatDate, daysBetween, calcularCustoColaborador (hora↔dia, importável em Server Actions e Client Components)
└── supabase.ts

types/
└── supabase.ts                      # Gerado automaticamente via npm run db:types

providers/
└── AuthProvider.tsx                 # Carrega perfil do JWT user_metadata

middleware.ts                        # Valida sessão, setAll/remove cookies; redireciona Operador de /dashboard/* → /operador
sentry.client.config.ts
sentry.server.config.ts
instrumentation.ts
app/sw.ts                            # Service Worker Serwist — 14 estratégias de cache; /api/auth/* excluído do cache
app/~offline/page.tsx                # Página de fallback offline (precacheada pelo Serwist)
app/operador/page.tsx                # useOfflineSync (sync primário) + useSyncOnReconnect (fallback backoff); hydrate movimentacoes_silo ao montar; footer exibe lastSyncAt
app/operador/silos/page.tsx          # Rota legada — redirect('/operador')
.github/
└── workflows/
    └── backup-db.yml                # Backup semanal Cloudflare R2
```

---

## Padrões de Código

### RSC — Padrão Obrigatório para Páginas de Dashboard

Todas as páginas em `app/dashboard/*/page.tsx` devem ser **React Server Components**:

- `page.tsx` é RSC: autentica o usuário e busca dados iniciais em `Promise.all` com `createSupabaseServerClient()`
- Dados são passados como props para `*Client.tsx` (`'use client'`)
- Client Component **não usa `useAuth()` no mount** para buscar dados iniciais — recebe tudo via props
- Refetch client-side só ocorre em ação do usuário (filtro, mutação) ou via `router.refresh()` (que re-executa o RSC)

```typescript
// page.tsx — padrão
export default async function ExemploPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const [dados, profileRes] = await Promise.all([
    supabase.from('tabela').select('id, nome').eq('...', '...'),
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
  ]);

  return <ExemploClient initialDados={dados.data ?? []} isAdmin={profileRes.data?.perfil === 'Administrador'} />;
}
```

**Restrições importantes**:
- `queries-audit.ts` usa o cliente anônimo do browser — **não chamar de RSC**, apenas de Client Components
- Funções em `lib/supabase/*.ts` que importam `next/headers` (ex: `assessoria.ts`) **não podem ser importadas em Client Components** — usar `router.refresh()` nesses casos
- `fazenda_id` **nunca enviar em INSERT** — trigger do banco preenche via `get_minha_fazenda_id()`

### Componentes React
- Sempre `'use client'` em componentes com estado ou efeitos colaterais
- Componentes de UI puros (shadcn/ui) podem ser RSC quando apropriado
- Tipagem: prefira Props interface explícita (sem `React.FC`)
- Custom hooks devem retornar `{ data, isLoading, error }` quando async
- **Nunca usar** `payload: any` — tipagem correta com `Omit<Tipo, 'id' | 'fazenda_id'>`
- **Nunca suprimir** `eslint-disable react-hooks/exhaustive-deps` — corrigir as dependências com `useCallback`/`useMemo`
- **async/await em useEffect**: nunca usar `.then().catch()` — extrair função `async` nomeada dentro do `useEffect` e chamá-la; preservar flag `cancelled` para cleanup quando necessário. Para cargas paralelas dentro de `useEffect`, usar IIFEs `async () => { ... }()` dentro do `Promise.all` de tasks.
- **Recharts**: importar componentes de gráfico via `next/dynamic` com `ssr: false` nos Client Components que os consomem (não nos próprios arquivos de gráfico). Ver `DashboardClient.tsx` e `IndicadoresClient.tsx` como referência.
- **`contentStyle` de tooltips Recharts**: sempre extrair para constante de módulo fora do componente (ex: `const TOOLTIP_STYLE = { ... } as const`) — nunca objeto inline no JSX. Usar CSS vars (`var(--background)`, `var(--border)`) em vez de hex hardcoded.

### Server Actions & Mutations
- Server Actions em `app/dashboard/*/actions.ts`
- Sempre validar com Zod antes de persistir
- Erros: Toast com Sonner para feedback ao usuário
- Transações atômicas quando múltiplas tabelas envolvidas (ex: insumos → financeiro)

### Validação
- Schemas Zod em `lib/validations/`
- Validação no cliente (UX) + validação no servidor (segurança)
- CHECK constraints no PostgreSQL devem espelhar as regras do Zod
- Mensagens de erro claras e em português
- **Padrão B (Formulários React Hook Form + shadcn/ui)** — obrigatório em todos os forms:
  - Estrutura: `Form > FormField > FormItem > FormLabel > FormControl > FormMessage`
  - Erros exibidos **sempre** via `<FormMessage />` — **nunca** `<p className="text-destructive">`
  - `<Controller>` substituído por `<FormField render={({ field }) => ...}>`
- **API routes** usam `schema.safeParse(body)` — nunca validação manual com `if (!campo)`

### Formatação & Tipos
- **Moeda BRL**: `formatBRL(value)` em `lib/utils.ts` — **única fonte canônica**, nunca redefinir localmente
- **Datas entre datas**: `daysBetween(de, ate)` em `lib/utils.ts` — **única fonte canônica**, nunca redefinir localmente
- **Datas**: ISO string no banco, formatado no UI com `formatDate()`
- Tipos do banco gerados automaticamente — não editar `types/supabase.ts` manualmente

### Estados Vazios
- Usar `<EmptyState>` de `components/ui/EmptyState.tsx` em vez de `<div className="text-center py-8 text-muted-foreground">` inline
- Props: `title` (obrigatório), `description?`, `icon?`, `action?`
- **Não** usar para empty states dentro de `<TableRow>/<TableCell>` — nesses casos manter o `<TableCell>` semântico

### Cache de Queries de Catálogo
- Queries em tabelas **públicas** (sem `fazenda_id`) podem usar `unstable_cache` com cliente anônimo
- Obrigatório: TTL de 1h (`revalidate: 3600`) + tag para invalidação futura
- **Nunca aplicar** `unstable_cache` em queries que dependem de `fazenda_id` ou sessão do usuário

---

## Design System (Concluído 13/05/2026 — Alinhado 2026-05-12)

### Tipografia — Padrão Obrigatório
**Regra crítica**: Todo novo componente DEVE usar `text-sm` (14px) mínimo, NUNCA usar valores em `px`/`rem` inline.

| Elemento | Tamanho | CSS Tailwind | Exemplo |
|---|---|---|---|
| Página (h1) | 1.375rem (22px) | `text-2xl` | Títulos de páginas |
| KPI Value | 1.875rem–2rem | `text-3xl` | Números principais em negrito |
| Card Label/Body/Tabelas | 14px | `text-sm` | ✅ PADRÃO — SEMPRE USAR |
| KPI Sublabel | 14px | `text-sm` | ✅ PADRÃO |
| Small text/Badges | 12px | `text-xs` | ✅ APENAS para UPPERCASE labels e notas inline |

### Valores Proibidos ❌
- ❌ `text-[0.475rem]`, `text-[0.45rem]` (6-7px) — NUNCA usar
- ❌ `text-[0.6rem]`, `text-[0.8rem]` (9.6-12.8px) — NUNCA usar
- ❌ `text-[11px]`, `text-[10px]`, `text-[12px]` — NUNCA usar
- ❌ qualquer `text-[Npx]` ou `text-[N.Nrem]` inline — sempre usar classes Tailwind (`text-sm`, `text-xs`)

### Cores — Padrão Alinhado 2026-05-12
**Paleta atualizada**: Backgrounds (`#161616` / `#1c1c1c` / `#222222`), Alert Gold (`#f5d000`), primária verde/azul/red mantidos.
- ✅ `colors_and_type.css` — referência completa (CSS vars)
- ✅ `app/globals.css` — fonte de verdade aplicada (Tailwind overrides)
- Usar CSS custom props (`var(--text-muted)`) ou classes Tailwind (`text-muted-foreground`)
- ❌ NUNCA hardcode cores inline (`text-[#...]`, `bg-[#...]`)

**Componentes corrigidos em 2026-05-29 (T-4.6 / T-4.7)**:
- `Header.tsx`, `Sidebar.tsx`: todas as cores hex substituídas por `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, variáveis CSS `var(--green-dim)`, `var(--red-dim)`, `var(--gold-dim)`, `var(--sidebar)`, `var(--border)`
- `components/ui/button.tsx`: variants outline/ghost usam `border-border`, `bg-surface`, `hover:bg-white/5`
- `components/ui/input.tsx`, `components/ui/select.tsx`: `text-foreground`, `placeholder:text-muted-foreground`, `focus:ring-ring/15`, `var(--input)`, `var(--border)`; popup do select usa `var(--sidebar)` como background
- `components/Breadcrumbs.tsx`: `text-muted-foreground`, `text-foreground`
- `app/dashboard/rebanho/RebanhoClient.tsx`, `[id]/page.tsx`, `movimentacoes/MovimentacoesClient.tsx`: dark mode corrigido com classes Tailwind semânticas + breakpoints de grid ajustados para mobile

**Componentes corrigidos em 2026-05-29 (T-5.2 / T-5.5 / T-5.6)**:
- `components/ui/button.tsx`: variant `gradient` adicionada (gradiente animado); `components/ui/gradient-button.tsx` **deletado** — usar `<Button variant="gradient">` em seu lugar
- `components/ui/calendar.tsx`: aria-labels adicionados em botões de navegação (anterior/próximo mês) para acessibilidade
- `components/Sidebar.tsx`: grupos de navegação envolvidos em `<nav role="navigation" aria-label="...">` para acessibilidade; ícones decorativos com `aria-hidden="true"`

### Referência de Design
- **PRD Completo**: `PRD-design.md`
- **Especificação Técnica**: `SPEC-design.md`
- **Design System**: `DESIGN-SYSTEM.md` (atualizado 2026-05-12)
- **Changelog**: `CHANGELOG-redesign.md`

### Arquivos Intocáveis (Verificar com revisão)
Não modifique sem instrução explícita:
- `next.config.ts` — contém headers de segurança críticos + configuração Serwist (`withSerwistInit`) + `withSentryConfig`
- `app/globals.css` — fonte de verdade do tema Tailwind (atualizado 2026-05-12)
- `colors_and_type.css` — referência de tokens de design (atualizado 2026-05-12)
- `DESIGN-SYSTEM.md` — especificação de padrões (atualizado 2026-05-12)

---

## Segurança — Regras Obrigatórias

1. **RLS obrigatório** em todas as tabelas autenticadas
2. **Queries filtradas** por `fazenda_id` (multi-tenancy)
3. **Nunca `select('*')`** — listar colunas explicitamente
4. **Nunca enviar `fazenda_id`** no payload de INSERT (trigger cuida disso)
5. **Rate limiting** já configurado nas rotas de auth — não remover
6. **Headers HTTP** já configurados em `next.config.ts` — não remover o bloco `headers()`
7. **Sentry `beforeSend`** filtra dados sensíveis — não contornar
8. **Dados sensíveis nunca em logs**: senhas, tokens JWT, dados pessoais de fazendeiros
9. **Validação Zod obrigatória** em todas as API routes via `safeParse` — erros retornam mensagens genéricas:
   - Login/credenciais: sempre `{ error: 'Credenciais inválidas' }` (nunca revelar se email existe)
   - Demais rotas: `{ error: 'Dados inválidos' }` — nunca expor mensagens de schema Zod ao cliente
10. **Playwright baseURL** aponta para `process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'` — nunca para produção
11. **API routes autenticadas** devem chamar `client.auth.getUser()` antes de qualquer query ao banco, retornando `401` se sem sessão válida — padrão implementado em `/api/assessoria/agendamentos` e `/api/assessoria/anotacoes`

---

## Integrações Cross-Módulo

### Insumos → Financeiro
Quando `registrar_como_despesa === true` em uma saída de insumo:
- `criarSaidaAction` cria automaticamente lançamento em `financeiro` (categoria "Insumos", tipo "Despesa")
- `movimentacoes_insumo.despesa_id` é preenchido para rastreabilidade bidirecional
- Ao deletar movimentação com `despesa_id`, o registro em `financeiro` é removido junto (cleanup automático)

### Produtos → Financeiro
Quando `tipo_saida === 'VENDA'` e `registrar_como_receita === true` em uma saída de produto:
- `criarSaidaProdutoAction` cria lançamento em `financeiro` (categoria "Produtos", tipo "Receita")
- `movimentacoes_produto.receita_id` é preenchido para rastreabilidade bidirecional
- Ao deletar movimentação com `receita_id`, o registro em `financeiro` é removido junto (cleanup automático)
- Rollback transacional: se a criação da receita falhar, a movimentação é desfeita (DELETE)

### Produtos → Insumos
Quando `tipo_saida === 'TRANSFERENCIA_INSUMO'`:
- `criarSaidaProdutoAction` cria entrada em `movimentacoes_insumo` com `produto_id_origem` preenchido
- Rastreabilidade bidirecional: `movimentacoes_produto.insumo_id_destino` ↔ `movimentacoes_insumo.produto_id_origem`

### Silos → Financeiro (venda de silagem)
Quando `subtipo === 'Venda'` e `valor_unitario != null` em movimentação de silo:
- `movimentacoesSilo.create()` cria lançamento em `financeiro` (categoria "Silagem", tipo "Receita")
- `movimentacoes_silo.receita_id` é preenchido para rastreabilidade bidirecional
- Ao deletar movimentação com `receita_id`, o registro em `financeiro` é removido junto (cleanup automático)
- Rollback transacional: se a criação da receita falhar, a movimentação é desfeita (DELETE)

### Planejamento de Compras → Insumos
Quando um insumo planejado é marcado como comprado em `marcarComoCompradoAction`:
- Cria entrada em `movimentacoes_insumo` com `tipo = 'Entrada'` e `origem = 'planejamento'`
- `movimentacoes_insumo.planejamento_insumo_id` é preenchido para rastreabilidade bidirecional
- Valor `'planejamento'` foi adicionado ao CHECK `chk_origem` via migration suplementar em 2026-05-19
- Não cria lançamento financeiro automático (compra real é registrada via módulo Insumos pelo Admin)

### Mão de Obra → Financeiro
Ao criar ou atualizar uma atividade em `criarAtividadeAction` / `editarAtividadeAction`:
- Cria/atualiza lançamento em `financeiro` (categoria `'Mão de Obra'`, tipo `'Despesa'`, `referencia_tipo = 'Mão de Obra'`)
- `atividades_mao_obra.despesa_id` é preenchido para rastreabilidade bidirecional
- Ao deletar atividade com `despesa_id`: deleta a despesa em `financeiro` antes de deletar a atividade
- Rollback atômico: se INSERT em financeiro falhar, faz DELETE dos colaboradores vinculados e da atividade
- Se UPDATE do `despesa_id` pós-INSERT falhar: dado já persistido, logar via `console.error` e retornar sucesso (rastreabilidade recuperável via `referencia_id` no financeiro)
- **`custo_final` nunca incluir no payload** — é `GENERATED ALWAYS AS STORED`; usar `custo_manual ?? custo_calculado` calculado na Server Action

### Talhões → Financeiro (serviços terceirizados) — implementado 2026-05-29

**Regra de custo rural (padrão CONAB/SENAR):**
- Insumo usado na operação → **não gera despesa** (custo entrou no financeiro na compra do estoque)
- Máquina própria → **não gera despesa** (custo operacional, não é saída de caixa; usa `custo_hora` cadastrado na máquina)
- Serviço terceirizado/análise de solo → **gera despesa** (saída real de caixa)

Quando `criarAtividadeCampoAction` detecta serviço com saída de caixa:
- Cria lançamento em `financeiro` (categoria `'Lavouras'`, tipo `'Despesa'`, `referencia_tipo = 'Atividade Campo'`)
- `atividades_campo.despesa_id` é preenchido para rastreabilidade bidirecional
- Rollback atômico: falha na despesa → DELETE insumo + DELETE atividade

**`custo_total` da atividade** = insumos (`dose × area × custo_médio`) + máquinas (`horas × custo_hora`) + serviços terceirizados. Esse valor alimenta o custo de produção por ciclo/talhão e futuramente o custo por tonelada de silagem.

### Pastagens → Financeiro (eventos de manejo) — implementado 2026-05-29

Quando `registrarEventoManejoAction` registra evento com `custo_estimado > 0`:
- Cria lançamento em `financeiro` (categoria `'Pastagens'`, tipo `'Despesa'`, `referencia_tipo = 'Evento Manejo Pastagem'`)
- `eventos_manejo_pastagem.despesa_id` é preenchido para rastreabilidade bidirecional
- Ao deletar evento com `despesa_id`: deleta a despesa em `financeiro` antes de deletar o evento
- Rollback: se a despesa falhar, DELETE do evento é executado imediatamente

### Rastreabilidade de Colaboradores (implementado 2026-05-22)

Tabela `registros_colaborador` vincula um colaborador a qualquer operação agrícola, de forma opcional e sem bloquear a operação principal.

**`referencia_tipo` válidos** (CHECK constraint):
- `atividade_campo` → `atividades_campo.id`
- `cadastro_silo` → `silos.id`
- `evento_manejo_pastagem` → `eventos_manejo_pastagem.id`
- `evento_sanitario` → `eventos_sanitarios.id`

**Padrão de uso**:
- Falha em `registros_colaborador` **nunca** bloqueia a operação pai
- `fazenda_id` nunca enviar em INSERT — trigger `set_fazenda_id` preenche automaticamente
- Cleanup: deletar `registro_colaborador` **antes** de deletar a operação pai
- Soft delete de evento sanitário → hard delete do `registro_colaborador` associado
- Colaborador inativo (`ativo=false`) não aparece no `ColaboradorSelect`, mas históricos persistem

**Componente reutilizável**: `components/ColaboradorSelect.tsx`
- Carrega colaboradores ativos via `listColaboradoresAtivosParaSelect()` na montagem
- Usa sentinel `'__none__'` internamente; expõe `string | undefined` para fora
- Integrado em: `AtividadeDialog` (talhões), `SiloForm` (mode=create apenas), `EventoManejoForm` (pastagens), `FormEventoSanitario` (rebanho/sanidade)

**Funções utilitárias** (`lib/supabase/registros-colaborador.ts`):
- `upsertRegistroColaborador(tipo, referenciaId, colaboradorId)` — DELETE anterior + INSERT novo
- `deleteRegistroColaborador(tipo, referenciaId)` — remove vínculo (chamado no delete da operação pai)
- `getColaboradorDaOperacao(tipo, referenciaId)` — retorna `colaborador_id | null` para pré-popular edição
- `listColaboradoresAtivosParaSelect()` — lista para popular selects

**Server Actions auxiliares** (fire-and-forget nos Client Components):
- `app/dashboard/talhoes/actions.ts` → `vincularColaboradorAtividadeAction` (fire-and-forget) + `criarAtividadeCampoAction` (Server Action principal — ver seção Talhões)
- `app/dashboard/silos/actions.ts` → `vincularColaboradorSiloAction`

---

## Sistema Offline (épico T-OS — 2026-05-29)

### Arquitetura Geral

O GestSilo opera em modo offline via IndexedDB (`lib/db/localDb.ts`, DB_VERSION=3). Quando offline, operações são enfileiradas em `sync_queue`; ao reconectar, `syncAll()` as processa na ordem de inserção.

**Stores do IndexedDB**:
- `sync_queue` — fila de ações pendentes (`INSERT`/`UPDATE`/`DELETE`/`RPC`)
- `movimentacoes_silo`, `atividades_campo`, `movimentacoes_insumo`, `financeiro`, `uso_maquinas`, `abastecimentos` — cache de dados locais
- `eventos_rebanho` — cache de eventos reprodutivos com `_sync_status` e `_conflict_motivo`

### Hooks de Sincronização

| Hook | Localização | Responsabilidade |
|---|---|---|
| `useOfflineSync` | `hooks/useOfflineSync.ts` | Sync primário: escuta eventos `online`/`offline`, verifica JWT antes de `syncAll`, catch 401/JWT com toast |
| `useSyncOnReconnect` | `lib/hooks/useSyncOnReconnect.ts` | Fallback com backoff exponencial (1s→2s→4s→8s→16s, 5 tentativas); montado em `/operador` |
| `useDadosOffline` | `hooks/useDadosOffline.ts` | Lê qualquer `TableName` do IndexedDB; retorna `{ dados, isLoading }` |

**Regra crítica**: `useOfflineSync` sempre verifica `supabase.auth.getSession()` + `refreshSession()` antes de `syncAll`. JWT expirado → toast de erro e retorno imediato (sem tentar sincronizar).

### Prefetch Proativo (`lib/db/prefetch.ts`)

`prefetchDadosCriticos(supabase, fazendaId)` é chamado no `app/dashboard/layout.tsx` sempre que `isOnline && fazendaId`. Usa `Promise.allSettled` (falha de um item não bloqueia os demais):

1. Últimas 100 movimentações de silos → IndexedDB `movimentacoes_silo`
2. Lista de silos da fazenda → `localStorage` (`gestsilo:prefetch:silos`)
3. Resumo do rebanho por categoria → `localStorage` (`gestsilo:prefetch:rebanho-resumo`)

Timestamp salvo em `localStorage` (`gestsilo:prefetch:at`). `getPrefetchTimestamp()` retorna `Date | null`.  
O `DashboardClient` exibe badge "Dados de HH:MM — modo offline" via `useMemo` quando `!isOnline && prefetchAt`.

### Hidratação do Cache Local

`hydrateEventosFromServer(serverEventos[])` — importada de `lib/db/eventosRebanho.ts`:
- Preserva eventos com `_sync_status === 'pending'` ou `'error'` (dados locais têm prioridade)
- Sobrescreve eventos `synced` ou inexistentes com dados do servidor

**Pontos de chamada** (na montagem, apenas quando `isOnline`):
- `app/dashboard/rebanho/RebanhoClient.tsx` — busca últimos 200 `eventos_rebanho`, hidrata
- `app/operador/page.tsx` — busca últimas 100 `movimentacoes_silo`, salva diretamente no IDB

### Detecção e Resolução de Conflitos

`syncAll()` detecta conflito quando o animal do evento está `Morto` ou `Vendido` no servidor. O evento é marcado como `_sync_status: 'pendente_revisao'` no IndexedDB e removido da `sync_queue` sem ser enviado.

**UX de conflitos**:
- `SyncStatusBar` — polling de `getSyncConflitos()` a cada 10s; badge vermelho clicável abre `ConflictResolutionModal`
- `ConflictResolutionModal` (`components/offline/ConflictResolutionModal.tsx`) — lista conflitos com tipo, data, motivo; ações: Descartar (remove do IDB + sync_queue) ou Forçar envio (envia RPC sem verificação)
- `/dashboard/configuracoes/sincronizacao` — página Admin completa: lista todos os conflitos, botão "Sincronizar agora" (com verificação de sessão), protegida por guard `perfil === 'Administrador'`
- Sidebar: item "Sincronização" visível para Admin e Visualizador (nunca para Operador)

### Rota `/operador/silos`

Rota legada substituída por `redirect('/operador')`. Nenhum link aponta para ela no codebase.

---

## Variáveis de Ambiente

### `.env.local` (desenvolvimento)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # ⚠️ CRÍTICO: bypassa RLS — nunca expor client-side
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CONSULTOR_EMAIL=
JWT_SECRET=                     # HS256 256 bits — tokens de link mágico de assessoria
OPENWEATHER_API_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SUPABASE_PROJECT_ID=
RESEND_API_KEY=
CRON_SECRET=
```
> Referência canônica: `.env.example` (commitado, sem valores reais). Variáveis `GEMINI_API_KEY` e `APP_URL` foram removidas em 2026-05-28 (resquícios de template AI Studio).

### Vercel (All Environments)
Todas as variáveis acima configuradas em Settings → Environment Variables

### GitHub Secrets (backup automático)
`SUPABASE_DB_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `BACKUP_ALERT_EMAIL`

---

## Comandos do Projeto

```bash
npm run dev          # Servidor local em http://localhost:3000
npm run build        # Build de produção
npm run test         # Rodar todos os testes (Vitest)
npm run test:watch   # Testes em modo watch
npm run test:coverage  # Cobertura de testes (Vitest + v8)
npm run test:e2e     # Testes end-to-end (Playwright)
npm run lint         # ESLint
npm run clean        # Limpar cache Next.js
npm run db:types     # Gerar tipos TypeScript do Supabase (requer SUPABASE_PROJECT_ID)
```

---

## Regras Invioláveis — Nunca Faça

- ❌ Altere `.env` ou `.env.local`
- ❌ Altere `next.config.ts` sem instrução explícita (contém headers de segurança críticos + configuração Serwist + Sentry)
- ❌ Altere `turbo.json` ou configurações de build
- ❌ Reescreva componentes inteiros sem ser pedido
- ❌ Remova espaços em branco ou refatore sem contexto
- ❌ Adicione features não requisitadas
- ❌ Delete dados em produção sem confirmação explícita
- ❌ Use `select('*')` em queries Supabase
- ❌ Ignore avisos de TypeScript ou ESLint
- ❌ Use `any` em TypeScript — regra `@typescript-eslint/no-explicit-any: "error"` está ativa; usar `unknown`, tipos concretos, `as unknown as T` ou `Record<string, unknown>`
- ❌ Suprima `eslint-disable react-hooks/exhaustive-deps` — corrigir as dependências
- ❌ Envie `fazenda_id: ''` manualmente em payloads de INSERT
- ❌ Remova o bloco `headers()` do `next.config.ts` (segurança HTTP)
- ❌ Remova o `withSentryConfig()` do `next.config.ts`
- ❌ Edite manualmente `types/supabase.ts` (gerado automaticamente)
- ❌ Altere policies RLS sem validar com `database-snapshot.md`

### Nota sobre perfil Gerente
Se o perfil `Gerente` for adicionado ao banco futuramente, revisar condicionais de DELETE em:
- `silos/[id]/page.tsx`, `TalhaoDetailHeader.tsx`, `TalhaoResumoTab.tsx`
- `financeiro/page.tsx`, `FrotaCadastro.tsx`, `configuracoes/page.tsx`

---

## Antes de Cada Sessão

1. Ler o arquivo relevante antes de editar
2. Dizer exatamente o que vai mudar e aguardar confirmação
3. Após concluir: rodar `npm run build` e `npm run test`
4. Confirmar que 900+ testes passam (2 falhos pré-existentes: `rls.test.ts` timeout de rede; `projetar-rebanho.test.ts` classificação de categoria). O build emite warnings do React Compiler sobre `form.watch()` do React Hook Form em 13 arquivos — são pré-existentes e não relacionados a mudanças locais.
5. Consultar `database-snapshot.md` para qualquer mudança de schema

---

## Funcionalidades por Módulo

### 🏠 Dashboard — Alertas Críticos (implementado 2026-05-21)

O card "Alertas Críticos" no dashboard é **totalmente dinâmico**: agrega alertas de múltiplos módulos em tempo real, sem nenhuma tabela ou migration nova.

**Arquivos envolvidos**:
- `app/dashboard/dashboard-data.ts` — tipos `AlertaTipo`, `AlertaSeveridade`, `AlertaCritico`; campos `silosAutonomiaDiasNum`, `silosTaxaPerdasNum`, `manutencoesPendentesCount`, `alertas` em `DashboardData`
- `app/dashboard/alertas-helpers.ts` — funções puras `derivarAlertasEtapa1`, `derivarAlertasPastagens`, `daysBetween`, `formatarDataBR` (testáveis sem RSC)
- `app/dashboard/page.tsx` — queries paralelas no `Promise.all`; constrói o array `alertas`
- `app/dashboard/DashboardClient.tsx` — renderiza lista ordenada por severidade; estado vazio mantido
- `__tests__/dashboard/alertas-helpers.test.ts` — 13 testes unitários das funções puras

**Fontes de alertas (8 origens, todas paralelas no `Promise.all`)**:

| Origem | Condição | Severidade |
|---|---|---|
| Operações de talhão | `status === 'Atrasado'` | `critico` |
| Silagem — autonomia | `autonomiaDias < 30` | `critico` (<10d) / `urgente` (10–29d) |
| Silagem — perdas | `taxaPerdas > 10%` | `critico` (>20%) / `urgente` (10–20%) |
| Manutenções (`manutencoes`) | vencida ou próximos 7 dias, `status != 'concluida'` | `critico` (vencida) / `urgente` |
| Insumos (`get_insumos_abaixo_minimo`) | `estoque_atual < estoque_minimo` | `critico` (esgotado) / `urgente` |
| Vacinações (`eventos_sanitarios`) | próximos 15 dias, `tipo = 'vacinacao'` | `critico` (vencida) / `urgente` |
| Produtos (`produtos`) | `estoque_atual < estoque_minimo`, filtrado em JS | `urgente` |
| Piquetes (`piquetes` + `ocupacoes_piquete`) | superlotação, pronto para entrada, reforma longa | `urgente` / `aviso` |
| Silos abertos (`silos` + `movimentacoes_silo`) | `data_abertura_real != null` + sem saída há ≥ 3 dias | `urgente` |

**Regras importantes**:
- Operador vê alertas do dashboard; queries de insumos/produtos retornam vazio via RLS (`sou_admin_ou_visualizador()`) — sem lógica condicional de perfil
- O alerta `manutencao_pendente` da Etapa 1 foi **removido** da função pura para evitar duplicidade com os alertas individuais por máquina da Etapa 2
- Joins do Supabase com relação many-to-one (ex: `maquinas(nome)`) requerem `as unknown as TipoLocal[]` porque o SDK infere array mesmo sendo objeto único
- Exibição: máx. 5 alertas ordenados por severidade (`critico → urgente → aviso`); excedente mostrado como "+N alertas adicionais"
- Funções puras em `alertas-helpers.ts` — **não** em `page.tsx` — para permitir testes sem dependências RSC

### 🏁 Onboarding (implementado)

Fluxo simples de primeiro acesso — não é um wizard multi-etapa.

- `app/dashboard/onboarding/page.tsx` — formulário único: nome da fazenda, cidade (autocomplete), área em ha. Redireciona para `/dashboard` após criação.
- `AuthProvider.tsx` — controla flag `needsOnboarding = !!user && !!profile && !fazendaId`; redireciona para `/dashboard/onboarding` enquanto não houver fazenda vinculada.
- `app/dashboard/layout.tsx` — detecta rota de onboarding e exibe layout limpo (sem sidebar).

**Lacuna conhecida**: dashboard vazio após onboarding (sem empty states por módulo). Não há wizard multi-etapa — o wizard de 4 etapas é exclusivo do Planejamento de Silagem.

### 🌾 Silos & Estoque (Core — atualizado 2026-05-30)

- Cadastro e monitoramento de silos de silagem por fazenda
- Controle de capacidade e estoque com percentuais visuais
- Movimentações entrada/saída com rastreamento
- Avaliação de qualidade: bromatológica e PSPS
- Faixas de qualidade personalizáveis

#### Regras de negócio do formulário de cadastro

**Data de abertura prevista**:
- Calculada automaticamente como `data_fechamento + 60 dias` (prazo mínimo de fermentação)
- Campo **somente leitura** no modo create — o usuário não pode alterar
- No modo edit o campo é editável, mas recalcula automaticamente se `data_fechamento` mudar
- Lógica em `useEffect` em `SiloForm.tsx` — sempre sobrescreve ao mudar a data de fechamento

**Lonas (colunas `insumo_lona_id` / `insumo_lona2_id` na tabela `silos`)**:
- **Lona de cobertura (`insumo_lona_id`)**: **obrigatória** ao criar um silo — sem opção "Nenhuma" no create; validação no submit via `form.setError`
- **Barreira de oxigênio (`insumo_lona2_id`)**: opcional — campo separado para quem usa 2 lonas; usa a mesma lista de insumos de lona
- Ambas geram saída de estoque de insumos no momento do cadastro (`tipo_saida: 'USO_INTERNO'`, `destino_tipo: 'silo'`)
- Migration: `supabase/migrations/20260529000005_silos_lona2_e_abertura.sql` — adiciona `insumo_lona2_id uuid REFERENCES insumos(id) ON DELETE SET NULL` e `quantidade_lona2 numeric(10,3)`

**Inoculante (`insumo_inoculante_id`)**: opcional — label deixa explícito que nem todos os produtores utilizam

#### Status do silo e abertura

`data_abertura_real` é preenchida por **dois caminhos independentes**:

1. **Automático**: primeira movimentação de saída registrada via `q.movimentacoesSilo.create()` — comportamento pré-existente, inalterado
2. **Manual**: botão "Registrar Abertura" no dropdown do `SiloCard` (visível apenas para `Administrador`, apenas silos com status `Fechado`) → `AbrirSiloDialog` → `abrirSiloAction`

`abrirSiloAction` (`app/dashboard/silos/actions.ts`):
- Valida com `abrirSiloSchema`: data obrigatória, formato YYYY-MM-DD, não pode ser no futuro
- Atualiza apenas `silos.data_abertura_real` — não cria movimentação
- Retorna `{ success: boolean; error?: string }`

Status derivados (função `obterStatusSilo` em `lib/supabase/silos.ts`):

| Status | Condição |
|---|---|
| `Enchendo` | tem entradas, sem `data_fechamento` |
| `Fechado` | tem `data_fechamento`, sem `data_abertura_real` |
| `Aberto` | tem `data_abertura_real` e `estoque_atual > 0` |
| `Vazio` | `estoque_atual = 0` |

#### Alerta: silo aberto sem consumo (adicionado 2026-05-30)

Tipo `silo_aberto_sem_consumo` em `AlertaTipo` (`dashboard-data.ts`).

Função `derivarAlertasSilosAbertos(silos, movimentacoes)` em `alertas-helpers.ts`:
- Condição: silo com `data_abertura_real != null` + última saída há ≥ 3 dias (ou nunca teve saída e aberto há ≥ 3 dias)
- Severidade: `urgente`
- Aparece no card "Alertas Críticos" do dashboard
- Usa dados já presentes no `Promise.all` do dashboard: `silosRes` (id, nome, data_abertura_real) + `movsRecentesRes` (movimentações dos últimos 30 dias com campo `data`)

**Arquivos principais**:
- `lib/validations/silos.ts` — `siloSchema` (lona2), `abrirSiloSchema` (novo)
- `app/dashboard/silos/actions.ts` — `abrirSiloAction` (novo)
- `app/dashboard/silos/components/dialogs/SiloForm.tsx` — lona obrigatória, lona2, abertura prevista readonly
- `app/dashboard/silos/components/dialogs/AbrirSiloDialog.tsx` — dialog de abertura manual (novo)
- `app/dashboard/silos/components/SiloCard.tsx` — props `onAbrirSilo`, `isAdmin`; item "Registrar Abertura" no dropdown
- `app/dashboard/silos/SilosClient.tsx` — estado `abrirSiloTarget`, monta `AbrirSiloDialog`
- `app/dashboard/silos/page.tsx` — busca `perfil` e passa `isAdmin` para `SilosClient`
- `app/dashboard/dashboard-data.ts` — `silo_aberto_sem_consumo` em `AlertaTipo`
- `app/dashboard/alertas-helpers.ts` — `derivarAlertasSilosAbertos()` (novo)
- `app/dashboard/page.tsx` — inclui `alertasSilosAbertos` no array `alertas`

### ⚖️ Balanço Forrageiro (100% implementado — 2026-05-29, pastagens integradas)

Rota: `/dashboard/balanco-forrageiro`

**Conceito**: cruza três dimensões em uma única tela — consumo histórico real dos silos, demanda projetada pelo rebanho e oferta estimada das pastagens. Calcula a **demanda líquida sobre os silos** (demanda total − oferta do pasto) e a **autonomia líquida** resultante, com sazonalidade por espécie forrageira.

**Queries** (`lib/supabase/balanco-forrageiro.ts`):
- `getEstoqueSilos()` — todas as movimentações de todos os silos sem filtro de data (estoque total correto)
- `getConsumoPorPeriodo(dataCorte)` — saídas com `.gte('data', hoje−90d)` filtrado no banco
- `getAnimaisAtivosPorCategoria()` — animais com `status = 'Ativo'`, agrupados por categoria em memória
- `getPiquetesAtivosParaBalanco()` — piquetes com `status = 'Em pastejo'`, join com `pastagens(nome, especie_forrageira, sistema_pastejo)` e `ocupacoes_piquete` filtrando pela ocupação sem `data_saida_real`

**Constantes** (`lib/constants/balanco-forrageiro.ts`):
- `CONSUMO_MS_POR_CATEGORIA` — `Map<string, number>` com 14 categorias → kg MS/cab/dia; não mapeadas usam `CONSUMO_MS_PADRAO = 7.0`
- `OFERTA_MS_POR_ESPECIE` — `Map<string, { verao: number; seca: number }>` com 27 espécies forrageiras → kg MS/ha/dia por época. Espécies não mapeadas usam `OFERTA_MS_PADRAO = { verao: 40, seca: 8 }` (estimativa silenciosa)
- `getEpocaAtual(mes?)` → `'verao' | 'seca'` — **seca = mai–out**, **verão = nov–abr** (padrão Brasil Central)
- `COBERTURA_PASTO_MINIMA_PERC = 0.20` — limiar para alerta de cobertura baixa (pasto cobre < 20% da demanda)

**Funções puras** (`lib/utils/balanco-forrageiro.ts`):
- `calcularConsumoHistorico()` — filtra saídas por período local (subtipo != Descarte), retorna consumo total e médio diário
- `calcularDemandaProjetada()` — cruza animais ativos com Map de categorias, retorna demanda por categoria e total
- `calcularOfertaPasto(piquetes, demandaTotalKgMsDia, mesAtual?)` — para cada piquete em pastejo: `oferta = taxa[especie][epoca] × area_ha`; agrega total; detecta piquetes sem espécie; emite `alerta_cobertura_baixa` se `oferta / demanda < 0.20`
- `calcularDemandaLiquidaSilos(demandaTotal, ofertaPasto, estoqueTotal)` — `demanda_liquida = max(0, demandaTotal − ofertaPasto)`; `autonomia_liquida = estoqueTotal / demanda_liquida`; `pasto_cobre_tudo = true` quando oferta ≥ demanda
- `calcularComparativo()` — déficit/superávit diário e autonomia pelos critérios de consumo real vs demanda projetada
- `classesAutonomia()` — classes CSS: vermelho < 10d, amarelo 10–29d, verde ≥ 30d

**Sazonalidade e sistemas de pastejo**:
- Sistema **rotacionado**: apenas piquetes `'Em pastejo'` contribuem (os demais estão em descanso ou reforma)
- Sistema **contínuo**: a pastagem inteira contribui — a query filtra por `status = 'Em pastejo'`, que no contínuo abrange toda a área
- Espécie não cadastrada: estimativa silenciosa com `OFERTA_MS_PADRAO`; aviso discreto no `OfertaPastoCard` informando que cadastrar a espécie melhora a precisão

**Seletor de período**: 7 / 30 / 60 / 90 dias — re-cálculo local sobre `saidasUltimos90Dias`, sem re-fetch ao banco. Oferta de pasto e demanda líquida são recalculadas via `useMemo` junto com o período.

**Componentes UI**:
- `KpisSection.tsx` — duas linhas de cards: (1) Estoque Total, Consumo Real/Dia, Autonomia Real, Autonomia Projetada; (2) Oferta de Pasto, Demanda Líquida Silos, Autonomia Silos (líquida), Piquetes em Pastejo
- `ConsumoHistoricoCard.tsx` — consumo por silo com barras de progresso
- `DemandaProjetadaCard.tsx` — demanda por categoria animal com badge `~` para estimativas
- `OfertaPastoCard.tsx` — época do ano (badge Verão/Seca), alerta de cobertura baixa, aviso de espécie não cadastrada, tabela por piquete (nome, pastagem, espécie, área, oferta kg MS/dia), autonomia líquida dos silos, nota de metodologia
- `ComparativoSection.tsx` — dois cards: (1) Consumo Real × Demanda Projetada (déficit/superávit); (2) Demanda Líquida sobre Silos (Demanda Total − Oferta Pasto = Demanda Líquida, com autonomia líquida badge colorido)
- `PeriodoSelector.tsx` — seletor 7/30/60/90 dias

**Permissões**:
- Admin e Visualizador: acesso completo (leitura)
- Operador: bloqueado via `layout.tsx` → `/dashboard`

**Testes**: 19 casos em `__tests__/balanco-forrageiro/utils.test.ts` (funções originais; funções de pasto pendentes de cobertura)

### 🗺️ Talhões
- Gestão de áreas com mapa
- Ciclo agrícola completo: planejamento → plantio → colheita
- Eventos DAP, janelas de colheita, histórico de culturas
- Coluna real: `produtividade_ton_ha` (não `produtividade`)

**Custo de produção por ciclo (implementado 2026-05-29)**:

`atividades_campo.custo_total` agrega todos os componentes de custo da operação:
- **Insumos** (`qtd × custo_médio`): compõe o custo de produção, mas **não gera despesa no financeiro** — a despesa já foi registrada na compra do insumo (entrada no estoque)
- **Máquinas próprias** (`horas × custo_hora`): compõe o custo de produção, mas **não gera despesa no financeiro** — é custo operacional, não saída de caixa
- **Serviços terceirizados** (`valor_terceirizacao_r`, `custo_amostra_r`, `horas × custo_por_hora_r`): **geram despesa no financeiro** (categoria `'Lavouras'`, `referencia_tipo = 'Atividade Campo'`)

**Tipos de operação que geram despesa financeira**:
- `Colheita` com `valor_terceirizacao_r > 0` → colheita terceirizada
- `Calagem` com `valor_terceirizacao_r > 0` → aplicação de calcário terceirizada
- `Análise de Solo` com `custo_amostra_r > 0`
- `Irrigação` com `horas_irrigacao × custo_por_hora_r`
- Qualquer operação com `custo_manual > 0`

**Rastreabilidade**: `atividades_campo.despesa_id → financeiro.id` (migration 2026-05-29)

**Server Action**: `criarAtividadeCampoAction` em `app/dashboard/talhoes/actions.ts`
- Recebe `ctx: { cicloId, talhaoId, talhaoAreaHa, talhaoNome }`
- Calcula `custo_total` incluindo insumos + máquinas + serviço
- Valida estoque do insumo antes de criar a saída
- Rollback atômico: despesa falha → DELETE insumo + DELETE atividade

**`AtividadeDialog.tsx`**: refatorado em 2026-05-29 — criação da atividade migrada do client para a Server Action. Geração de eventos DAP e rebrota permanecem no client (dependem de `q.eventosDAP`).

**`TalhaoResumoTab.tsx`**: card "Custo de Produção do Ciclo" exibe breakdown por componente (Insumos / Máquinas / Serviços terceirizados / Outros) via `calcularBreakdownCusto()` em `helpers.ts`.

**Índices existentes**:
- `idx_atividades_campo_despesa_id` (criado 2026-05-29)

### 🌿 Pastagens (100% implementado — 2026-05-21)

**Tabelas do banco**:
`pastagens`, `piquetes`, `ocupacoes_piquete`, `eventos_manejo_pastagem`

**Conceito**: gestão de pastejo rotacionado com controle de piquetes, ocupações de lotes de animais e cálculo automático de Unidade Animal (UA) por hectare.

**Integração com Financeiro — Eventos de Manejo (implementado 2026-05-29)**:
- `eventos_manejo_pastagem.despesa_id → financeiro.id` (migration 2026-05-29)
- Quando `custo_estimado > 0`, `registrarEventoManejoAction` cria lançamento em `financeiro` (categoria `'Pastagens'`, tipo `'Despesa'`, `referencia_tipo = 'Evento Manejo Pastagem'`)
- Rollback: se a criação da despesa falhar, DELETE do evento é executado
- Ao deletar evento com `despesa_id`: deleta a despesa em `financeiro` antes de deletar o evento (`deletarEventoManejoAction`)

**Enums e valores válidos**:
- `sistema_pastejo`: `rotacionado`, `continuo`, `semicontinuo`, `voisin`
- `status_piquete`: `Em pastejo`, `Descanso`, `Em reforma`, `Interditado`
- `tipo_evento_manejo`: `adubacao`, `calagem`, `aplicacao_defensivo`, `ressemeadura`, `rocagem`, `irrigacao`, `amostragem_solo`, `reforma_pastagem`, `interdicao`, `liberacao`, `outro`
- `metodo_calculo_ua`: `peso_real` (pesagem ≤ 90 dias) | `estimativa` (fator fixo por `categorias_rebanho`)

**Cálculo de UA**:
- Fórmula: `peso_kg / 450` para animais com pesagem recente
- Fallback: `FATORES_UA_POR_CATEGORIA` (mapa em `lib/types/pastagens.ts`) quando sem pesagem — `UA_FATOR_PADRAO = 0.8` para categorias não mapeadas
- `ua_real` = soma das UAs de todos os animais do lote / `area_ha` do piquete
- Badge "Peso real" (verde) vs "Estimativa" (amarelo) indica qual método foi usado
- Cálculo é espelhado client-side em `OcupacaoForm.tsx` para preview antes de salvar

**Status de piquete atualizado por eventos**:
- `reforma_pastagem` → status muda para `Em reforma`
- `interdicao` → status muda para `Interditado`
- `liberacao` → status muda para `Descanso`
- Os demais tipos não alteram status
- Deletar evento de manejo **não reverte** o status automaticamente — aviso na UI

**Permissões por perfil**:
- **Admin**: CRUD completo de pastagens, piquetes, ocupações e eventos
- **Operador**: sem acesso ao módulo (guard no `layout.tsx` redireciona para `/dashboard`)
- **Visualizador**: consultar apenas (SELECT via `sou_admin_ou_visualizador()`)

**Alertas proativos** (integrados em `alertas-helpers.ts` via `derivarAlertasPastagens`):

| Tipo | Condição | Severidade |
|---|---|---|
| `piquete_superlotacao` | ocupação aberta com `ua_real > ua_suportada` | `urgente` |
| `piquete_pronto_entrada` | status `Descanso`, `diasDescanso >= dias_descanso_ideal` | `aviso` |
| `piquete_reforma_longa` | status `Em reforma` há > 90 dias (baseado em `updated_at`) | `aviso` |

**Navegação**:
- **Sidebar**: item "Pastagens" com ícone `Leaf` (Lucide), posicionado após "Lavouras" em `gerencialRoutes`
- **Hub** (`/dashboard/pastagens`): KPI grid (total piquetes, em pastejo, descanso, alertas) + grid de `PastagemCard`
- **Detalhe** (`/dashboard/pastagens/[id]`): tabs Piquetes / Histórico de Ocupações / Eventos de Manejo

**Arquivos principais**:
- `lib/types/pastagens.ts` — tipos: `SistemaPastejo`, `StatusPiquete`, `TipoEventoManejo`, `MetodoCalculoUA`, `Pastagem`, `Piquete`, `OcupacaoPiquete`, `PiqueteComOcupacaoAtual`, `PastagemComResumo`, `FATORES_UA_POR_CATEGORIA`, `UA_FATOR_PADRAO`
- `lib/validations/pastagens.ts` — 6 schemas Zod: `pastagemFormSchema`, `piqueteFormSchema`, `ocupacaoFormSchema`, `fecharOcupacaoSchema`, `eventoManejoFormSchema`, `atualizarStatusSchema`
- `lib/supabase/pastagens.ts` — todas as queries, incluindo `listPastagensParaAlertas()` (usada no dashboard)
- `app/dashboard/pastagens/actions.ts` — 11 Server Actions: `criarPastagemAction`, `atualizarPastagemAction`, `deletarPastagemAction`, `criarPiqueteAction`, `atualizarPiqueteAction`, `deletarPiqueteAction`, `atualizarStatusPiqueteAction`, `registrarEntradaLoteAction`, `fecharOcupacaoAction`, `registrarEventoManejoAction`, `deletarEventoManejoAction`
- `app/dashboard/pastagens/layout.tsx` — guard de perfil (client-side via `useAuth`, redireciona Operador)
- `app/dashboard/pastagens/page.tsx` — RSC hub com KPIs e grid de pastagens
- `app/dashboard/pastagens/PastagensClient.tsx` — client hub com estado e modais
- `app/dashboard/pastagens/components/` — 11 componentes UI (ver árvore em Estrutura Principal)
- `app/dashboard/pastagens/[id]/page.tsx` — RSC detalhe com dados paralelos
- `app/dashboard/pastagens/[id]/PastagemDetailClient.tsx` — client detalhe com tabs

**Nota sobre `components/ui/form.tsx`**:
O componente `FormField` foi corrigido de `React.forwardRef` sem genéricos para uma função genérica `<TFieldValues, TName>` que aceita `ControllerProps<TFieldValues, TName>`. Isso é o padrão oficial shadcn/ui e era necessário para que `control={form.control}` tipasse corretamente com schemas Zod específicos no TypeScript strict mode.

### 👷 Mão de Obra (100% implementado — 2026-05-22)

**Tabelas do banco**:
`colaboradores`, `atividades_mao_obra`, `atividades_mao_obra_colaboradores`

**Conceito**: registro de atividades rurais com custo calculado automaticamente por colaborador, integração bidirecional com o módulo Financeiro (categoria "Mão de Obra") e vínculo opcional com talhão, silo ou máquina.

**Enums e valores válidos**:
- `funcao`: `Vaqueiro`, `Tratorista`, `Auxiliar`, `Gerente`, `Outros`
- `vinculo`: `CLT`, `Diarista`, `Empreiteiro`, `Familiar`
- `tipo_valor`: `diaria` (valor por dia/8h) | `hora` (valor por hora)
- `duracao_tipo`: `horas` | `dias`
- `tipo_atividade`: 13 opções (Trato/alimentação do rebanho, Ordenha, Aplicação de defensivo, Adubação, Silagem, Manutenção de cerca, Manutenção de equipamento, Limpeza de instalações, Manejo sanitário, Irrigação, Roçagem, Transporte interno, Outros)

**Cálculo de custo (`calcularCustoColaborador` em `lib/utils.ts`)**:
| duracao_tipo | tipo_valor | fórmula |
|---|---|---|
| `horas` | `hora` | `duracaoValor × valorRef` |
| `dias` | `diaria` | `duracaoValor × valorRef` |
| `horas` | `diaria` | `(duracaoValor / 8) × valorRef` |
| `dias` | `hora` | `(duracaoValor × 8) × valorRef` |

- `custo_calculado` = soma dos custos individuais de todos os colaboradores da atividade
- `custo_final` = `COALESCE(custo_manual, custo_calculado)` — coluna `GENERATED ALWAYS AS STORED` no banco
- **`custo_final` nunca incluir em INSERT ou UPDATE** — o PostgreSQL rejeita e causa erro

**Invariantes críticas**:
- `fazenda_id` nunca enviar no payload de INSERT — trigger `set_fazenda_id` preenche automaticamente
- `custo_final` é coluna gerada — usar `Omit<AtividadeMaoObra, 'custo_final'>` em payloads
- Máximo 1 vínculo por atividade: `talhao_id`, `silo_id`, `maquina_id` — validado pelo Zod (`refine`)
- Soft-delete de colaborador quando tem histórico em `atividades_mao_obra_colaboradores`; hard-delete quando não tem
- Bloquear desativação de colaborador com atividades futuras (data > hoje)
- `ON DELETE RESTRICT` em `colaboradores`: não deletar colaborador com registros na tabela join

**Rollback atômico** (padrão do projeto — sem transações nativas):
`INSERT atividades_mao_obra` → `INSERT colaboradores` → `INSERT financeiro`; se financeiro falhar: DELETE colaboradores + DELETE atividade

**Integração com Financeiro**:
- Categoria: `'Mão de Obra'`, tipo: `'Despesa'`, `referencia_tipo: 'Mão de Obra'`
- `atividades_mao_obra.despesa_id → financeiro.id` (rastreabilidade bidirecional)
- Ao deletar atividade: deleta despesa em financeiro antes de deletar atividade
- Ao atualizar atividade: sincroniza valor, descrição e data na despesa existente

**Permissões por perfil**:
- **Admin**: CRUD completo de colaboradores e atividades
- **Operador**: sem acesso ao módulo (guard no `layout.tsx` redireciona para `/dashboard`; item oculto no Sidebar via `visibleGerencialRoutes`)
- **Visualizador**: consultar apenas (SELECT via `sou_admin_ou_visualizador()`)

**KPIs mensais** (`getKpisMensais`):
- Custo total do mês (`SUM custo_final` em `atividades_mao_obra`)
- Quantidade de atividades no mês
- Colaborador destaque (maior quantidade de atividades no mês)
- Top 3 tipos de atividade por custo total no mês

**Sidebar**: item "Mão de Obra" com ícone `Users` (Lucide), em `gerencialRoutes` após "Produtos", oculto para Operador via filtro em `visibleGerencialRoutes`.

**Arquivos principais**:
- `lib/types/mao-de-obra.ts` — todos os tipos, constantes (`HORAS_POR_DIA = 8`, `FUNCOES_COLABORADOR`, `VINCULOS_COLABORADOR`, `TIPOS_ATIVIDADE`)
- `lib/validations/mao-de-obra.ts` — `colaboradorFormSchema`, `atividadeFormSchema` (com refine de max 1 vínculo)
- `lib/supabase/mao-de-obra.ts` — 8 funções: `listColaboradores`, `getColaboradorComHistorico`, `listAtividades`, `getKpisMensais`, `hasAtividades`, `hasAtividadesFuturas`, `getAtividadeById`, `listColaboradoresDaAtividade`
- `lib/utils.ts` — `calcularCustoColaborador` (4 cenários hora↔dia, importável em Server Actions e Client Components)
- `app/dashboard/mao-de-obra/actions.ts` — 6 Server Actions (`criarColaboradorAction`, `atualizarColaboradorAction`, `deletarColaboradorAction`, `criarAtividadeAction`, `editarAtividadeAction`, `deletarAtividadeAction`) + 2 auxiliares para formulários
- `app/dashboard/mao-de-obra/layout.tsx` — guard client-side (Operador → `/dashboard`)
- `app/dashboard/mao-de-obra/page.tsx` — RSC com Promise.all de 7 queries paralelas
- `app/dashboard/mao-de-obra/MaoDeObraClient.tsx` — hub com abas Atividades/Colaboradores
- `app/dashboard/mao-de-obra/components/` — 7 componentes UI (ver árvore em Estrutura Principal)

**Integração futura com Pastagens**:
Quando necessário, adicionar via migration:
```sql
ALTER TABLE atividades_mao_obra ADD COLUMN piquete_id uuid REFERENCES piquetes(id) ON DELETE SET NULL;
```
E atualizar `AtividadeForm.tsx` (4ª opção no RadioGroup de vínculo) e o `refine` do `atividadeFormSchema`.

### 🚜 Frota & Maquinário
- Plano de manutenção preventiva/corretiva
- Diário de bordo, abastecimento, custos por máquina
- Índices em `fazenda_id`: `planos_manutencao`, `manutencoes`, `abastecimentos`, `uso_maquinas`

### 🧪 Insumos
- Controle de estoque com níveis mínimos
- Movimentações com integração financeira automática
- Alertas de estoque crítico

### 📊 Financeiro
- DRE, fluxo de caixa, análise de lucratividade
- Integrado com saídas de insumos (registrar_como_despesa)

### 🎯 Planejamento de Silagem
- Wizard em 4 etapas: sistema, rebanho, parâmetros, resultados
- Export PDF, histórico de simulações

### 🧮 Calculadoras Agronômicas (atualizado 2026-06-01)

**Módulos**: Calagem e Adubação NPK (otimizador combinatório).

#### Calculadora NPK — Viabilidade de Fertilizantes

**Arquivos principais**:
- `lib/calculadoras/npk.ts` — motor de otimização; retorna dois rankings independentes
- `lib/calculadoras/fertilizantes.ts` — banco de 14 fertilizantes padrão + customizados via localStorage
- `app/dashboard/calculadoras/components/NPKCalculator.tsx` — componente principal + `OpcaoPainelCard` interno
- `app/dashboard/calculadoras/components/FertilizantesManager.tsx` — tabela de seleção e edição de preços
- `app/dashboard/calculadoras/dialogs/ExportPDFDialog.tsx` — dialog de exportação; recebe `faseAdubacao`
- `lib/pdf-export.ts` — `exportarRelatorioNPK(input, resultado, options, faseAdubacao?)`

**Seleção de fase** (`FaseAdubacao = 'plantio' | 'cobertura'`):
- Card de seleção visual obrigatório antes do cálculo
- Fase aparece no badge do resultado e no cabeçalho do PDF exportado

**Motor de otimização** (`otimizarNPK`):
- Testa combinações de 1, 2 e 3 fertilizantes via sistemas lineares (Cramer para 3×3)
- Margem nutricional válida: 0% a +15% para N, P₂O₅ e K₂O
- Retorna **dois rankings independentes** (não um único `top5`):
  - `topMaisBarata` / `maisBarata` — ordenado por menor custo R$/ha
  - `topMaisSimples` / `maisSimples` — ordenado por menor nº de fertilizantes, depois menor custo
  - `top5` mantido por retrocompatibilidade (igual a `topMaisBarata`)

**UI de resultados — dois painéis**:
- Painel **Opção Mais Econômica** (borda verde): menor custo de aquisição
- Painel **Opção Mais Simples** (borda azul): menor número de fertilizantes
- Ambos exibem: KPIs (custo/ha, total área, nº adubos), composição por fertilizante (dose, sacos/ha, custo/ha), margens N/P/K, e lista de alternativas da mesma categoria
- Layout: `xl:grid-cols-2` — lado a lado em desktop, empilhado em mobile

**Fertilizantes padrão** (14 no total — atualizado 2026-06-01):
- Removidos: `NPK 05-25-25`, `NPK 10-10-10`, `Nitrato de Cálcio 15.5-0-0`
- Adicionados: `NPK 30-00-20`, `NPK 20-00-20`
- Customizados: salvos no localStorage (`gestsilo_fertilizantes_custom`); preços editáveis em `gestsilo_precos_editados`

**Disclaimer**: aviso de que o cálculo cobre apenas custos de aquisição — custos logísticos (transporte, mão de obra, horas-máquina, combustível) devem ser considerados à parte pelo produtor.

### 🌽 Produtos (100% implementado — 2026-05-19)

**Tabelas do banco**:
`produtos`, `movimentacoes_produto`, `categorias_produto`

**9 categorias seed** (tabela pública, sem fazenda_id):
Grãos (sacas), Feno (fardos), Pré-secado (kg), Sementes (kg), Leite (litros),
Arrobas (@), Animais (cabeças), Material Genético (doses), Outros (unidade)

**Tipos de movimentação**:
- Entrada: `COLHEITA`, `COMPRA`, `AJUSTE_INICIAL`
- Saída: `VENDA`, `CONSUMO_PROPRIO`, `PERDA`, `DOACAO`, `TRANSFERENCIA_INSUMO`, `DESCARTE`
- Ajuste: delta positivo/negativo com campo `sinal_ajuste` (+1/-1) e `motivo`

**Controle de estoque**: trigger `AFTER INSERT` em `movimentacoes_produto` atualiza `produtos.estoque_atual` automaticamente. Compensação em DELETE feita manualmente na action (UPDATE antes do DELETE).

**Permissões por perfil**:
- **Admin**: CRUD completo de produtos e todas as movimentações
- **Operador**: sem acesso ao módulo (guard no `layout.tsx` redireciona para `/dashboard`)
- **Visualizador**: consultar apenas (SELECT via `sou_admin_ou_visualizador()`)

**Soft-delete vs hard-delete**:
- Produto COM movimentações → `ativo = false` (soft-delete, linha preservada)
- Produto SEM movimentações → `DELETE` (hard-delete)

**Navegação**: item "Produtos" no Sidebar oculto para Operador; badge `comingSoon` removido.

**Arquivos principais**:
- `lib/supabase/produtos.ts` — queries produtos, movimentacoes_produto, categorias_produto
- `lib/validations/produtos.ts` — 4 schemas Zod: `produtoFormSchema`, `entradaFormSchema`, `saidaFormSchema`, `ajusteInventarioSchema`
- `app/dashboard/produtos/actions.ts` — 7 Server Actions: `criarProdutoAction`, `atualizarProdutoAction`, `deletarProdutoAction`, `criarEntradaAction`, `criarSaidaProdutoAction`, `criarAjusteProdutoAction`, `deletarMovimentacaoProdutoAction`
- `app/dashboard/produtos/layout.tsx` — guard de perfil (redireciona Operador)
- `app/dashboard/produtos/page.tsx` — composição dos 11 componentes
- `app/dashboard/produtos/components/` — 11 componentes UI (ver árvore em Estrutura Principal)

### 🛒 Planejamento de Compras (100% implementado — 2026-05-19)

**Tabelas do banco**:
`planejamentos_atividade`, `planejamento_insumos`

**Conceito**: planejar atividades de campo futuras (plantio, adubação, pulverização, etc.) com os insumos necessários, e gerar uma **lista consolidada de compras** com status derivado em runtime (`planejada` → `parcialmente_comprada` → `comprada`).

**Tipos de operação suportados**:
plantio, adubação, pulverização, calagem, colheita, irrigação, outros

**Status da atividade** (`planejamentos_atividade.status`):
`planejada`, `cancelada` (concluída é derivada pelos insumos)

**Status de compra do insumo** (derivado em runtime, não persistido):
`pendente`, `parcialmente_comprado`, `comprado`

**Permissões por perfil**:
- **Admin**: CRUD completo de atividades, insumos vinculados e marcar como comprado
- **Operador**: sem acesso ao módulo (guard no `layout.tsx` redireciona para `/dashboard`)
- **Visualizador**: consultar apenas (SELECT via `sou_admin_ou_visualizador()`)

**Integração com Insumos**:
Ao marcar um insumo como comprado, `marcarComoCompradoAction` cria entrada em `movimentacoes_insumo` com:
- `origem = 'planejamento'` (valor adicionado ao CHECK `chk_origem` em migration suplementar)
- `planejamento_insumo_id` preenchido para rastreabilidade bidirecional

**Navegação**: item "Plan. Compras" no Sidebar oculto para Operador.

**Arquivos principais**:
- `lib/supabase/planejamento-compras.ts` — queries + função pura `calcularLinhasRelatorio()` (compartilhada client/server)
- `lib/validations/planejamento-compras.ts` — schemas Zod (planejamento, insumo vinculado, marcar como comprado)
- `lib/types/planejamento-compras.ts` — tipos TypeScript (TipoOperacao, StatusCompra, LinhaRelatorio, etc.)
- `app/dashboard/planejamento-compras/actions.ts` — 8 Server Actions
- `app/dashboard/planejamento-compras/layout.tsx` — guard de perfil
- `app/dashboard/planejamento-compras/page.tsx` — 2 abas (Atividades Planejadas + Lista de Compras)
- `app/dashboard/planejamento-compras/[id]/page.tsx` — detalhe da atividade
- `components/planejamento-compras/` — 10 componentes UI

**Testes**: 31 casos (10 validação Zod + 21 cálculo/agrupamento)

### 🐄 Rebanho (100% implementado — 2026-05-08, refatoração v3 concluída)

**Tabelas do banco**:
`animais`, `lotes`, `eventos_rebanho`, `pesos_animal`, `reprodutores`,
`lactacoes`, `producoes_leiteiras`, `eventos_sanitarios`,
`eventos_parto_crias`, `parametros_reprodutivos_fazenda`, `categorias_rebanho`

> ⚠️ A tabela `reprodutores` **não aparece no `database-snapshot.md`** (snapshot desatualizado — gerado antes das tabelas de rebanho). Fonte de verdade: `types/supabase.ts`.

**Tipos de rebanho suportados**: `leiteiro`, `corte`, `dupla_aptidao`

**Categorias de animais** (por tipo_rebanho):
- Leiteiro/dupla_aptidao: Bezerro/Bezerra, Novilha (Prenha), Novilho, Vaca em Lactação, Vaca Seca, Vaca Prenha, Vaca Vazia, Touro
- Corte: Bezerro/Bezerra, Novilha/Novilho, Vaca Matriz, Boi, Boi Descartado, Fêmea Descartada, Touro

**Status do animal** (enum `status_animal`): `Ativo`, `Morto`, `Vendido`, `Descartado`

**Tipos de eventos** (`eventos_rebanho.tipo`):
nascimento, pesagem, morte, venda, transferencia_lote, cobertura,
diagnostico_prenhez, parto, secagem, aborto, descarte, desmame,
aspiracao_opu, protocolo_hormonal, transferencia_embriao

**Eventos sanitários** (`eventos_sanitarios.tipo`):
vacinacao, vermifugacao, tratamento_veterinario, exame_laboratorial

**Permissões por perfil**:
- **Admin**: CRUD completo de animais, lotes e todos os eventos; deletar produções e sanitários
- **Operador**: registrar todos os eventos; editar produção leiteira e sanitários (NÃO pode criar/editar/deletar animais — apenas Admin)
- **Visualizador**: consultar apenas

### Navegação do módulo Rebanho
- **Sidebar**: item único "Rebanho" sem submenu — aponta para `/dashboard/rebanho`
- **Hub** (`/rebanho`): 6 cards grandes de acesso rápido + listagem de animais com filtros
- Toda navegação interna parte do hub; sub-rotas não aparecem no Sidebar

**Sub-módulos**:
- **Indicadores** (`/indicadores`): dashboard geral, KPIs, 4 alertas proativos (vacinações, partos, sem pesagem, vacas secas)
- **Reprodução** (`/reproducao`): 4 abas — Dashboard (kanban + KPIs + repetidoras + distribuição por status), Histórico (lista eventos reprodutivos), Reprodutores, Parâmetros
- **Leiteira** (`/leiteira`): registro individual/coletivo, curva de lactação, gráfico 30 dias, ranking top 10 vacas
- **Corte** (`/corte`): GMD, arrobas projetadas, projeção de abate, pesagem em lote, gráfico evolução/lote
- **Sanidade** (`/sanidade`): vacinação/vermifugação/tratamento/exame, registro em lote, calendário sanitário, alertas
- **Movimentações** (`/movimentacoes`): entradas (nascimento/compra), saídas (venda/morte/descarte/abate), transferência entre lotes, KPIs, export CSV
- **Lançamento em Lote** (`/eventos/lote/novo`): wizard 3 etapas para registrar o mesmo tipo de evento em múltiplos animais simultaneamente; exclusivo para Administrador

### Dashboard de Reprodução (`/reproducao` — reestruturado 2026-05-29)

**Estrutura de abas** (4 abas, antes eram 6):

| Aba | Rota | Conteúdo |
|---|---|---|
| **Dashboard** | `/reproducao` | Kanban + KPIs + Repetidoras + Distribuição por status |
| **Histórico** | `/reproducao/eventos` | Lista filtrada de eventos reprodutivos |
| **Reprodutores** | `/reproducao/reprodutores` | CRUD de reprodutores |
| **Parâmetros** | `/reproducao/parametros` | Metas reprodutivas da fazenda |
| ~~Indicadores~~ | `/reproducao/indicadores` | redirect → `/reproducao` |
| ~~Repetidoras~~ | `/reproducao/repetidoras` | redirect → `/reproducao` |

**Componente principal**: `components/rebanho/reproducao/DashboardReprodutivo.tsx`

O `page.tsx` do Dashboard executa 12 queries em paralelo (`Promise.all`):
- `listByPeriodo` (últimos 120 dias) — para o Kanban
- `animais` (id, brinco, lote_id, status_reprodutivo, tipo_rebanho) — para o Kanban
- `queryRepetidoras.list` — para o card de repetidoras
- 8 queries de indicadores (`getTaxaPrenhez`, `getContagemPorStatus`, `getPSMMedia`, `getIEPMedia`, `getTaxaConcepçãoIA`, `getDiasEmAberto`, `getTaxaServiço`, `getIdadePrimeiraPariçao`)
- `queryParametrosReprodutivos.get` — metas da fazenda

**Seções do Dashboard**:
1. **Cards de contagem rápida** — Prenhez Confirmada (`status = prenha`), Fêmeas em Aberto (`vazia + inseminada`), Em Lactação, Repetidoras (card clicável que expande lista inline com badge âmbar)
2. **Kanban de Acompanhamento** (3 colunas, sem coluna "Histórico") — Diagnóstico Pendente, Parto Próximo, Secagem Próxima; com filtros de Lote, Data Inicial e Data Final
3. **Indicadores Reprodutivos** — Taxa de Prenhez (com Progress bar vs meta), PSM Médio, IEP Médio, Taxa Concepção IA, Dias em Aberto, Taxa de Serviço, Idade 1ª Parição
4. **Distribuição por Status Reprodutivo** — gráfico de pizza (Recharts via `next/dynamic ssr:false`)

**Aba Histórico** (`EventosListagem`): tabela filtrada por tipo e data — apenas eventos reprodutivos (cobertura, diagnóstico, parto, secagem, aborto, descarte). `ReproducaoStats` (cards coloridos) foi removido.

**`CalendarioReprodutivo.tsx`** e **`IndicadoresCard.tsx`** e **`RepetidorasAlerta.tsx`** — componentes legados, não mais usados pelo Dashboard principal. Podem ser removidos em cleanup futuro se nenhuma outra rota os importar.

### Reprodutores (`/reproducao/reprodutores/[id]`)
- Página detalhada: Server Component busca dados reais via `queryReprodutores.getById(id)`
- Client Component `ReprodutorDetailClient.tsx` usa `useAuth()` para lógica de permissão
- Lista de coberturas via `queryEventosRebanho.listCoberturasPorReprodutorId(id)`: filtra `eventos_rebanho` por `reprodutor_id` + `tipo = 'cobertura'`, join com `animais(brinco, nome)`
- Botões Editar/Deletar visíveis apenas para `perfil === 'Administrador'`

### Registro de Eventos por Animal
- Rota `/rebanho/[id]/evento` existe e funcional (criada na refatoração v3)

### Lançamento em Lote de Eventos (100% implementado — 2026-05-29)

Rota: `/dashboard/rebanho/eventos/lote/novo`

**Conceito**: wizard de 3 etapas que permite ao Administrador registrar o mesmo tipo de evento em N animais de uma só vez, com campos compartilhados (iguais para todos) e campos individuais (por animal).

**Migration**: `20260529000004_lote_eventos_rebanho.sql`
- 3 novos valores adicionados ao enum `tipo_evento_rebanho`: `aspiracao_opu`, `protocolo_hormonal`, `transferencia_embriao`
- 10 novas colunas em `eventos_rebanho` com CHECK constraints espelhando o Zod
- `vw_animais_completos` recriada via `CREATE OR REPLACE`
- RPC `registrar_evento_com_status` atualizada para incluir todos os novos campos

**Etapas do wizard**:
1. **Tipo** — seleção do tipo de evento (15 tipos disponíveis, incluindo os 3 novos)
2. **Animais** — seleção múltipla com busca por brinco/nome/lote; preview de quantidade selecionada
3. **Dados** — campos compartilhados (iguais para todos) + campos individuais por animal (tabela inline)

**Campos condicionais por tipo** (`CamposCompartilhados.tsx`): estrutura Padrão B (shadcn/ui Form) com seções que aparecem/somem conforme o tipo escolhido. Inputs diretos por linha na tabela individual (não usa RHF por linha — padrão correto para tabela de dados).

**Server Action** (`criarEventosLoteAction`):
- Usa `Promise.allSettled` — falha em um animal não cancela os demais
- Usa a RPC `registrar_evento_com_status` (resolve `fazenda_id` internamente, atualiza `status_animal` para `Descartado` quando `tipo === 'descarte'`)
- Retorna `ResultadoLote` com arrays `inseridos` e `erros` (com `brinco` de cada falha)

**Funções puras** (`lib/utils/rebanho-lote.ts`):
- `calcularResumoResultado(resultado)` — contagem de inseridos/erros
- `formatarMensagemErros(erros)` — string legível para toast
- `validarDadosIndividuais(animais, tipo)` — verifica campos obrigatórios antes de submeter
- `filtrarAnimaisPorBusca(animais, termo)` — filtro client-side por brinco/nome/lote
- `ordenarAnimaisPorBrinco(animais)` — ordenação padrão

**Permissões**: exclusivo para `Administrador` — `layout.tsx` redireciona qualquer outro perfil para `/dashboard/rebanho`.

**Entrypoint**: botão "Lançamento em Lote" (ícone `ClipboardList`) adicionado em `RebanhoClient.tsx`, posicionado antes do botão "Novo Animal".

**Arquivos**:
- `lib/types/rebanho-lote.ts` — tipos e constantes
- `lib/validations/rebanho-lote.ts` — schemas Zod com discriminated unions
- `lib/supabase/rebanho-lote.ts` — `listAnimaisAtivosParaLote()` (join com lotes, colunas explícitas)
- `lib/utils/rebanho-lote.ts` — 5 funções puras
- `app/dashboard/rebanho/eventos/lote/novo/layout.tsx` — guard Admin
- `app/dashboard/rebanho/eventos/lote/novo/page.tsx` — RSC com Promise.all (animais + lotes)
- `app/dashboard/rebanho/eventos/lote/novo/EventosLoteClient.tsx` — wizard 3 etapas
- `app/dashboard/rebanho/eventos/lote/novo/CamposCompartilhados.tsx` — campos condicionais por tipo
- `app/dashboard/rebanho/eventos/lote/actions.ts` — `criarEventosLoteAction`

**Testes**: 46 casos em `__tests__/rebanho/lote-eventos.test.ts`

### Backlog documentado (não implementar sem instrução)
- **T43** (`indicadores/actions.ts`): ranking comparativo por lote — bloqueado por falta de critério de ordenação
- **Eficiência Alimentar** (`leiteira/page.tsx`): litros/kg MS — bloqueado aguardando query de consumo do módulo Silos

**Arquivos principais**:
- `lib/supabase/rebanho.ts` — queries animais/lotes/eventos/pesos/importação CSV
- `lib/supabase/rebanho-reproducao.ts` — queries reprodutores, eventos reprodutivos, coberturas, lactações, parâmetros
- `lib/supabase/rebanho-leiteira.ts` — queries producoes_leiteiras
- `lib/supabase/rebanho-sanitario.ts` — queries eventos_sanitarios + listAlertasSanitarios()
- `lib/supabase/rebanho-movimentacoes.ts` — queries movimentações consolidadas
- `lib/supabase/rebanho-movimentacoes-actions.ts` — helpers de movimentações
- `lib/supabase/rebanho-indicadores.ts` — queries de alertas: partos, pesagens, vacas secas
- `lib/types/rebanho.ts` — Animal, Lote, EventoRebanho, StatusAnimal, TipoRebanho
- `lib/types/rebanho-leiteira.ts` — ProducaoLeiteira, IndicadoresLeiteiros
- `lib/types/rebanho-sanitario.ts` — EventoSanitario (discriminated union por tipo)
- `lib/types/rebanho-reproducao.ts` — Reprodutor, EventoReprodutivo, CoberturaDoReprodutorRow, ParametrosReprodutivosFazenda, Lactacao
- `lib/validations/rebanho.ts` — schemas Zod (animal, lote, pesagem, produção, sanitário)
- `lib/validations/rebanho-lote.ts` — schemas Zod para lançamento em lote (discriminated unions por tipo)
- `lib/calculos/indicadores-rebanho.ts` — GMD, IEP, arrobas, projeção de abate, taxa de concepção
- `lib/utils/rebanho-lote.ts` — 5 funções puras: calcularResumoResultado, formatarMensagemErros, validarDadosIndividuais, filtrarAnimaisPorBusca, ordenarAnimaisPorBrinco
- `app/dashboard/rebanho/actions.ts` — Server Actions gerais (animais, lotes)
- `app/dashboard/rebanho/reproducao/actions.ts` — Server Actions reprodução
- `app/dashboard/rebanho/sanidade/actions.ts` — Server Actions sanitários
- `app/dashboard/rebanho/movimentacoes/actions.ts` — Server Actions movimentações
- `app/dashboard/rebanho/leiteira/actions.ts` — Server Actions produção leiteira
- `app/dashboard/rebanho/corte/actions.ts` — pesagem em lote
- `app/dashboard/rebanho/indicadores/actions.ts` — Server Actions KPIs e alertas
- `app/dashboard/rebanho/eventos/lote/actions.ts` — `criarEventosLoteAction` (Promise.allSettled, retorna ResultadoLote)

**Testes**: 2 falhos pré-existentes sem relação com o código: `__tests__/security/rls.test.ts` (timeout de rede — tenta conectar ao Supabase real), `lib/supabase/__tests__/projetar-rebanho.test.ts` (falha de lógica pré-existente em classificação de categoria)

### 📋 Assessoria Agronômica (100% implementado — 2026-05-20)

**Tabelas do banco**:
`anotacoes_assessoria`, `horarios_disponiveis_consultor`, `agendamentos_usuario`, `historico_atendimentos`

**Conceito**: Sistema de agendamento com link mágico para consultores. Usuário solicita reunião → email com link JWT → consultor confirma/recusa/remarca sem login.

**Fluxo simplificado**:
1. Admin configura horários disponíveis (via painel admin)
2. Usuário visualiza agenda e clica em horário
3. Usuário preenche formulário com **telefone** (contato direto)
4. Sistema envia email para consultor (noreply@gestsilo.com.br via Resend)
5. Email contém: data/hora, fazenda, responsável, **telefone para contato**, botões de ação
6. Consultor clica link mágico (JWT válido 24h) → página pública sem autenticação
7. Consultor: confirma, recusa com motivo, ou sugere nova data
8. Status atualizado em tempo real para usuário

**Tabelas & RLS**:
- `anotacoes_assessoria` — bloco de notas da fazenda (soft-delete, RLS por `fazenda_id`, apenas Admin)
- `horarios_disponiveis_consultor` — agenda do consultor (pública quando `disponivel = TRUE`, Admin cria/edita)
- `agendamentos_usuario` — solicitações de reunião (RLS: usuários veem seus próprios, consultores veem os deles)
- `historico_atendimentos` — pós-reunião (rastreamento de assessoria realizada)

**Tipos e Validações**:
- `tipo_agendamento`: `reuniao_video` | `chamada_telefone`
- `status_agendamento`: `solicitado` | `confirmado` | `recusado` | `remarcado` | `cancelado` | `concluido`
- `categoria_anotacao`: `duvida` | `observacao_campo` | `sugestao` | `outro`
- `prioridade_anotacao`: `baixa` | `normal` | `alta` | `urgente`

**Recurso crítico — Telefone no Email**:
Usuário fornece telefone ao agendar → incluído no email para consultor → facilita contato direto sem Google Calendar.

> ⚠️ O campo `telefone` **não está** na interface `AgendamentoUsuario` em `lib/types/assessoria.ts`. Verificar se é capturado via `observacoes` ou campo separado no formulário antes de assumir que está persistido.

**Permissões por perfil**:
- **Admin**: CRUD completo anotações, visualizar/gerenciar agendamentos da fazenda, painel admin de horários
- **Operador**: sem acesso ao módulo (redireciona para `/dashboard`)
- **Visualizador**: sem acesso ao módulo (redireciona para `/dashboard`)
- **Consultor (externo)**: acesso público ao link mágico (sem login), pode confirmar/recusar/remarcar

> ⚠️ O guard de perfil **não está no `layout.tsx`** (arquivo está vazio). O redirecionamento é feito via `useEffect` no `page.tsx` — qualquer perfil diferente de `Administrador` é redirecionado.

**Email & Autenticação**:
- Serviço: Resend (`noreply@gestsilo.com.br`, domínio verificado)
- Tokens JWT: HS256, validade 24h, payload: `agendamento_id` + `tipo` (confirmar/recusar/remarcar)
- Geração: `lib/services/email.ts` via `jsonwebtoken`

**Painel Admin para Horários** (`app/dashboard/assessoria/admin/horarios/`):
- Listar horários por data (grid responsivo)
- Criar horário individual (data, hora, duração)
- Gerar período (range de datas, hora início/fim, intervalo, dias da semana)
- Marcar como disponível/indisponível
- Deletar horário

**Navegação**:
- **Sidebar**: item "Assessoria agronômica" em Ferramentas (visível apenas Admin)
- **Hub** (`/dashboard/assessoria`): 2 seções — `BlocoNotasSection` (anotações) + `AgendamentosConfirmadosSection` (agendamentos confirmados)
- **Admin** (`/dashboard/assessoria/admin/horarios`): CRUD de horários

**Arquivos principais**:
- `lib/types/assessoria.ts` — tipos TypeScript (CategoriaAnotacao, HorarioDisponivel, AgendamentoUsuario, HistoricoAtendimento, etc.)
- `lib/validations/assessoria.ts` — 4 schemas Zod (anotação, agendamento, status, histórico)
- `lib/supabase/assessoria.ts` — queries (anotações, horários, agendamentos, histórico)
- `lib/services/email.ts` — geração JWT e envio email via Resend (com telefone no template)
- `app/dashboard/assessoria/actions.ts` — Server Actions (CRUD anotações, agendamentos, histórico)
- `app/dashboard/assessoria/layout.tsx` — arquivo vazio (guard feito no `page.tsx`)
- `app/dashboard/assessoria/page.tsx` — composição das 2 seções; guard Admin via `useEffect` (redireciona não-Admin)
- `app/dashboard/assessoria/components/` — BlocoNotasSection, AnotacaoForm, AnotacoesFilters, AnotacoesList, CalendarioAgendamento, AgendamentoForm, AgendamentosConfirmadosSection, SolicitarConsultaDialog, DeleteAnotacaoDialog
- `app/dashboard/assessoria/admin/actions.ts` — Server Actions admin (criar/deletar/marcar disponibilidade/gerar período de horários)
- `app/dashboard/assessoria/admin/horarios/page.tsx` — painel admin horários
- `app/dashboard/assessoria/admin/horarios/components/` — CriarHorarioDialog, GerarHorariosPeriodoDialog
- `app/assessor/confirmar/page.tsx` — página pública (link mágico, sem autenticação)
- `app/assessor/confirmar/layout.tsx` — Suspense para useSearchParams (dinâmico)

Fluxo obrigatório para novas features:
1. Pesquisa → gera PRD-[feature].md
2. Especificação → lê PRD, gera SPEC-[feature].md  
3. Execução → lê SPEC, implementa em camadas (banco → backend → UI)
4. Validação → npm run build + npm run test (mínimo 900 testes passando; warnings React Compiler sobre form.watch() são pré-existentes)

Nunca escrever código na fase de pesquisa ou especificação.
Nunca entrar em modo plan na fase de execução.
Sempre consultar database-snapshot.md antes de propor schema.
Sempre seguir padrões do CLAUDE.md.

**Variáveis de Ambiente**:
```
JWT_SECRET=<sua-chave-256-bits>
NEXT_PUBLIC_APP_URL=https://gestsilo.com (ou http://localhost:3000)
NEXT_PUBLIC_CONSULTOR_EMAIL=gestsilo.app@gmail.com
RESEND_API_KEY=<chave-resend>
```

### ⚙️ Configurações (atualizado 2026-06-01)

Arquivo: `app/dashboard/configuracoes/` (page.tsx + ConfiguracoesClient.tsx)

**4 abas**:
- **Meu Perfil** — editar nome, email, senha. ✅ Completo.
- **Dados da Fazenda** — editar nome, cidade (geocoding), área e coordenadas. ✅ Completo.
- **Usuários e Acessos** — tabela de usuários com nome/email/perfil/status. ✅ Completo para visualização.
- **Unidades de Medida** — pesos de concha e vagão em toneladas (por fazenda). ✅ Completo (2026-06-01).

**Convite de usuário**: ✅ Implementado via `components/InviteUserModal.tsx` + `app/api/auth/invite/route.ts`. Admin escolhe email e perfil (Operador ou Visualizador); sistema envia email com senha temporária via Resend.

**Unidades de Medida para Operador** (implementado 2026-06-01):
- Tabela `configuracoes_fazenda` (1 row por fazenda, `UNIQUE(fazenda_id)`) armazena `peso_concha_ton` e `peso_vagao_ton`
- Admin configura via aba "Unidades de Medida" em Configurações → Server Action `salvarConfiguracoesPesosAction` (upsert)
- Operador vê seletor de unidade (Toneladas / Conchas / Vagões) nos formulários de Fornecimento e Descarte — apenas as unidades configuradas aparecem
- Conversão feita no cliente antes do submit; valor persistido sempre em toneladas; preview "≈ X.XXX t" exibido em tempo real
- Offline: a conversão acontece no cliente antes de enfileirar no IndexedDB — nenhuma mudança no `syncQueue`
- Queries: `getConfiguracoesFazenda()` (client-side) e `getConfiguracoesFazendaServer()` (server-side) em `lib/supabase/configuracoes.ts`
- RLS: SELECT para qualquer perfil autenticado da fazenda; INSERT/UPDATE apenas Admin

**Lacunas conhecidas**:
- Remoção de usuário: exibe toast "em breve" — não implementado.
- Troca de perfil (role) de usuário existente: não implementado.

### 🔔 Alertas por Email — Cron Job (100% implementado — 2026-05-24)

**Arquitetura**: Vercel Cron Job (`vercel.json`, schedule `0 6 * * *` = 3h Brasília) → `POST /api/cron/alertas` → `lib/services/alertas-email.ts`

**Alertas cobertos** (1 email consolidado por fazenda, apenas se houver alertas):
- Autonomia de silagem < 30 dias
- Perdas de silagem > 20%
- Piquetes com ocupação vencida (`data_saida_real IS NULL` e `data_saida_prevista < hoje`)
- Piquetes em Descanso há mais de 3 dias sem uso (`updated_at < hoje - 3 dias`)

**Segurança**: header `Authorization: Bearer CRON_SECRET` validado na route. Service role key bypassa RLS para iterar sobre todas as fazendas.

**Padrão de falha**: `Promise.allSettled` — erro em uma fazenda não para as demais. Rejections logadas via `console.error` (capturadas pelo Sentry).

**Template**: `lib/email/templates/alertas-fazenda.ts` — função pura `gerarEmailAlertasFazenda(fazendaNome, alertas, appUrl)`. Dark mode, paleta do projeto.

**⚠️ Ação necessária antes do deploy**: adicionar `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` nas variáveis de ambiente do projeto na Vercel. Sem essas duas variáveis o cron falha silenciosamente.

**Testes**: 27 casos em `__tests__/alertas-email/verificacoes.test.ts`

### 🔔 Notificações / Push

Email proativo implementado via cron job (ver seção Alertas por Email acima).
Web Push / FCM: não implementado.

### 📅 Calendário Unificado (100% implementado — 2026-05-24)

**Conceito**: visão consolidada de todos os eventos da fazenda em um calendário mensal, agregando 11 tabelas distintas sem nenhuma tabela nova.

**Fontes de dados** (11 tabelas consultadas em `lib/supabase/calendario.ts`):
`atividades_campo`, `manutencoes`, `planos_manutencao`, `abastecimentos`,
`uso_maquinas`, `eventos_sanitarios`, `producoes_leiteiras`, `eventos_rebanho`,
`ocupacoes_piquete`, `eventos_manejo_pastagem`, `atividades_mao_obra`

**Padrão de busca**:
- RSC (`page.tsx`) recebe `searchParams.mes` (formato `YYYY-MM`) e busca apenas o mês requisitado no banco
- Navegação entre meses via `router.push` com novo `searchParams.mes` — re-executa o RSC, zero fetch client-side
- Filtro de módulos (Silos, Talhões, Frota, etc.) é local (client-side), sem re-fetch ao banco

**Card "Atividades Recentes"**:
- Janela D-2 até hoje, máx. 8 itens
- Obtido via `getAtividadesRecentes()` em `lib/supabase/calendario.ts`
- Renderizado em `components/dashboard/AtividadesRecentesList.tsx`

**Guard de perfil**: `app/dashboard/calendario/layout.tsx` redireciona Operador → `/operador`

**Arquivos principais**:
- `lib/types/calendario.ts` — tipos `EventoCalendario`, `ModuloCalendario`, `FiltroCalendario`
- `lib/utils/calendario.ts` — funções puras: agrupar eventos por dia, calcular range do mês, formatação
- `lib/supabase/calendario.ts` — queries paralelas das 11 tabelas + `getAtividadesRecentes()`
- `app/dashboard/calendario/page.tsx` — RSC: lê `searchParams.mes`, Promise.all das queries, passa dados ao Client
- `app/dashboard/calendario/CalendarioClient.tsx` — grid mensal, filtros locais, navegação entre meses
- `app/dashboard/calendario/layout.tsx` — guard de perfil (Operador → `/operador`)
- `components/dashboard/AtividadesRecentesList.tsx` — card de atividades recentes (D-2 até hoje)

**Testes**: 30+ cenários em `__tests__/calendario/`

### 📊 Relatórios Exportáveis (100% implementado — 2026-05-26)

| Módulo | Formato | Biblioteca | Conteúdo |
|---|---|---|---|
| `calculadoras/` | PDF | jsPDF | Laudos de calagem e adubação NPK |
| `rebanho/indicadores/` | PDF + CSV | jsPDF + autoTable / nativo | Indicadores zootécnicos, composição do rebanho |
| `relatorios/` | XLSX + PDF | ExcelJS + jsPDF + autoTable | 15 relatórios cobrindo 14 módulos |

**Módulo `relatorios/` — arquitetura atual**:

O módulo foi reestruturado em 5 seções principais na página:

1. **Relatórios Gerenciais** — Financeiro (XLSX), Balanço Forrageiro (PDF)
2. **Operacional** — Talhões (XLSX), Silos/Movimentações (XLSX), Frota (XLSX), Pastagens (XLSX), Mão de Obra (XLSX)
3. **Estoque e Insumos** — Insumos (XLSX), Produtos (XLSX), Planejamento de Compras (XLSX)
4. **Rebanho** — Rebanho completo com construtor dinâmico (XLSX/PDF), Indicadores Zootécnicos (PDF)
5. **Assessoria e Calendário** — Anotações de Assessoria (XLSX), Calendário de Atividades (XLSX)

**Construtor dinâmico de Relatório de Rebanho**:
- 25 campos selecionáveis organizados em 7 categorias: Identificação, Produção Leiteira, Reprodução, Saúde e Sanitário, Pesagens e GMD, Genética e Raça, Dados da Fazenda
- Usa a view Postgres `vw_animais_completos` (criada com `security_invoker`)
- Exporta para XLSX ou PDF conforme escolha do usuário

**Helpers e componentes reutilizáveis**:
- `lib/relatorios/excel-builder.ts` — `gerarExcel(config)` async (ExcelJS) e tipos `AbaConfig`, `ColunaConfig`, `ExcelReportConfig`; sempre usar `await gerarExcel(...)` nos consumers
- `lib/pdf/relatorio-helpers.ts` — `gerarPdf(titulo, colunas, dados, nomeArquivo)` genérico (jsPDF)
- `lib/utils/date-range.ts` — `toUtcRangeFromLocal(dataInicio, dataFim)` para converter range local → UTC sem shift
- `components/relatorios/PeriodoFilter.tsx` — seletor de período reutilizável (data início/fim)
- `components/relatorios/RelatorioCard.tsx` — card padrão para cada relatório
- `components/relatorios/ExportButtons.tsx` — botões de exportação (XLSX / PDF)

**Correções incluídas (T-5.x — 2026-05-29)**:
- Bloqueio de Operador em rotas e Sidebar do módulo de Relatórios
- `select('*')` eliminados em todas as queries Supabase do codebase (T-5.12)
- Aba de Movimentações de Silos exibe nome do silo (não UUID)
- Card duplicado "Inventário de Estoque" removido
- Botão obsoleto "Configurar Dashboards" removido
- `PeriodoFilter.tsx` movido de `components/ui/` para `components/relatorios/` (T-5.1)
- `handleExport` substituído por `toast.promise` em `RelatoriosClient.tsx` (T-5.7)

**View Postgres**:
- `vw_animais_completos` — view com `security_invoker` que une `animais`, `lotes`, `pesos_animal`, `producoes_leiteiras`, `eventos_sanitarios`, `eventos_rebanho` e `reprodutores` para alimentar o construtor dinâmico de relatório de rebanho

---
