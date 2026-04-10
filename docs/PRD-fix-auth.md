# PRD: Corrigir Fluxo de Autenticação com Loading Infinito

**Status:** 🔴 Crítico  
**Versão:** 1.0  
**Data:** 2026-04-10  
**Autor:** Code Review  

---

## 1. Problema

Ao clicar em "Entrar" ou "Solicitar acesso" na página de login, o botão fica em estado de carregamento infinitamente e nunca redireciona para o dashboard ou operador.

### Evidências do Código

#### 1.1 `app/login/page.tsx:31-56` — handleLogin sem setLoading(false) em sucesso

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-mail ou senha inválidos. Verifique suas credenciais.');
      toast.error('E-mail ou senha inválidos.');
      setLoading(false);  // ✅ Error path — loading é resetado
      return;
    }

    toast.success('Login realizado com sucesso!');
    // ❌ PROBLEMA: Não há setLoading(false) aqui!
    // O botão continua com spinner do loading infinitamente

  } catch (err: unknown) {
    console.error('Login error:', err);
    setError('Ocorreu um erro inesperado. Tente novamente.');
    toast.error('Erro ao realizar login.');
    setLoading(false);  // ✅ Catch path — loading é resetado
  }
};
```

**Cenário:** Quando `signInWithPassword` retorna sucesso (sem erro), o fluxo passa pela linha 46 (toast.success) mas NÃO volta a chamar `setLoading(false)`. O componente continua renderizando o botão com `loading={true}` (veja linha 289-321, onde a cor e texto mudam baseado em `loading`).

---

#### 1.2 Fluxo Esperado vs. Real

**Fluxo Esperado:**
```
1. Usuário clica "Entrar"
   ↓ setLoading(true)
2. signInWithPassword é enviado ao Supabase
   ↓ Autenticação bem-sucedida
3. setLoading(false)
   ↓ AuthProvider escuta onAuthStateChange
4. AuthProvider busca profile e seta profile/loading
   ↓ useEffect detecta user && profile
5. Router.push redireciona para /dashboard ou /operador
```

**Fluxo Real (com bug):**
```
1. Usuário clica "Entrar"
   ↓ setLoading(true)
2. signInWithPassword é enviado ao Supabase
   ↓ Autenticação bem-sucedida, SEM erro
3. ❌ setLoading(false) NÃO é chamado
   ↓ Botão continua com loading spinner
4. AuthProvider escuta onAuthStateChange (independente)
   ↓ Busca profile na tabela profiles
5. useEffect em login aguarda (!authLoading && user && profile)
   ↓ Se profile carregar: redireciona ✅
   ↓ Se profile não carregar/falhar: fica preso (veja 1.3) ❌
```

---

#### 1.3 AuthProvider — Falta de Tratamento de Erro

**Arquivo:** `providers/AuthProvider.tsx:33-43`

```typescript
const fetchProfile = useCallback(async (currentUser: User) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();  // ⚠️ Pode falhar se a linha não existe ou RLS bloqueia

  setUser(currentUser);
  setProfile(data ?? null);  // ❌ Se data for null, profile vira null
  setLoading(false);         // ✅ Loading é resetado mesmo com erro
}, []);
```

**Problema:**
- Se a query `supabase.from('profiles').select(...)` falhar (erro RLS, linha não existe, timeout), `data` será `null`
- `setProfile(data ?? null)` vai setar `profile = null`
- `setLoading(false)` é chamado, mas como `profile === null`, o redirect no login NÃO acontece
- **Resultado:** Usuário autenticado mas preso na página de login

---

#### 1.4 useEffect no Login — Condição de Redirect Incompleta

**Arquivo:** `app/login/page.tsx:21-29`

```typescript
useEffect(() => {
  if (!authLoading && user && profile) {  // ⚠️ Requer TODOS os três
    if (profile.perfil === 'Operador') {
      router.push('/operador');
    } else {
      router.push('/dashboard');
    }
  }
}, [authLoading, user, profile, router]);
```

**Problema:** Se `setLoading(false)` no handleLogin não for chamado:
- `authLoading` continua sendo `true` no AuthProvider
- Até que setTimeout ou evento do AuthProvider mude o estado
- **Timing issue:** Pode haver race condition onde o redirect depende de múltiplos pontos de sincronização

---

#### 1.5 middleware.ts — Possível Race Condition

**Arquivo:** `middleware.ts:40-54`

```typescript
if (isAuthRoute && user) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/dashboard';
  return NextResponse.redirect(redirectUrl);  // Redireciona pra dashboard se autenticado
}
```

**Problema Potencial:**
- O middleware roda no servidor ANTES do cliente carregar completamente
- Se usuário está autenticado, middleware pode redirecionar para `/dashboard` ANTES do AuthProvider no cliente ter carregado
- O dashboard layout também checa `useAuth()` e pode redirecionar de volta para `/login` se `loading === true`
- **Resultado:** Loop de redirecionamentos ou tela em branco

---

## 2. Fluxo Atual de Autenticação (Passo a Passo)

### 2.1 Inicialização (App Load)

```
1. Root Layout (app/layout.tsx) renderiza
   ↓
2. AuthProvider é montado (providers/AuthProvider.tsx)
   ↓
3. useEffect do AuthProvider (linha 54) roda:
   a. Chama supabase.auth.onAuthStateChange()
   b. Escuta eventos 'INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT'
   c. Estado inicial: setLoading(true), user/profile = null
```

### 2.2 User Visits /login

```
1. Middleware (middleware.ts) roda:
   a. Chama supabase.auth.getUser() no servidor
   b. Se user === null, permite acesso a /login
   c. Se user !== null, redireciona para /dashboard
   
2. Client hidrata LoginPage
   a. useAuth() do AuthProvider = { loading: true, user: null, profile: null }
   b. useEffect (linha 21) não faz nada (authLoading === true)
   c. UI renderiza: e-mail, senha, botão "Entrar"
```

### 2.3 User Submits Login Form

```
1. handleLogin (linha 31) executado:
   a. setLoading(true) — botão fica com spinner
   b. supabase.auth.signInWithPassword({ email, password })
   c. Resposta do Supabase:
      ✅ Sucesso: error === null
         → Linha 46: toast.success()
         → ❌ BUG: Não há setLoading(false)
         → Função retorna sem resetar loading
      
      ❌ Erro: error !== null
         → Linha 41: setError() e toast.error()
         → Linha 42: setLoading(false) ✅
         → return

2. Paralelamente, AuthProvider.onAuthStateChange dispara (se sucesso):
   a. Supabase dispara evento SIGNED_IN
   b. onAuthStateChange callback (linha 57) executado
   c. Chama fetchProfile(currentUser) (linha 67)
   d. fetchProfile faz query: .from('profiles').select('*').eq('id', ...)
   e. Se sucesso: setProfile(data), setLoading(false)
   f. Se falha: setProfile(null), setLoading(false)

3. useEffect no login (linha 21) verifica:
   if (!authLoading && user && profile) → redireciona
   
   ⚠️ Problema: se handleLogin não setLoading(false), e AuthProvider.loading fica dependente de fetchProfile:
      - Se fetchProfile falha → profile === null → redirect não acontece
      - Usuário fica preso na página
```

### 2.4 Dashboard ou Operador Layout

```
1. Se redirect foi bem-sucedido:
   a. DashboardLayout (app/dashboard/layout.tsx) renderiza
   b. useAuth() = { loading: true/false, user: {...}, profile: {...} }
   c. useEffect (linha 21) verifica:
      - Se !loading && !user → redireciona para /login ❌
      - Se !loading && needsOnboarding → redireciona para /dashboard/onboarding
      - Caso contrário: renderiza layout

2. OperadorPage (app/operador/page.tsx):
   a. checkAuth() (linha 48) manual:
      - supabase.auth.getUser()
      - query profiles com .single()
      - Se falha → router.push('/login')
```

---

## 3. Pontos de Falha Identificados

| # | Descrição | Arquivo | Linhas | Severidade | Impacto |
|---|-----------|---------|--------|------------|---------|
| **F1** | `setLoading(false)` não é chamado em sucesso do login | `app/login/page.tsx` | 31-56 | 🔴 Crítico | Botão fica loading infinitamente |
| **F2** | AuthProvider não trata erro de `fetchProfile` | `providers/AuthProvider.tsx` | 33-43 | 🔴 Crítico | Se profile query falha, user fica preso no login |
| **F3** | Condição de redirect requer profile não-nulo | `app/login/page.tsx` | 21-29 | 🟡 Alto | Se profile falha, sem redirect e sem erro visível |
| **F4** | Middleware pode redirecionar antes do AuthProvider carregar | `middleware.ts` + `app/dashboard/layout.tsx` | Vários | 🟡 Alto | Possível flashing/loading state confuso |
| **F5** | RLS na tabela profiles pode bloquear query silenciosamente | Supabase | N/A | 🟡 Alto | Sem tratamento de erro, usuário preso |
| **F6** | Falta logging/debug no fluxo de autenticação | Vários | N/A | 🟠 Médio | Difícil diagnosticar problemas em produção |

---

## 4. Requisitos da Correção

### 4.1 Requisito Funcional: Fluxo de Login

**RF1: Login com Sucesso**
- [ ] Usuário preenche e-mail e senha e clica "Entrar"
- [ ] Botão mostra spinner de carregamento
- [ ] `signInWithPassword` é enviado ao Supabase
- [ ] Se autenticação bem-sucedida:
  - [ ] Botão para de carregar (loading state finaliza)
  - [ ] AuthProvider escuta `onAuthStateChange` e carrega profile
  - [ ] Se profile carrega: Redireciona para `/dashboard` ou `/operador` dentro de 1-2s
  - [ ] Se profile falha: **Mostra erro ao usuário** (não fica preso)
- [ ] Se autenticação falha:
  - [ ] Erro visível na tela
  - [ ] Botão para de carregar
  - [ ] User pode tentar novamente

**RF2: Registro com Sucesso**
- [ ] Usuário preenche nome, e-mail, senha e perfil
- [ ] Clica "Cadastrar"
- [ ] `signUp` é enviado ao Supabase
- [ ] `profiles` row é inserida
- [ ] Se sucesso: Botão para de carregar, toast "Cadastro realizado!"
- [ ] Redireciona para `/login` após 1-2s
- [ ] Se falha: Erro visível, botão para de carregar

**RF3: Middleware + AuthProvider Sincronização**
- [ ] User autenticado não é redirecido de `/login` para `/dashboard` múltiplas vezes
- [ ] User não autenticado em `/dashboard` é redirecido para `/login` uma única vez
- [ ] Não há "flashing" ou tela em branco durante transição

**RF4: Tratamento de Erro**
- [ ] Se `profiles` query falha: Mostrar erro ao user, não deixar preso
- [ ] Se RLS bloqueia: Erro mensagem clara: "Erro ao carregar perfil. Contacte suporte."
- [ ] Se network error: Retry automático ou opção manual

---

### 4.2 Requisito Técnico: Código

**RT1: handleLogin em app/login/page.tsx**
- [ ] Chamar `setLoading(false)` em TODOS os caminhos (sucesso, erro, finally)
- [ ] Usar try-finally para garantir cleanup
- [ ] Nenhuma chamada a `setLoading(false)` depois de `signInWithPassword` bem-sucedido pode ser omitida

**RT2: fetchProfile em AuthProvider.tsx**
- [ ] Adicionar try-catch em torno da query
- [ ] Se falha, logar erro: `console.error('Profile fetch failed:', error)`
- [ ] Chamar `setLoading(false)` mesmo em erro
- [ ] Não retornar early sem resetar loading

**RT3: useEffect no login**
- [ ] Considerar redirecionar mesmo se profile for null (se user está autenticado)
- [ ] OU adicionar timeout: Se profile não carregar em 5s, mostrar erro
- [ ] OU adicionar estado: `fetchProfileError` para mostrar mensagem

**RT4: Middleware**
- [ ] Considerar remover redirect de `/login` para `/dashboard` do middleware (deixar no cliente)
- [ ] OU adicionar pequeno delay antes de redirecionar
- [ ] OU sincronizar com cliente de forma mais explícita (ex: sinalizar via cookie)

**RT5: Logging**
- [ ] Adicionar console.log em:
  - handleLogin: entrada, antes de signInWithPassword, depois (sucesso/erro)
  - AuthProvider.fetchProfile: entrada, saída, erro
  - useEffect no login: quando dispara, valores de authLoading/user/profile
- [ ] Remover ou conditionalizar console.log em produção (usar env vars)

**RT6: RLS do Supabase**
- [ ] Verificar tabela `profiles` permite SELECT para usuários autenticados
- [ ] Regra: `auth.uid() = id` (cada usuário lê apenas seu próprio profile)
- [ ] Ou `auth.uid() IS NOT NULL` (qualquer usuário autenticado pode ler todos) — revisar segurança

---

## 5. Critérios de Aceite (Definition of Done)

A correção será considerada **completa e validada** quando:

### 5.1 Testes Manuais

- [ ] **Teste A: Login bem-sucedido com profile existente**
  - Ação: Preenche e-mail/senha corretos, clica "Entrar"
  - Esperado: Botão fica loading por ~1-2s, depois desaparece, redireciona para `/dashboard` ou `/operador`
  - Resultado: ✅ PASS

- [ ] **Teste B: Login com e-mail/senha incorretos**
  - Ação: Preenche credenciais inválidas, clica "Entrar"
  - Esperado: Botão para de carregar, erro "E-mail ou senha inválidos" aparece, pode tentar novamente
  - Resultado: ✅ PASS

- [ ] **Teste C: Registro bem-sucedido**
  - Ação: Preenche nome/email/senha/perfil, clica "Cadastrar"
  - Esperado: Toast "Cadastro realizado!", redireciona para `/login` em ~1-2s
  - Resultado: ✅ PASS

- [ ] **Teste D: Profile query falha (simulate RLS error)**
  - Ação: Login bem-sucedido, mas profile query retorna erro
  - Esperado: Usuário NÃO fica preso; Mostra mensagem de erro "Erro ao carregar perfil" ou redireciona com mensagem
  - Resultado: ✅ PASS

- [ ] **Teste E: Network offline durante login**
  - Ação: Desativa internet, tenta login
  - Esperado: Erro visível (pode tentar novamente ao reconectar)
  - Resultado: ✅ PASS

- [ ] **Teste F: Middleware + Client sync**
  - Ação: User autenticado acessa `/login` diretamente
  - Esperado: Redireciona uma única vez para `/dashboard`, sem flashing
  - Resultado: ✅ PASS

### 5.2 Testes de Código

- [ ] Todos os `setLoading(false)` estão em todas as branches (sucesso, erro, catch, finally)
- [ ] Nenhum `console.log` restante em código de produção (ou condicionalizado com `process.env`)
- [ ] TypeScript sem erros: `npm run build` passar sem warnings
- [ ] Lint sem erros: `npm run lint` passar

### 5.3 Performance & Edge Cases

- [ ] Tempo do login até redirect: < 3s (incluindo profile fetch)
- [ ] Sem múltiplos redirects (monitorar Network tab)
- [ ] Sem memory leaks de event listeners (AuthProvider unsubscribe)
- [ ] Funciona em Firefox, Chrome, Safari (sem erros de console)

### 5.4 Segurança

- [ ] RLS na tabela `profiles` validada e funcionando
- [ ] Usuário não-autenticado não consegue acessar `/dashboard` nem `/operador`
- [ ] Usuário autenticado consegue fazer login e redirecionar corretamente
- [ ] Sensitive data não é logado (senhas, tokens)

---

## 6. Notas & Contexto

### 6.1 Stack Relevante

- **Frontend:** Next.js 14+ (App Router)
- **Auth:** Supabase Auth + JWT no cliente
- **Database:** Supabase PostgreSQL + RLS
- **Renderização:** SSR (middleware) + CSR (componentes `'use client'`)

### 6.2 Arquivos Afetados (Priority Order)

1. **app/login/page.tsx** — Corrigir handleLogin (Crítico)
2. **providers/AuthProvider.tsx** — Adicionar error handling em fetchProfile (Crítico)
3. **middleware.ts** — Revisar sincronização (Importante)
4. **app/dashboard/layout.tsx** — Revisar redirect logic (Importante)
5. **app/register/page.tsx** — Aplicar mesmo padrão do login (Importante)
6. **app/operador/page.tsx** — Revisar checkAuth (Opcional, mas recomendado)

### 6.3 Próximos Passos Após Correção

1. Adicionar testes E2E com Playwright para login flow
2. Implementar retry automático para profile fetch com exponential backoff
3. Melhorar UX com skeleton screens durante loading
4. Documentar fluxo de auth em CONTRIBUTING.md

---

## Apêndice: Diagrama Sequencial

```
┌─────────────┐                  ┌──────────────────┐         ┌─────────────┐
│  LoginPage  │                  │  AuthProvider    │         │  Supabase   │
└──────┬──────┘                  └────────┬─────────┘         └──────┬──────┘
       │                                  │                         │
       │ [1] handleLogin()                │                         │
       │                                  │                         │
       │ setLoading(true)                 │                         │
       │                                  │                         │
       │ [2] signInWithPassword()         │                         │
       ├──────────────────────────────────┼────────────────────────>│
       │                                  │                         │
       │                                  │                         │
       │  [3] onAuthStateChange fires    │                         │
       │                                  │ (SIGNED_IN event)       │
       │                                  │<────────────────────────┤
       │                                  │                         │
       │                                  │ [4] fetchProfile()      │
       │                                  │                         │
       │                                  ├────────────────────────>│
       │                                  │ SELECT * FROM profiles  │
       │                                  │                         │
       │  ❌ BUG: setLoading(false)      │                         │
       │     NÃO é chamado aqui!         │                         │
       │                                  │ [5] profiles data       │
       │                                  │<────────────────────────┤
       │                                  │                         │
       │                                  │ setProfile(data)        │
       │                                  │ setLoading(false)       │
       │                                  │                         │
       │ [6] useEffect detecta:          │                         │
       │     user && profile (WAIT!)     │                         │
       │     router.push('/dashboard')   │                         │
       │                                  │                         │
       └──────────────────────────────────┴─────────────────────────┘
```

**Com a correção:**
```
[2] signInWithPassword() → Success
[3] setLoading(false) ✅ ← BUG FIXADO
[4] useEffect dispara imediatamente se authLoading mudou
[5] router.push() acontece rapidamente
```

---

## Resumo Executivo

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Problema Raiz** | 🔴 Crítico | `setLoading(false)` falta em handleLogin sucesso |
| **Impacto** | 🔴 Crítico | Usuário fica preso em /login com botão loading infinito |
| **Escopo da Correção** | 🟠 Médio | 3-4 arquivos, 2-3 horas de trabalho |
| **Risco** | 🟢 Baixo | Alterações simples, bem delimitadas, cobertas por testes manuais |
| **Prioridade** | 🔴 Crítico | Afeta fluxo principal de autenticação |

---

**Próximo Passo:** Proceder com implementação das correções conforme especificado na Seção 4.

