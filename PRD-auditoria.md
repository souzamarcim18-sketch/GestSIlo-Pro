# PRD — Auditoria de Codebase GestSilo Pro

**Data:** 2026-06-01  
**Versão:** 1.0  
**Escopo:** Auditoria completa pré-refatoração  
**Propósito:** Identificar problemas estruturais, código desnecessário e propor plano de ação priorizado

---

## ETAPA 1 — MAPEAMENTO GERAL

### Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Framework | Next.js App Router | 15.4.9 |
| Runtime | React | 19.2.1 |
| Linguagem | TypeScript | 5.9.3 strict |
| Banco de Dados | Supabase (PostgreSQL) | @supabase/supabase-js 2.101.1 |
| UI Base | shadcn/ui + Radix UI | — |
| Estilização | Tailwind CSS | 4.1.11 |
| Validação | Zod | 4.3.6 |
| Formulários | React Hook Form + @hookform/resolvers | 7.72.1 + 5.2.1 |
| Data Fetching (client) | TanStack React Query | 5.99.0 |
| Ícones | Lucide React | 0.553.0 |
| Gráficos | Recharts | 3.8.1 |
| Exportação Excel | ExcelJS | 4.4.0 |
| Exportação PDF | jsPDF + jspdf-autotable | 2.5.2 + 5.0.7 |
| Email | Resend | 6.12.3 |
| PWA | @serwist/next | 9.5.11 |
| Monitoramento | Sentry | 8.x |
| Rate Limiting | @upstash/ratelimit + @upstash/redis | — |
| Autenticação JWT | jsonwebtoken | 9.0.3 |
| CSV | PapaParse | 5.5.3 |

### Estrutura de Diretórios

```
GestSIlo-Pro/                      (~596 arquivos .ts/.tsx, ~112.000 linhas)
├── app/                           (296 arquivos — 51.492 linhas)
│   ├── api/
│   │   ├── auth/login, register, forgot-password, invite
│   │   ├── assessoria/solicitar-consulta, agendamentos/[id]
│   │   ├── cron/alertas
│   │   ├── export/preview-pdf, preview-excel
│   │   ├── weather/
│   │   └── geocoding/
│   ├── dashboard/
│   │   ├── page.tsx               (561 linhas — monolítico)
│   │   ├── DashboardClient.tsx
│   │   ├── dashboard-data.ts
│   │   ├── alertas-helpers.ts
│   │   ├── assessoria/
│   │   ├── balanco-forrageiro/
│   │   ├── calculadoras/
│   │   ├── calendario/
│   │   ├── configuracoes/
│   │   ├── financeiro/
│   │   ├── frota/
│   │   ├── insumos/
│   │   ├── mao-de-obra/
│   │   ├── onboarding/
│   │   ├── pastagens/
│   │   ├── planejamento-compras/
│   │   ├── planejamento-silagem/
│   │   ├── produtos/
│   │   ├── rebanho/               (~60 arquivos, maior seção)
│   │   │   ├── [id]/page.tsx      (688 linhas — maior página)
│   │   │   ├── eventos/lote/novo/
│   │   │   ├── indicadores/
│   │   │   ├── reproducao/
│   │   │   ├── leiteira/
│   │   │   ├── corte/
│   │   │   ├── sanidade/
│   │   │   └── movimentacoes/
│   │   ├── relatorios/
│   │   ├── silos/
│   │   ├── suporte/
│   │   └── talhoes/
│   ├── assessor/confirmar/
│   ├── operador/
│   ├── login/, register/, forgot-password/
│   ├── sw.ts                      (Service Worker Serwist)
│   └── ~offline/
├── components/                    (121 arquivos)
│   ├── ui/                        (30+ shadcn/ui)
│   ├── rebanho/                   (40+ componentes)
│   │   ├── leiteira/
│   │   ├── corte/
│   │   ├── reproducao/
│   │   ├── sanidade/
│   │   ├── lote/
│   │   └── EventoForm/
│   ├── planejamento-compras/      (10 componentes)
│   ├── relatorios/
│   ├── auth/
│   ├── offline/
│   ├── dashboard/
│   ├── icons/
│   └── widgets/
├── lib/                           (122 arquivos)
│   ├── supabase/                  (35 arquivos — acesso a dados)
│   │   └── relatorios/            (8 arquivos — subfolder único)
│   ├── types/                     (12 arquivos de tipos de domínio)
│   ├── validations/               (14 schemas Zod)
│   ├── hooks/                     (8 hooks React Query)
│   ├── calculadoras/              (5 arquivos — motor NPK, calagem)
│   ├── calculos/                  (indicadores de rebanho)
│   ├── auth/                      (guards, rate-limit, logger)
│   ├── services/                  (email, alertas)
│   ├── email/templates/
│   ├── db/                        (IndexedDB offline)
│   ├── csv/
│   ├── pdf/                       (2 geradores PDF específicos)
│   ├── relatorios/                (builders genéricos PDF+Excel)
│   ├── utils/                     (funções utilitárias específicas)
│   ├── branding/tokens.ts
│   ├── constants/
│   └── utils.ts                   (utilitários base — formatBRL, formatDate, daysBetween)
├── hooks/                         (5 arquivos — PASTA DUPLICADA)
│   └── useAuth.ts                 (apenas re-export de 3 linhas!)
├── providers/
│   └── AuthProvider.tsx
├── types/                         (3 arquivos — PASTA DUPLICADA de lib/types/)
│   ├── insumos.ts
│   ├── rebanho-indicadores.ts
│   └── supabase.ts
├── __tests__/                     (24 arquivos de testes)
├── tests/security/                (suite RLS Supabase)
├── e2e/                           (Playwright)
├── supabase/migrations/
├── docs/
│   └── database-snapshot.md
├── scripts/
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── middleware.ts
├── vitest.config.ts
└── sentry.*.config.ts
```

### Domínio do Sistema

GestSilo é uma plataforma SaaS de gestão agrícola com 14 módulos principais:

| Módulo | Rotas | Status |
|--------|-------|--------|
| Dashboard | /dashboard | ✅ Core |
| Silos | /dashboard/silos | ✅ Core |
| Talhões | /dashboard/talhoes | ✅ Completo |
| Frota | /dashboard/frota | ✅ Completo |
| Insumos | /dashboard/insumos | ✅ Completo |
| Financeiro | /dashboard/financeiro | ✅ Completo |
| Rebanho | /dashboard/rebanho | ✅ Completo (maior) |
| Pastagens | /dashboard/pastagens | ✅ Completo |
| Mão de Obra | /dashboard/mao-de-obra | ✅ Completo |
| Produtos | /dashboard/produtos | ✅ Completo |
| Plan. Compras | /dashboard/planejamento-compras | ✅ Completo |
| Balanço Forrageiro | /dashboard/balanco-forrageiro | ✅ Completo |
| Calendário | /dashboard/calendario | ✅ Completo |
| Relatórios | /dashboard/relatorios | ✅ Completo |
| Calculadoras | /dashboard/calculadoras | ✅ Completo |
| Assessoria | /dashboard/assessoria | ✅ Completo |
| Configurações | /dashboard/configuracoes | ✅ Completo |
| Operador | /operador | ✅ (Offline PWA) |

---

## ETAPA 2 — CODEBASE AUDIT

### Classificação Geral

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| Arquivos necessários (base) | ~400 | ✅ |
| Arquivos suspeitos (estrutural) | ~30 | ⚠️ |
| Arquivos desnecessários | ~5-8 | ❌ |

---

### Achado 1 — Duplicação de Formatação de Datas (CRÍTICO)

**Gravidade:** Alta  
**Tipo:** Duplicação de lógica

`lib/utils.ts` exporta `formatDate(dateString: string | Date): string` — função canônica de formatação de datas.

`app/dashboard/alertas-helpers.ts` exporta `formatarDataBR(iso: string): string` — implementação local **idêntica em propósito**.

**Impacto:** Dois caminhos para o mesmo resultado. Quem adicionar alertas no futuro pode usar a versão errada.

**Ação:** Remover `formatarDataBR()` de `alertas-helpers.ts` e substituir por `formatDate()` de `lib/utils.ts`.

---

### Achado 2 — Pastas Duplicadas: `hooks/` vs `lib/hooks/` (ESTRUTURAL)

**Gravidade:** Média  
**Tipo:** Duplicação estrutural

| Pasta | Arquivos | Padrão |
|-------|----------|--------|
| `hooks/` (raiz) | useAuth.ts, useReprodutores.ts, e outros 3 | useState + useEffect (padrão antigo) |
| `lib/hooks/` | useInsumos.ts, useCategorias.ts, useSyncOnReconnect.ts, etc. | TanStack React Query (padrão atual) |

**Problema específico:**
- `hooks/useAuth.ts` é um re-export de 3 linhas: `export { useAuth } from '@/providers/AuthProvider'`
- `hooks/useReprodutores.ts` usa `useState + useEffect + fetch` enquanto `lib/hooks/*` usa React Query

**Ação:** Consolidar tudo em `lib/hooks/`. Migrar `useReprodutores` para o padrão React Query.

---

### Achado 3 — Pastas Duplicadas: `types/` vs `lib/types/` (ESTRUTURAL)

**Gravidade:** Média  
**Tipo:** Duplicação estrutural

| Pasta | Arquivos |
|-------|----------|
| `types/` (raiz) | insumos.ts, rebanho-indicadores.ts, supabase.ts (auto-gerado) |
| `lib/types/` | 12 arquivos (rebanho.ts, pastagens.ts, mao-de-obra.ts, etc.) |

**Ação:** Mover `types/insumos.ts` e `types/rebanho-indicadores.ts` para `lib/types/`. O `types/supabase.ts` auto-gerado pode permanecer em `types/` (convenção Next.js).

---

### Achado 4 — Inconsistência no Padrão de Acesso a Dados (CRÍTICO)

**Gravidade:** Alta (risco de segurança — multi-tenancy)

Existem **três estratégias diferentes** de acesso a dados no projeto:

| Estratégia | Onde | Exemplo |
|-----------|------|---------|
| `q.*` (queries-audit.ts) | Client Components | `q.silos.list()`, `q.insumos.get()` |
| `query*` namespace | lib/supabase/rebanho.ts | `queryAnimais.list()`, `queryLotes.get()` |
| `supabase.from()` direto | lib/supabase/talhoes.ts e outros | `supabase.from('tabela').select(...)` |

**Risco:** Consultas com `supabase.from()` direto em lib/ **podem não garantir** que o `fazenda_id` é sempre filtrado, especialmente se chamadas de contextos onde o RLS não cobre todos os casos edge.

**Ação P2:** Unificar sob um único padrão; auditar todos os `supabase.from()` diretos.

---

### Achado 5 — Componentes `*Client.tsx` Como Wrappers (ESTRUTURAL)

**Gravidade:** Média  
**Tipo:** Overhead arquitetural desnecessário

10+ arquivos no padrão:
```
app/dashboard/assessoria/
  ├── page.tsx           → server component (busca dados)
  ├── AssessoriaClient.tsx → 'use client' (recebe dados como props)
  └── actions.ts
```

Esta camada intermédia foi criada para contornar a fronteira Server/Client, mas o Next.js 15 permite que Server Components passem dados diretamente para sub-componentes client sem um wrapper dedicado. O arquivo `*Client.tsx` frequentemente **não faz nada além de adicionar `'use client'` e repassar props**.

Arquivos suspeitos neste padrão:
- `AssessoriaClient.tsx`
- `BalancoForrageiroClient.tsx`
- `InsumosClient.tsx`
- `MaoDeObraClient.tsx`
- `PastagensClient.tsx`
- `RelatoriosClient.tsx`
- `SilosClient.tsx` (pode ter estado legítimo)
- `CalendarioClient.tsx` (idem)

**Nota:** Alguns `*Client.tsx` **têm justificativa legítima** (gerenciam estado local, abrem modais, têm muita interatividade). A auditoria individual de cada um é necessária antes de remover.

---

### Achado 6 — Componentes Muito Grandes (MANUTENIBILIDADE)

**Gravidade:** Média  
**Tipo:** Monólito de componente

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `app/dashboard/rebanho/[id]/page.tsx` | 688 | Maior página do projeto — múltiplas abas, lógica misturada |
| `app/dashboard/page.tsx` | 561 | Dashboard principal monolítico |
| `components/rebanho/FormEventoSanitario.tsx` | 542 | Formulário muito grande, múltiplos tipos de evento |
| `components/rebanho/reproducao/DashboardReprodutivo.tsx` | 519 | Dashboard de reprodução monolítico |
| `components/rebanho/corte/DashboardCorte.tsx` | 464 | Idem para corte |
| `components/rebanho/sanidade/SanidadeDashboard.tsx` | 457 | Idem para sanidade |
| `components/rebanho/leiteira/DashboardLeiteiro.tsx` | 446 | Idem para leiteira |
| `components/Sidebar.tsx` | 401 | Sidebar monolítica |
| `app/dashboard/rebanho/[id]/evento/page.tsx` | 474 | Página grande |

**Regra de ouro:** Componentes > 300 linhas geralmente têm mais de uma responsabilidade.

---

### Achado 7 — `lib/validators/` (Padrão Obsoleto)

**Gravidade:** Baixa  
**Tipo:** Código legado / duplicação

Verificar se existe `lib/validators/` coexistindo com `lib/validations/`. Se existir, os arquivos em `validators/` são o padrão antigo e devem ser migrados ou removidos.

---

### Arquivos ❌ Desnecessários ou Candidatos à Remoção

| Arquivo | Motivo |
|---------|--------|
| `hooks/useAuth.ts` | Re-export de 3 linhas; não adiciona valor — importar direto de `providers/AuthProvider` |
| `app/dashboard/alertas-helpers.ts::formatarDataBR` | Duplicata de `lib/utils.ts::formatDate` |
| `app/dashboard/rebanho/reproducao/indicadores/page.tsx` | Redirect para `/reproducao` — arquivo existe apenas para SEO/compatibilidade |
| `app/dashboard/rebanho/reproducao/repetidoras/page.tsx` | Idem — redirect puro |
| `components/rebanho/reproducao/CalendarioReprodutivo.tsx` | Componente legado, não mais usado pelo Dashboard |
| `components/rebanho/reproducao/IndicadoresCard.tsx` | Componente legado, não mais usado |
| `components/rebanho/reproducao/RepetidorasAlerta.tsx` | Componente legado, não mais usado |

**Nota:** As páginas de redirect têm valor (404 prevention). Os componentes legados de reprodução são candidatos a remoção após confirmação de nenhum import ativo.

---

### Arquivos ⚠️ Suspeitos

| Arquivo | Motivo | Ação |
|---------|--------|------|
| `hooks/useReprodutores.ts` | Usa `useState + fetch` em vez de React Query | Migrar para padrão `lib/hooks/` |
| `lib/hooks/useLocalStorage.ts` | Verificar se realmente importado | Auditar imports |
| `lib/hooks/useOnlineStatus.ts` | Verificar se integrado com `useOfflineSync` | Auditar imports |
| `lib/utils/format-planejamento.ts` | Formatadores específicos isolados | Consolidar em `lib/utils/formatters.ts` |
| `types/insumos.ts` (raiz) | Deveria estar em `lib/types/` | Mover |
| `types/rebanho-indicadores.ts` (raiz) | Deveria estar em `lib/types/` | Mover |

---

## ETAPA 3 — DEPENDENCY ANALYSIS

### Dependências Instaladas

#### `dependencies` (runtime)

| Pacote | Uso | Status |
|--------|-----|--------|
| `next` 15.4.9 | Framework principal | ✅ |
| `react` 19.2.1 | UI runtime | ✅ |
| `typescript` 5.9.3 | Tipagem | ✅ |
| `@supabase/supabase-js` | Cliente Supabase | ✅ |
| `@supabase/ssr` | SSR com cookies | ✅ |
| `zod` 4.3.6 | Validação de schemas | ✅ |
| `react-hook-form` | Formulários | ✅ |
| `@hookform/resolvers` | Integração RHF + Zod | ✅ |
| `@tanstack/react-query` | Data fetching client | ✅ |
| `tailwindcss` 4.1.11 | Estilização | ✅ |
| `lucide-react` | Ícones | ✅ |
| `recharts` | Gráficos | ✅ |
| `date-fns` | Formatação de datas | ✅ (mas subutilizado — ver Achado 1) |
| `exceljs` | Geração XLSX | ✅ |
| `jspdf` + `jspdf-autotable` | Geração PDF | ✅ |
| `resend` | Envio de email | ✅ |
| `@sentry/nextjs` | Monitoramento | ✅ |
| `@serwist/next` + `serwist` | PWA Service Worker | ✅ |
| `papaparse` | Parsing CSV | ✅ |
| `jsonwebtoken` | JWT para link mágico (assessoria) | ✅ |
| `idb` | IndexedDB wrapper (offline) | ✅ |
| `@upstash/ratelimit` + `@upstash/redis` | Rate limiting auth | ✅ (verificar se realmente conectado) |
| `motion` | Animações | ⚠️ Verificar uso real |
| `@base-ui/react` | ⚠️ Possivelmente legado de template | Verificar imports |
| `sharp` | Image optimization | ✅ (build time) |
| `class-variance-authority` | CVA para shadcn | ✅ |
| `clsx` + `tailwind-merge` | Merging de classes | ✅ |
| `sonner` | Toast notifications | ✅ |
| `next-themes` | Dark/Light theme | ✅ |

#### `devDependencies`

| Pacote | Uso | Status |
|--------|-----|--------|
| `vitest` | Test runner | ✅ |
| `@playwright/test` | E2E tests | ✅ |
| `eslint` + `eslint-config-next` | Linting | ✅ |
| `@typescript-eslint/*` | TypeScript ESLint rules | ✅ |
| `shadcn` | CLI shadcn (não runtime) | ✅ (devDep correto) |

### Lógica Reimplementada Manualmente

| Função Local | Lib Equivalente Instalada | Situação |
|--------------|--------------------------|----------|
| `formatarDataBR(iso)` em alertas-helpers.ts | `date-fns` / `formatDate()` de utils.ts | ❌ Duplicata — remover |
| `formatDate()` em lib/utils.ts | `date-fns::format()` | ⚠️ Wrapper legível — OK manter |
| `daysBetween()` em lib/utils.ts | `date-fns::differenceInDays()` | ⚠️ Wrapper simples — OK manter |
| `cn()` (clsx + twMerge) | Padrão shadcn/ui | ✅ Correto |

### Pacotes Para Auditar

1. **`@base-ui/react`** — Instalado mas o projeto usa shadcn/ui como padrão. Se não houver imports ativos, remover.
2. **`motion`** — Verificar se é usado em animações reais ou apenas instalado
3. **`@upstash/redis` + `@upstash/ratelimit`** — Verificar se as credenciais estão configuradas e se o rate limiting está ativo em produção

---

## ETAPA 4 — FOLDER STRUCTURE REVIEW

### Diagnóstico Geral

| Aspecto | Nota | Observação |
|---------|------|------------|
| Reflete o domínio? | 7/10 | Pastas nomeadas por feature — bom. Lib interna ainda genérica |
| Separação de responsabilidades | 6/10 | Lógica de negócio misturada em alguns Client Components |
| Arquivos no lugar certo | 7/10 | 2 pastas duplicadas (`hooks/`, `types/`) no nível raiz |
| Nomenclatura consistente | 8/10 | Padrões `use*`, `query*`, `*FormDialog`, `*Client` — bom |
| Pastas vazias ou com arquivo único | 8/10 | `hooks/` tem poucos arquivos; `providers/` tem apenas 1 |

### Problemas Estruturais Identificados

#### Problema 1: Duas pastas de hooks

```
hooks/                   ← LEGADA (raiz)
  useAuth.ts             ← 3 linhas, re-export
  useReprodutores.ts     ← useState + fetch (padrão antigo)

lib/hooks/               ← ATUAL (React Query)
  useInsumos.ts
  useCategorias.ts
  useSyncOnReconnect.ts
  useDadosOffline.ts
  useOfflineSync.ts
  useInsumos.ts
  ...
```

#### Problema 2: Duas pastas de tipos

```
types/                   ← LEGADA (raiz)
  insumos.ts             ← deveria estar em lib/types/
  rebanho-indicadores.ts ← deveria estar em lib/types/
  supabase.ts            ← auto-gerado, pode ficar aqui

lib/types/               ← ATUAL
  rebanho.ts
  pastagens.ts
  mao-de-obra.ts
  rebanho-reproducao.ts
  ...12 arquivos
```

#### Problema 3: lib/supabase/ com 35 arquivos flat

```
lib/supabase/
  rebanho.ts                 ← 341 linhas
  rebanho-reproducao.ts      ← 172 linhas
  rebanho-leiteira.ts
  rebanho-sanitario.ts
  rebanho-movimentacoes.ts
  rebanho-movimentacoes-actions.ts
  rebanho-indicadores.ts     ← 7 arquivos só de rebanho!
  pastagens.ts               ← 566 linhas
  maquinas.ts
  financeiro.ts
  insumos.ts
  produtos.ts
  talhoes.ts
  mao-de-obra.ts
  balanco-forrageiro.ts
  calendario.ts
  queries-audit.ts           ← padrão diferente
  relatorios/                ← único subfolder
    ├── rebanho.ts
    ├── insumos.ts
    └── ...8 arquivos
```

**Ideal seria:**
```
lib/supabase/
  rebanho/
    index.ts, reproducao.ts, leiteira.ts, sanitario.ts, indicadores.ts
  pastagens/
    index.ts
  insumos/
    index.ts
  financeiro/
    index.ts
  relatorios/
    rebanho.ts, insumos.ts, ...
  queries-audit.ts           ← padrão unificado
  server.ts                  ← cliente Supabase
```

#### Problema 4: providers/ com 1 único arquivo

```
providers/
  AuthProvider.tsx           ← único arquivo
```

Não há problema funcional, mas seria mais idiomático mover para `lib/` ou `components/providers/` se mais providers forem adicionados.

#### Problema 5: lib/pdf/ vs lib/relatorios/

```
lib/pdf/                     ← geradores específicos
  gerarPdfIndicadoresRebanho.ts
  gerarPdfPlanejamento.ts

lib/relatorios/              ← builders genéricos
  pdf-builder.ts
  excel-builder.ts
  rebanho-builder.ts
```

**Duplicação de propósito:** os arquivos em `lib/pdf/` são geradores legados que pré-existem ao sistema de `pdf-builder.ts`. Deveriam ser migrados para usar o builder genérico.

---

## ETAPA 5 — PLANO DE REFATORAÇÃO

### Prioridade 1 — Quick Wins (Risco Baixo, Impacto Alto)

> Podem ser feitos imediatamente, sem risco de quebrar o sistema.  
> Estimativa total: **2-4 horas**

| ID | Ação | Esforço | Impacto |
|----|------|---------|---------|
| **P1.1** | Remover `formatarDataBR()` de `alertas-helpers.ts`, substituir por `formatDate()` de `lib/utils.ts` em todos os callers | 15 min | Remove duplicação de lógica canônica |
| **P1.2** | Mover `types/insumos.ts` e `types/rebanho-indicadores.ts` para `lib/types/`, atualizar imports | 20 min | Elimina pasta duplicada; `types/supabase.ts` permanece |
| **P1.3** | Deletar `hooks/useAuth.ts` (re-export vazio) e atualizar imports para apontar direto a `@/providers/AuthProvider` | 10 min | Remove arquivo morto sem impacto |
| **P1.4** | Auditar e remover componentes legados de reprodução: `CalendarioReprodutivo.tsx`, `IndicadoresCard.tsx`, `RepetidorasAlerta.tsx` (se sem imports ativos) | 20 min | Remove código morto confirmado pelo CLAUDE.md |
| **P1.5** | Consolidar formatadores de unidade em `lib/utils/format-planejamento.ts` para `lib/utils/formatters.ts` (se isolado) | 20 min | Nomenclatura mais clara |
| **P1.6** | Auditar imports de `@base-ui/react` e `motion` — remover se sem uso ativo | 30 min | Reduz bundle size |
| **P1.7** | Verificar e documentar configuração Upstash em produção | 15 min | Confirmar que rate limiting está ativo |

---

### Prioridade 2 — Reorganização Estrutural (Risco Médio, Impacto Alto)

> Requerem mais cuidado mas sem reescrever lógica.  
> Estimativa total: **12-20 horas**

#### P2.1 — Consolidar `hooks/` em `lib/hooks/`

**Situação atual:**
```
hooks/useReprodutores.ts  ← useState + fetch (padrão antigo)
```
**Ação:** Reescrever `useReprodutores` com TanStack Query, mover para `lib/hooks/useReprodutores.ts`, remover pasta raiz `hooks/`.  
**Risco:** Baixo — apenas um componente de UI consome este hook.  
**Pré-requisito:** Nenhum.

#### P2.2 — Reorganizar `lib/supabase/` em subfolders por domínio

**Situação atual:** 35 arquivos flat em `lib/supabase/`  
**Proposta:**
```
lib/supabase/
  rebanho/
    index.ts          ← re-exports públicos
    reproducao.ts
    leiteira.ts
    sanitario.ts
    indicadores.ts
    movimentacoes.ts
  pastagens/
    index.ts
  insumos/
    index.ts
  financeiro/
    index.ts
  ...por domínio
  relatorios/          ← já existe, manter
  server.ts            ← cliente Supabase (manter na raiz)
  queries-audit.ts     ← client queries (manter na raiz)
```
**Risco:** Médio — muitos imports precisam ser atualizados. Fazer em branches separadas por domínio.  
**Pré-requisito:** P1 completo.

#### P2.3 — Migrar `lib/pdf/` para usar `lib/relatorios/pdf-builder.ts`

`gerarPdfIndicadoresRebanho.ts` e `gerarPdfPlanejamento.ts` foram criados antes do builder genérico existir.

**Ação:** Reescrever ambos usando `gerarPdf()` de `pdf-builder.ts`, deletar `lib/pdf/`.  
**Risco:** Baixo — output visual deve ser o mesmo; testar manualmente o PDF gerado.  
**Pré-requisito:** Nenhum.

#### P2.4 — Auditar e avaliar `*Client.tsx` wrappers

Para cada arquivo `*Client.tsx`, classificar em:
- **A — Justificado:** gerencia estado local significativo ou muita interatividade
- **B — Candidato a merge:** apenas repassa props e adiciona `'use client'`

Ação para tipo **B**: inlinar o conteúdo do `*Client.tsx` direto no `page.tsx` ou em sub-componentes menores.

**Risco:** Médio — não quebra funcionalidade, mas requer teste visual.  
**Pré-requisito:** P1 completo.

---

### Prioridade 3 — Refatorações Profundas (Risco Alto, Impacto Muito Alto)

> Requerem planejamento detalhado. Fazer apenas após estabilidade das etapas anteriores.

| ID | Item | Escopo | Impacto | Risco | Esforço | Pré-req |
|----|------|--------|---------|-------|---------|---------|
| **P3.1** | Quebrar `app/dashboard/rebanho/[id]/page.tsx` (688 linhas) | Extrair cada aba (Geral, Pesagens, Reprodução, Leiteira, Sanidade, etc.) em sub-componentes separados | Legibilidade +80% | Médio | 8-10h | P2 estável |
| **P3.2** | Quebrar `FormEventoSanitario.tsx` (542 linhas) | Separar em FormVacinacao, FormVermifugacao, FormTratamento — ou usar discriminated union pattern | Manutenção +70% | Médio | 6-8h | P2 estável |
| **P3.3** | Quebrar dashboards monolíticos em `components/rebanho/` | DashboardReprodutivo (519 linhas), DashboardCorte (464), DashboardLeiteiro (446), SanidadeDashboard (457) | Testabilidade +60% | Médio | 12-16h | P2.4 |
| **P3.4** | Unificar padrão de acesso a dados | Auditar todos os `supabase.from()` diretos em `lib/supabase/*.ts`, garantir que todos filtram por `fazenda_id` | Segurança multi-tenancy | Alto | 8-12h | P2.2 |
| **P3.5** | Aumentar cobertura de testes | Adicionar testes para funções de negócio não cobertas (indicadores, cálculos, formatadores) | Confiança em refatorações | Baixo | 15-20h | Nenhum |

---

### O Que NÃO Tocar (Estável e Crítico)

Estas partes do sistema estão bem implementadas e não devem ser alteradas nesta rodada de refatoração:

| Arquivo / Pasta | Razão |
|----------------|-------|
| `lib/supabase/server.ts` | Inicialização Supabase — crítico |
| `lib/auth/*` | Autenticação e RLS — muito sensível |
| `middleware.ts` | Proteção de rotas SSR — crítico |
| `next.config.ts` | Headers de segurança + Sentry + PWA Serwist |
| `providers/AuthProvider.tsx` | Context global de auth |
| `lib/validations/*` | Schemas Zod em uso múltiplo |
| `app/layout.tsx` + `app/dashboard/layout.tsx` | Estrutura base |
| `components/ui/*` | shadcn/ui — não customizar versão |
| `lib/db/*` | Sistema offline IndexedDB — delicado |
| `lib/branding/tokens.ts` | Fonte única de cores para relatórios |
| `app/sw.ts` | Service Worker Serwist |
| `supabase/migrations/` | Histórico de schema |

---

## RESUMO EXECUTIVO

### Saúde Geral do Codebase

| Métrica | Avaliação | Status |
|---------|-----------|--------|
| Linhas totais | ~112.000 | Normal para um SaaS desta complexidade |
| Duplicação de lógica | Baixa-Média | 2-3 casos concretos identificados |
| Duplicação estrutural | Média | 2 pastas duplicadas (`hooks/`, `types/`) |
| Segurança multi-tenancy | Risco médio | Múltiplos padrões de query coexistindo |
| Tamanho de componentes | Média | 8 componentes com >400 linhas |
| Consistência de padrões | Média | Evolução do codebase deixou padrões antigos |
| Test coverage | ~30-40% | Abaixo do ideal (mínimo 60%) |
| Performance | Boa | Next.js 15 moderno, React Query bem usado |

### Top 5 Problemas Por Prioridade

1. **[Crítico]** Múltiplos padrões de acesso a dados — risco de vazamento multi-tenancy
2. **[Alto]** Duas pastas de hooks e types duplicadas — confusão sobre onde adicionar novos arquivos
3. **[Alto]** `formatarDataBR()` duplica `formatDate()` — violação de Single Source of Truth
4. **[Médio]** Componentes > 400 linhas — difíceis de manter e testar
5. **[Médio]** Componentes legados de reprodução não removidos após reestruturação

### Estimativa de Esforço Total

| Prioridade | Horas Estimadas | Risco |
|-----------|----------------|-------|
| P1 (Quick wins) | 2-4h | Baixo |
| P2 (Reorganização) | 12-20h | Médio |
| P3 (Refatorações profundas) | 50-60h | Alto |
| **Total** | **64-84h** | — |

### Recomendação de Sequência

```
Semana 1:  P1 completo (quick wins, zero risco)
Semana 2:  P2.1 + P2.3 (hooks + pdf migration)
Semana 3:  P2.2 (reorganização lib/supabase/)
Semana 4:  P2.4 (auditoria *Client.tsx)
Semana 5+: P3 (por módulo, começando por rebanho)
```

---

*Documento gerado em 2026-06-01 para uso interno como base de refatoração.*  
*Fonte de referência: CLAUDE.md, database-snapshot.md, análise estática do codebase.*
