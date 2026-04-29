# GestSilo Pro — Plataforma de Gestão Agrícola

## Sobre a Aplicação
**GestSilo Pro** é uma plataforma SaaS de gestão agrícola completa para pequenos e médios produtores brasileiros, com foco especializado em **gestão de silos de silagem**. Oferece visão integrada da propriedade rural através de módulos especializados (silos, talhões, frota, financeiro, etc.), funcionando tanto via web (Vercel) quanto como PWA (offline-ready).

---

## Stack Técnico

### Core
- **Frontend**: Next.js 15.5+ com App Router, React 19+
- **Banco de Dados**: Supabase (PostgreSQL) — região: West US (Oregon)
- **Deploy**: Vercel (production + preview automático por branch)
- **Linguagem**: TypeScript 5.9 strict
- **UI**: shadcn/ui + Tailwind CSS 4.1 + Lucide React
- **Recursos**: PWA offline-ready, temas escuro/claro, gráficos (Recharts), formulários (React Hook Form + Zod)

### Segurança & Infraestrutura
- **Rate Limiting**: Upstash Redis (`@upstash/ratelimit`) — rotas de auth protegidas
- **Headers HTTP**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy configurados em `next.config.ts`
- **Monitoramento**: Sentry (`@sentry/nextjs`) — captura erros em Client/Server Components e Server Actions
- **Backup**: GitHub Actions + Cloudflare R2 — backup semanal automatizado (toda domingo 3h UTC)
- **Testes**: Vitest — 237 testes passando (inclui suite de auditoria RLS em `tests/security/`)

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

-- Verifica se usuário é Administrador ou Gerente via JWT
sou_gerente_ou_admin() → boolean
```

### Tabelas Principais
`silos`, `talhoes`, `maquinas`, `financeiro`, `profiles`, `fazendas`, `insumos`, `movimentacoes_insumo`, `ciclos_agricolas`, `atividades_campo`, `planejamentos_silagem`, `planos_manutencao`, `manutencoes`, `abastecimentos`, `uso_maquinas`

### Índices Existentes (criados em 29/04/2026)
- `idx_planos_manutencao_fazenda_id`
- `idx_manutencoes_fazenda_id`
- `idx_abastecimentos_fazenda_id`
- `idx_uso_maquinas_fazenda_id`

---

## Estrutura Principal

```
app/
├── api/
│   ├── auth/
│   │   ├── login/route.ts          # Rate limiting + createServerClient
│   │   ├── register/route.ts       # Rate limiting
│   │   └── forgot-password/route.ts # Rate limiting
│   ├── weather/route.ts
│   └── geocoding/route.ts
├── dashboard/                       # Rotas autenticadas
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
│   ├── produtos/                    # Em breve (badge no Sidebar)
│   ├── suporte/
│   ├── configuracoes/
│   └── onboarding/
├── login/
├── register/
├── forgot-password/
└── page.tsx

components/
├── ui/                              # shadcn/ui
├── widgets/
├── Header.tsx
├── Sidebar.tsx
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
│   └── configuracoes.ts
├── sentry/
│   └── allowlist.ts                 # Padrões de dados sensíveis filtrados do Sentry
├── auth/
│   ├── logger.ts
│   └── rate-limit.ts                # Helpers Upstash ratelimit
├── hooks/
├── types/
├── services/
├── db/
│   ├── localDb.ts                   # IndexedDB PWA
│   └── syncQueue.ts
├── calculadoras/
├── pdf/
├── constants/
├── utils.ts
└── supabase.ts

types/
└── supabase.ts                      # Gerado automaticamente via npm run db:types

providers/
└── AuthProvider.tsx                 # Carrega perfil do JWT user_metadata

middleware.ts                        # Valida sessão, setAll/remove cookies
sentry.client.config.ts
sentry.server.config.ts
instrumentation.ts
.github/
└── workflows/
    └── backup-db.yml                # Backup semanal Cloudflare R2
```

---

## Padrões de Código

### Componentes React
- Sempre `'use client'` em componentes com estado ou efeitos colaterais
- Componentes de UI puros (shadcn/ui) podem ser RSC quando apropriado
- Tipagem: prefira Props interface explícita (sem `React.FC`)
- Custom hooks devem retornar `{ data, isLoading, error }` quando async
- **Nunca usar** `payload: any` — tipagem correta com `Omit<Tipo, 'id' | 'fazenda_id'>`
- **Nunca suprimir** `eslint-disable react-hooks/exhaustive-deps` — corrigir as dependências com `useCallback`/`useMemo`

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

### Formatação & Tipos
- **Moeda BRL**: `formatBRL(value)` em `lib/utils.ts`
- **Datas**: ISO string no banco, formatado no UI com `formatDate()`
- Tipos do banco gerados automaticamente — não editar `types/supabase.ts` manualmente

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

---

## Integração Insumos → Financeiro
Quando `registrar_como_despesa === true` em uma saída de insumo:
- `criarSaidaAction` cria automaticamente lançamento em `financeiro` (categoria "Insumos", tipo "Despesa")
- `movimentacoes_insumo.despesa_id` é preenchido para rastreabilidade bidirecional
- Ao deletar movimentação com `despesa_id`, o registro em `financeiro` é removido junto (cleanup automático)

---

## Variáveis de Ambiente

### `.env.local` (desenvolvimento)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=
OPENWEATHER_API_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SUPABASE_PROJECT_ID=
```

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
npm run lint         # ESLint
npm run clean        # Limpar cache Next.js
npm run db:types     # Gerar tipos TypeScript do Supabase (requer SUPABASE_PROJECT_ID)
```

---

## Regras Invioláveis — Nunca Faça

- ❌ Altere `.env` ou `.env.local`
- ❌ Altere `next.config.ts` sem instrução explícita (contém headers de segurança críticos)
- ❌ Altere `turbo.json` ou configurações de build
- ❌ Reescreva componentes inteiros sem ser pedido
- ❌ Remova espaços em branco ou refatore sem contexto
- ❌ Adicione features não requisitadas
- ❌ Delete dados em produção sem confirmação explícita
- ❌ Use `select('*')` em queries Supabase
- ❌ Ignore avisos de TypeScript ou ESLint
- ❌ Use `payload: any` — tipar corretamente
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
4. Confirmar que 237+ testes passam e build não tem erros TypeScript
5. Consultar `database-snapshot.md` para qualquer mudança de schema

---

## Funcionalidades por Módulo

### 🌾 Silos & Estoque (Core)
- Cadastro e monitoramento de silos de silagem por fazenda
- Controle de capacidade e estoque com percentuais visuais
- Movimentações entrada/saída com rastreamento
- Avaliação de qualidade: bromatológica e PSPS
- Faixas de qualidade personalizáveis

### 🗺️ Talhões
- Gestão de áreas com mapa
- Ciclo agrícola completo: planejamento → plantio → colheita
- Eventos DAP, janelas de colheita, histórico de culturas
- Coluna real: `produtividade_ton_ha` (não `produtividade`)

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

### 🧮 Calculadoras Agronômicas
- Calagem, adubação NPK, fertilizantes

### 🔮 Em Breve (badge no Sidebar)
- Assessoria Agronômica
- Produtos (grãos, origem animal, forragens)
