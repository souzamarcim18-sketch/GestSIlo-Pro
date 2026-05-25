# PRD — Redesign: Landing Page & Páginas de Auth
**GestSilo Pro · Design Alignment Document**
**Data:** 2026-05-18 · **Status:** Pronto para implementação

---

## 1. Contexto & Objetivo

Este PRD documenta os problemas de design encontrados na landing page e em **todas as páginas públicas e de autenticação** em comparação com o design interno do sistema (dashboard + sidebar), e especifica as correções necessárias para alinhar essas telas ao Design System estabelecido em `DESIGN-SYSTEM.md`, `colors_and_type.css` e `app/globals.css`.

**Escopo completo de páginas analisadas:**

| Rota | Arquivo | Tipo |
|---|---|---|
| `/` | `app/page.tsx` | Landing page |
| `/login` | `app/login/page.tsx` | Auth — form |
| `/register` | `app/register/page.tsx` | Auth — form |
| `/forgot-password` | `app/forgot-password/page.tsx` | Auth — form |
| `/reset-password` | `app/reset-password/page.tsx` | Auth — form |
| `/auth/set-password` | `app/auth/set-password/page.tsx` | Auth — form |
| `/auth/callback` | `app/auth/callback/page.tsx` | Auth — transição |
| `/privacidade` | `app/privacidade/page.tsx` | Institucional |
| `/termos` | `app/termos/page.tsx` | Institucional |
| `/suporte` | `app/suporte/page.tsx` | Institucional — form |

**Objetivo principal:** As páginas públicas devem parecer parte do mesmo produto que o dashboard — mesmo vocabulário visual, mesmos tokens, mesma profundidade estética.

---

## 2. Estado Atual — Diagnóstico

### 2.1 O Problema Central: `bg-metal` vs. fundo dark do sistema

A classe `.bg-metal` no `globals.css` é definida como:

```css
--bg-metal: linear-gradient(135deg, #b8b8b8 0%, #e8e8e8 25%, #f5f5f5 50%, #d0d0d0 75%, #a8a8a8 100%);
```

Isso é um **gradiente metálico CINZA CLARO** — completamente oposto ao tema dark premium do dashboard.

O background da **Sidebar** é `#0a140d` (verde escuro profundo). O background do **dashboard** é `#161616` (charcoal dark).

Todas as páginas de auth e a landing usam `bg-metal` como background global. As páginas institucionais (`/privacidade`, `/termos`, `/suporte`) usam `bg-gray-50 dark:bg-background` — ou seja, só ficam dark se o sistema operacional estiver em dark mode, sem qualquer garantia de consistência.

### 2.2 Tabela de Diagnóstico — Todos os Arquivos

| Elemento | Estado Atual | Estado Correto | Arquivos afetados |
|---|---|---|---|
| Background global | `bg-metal` → gradiente cinza claro | `bg-background` (`#161616`) | login, register, forgot-password, reset-password, auth/set-password, auth/callback, page.tsx |
| Background institucional | `bg-gray-50 dark:bg-background` | `bg-background` sempre | privacidade, termos, suporte |
| Cards de formulário | `bg-card/90 backdrop-blur` sobre cinza | `bg-surface border-border2 rounded-[13px]` sobre dark | login, register, forgot-password, reset-password, auth/set-password |
| Spinner loading state | `bg-metal` com spinner isolado | `bg-background` | auth/set-password, auth/callback, reset-password |
| Títulos h1 nos cards | `text-brand-deep` (`#023c1f`) — verde escuro ilegível no dark | `text-foreground` (`#dceede`) | login, register, forgot-password, reset-password, auth/set-password |
| Texto estado de validação | `text-brand-deep` sobre fundo claro | `text-foreground` | reset-password (loading state) |
| Labels de formulário | `text-sm font-semibold text-foreground` sem uppercase | `text-xs font-bold uppercase tracking-widest text-muted-foreground` | login, register, forgot-password, reset-password, auth/set-password, suporte |
| Labels (institucional/suporte) | `text-gray-700 dark:text-foreground` | `text-muted-foreground` | suporte |
| Inputs (suporte) | `bg-white dark:bg-muted/30 border-gray-200` + focus via `onFocus` JS | `bg-input border-border focus:ring-2 focus:ring-ring` | suporte |
| Inputs (institucional) | dual-mode gray/dark | `bg-input border-border` | suporte |
| Cards (institucional) | `bg-white dark:bg-card border-gray-100` | `bg-surface border-border2 rounded-[13px]` | privacidade, termos, suporte |
| Corpo de texto (institucional) | `prose dark:prose-invert` sobre fundo claro | `prose` com tokens do design system | privacidade, termos |
| Link "Voltar ao login" | `text-gray-500 dark:text-muted-foreground hover:text-gray-700` | `text-muted-foreground hover:text-foreground` | privacidade, termos, suporte |
| Footer landing | `bg-metal` | `background: var(--sidebar)` | page.tsx |
| Navbar landing | `bg-metal` | `rgba(28,28,28,0.92) backdrop-blur` | page.tsx |
| Seções landing | Todas `bg-metal` sem diferenciação | Alternância `bg-background` / `bg-bg2` | page.tsx |
| Títulos h2 landing | `text-brand-deep` | `text-foreground` | page.tsx |
| Cards de funcionalidades | `bg-brand-deep` + bordas `border-2` coloridas variadas | `bg-surface border-border2 rounded-[13px]` + shimmer | page.tsx |
| Texto cards de feature | `text-gray-300` | `text-muted-foreground` | page.tsx |
| Emojis no UI | ⚡📍💰🔒🏆⭐ | SVG Lucide ou texto puro | page.tsx |
| Grid pattern SVG | `stroke="var(--brand-green-vivid)"` | ✅ OK — manter | Todas |
| Botão submit (verde) | gradiente hardcoded | ✅ Aceitável como CTA primário | Todas |
| Inputs (login/forgot) | `bg-input border-border` | ✅ OK — tokens corretos | login, forgot-password |

### 2.3 Diagnóstico Individual por Página

#### `/auth/set-password` (`app/auth/set-password/page.tsx`)
- Background: `bg-metal` em todos os estados — incluindo o spinner de loading (linha 76)
- Título: `text-brand-deep` (`#023c1f`) — verde escuro sobre fundo cinza/dark, ilegível
- Labels: `text-sm font-semibold text-foreground` — sem uppercase, diverge do design system
- Card: `bg-card/90 backdrop-blur-sm rounded-2xl border-border/60` — padrão inconsistente
- Ícone KeyRound wrapper: `bg-primary/10` — OK, mas pode usar `bg-green-dim border border-green-border`
- Estado validação de senhas: `text-destructive` — OK, token correto

#### `/auth/callback` (`app/auth/callback/page.tsx`)
- Background: `bg-metal` — deve ser `bg-background`
- Spinner: `border-b-2 border-primary` — OK
- Texto: `text-muted-foreground` — OK, token correto
- Página é funcional (apenas transição), mas deve manter identidade visual dark

#### `/reset-password` (`app/reset-password/page.tsx`)
- Background: `bg-metal` em todos os estados — incluindo loading state (linha 62)
- Loading state: `text-brand-deep` em texto "Validando link..." — verde escuro ilegível
- Título: `text-brand-deep` — ilegível no dark
- Labels: `text-sm font-semibold text-foreground` — sem uppercase
- Card: `bg-card/90 backdrop-blur-sm rounded-2xl border-border/60`
- Sem botão "Voltar ao Início" no loading state — apenas no form principal (OK)
- Não possui "Voltar ao login" link dentro do card — considerar adicionar

#### `/privacidade` (`app/privacidade/page.tsx`)
- Background: `bg-gray-50 dark:bg-background` — depende do sistema operacional
- Wrapper do artigo: `bg-white dark:bg-card border-gray-100 dark:border-border` — dual-mode
- Link "Voltar ao login": `text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground`
- Usa `prose dark:prose-invert` — funcional mas sem garantia de dark sempre
- Sem logo, sem identidade visual da marca além do título da aba

#### `/termos` (`app/termos/page.tsx`)
- Exatamente os mesmos problemas de `/privacidade` — estrutura idêntica
- Background, wrapper e link com dual-mode gray/dark

#### `/suporte` (`app/suporte/page.tsx`)
- Background: `bg-gray-50 dark:bg-background` — depende do OS
- Card: `bg-white dark:bg-card border-gray-100 dark:border-border`
- Labels: `text-gray-700 dark:text-foreground` — dual-mode, sem uppercase
- Inputs: `bg-white dark:bg-muted/30 border-gray-200 dark:border-border` — dual-mode
- Focus nos inputs: implementado via `onFocus`/`onBlur` JS inline — deve usar classes Tailwind
- Estado de sucesso: `bg-primary/10 border-primary/30 text-primary` — tokens OK mas tema claro interfere
- Sem logo nem identidade visual da marca

### 2.4 Comparação Visual: Sidebar vs. Páginas Públicas

```
SIDEBAR (interno)                PÁGINAS PÚBLICAS (atual)
─────────────────────            ──────────────────────────────────────
Background: #0a140d              Auth: gradiente cinza #b8b8b8→#f5f5f5
Text: #dceede                    Institucional: bg-gray-50 (claro!)
Borders: rgba(255,255,255,.065)  Labels: sem uppercase, texto errado
Cards: rgba(255,255,255,.033)    Cards: bg-white dark:bg-card (depende OS)
Inputs: bg-input                 Inputs (suporte): bg-white com lógica JS de focus
```

**Resultado visual atual:** As páginas públicas parecem três produtos diferentes entre si:
1. Landing/auth com fundo metálico cinza
2. Institucionais com fundo branco (light) que talvez escureça dependendo do OS
3. Dashboard com fundo charcoal dark profissional

---

## 3. Design Correto — Especificação Geral

### 3.1 Background Universal — Dark Sempre

**Todas as páginas públicas, sem exceção, devem usar dark:**

```tsx
// ANTES (auth):
<div className="min-h-screen bg-metal">

// ANTES (institucional):
<div className="min-h-screen bg-gray-50 dark:bg-background">

// DEPOIS (todas):
<div className="min-h-screen bg-background">
// bg-background → var(--background) → #161616
```

Não há dark mode toggle neste sistema — o design é sempre dark. Eliminar toda lógica `dark:` nas páginas públicas.

### 3.2 Hierarquia de Superfícies (Landing Page)

| Seção | Background | Classe |
|---|---|---|
| Navbar | `rgba(28,28,28,0.92)` | `style` + `backdrop-blur-md` |
| Hero | `#161616` | `bg-background` |
| Funcionalidades | `#1c1c1c` | `bg-bg2` |
| Benefícios | `#161616` | `bg-background` |
| Planos | `#1c1c1c` | `bg-bg2` |
| CTA Final | `#161616` | `bg-background` |
| Footer | `#0a140d` | `style={{ background: 'var(--sidebar)' }}` |

### 3.3 Cards — Padrão Unificado

**Todo card de formulário e conteúdo nas páginas públicas deve seguir:**

```tsx
<div className="bg-surface border border-border2 rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-8">
  {/* Shimmer line — obrigatório em todos os cards */}
  <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
  {/* conteúdo */}
</div>
```

### 3.4 Labels — Padrão Unificado

```tsx
// TODOS os labels de formulário:
<label className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground">
  E-mail
</label>
```

### 3.5 Títulos dos Cards

```tsx
// h1 dentro de cards:
<h1 className="text-2xl font-black tracking-tight text-foreground">
// Subtítulo:
<p className="text-sm text-muted-foreground mt-1">
```

### 3.6 Emojis → SVG (Landing)

Conforme `DESIGN-SYSTEM.md`: **"No emoji in primary UI"**

| Local | Atual | Correto |
|---|---|---|
| Ícones de benefícios | ⚡📍💰🔒 | Lucide: `Zap`, `MapPin`, `TrendingDown`, `Shield` |
| Badge "🏆 #1 no agro" | emoji | remover |
| Badge "⭐ Mais popular" | emoji | texto puro "Mais popular" |

### 3.7 Páginas Institucionais — Identidade Visual

As páginas `/privacidade`, `/termos` e `/suporte` precisam de uma revisão de identidade além do simples troca de background:

- **Adicionar logo** no topo (padrão das outras páginas de auth)
- **Background**: `bg-background` sempre
- **Card de conteúdo**: `bg-surface border border-border2 rounded-[13px]`
- **Tipografia do artigo** (`prose`): substituir `prose dark:prose-invert` por configuração que respeite os tokens do design system
  - `h1`, `h2`: `text-foreground`
  - `p`, `li`: `text-muted-foreground`
  - `a`: `text-brand-primary hover:opacity-80`
- **Inputs (suporte)**: trocar lógica JS de focus por `focus:ring-2 focus:ring-ring focus:border-transparent`

---

## 4. Especificação por Página

### 4.1 Landing Page (`app/page.tsx`)

#### Navbar
- Background: `rgba(28,28,28,0.92)` + `backdrop-blur-md` + `border-b border-border`
- Logo: manter `brightness-110`
- Links nav: `text-sm text-muted-foreground hover:text-brand-primary`
- Botão "Entrar": `text-sm text-muted-foreground hover:text-foreground`
- Botão "Solicitar acesso": manter gradiente verde — OK como CTA primário

#### Hero
- Background: `bg-background` (substituir `bg-metal`)
- Grid SVG: manter (verde `#00A651` sobre `#161616` = perfeito)
- Headline: `text-foreground` — já correto
- Subtítulo: `text-muted-foreground` (não `text-foreground/80`)
- Badge "Plataforma feita para...": manter estilo atual

#### Seção Funcionalidades
- Background: `bg-bg2` (`#1c1c1c`)
- Título seção: `text-foreground` (não `text-brand-deep`)
- Cards: `bg-surface border border-border2 rounded-[13px]` + shimmer line + `hover:bg-surface2`
- Bordas coloridas variadas: remover — substituir pela borda padrão `border-border2`
- Cor do ícone: manter cor semântica por feature como acento (não na borda do card)
- Título do card: `text-foreground font-bold`
- Texto do card: `text-muted-foreground` (não `text-gray-300`)

#### Seção Benefícios
- Background: `bg-background`
- Título: `text-foreground` (não `text-brand-deep`)
- Label UPPERCASE acima do título: `text-xs font-bold uppercase tracking-widest text-brand-primary`
- Ícones: substituir emojis ⚡📍💰🔒 por Lucide `Zap`, `MapPin`, `TrendingDown`, `Shield`
- Ícone wrapper: `bg-green-dim border border-green-border rounded-[8px] w-12 h-12`
- Mockup de stats: manter gradiente verde — elemento ilustrativo aceitável
- Remover badge "🏆 #1 no agro"

#### Seção Planos
- Background: `bg-bg2`
- Título: `text-foreground` (não `text-brand-deep`)
- Cards normais: `bg-surface border border-border2 rounded-[13px]`
- Card destacado (Pro): gradiente verde OK — elemento de destaque de marketing
- Badge "Mais popular": remover emoji ⭐ — texto puro `text-xs font-bold uppercase`
- Texto de features: `text-sm text-muted-foreground`

#### CTA Final
- Background: `bg-background`
- Grid SVG: manter
- Título: `text-foreground` (não `text-brand-deep`)
- Texto: `text-muted-foreground`

#### Footer
- Background: `style={{ background: 'var(--sidebar)' }}` (`#0a140d`) — âncora verde com o sistema
- `border-t border-border`
- Texto: `text-muted-foreground`
- Links: `text-muted-foreground hover:text-brand-primary`
- Títulos de coluna: `text-xs font-bold uppercase tracking-widest text-foreground`

---

### 4.2 Login (`app/login/page.tsx`)

**Layout geral:**
- Background: `bg-background` (substituir `bg-metal`)
- Estrutura split desktop (hero esquerdo + form direito): manter

**Lado esquerdo — Hero (desktop):**
- Background: `style={{ background: 'var(--sidebar)' }}` (`#0a140d`)
- Grid SVG: manter sobre verde escuro
- Headline e textos: manter
- Footer do hero: `text-xs text-muted-foreground`

**Card do formulário:**
- Substituir `bg-card/90 backdrop-blur-sm rounded-2xl border-border/60` por padrão unificado
- `bg-surface border border-border2 rounded-[13px]` + shimmer + shadow-card

**Título do card:**
- `text-2xl font-black tracking-tight text-foreground` (remover `text-brand-deep`)

**Labels:**
- `text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground`

**Inputs:**
- Manter `bg-input border-border` — tokens corretos
- Padding: `py-3` (reduzir de `py-4`)

**Estado de erro:**
- `bg-red-dim border border-red-border` (não `bg-status-danger/10 border-status-danger/30`)

**Footer:**
- `text-xs text-muted-foreground`

---

### 4.3 Register (`app/register/page.tsx`)

**Layout geral:**
- Background: `bg-background` (substituir `bg-metal`)
- Grid SVG: manter

**Card:**
- Padrão unificado: `bg-surface border border-border2 rounded-[13px]` + shimmer

**Título:**
- `text-2xl font-black tracking-tight text-foreground` (remover `text-brand-deep`)

**Labels (shadcn `Label`):**
```tsx
<Label htmlFor="nome" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
```

**Descrição de perfil:**
- `text-xs text-muted-foreground` (não `text-sm`)
- `strong` dentro: `font-bold text-foreground`

---

### 4.4 Forgot Password (`app/forgot-password/page.tsx`)

**Layout geral:**
- Background: `bg-background` (substituir `bg-metal`)

**Card:**
- Padrão unificado + shimmer

**Título:**
- `text-2xl font-black tracking-tight text-foreground`

**Label:**
- `text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground`

**Input:**
- `py-3` (não `py-4`)

**Estado de sucesso:**
- `bg-green-dim border border-green-border rounded-[8px] text-foreground`
- (não `bg-status-success/10 border-status-success/30 text-brand-deep`)

---

### 4.5 Reset Password (`app/reset-password/page.tsx`)

**Página de redefinição de senha via link de e-mail — completamente ausente do PRD anterior.**

**Problemas encontrados:**
- Background: `bg-metal` em todos os estados (form + loading)
- Loading state (linha 62): `text-brand-deep` em "Validando link..." — verde escuro ilegível no dark
- Título: `text-brand-deep`
- Labels: `text-sm font-semibold text-foreground` sem uppercase
- Card: `bg-card/90 backdrop-blur-sm rounded-2xl border-border/60`
- Sem "Voltar ao login" dentro do card

**Especificação:**

**Layout geral:**
- Background: `bg-background` em **todos os estados**, incluindo o loading

**Loading state:**
```tsx
// ANTES:
<div className="min-h-screen flex items-center justify-center bg-metal">
  <p className="font-semibold text-brand-deep">Validando link...</p>
</div>

// DEPOIS:
<div className="min-h-screen flex items-center justify-center bg-background">
  <div className="flex flex-col items-center gap-3">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">Validando link...</p>
  </div>
</div>
```

**Card:**
- Padrão unificado + shimmer

**Título:**
- `text-2xl font-black tracking-tight text-foreground`

**Labels:**
- `text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground`

**Adicionar link "Voltar ao login"** dentro do card (ausente atualmente):
```tsx
<button onClick={() => router.push('/login')}
  className="flex items-center gap-2 text-sm font-medium mb-6 text-muted-foreground hover:text-brand-primary transition-colors">
  <ArrowLeft className="w-4 h-4" /> Voltar ao login
</button>
```

---

### 4.6 Set Password (`app/auth/set-password/page.tsx`)

**Página de primeiro acesso (convite) e recuperação de senha via callback — ausente do PRD anterior.**

**Problemas encontrados:**
- Background: `bg-metal` em todos os estados (form + loading no linha 75)
- Loading spinner state: `bg-metal` com spinner solitário — sem texto, sem identidade
- Título: `text-brand-deep` (`#023c1f`) — ilegível no dark
- Labels: `text-sm font-semibold text-foreground` sem uppercase
- Card: `bg-card/90 backdrop-blur-sm rounded-2xl border-border/60`
- Ícone KeyRound wrapper: `bg-primary/10` — funcional mas pode usar tokens mais explícitos

**Especificação:**

**Loading state:**
```tsx
// ANTES:
<div className="min-h-screen flex items-center justify-center bg-metal">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
</div>

// DEPOIS:
<div className="min-h-screen flex items-center justify-center bg-background">
  <div className="flex flex-col items-center gap-3">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">Verificando sessão...</p>
  </div>
</div>
```

**Background form:**
- `bg-background` (substituir `bg-metal`)

**Card:**
- Padrão unificado + shimmer

**Ícone wrapper:**
- `bg-green-dim border border-green-border rounded-[8px] w-10 h-10`
- Ícone: `text-brand-primary` (não `text-primary`)

**Título:**
- `text-xl font-black tracking-tight text-foreground` (não `text-brand-deep`)

**Labels:**
- `text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground`

**Validação inline:**
- `text-sm text-status-danger` (já correto com `text-destructive`)

---

### 4.7 Auth Callback (`app/auth/callback/page.tsx`)

**Página de transição — recebe token do link mágico e redireciona.**

**Problemas encontrados:**
- Background: `bg-metal` — único problema visual (a página só dura ~1-5s mas deve ter identidade correta)

**Especificação:**

```tsx
// ANTES:
<div className="min-h-screen flex items-center justify-center bg-metal">

// DEPOIS:
<div className="min-h-screen flex items-center justify-center bg-background">
```

- Spinner: `border-b-2 border-primary` — OK, manter
- Texto "Verificando acesso...": `text-sm text-muted-foreground` — OK, manter
- Nenhuma outra mudança necessária (página é só transição)

---

### 4.8 Privacidade (`app/privacidade/page.tsx`)

**Página ausente do PRD anterior.**

**Problemas encontrados:**
- Background: `bg-gray-50 dark:bg-background` — claro por padrão
- Card do artigo: `bg-white dark:bg-card border-gray-100 dark:border-border` — branco por padrão
- Link "Voltar ao login": cores dual-mode com gray
- Sem logo — sem identidade visual da marca
- `prose dark:prose-invert` depende do OS

**Especificação:**

**Layout:**
```tsx
// ANTES:
<div className="min-h-screen bg-gray-50 dark:bg-background">

// DEPOIS:
<div className="min-h-screen bg-background">
```

**Adicionar logo no topo** (padrão das outras páginas públicas):
```tsx
<div className="flex items-center justify-center mb-8">
  <Image src="/logo_degrad-hor.png" alt="GestSilo" width={200} height={50}
    className="object-contain brightness-110" priority />
</div>
```

**Card do artigo:**
```tsx
// ANTES:
<article className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-border p-10 prose dark:prose-invert prose-gray max-w-none">

// DEPOIS:
<article className="bg-surface border border-border2 rounded-[13px] p-10 max-w-none relative overflow-hidden">
  <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
  {/* conteúdo — estilizar h1/h2/p com tokens */}
```

**Tipografia do artigo** (substituir `prose`):
- `h1`: `text-2xl font-black text-foreground mb-2`
- `h2`: `text-base font-bold text-foreground mt-6 mb-2`
- `p`: `text-sm text-muted-foreground leading-relaxed mb-3`
- `a`: `text-brand-primary hover:opacity-80`
- Data: `text-xs text-muted-foreground mb-8`

**Link "Voltar ao login":**
```tsx
// ANTES:
className="text-sm text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground"

// DEPOIS:
className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
```

---

### 4.9 Termos de Uso (`app/termos/page.tsx`)

**Página ausente do PRD anterior. Estrutura idêntica a `/privacidade` — mesmos problemas, mesmas correções.**

Aplicar exatamente a mesma especificação da seção 4.8:
- Background: `bg-background`
- Adicionar logo
- Card: `bg-surface border border-border2 rounded-[13px]` + shimmer
- Tipografia: tokens do design system (sem `prose dark:prose-invert`)
- Link de volta: `text-muted-foreground hover:text-foreground`

---

### 4.10 Suporte (`app/suporte/page.tsx`)

**Página ausente do PRD anterior. É a mais problemática das institucionais — tem formulário.**

**Problemas encontrados:**
- Background: `bg-gray-50 dark:bg-background` — claro por padrão
- Card: `bg-white dark:bg-card border-gray-100 dark:border-border`
- Labels: `text-gray-700 dark:text-foreground` + sem uppercase
- Inputs: `bg-white dark:bg-muted/30 border-gray-200 dark:border-border` — dual-mode
- Focus nos inputs: via `onFocus`/`onBlur` JS inline com `window.matchMedia` — má prática, não usa tokens
- Textarea: mesmo problema dos inputs
- Estado de sucesso: `bg-primary/10 border-primary/30 text-primary` — token OK mas sobre fundo claro quebra
- Sem logo — sem identidade visual da marca

**Especificação:**

**Layout:**
```tsx
// ANTES:
<div className="min-h-screen bg-gray-50 dark:bg-background">
// DEPOIS:
<div className="min-h-screen bg-background">
```

**Adicionar logo no topo** (mesmo padrão das outras páginas).

**Adicionar grid SVG decorativo** (consistência com o fluxo de auth que o usuário percorreu).

**Card:**
- `bg-surface border border-border2 rounded-[13px]` + shimmer

**Labels:**
```tsx
// ANTES:
className="block text-sm font-semibold text-gray-700 dark:text-foreground mb-2"
// DEPOIS:
className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground"
```

**Inputs e Textarea:**
```tsx
// ANTES: bg-white dark:bg-muted/30 border-gray-200 dark:border-border + onFocus/onBlur JS
// DEPOIS:
className="w-full px-4 py-3 bg-input border border-border rounded-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm shadow-sm transition-all"
// Remover completamente os handlers onFocus/onBlur
```

**Estado de sucesso:**
```tsx
// ANTES: bg-primary/10 border-primary/30 text-primary (lê errado no light)
// DEPOIS:
className="p-4 bg-green-dim border border-green-border rounded-[8px] text-foreground text-sm"
```

**Link "Voltar ao login":**
- `text-sm text-muted-foreground hover:text-foreground transition-colors`

---

## 5. Tokens de Design — Referência Rápida

### Backgrounds
```
#161616 → bg-background           (base global de todas as páginas)
#1c1c1c → bg-bg2                  (seções alternadas na landing)
#0a140d → var(--sidebar)          (navbar/footer landing, hero esquerdo login)
rgba(255,255,255,0.033) → bg-surface   (cards, superfícies)
rgba(255,255,255,0.052) → bg-surface2  (hover de cards)
rgba(255,255,255,0.052) → bg-input     (inputs)
```

### Texto
```
#dceede → text-foreground          (títulos, texto principal)
#688070 → text-muted-foreground    (labels, texto secundário, subtítulos)
#2a4433 → text-faint               (separadores, terciário)
```

### Verde (Primário)
```
#023c1f → var(--brand-green-deep)    — NUNCA usar em títulos no dark
#00843D → var(--brand-green-primary) — text-brand-primary (links, acentos)
#00A651 → var(--brand-green-vivid)   — CTAs, grid SVG
#BBF7D0 → var(--brand-green-soft)
```

### Bordas
```
rgba(255,255,255,0.065) → border-border   (padrão)
rgba(255,255,255,0.105) → border-border2  (cards, inputs interativos)
rgba(0,196,90,0.2)      → border-green-border  (focus, estados verdes)
rgba(224,84,84,0.2)     → border-red-border    (erro)
```

### Shadows
```
--shadow-card:        0 2px 8px rgba(0,0,0,.28), 0 8px 28px rgba(0,0,0,.16)
--shadow-btn-primary: 0 0 0 1px rgba(0,196,90,.45), 0 4px 20px rgba(0,196,90,.22)
```

### Border Radius
```
13px   → rounded-[13px]  (cards, modais)
8px    → rounded-[8px]   (buttons, inputs, badges, ícone wrappers)
9999px → rounded-full    (pills, tags)
```

---

## 6. Componentes Reutilizáveis a Criar

Para eliminar toda a duplicação e garantir consistência em futuras páginas, criar em `components/auth/`:

### `AuthPageWrapper.tsx`
```tsx
// Props: children, showGrid?: boolean, showBackButton?: boolean
// Inclui: bg-background, grid SVG decorativo (opcional), botão "Voltar ao Início" (opcional)
```

### `AuthCard.tsx`
```tsx
// Props: children, className?
// Inclui: bg-surface, border-border2, rounded-[13px], shimmer line, shadow-card, p-8
```

### `AuthLabel.tsx`
```tsx
// Props: htmlFor, children
// Inclui: text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-2
```

### `AuthLoadingScreen.tsx`
```tsx
// Props: message?: string
// Inclui: min-h-screen bg-background, spinner border-primary, texto text-muted-foreground
// Usado em: auth/set-password, auth/callback, reset-password (estados de loading)
```

Esses quatro componentes cobrem **todos os padrões repetidos** nas 7 páginas de auth e garantem que qualquer nova página (ex: `/auth/verify-email`, `/auth/mfa`) siga o padrão automaticamente.

---

## 7. Checklist de Implementação

### Landing Page (`app/page.tsx`)
- [ ] Navbar: substituir `bg-metal` por `rgba(28,28,28,0.92) backdrop-blur`
- [ ] Hero: `bg-background`
- [ ] Seção Funcionalidades: `bg-bg2`, redesenhar cards (bg-surface + shimmer, remover bordas coloridas)
- [ ] Seção Benefícios: `bg-background`, substituir emojis ⚡📍💰🔒 por Lucide icons
- [ ] Seção Planos: `bg-bg2`, remover emoji ⭐ do badge "Mais popular"
- [ ] CTA Final: `bg-background`
- [ ] Footer: `var(--sidebar)` (`#0a140d`)
- [ ] Todos `text-brand-deep` em títulos → `text-foreground`
- [ ] `text-gray-300` → `text-muted-foreground`
- [ ] Remover badge "🏆 #1 no agro"

### Login (`app/login/page.tsx`)
- [ ] Background: `bg-background`
- [ ] Hero esquerdo: `style={{ background: 'var(--sidebar)' }}`
- [ ] Card: padrão unificado + shimmer
- [ ] Título: `text-foreground`
- [ ] Labels: uppercase + `text-muted-foreground`
- [ ] Inputs: `py-3`
- [ ] Erro: `bg-red-dim border-red-border`

### Register (`app/register/page.tsx`)
- [ ] Background: `bg-background`
- [ ] Card: padrão unificado + shimmer
- [ ] Título: `text-foreground`
- [ ] Labels (shadcn Label): uppercase + `text-muted-foreground`
- [ ] Descrição de perfil: `text-xs`

### Forgot Password (`app/forgot-password/page.tsx`)
- [ ] Background: `bg-background`
- [ ] Card: padrão unificado + shimmer
- [ ] Título: `text-foreground`
- [ ] Label: uppercase
- [ ] Input: `py-3`
- [ ] Estado sucesso: `bg-green-dim border-green-border text-foreground`

### Reset Password (`app/reset-password/page.tsx`) — NOVO
- [ ] Background: `bg-background` em todos os estados (form + loading)
- [ ] Loading state: spinner + texto `text-muted-foreground` (remover `text-brand-deep`)
- [ ] Card: padrão unificado + shimmer
- [ ] Título: `text-foreground`
- [ ] Labels: uppercase + `text-muted-foreground`
- [ ] Adicionar link "Voltar ao login" dentro do card

### Set Password (`app/auth/set-password/page.tsx`) — NOVO
- [ ] Background: `bg-background` em todos os estados (form + loading)
- [ ] Loading state: spinner + texto "Verificando sessão..." em `text-muted-foreground`
- [ ] Card: padrão unificado + shimmer
- [ ] Ícone KeyRound wrapper: `bg-green-dim border border-green-border rounded-[8px]`
- [ ] Título: `text-foreground` (remover `text-brand-deep`)
- [ ] Labels: uppercase + `text-muted-foreground`

### Auth Callback (`app/auth/callback/page.tsx`) — NOVO
- [ ] Background: `bg-background` (única mudança necessária)

### Privacidade (`app/privacidade/page.tsx`) — NOVO
- [ ] Background: `bg-background` (remover `bg-gray-50 dark:`)
- [ ] Adicionar logo no topo
- [ ] Card: `bg-surface border border-border2 rounded-[13px]` + shimmer
- [ ] Tipografia: substituir `prose dark:prose-invert` por estilos com tokens
- [ ] Link "Voltar ao login": `text-muted-foreground hover:text-foreground`

### Termos de Uso (`app/termos/page.tsx`) — NOVO
- [ ] Mesmas correções que `/privacidade`

### Suporte (`app/suporte/page.tsx`) — NOVO
- [ ] Background: `bg-background` (remover `bg-gray-50 dark:`)
- [ ] Adicionar logo no topo
- [ ] Adicionar grid SVG decorativo
- [ ] Card: `bg-surface border border-border2 rounded-[13px]` + shimmer
- [ ] Labels: uppercase + `text-muted-foreground`
- [ ] Inputs/Textarea: `bg-input border-border` + `focus:ring-2 focus:ring-ring`
- [ ] Remover todos os handlers `onFocus`/`onBlur` com `window.matchMedia`
- [ ] Estado sucesso: `bg-green-dim border-green-border text-foreground`
- [ ] Link "Voltar ao login": `text-muted-foreground hover:text-foreground`

---

## 8. O Que NÃO Mudar

- Toda a lógica de autenticação (handlers, redirects, useEffect, getSession)
- Estrutura split do login (hero esquerdo + form direito)
- Grid pattern SVG decorativo — identidade mantida
- Gradiente verde nos botões submit — CTA primário OK
- Imagem hero da landing (`imagem-hero.webp`)
- Gradiente verde no card Pro dos planos — marketing OK
- Mockup de stats da seção Benefícios — ilustrativo OK
- Funcionalidade do Select de Perfil no Register
- Rate limiting / segurança nas rotas de API
- Lógica `window.matchMedia` que é para verificar preferência de cor nos inputs — aqui a remoção é intencional porque fixamos dark
- Conteúdo textual de `/privacidade` e `/termos`
- Comportamento do formulário de suporte (mailto:)

---

## 9. Prioridade de Implementação

**P0 — Crítico (quebra identidade em todas as páginas):**
1. Substituir `bg-metal` por `bg-background` — auth pages
2. Substituir `bg-gray-50 dark:bg-background` por `bg-background` — institucionais
3. Loading states de `set-password`, `reset-password`, `callback`: `bg-metal` → `bg-background`
4. Todos os `text-brand-deep` em títulos → `text-foreground`

**P1 — Alto (coerência de sistema):**
5. Cards de formulário → padrão unificado + shimmer (todas as auth pages)
6. Hero esquerdo do login → `background: var(--sidebar)`
7. Navbar landing → dark com backdrop blur
8. Footer landing → `var(--sidebar)`
9. Labels de formulário → uppercase em todas as páginas (incluindo `suporte`)
10. Inputs do `suporte` → tokens `bg-input` + remover handlers JS de focus

**P2 — Médio (polimento e consistência fina):**
11. Cards de funcionalidades da landing → padrão design system
12. Substituir emojis da landing por SVG Lucide
13. Páginas institucionais → adicionar logo + tipografia com tokens
14. Estado de sucesso (`forgot-password`, `suporte`) → tokens `bg-green-dim`
15. `reset-password` → adicionar link "Voltar ao login" dentro do card

**P3 — Baixo (arquitetura, não visual):**
16. Criar componentes `AuthPageWrapper`, `AuthCard`, `AuthLabel`, `AuthLoadingScreen`
17. Refatorar as páginas para usar esses componentes

---

## 10. Resultado Esperado

Após a implementação:

- **Jornada sem fricção visual:** landing → login → dashboard — o usuário sente que está no mesmo produto em todas as etapas
- **Fluxo de recovery completo:** `forgot-password` → `reset-password` → `set-password` — todas com a mesma identidade dark premium
- **Institucional alinhado:** `/privacidade`, `/termos` e `/suporte` deixam de parecer um rodapé de outro site e passam a ter a identidade GestSilo
- **Grid SVG verde sobre `#161616`** destaca-se muito melhor do que sobre o cinza atual — reforça a identidade agrícola/tecnológica
- **Sidebar verde (`#0a140d`)** no footer e no hero esquerdo do login cria uma âncora visual que conecta exterior e interior
- **Labels uppercase** alinhados em 100% das páginas — consistência total com o dashboard

---

## 11. Mapa de Arquivos

```
Escopo deste PRD:

app/
├── page.tsx                        ← Landing (10 problemas identificados)
├── login/page.tsx                  ← Auth form (7 problemas)
├── register/page.tsx               ← Auth form (5 problemas)
├── forgot-password/page.tsx        ← Auth form (6 problemas)
├── reset-password/page.tsx         ← Auth form (7 problemas) ← NOVO no PRD
├── auth/
│   ├── set-password/page.tsx       ← Auth form (7 problemas) ← NOVO no PRD
│   └── callback/page.tsx           ← Auth transição (1 problema) ← NOVO no PRD
├── privacidade/page.tsx            ← Institucional (5 problemas) ← NOVO no PRD
├── termos/page.tsx                 ← Institucional (5 problemas) ← NOVO no PRD
└── suporte/page.tsx                ← Institucional + form (9 problemas) ← NOVO no PRD

components/auth/ (a criar)
├── AuthPageWrapper.tsx
├── AuthCard.tsx
├── AuthLabel.tsx
└── AuthLoadingScreen.tsx
```

---

*Gerado em 2026-05-18 por análise de `app/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/auth/set-password/page.tsx`, `app/auth/callback/page.tsx`, `app/privacidade/page.tsx`, `app/termos/page.tsx`, `app/suporte/page.tsx`, `components/Sidebar.tsx`, `app/globals.css`, `DESIGN-SYSTEM.md`, `colors_and_type.css`*
