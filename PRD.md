# PRD — GestSilo-Pro: Análise Completa do Projeto

> Gerado em: 2026-04-09  
> Modelo: Claude Sonnet 4.6  
> Skills avaliadas: Next.js, React, Supabase, PostgreSQL, Frontend Design, Testes

---

## 1. Mapa do Projeto

### Árvore de Pastas e Responsabilidades

```
GestSIlo-Pro/
├── app/                          [18 arquivos] — Páginas e rotas (App Router)
│   ├── globals.css               Estilos globais Tailwind v4
│   ├── layout.tsx                Root layout: Geist font, Toaster, SyncStatusBar
│   ├── page.tsx                  Landing page pública (marketing)
│   ├── login/page.tsx            Autenticação com roteamento por perfil
│   ├── register/page.tsx         Cadastro de usuário
│   └── dashboard/
│       ├── layout.tsx            Layout protegido: Sidebar + Header
│       ├── page.tsx              Home do dashboard (stats hardcoded — BUG)
│       ├── silos/page.tsx        Gestão de silos e movimentações
│       ├── talhoes/page.tsx      Talhões, ciclos agrícolas, atividades de campo
│       ├── financeiro/page.tsx   Lançamentos financeiros + gráfico Recharts
│       ├── frota/page.tsx        Máquinas, manutenções, abastecimentos
│       ├── insumos/page.tsx      Estoque de insumos com NPK
│       ├── rebanho/page.tsx      Planejador de categorias + confinamento
│       ├── simulador/page.tsx    Simulador forrageiro
│       ├── calculadoras/page.tsx Calculadoras agronômicas (Calagem + NPK)
│       ├── relatorios/page.tsx   Relatórios (stubs — sem geração real)
│       └── configuracoes/page.tsx Perfil e fazenda (stubs — sem persistência)
│   └── operador/page.tsx         Modo Operador mobile-first com suporte offline
│
├── components/                   [22 arquivos] — Componentes reutilizáveis
│   ├── breadcrumbs.tsx           Breadcrumbs (importado mas nunca renderizado — MORTO)
│   ├── header.tsx                Header com autenticação e menu do usuário
│   ├── sidebar.tsx               Sidebar de navegação do dashboard
│   ├── SyncStatusBar.tsx         Barra de status de sincronização offline (Framer Motion)
│   └── ui/                       [18 arquivos] — Componentes base shadcn/base-ui
│       └── alert, avatar, badge, button, calendar, card, checkbox, dialog,
│           dropdown-menu, input, label, popover, progress, scroll-area,
│           select, separator, sheet, skeleton, slider, sonner, table, tabs
│
├── lib/                          [9 arquivos] — Utilitários e camada de dados
│   ├── supabase.ts               Proxy do cliente Supabase + tipos globais
│   ├── utils.ts                  cn() (classnames)
│   ├── offlineQueue.ts           Fila offline via localStorage (LEGADO — não usado)
│   ├── db/
│   │   ├── localDb.ts            IndexedDB via idb
│   │   └── syncQueue.ts          Fila IndexedDB com syncAll()
│   └── supabase/
│       ├── silos.ts              CRUD de silos
│       ├── talhoes.ts            CRUD de talhões e ciclos
│       ├── financeiro.ts         CRUD financeiro
│       ├── insumos.ts            CRUD insumos (BUG em listAbaixoMinimo)
│       ├── maquinas.ts           CRUD máquinas e manutenções
│       ├── operador.ts           Operações do modo operador
│       ├── rebanho.ts            CRUD rebanho
│       ├── atividades_campo.ts   CRUD atividades de campo
│       └── queries-audit.ts      Camada auditada com fazenda_id (NÃO USADA)
│
├── hooks/                        [2 arquivos] — React hooks customizados
│   ├── use-mobile.ts             useIsMobile() (NUNCA USADO no projeto)
│   └── useOfflineSync.ts         Detecta online/offline, dispara syncAll()
│
├── supabase/migrations/          [8 arquivos] — Migrações SQL
│   └── (silos, talhões, máquinas, operador, status, NPK, rebanho, RLS)
│
├── tests/                        [1 arquivo]
│   └── audit.spec.ts             Suite Playwright + axe-core (acessibilidade)
│
├── scripts/convert-hero.mjs      Script one-shot de conversão de imagem
├── public/                       logo.png, imagem-hero.webp/.png, manifest.json
│                                 FALTAM: icon-192.png, icon-512.png (PWA quebrado)
│
└── Configurações raiz:
    ├── package.json
    ├── next.config.ts            PWA + standalone + transpilePackages
    ├── tsconfig.json
    ├── .env.example
    ├── eslint.config.mjs         ESLint flat config (DUPLICADO)
    ├── .eslintrc.json            ESLint legacy config (DUPLICADO)
    ├── postcss.config.mjs
    ├── components.json           shadcn base-nova
    ├── playwright.config.ts
    └── supabase-schema.sql
```

### Total de Arquivos por Pasta

| Pasta | Arquivos |
|-------|----------|
| `app/` | 18 |
| `components/` | 22 |
| `lib/` | 9 |
| `hooks/` | 2 |
| `supabase/migrations/` | 8 |
| `tests/` | 1 |
| `scripts/` | 1 |
| `public/` | 4 |
| Raiz | ~10 |
| **Total** | **~75** |

### Rotas do App Router

| Rota | Acesso | Status | Descrição |
|------|--------|--------|-----------|
| `/` | Público | Completo | Landing page com Hero, Features, Preços, Depoimentos |
| `/login` | Público | Funcional | Email/senha, roteamento por perfil (Admin/Operador) |
| `/register` | Público | Parcial | Cadastro — role hardcoded como 'Administrador' |
| `/dashboard` | Protegido | QUEBRADO | Stats todos zerados, sem fetch de dados reais |
| `/dashboard/silos` | Protegido | Parcial | CRUD silos OK, movimentação não persiste (BUG CRÍTICO) |
| `/dashboard/talhoes` | Protegido | Funcional | Talhões, ciclos, atividades, calculadora de custo |
| `/dashboard/financeiro` | Protegido | Completo | Lançamentos, gráfico, filtros, CRUD completo |
| `/dashboard/frota` | Protegido | Funcional | Máquinas, manutenções, abastecimentos, depreciação |
| `/dashboard/insumos` | Protegido | Funcional | Estoque NPK, movimentações, alerta de estoque mínimo (BUG lógico) |
| `/dashboard/rebanho` | Protegido | Funcional | Planejador de categorias e confinamento |
| `/dashboard/simulador` | Protegido | Funcional | Projeção de silagem baseada em histórico |
| `/dashboard/calculadoras` | Protegido | Completo | Calagem (2 métodos) + NPK |
| `/dashboard/relatorios` | Protegido | STUB | Sem geração real — apenas toast "Exportando..." |
| `/dashboard/configuracoes` | Protegido | STUB | Sem fetch e sem persistência — dados nunca salvos |
| `/operador` | Protegido | Funcional | Modo mobile-first com retirada/perda offline via IndexedDB |

---

## 2. Funcionalidades Implementadas

### Autenticação e Autorização
- **Login com email/senha** (`app/login/page.tsx`) — Supabase Auth, toggle de senha, roteamento automático por perfil (`Administrador` → `/dashboard`, `Operador` → `/operador`) ✅ Completa
- **Cadastro de usuário** (`app/register/page.tsx`) — Cria auth user + profile na tabela `profiles`, porém role hardcoded como 'Administrador' ⚠️ Parcial
- **Proteção de rotas** — via verificação de sessão no `dashboard/layout.tsx` ✅ Funcional

### Módulo de Silos (`/dashboard/silos`)
- CRUD completo de silos (nome, capacidade, tipo, localização, produto, custo unitário) ✅
- Cálculo de ocupação com barra de progresso visual ✅
- Cálculo de dias restantes de estoque ✅
- Cálculo de custo total de produção (join financeiro + atividades de campo) ✅
- **Registrar Movimentação — form existe mas NÃO persiste** ❌ Quebrado

### Módulo Financeiro (`/dashboard/financeiro`)
- CRUD completo de lançamentos (receita/despesa) ✅
- React Hook Form + Zod v4 para validação ✅
- Gráfico de área Recharts com dados reais ✅
- Filtro por período (data início/fim) ✅
- Editar e excluir lançamentos ✅ Completa

### Módulo de Insumos (`/dashboard/insumos`)
- CRUD de insumos com campos NPK (N%, P%, K%) ✅
- Movimentações que atualizam `estoque_atual` automaticamente ✅
- Controle de estoque mínimo com alerta visual ✅
- React Hook Form + Zod para validação ✅
- **`listAbaixoMinimo()` com filtro de coluna incorreto** ❌ Bug lógico

### Módulo de Frota (`/dashboard/frota`)
- CRUD de máquinas (modelo, marca, ano, valor, horas_uso) ✅
- Registro de manutenções com custo ✅
- Registro de abastecimentos ✅
- Cálculo de depreciação ✅ Funcional

### Módulo de Talhões (`/dashboard/talhoes`)
- CRUD de talhões com área em hectares ✅
- Ciclos agrícolas com cultura, safra, datas, produtividade ✅
- Atividades de campo com custo por hectare ✅
- Calculadora de custo de produção ✅ Funcional

### Módulo de Rebanho (`/dashboard/rebanho`)
- Categorias de rebanho com peso médio e quantidade ✅
- Períodos de confinamento com data início/fim ✅
- Cálculo de consumo de silagem por período ✅
- Gráfico de consumo mensal Recharts ✅ Funcional

### Simulador Forrageiro (`/dashboard/simulador`)
- Entrada de área, produtividade esperada, % MS ✅
- Projeção de silagem baseada em histórico de ciclos ✅ Funcional

### Calculadoras Agronômicas (`/dashboard/calculadoras`)
- Calagem pelo método de saturação de bases ✅
- Calagem pelo método de Al+Ca+Mg ✅
- Calculadora NPK com recomendação por cultura ✅ Completa

### Modo Operador (`/operador`)
- Interface mobile-first em dark mode ✅
- Registro de retirada de silo offline ✅
- Registro de perda de silo offline ✅
- Fila IndexedDB com sincronização automática ao reconectar ✅
- `SyncStatusBar` com animação Framer Motion ✅ Funcional

### Infraestrutura
- PWA configurado com `next-pwa` ✅ (ícones ausentes ❌)
- Suite de testes de acessibilidade Playwright + axe-core ✅
- 8 migrações SQL com RLS completo ✅
- Camada de dados auditada `queries-audit.ts` ✅ (não adotada nas páginas ❌)

---

## 3. Funcionalidades Incompletas ou Quebradas

### CRÍTICO — Bug: Movimentação de Silo não persiste
**Arquivo:** `app/dashboard/silos/page.tsx:181-184`  
**Problema:** O formulário coleta dados (`silo_id`, `tipo`, `quantidade`, `responsavel`, `observação`) mas `handleAddMov` ignora tudo, exibe toast e fecha o dialog sem chamar Supabase.
```ts
const handleAddMov = async (e: React.FormEvent) => {
  e.preventDefault();
  toast.success('Movimentação registrada com sucesso!');
  setIsAddMovOpen(false);
  // ← ZERO chamadas ao banco. Dados perdidos.
};
```

### CRÍTICO — Configurações completamente stub
**Arquivo:** `app/dashboard/configuracoes/page.tsx:47-68`  
**Problema:** `fetchData()` seta `null`/`[]` sem consultar Supabase. `handleSaveProfile` e `handleSaveFazenda` só exibem toast.
```ts
const fetchData = async () => {
  setProfile(null);   // nunca busca dados reais
  setFazenda(null);   // nunca busca dados reais
  setUsers([]);       // nunca busca dados reais
};
```

### CRÍTICO — Dashboard Home com stats hardcoded
**Arquivo:** `app/dashboard/page.tsx`  
**Problema:** Array `stats` estático com `'0%'`, `'0 ha'`, `'0 / 0'`, `'R$ 0,00'`. Nenhum `useEffect` ou fetch.

### ALTO — Relatórios sem implementação real
**Arquivo:** `app/dashboard/relatorios/page.tsx`  
**Problema:** `handleExport()` exibe `toast.success('Exportando...')` sem gerar PDF ou Excel. Botão "Configurar Dashboards" exibe `toast.info('Em breve')`.

### MÉDIO — Breadcrumbs importado mas nunca renderizado
**Arquivo:** `app/dashboard/layout.tsx`  
**Problema:** `import Breadcrumbs from '@/components/breadcrumbs'` existe mas `<Breadcrumbs />` não aparece no JSX retornado.

### MÉDIO — Links mortos no login
**Arquivo:** `app/login/page.tsx`  
**Rotas inexistentes:** `/forgot-password`, `/privacidade`, `/termos`, `/suporte`

### MÉDIO — PWA quebrado por ícones ausentes
**Arquivo:** `public/manifest.json`  
**Problema:** Referencia `/icon-192.png` e `/icon-512.png` que não existem em `public/`. Instalação como PWA falha ou exibe ícone genérico.

### BAIXO — Cadastro com role hardcoded
**Arquivo:** `app/register/page.tsx`  
**Problema:** Todo cadastro cria um `Administrador`. Não há seleção de role nem convite de usuários com role específico.

---

## 4. Arquivos e Dependências Desnecessárias

### Arquivos Mortos (código não usado)

| Arquivo | Problema |
|---------|----------|
| `lib/offlineQueue.ts` | Fila offline via `localStorage` — completamente substituída por `lib/db/syncQueue.ts` (IndexedDB). Nenhum arquivo importa `offlineQueue.ts`. Tem `console.log` em produção. |
| `hooks/use-mobile.ts` | Exporta `useIsMobile()`. Nenhum arquivo do projeto importa este hook. |
| `components/breadcrumbs.tsx` | Importado no `dashboard/layout.tsx` mas nunca renderizado — `<Breadcrumbs />` ausente do JSX. |
| `lib/supabase/queries-audit.ts` | Exporta camada de dados completamente auditada com `fazenda_id` garantido em todas as operações. **Nenhuma página usa esta camada.** Representa débito técnico de migração incompleta. |
| `scripts/convert-hero.mjs` | Script one-shot de conversão de imagem. Sem propósito continuado. |

### Dependências sem uso aparente no código

| Pacote | Status |
|--------|--------|
| `@google/genai` | SDK do Gemini — nenhum import em `.ts`/`.tsx`. Possivelmente herança de template. |
| `firebase-tools` (devDep) | Sem referência em nenhum arquivo do projeto. |
| `react-day-picker` | `calendar.tsx` existe e usa este package, mas nenhuma página renderiza `<Calendar>`. |
| `@tailwindcss/typography` | Instalado sem nenhuma classe `prose` no projeto. |
| `next-themes` | Instalado, `ThemeProvider` nunca adicionado ao `app/layout.tsx`. Dark mode declarado no CSS mas inativo na prática. |

### Código Morto Interno

- **`console.log` e `console.error` de infraestrutura em produção:** `lib/offlineQueue.ts` (2 logs), `lib/db/syncQueue.ts` (1 log + 2 errors), `app/dashboard/rebanho/page.tsx` (1 error)
- **Double fetch desnecessário em rebanho:** `rebanho/page.tsx:56` chama `getSilosByFazenda` dentro de uma Promise que já a chamou antes, gerando 2 requisições ao banco para o mesmo dado.

---

## 5. Overengineering e Complexidade Desnecessária

### Proxy do Supabase Client
**Arquivo:** `lib/supabase.ts`  
O cliente Supabase é exposto como um `Proxy` JavaScript que intercepta todos os gets para instanciar o cliente lazily. Isso:
1. Perde **todo o type-checking** do `SupabaseClient` (tipado como `any`)
2. Dificulta o treeshaking do bundler
3. É desnecessário — o padrão recomendado é um singleton simples com guard `if (!instance)`

```ts
// Atual — overengineered e perde tipagem
export const supabase = new Proxy({} as any, {
  get(_, prop) {
    if (!supabaseInstance) supabaseInstance = createClient(...);
    return supabaseInstance[prop];
  }
});

// Correto — simples e tipado
let client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (!client) client = createClient(url, key);
  return client;
}
```

### Duas Filas Offline Paralelas
**Arquivos:** `lib/offlineQueue.ts` + `lib/db/syncQueue.ts`  
O projeto tem duas implementações de fila offline. A versão IndexedDB é superior e já está em uso. A versão `localStorage` deveria ter sido removida durante a migração mas permanece, adicionando complexidade e confusão para qualquer desenvolvedor que leia o código.

### `queries-audit.ts` como Camada Extra Não Adotada
**Arquivo:** `lib/supabase/queries-audit.ts`  
Existe uma camada de dados completa e bem estruturada com garantia de `fazenda_id` em todas as operações. Porém, as páginas continuam usando queries diretas ou a camada sem auditoria. Resultado: duas camadas de acesso a dados mantidas em paralelo sem que a melhor seja adotada.

### Auth Pattern Duplicado em 8+ Lugares
O seguinte bloco está repetido em cada página do dashboard:
```ts
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase.from('profiles')
  .select('fazenda_id, role, nome')
  .eq('id', user.id)
  .single();
```
Não existe hook `useAuth()` ou `useFazendaId()` centralizado, forçando duplicação em todos os `useEffect` de fetch.

---

## 6. Violações de Boas Práticas e Segurança

### Next.js

| Severidade | Arquivo | Problema | Correção |
|-----------|---------|---------|----------|
| ALTO | `next.config.ts` | `eslint: { ignoreDuringBuilds: true }` desativa lint no CI/CD | Remover e corrigir os erros de lint |
| ALTO | `next.config.ts` | `typescript: { ignoreBuildErrors: true }` desativa type-check no build | Remover e corrigir os erros de tipo |
| MÉDIO | `app/layout.tsx` | `next-themes` instalado mas `ThemeProvider` nunca configurado | Configurar ou remover |
| MÉDIO | Todos os pages | Auth check em `useEffect` no client — Server Components poderiam proteger as rotas no servidor | Usar middleware Next.js para proteção de rotas |
| BAIXO | `eslint.config.mjs` + `.eslintrc.json` | Dois arquivos de configuração ESLint simultâneos — comportamento imprevisível | Manter apenas `eslint.config.mjs` (flat config, padrão atual) |

### React

| Severidade | Arquivo | Problema | Correção |
|-----------|---------|---------|----------|
| ALTO | Múltiplos pages | Auth duplicado em 8+ `useEffect` sem hook centralizado | Criar `useAuth()` e `useFazendaId()` hooks |
| ALTO | `header.tsx:23` | `useState<any>(null)` para `user` — tipo existe no SDK | `useState<User \| null>(null)` |
| MÉDIO | `operador/page.tsx:163` | `(profile as any)?.fazendas?.nome` — cast necessário pois tipo `Profile` incompleto | Atualizar o tipo `Profile` para incluir join |
| MÉDIO | Múltiplos pages | Mistura de 3 padrões de formulário (RHF+Zod, useState manual, HTML nativo) | Padronizar com RHF+Zod |
| BAIXO | `rebanho/page.tsx:56` | Double fetch de silos — chamada duplicada ao banco | Usar o resultado já disponível no `Promise.all` |

### Supabase

| Severidade | Arquivo | Problema | Correção |
|-----------|---------|---------|----------|
| CRÍTICO | `talhoes/page.tsx`, `calculadoras/page.tsx`, `simulador/page.tsx` | Queries diretas sem `fazenda_id` — potencial vazamento de dados entre fazendas | Migrar para `queries-audit.ts` que garante isolamento |
| ALTO | `lib/supabase.ts` | `supabaseInstance: any` e `Proxy as any` — perde type-safety do cliente | Tipar como `SupabaseClient \| null` |
| ALTO | `app/register/page.tsx` | Role hardcoded como 'Administrador' — todo cadastro vira admin | Implementar seleção de role ou sistema de convites |
| MÉDIO | Múltiplos pages | `supabase.auth.getUser()` no client sem verificação de expiração de token | Usar `onAuthStateChange` listener centralizado |

### PostgreSQL / Supabase DB

| Severidade | Arquivo | Problema | Correção |
|-----------|---------|---------|----------|
| CRÍTICO | `lib/supabase/insumos.ts:listAbaixoMinimo()` | `.filter('estoque_atual', 'lt', 'estoque_minimo')` compara com a string literal `"estoque_minimo"`, não com o valor da coluna | Usar RPC, view filtrada, ou `.lte('estoque_atual', supabase.raw('estoque_minimo'))` |
| MÉDIO | `supabase/migrations/` | RLS habilitado (bom), mas queries em pages sem `fazenda_id` dependem 100% do RLS para segurança — qualquer brecha expõe todos os dados | Dupla proteção: RLS + `fazenda_id` explícito nas queries |

### Frontend / Design

| Severidade | Arquivo | Problema | Correção |
|-----------|---------|---------|----------|
| MÉDIO | `components/` | Nomenclatura inconsistente: `SyncStatusBar.tsx` (PascalCase) vs `header.tsx`, `breadcrumbs.tsx` (camelCase) | Padronizar para PascalCase (convenção React) |
| MÉDIO | `public/manifest.json` | `icon-192.png` e `icon-512.png` referenciados mas ausentes — PWA quebrado | Criar e exportar os ícones |
| BAIXO | `app/login/page.tsx` | Links para `/forgot-password`, `/privacidade`, `/termos`, `/suporte` não existem | Implementar ou remover os links |
| BAIXO | `app/dashboard/page.tsx` | Stats com `'0%'`, `'0 ha'`, `'0 / 0'` permanentemente — interface enganosa | Implementar fetch de dados reais ou skeleton |

### Testes

| Severidade | Arquivo | Problema | Correção |
|-----------|---------|---------|----------|
| ALTO | `tests/` | Apenas 1 arquivo de teste, somente acessibilidade — zero cobertura de lógica de negócio | Adicionar testes unitários e de integração |
| ALTO | — | Bugs críticos (movimentação, configurações, dashboard stats) detectáveis por testes simples | Testes de formulário e submit com @testing-library/react |
| MÉDIO | `playwright.config.ts` | Testes de acessibilidade sem testes de fluxo E2E (login, CRUD, offline sync) | Adicionar specs de fluxo completo |

---

## 7. Inconsistências

### Padrões de Formulário: 3 abordagens no mesmo projeto

| Abordagem | Onde | Qualidade |
|-----------|------|-----------|
| **RHF + Zod** | `financeiro`, `insumos` | Correto — validação tipada, erros inline |
| **useState + validação manual** | `silos`, `frota`, `talhoes`, `rebanho` | Fraco — sem schema, sem erros tipados |
| **HTML nativo sem validação** | `login`, `register` | Ruim — sem feedback de erro adequado |

### Acesso ao Banco: 3 abordagens no mesmo projeto

| Abordagem | Onde | Problema |
|-----------|------|---------|
| Funções de `lib/supabase/*` | `silos`, `insumos`, `frota` | Correto — reutilizável |
| `queries-audit.ts` | Nunca | Nunca adotada — débito técnico |
| `supabase.from()` direto no page | `talhoes`, `calculadoras`, `simulador` | Sem isolamento de fazenda |

### Nomenclatura de Arquivos em `components/`

| Arquivo | Convenção | Correto? |
|---------|-----------|----------|
| `SyncStatusBar.tsx` | PascalCase | ✅ |
| `header.tsx` | camelCase | ❌ |
| `sidebar.tsx` | camelCase | ❌ |
| `breadcrumbs.tsx` | camelCase | ❌ |

### Tipagem de Erros em `catch`

| Arquivo | Padrão | Qualidade |
|---------|--------|-----------|
| `financeiro/page.tsx` | `err: unknown` + type guard | ✅ Correto |
| `insumos/page.tsx` | `err: any` (3 catches) | ❌ |
| `login/page.tsx` | `err: any` | ❌ |
| `register/page.tsx` | `error: any` | ❌ |
| `rebanho/page.tsx` | `error: any` | ❌ |

### Imports: alias `@/` vs paths relativos

A maioria dos imports usa `@/` (correto para App Router), mas algumas inconsistências de organização existem na camada `lib/`.

---

## 8. Cobertura de Testes

### O que existe

**`tests/audit.spec.ts`** — Suite Playwright com axe-core:
- Testa acessibilidade via WCAG em 6+ rotas do dashboard
- Verifica ausência de violations de acessibilidade (aria-labels, roles, landmarks)
- Configurada no `playwright.config.ts` com base URL `http://localhost:3000`

### O que não existe (crítico)

| Área | Criticidade | Situação |
|------|------------|---------|
| Testes unitários de componentes | ALTA | Zero |
| Testes de formulários (submit, validação, erros) | ALTA | Zero |
| Testes de lógica de negócio (calculadoras, simulador) | ALTA | Zero |
| Testes de integração (CRUD via Supabase) | ALTA | Zero |
| Testes E2E de fluxo (login → dashboard → CRUD) | MÉDIA | Zero |
| Testes de sincronização offline | MÉDIA | Zero |
| Testes de hooks customizados | BAIXA | Zero |

### Análise

O único teste existente cobre apenas **acessibilidade visual** — relevante, mas insuficiente. Os 3 bugs críticos identificados (movimentação não persiste, configurações stub, dashboard stats hardcoded) são **trivialmente detectáveis** por testes de formulário básicos com `@testing-library/react`. A ausência total de testes de lógica significa que qualquer refatoração é arriscada e que bugs de regressão passarão despercebidos.

---

## 9. Resumo Executivo

### Nota Geral: **5.5 / 10**

O projeto tem uma base arquitetural sólida, stack moderna e alguns módulos bem implementados. Porém, tem bugs críticos em funcionalidades centrais, código morto acumulado, inconsistências de padrão que dificultam manutenção, e zero cobertura de testes de lógica. Não está pronto para produção com usuários reais.

---

### Top 5 Problemas Mais Críticos

**1. Movimentação de Silo não persiste** (`silos/page.tsx:181`)  
O formulário principal de um módulo central faz nada. Usuários registram movimentações que desaparecem silenciosamente. **Falha silenciosa — sem erro visível.**

**2. `queries-audit.ts` ignorada — risco de vazamento de dados**  
Páginas como `calculadoras`, `talhoes` e `simulador` fazem queries sem `fazenda_id` explícito. A segurança depende 100% do RLS do Supabase. Uma misconfiguration de RLS expõe dados de todas as fazendas.

**3. Dashboard Home e Configurações completamente não implementados**  
Dois módulos que aparecem como funcionais para o usuário são stubs completos. Dados de configuração nunca são salvos.

**4. `listAbaixoMinimo()` com bug lógico** (`lib/supabase/insumos.ts`)  
`.filter('estoque_atual', 'lt', 'estoque_minimo')` compara uma coluna com a string literal `"estoque_minimo"`. O alerta de estoque mínimo nunca funciona corretamente — retorna resultados errados ou nenhum resultado.

**5. `ignoreDuringBuilds: true` para ESLint e TypeScript no `next.config.ts`**  
O build nunca falha por erros de tipo ou lint. Erros passam para produção sem verificação. Isso mascara bugs tipados e viola a principal vantagem de usar TypeScript.

---

### Top 5 Quick Wins (Alta Impacto, Baixo Esforço)

**1. Implementar `handleAddMov` em silos** (~30 min)  
Copiar o padrão de `handleAddLancamento` do módulo financeiro. O formulário já existe — só falta a chamada ao Supabase e atualização do estado local.

**2. Remover `ignoreDuringBuilds: true`** (~15 min)  
Remover as flags do `next.config.ts` e corrigir os erros de tipo/lint que aparecerem. Garante que o CI valide o código de verdade.

**3. Corrigir `listAbaixoMinimo()`** (~10 min)  
Substituir o filtro incorreto por uma RPC Supabase ou view com `WHERE estoque_atual < estoque_minimo`. O alert de estoque vai funcionar corretamente.

**4. Remover arquivos mortos** (~20 min)  
Deletar `lib/offlineQueue.ts`, `hooks/use-mobile.ts`. Adicionar `<Breadcrumbs />` no layout ou remover o import. Reduz confusão imediatamente.

**5. Criar ícones PWA** (~10 min)  
Gerar e exportar `icon-192.png` e `icon-512.png` para `public/`. Habilita instalação correta como PWA em mobile.

---

*Análise gerada com varredura completa de todos os ~75 arquivos do projeto. Baseada nas skills de boas práticas: Next.js App Router, React, Supabase, PostgreSQL, Frontend Design e Playwright Testing.*
