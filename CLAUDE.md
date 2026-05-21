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
- **Testes**: Vitest — 704 testes passando (inclui suite de auditoria RLS em `tests/security/`)

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

- **Operador nunca acessa `/dashboard`** — o `app/dashboard/layout.tsx` redireciona para `/operador`
- **Visualizador nunca escreve** — bloqueado via RLS (`sou_admin_ou_visualizador()`) e ausência de botões de ação na UI
- `sou_gerente_ou_admin()` existe no banco mas equivale a `sou_admin()` na prática (perfil Gerente não existe)
- **Nunca usar `sou_operador_ou_admin()`** em novas Server Actions — função obsoleta, não reflete o modelo atual

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
`silos`, `talhoes`, `maquinas`, `financeiro`, `profiles`, `fazendas`,
`insumos`, `movimentacoes_insumo`, `ciclos_agricolas`, `atividades_campo`,
`planejamentos_silagem`, `planos_manutencao`, `manutencoes`,
`abastecimentos`, `uso_maquinas`,
`animais`, `lotes`, `eventos_rebanho`, `pesos_animal`, `reprodutores`,
`lactacoes`, `producoes_leiteiras`, `eventos_sanitarios`,
`eventos_parto_crias`, `parametros_reprodutivos_fazenda`,
`categorias_rebanho`,
`produtos`, `movimentacoes_produto`, `categorias_produto`,
`planejamentos_atividade`, `planejamento_insumos`

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
│   ├── suporte/
│   ├── configuracoes/
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
│       ├── reproducao/              # Hub com 3 abas: Eventos, Reprodutores, Parâmetros
│       │   ├── page.tsx             # Hub de reprodução (layout com abas via TabsNav)
│       │   ├── layout.tsx
│       │   ├── TabsNav.tsx
│       │   ├── eventos/page.tsx
│       │   ├── reprodutores/
│       │   │   ├── page.tsx
│       │   │   ├── ReprodutoresClient.tsx
│       │   │   └── [id]/
│       │   │       ├── page.tsx               # Server Component — busca reprodutor + coberturas
│       │   │       └── ReprodutorDetailClient.tsx  # Client Component — useAuth, permissões, UI
│       │   ├── parametros/page.tsx
│       │   ├── indicadores/page.tsx
│       │   └── repetidoras/page.tsx
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
├── widgets/
├── planejamento-compras/                # 10 componentes UI do módulo
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
│   ├── configuracoes.ts
│   ├── rebanho.ts                   # Queries animais, lotes, eventos, pesos, importação CSV
│   ├── rebanho-reproducao.ts        # Queries reprodutores, eventos reprodutivos, coberturas, lactações, parâmetros
│   ├── rebanho-leiteira.ts          # Queries producoes_leiteiras
│   ├── rebanho-sanitario.ts         # Queries eventos_sanitarios + listAlertasSanitarios()
│   ├── rebanho-movimentacoes.ts     # Queries de movimentações consolidadas
│   ├── rebanho-movimentacoes-actions.ts  # Helpers de movimentações
│   ├── rebanho-indicadores.ts       # Queries de alertas: partos, pesagens, vacas secas
│   ├── produtos.ts                  # Queries produtos, movimentacoes_produto, categorias_produto
│   └── planejamento-compras.ts      # Queries + função pura calcularLinhasRelatorio()
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

### Referência de Design
- **PRD Completo**: `PRD-design.md`
- **Especificação Técnica**: `SPEC-design.md`
- **Design System**: `DESIGN-SYSTEM.md` (atualizado 2026-05-12)
- **Changelog**: `CHANGELOG-redesign.md`

### Arquivos Intocáveis (Verificar com revisão)
Não modifique sem instrução explícita:
- `next.config.ts` — contém headers de segurança críticos
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
4. Confirmar que 704+ testes passam e build não tem erros TypeScript
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

**Testes**: 31 casos novos (10 validação Zod + 21 cálculo/agrupamento) — total do projeto: 704 passando

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
diagnostico_prenhez, parto, secagem, aborto, descarte, desmame

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
- **Reprodução** (`/reproducao`): hub com 3 abas (Eventos, Reprodutores, Parâmetros) + calendário reprodutivo, IEP, taxa de prenhez, DG, IATF, repetidoras, indicadores reprodutivos
- **Leiteira** (`/leiteira`): registro individual/coletivo, curva de lactação, gráfico 30 dias, ranking top 10 vacas
- **Corte** (`/corte`): GMD, arrobas projetadas, projeção de abate, pesagem em lote, gráfico evolução/lote
- **Sanidade** (`/sanidade`): vacinação/vermifugação/tratamento/exame, registro em lote, calendário sanitário, alertas
- **Movimentações** (`/movimentacoes`): entradas (nascimento/compra), saídas (venda/morte/descarte/abate), transferência entre lotes, KPIs, export CSV

### Reprodutores (`/reproducao/reprodutores/[id]`)
- Página detalhada: Server Component busca dados reais via `queryReprodutores.getById(id)`
- Client Component `ReprodutorDetailClient.tsx` usa `useAuth()` para lógica de permissão
- Lista de coberturas via `queryEventosRebanho.listCoberturasPorReprodutorId(id)`: filtra `eventos_rebanho` por `reprodutor_id` + `tipo = 'cobertura'`, join com `animais(brinco, nome)`
- Botões Editar/Deletar visíveis apenas para `perfil === 'Administrador'`

### Registro de Eventos por Animal
- Rota `/rebanho/[id]/evento` existe e funcional (criada na refatoração v3)

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
- `lib/calculos/indicadores-rebanho.ts` — GMD, IEP, arrobas, projeção de abate, taxa de concepção
- `app/dashboard/rebanho/actions.ts` — Server Actions gerais (animais, lotes)
- `app/dashboard/rebanho/reproducao/actions.ts` — Server Actions reprodução
- `app/dashboard/rebanho/sanidade/actions.ts` — Server Actions sanitários
- `app/dashboard/rebanho/movimentacoes/actions.ts` — Server Actions movimentações
- `app/dashboard/rebanho/leiteira/actions.ts` — Server Actions produção leiteira
- `app/dashboard/rebanho/corte/actions.ts` — pesagem em lote
- `app/dashboard/rebanho/indicadores/actions.ts` — Server Actions KPIs e alertas

**Testes**: 645/646 passando — 1 falho pré-existente (`__tests__/security/rls.test.ts`) por timeout de rede (tenta conectar ao Supabase real sem credenciais configuradas no ambiente de teste)

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

**Variáveis de Ambiente**:
```
JWT_SECRET=<sua-chave-256-bits>
NEXT_PUBLIC_APP_URL=https://gestsilo.com (ou http://localhost:3000)
NEXT_PUBLIC_CONSULTOR_EMAIL=gestsilo.app@gmail.com
RESEND_API_KEY=<chave-resend>
```

---
