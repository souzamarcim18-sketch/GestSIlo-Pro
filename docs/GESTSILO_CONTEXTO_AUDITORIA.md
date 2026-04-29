# GestSilo Pro — Contexto da Auditoria e Plano de Correções

> Documento atualizado em 29/04/2026 para preservar o contexto completo da auditoria e execução do plano de correções.
> Próxima auditoria agendada: **27/07/2026**

---

## 1. Stack do Projeto

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15.5.14 (App Router) + TypeScript strict |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + RLS) — região: West US (Oregon) |
| Deploy | Vercel |
| Versionamento | GitHub |
| IDE | VS Code + Claude Code (extensão) |
| Testes | Vitest — 227/227 passando |
| Validação | Zod + React Hook Form |
| Rate Limiting | Upstash Redis (@upstash/ratelimit) |
| Monitoramento | Sentry (pendente S4) |
| Backup | GitHub Actions + Cloudflare R2 (gestsilo-backups) |

---

## 2. Score da Auditoria

| Momento | Score | Data |
|---------|-------|------|
| Auditoria inicial | 6.8/10 | 27/04/2026 |
| Meta após 3 sprints | 8.5+/10 | 27/07/2026 |

### Notas por dimensão (auditoria inicial)

| Dimensão | Nota |
|----------|------|
| Arquitetura & Organização | 8/10 |
| Qualidade TS/React | 6/10 |
| Segurança | 7/10 |
| Performance | 6/10 |
| Banco de Dados | 5/10 |
| Testes | 6/10 |
| DX & Manutenibilidade | 8/10 |
| Infraestrutura & Deploy | 9/10 |

---

## 3. Descobertas Importantes Durante a Execução

### Perfis reais no banco
O banco define **apenas 3 perfis**, não 4 como o plano original assumia:
```
'Administrador' | 'Operador' | 'Visualizador'
```
> ⚠️ `Gerente` **não existe** no banco. Se for criado futuramente, revisar condicionais de DELETE em 6 arquivos (ver T6).

### Campo `role` vs `perfil`
- TypeScript declarava `profile.role`
- Banco real tem coluna `perfil`
- Corrigido na T5. Fonte de verdade: `profile.perfil`

### Cache global `fazendaIdCache`
- Estava contaminando testes entre si
- Corrigido na T4 com exportação de `clearFazendaIdCache()` e chamada em `beforeEach()`

### Testes pré-existentes com falha
- 9 testes falhavam antes do Sprint 1 por campo `data` inexistente no schema Zod
- Corrigidos na T4: **227/227 testes passando** ao final do Sprint 1

### Loop infinito de RLS em `profiles` (descoberto no Sprint 2)
- A policy `profiles_select_mesma_fazenda` chamava `get_minha_fazenda_id()`
- `get_minha_fazenda_id()` fazia SELECT em `profiles`
- Resultado: loop infinito → query travava por 30 segundos
- **Correção aplicada:** policy reescrita com subquery inline, eliminando chamada à função
- **Funções atualizadas** para usar `auth.jwt()` como fonte primária:
  - `get_minha_fazenda_id()`, `sou_admin()`, `sou_gerente_ou_admin()`

### AuthProvider — carregamento do perfil
- O `fetchProfile` buscava o perfil via query ao banco (lenta, travava por loop RLS)
- **Correção aplicada:** perfil agora carregado do `user_metadata` do JWT (rápido, sem query)
- Dados no `raw_user_meta_data`: `nome`, `perfil`, `fazenda_id`, `email`
- `fetchProfile` continua como sincronização opcional em background

### Fluxo de login — mudanças do Sprint 2
- S1 introduziu API routes para rate limiting: `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`
- Correções em cascata necessárias:
  - `createServerClient` em vez de `createClient` na rota de login
  - Redirect 303 (não 307) para evitar POST no dashboard
  - `response.redirected` no cliente em vez de `window.location.href`
  - Middleware corrigido para usar `setAll()`/`remove()` de cookies
  - Query de profiles corrigida: removidas colunas inexistentes (`avatar_url`, `updated_at`)
  - Campo `email` adicionado ao `profileFromMetadata`

### Security Advisor do Supabase (51 warnings)
- 3 funções com `search_path` mutável (baixo risco)
- Múltiplas funções `SECURITY DEFINER` acessíveis pelo role `anon`
- REVOKE aplicado para funções principais
- **Ação pendente:** revisar Security Advisor na próxima auditoria

### Bug descoberto durante testes do Sprint 2
- `column ciclos_agricolas.produtividade does not exist` (erro 42703)
- Query de ciclos agrícolas no detalhe do talhão falha
- Adicionado como **P7** no Sprint 3

---

## 4. Plano de Correções — 3 Sprints

### Notion (fonte de verdade das tarefas)
🔗 [GestSilo — Plano de Correção & Auditoria](https://www.notion.so/3504e5693ecd81bda543dda9d24aa062)

---

### Sprint 1 — Bugs Críticos & Estabilidade ✅ CONCLUÍDO

**Branch:** `fix/sprint-1` → merge na `main` ✅

| Tarefa | Descrição | Nota | Status |
|--------|-----------|------|--------|
| T1 | Remover injeção manual de `fazenda_id: ''` | 9/10 | ✅ |
| T2 | Substituir `payload: any` em AtividadeDialog | 7/10 | ✅ |
| T3 | Corrigir INSERTs de Bromatologia e PSPS sem `fazenda_id` | 10/10 | ✅ |
| T4 | Corrigir os 9 testes quebrados no Vitest | 10/10 | ✅ |
| T5 | Corrigir divergência `Profile.role` vs coluna `perfil` | 9/10 | ✅ |
| T6 | Ocultar botão DELETE para perfil Operador na UI | 8/10 | ✅ |

**Resultado Sprint 1:** Média 8.8/10 · 227/227 testes passando

#### Pendências herdadas → P3
- 4 casts `as any` em `AtividadeDialog.tsx`: `tipo_operacao`, `categoria_pulverizacao`, `dose_unidade`, `metodo_entrada`

#### Nota futura
- Se perfil `Gerente` for adicionado ao banco, revisar condicionais de DELETE em 6 arquivos:
  - `silos/[id]/page.tsx`, `TalhaoDetailHeader.tsx`, `TalhaoResumoTab.tsx`
  - `financeiro/page.tsx`, `FrotaCadastro.tsx`, `configuracoes/page.tsx`

---

### Sprint 2 — Segurança Completa 🔄 EM ANDAMENTO

**Branch:** `fix/sprint-2` → merge na `main` ✅ (S4, S5, S6 ainda pendentes)

| Tarefa | Descrição | Status |
|--------|-----------|--------|
| S1 | Rate limiting (Upstash Redis) | ✅ Concluído |
| S2 | Headers HTTP (CSRF, XSS, Clickjacking) | ✅ Concluído |
| S3 | Backup automatizado do banco (LGPD) | ✅ Concluído |
| S4 | Monitoramento de erros com Sentry | ⬜ Pendente |
| S5 | Auditoria e teste real do RLS com múltiplos usuários | ⬜ Pendente |
| S6 | Geração automática de tipos Supabase | ⬜ Pendente |

#### Detalhes do S1 — Rate Limiting
- Pacotes: `@upstash/ratelimit` + `@upstash/redis`
- Rotas: `/api/auth/login` (5/min), `/api/auth/register` (5/hora), `/api/auth/forgot-password` (3/hora)
- Retorna HTTP 429 com mensagem em PT-BR
- Variáveis na Vercel: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

#### Detalhes do S2 — Headers HTTP
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- `Content-Security-Policy` com `script-src`, `script-src-elem`, `connect-src` (inclui `wss://*.supabase.co` e `https://*.upstash.io`), `style-src`, `img-src`, `font-src`
- Cache-Control `no-store` em `/login`, `/dashboard/:path*`, `/api/:path*`
- Limitação: `'unsafe-inline'` mantido por compatibilidade com Tailwind CSS 4.1

#### Detalhes do S3 — Backup
- Workflow: `.github/workflows/backup-db.yml`
- Cron: todo domingo às 3h UTC
- Ferramenta: `pg_dump` + `rclone` para Cloudflare R2
- Bucket: `gestsilo-backups` (região ENAM)
- Secrets no GitHub: `SUPABASE_DB_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `BACKUP_ALERT_EMAIL`
- Testado manualmente: ✅ arquivo `.sql.gz` gerado e enviado ao R2 em 27s

---

### Sprint 3 — Performance & Dívida Técnica ⬜ PENDENTE

**Branch:** `fix/sprint-3` (criar quando iniciar)

| Tarefa | Descrição | Status |
|--------|-----------|--------|
| P1 | Criar índice em `planos_manutencao(fazenda_id)` | ⬜ |
| P2 | Corrigir `eslint-disable exhaustive-deps` em hooks críticos | ⬜ |
| P3 | Alinhar CHECK constraints PostgreSQL com schemas Zod + casts `as any` de T2 | ⬜ |
| P4 | Otimizar queries `.select()` sem colunas explícitas | ⬜ |
| P5 | Implementar integração insumos → financeiro ao registrar despesa | ⬜ |
| P6 | Deprecar rotas mockadas e sinalizar "Em breve" no menu | ⬜ |
| P7 | Corrigir query de `ciclos_agricolas`: coluna `produtividade` não existe | ⬜ |

---

## 5. Mudanças no Banco de Dados (Sprint 2)

### Policy RLS alterada
```sql
DROP POLICY IF EXISTS profiles_select_mesma_fazenda ON profiles;
CREATE POLICY profiles_select_mesma_fazenda ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR
  fazenda_id IN (
    SELECT fazenda_id FROM profiles WHERE id = auth.uid()
  )
);
```

### Funções SQL atualizadas para usar JWT
- `get_minha_fazenda_id()` — usa `auth.jwt()` como fonte primária
- `sou_admin()` — usa `auth.jwt()` como fonte primária
- `sou_gerente_ou_admin()` — usa `auth.jwt()` como fonte primária

### REVOKE aplicados (anon role)
```sql
REVOKE EXECUTE ON FUNCTION public.atualizar_custo_medio_e_estoque() FROM anon;
REVOKE EXECUTE ON FUNCTION public.atualizar_status_talhao() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calcular_analise_solo() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_insumos_abaixo_minimo(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_fazenda_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_perfil() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_gerente_or_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_operador() FROM anon;
REVOKE EXECUTE ON FUNCTION public.posso_criar_fazenda() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sou_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sou_gerente_ou_admin() FROM anon;
```

---

## 6. Fluxo de Trabalho Git

```powershell
# Iniciar sprint
git checkout -b fix/sprint-N

# Após cada tarefa
git add .
git commit -m "fix: descrição da tarefa"
git push origin fix/sprint-N

# Após concluir TODAS as tarefas do sprint
git checkout main
git merge fix/sprint-N
# Se abrir editor Vim: pressione Esc → :wq → Enter
git push origin main
# → Deploy automático na Vercel
```

> ⚠️ **Nunca fazer merge parcial.** Só merge na `main` quando todas as tarefas do sprint estiverem concluídas e `npm run build` + `npm run test` passarem 100%.

---

## 7. Prompt Padrão — Abertura de Sessão Claude Code

```
Estou trabalhando no GestSilo Pro. Os arquivos CLAUDE.md, database-snapshot.md e audit-geral.md estão disponíveis como contexto. Hoje vamos resolver [NOME DA TAREFA]. Antes de qualquer edição: (1) leia o arquivo relevante, (2) me diga exatamente o que vai mudar, (3) aguarde minha confirmação. Após concluir: rode npm run build e npm run test e me mostre o resultado. Não altere .env, next.config.js nem turbo.json sem minha autorização explícita.
```

---

## 8. Variáveis de Ambiente Necessárias

### `.env.local` (desenvolvimento)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=
OPENWEATHER_API_KEY=
```

### Vercel (produção + preview) — All Environments
- Todas as variáveis acima configuradas em Settings → Environment Variables

### GitHub Secrets (backup)
- `SUPABASE_DB_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`, `R2_BUCKET`, `BACKUP_ALERT_EMAIL`

---

## 9. Checklist Final (após Sprint 3)

- [x] 227/227 testes passando
- [x] Rate limiting ativo e testado
- [x] Headers HTTP validados em produção
- [x] Backup semanal rodando (GitHub Actions + Cloudflare R2)
- [ ] Sentry instalado e filtrando dados sensíveis (S4)
- [ ] RLS testada com múltiplos usuários (S5)
- [ ] Tipos Supabase gerados automaticamente — `db:types` (S6)
- [ ] Índices de banco criados (P1)
- [ ] `eslint-disable` removidos (P2)
- [ ] CHECK constraints alinhadas com Zod + casts `as any` resolvidos (P3)
- [ ] Queries `.select()` otimizadas (P4)
- [ ] Integração insumos → financeiro funcionando (P5)
- [ ] Rotas mockadas sinalizadas como "Em breve" (P6)
- [ ] Query de `ciclos_agricolas` corrigida (P7)
- [ ] `audit-geral.md` atualizado com novo score
- [ ] Próxima auditoria agendada: **27/07/2026**
