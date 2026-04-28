# GestSilo Pro — Contexto da Auditoria e Plano de Correções

> Documento gerado em 28/04/2026 para preservar o contexto completo da auditoria e execução do plano de correções.
> Próxima auditoria agendada: **27/07/2026**

---

## 1. Stack do Projeto

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js (App Router) + TypeScript strict |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + RLS) |
| Deploy | Vercel |
| Versionamento | GitHub |
| IDE | VS Code + Claude Code (extensão) |
| Testes | Vitest |
| Validação | Zod + React Hook Form |

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

---

## 4. Plano de Correções — 3 Sprints

### Notion (fonte de verdade das tarefas)
🔗 [GestSilo — Plano de Correção & Auditoria](https://www.notion.so/3504e5693ecd81bda543dda9d24aa062)

---

### Sprint 1 — Bugs Críticos & Estabilidade ✅ CONCLUÍDO

**Branch:** `fix/sprint-1` → merge na `main` após conclusão

| Tarefa | Descrição | Nota | Status |
|--------|-----------|------|--------|
| T1 | Remover injeção manual de `fazenda_id: ''` | 9/10 | ✅ |
| T2 | Substituir `payload: any` em AtividadeDialog | 7/10 | ✅ |
| T3 | Corrigir INSERTs de Bromatologia e PSPS sem `fazenda_id` | 10/10 | ✅ |
| T4 | Corrigir os 9 testes quebrados no Vitest | 10/10 | ✅ |
| T5 | Corrigir divergência `Profile.role` vs coluna `perfil` | 9/10 | ✅ |
| T6 | Ocultar botão DELETE para perfil Operador na UI | 8/10 | ✅ |

**Resultado Sprint 1:** Média 8.8/10 · 227/227 testes passando

#### Pendências herdadas do Sprint 1 → adicionar ao P3
- 4 casts `as any` remanescentes em `AtividadeDialog.tsx`:
  - `tipo_operacao`, `categoria_pulverizacao`, `dose_unidade`, `metodo_entrada`
  - Causa: desalinhamento Zod ↔ enum no banco. Resolver junto com P3.

#### Nota futura (criar tarefa quando relevante)
- Se perfil `Gerente` for adicionado ao banco, revisar condicionais de DELETE em 6 arquivos:
  - `silos/[id]/page.tsx`
  - `TalhaoDetailHeader.tsx`
  - `TalhaoResumoTab.tsx`
  - `financeiro/page.tsx`
  - `FrotaCadastro.tsx`
  - `configuracoes/page.tsx`

---

### Sprint 2 — Segurança Completa 🔄 EM ANDAMENTO

**Branch:** `fix/sprint-2`

| Tarefa | Descrição | Status | Observações |
|--------|-----------|--------|-------------|
| S1 | Rate limiting (Upstash Redis) | ✅ Código pronto | Configurar variáveis de ambiente |
| S2 | Headers HTTP (CSRF, XSS, Clickjacking) | ✅ Código pronto | Validar via DevTools em preview Vercel |
| S3 | Backup automatizado do banco (LGPD) | ⬜ Pendente | |
| S4 | Monitoramento de erros com Sentry | ⬜ Pendente | |
| S5 | Auditoria e teste real do RLS com múltiplos usuários | ⬜ Pendente | |
| S6 | Geração automática de tipos Supabase | ⬜ Pendente | |

#### Ações pendentes para S1 (antes do merge)
1. Criar banco Redis no [Upstash](https://upstash.com)
   - Name: `gestsilo-ratelimit`
   - Primary Region: `South America (São Paulo)`
   - Plano: Free
2. Copiar credenciais da seção **REST API** do Upstash
3. Adicionar ao `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://sua-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=seu-token-aqui
   ```
4. Adicionar as mesmas variáveis na **Vercel** (Settings → Environment Variables)

#### Ações pendentes para S2 (antes do merge)
- Fazer push da branch `fix/sprint-2` para o GitHub
- Aguardar URL de preview da Vercel
- Validar headers no DevTools: F12 → Network → qualquer requisição → Response Headers
- Confirmar presença de: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`

#### Limitações conhecidas do S2
- `'unsafe-inline'` mantido em `style-src` por compatibilidade com Tailwind CSS 4.1
- HSTS não implementado (recomendado apenas após certificado SSL em produção confirmado)
- CSP usa whitelist genérica `https://*.supabase.co` — refinar se necessário após feedback de produção

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

---

## 5. Fluxo de Trabalho Git

```
# Iniciar sprint
git checkout -b fix/sprint-N

# Após cada tarefa
git add .
git commit -m "fix: descrição da tarefa"
git push origin fix/sprint-N

# Testar headers/variáveis via URL de preview da Vercel (sem afetar produção)

# Após concluir TODAS as tarefas do sprint
git checkout main
git merge fix/sprint-N
git push origin main
# → Deploy automático na Vercel
```

> ⚠️ **Nunca fazer merge parcial.** Só merge na `main` quando todas as tarefas do sprint estiverem concluídas e `npm run build` + `npm run test` passarem 100%.

---

## 6. Prompt Padrão — Abertura de Sessão Claude Code

Cole no início de cada sessão no Claude Code (VS Code):

```
Estou trabalhando no GestSilo Pro. Os arquivos CLAUDE.md, database-snapshot.md e audit-geral.md estão disponíveis como contexto. Hoje vamos resolver [NOME DA TAREFA]. Antes de qualquer edição: (1) leia o arquivo relevante, (2) me diga exatamente o que vai mudar, (3) aguarde minha confirmação. Após concluir: rode npm run build e npm run test e me mostre o resultado. Não altere .env, next.config.js nem turbo.json sem minha autorização explícita.
```

---

## 7. Checklist Final (após Sprint 3)

- [ ] 227/227 testes passando
- [ ] Rate limiting ativo e testado
- [ ] Headers HTTP validados em produção
- [ ] Backup semanal rodando (GitHub Actions + Cloudflare R2)
- [ ] Sentry instalado e filtrando dados sensíveis
- [ ] RLS testada com múltiplos usuários
- [ ] Tipos Supabase gerados automaticamente (`db:types`)
- [ ] Índices de banco criados
- [ ] `eslint-disable` removidos
- [ ] Queries `.select()` otimizadas
- [ ] Integração insumos → financeiro funcionando
- [ ] Rotas mockadas sinalizadas como "Em breve"
- [ ] `audit-geral.md` atualizado com novo score
- [ ] Próxima auditoria agendada: **27/07/2026**
