# Plano de Execução — Auditoria Técnica GestSilo
**Versão**: 1.1  
**Data**: 28/05/2026  
**Baseado em**: AUDIT_REPORT.md (Agentes 1–7)  
**Autor**: Análise orquestrada Claude Code

| Data | Versão | Alteração |
|---|---|---|
| 28/05/2026 | 1.0 | Versão inicial — Plano gerado a partir do AUDIT_REPORT.md |
| 28/05/2026 | 1.1 | Decisões D-01 a D-07 incorporadas. D-06 movido para Fase 1. D-04 expandido em épico PWA/Serwist (8 sub-tarefas). D-03 movido para Backlog. Plano pronto para execução faseada. |

---

## Resumo Executivo

### Totais por Severidade
| Severidade | Pontos brutos | Após consolidação |
|---|---|---|
| 🔴 Crítico | 5 | 5 |
| 🟠 Médio | 26 | 24 |
| 🟡 Baixo | 25 | 23 |
| **Total** | **56** | **52** |

> Consolidações aplicadas: Items 10+42 (fazendaIdCache) → A-10; Items 1+35 (select('*')) → A-35.

### Status por Tipo de Decisão (v1.1 — todas as decisões incorporadas)
| Status | Qtd | Descrição |
|---|---|---|
| ✅ Pronto para executar | 43 | Sem ambiguidade, solução clara (+7 por D-01 a D-07 resolvidas) |
| ⚠️ Requer adaptação | 7 | Requer análise adicional ou ajuste no escopo |
| 📦 Backlog | 1 | A-09 (D-03) — adiado conscientemente com critérios de reabertura |
| ❌ Não recomendado | 2 | Conflita com regras invioláveis do projeto (A-12) |
| ⏸️ Requer decisão | 0 | Todas as decisões pendentes foram incorporadas |

### Esforço Total Estimado (v1.1 — pós decisões)
| Fase | Tarefas | Esforço estimado |
|---|---|---|
| Fase 1 — Críticos | 7 (+2 por D-02 e D-06) | 6–9h |
| Fase 2 — Estruturais | 13 (+1 sub-tarefa D-01) | 10–15h |
| Fase 3 — Performance | 8 | 6–8h |
| Fase 4 — Qualidade de código | 13 (+2: D-05 + migração xlsx D-07) | 8–12h |
| Fase 5 — Melhorias incrementais | 16 | 8–12h |
| Épico PWA (Fase 2) | 8 sub-tarefas (D-04) | 8–12h |
| **Total** | **~65** | **46–68h** |

> D-03 (modularizar `queries-audit.ts`) movido para Backlog — não incluído nas fases.

### Riscos Principais (atualizado v1.1)
1. **Item A-02** (PATCH quebrado em agendamentos) — bug ativo em produção, causa falha silenciosa na confirmação de agendamentos
2. **Item A-54/D-06** (Playwright apontando produção) — risco real de criar/deletar dados em produção via testes e2e — **promovido a Fase 1**
3. **Item A-15** (guards ausentes em 8 features) — Operador pode ver dados via URL direta até RLS rejeitar
4. **Item A-27** (40+ cores hardcoded) — dark mode parcialmente quebrado em produção
5. **Item A-45** (xlsx vulnerável) — biblioteca abandonada com CVEs — **decisão: migrar para exceljs (D-07)**
6. **Item A-52** (next-pwa sem suporte ao App Router) — **decisão: migrar para Serwist (D-04)** — risco médio-alto no deploy

### Ordem Recomendada de Fases
```
Fase 1 → Fase 2 (inclui Épico PWA) → Fase 3 → Fase 4 → Fase 5
(bugs/segurança) → (estrutura + PWA) → (performance) → (código) → (UX/DX)
```

### Decisões Incorporadas (todas resolvidas em v1.1)
| ID | Decisão tomada |
|---|---|
| D-01 | Defesa em camadas: middleware (UX) + helper `requirePerfil()` (segurança) + RLS (dados) + UI (esconde botões) |
| D-02 | Adicionar Zod em todas as rotas de auth. Schemas em `lib/validations/auth.ts`. Mensagens de erro genéricas para o cliente. |
| D-03 | **ADIADO** — movido para Backlog com critérios de reabertura documentados |
| D-04 | **Migrar para Serwist** — épico com 8 sub-tarefas em Fase 2. Deploy obrigatório em Preview antes do merge. |
| D-05 | Remover `unsafe-eval` do CSP em produção com CSP condicional por ambiente. Validar todas as libs antes do merge. |
| D-06 | **Promovido a Fase 1** — `baseURL` sempre `localhost:3000` via env var com fallback. Nunca apontar produção. |
| D-07 | **Migrar para `exceljs`** — criar helper `lib/excel.ts` de abstração. Fase 4 com sub-tarefas de migração faseada. |

---

## Inventário Completo (Pós-Consolidação)

| # | Severidade | Agente | Descrição resumida | Status |
|---|---|---|---|---|
| A-01 | 🟠 Médio | 1 | Falta `auth.getUser()` explícito nas rotas de assessoria | ✅ |
| A-02 | 🔴 Crítico | 1 | PATCH quebrado em `/api/assessoria/agendamentos/route.ts` | ✅ |
| A-03 | 🟠 Médio | 1 | Ausência de filtro explícito `fazenda_id` em silos.ts e pastagens.ts | ✅ |
| A-04 | 🟠 Médio | 1 | Validação manual (sem Zod) nas rotas de auth e solicitar-consulta | ✅ D-02 resolvido |
| A-05 | 🟠 Médio | 2 | Guards client-side com `useEffect` em balanço-forrageiro e calendário | ✅ D-01 resolvido |
| A-06 | 🟡 Baixo | 2 | `getUser()` chamado duas vezes em `app/dashboard/page.tsx` | ✅ |
| A-07 | 🟠 Médio | 2 | Ausência de `loading.tsx` na raiz do `/dashboard` e módulos | ✅ |
| A-08 | 🟡 Baixo | 2 | Queries de catálogo sem `unstable_cache` | ✅ |
| A-09 | 🟠 Médio | 3 | `queries-audit.ts` monolítico (2.000+ linhas) violando SRP | 📦 D-03 Backlog |
| A-10 | 🟠 Médio | 3+6 | `fazendaIdCache` Map global sem TTL/LRU — memory leak (consolidado 10+42) | ✅ |
| A-11 | 🟡 Baixo | 3 | `daysBetween` duplicada; `formatBRL` duplicada | ✅ |
| A-12 | 🟡 Baixo | 3 | Nomenclatura mista PT/EN (`sou_admin()`/`getCurrentFazendaId()`) | ❌ |
| A-13 | 🟡 Baixo | 3 | `.then()` em vez de `async/await` em 3 arquivos | ✅ |
| A-14 | 🟡 Baixo | 3 | Import `q` não utilizado em `insumos/actions.ts` | ✅ |
| A-15 | 🔴 Crítico | 4 | 8 features sem `layout.tsx` com guard de perfil para Operador | ✅ |
| A-16 | 🟠 Médio | 4 | 6 features sem `actions.ts` (frota, financeiro, calendário, etc.) | ⚠️ |
| A-17 | 🟠 Médio | 4 | Dois padrões de formulário coexistem (Padrão A vs Padrão B) | ⚠️ |
| A-18 | 🟡 Baixo | 4 | Mensagens de erro de formulário com tamanho inconsistente | ✅ |
| A-19 | 🔴 Crítico | 4 | `RegistrarMovimentacaoDialog.tsx` sem RHF/Zod — usa `useState` e validação manual | ✅ |
| A-20 | 🟠 Médio | 4 | Loading state genérico (`animate-pulse`) em Insumos/Produtos em vez de `<Skeleton>` | ✅ |
| A-21 | 🟠 Médio | 4 | Empty state inconsistente entre features — sem componente reutilizável | ✅ |
| A-22 | 🟠 Médio | 4 | Guard do Calendário não exibe toast de feedback (diferente das novas features) | ✅ |
| A-23 | 🟡 Baixo | 4 | Nenhuma feature usa `toast.loading()` / `toast.promise()` | ✅ |
| A-24 | 🟡 Baixo | 4 | Dois padrões de disparo de toast após Server Action | ⚠️ |
| A-25 | 🟠 Médio | 5 | `GradientButton` como componente separado em vez de variante CVA do `Button` | ✅ |
| A-26 | 🟡 Baixo | 5 | `PeriodoFilter` em `components/ui/` — deve ir para `components/relatorios/` | ✅ |
| A-27 | 🔴 Crítico | 5 | 40+ cores hardcoded (`#hex`, `rgba()`) em Header, Sidebar, button, input, select | ✅ |
| A-28 | 🟠 Médio | 5 | `AnimalCard.tsx` usa cores Tailwind brutas (`bg-green-100`, etc.) sem dark mode | ✅ |
| A-29 | 🟠 Médio | 5 | `PlanejamentosList.tsx` usa `bg-green-100` que quebra dark mode | ✅ |
| A-30 | 🟡 Baixo | 5 | Grid `grid-cols-2` fixo em `AnimalCard.tsx` sem breakpoint mobile | ✅ |
| A-31 | 🟡 Baixo | 5 | Tabelas sem colunas ocultas em mobile (`hidden sm:table-cell`) | ✅ |
| A-32 | 🟡 Baixo | 5 | Botões do `Calendar` sem `aria-label` em português | ✅ |
| A-33 | 🟡 Baixo | 5 | Ícones Lucide decorativos sem `aria-hidden="true"` | ✅ |
| A-34 | 🟡 Baixo | 5 | Grupos de rotas do Sidebar sem `role="navigation"` / `aria-label` | ✅ |
| A-35 | 🟠 Médio | 1+6 | `select('*')` em 25+ queries (consolidado itens 1 e 35) | ✅ |
| A-36 | 🟠 Médio | 6 | Recharts (~200 KB) sem `next/dynamic` em ~20 arquivos | ✅ |
| A-37 | 🟡 Baixo | 6 | Fontes Satoshi em TTF em vez de WOFF2 | ✅ |
| A-38 | 🟠 Médio | 6 | `contentStyle` de tooltips Recharts criados inline a cada render | ✅ |
| A-39 | 🟠 Médio | 6 | `InsumosFilters.tsx` recria `Map` sem `useMemo` | ✅ |
| A-40 | 🟡 Baixo | 6 | Estilos `rgba()` inline no `DashboardClient.tsx` | ✅ |
| A-41 | 🟡 Baixo | 6 | 19 queries no `Promise.all` do Dashboard sem separação de prioridade | ⚠️ |
| A-42 | — | — | (consolidado em A-10) | — |
| A-43 | 🟠 Médio | 7 | `shadcn` em `dependencies` em vez de `devDependencies` | ✅ |
| A-44 | 🟠 Médio | 7 | `@types/jspdf` redundante (jsPDF v2.5+ inclui tipos próprios) | ✅ |
| A-45 | 🟠 Médio | 7 | `xlsx` v0.18.5 abandonada com vulnerabilidades de segurança | ✅ D-07 resolvido — migrar para exceljs |
| A-46 | 🟡 Baixo | 7 | `use-debounce` usado em apenas 1 arquivo — candidato à eliminação | ✅ |
| A-47 | 🟡 Baixo | 7 | `@testing-library/react` e `jest-dom` instalados sem uso | ✅ |
| A-48 | 🟡 Baixo | 7 | `@base-ui/react` e `@radix-ui/react-*` coexistem | ⚠️ |
| A-49 | 🟡 Baixo | 7 | Ausência de scripts `test:coverage` e `test:e2e` em `package.json` | ✅ |
| A-50 | 🟡 Baixo | 7 | `"target": "ES2017"` conservador no `tsconfig.json` | ✅ |
| A-51 | 🟠 Médio | 7 | ESLint sem regras customizadas; `eslint-disable` em `IndicadoresClient.tsx:76` | ✅ |
| A-52 | 🟠 Médio | 7 | `next-pwa` v5.6.0 sem suporte ao App Router | ✅ D-04 resolvido — migrar para Serwist (épico Fase 2) |
| A-53 | 🟡 Baixo | 7 | CSP permite `unsafe-eval` em produção | ✅ D-05 resolvido — CSP condicional por ambiente |
| A-54 | 🟠 Médio | 7 | `playwright.config.ts` com `baseURL` apontando produção | ✅ D-06 resolvido — promovido a Fase 1 |
| A-55 | 🟠 Médio | 7 | `.env.example` desatualizado (faltam vars, contém vars obsoletas) | ✅ |
| A-56 | 🔴 Crítico | 7 | `SUPABASE_SERVICE_ROLE_KEY` no `.env.example` sem aviso de segurança | ✅ |

---

## Análise Cruzada — Pontos Especiais

### A-12 — ❌ Não recomendado
**Ponto**: Auditor (Agente 3) sugere padronizar nomenclatura em inglês (ex: `getCurrentFazendaId()` em vez de `get_minha_fazenda_id()`).  
**Conflito**: `database-snapshot.md` e `CLAUDE.md` contêm regra inviolável explícita: "NÃO sugira refatorar nomes em PT-BR — foi decisão arquitetural consciente." A coexistência de nomes em inglês no TypeScript e português no SQL/banco é intencional e reflete os dois contextos (código JS vs banco de dados). Não executar.

### A-26 — ✅ Com observação (localização real incorreta no relatório)
**Ponto**: O AUDIT_REPORT.md afirma que `PeriodoFilter` está em `components/ui/` quando deveria estar em `components/relatorios/`.  
**Verificação confirmada**: O arquivo real está em `components/ui/PeriodoFilter.tsx` — o relatório está correto na identificação do problema. O CLAUDE.md menciona `components/relatorios/PeriodoFilter.tsx` como localização desejada, mas o arquivo ainda não foi movido. Tarefa: mover o arquivo e atualizar todos os imports.

### A-10 + A-42 — Consolidados
Ambos os agentes (3 e 6) identificaram o mesmo problema: `fazendaIdCache` como `Map` global em `queries-audit.ts` sem TTL. Tratado como A-10.

### A-35 (originalmente 1 + 35) — Consolidados
`select('*')` identificado pelos Agentes 1 e 6. Tratado como A-35, cobrindo todos os 25+ casos.

### A-52/A-53 — ⏸️ Arquivos intocáveis
Ambos exigem alterações em `next.config.ts`, que o CLAUDE.md marca como arquivo intocável sem instrução explícita. Requerem decisão do Marcio.

---

## Plano Faseado

---

## Fase 1 — Críticos
**Objetivo**: Corrigir bugs ativos, falhas de segurança e violações de padrões obrigatórios do projeto.  
**Pré-requisitos**: Nenhum. Executar imediatamente.  
**Esforço estimado**: 6–9h (atualizado v1.1: +D-02 Zod em rotas de auth; +D-06 Playwright baseURL)  
**Risco**: Baixo a Médio (T-1.6 edita rota crítica de login — requer smoke test antes de merge)

---

### T-1.1 — Corrigir PATCH quebrado na rota de agendamentos
```
Categoria: Segurança / Bug
Origem: AUDIT_REPORT.md, Agente 1 (A-02)
Severidade: 🔴 Crítico
```
**Descrição**: A rota `app/api/assessoria/agendamentos/route.ts` é uma rota estática (sem `[id]` no path) mas o método PATCH tenta acessar `params.id`, que será sempre `undefined`. O endpoint PATCH para atualizar status de agendamento está efetivamente quebrado em produção.

**Arquivos afetados**:
- `app/api/assessoria/agendamentos/route.ts` — remover o método PATCH desta rota
- `app/api/assessoria/agendamentos/[id]/route.ts` — criar ou verificar se já existe (a glob confirma que existe); adicionar o método PATCH aqui

**Alterações no banco**: Não

**Validação pós-execução**:
1. Testar PATCH para `/api/assessoria/agendamentos/[uuid-real]` com body `{ status: 'confirmado' }` — deve retornar 200
2. Verificar que a rota estática `/api/assessoria/agendamentos` (sem ID) ainda responde GET/POST normalmente

**Riscos/cuidados**: Verificar se há client-side que chama o PATCH com o path sem ID; se sim, atualizar o fetch também.

**Dependências**: Nenhuma

---

### T-1.2 — Adicionar aviso de segurança no `.env.example` para SERVICE_ROLE_KEY
```
Categoria: Segurança
Origem: AUDIT_REPORT.md, Agente 7 (A-56)
Severidade: 🔴 Crítico
```
**Descrição**: O arquivo `.env.example` expõe `SUPABASE_SERVICE_ROLE_KEY` sem nenhum comentário de aviso. Qualquer desenvolvedor novo pode commitar acidentalmente essa variável em projetos derivados.

**Arquivos afetados**:
- `.env.example`

**Alterações no banco**: Não

**Código sugerido** — adicionar comentário imediatamente antes da variável:
```bash
# ⚠️ SEGURANÇA CRÍTICA: A SERVICE_ROLE_KEY bypassa completamente o RLS do Supabase.
# NUNCA commite esta variável. NUNCA exponha em logs, respostas de API ou client-side.
# Usada exclusivamente em: app/api/cron/alertas/route.ts (Vercel Cron, server-side only).
SUPABASE_SERVICE_ROLE_KEY=
```

**Validação pós-execução**: Revisar `.env.example` visualmente e confirmar que a variável está com comentário de aviso.

**Riscos/cuidados**: Nenhum. Mudança apenas documental.

**Dependências**: Nenhuma

---

### T-1.3 — Adicionar guards de perfil nas 8 features sem proteção (D-01: camada UX)
```
Categoria: Segurança / Autorização
Origem: AUDIT_REPORT.md, Agente 4 (A-15)
Severidade: 🔴 Crítico
Decisão D-01 incorporada: Defesa em camadas
```
**Descrição**: As features silos, talhões, frota, insumos, rebanho, financeiro, configurações e calculadoras não possuem `layout.tsx` com guard de perfil. Um Operador que navegar diretamente para `/dashboard/silos` verá a página renderizar (com bundle exposto) até o banco rejeitar a query via RLS.

**Modelo de defesa em camadas (D-01)**:
| Camada | Responsabilidade | O que esta tarefa toca |
|---|---|---|
| **Middleware** (`middleware.ts`) | Redirect rápido por perfil para UX (ver T-1.3b) | ✅ Novo |
| **`layout.tsx` client-side** | Guard de fallback — redundância UX | ✅ Esta tarefa |
| **`requirePerfil()` helper** | Validação real de segurança nas Server Actions | ✅ Sub-tarefa T-1.3c |
| **RLS** | Proteção de dados — camada principal | Já existe, não tocar |
| **UI** | Esconde botões por perfil | Já existe (features novas) |

**T-1.3a — Criar `layout.tsx` client-side nas 8 features** (padrão existente):

**Arquivos a criar**:
- `app/dashboard/silos/layout.tsx`
- `app/dashboard/talhoes/layout.tsx`
- `app/dashboard/frota/layout.tsx`
- `app/dashboard/insumos/layout.tsx`
- `app/dashboard/rebanho/layout.tsx`
- `app/dashboard/financeiro/layout.tsx`
- `app/dashboard/configuracoes/layout.tsx`
- `app/dashboard/calculadoras/layout.tsx`

**Padrão a usar** (idêntico ao de `app/dashboard/produtos/layout.tsx`):
```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export default function [Modulo]Layout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.perfil === 'Operador') {
      toast.error('Acesso restrito. Esta área não está disponível para Operadores.');
      router.replace('/operador');
    }
  }, [loading, profile, router]);

  if (loading) return null;
  if (profile?.perfil === 'Operador') return null;

  return <>{children}</>;
}
```

**T-1.3b — Adicionar redirect de perfil no `middleware.ts`** (nova camada UX):

O middleware já lida com cookies SSR do Supabase. Adicionar verificação de `user_metadata.perfil` via JWT (sem query ao banco) para redirecionar Operador que acesse `/dashboard/*` para `/operador`:

```typescript
// middleware.ts — após validação de sessão existente
const perfil = user?.user_metadata?.perfil as string | undefined;
const isOperadorTentandoDashboard =
  perfil === 'Operador' && request.nextUrl.pathname.startsWith('/dashboard');

if (isOperadorTentandoDashboard) {
  return NextResponse.redirect(new URL('/operador', request.url));
}
```

> ⚠️ `middleware.ts` é arquivo crítico. Esta sub-tarefa requer:
> 1. Ler o arquivo inteiro antes de editar
> 2. Adicionar **apenas** o bloco de redirect por perfil, sem tocar o fluxo de cookies SSR existente
> 3. Teste de smoke: login como Admin, Visualizador e Operador antes do merge
> 4. Deploy em Preview Vercel antes do merge em main

**T-1.3c — Criar helper `requirePerfil()` em `lib/auth/guards.ts`** (nova camada de segurança):

```typescript
// lib/auth/guards.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type Perfil = 'Administrador' | 'Operador' | 'Visualizador';

export async function requirePerfil(perfisPermitidos: Perfil[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect('/login');

  const perfil = user.user_metadata?.perfil as Perfil | undefined;
  if (!perfil || !perfisPermitidos.includes(perfil)) {
    redirect('/operador');
  }

  return { user, perfil };
}

// Atalho para uso mais comum:
export async function requireAdmin() {
  return requirePerfil(['Administrador']);
}

export async function requireAdminOuVisualizador() {
  return requirePerfil(['Administrador', 'Visualizador']);
}
```

**Onde usar `requirePerfil()` após criar**:
- Server Actions que mutam dados sensíveis (criar/editar/deletar registros críticos)
- Route Handlers que não têm validação de sessão explícita (ver T-2.2)
- RSC pages de módulos que Operador não pode acessar

**Alterações no banco**: Não

**Validação pós-execução**:
1. Logar como Operador → tentar `/dashboard/silos` → deve redirecionar para `/operador` com toast
2. Logar como Administrador → confirmar que todas as features continuam funcionando normalmente
3. Logar como Visualizador → confirmar que acessa o dashboard mas não vê botões de ação destrutiva

**Riscos/cuidados**:
- Verificar se `app/dashboard/rebanho/layout.tsx` já existe antes de criar
- T-1.3b edita `middleware.ts` — arquivo crítico — testar exaustivamente antes do merge
- `requirePerfil()` usa `redirect()` do Next.js — só chamar em RSC ou Server Actions, nunca em Client Components

**Dependências**: Nenhuma para T-1.3a. T-1.3b pode ser feito em paralelo com T-1.3a. T-1.3c deve vir antes da Fase 2 (usará o helper).

---

### T-1.4 — Migrar RegistrarMovimentacaoDialog para React Hook Form + Zod
```
Categoria: Conformidade / Segurança
Origem: AUDIT_REPORT.md, Agente 4 (A-19)
Severidade: 🔴 Crítico
```
**Descrição**: `app/dashboard/silos/components/RegistrarMovimentacaoDialog.tsx` usa múltiplos `useState` e validação manual `if (!campo)`. Viola CLAUDE.md: "Sempre validar com Zod antes de persistir". Além disso, viola o Padrão B de formulários (Form + FormField + FormMessage do shadcn/ui).

**Arquivos afetados**:
- `app/dashboard/silos/components/RegistrarMovimentacaoDialog.tsx` — refatorar para RHF + Zod
- `lib/validations/silos.ts` — criar schema Zod para movimentação (se não existir)

**Alterações no banco**: Não

**Validação pós-execução**:
1. Tentar submeter formulário vazio — deve exibir `<FormMessage />` em cada campo obrigatório
2. `npm run build` sem erros TypeScript
3. `npm run test` — todos os testes passando

**Riscos/cuidados**: O componente tem lógica condicional complexa (campos mudam por tipo de movimentação). Preservar toda a lógica condicional ao migrar.

**Dependências**: Nenhuma

---

### T-1.6 — Corrigir `playwright.config.ts` para nunca apontar produção (D-06)
```
Categoria: DX / Segurança
Origem: AUDIT_REPORT.md, Agente 7 (A-54) — promovido de Fase 5 por decisão D-06
Severidade: 🔴 Crítico (promovido)
```
**Descrição**: `playwright.config.ts` tem `baseURL: 'https://gestsilo-seven.vercel.app'`. Qualquer execução de `test:e2e` — mesmo acidental — interage com o banco de produção, podendo criar, modificar ou deletar registros reais.

**Arquivos afetados**:
- `playwright.config.ts`

**Implementação (D-06)**:
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
  },
  // ...
});
```

**Regras estabelecidas por D-06**:
- Default: sempre `localhost:3000`
- CI: `localhost:3000` (servidor local levantado pelo job)
- Staging/Preview: via `PLAYWRIGHT_BASE_URL=https://preview.vercel.app` — exigir flag explícita
- Produção: **NUNCA** — não deve ser possível apontar acidentalmente para prod

**Alterações no banco**: Não

**Validação pós-execução**:
1. Verificar que `process.env.PLAYWRIGHT_BASE_URL` está ausente do `.env.example` (não deve estar, para evitar configuração acidental)
2. Executar `npx playwright test --list` e confirmar que o `baseURL` default é `localhost:3000`
3. Verificar histórico do Git: se houve execuções anteriores de `test:e2e`, documentar e verificar se há dados espúrios no banco de produção

**Riscos/cuidados**: Mínimo. Mudança de 1 linha com impacto apenas nos testes e2e.

**Dependências**: Nenhuma

---

### T-1.7 — Adicionar validação Zod nas rotas de autenticação e assessoria (D-02)
```
Categoria: Segurança / Backend
Origem: AUDIT_REPORT.md, Agente 1 (A-04) — promovido de Fase 2 por decisão D-02
Severidade: 🟠 Médio (tratado em Fase 1 por ser rota crítica)
```
**Descrição**: Rotas de auth e assessoria usam validações manuais (`if (!email)`) sem Zod. Decisão D-02: adicionar Zod em **todas** as rotas, com schemas centralizados em `lib/validations/auth.ts`. Mensagens de erro devem ser genéricas para o cliente, mas específicas nos logs internos.

**Arquivos afetados**:
- `lib/validations/auth.ts` — criar (ou verificar se já existe)
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/invite/route.ts`
- `app/api/assessoria/solicitar-consulta/route.ts`

**Schemas a criar em `lib/validations/auth.ts`**:
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nome: z.string().min(2).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  perfil: z.enum(['Operador', 'Visualizador']),
});

export type LoginInput = z.infer<typeof loginSchema>;
// ... demais tipos
```

**Padrão de uso em cada rota**:
```typescript
const body = await request.json();
const parsed = loginSchema.safeParse(body);

if (!parsed.success) {
  // Mensagem GENÉRICA para o cliente (D-02: nunca diferenciar email/senha)
  return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 400 });
  // Log interno específico (para debug):
  // console.error('[login] Validation error:', parsed.error.flatten());
}

const { email, password } = parsed.data;
```

**Regras de segurança (D-02)**:
- Mensagens ao cliente sempre genéricas: `"Credenciais inválidas"`, `"Dados inválidos"` — nunca `"Email não encontrado"` ou `"Senha incorreta"` (evita user enumeration)
- Logs internos podem e devem ser específicos para debugging
- Tipar o input com `z.infer<typeof schema>` — eliminar `any` implícito do `request.json()`

**Alterações no banco**: Não

**Validação pós-execução**:
1. Testar login com credenciais inválidas — deve retornar `"Credenciais inválidas"` (genérico)
2. Testar login com body malformado (ex: `{}`) — deve retornar 400
3. Testar login feliz → deve continuar funcionando normalmente
4. `npm run build` sem erros TypeScript
5. Smoke test de todas as rotas afetadas antes do merge

**Riscos/cuidados**: Rotas de login/register são críticas — uma regressão pode bloquear todos os usuários. Executar em janela de baixo tráfego e ter rollback preparado (reverter o `safeParse` e restaurar validação manual).

**Dependências**: Nenhuma (T-1.6 é independente)

---

### T-1.5 — Atualizar `.env.example` com variáveis faltantes e remover obsoletas
```
Categoria: DX / Segurança
Origem: AUDIT_REPORT.md, Agente 7 (A-55)
Severidade: 🟠 Médio (agrupado na Fase 1 por estar no mesmo arquivo que A-56)
```
**Descrição**: `.env.example` está desatualizado. Faltam: `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CONSULTOR_EMAIL`, `OPENWEATHER_API_KEY`. Contém variáveis obsoletas: `GEMINI_API_KEY`, `APP_URL`.

**Arquivos afetados**:
- `.env.example`

**Alterações no banco**: Não

**Variáveis a adicionar** (com comentários descritivos):
```bash
JWT_SECRET=                          # Chave HS256 256 bits — usada para tokens de link mágico de assessoria
NEXT_PUBLIC_APP_URL=                 # URL pública da aplicação (ex: https://gestsilo.com ou http://localhost:3000)
NEXT_PUBLIC_CONSULTOR_EMAIL=         # Email do consultor que recebe notificações de agendamento
OPENWEATHER_API_KEY=                 # Chave da API OpenWeatherMap — módulo previsão do tempo
```

**Variáveis a remover**: `GEMINI_API_KEY`, `APP_URL`

**Validação pós-execução**: Comparar `.env.example` com as variáveis listadas em CLAUDE.md — todas devem estar presentes.

**Riscos/cuidados**: Nenhum. Arquivo de exemplo não afeta runtime.

**Dependências**: T-1.2 (ambos editam o mesmo arquivo — executar na mesma sessão)

---

## Fase 2 — Estruturais
**Objetivo**: Corrigir anti-padrões arquiteturais e executar épico PWA/Serwist.  
**Pré-requisitos**: Fase 1 concluída (especialmente T-1.3c — helper `requirePerfil()` criado).  
**Esforço estimado**: 10–15h + 8–12h épico PWA (D-04) = 18–27h total  
**Risco**: Médio-Alto (épico PWA tem risco alto; restante é médio-baixo)

---

### T-2.1 — Padronizar guards de perfil em balanço-forrageiro e calendário
```
Categoria: Autorização / Padronização
Origem: AUDIT_REPORT.md, Agente 2 (A-05) + Agente 4 (A-22)
Severidade: 🟠 Médio
```
**Descrição**: Os layouts de balanço-forrageiro e calendário já têm guards, mas apresentam diferenças de qualidade:
- `calendario/layout.tsx`: não exibe `toast.error` ao redirecionar (diferente do padrão das novas features)
- `balanco-forrageiro/layout.tsx`: já tem `toast.error` e está conforme o padrão — mas não carrega `loading` antes de verificar perfil (risco de flash)

Ambos são client-side com `useEffect` — o AUDIT_REPORT considera anti-padrão e sugere mover para middleware ou RSC. Ver D-01 para esta decisão mais ampla.

**Ação imediata sem decisão pendente**:
1. Corrigir `calendario/layout.tsx` para adicionar `toast.error` (alinhando ao padrão de `balanco-forrageiro`)
2. Corrigir `balanco-forrageiro/layout.tsx` para checar `loading` antes de renderizar (já faz, mas validar)

**Arquivos afetados**:
- `app/dashboard/calendario/layout.tsx`

**Alterações no banco**: Não

**Validação pós-execução**: Logar como Operador e acessar `/dashboard/calendario` — deve redirecionar com toast de erro.

**Riscos/cuidados**: Não mover para middleware sem aprovação (D-01).

**Dependências**: T-1.3

---

### T-2.2 — Adicionar validação de autenticação explícita nas rotas de assessoria
```
Categoria: Segurança
Origem: AUDIT_REPORT.md, Agente 1 (A-01)
Severidade: 🟠 Médio
```
**Descrição**: `app/api/assessoria/agendamentos/route.ts` e `app/api/assessoria/anotacoes/route.ts` dependem exclusivamente do RLS para autorização, sem chamar `auth.getUser()` explicitamente. Defesa em profundidade ausente — se houver bug no RLS, dados de outras fazendas ficam expostos.

**Arquivos afetados**:
- `app/api/assessoria/agendamentos/route.ts`
- `app/api/assessoria/anotacoes/route.ts`

**Padrão a aplicar**:
```typescript
const supabase = createSupabaseServerClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
}
```

**Alterações no banco**: Não

**Validação pós-execução**: Tentar acessar os endpoints sem cookie de sessão — deve retornar 401.

**Riscos/cuidados**: Verificar que `createSupabaseServerClient` está importado corretamente (versão server, não browser).

**Dependências**: T-1.1

---

### T-2.3 — Adicionar defesa em profundidade (filtro fazenda_id) em silos.ts e pastagens.ts
```
Categoria: Segurança / Multi-tenancy
Origem: AUDIT_REPORT.md, Agente 1 (A-03)
Severidade: 🟠 Médio
```
**Descrição**: Queries em `lib/supabase/silos.ts` e `lib/supabase/pastagens.ts` que buscam registros por ID (ex: `getById`) usam apenas `.eq('id', id)` sem filtrar também por `fazenda_id`. O RLS garante a segurança, mas a defesa em profundidade (filtro duplo) é o padrão do projeto.

**Arquivos afetados**:
- `lib/supabase/silos.ts` — adicionar `.eq('fazenda_id', fazendaId)` nas queries por ID
- `lib/supabase/pastagens.ts` — idem

**Padrão a aplicar**:
```typescript
// Antes:
.eq('id', id)
// Depois:
.eq('id', id).eq('fazenda_id', await getCurrentFazendaId())
```

**Alterações no banco**: Não

**Validação pós-execução**: `npm run test` + verificar que operações de silo/pastagem continuam funcionando normalmente.

**Riscos/cuidados**: `getCurrentFazendaId()` pode retornar null se fazenda não configurada — tratar o caso.

**Dependências**: Nenhuma

---

### T-2.4 — Criar `loading.tsx` para o dashboard raiz e módulos prioritários
```
Categoria: UX / Arquitetura Next.js
Origem: AUDIT_REPORT.md, Agente 2 (A-07)
Severidade: 🟠 Médio
```
**Descrição**: Apenas o módulo Rebanho tem `loading.tsx` implementado. A ausência de loading states causa flash de conteúdo vazio durante carregamento de RSC.

**Prioridade de implementação** (maior tráfego):
1. `app/dashboard/loading.tsx` — dashboard raiz
2. `app/dashboard/silos/loading.tsx`
3. `app/dashboard/financeiro/loading.tsx`
4. `app/dashboard/frota/loading.tsx`

**Padrão a usar** (skeleton genérico):
```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
```

**Alterações no banco**: Não

**Validação pós-execução**: Throttle de rede no DevTools e navegar entre páginas — deve exibir skeleton antes do conteúdo.

**Riscos/cuidados**: Nenhum.

**Dependências**: Nenhuma (pode ser feito em paralelo)

---

### T-2.5 — Corrigir o `eslint-disable` em `IndicadoresClient.tsx:76`
```
Categoria: Qualidade de Código / Conformidade
Origem: AUDIT_REPORT.md, Agente 7 (A-51)
Severidade: 🟠 Médio
```
**Descrição**: CLAUDE.md proíbe explicitamente `eslint-disable react-hooks/exhaustive-deps`. Há um caso em `app/dashboard/rebanho/indicadores/IndicadoresClient.tsx` linha 76. A supressão mascara uma dependência ausente no `useEffect` — corrigir adicionando a dependência faltante com `useCallback`/`useMemo`.

**Arquivos afetados**:
- `app/dashboard/rebanho/indicadores/IndicadoresClient.tsx`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run lint` sem erros; `npm run test` passando.

**Riscos/cuidados**: Adicionar a dependência faltante pode causar re-render excessivo — usar `useCallback` na função dependente.

**Dependências**: Nenhuma

---

### T-2.6 — Remover import `q` não utilizado em `insumos/actions.ts`
```
Categoria: Qualidade de Código / Lint
Origem: AUDIT_REPORT.md, Agente 3 (A-14)
Severidade: 🟡 Baixo
```
**Descrição**: `app/dashboard/insumos/actions.ts` linha 3 importa `q` de `queries-audit.ts` mas não o utiliza.

**Arquivos afetados**:
- `app/dashboard/insumos/actions.ts`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run lint` sem warnings de import não utilizado.

**Riscos/cuidados**: Confirmar que `q` realmente não é usado em nenhuma parte do arquivo antes de remover.

**Dependências**: Nenhuma

---

### T-2.7 — Eliminar duplicação de `daysBetween` e `formatBRL`
```
Categoria: Qualidade de Código / DRY
Origem: AUDIT_REPORT.md, Agente 3 (A-11)
Severidade: 🟡 Baixo
```
**Descrição**: 
- `daysBetween` está declarada em `app/dashboard/alertas-helpers.ts` e `lib/supabase/pastagens.ts` — manter apenas em `lib/utils.ts` (ou em `alertas-helpers.ts` se for específica de alertas)
- `formatBRL` está duplicada em `lib/utils.ts` e `app/dashboard/page.tsx` — remover da página, importar de `lib/utils.ts`

**Arquivos afetados**:
- `app/dashboard/page.tsx` — remover `formatBRL` local, importar de `lib/utils.ts`
- `lib/supabase/pastagens.ts` — remover `daysBetween` local, importar de onde for centralizado
- `app/dashboard/alertas-helpers.ts` — confirmar se `daysBetween` deve ser a fonte canônica aqui ou em `lib/utils.ts`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run test` + `npm run build` sem erros.

**Riscos/cuidados**: Verificar todos os imports de `daysBetween` para não quebrar os testes de alertas.

**Dependências**: Nenhuma

---

### T-2.8 — Adicionar Padrão B de formulários como documentação interna
```
Categoria: Padronização / DX
Origem: AUDIT_REPORT.md, Agente 4 (A-17)
Severidade: 🟠 Médio
```
**Descrição**: Dois padrões de formulário coexistem no projeto. O Padrão B (Form + FormField + FormMessage do shadcn/ui) é o padrão oficial segundo CLAUDE.md. A ação aqui é: criar comentário/bloco de código de referência no arquivo de maior visibilidade (ex: na docstring de `lib/validations/`) e registrar o plano de migração gradual das features antigas (silos, talhões, frota, insumos).

**Ação concreta** (sem reescrever componentes):
1. Adicionar no topo de `lib/validations/` um arquivo `README.md` sucinto com o padrão oficial
2. Criar issues/backlog para migrar: `SiloForm`, `TalhaoForm`, `InsumoForm` (as 3 com maior divergência) — fora do escopo desta fase

**Arquivos afetados**:
- `lib/validations/` — documentação apenas

**Alterações no banco**: Não

**Validação pós-execução**: Revisão visual do documento.

**Riscos/cuidados**: Não reescrever componentes nesta fase — apenas documentar.

**Dependências**: Nenhuma

---

### T-2.9 — Criar componente `EmptyState` reutilizável
```
Categoria: UI / Padronização
Origem: AUDIT_REPORT.md, Agente 4 (A-21)
Severidade: 🟠 Médio
```
**Descrição**: Empty states ("sem registros") implementados diferentemente em cada feature. Criar componente `components/ui/EmptyState.tsx` com props: `title`, `description`, `icon?`, `action?`.

**Arquivos afetados**:
- `components/ui/EmptyState.tsx` — criar componente
- Features prioritárias para migração: `app/dashboard/silos/`, `app/dashboard/insumos/`, `app/dashboard/financeiro/` (identificar e substituir os empty states inline)

**Padrão sugerido**:
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

**Alterações no banco**: Não

**Validação pós-execução**: Storybook ou revisão visual em cada feature migrada.

**Riscos/cuidados**: Não forçar migração imediata de todas as features — criar o componente e migrar gradualmente.

**Dependências**: Nenhuma

---

### T-2.10 — Padronizar Server Actions para retornar `{ success, error }`
```
Categoria: Padronização / DX
Origem: AUDIT_REPORT.md, Agente 4 (A-24)
Severidade: 🟡 Baixo
```
**Descrição**: Dois padrões de disparo de toast após Server Action: Padrão 1 (dispara sem verificar retorno) e Padrão 2 (verifica `result.success`). Padronizar todas as Server Actions para retornar `{ success: boolean, error?: string }` e todos os callers para verificar o resultado antes de exibir toast.

**Arquivos afetados**: Todas as `actions.ts` que ainda usam Padrão 1. Identificar com `grep` antes de executar.

**Tipo sugerido**:
```typescript
export type ActionResult = { success: true } | { success: false; error: string };
```

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` + `npm run test`.

**Riscos/cuidados**: Mudança ampla — executar por módulo, não tudo de uma vez. Começar pelas features mais recentes (produtos, pastagens).

**Dependências**: Nenhuma

---

### T-2.11 — Substituir `animate-pulse` genérico por `<Skeleton>` em Insumos e Produtos
```
Categoria: UI / Consistência
Origem: AUDIT_REPORT.md, Agente 4 (A-20)
Severidade: 🟠 Médio
```
**Descrição**: Loading state nas listagens de Insumos e Produtos usa `animate-pulse` genérico em divs em vez do componente `<Skeleton>` do shadcn/ui (que já é usado em outros módulos como Rebanho).

**Arquivos afetados**:
- `app/dashboard/insumos/` — identificar componente de lista com `animate-pulse`
- `app/dashboard/produtos/components/ProdutosList.tsx` — idem

**Alterações no banco**: Não

**Validação pós-execução**: Throttle de rede e confirmar que skeletons aparecem durante carregamento.

**Riscos/cuidados**: Nenhum.

**Dependências**: Nenhuma

---

### T-2.12 — Adicionar `unstable_cache` para queries de catálogo em `queries-audit.ts`
```
Categoria: Performance / Cache
Origem: AUDIT_REPORT.md, Agente 2 (A-08)
Severidade: 🟡 Baixo
```
**Descrição**: Queries de dados raramente alterados (ex: categorias, tipos fixos) em `queries-audit.ts` são executadas a cada request sem cache. Envolver com `unstable_cache` do Next.js + tags de revalidação para reduzir carga no Supabase.

**Arquivos afetados**:
- `lib/supabase/queries-audit.ts` — identificar queries de catálogo (categorias_produto, categorias_rebanho, etc.)

**Padrão a aplicar**:
```typescript
import { unstable_cache } from 'next/cache';

export const getCategoriasProduto = unstable_cache(
  async () => { /* query */ },
  ['categorias-produto'],
  { revalidate: 3600, tags: ['categorias-produto'] }
);
```

**Alterações no banco**: Não

**Validação pós-execução**: Verificar no DevTools/Vercel que requests repetidos são servidos do cache.

**Riscos/cuidados**: Apenas para dados verdadeiramente estáticos. Não aplicar em queries que dependem de `fazenda_id` — cada fazenda tem dados diferentes.

**Dependências**: A-09 (D-03 — se queries-audit.ts for modularizado antes, aplicar nos módulos resultantes)

---

---

## Épico PWA — Migração de `next-pwa` para Serwist (D-04)
**Categoria**: Estrutural / Dependências  
**Posição**: Fase 2 (estrutural — PWA atual funciona, não é emergencial)  
**Esforço estimado**: 8–12h  
**Risco**: Médio-Alto — PWA quebrado em produção = usuários no campo sem app. Deploy obrigatoriamente em Preview Vercel antes do merge em main.

> **Contexto D-04**: PWA é CRÍTICO para o produto. Usuários usam o app instalado no celular. Funcionamento offline é primordial para engenheiros agrônomos em campo sem sinal. A migração para Serwist resolve o problema de compatibilidade com o App Router e garante suporte ativo de longo prazo.

---

### T-PWA.1 — Auditar uso atual do `next-pwa`
```
Categoria: Levantamento / PWA
```
**Descrição**: Antes de migrar, mapear exatamente o que está configurado:
- Quais rotas/assets são precachados
- Qual estratégia de cache está ativa (NetworkFirst, CacheFirst, StaleWhileRevalidate)
- Quais rotas funcionam offline hoje
- Manifesto PWA: ícones, nome, theme-color, display, start_url
- Service worker customizado (se houver)

**Arquivos a inspecionar**:
- `next.config.ts` — configuração atual do `next-pwa`
- `public/manifest.json` (ou equivalente)
- `public/sw.js` (se existir sw customizado)
- `public/workbox-*.js` (arquivos gerados pelo next-pwa)

**Entregável**: Lista documentada de rotas offline e estratégias de cache ativas.

**Dependências**: Nenhuma

---

### T-PWA.2 — Documentar funcionalidades offline obrigatórias
```
Categoria: Levantamento / Produto
```
**Descrição**: Listar explicitamente quais funcionalidades precisam funcionar no modo avião (celular sem sinal em campo). Sem esta lista, a migração vira aposta.

**Perguntas a responder antes de executar**:
1. Quais páginas precisam funcionar sem internet? (ex: visualizar estoque de silos, registrar movimentação)
2. Quais dados precisam estar em cache local? (ex: lista de silos da fazenda, cadastro de animais)
3. O sync offline (IndexedDB / `lib/db/syncQueue.ts`) está em uso? Precisa ser preservado?

**Entregável**: Lista validada pelo Marcio de rotas offline + dados necessários em cache.

> ⚠️ **Pausa obrigatória**: Não prosseguir para T-PWA.3 sem a lista aprovada.

**Dependências**: T-PWA.1

---

### T-PWA.3 — Setup do Serwist conforme docs oficiais
```
Categoria: Implementação / PWA
```
**Descrição**: Instalar e configurar `@serwist/next` seguindo [https://serwist.pages.dev/](https://serwist.pages.dev/).

```bash
npm install @serwist/next serwist
npm uninstall next-pwa
```

**Arquivos afetados**:
- `next.config.ts` — substituir configuração do `next-pwa` por `withSerwist()` (⚠️ arquivo intocável, mas esta tarefa tem aprovação explícita via D-04)
- `app/sw.ts` (ou `src/sw.ts`) — criar service worker com Serwist

**Padrão de configuração**:
```typescript
// next.config.ts
import withSerwist from '@serwist/next';

const withSerwistConfig = withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
});

export default withSerwistConfig(nextConfig);
```

**Alterações no banco**: Não

**Dependências**: T-PWA.2 (lista de funcionalidades offline aprovada)

---

### T-PWA.4 — Migrar estratégias de cache equivalentes
```
Categoria: Implementação / PWA
```
**Descrição**: Recriar no Serwist as estratégias de cache mapeadas em T-PWA.1, cobrindo as rotas offline listadas em T-PWA.2.

**Padrão Serwist**:
```typescript
// app/sw.ts
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

**Dependências**: T-PWA.3

---

### T-PWA.5 — Testar instalação PWA em Android e iOS
```
Categoria: QA / PWA
```
**Descrição**: Com o Serwist configurado no ambiente de Preview Vercel:
1. Acessar o app no Chrome (Android) e Safari (iOS)
2. Verificar que o prompt de instalação aparece
3. Instalar e confirmar que o ícone e o nome aparecem corretamente
4. Verificar que o `manifest.json` é servido corretamente

**Validação**: Screenshots do app instalado nas duas plataformas.

**Dependências**: T-PWA.4 + deploy em Preview Vercel

---

### T-PWA.6 — Testar funcionamento offline real (modo avião) em rotas críticas
```
Categoria: QA / PWA
```
**Descrição**: Com o app instalado (T-PWA.5), ativar modo avião e verificar as rotas listadas em T-PWA.2. Rotas offline devem funcionar; rotas online-only devem mostrar mensagem clara.

**Validação**: Checklist de rotas offline com ✅ (funciona) / ❌ (falhou) / ⚠️ (degradado mas aceitável).

**Dependências**: T-PWA.5

---

### T-PWA.7 — Remover `next-pwa` e dependências órfãs
```
Categoria: Limpeza / Dependências
```
**Descrição**: Após T-PWA.6 aprovado:
```bash
npm uninstall next-pwa
```
Verificar e remover arquivos gerados pelo next-pwa que não são mais necessários:
- `public/workbox-*.js`
- `public/sw.js` (se gerado pelo next-pwa — o Serwist gera o novo)

**Dependências**: T-PWA.6

---

### T-PWA.8 — Atualizar `CLAUDE.md` com novo padrão PWA
```
Categoria: Documentação
```
**Descrição**: Após migração concluída, atualizar a seção de Stack em `CLAUDE.md`:
- Substituir `next-pwa` por `@serwist/next + serwist` na lista de dependências
- Documentar localização do service worker (`app/sw.ts`)
- Documentar como adicionar novas estratégias de cache

**Dependências**: T-PWA.7

---

## Fase 3 — Performance
**Objetivo**: Reduzir bundle size, melhorar TTFB e eliminar re-renders desnecessários.  
**Pré-requisitos**: Fase 1 e 2 concluídas.  
**Esforço estimado**: 6–8h  
**Risco**: Médio (lazy loading pode exigir ajustes em SSR/SSG)

---

### T-3.1 — Substituir `fazendaIdCache` Map global por `cache()` do React
```
Categoria: Performance / Memory Leak
Origem: AUDIT_REPORT.md, Agentes 3 e 6 (A-10)
Severidade: 🟠 Médio
```
**Descrição**: `lib/supabase/queries-audit.ts` declara um `Map` global (`fazendaIdCache`) para cachear o `fazenda_id` por usuário. Em produção com múltiplos requests concorrentes, esse Map cresce indefinidamente sem TTL/LRU, causando memory leak. A solução correta no contexto React/Next.js é usar `cache()` do React 19, que tem escopo por request (não global).

**Arquivos afetados**:
- `lib/supabase/queries-audit.ts`

**Solução**:
```typescript
import { cache } from 'react';

// Antes: const fazendaIdCache = new Map<string, string>();
// Depois:
const getCachedFazendaId = cache(async (userId: string): Promise<string | null> => {
  // lógica atual de busca
});
```

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` + `npm run test`. Em staging, monitorar uso de memória do processo Node.js.

**Riscos/cuidados**: `cache()` do React é por request — não persistirá entre requests como o Map atual. Confirmar que isso é o comportamento desejado (é o correto para SSR).

**Dependências**: A-09 (se queries-audit.ts for modularizado primeiro, aplicar nos módulos)

---

### T-3.2 — Lazy loading de Recharts com `next/dynamic`
```
Categoria: Performance / Bundle Size
Origem: AUDIT_REPORT.md, Agente 6 (A-36)
Severidade: 🟠 Médio
```
**Descrição**: Recharts (~200 KB gzipped) é carregado sincronamente em todas as páginas que usam gráficos. Nenhum componente de gráfico usa `next/dynamic`. Isso aumenta o bundle inicial de páginas que nem exibem gráficos no first paint.

**Arquivos afetados** (aproximadamente 20 — verificar com grep antes de executar):
- Componentes de gráfico em: `components/widgets/`, `app/dashboard/financeiro/`, `app/dashboard/rebanho/`, `app/dashboard/frota/`, `app/dashboard/pastagens/`

**Padrão a aplicar**:
```typescript
// Em vez de:
import { BarChart, Bar } from 'recharts';

// Usar:
const BarChart = dynamic(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false });
```

**Alterações no banco**: Não

**Validação pós-execução**: Bundle analyzer (`ANALYZE=true npm run build`) — verificar redução do chunk inicial.

**Riscos/cuidados**: Gráficos com `ssr: false` não serão renderizados no servidor — confirmar que não há uso em RSC.

**Dependências**: Nenhuma

---

### T-3.3 — Extrair `contentStyle` de tooltips Recharts para constantes de módulo
```
Categoria: Performance / Re-renders
Origem: AUDIT_REPORT.md, Agente 6 (A-38)
Severidade: 🟠 Médio
```
**Descrição**: Objetos `contentStyle` criados inline dentro do JSX (`<Tooltip contentStyle={{ ... }} />`) são recriados a cada render, causando re-renders desnecessários no Recharts. Já foi corrigido em `GraficoComposicao.tsx` — aplicar o mesmo padrão nos demais.

**Arquivos afetados**:
- `app/dashboard/rebanho/indicadores/GraficoDistribuicaoEtaria.tsx`
- `app/dashboard/financeiro/FinanceiroClient.tsx`
- `app/dashboard/relatorios/GraficoParticipacao.tsx` (verificar path real)
- `app/dashboard/frota/FrotaOverview.tsx`

**Padrão a aplicar**:
```typescript
// Fora do componente:
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
};

// No JSX:
<Tooltip contentStyle={TOOLTIP_STYLE} />
```

**Alterações no banco**: Não

**Validação pós-execução**: DevTools Performance tab — confirmar redução de re-renders ao hover nos gráficos.

**Riscos/cuidados**: Usar CSS vars em vez de hex hardcoded ao definir as constantes.

**Dependências**: A-27 (cores hardcoded) — idealmente fazer após corrigir cores

---

### T-3.4 — Adicionar `useMemo` em `InsumosFilters.tsx`
```
Categoria: Performance / Re-renders
Origem: AUDIT_REPORT.md, Agente 6 (A-39)
Severidade: 🟠 Médio
```
**Descrição**: `app/dashboard/insumos/InsumosFilters.tsx` recria um `Map` e array derivado a cada render sem `useMemo`, causando re-renders desnecessários nas listagens de insumos.

**Arquivos afetados**:
- `app/dashboard/insumos/InsumosFilters.tsx` (verificar path real — pode estar em `components/`)

**Alterações no banco**: Não

**Validação pós-execução**: React DevTools Profiler — confirmar que o componente não re-renderiza sem mudança de deps.

**Riscos/cuidados**: Verificar que as dependências do `useMemo` estão corretas para não criar stale data.

**Dependências**: Nenhuma

---

### T-3.5 — Corrigir dupla chamada de `getUser()` em `app/dashboard/page.tsx`
```
Categoria: Performance / Arquitetura
Origem: AUDIT_REPORT.md, Agente 2 (A-06)
Severidade: 🟡 Baixo
```
**Descrição**: Em `app/dashboard/page.tsx`, `supabase.auth.getUser()` é chamado na linha 49 diretamente e também dentro de `getCurrentFazendaId()`. Como `createSupabaseServerClient()` usa `next/headers` (com cache por request no Next.js 15), o impacto real pode ser mínimo, mas é uma chamada desnecessária.

**Arquivos afetados**:
- `app/dashboard/page.tsx`

**Solução**: Chamar `getUser()` uma vez e passar o `user` como parâmetro para `getCurrentFazendaId(userId)`, ou usar `cache()` do React para memoizar.

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` sem erros.

**Riscos/cuidados**: Verificar assinatura de `getCurrentFazendaId` — pode ser necessário adicionar parâmetro.

**Dependências**: T-3.1 (se o cache for refatorado primeiro, pode ser feito junto)

---

### T-3.6 — Migrar fontes Satoshi de TTF para WOFF2
```
Categoria: Performance / Assets
Origem: AUDIT_REPORT.md, Agente 6 (A-37)
Severidade: 🟡 Baixo
```
**Descrição**: Fontes Satoshi estão em formato TTF (~30% maior que WOFF2). Converter para WOFF2 reduz o tamanho de download das fontes.

**Arquivos afetados**:
- `public/fonts/` (ou onde estão as fontes Satoshi)
- `app/globals.css` ou arquivo de configuração de fontes — **atenção: globals.css é intocável**, mas a linha de `@font-face` pode ser em outro arquivo

**Alterações no banco**: Não

**Validação pós-execução**: Lighthouse — verificar melhora em "Eliminate render-blocking resources".

**Riscos/cuidados**: Verificar se `globals.css` contém os `@font-face` — se sim, requer aprovação para editar (ver arquivo intocável). Alternatively, se as fontes são carregadas via `next/font`, verificar configuração.

**Dependências**: Nenhuma

---

### T-3.7 — Migrar de `xlsx` para `exceljs` (D-07)
```
Categoria: Segurança / Dependências
Origem: AUDIT_REPORT.md, Agente 7 (A-45)
Decisão D-07 incorporada: Migrar para exceljs
Severidade: 🟠 Médio
```
**Contexto D-07**: `xlsx` v0.18.5 (SheetJS Community Edition) está abandonada com CVEs conhecidos. O risco imediato é baixo porque o app apenas *gera* XLSX (não faz parse de uploads), mas a dependência abandonada aumenta a superfície de risco no longo prazo. Decisão: migrar para `exceljs` com abstração que facilite trocas futuras.

**Sub-tarefas de migração faseada**:

**T-3.7a — Mapear todos os usos de `xlsx`**:
```bash
grep -r "from 'xlsx'" --include="*.ts" --include="*.tsx" .
grep -r "require('xlsx')" --include="*.ts" --include="*.tsx" .
```
Documentar cada ponto de uso antes de qualquer refatoração.

**T-3.7b — Criar helper de abstração `lib/excel.ts`**:
```typescript
// lib/excel.ts — interface única para geração de XLSX
// Objetivo: trocar a lib novamente no futuro sem alterar todos os consumers
import ExcelJS from 'exceljs';

export interface ColunaExcel {
  header: string;
  key: string;
  width?: number;
}

export async function gerarExcel(
  nomePlanilha: string,
  colunas: ColunaExcel[],
  dados: Record<string, unknown>[],
  nomeArquivo: string
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(nomePlanilha);
  sheet.columns = colunas;
  sheet.addRows(dados);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
```

**T-3.7c — Migrar `lib/pdf/relatorio-helpers.ts`** para usar `lib/excel.ts`  
**T-3.7d — Migrar `app/dashboard/relatorios/actions.ts`** para usar `lib/excel.ts`  
**T-3.7e — Remover `xlsx` do `package.json`** após validar todos os exports

**Instalação**:
```bash
npm install exceljs
npm uninstall xlsx
```

**Alterações no banco**: Não

**Validação pós-execução**:
- Exportar relatório XLSX de cada módulo (financeiro, talhões, silos, frota, pastagens, mão de obra, insumos, produtos, planejamento de compras, rebanho, assessoria, calendário)
- Verificar que cada arquivo abre corretamente no Excel e LibreOffice
- Comparar estrutura de colunas e formatação com o output anterior

**Riscos/cuidados**:
- API do `exceljs` é diferente do `xlsx` — migração envolve refatoração dos helpers
- Fazer ponto a ponto (T-3.7c e T-3.7d) para facilitar rollback se algum módulo falhar
- CVEs conhecidas da `xlsx` documentadas como motivação: a lib não recebe patches de segurança desde v0.18.5 (2021)

**Dependências**: T-3.7a (mapeamento) deve vir antes de T-3.7b

---

### T-3.8 — Remover estilos `rgba()` inline do `DashboardClient.tsx`
```
Categoria: Design System / Performance
Origem: AUDIT_REPORT.md, Agentes 5 e 6 (A-40)
Severidade: 🟡 Baixo
```
**Descrição**: `app/dashboard/DashboardClient.tsx` linhas 32, 69 e 253 têm estilos `rgba()` hardcoded inline. Substituir por CSS vars do design system.

**Arquivos afetados**:
- `app/dashboard/DashboardClient.tsx`

**Alterações no banco**: Não

**Validação pós-execução**: Revisão visual — confirmar que o dashboard aparece idêntico após a troca.

**Riscos/cuidados**: Identificar qual CSS var corresponde a cada `rgba()` antes de trocar.

**Dependências**: A-27 (T-4.6 — corrigir cores hardcoded nos componentes core primeiro)

---

## Fase 4 — Qualidade de Código
**Objetivo**: Melhorar tipagem, eliminar dependências desnecessárias e alinhar configurações do toolchain.  
**Pré-requisitos**: Fase 1 concluída.  
**Esforço estimado**: 6–8h  
**Risco**: Baixo (maioria são mudanças isoladas)

---

### T-4.1 — Substituir `fazendaIdCache` Map por `cache()` do React (já em T-3.1)
> Consolidado em T-3.1.

---

### T-4.2 — Corrigir padrão `.then()` para `async/await` em 3 arquivos
```
Categoria: Qualidade de Código / Consistência
Origem: AUDIT_REPORT.md, Agente 3 (A-13)
Severidade: 🟡 Baixo
```
**Descrição**: Três arquivos usam `.then()` em vez de `async/await`, dificultando leitura e debugging:
- `app/dashboard/rebanho/novo/page.tsx`
- `app/dashboard/rebanho/[id]/evento/page.tsx`
- `app/dashboard/frota/hooks/useFrotaData.ts`

**Arquivos afetados**: os 3 listados acima

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` + `npm run test`.

**Riscos/cuidados**: Verificar tratamento de erro ao migrar (`.catch()` → `try/catch`).

**Dependências**: Nenhuma

---

### T-4.3 — Mover `shadcn` de `dependencies` para `devDependencies`
```
Categoria: Dependências / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-43)
Severidade: 🟠 Médio
```
**Descrição**: A CLI `shadcn` é uma ferramenta de desenvolvimento (adiciona componentes ao projeto) e não deve estar em `dependencies` de produção.

**Arquivos afetados**:
- `package.json`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` — confirmar que a build de produção não inclui `shadcn` no bundle.

**Riscos/cuidados**: Verificar se algum código importa diretamente do pacote `shadcn` em runtime (improvável, mas verificar).

**Dependências**: Nenhuma

---

### T-4.4 — Remover `@types/jspdf` redundante
```
Categoria: Dependências / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-44)
Severidade: 🟠 Médio
```
**Descrição**: `@types/jspdf` está instalado mas `jsPDF` v2.5+ já inclui seus próprios tipos TypeScript. O pacote `@types/jspdf` pode conflitar ou criar tipos duplicados.

**Arquivos afetados**:
- `package.json`

**Comando**: `npm uninstall @types/jspdf`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` — confirmar que tipos de jsPDF continuam resolvendo corretamente.

**Riscos/cuidados**: Se houver conflito de tipos após remover, pode ser necessário atualizar a versão do jsPDF.

**Dependências**: Nenhuma

---

### T-4.5 — Remover `@testing-library/react` e `jest-dom` não utilizados
```
Categoria: Dependências / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-47)
Severidade: 🟡 Baixo
```
**Descrição**: `@testing-library/react` e `@testing-library/jest-dom` estão instalados mas o projeto usa Vitest sem nenhum arquivo de teste que importe essas bibliotecas.

**Arquivos afetados**:
- `package.json`

**Comando**: `npm uninstall @testing-library/react @testing-library/jest-dom`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run test` — todos os 743 testes continuam passando.

**Riscos/cuidados**: Confirmar com `grep` que nenhum arquivo de teste importa de `@testing-library` antes de remover.

**Dependências**: Nenhuma

---

### T-4.6 — Corrigir 40+ cores hardcoded nos componentes core
```
Categoria: Design System / Dark Mode
Origem: AUDIT_REPORT.md, Agente 5 (A-27)
Severidade: 🔴 Crítico
```
**Descrição**: Header, Sidebar, `button`, `input`, `select`, `Breadcrumbs` contêm 40+ cores hardcoded (`#hex`, `rgba()`) que ignoram as CSS custom properties definidas em `globals.css`. Isso inviabiliza o dark/light mode correto.

**Nota importante**: A regra inviolável proíbe editar `globals.css` e `DESIGN-SYSTEM.md`. Esta tarefa edita apenas os **componentes** (que são arquivos normais), substituindo hardcodes pelas CSS vars já definidas. Isso está explicitamente permitido.

**Arquivos afetados** (identificar com grep antes de executar):
- `components/Header.tsx`
- `components/Sidebar.tsx`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `components/Breadcrumbs.tsx`

**Padrão a aplicar**:
```tsx
// Antes:
<div style={{ backgroundColor: '#161616' }}>
// Depois:
<div className="bg-background"> // ou style={{ backgroundColor: 'var(--background)' }}
```

**Alterações no banco**: Não

**Validação pós-execução**: Alternar entre tema claro e escuro — todos os componentes core devem adaptar corretamente.

**Riscos/cuidados**: Mapear cada cor hardcoded para a CSS var correta consultando `globals.css` e `colors_and_type.css` antes de trocar.

**Dependências**: Nenhuma (mas deve ser feito antes de T-3.3 e T-3.8)

---

### T-4.7 — Corrigir dark mode em `AnimalCard.tsx` e `PlanejamentosList.tsx`
```
Categoria: Design System / Dark Mode
Origem: AUDIT_REPORT.md, Agente 5 (A-28, A-29)
Severidade: 🟠 Médio
```
**Descrição**: `AnimalCard.tsx` e `PlanejamentosList.tsx` usam classes Tailwind brutas de cor (`bg-green-100 text-green-800`, `bg-red-100 text-red-800`) que exibem fundos claros em layout escuro, quebrando o dark mode.

**Arquivos afetados**:
- `app/dashboard/rebanho/components/AnimalCard.tsx` (verificar path real)
- `app/dashboard/planejamento-compras/` (verificar qual componente tem `PlanejamentosList`)

**Padrão a aplicar** (usando variantes semânticas):
```tsx
// Antes:
<Badge className="bg-green-100 text-green-800">Ativo</Badge>
// Depois:
<Badge variant="outline" className="border-green-600 text-green-600">Ativo</Badge>
// ou usar CSS vars:
<Badge style={{ backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }}>
```

**Alterações no banco**: Não

**Validação pós-execução**: Revisão visual em dark mode — badges de status devem ter contraste adequado.

**Riscos/cuidados**: Consultar `colors_and_type.css` para identificar as vars corretas de success/error/warning.

**Dependências**: T-4.6 (corrigir cores dos componentes core primeiro)

---

### T-4.8 — Adicionar regras ESLint customizadas para `any` e `react-hooks/exhaustive-deps`
```
Categoria: Toolchain / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-51)
Severidade: 🟠 Médio
```
**Descrição**: CLAUDE.md proíbe `any` e `eslint-disable react-hooks/exhaustive-deps`, mas essas regras não estão codificadas no `.eslintrc`. Adicionar as regras para que violações sejam detectadas automaticamente em CI.

**Arquivos afetados**:
- `.eslintrc.json` (ou `.eslintrc.js` / `eslint.config.js` — verificar qual existe)

**Regras a adicionar**:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

**Alterações no banco**: Não

**Validação pós-execução**: `npm run lint` — deve apontar todos os `any` e deps faltantes. Corrigir antes de commitar.

**Riscos/cuidados**: Pode gerar muitos erros na primeira execução. Executar `--fix` para os casos automáticos e corrigir manualmente os demais.

**Dependências**: T-2.5 (corrigir o `eslint-disable` existente antes de tornar a regra erro)

---

### T-4.9 — Migração de `next-pwa` para Serwist
```
Categoria: Dependências / PWA
Origem: AUDIT_REPORT.md, Agente 7 (A-52)
Decisão D-04 incorporada: Migrar para Serwist
```
> ✅ Esta tarefa foi promovida a **Épico PWA** e está detalhada na **Fase 2** (T-PWA.1 a T-PWA.8).
> Ver seção "Épico PWA — Migração de `next-pwa` para Serwist (D-04)" acima.

---

### T-4.10 — Restringir `unsafe-eval` no CSP a development apenas (D-05)
```
Categoria: Segurança / Headers HTTP
Origem: AUDIT_REPORT.md, Agente 7 (A-53)
Decisão D-05 incorporada: Remover unsafe-eval em produção
Severidade: 🟡 Baixo
```
**Descrição**: O CSP em `next.config.ts` permite `'unsafe-eval'` em todos os ambientes. Decisão D-05: tornar condicional por ambiente — development mantém `unsafe-eval` para hot-reload; produção não.

**Arquivos afetados**:
- `next.config.ts` (⚠️ arquivo intocável, mas tem aprovação explícita via D-05)

**Implementação (D-05)**:
```typescript
// next.config.ts
const isProd = process.env.NODE_ENV === 'production';

const scriptSrc = isProd
  ? `'self' 'unsafe-inline'`
  : `'self' 'unsafe-inline' 'unsafe-eval'`;

// Usar `scriptSrc` na diretiva Content-Security-Policy existente
```

**Validação obrigatória pré-merge (D-05)**:
1. Deploy em Preview da Vercel (ambiente de produção real)
2. Abrir DevTools → Console → verificar erros de CSP
3. Testar explicitamente:
   - Gráficos Recharts (renderizando corretamente)
   - Export de XLSX (`exceljs` ou `xlsx`)
   - Export de PDF (`jsPDF`)
   - Charts e qualquer lib que faça parse dinâmico
4. Se alguma lib quebrar: identificar a culpada → decidir entre trocar a lib OU restaurar `unsafe-eval` com documentação do motivo

**Candidatas a quebrar com remoção do `unsafe-eval`**:
- `recharts` — improvável (usa DOM, não `eval`)
- `jspdf` — verificar versão
- `xlsx` / `exceljs` — verificar

**Alterações no banco**: Não

**Dependências**: T-4.9 (Serwist) — executar após migração PWA para testar o service worker sem `unsafe-eval` em produção

---

### T-4.11 — Atualizar `tsconfig.json` target para ES2020
```
Categoria: Toolchain / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-50)
Severidade: 🟡 Baixo
```
**Descrição**: `"target": "ES2017"` é conservador para uma stack que usa Node.js 20+ e Chrome moderno. Atualizar para `"ES2020"` habilita `optional chaining`, `nullish coalescing` e `BigInt` nativos sem polyfills.

**Arquivos afetados**:
- `tsconfig.json`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` sem erros TypeScript.

**Riscos/cuidados**: Verificar se alguma biblioteca de terceiros exige ES2017 para compatibilidade.

**Dependências**: Nenhuma

---

## Fase 5 — Melhorias Incrementais
**Objetivo**: Melhorar UX, acessibilidade, DX e housekeeping de dependências.  
**Pré-requisitos**: Fases 1 e 2 concluídas.  
**Esforço estimado**: 8–12h  
**Risco**: Baixo

---

### T-5.1 — Mover `PeriodoFilter` de `components/ui/` para `components/relatorios/`
```
Categoria: Organização de Código
Origem: AUDIT_REPORT.md, Agente 5 (A-26)
Severidade: 🟡 Baixo
```
**Descrição**: `components/ui/PeriodoFilter.tsx` é específico do módulo de relatórios e não é um primitivo genérico. Verificação confirmou que está em `components/ui/` — deve ir para `components/relatorios/PeriodoFilter.tsx` (que é onde o CLAUDE.md já o documenta).

**Arquivos afetados**:
- `components/ui/PeriodoFilter.tsx` — mover para `components/relatorios/PeriodoFilter.tsx`
- Todos os arquivos que importam de `components/ui/PeriodoFilter` — atualizar o import path

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` — sem erros de import não resolvido.

**Riscos/cuidados**: Usar grep para encontrar todos os consumers do import antes de mover.

**Dependências**: Nenhuma

---

### T-5.2 — Integrar `GradientButton` como variante CVA do `Button`
```
Categoria: Design System / DRY
Origem: AUDIT_REPORT.md, Agente 5 (A-25)
Severidade: 🟠 Médio
```
**Descrição**: `GradientButton` existe como componente separado (`components/ui/GradientButton.tsx` ou similar). Deve ser integrado como variante do `Button` via CVA (class-variance-authority), que já é como o `Button` do shadcn/ui funciona.

**Arquivos afetados**:
- `components/ui/button.tsx` — adicionar variante `gradient`
- `components/ui/GradientButton.tsx` — deprecar e remover após migrar consumers
- Todos os arquivos que importam `GradientButton`

**Padrão a aplicar**:
```typescript
const buttonVariants = cva(/* ... */, {
  variants: {
    variant: {
      default: '...',
      gradient: 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:opacity-90',
      // ...
    }
  }
});
```

**Alterações no banco**: Não

**Validação pós-execução**: Revisão visual em todos os locais que usam `GradientButton` — aparência deve ser idêntica.

**Riscos/cuidados**: Nenhum.

**Dependências**: Nenhuma

---

### T-5.3 — Corrigir responsividade de `AnimalCard.tsx` em mobile
```
Categoria: UX / Responsividade
Origem: AUDIT_REPORT.md, Agente 5 (A-30)
Severidade: 🟡 Baixo
```
**Descrição**: `AnimalCard.tsx` usa `grid-cols-2` fixo sem breakpoint responsivo. Em telas < 375px o conteúdo fica apertado.

**Arquivos afetados**:
- `app/dashboard/rebanho/components/AnimalCard.tsx` (verificar path)

**Solução**:
```tsx
// Antes:
<div className="grid grid-cols-2 gap-2">
// Depois:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
```

**Alterações no banco**: Não

**Validação pós-execução**: Testar em viewport 320px — conteúdo deve ser legível.

**Riscos/cuidados**: Nenhum.

**Dependências**: T-4.7 (corrigir dark mode do mesmo componente na mesma sessão)

---

### T-5.4 — Adicionar `hidden sm:table-cell` em tabelas para colunas secundárias
```
Categoria: UX / Responsividade
Origem: AUDIT_REPORT.md, Agente 5 (A-31)
Severidade: 🟡 Baixo
```
**Descrição**: Tabelas de listagem não ocultam colunas secundárias em mobile. As colunas mais importantes (nome, status, ações) devem ser visíveis em mobile; colunas secundárias (datas, detalhes) devem usar `hidden sm:table-cell`.

**Arquivos afetados**: Verificar as tabelas mais pesadas — priorizar:
- `app/dashboard/mao-de-obra/components/AtividadesList.tsx`
- `app/dashboard/produtos/components/ProdutosList.tsx`
- `app/dashboard/insumos/`

**Alterações no banco**: Não

**Validação pós-execução**: Testar em viewport 375px — tabelas devem ser legíveis.

**Riscos/cuidados**: Nenhum.

**Dependências**: Nenhuma

---

### T-5.5 — Adicionar `aria-label` nos botões do Calendar e `aria-hidden` nos ícones decorativos
```
Categoria: Acessibilidade
Origem: AUDIT_REPORT.md, Agente 5 (A-32, A-33)
Severidade: 🟡 Baixo
```
**Descrição**: Dois problemas de acessibilidade:
1. Botões de navegação anterior/próximo mês no componente `Calendar` (shadcn/ui) sem `aria-label`
2. Ícones Lucide decorativos (sem semântica) sem `aria-hidden="true"` — leitores de tela anunciam o nome do ícone

**Arquivos afetados**:
- `components/ui/calendar.tsx` — adicionar `aria-label="Mês anterior"` e `aria-label="Próximo mês"`
- Ícones decorativos em todo o projeto — focar primeiro em Header, Sidebar e componentes de card

**Validação pós-execução**: Teste com VoiceOver ou NVDA — navegação deve ser fluida e ícones decorativos silenciosos.

**Alterações no banco**: Não

**Riscos/cuidados**: Não adicionar `aria-hidden` em ícones com significado semântico real.

**Dependências**: Nenhuma

---

### T-5.6 — Adicionar `role="navigation"` e `aria-label` no Sidebar
```
Categoria: Acessibilidade
Origem: AUDIT_REPORT.md, Agente 5 (A-34)
Severidade: 🟡 Baixo
```
**Descrição**: `components/Sidebar.tsx` agrupa rotas em seções sem `role="navigation"` e sem `aria-label` de região, dificultando navegação por leitores de tela.

**Arquivos afetados**:
- `components/Sidebar.tsx`

**Padrão a aplicar**:
```tsx
<nav role="navigation" aria-label="Menu principal">
  {/* rotas gerenciais */}
</nav>
<nav role="navigation" aria-label="Ferramentas">
  {/* rotas de ferramentas */}
</nav>
```

**Alterações no banco**: Não

**Validação pós-execução**: Verificação com axe DevTools — sem erros de navegação.

**Riscos/cuidados**: Nenhum.

**Dependências**: Nenhuma

---

### T-5.7 — Adicionar `toast.loading()` / `toast.promise()` em operações longas
```
Categoria: UX / Feedback
Origem: AUDIT_REPORT.md, Agente 4 (A-23)
Severidade: 🟡 Baixo
```
**Descrição**: Nenhuma feature usa `toast.loading()` ou `toast.promise()` para operações longas (exports de PDF/XLSX, imports de CSV, operações em lote). O usuário não tem feedback visual durante a espera.

**Prioridade de implementação**:
1. Export de PDF/XLSX em `app/dashboard/relatorios/`
2. Importação de rebanho via CSV (`app/dashboard/rebanho/importar/`)
3. Pesagem em lote (`app/dashboard/rebanho/corte/`)

**Padrão a aplicar**:
```typescript
const promise = exportarRelatorio();
toast.promise(promise, {
  loading: 'Gerando relatório...',
  success: 'Relatório exportado com sucesso!',
  error: 'Erro ao gerar relatório.',
});
```

**Alterações no banco**: Não

**Validação pós-execução**: Testar export de relatório grande — deve exibir toast de carregamento.

**Riscos/cuidados**: `toast.promise()` requer que a função retorne uma Promise — verificar que as funções de export são assíncronas.

**Dependências**: T-2.10 (padronizar Server Actions primeiro)

---

### T-5.8 — Adicionar scripts `test:coverage` e `test:e2e` em `package.json`
```
Categoria: Toolchain / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-49)
Severidade: 🟡 Baixo
```
**Descrição**: `package.json` não tem scripts para cobertura de testes nem para testes e2e.

**Arquivos afetados**:
- `package.json`

**Scripts a adicionar**:
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

**Alterações no banco**: Não

**Validação pós-execução**: `npm run test:coverage` deve gerar relatório de cobertura.

**Riscos/cuidados**: `@vitest/coverage-v8` pode precisar ser instalado como devDependency.

**Dependências**: T-5.10 (corrigir playwright.config.ts antes de usar test:e2e)

---

### T-5.9 — Avaliar remoção de `use-debounce`
```
Categoria: Dependências / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-46)
Severidade: 🟡 Baixo
```
**Descrição**: `use-debounce` é usado em apenas 1 arquivo. Pode ser substituído por um hook de 3 linhas com `useEffect` + `setTimeout`, eliminando a dependência.

**Arquivos afetados**: Identificar o arquivo que usa `use-debounce` antes de agir.

**Solução alternativa**:
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` + testar a feature que usa debounce (busca com autocomplete?).

**Riscos/cuidados**: Verificar se o hook personalizado precisa de tipagem genérica adequada.

**Dependências**: Nenhuma

---

### T-5.10 — Corrigir `playwright.config.ts` com `baseURL` de produção
```
Categoria: DX / Segurança
Origem: AUDIT_REPORT.md, Agente 7 (A-54)
```
> ✅ Esta tarefa foi **promovida para Fase 1** por decisão D-06 (risco real de dados em produção).
> Ver **T-1.6** na Fase 1 para o detalhamento completo.

---

### T-5.11 — Verificar coexistência de `@base-ui/react` e `@radix-ui/react-*`
```
Categoria: Dependências / DX
Origem: AUDIT_REPORT.md, Agente 7 (A-48)
Severidade: 🟡 Baixo
```
**Descrição**: `@base-ui/react` e primitivos `@radix-ui/react-*` coexistem no projeto. Base UI é o sucessor do Radix UI e há sobreposição funcional. Verificar se ambos são realmente necessários ou se há duplicidade que pode ser removida.

**Ação**: Inventariar quais componentes usam `@base-ui/react` vs `@radix-ui/*` — se `@base-ui/react` não for utilizado diretamente, remover.

**Arquivos afetados**:
- `package.json`

**Alterações no banco**: Não

**Validação pós-execução**: `npm run build` + testes visuais dos componentes de UI.

**Riscos/cuidados**: shadcn/ui depende de `@radix-ui` — não remover os primitivos Radix usados pelo shadcn.

**Dependências**: Nenhuma

---

### T-5.12 a T-5.16 — Correções de menor prioridade agrupadas

**T-5.12** — A-35: Eliminar `select('*')` remanescentes (25+ queries em `queries-audit.ts`, `assessoria.ts`, `relatorios/actions.ts`)  
**T-5.13** — A-16: Criar `actions.ts` stub para features read-only (financeiro, calendário, balanço-forrageiro) para conformidade de padrão  
**T-5.14** — A-41: Separar as 19 queries do `Promise.all` do Dashboard em grupos de prioridade (críticas vs secundárias) para melhorar TTFB percebido  
**T-5.15** — A-09 (D-03): Modularizar `queries-audit.ts` por domínio, se aprovado pelo Marcio  
**T-5.16** — A-18: Padronizar tamanho de mensagens de erro de formulários para `text-sm` via `<FormMessage />` consistente

---

## Convenção de Autorização — Padrão D-01 (defesa em camadas)

> Estabelecida em 28/05/2026 como resultado da decisão D-01.  
> **Replicar este padrão em toda nova feature do dashboard.**

| Camada | Arquivo/Local | Responsabilidade | Observações |
|---|---|---|---|
| **Middleware** | `middleware.ts` | Redirect rápido para UX — Operador que acessa `/dashboard/*` é enviado para `/operador` | Via JWT `user_metadata.perfil` — sem query ao banco |
| **`layout.tsx`** | `app/dashboard/[feature]/layout.tsx` | Guard de fallback client-side — redundância UX | Padrão `'use client'` + `useAuth()` + `useEffect` — igual às features novas |
| **`requirePerfil()`** | `lib/auth/guards.ts` | Validação real de segurança em Server Actions e Route Handlers | Chama `auth.getUser()` — não depende apenas de JWT |
| **RLS** | Supabase | Proteção de dados — camada principal | Já configurado, não tocar |
| **UI** | Componentes de ação | Esconde botões destrutivos por perfil | `{profile?.perfil === 'Administrador' && <Button>...}` |

---

## 📦 Backlog — Adiados Conscientemente

> Itens que foram avaliados e deliberadamente adiados. Não implementar sem reabertura explícita com escopo definido.

---

### BL-01 — Modularizar `queries-audit.ts` (D-03)
```
Origem: AUDIT_REPORT.md, Agente 3 (A-09)
Decisão D-03: ADIADO
```
**Descrição**: `lib/supabase/queries-audit.ts` tem 2.000+ linhas centralizando queries de todos os domínios, violando o SRP.

**Motivo do adiamento**: Escopo muito amplo (2.000+ linhas, 15+ componentes consumers). Risco de quebrar funcionalidades existentes é alto. Não há bug associado — impacto é apenas de manutenibilidade.

**Critérios para reabertura**:
1. O arquivo ultrapassar ~800 linhas de novas adições (indicador de crescimento contínuo)
2. Uma feature precisar mexer em múltiplas queries do mesmo arquivo no mesmo PR, causando merge conflicts
3. Decisão explícita do Marcio com escopo definido (ex: "migrar apenas as queries de Financeiro")

**Estratégia quando reabrir**: Migração gradual por domínio, priorizando os módulos que serão modificados nas próximas sprints. Seguir o padrão já estabelecido nas features novas (`lib/supabase/pastagens.ts`, `lib/supabase/mao-de-obra.ts`, etc.).

---

## Apêndice — Consolidações Aplicadas

| Item original | Consolidado em | Motivo |
|---|---|---|
| Agente 1, item 35 | A-35 | Mesmo problema: `select('*')` em múltiplas queries |
| Agente 3, item 10 | A-10 | Mesmo problema: `fazendaIdCache` Map global |
| Agente 6, item 42 | A-10 | Idem acima (identificado por dois agentes) |
| Agente 2, item 5 (balanco-forrageiro) | A-05 | Mesma causa raiz: guard client-side |
| Agente 4, item 22 (calendário sem toast) | Agrupado em T-2.1 | Parte da mesma correção de padronização |

---

## Apêndice — Inconsistências Encontradas no Briefing

1. **A-26 (localização do PeriodoFilter)**: O briefing indicava "verificar localização real antes de agir". A verificação confirmou que o arquivo está em `components/ui/PeriodoFilter.tsx`, não em `components/relatorios/`. O AUDIT_REPORT está correto ao apontar o problema — o CLAUDE.md documenta o destino desejado (`components/relatorios/`) mas o arquivo ainda não foi movido. Status: ✅ Pronto para executar (T-5.1).

2. **A-16 (features sem `actions.ts`)**: O briefing lista frota, financeiro, calendário, balanço-forrageiro, configurações e calculadoras. Porém, ao verificar a glob, `app/dashboard/relatorios/actions.ts` existe. O módulo de relatórios tem `actions.ts`. A lista original do auditor pode estar desatualizada — verificar cada feature individualmente antes de criar stubs.

3. **A-15 vs layout.tsx existentes**: O briefing lista "8 features sem layout.tsx". A glob atual mostra 9 layouts existentes: planejamento-silagem, produtos, planejamento-compras, assessoria, pastagens, mao-de-obra, balanco-forrageiro, calendario, relatorios. Confirmar que silos, talhões, frota, insumos, rebanho, financeiro, configurações e calculadoras realmente não têm layout.tsx antes de criar (T-1.3 já tem esse cuidado na nota de riscos).

4. **`GradientButton`**: O arquivo não foi encontrado via glob (`No files found`). Pode ter um nome diferente ou já ter sido integrado. Verificar com grep por `gradient` em componentes UI antes de executar T-5.2.
