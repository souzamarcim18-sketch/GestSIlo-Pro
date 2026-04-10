# SPEC Técnica: Corrigir Fluxo de Autenticação com Loading Infinito

**Data:** 2026-04-10  
**Status:** Pronto para implementação  
**Autor:** Code Review  
**Referência:** PRD-fix-auth.md

---

## 1. Arquivos para Criar/Modificar

### Arquivos a MODIFICAR (Existentes)

| # | Caminho Completo | Prioridade | Tipo | Motivo |
|---|---|---|---|---|
| **1** | `app/login/page.tsx` | 🔴 Crítico | Fix | Falha F1: setLoading(false) não é chamado em sucesso |
| **2** | `providers/AuthProvider.tsx` | 🔴 Crítico | Fix | Falha F2: Sem tratamento de erro em fetchProfile |
| **3** | `app/register/page.tsx` | 🟡 Alto | Fix | Aplicar mesmo padrão: setLoading em sucesso/erro/finally |
| **4** | `middleware.ts` | 🟡 Alto | Review | Falha F4: Possível race condition com AuthProvider |
| **5** | `app/dashboard/layout.tsx` | 🟡 Alto | Review | Sincronização com middleware e AuthProvider |
| **6** | `app/operador/page.tsx` | 🟠 Médio | Review | checkAuth() manual pode ter mesmo bug |
| **7** | `lib/auth/constants.ts` | 🟢 Baixo | Novo | Centralizar timeout/retry config |

### Arquivos a CRIAR (Novos)

| # | Caminho Completo | Tipo | Propósito |
|---|---|---|---|
| **1** | `lib/auth/constants.ts` | Config | Centralizar timeouts, retry intervals, debug flags |
| **2** | `lib/auth/logger.ts` | Utility | Logging condicional (DEBUG env var) |

### Arquivos a VERIFICAR (Supabase Console)

| # | Recurso | Motivo |
|---|---|---|
| **1** | `public.profiles` RLS Policy | Falha F5: Verificar se SELECT permite usuários autenticados |

---

## 2. Descrição das Mudanças por Arquivo

### 2.1 `app/login/page.tsx` — Corrigir handleLogin

**O que mudar:**
1. **Seção handleLogin (linhas 31-56):**
   - Envolver toda lógica em `try-finally`
   - Adicionar `setLoading(false)` no bloco `finally` para garantir que é chamado em TODOS os cenários
   - Remover `setLoading(false)` duplicado no catch (será no finally)
   - Adicionar logging: entrada, antes de signIn, depois (sucesso/erro) — condicional com env DEBUG
   - Tratamento de erro específico: se profile falha, NÃO redirecionar silenciosamente; mostrar erro

2. **Seção useEffect redirect (linhas 21-29):**
   - Adicionar timeout de 5 segundos: Se não houver redirect em 5s, mostrar erro
   - Adicionar estado `profileError` do AuthProvider (novo): Se existir, mostrar mensagem de erro
   - NÃO redirecionar se profile for null E houve timeout (isso indica erro, não loading)
   - Mostrar botão retry ou link "Voltar ao login" se erro ocorrer

3. **Seção de UI (linhas 289-321 - render do botão):**
   - Adicionar estado conditional: Se há `profileError` ou timeout, mostrar erro e desabilitar botão
   - Mensagem: "Erro ao carregar seu perfil. Tente login novamente ou contacte suporte."
   - Adicionar link para reload da página ou retry manual

4. **Novos imports necessários:**
   - `useCallback` do React (se não estiver)
   - Função de logging condicional de `lib/auth/logger.ts`
   - Constantes de timeout de `lib/auth/constants.ts`

---

### 2.2 `providers/AuthProvider.tsx` — Adicionar Error Handling

**O que mudar:**
1. **Context type (definição):**
   - Adicionar propriedade `profileError: string | null` ao objeto retornado de `useAuth()`
   - Documentar: "Erro ao buscar perfil; null se sucesso ou ainda carregando"

2. **Estado interno:**
   - Adicionar `const [profileError, setProfileError] = useState<string | null>(null)`
   - Inicializar como null

3. **Função fetchProfile (linhas 33-43):**
   - Envolver query `.from('profiles').select(...)` em `try-catch`
   - No **catch block:**
     - Logar erro: `console.error('Profile fetch error:', error)`
     - Setar `setProfileError(error.message || 'Erro desconhecido')`
     - Chamar `setLoading(false)` para destravar loading
   - No **sucesso:**
     - Limpar erro anterior: `setProfileError(null)`
     - Setar profile como antes
   - Em ambos os casos: chamar `setLoading(false)`
   
4. **Handler onAuthStateChange (linhas 57-70):**
   - Ao receber evento SIGNED_IN: limpar erro anterior com `setProfileError(null)`
   - Ao receber evento SIGNED_OUT: limpar error e profile
   - Adicionar logging: entrada, usuário autenticado, perfil carregado

5. **Return do useAuth:**
   - Incluir `profileError` na tupla retornada
   - Ordem esperada: `{ loading, user, profile, profileError }`

6. **Novos imports:**
   - Função de logging condicional de `lib/auth/logger.ts`
   - Constantes de timeout de `lib/auth/constants.ts`

---

### 2.3 `app/register/page.tsx` — Aplicar Mesmo Padrão

**O que mudar:**
1. **handleRegister function:**
   - Encontrar onde chama `signUp()` ou criação de usuário
   - Envolver em `try-finally`
   - Adicionar `setLoading(false)` no finally
   - Se sucesso: await criação de profile row, depois redirect para /login
   - Se erro: mostrar erro, setar `setLoading(false)`

2. **Estrutura similar ao handleLogin:**
   - Mesmo padrão de try-finally
   - Logging condicional
   - Toast + estado de erro visível

3. **Redirect após registro:**
   - Após criar usuário com `signUp()`, aguardar criação da row em `profiles`
   - Se tudo OK: `router.push('/login')` com query param `?registered=true` (opcional, para UX)
   - Se falha na criação de profile: Mostrar erro "Erro ao finalizar cadastro"

---

### 2.4 `middleware.ts` — Revisar Sincronização

**O que mudar:**
1. **Análise do fluxo (linhas 40-54):**
   - Middleware roda no servidor E pode redirecionar ANTES do cliente AuthProvider inicializar
   - Problema: Se user está autenticado, middleware redireciona de `/login` → `/dashboard` antes do AuthProvider carregar
   - Dashboard layout também checa `useAuth()` e pode redirecionar de volta

2. **Opção A - Remover redirect de /login no middleware (RECOMENDADO):**
   - Deixar middleware verificar autenticação, mas NÃO redirecionar de `/login` para `/dashboard`
   - Deixar essa responsabilidade APENAS no cliente (useEffect em login)
   - Middleware ainda valida token + RLS, apenas não faz redirect
   - Vantagem: Evita race condition, cliente tem controle total

3. **Opção B - Adicionar sinal de sincronização:**
   - Middleware redireciona, MAS adiciona cookie `x-auth-redirected=true`
   - Cliente lê cookie, sabe que middleware já fez o redirect
   - Evita loop: AuthProvider não redireciona novamente
   - Middleware remove cookie após redirecionar

4. **Implementação sugerida:**
   - Opção A é mais simples e segura
   - Mudar condição: `if (isAuthRoute && user && !isLoginRoute)` (não redireciona de /login)
   - Se usuário está em `/login` e está autenticado: deixar o cliente (useEffect) fazer o redirect
   - Adicionar comentário explicando por que não redireciona

5. **Logging:**
   - Adicionar `console.log` condicional em middleware para debug (com env var)

---

### 2.5 `app/dashboard/layout.tsx` — Sincronizar com Middleware

**O que mudar:**
1. **useEffect de validação (linhas 21-29):**
   - Adicionar timeout similar ao do login
   - Se `loading === true` por > 5 segundos, mostrar erro
   - Não bloquear renderização: mostrar skeleton/spinner durante loading

2. **Redirect logic:**
   - `if (!loading && !user)`: redirect para /login ✅ (mantém)
   - `if (!loading && needsOnboarding)`: redirect para onboarding ✅ (mantém)
   - Se `loading === true`: renderizar layout com conteúdo mínimo (navegação, spinner)
   - Não redirecionar enquanto loading

3. **Evitar flash:**
   - Se está na Dashboard e `authLoading === true`: Mostrar layout com skeleton
   - Não redirecionar para /login enquanto ainda está verificando auth
   - Depois que `authLoading === false`: aplicar lógica de redirect

---

### 2.6 `app/operador/page.tsx` — Revisar checkAuth Manual

**O que mudar:**
1. **Função checkAuth (linhas 48+):**
   - Encontrar: `supabase.auth.getUser()` + query profiles com `.single()`
   - Problema: Pode falhar em silêncio (profile não existe, RLS bloqueia)
   - Adicionar try-catch
   - Se falha: Mostrar erro ao usuário, NOT redirect silenciosamente
   - Se perfil não é "Operador": redirecionar para `/dashboard`

2. **Considerar usar `useAuth()` do AuthProvider:**
   - Em vez de chamar `getUser()` manualmente, usar o contexto
   - Mais simples, evita duplicação de lógica
   - Já vai ter error handling do AuthProvider

3. **Se manter checkAuth():**
   - Adicionar logging de sucesso e erro
   - Mostrar spinner durante verificação
   - Permitir retry manual se falhar

---

### 2.7 `lib/auth/constants.ts` — Novo Arquivo

**O que adicionar:**
1. **Constantes de timeout:**
   - `AUTH_PROFILE_FETCH_TIMEOUT_MS`: 5000 (5 segundos para buscar profile)
   - `AUTH_REDIRECT_DELAY_MS`: 500 (aguardar antes de redirecionar, em ms)
   - `AUTH_RETRY_ATTEMPTS`: 2 (quantas vezes retry em falha)
   - `AUTH_RETRY_DELAY_MS`: 1000 (delay entre tentativas)

2. **Flags de debug:**
   - `DEBUG_AUTH`: boolean, lê de `process.env.DEBUG_AUTH`
   - Usar para condicionalizar `console.log` em auth flow

3. **Mensagens de erro:**
   - `AUTH_PROFILE_ERROR_MESSAGE`: "Erro ao carregar seu perfil. Tente novamente."
   - `AUTH_GENERIC_ERROR_MESSAGE`: "Erro de autenticação. Tente novamente."
   - `AUTH_NETWORK_ERROR_MESSAGE`: "Erro de conexão. Verifique sua internet."

4. **Configurações de RLS:**
   - `PROFILES_TABLE_NAME`: 'profiles'
   - Documentar regra esperada de RLS

---

### 2.8 `lib/auth/logger.ts` — Novo Arquivo

**O que adicionar:**
1. **Função authLog():**
   - Checa `process.env.DEBUG_AUTH === 'true'` ou `process.env.NODE_ENV === 'development'`
   - Se verdadeiro: `console.log('[AUTH]', ...args)`
   - Se falso: no-op (function vazia)
   - Evita poluição de console em produção

2. **Função authError():**
   - Similar, mas sempre loga em STDERR em produção
   - Opção de enviar a um serviço de logging externo (Sentry, etc)

3. **Tipo export:**
   - Interfaces para logs estruturados (opcional, para futuro)

---

### 2.9 `public.profiles` RLS (Supabase Console) — Verificar

**O que validar:**
1. **Tabela `profiles`:**
   - Deve ter coluna `id` (uuid, primary key, refs auth.users.id)
   - Deve ter coluna `perfil` (text: 'Operador', 'Admin', etc)
   - Outras colunas: created_at, updated_at, etc

2. **RLS Enable:**
   - `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;` — verificar se está ativo
   - Se não estiver, AuthProvider pode ter acesso irrestrito (bug de segurança)

3. **Política SELECT:**
   - Deve permitir usuário autenticado ler seu próprio perfil
   - Regra sugerida: `auth.uid() = id` (cada um lê apenas o seu)
   - Ou mais permissiva: `auth.uid() IS NOT NULL` (qualquer autenticado lê todos)
   - Verificar qual é a política atual; se não existe, adicionar

4. **Política INSERT:**
   - Deve permitir novo usuário inserir seu próprio perfil
   - Regra: `auth.uid() = id`
   - Verificar se trigger automático cria row ou se é manual em signup

---

## 3. Ordem de Implementação

### Fase 1: Configuração Base (Antes de modificar lógica)

**Objetivo:** Preparar estrutura de suporte

1. ✅ Criar `lib/auth/constants.ts`
   - Define timeouts, flags, mensagens
   - Sem dependências externas

2. ✅ Criar `lib/auth/logger.ts`
   - Importa constantes
   - Pronto para usar em todos os arquivos

3. ✅ Verificar RLS em `public.profiles` (Supabase Console)
   - Se não estiver habilitado: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
   - Se não houver política SELECT: adicionar `auth.uid() = id`
   - Documentar policy no comentário da migration

**Tempo estimado:** 15-20 minutos

---

### Fase 2: Corrigir AuthProvider (Core)

**Objetivo:** Centralizar error handling, evitar estado quebrado

4. ✅ Modificar `providers/AuthProvider.tsx`
   - Adicionar estado `profileError`
   - Envolver `fetchProfile` em try-catch
   - Adicionar logging condicional
   - Retornar `profileError` no contexto

**Dependências:** Fase 1 (constantes, logger)
**Bloqueadores para próximo:** Nenhum (este é o core)
**Tempo estimado:** 20-30 minutos

---

### Fase 3: Corrigir Pages de Auth (UI)

**Objetivo:** Usar error handling do AuthProvider, garantir loading cleanup

5. ✅ Modificar `app/login/page.tsx`
   - Envolver handleLogin em try-finally
   - Adicionar timeout de 5s para redirect
   - Mostrar erro se profile falhou ou timeout
   - Adicionar logging

6. ✅ Modificar `app/register/page.tsx`
   - Aplicar mesmo padrão: try-finally
   - Ao sucesso: aguardar criação de profile row
   - Redirecionar para /login

**Dependências:** Fase 2 (AuthProvider com profileError)
**Bloqueadores para próximo:** Nenhum
**Tempo estimado:** 30-40 minutos

---

### Fase 4: Sincronizar Layouts + Middleware

**Objetivo:** Evitar race conditions entre servidor e cliente

7. ✅ Modificar `middleware.ts`
   - Remover redirect de /login para /dashboard (Opção A)
   - Deixar cliente fazer o redirect
   - Adicionar comentário explicando sincronização
   - Logging condicional

8. ✅ Modificar `app/dashboard/layout.tsx`
   - Adicionar timeout se loading > 5s
   - Mostrar skeleton durante loading
   - Não redirecionar enquanto loading

9. ✅ Modificar `app/operador/page.tsx` (se necessário)
   - Considerar usar `useAuth()` em vez de `getUser()` manual
   - Se manter checkAuth: adicionar try-catch
   - Mostrar erro ao usuário, não deixar preso

**Dependências:** Fase 3 (pages funcionando)
**Bloqueadores para próximo:** Nenhum
**Tempo estimado:** 25-35 minutos

---

### Fase 5: Teste & Validação

**Objetivo:** Garantir todos os cenários funcionam

10. ✅ Testes manuais (ver seção 4 do PRD)
   - Login sucesso, login erro, registro, profile error, offline
   - Middleware + client sync
   - Chrome, Firefox, Safari (se possível)

11. ✅ Validação de código
   - `npm run build` sem errors/warnings
   - `npm run lint` sem errors
   - Nenhum `console.log` permanente (exceto condicional com DEBUG_AUTH)
   - TypeScript: sem `any` implícitos

**Tempo estimado:** 30-45 minutos

---

**Total Estimado:** 2-3 horas

---

## 4. Dependências Entre Arquivos

```
┌─────────────────────────────────────────────────────────────┐
│ lib/auth/constants.ts + lib/auth/logger.ts                  │
│ (Base - sem dependências)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ providers/AuthProvider.tsx                                  │
│ (Centraliza loading + error states)                         │
│ Depende: constants, logger, Supabase client                 │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴──────────┐
        ↓                       ↓
┌───────────────────┐   ┌───────────────────┐
│ app/login/page    │   │ app/register/page │
│ (Login flow)      │   │ (Register flow)   │
│ Depende:          │   │ Depende:          │
│ - AuthProvider    │   │ - AuthProvider    │
│ - constants       │   │ - constants       │
│ - logger          │   │ - logger          │
└────────┬──────────┘   └───────┬───────────┘
         │                      │
         │                      │
         └──────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │ middleware.ts         │
        │ (Server validation)   │
        │ NÃO redireciona       │
        │ de /login (novo)      │
        └───────┬───────────────┘
                │
        ┌───────┴──────────┐
        ↓                  ↓
┌──────────────────┐ ┌──────────────────┐
│ dashboard/       │ │ operador/        │
│ layout.tsx       │ │ page.tsx         │
│ (Layout proteg)  │ │ (Page especial)  │
│ Depende:         │ │ Depende:         │
│ - AuthProvider   │ │ - AuthProvider   │
│ - middleware     │ │ - middleware     │
└──────────────────┘ └──────────────────┘
```

**Fluxo de implementação:**
1. Base (constants + logger)
2. AuthProvider (centraliza error handling)
3. Pages (login + register usam novo AuthProvider)
4. Middleware (conhece novo comportamento)
5. Layouts (sincronizam com middleware)

---

## 5. Riscos e Edge Cases

### 5.1 Race Conditions

| Risco | Descrição | Prevenção |
|-------|-----------|-----------|
| **R1** | Middleware redireciona /login → /dashboard ANTES AuthProvider inicializar | RemoveSua redirect de /login no middleware (Opção A); deixar client fazer |
| **R2** | User clica "Entrar", mas internet cai no meio de fetchProfile | AuthProvider timeout 5s + mostrar erro; usuário pode retry manual |
| **R3** | handleLogin chama `signInWithPassword`, mas component unmount antes de resposta | useCallback deps; cleanup em useEffect se mudar; finally garante cleanup |
| **R4** | Dois cliques rápidos em "Entrar" = duas requisições simultâneas | `loading` state previne: botão disabled durante login; segundo clique ignorado |

### 5.2 RLS Vulnerabilities

| Risco | Descrição | Prevenção |
|-------|-----------|-----------|
| **R5** | Profile query retorna erro RLS silenciosamente, profileError não é setado | Adicionar try-catch em AuthProvider.fetchProfile; logar erro |
| **R6** | Usuário não-autenticado consegue ler perfis de outros (RLS desabilitado) | Verificar `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY` em Supabase |
| **R7** | Política SELECT em profiles permite `auth.uid() IS NOT NULL` (muito permissiva) | Revisar policy; usar `auth.uid() = id` (restritivo) |

### 5.3 Loading State Management

| Risco | Descrição | Prevenção |
|-------|-----------|-----------|
| **R8** | setLoading(false) não é chamado em sucesso, botão fica loading | try-finally em handleLogin; finally sempre executa |
| **R9** | setLoading(false) é chamado múltiplas vezes (catch + finally) | Use finally APENAS; remover setLoading do catch block |
| **R10** | Loading local (botão) confundido com loading global (AuthProvider) | Usar `loading` local em handleLogin; `authLoading` do context |
| **R11** | Timeout dispara, mas depois profile chega; ambos fazem redirect | Usar flag: `if (timeoutOccurred) return` no useEffect; só redireciona uma vez |

### 5.4 Error Handling

| Risco | Descrição | Prevenção |
|-------|-----------|-----------|
| **R12** | networkError, RLS error, unknown error = sem diferença para user | Adicionar `profileError` no contexto; mostrar mensagem específica |
| **R13** | User preso em /login porque profileError não é mostrado | Render `profileError` no JSX se existir; mostrar botão retry |
| **R14** | Sensitive data (senha, token) logado em console ou Sentry | Logar APENAS: entrada, saída, tipo de erro; NUNCA tokens/senhas |

### 5.5 Timing & Flashing

| Risco | Descrição | Prevenção |
|-------|-----------|-----------|
| **R15** | Dashboard carrega enquanto `authLoading === true`, depois faz redirect | Não redirecionar enquanto loading; mostrar skeleton |
| **R16** | Usuário vê spinner por > 3 segundos durante login | Profile fetch deve ser rápido; se > 5s, mostrar erro e retry |
| **R17** | Multiple redirects visíveis: /login → /dashboard → /login (loop) | Middleware não redireciona /login; client faz apenas um; middleware validação server-side |

### 5.6 Edge Cases Funcionais

| Caso | Esperado | Implementação |
|------|----------|---|
| **E1** | User sem profile row (novo user, mas register não criou profile) | AuthProvider vê profile = null; client mostra erro; permite retry |
| **E2** | User autenticado mas profile query timeout | Esperar 5s, depois mostrar erro; NÃO redirecionar silenciosamente |
| **E3** | User no /login com sessão válida | Middleware não redireciona; useEffect redireciona rapidamente |
| **E4** | User logout no middle da página | AuthProvider dispara SIGNED_OUT; redirect para /login |
| **E5** | Refresh durante login em progresso | Page recarrega; AuthProvider reinicia; middleware valida; login recomça |
| **E6** | Register bem-sucedido, mas profile insert falha | Mostrar erro: "Perfil não criado"; usuário na tela de registro ainda |
| **E7** | Operador que foi downgrade para user | queryByPerfil em dashboard rejeita; ou manda para /dashboard em vez de /operador |

### 5.7 Validações Críticas (Checklist de Implementação)

- [ ] handleLogin: `try { ... } finally { setLoading(false) }`
- [ ] AuthProvider.fetchProfile: `try-catch` + `setLoading(false)` em ambos ramos
- [ ] AuthProvider: novo estado `profileError` exposto no contexto
- [ ] useEffect no login: aguarda (!authLoading && (user && profile || profileError || timeout))
- [ ] Middleware: NÃO redireciona de /login para /dashboard
- [ ] Dashboard: não redireciona para /login enquanto authLoading === true
- [ ] Supabase RLS: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY` + política SELECT com `auth.uid() = id`
- [ ] Sem console.log permanente (exceto condicional DEBUG_AUTH)
- [ ] Todos os `.signInWithPassword()`, `.signUp()` têm error handling
- [ ] Timeout de 5s em profile fetch; mostra erro e permite retry

---

## 6. Checklist de Validação Pós-Implementação

### Funcionalidade
- [ ] Login com credenciais corretas: redireciona em < 2s
- [ ] Login com credenciais incorretas: mostra erro, botão para retry
- [ ] Register novo user: cria user + profile, redireciona para /login
- [ ] Profile falha (RLS/timeout): mostra erro, permite retry (NÃO prende usuário)
- [ ] User autenticado em /login: redireciona para /dashboard ou /operador (sem flashing)
- [ ] User não-autenticado em /dashboard: redireciona para /login
- [ ] Offline durante login: timeout + erro + retry manual

### Código
- [ ] `npm run build` sucesso, sem warnings
- [ ] `npm run lint` sucesso
- [ ] Nenhum `any` implícito
- [ ] Nenhum `console.log` permanente
- [ ] setLoading(false) em TODOS os paths (try-catch-finally)
- [ ] Sem memory leaks: event listeners unsubscribed (AuthProvider cleanup)
- [ ] TypeScript strict mode: sem type errors

### Segurança
- [ ] RLS habilitado em `profiles`
- [ ] User não consegue ler profile de outros (se policy é `auth.uid() = id`)
- [ ] Senhas/tokens NUNCA logados
- [ ] Middleware valida no server; cliente não confia em JWT sem validação

### Performance
- [ ] Login até redirect: < 3 segundos
- [ ] Sem múltiplos redirects (Network tab: apenas um 307/308)
- [ ] Sem extra re-renders (React DevTools Profiler)

---

## 7. Referências Cruzadas

- **PRD Original:** `docs/PRD-fix-auth.md`
- **Falhas Identificadas:** F1-F6 no PRD
- **Requisitos Funcionais:** RF1-RF4 no PRD
- **Requisitos Técnicos:** RT1-RT6 no PRD
- **Testes de Aceite:** 5.1-5.4 no PRD

