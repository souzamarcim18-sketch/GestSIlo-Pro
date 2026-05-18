# SPEC — Redesign: Landing Page & Páginas de Auth
**GestSilo Pro · Especificação Técnica**
**Baseado em:** `PRD-design-authpages.md`
**Data:** 2026-05-18 · **Status:** Aguardando implementação

---

## 1. Arquivos a CRIAR

### 1.1 `components/auth/AuthLoadingScreen.tsx`

**Propósito:** Tela de loading reutilizável para os estados de espera das páginas de auth (`set-password`, `reset-password`, `callback`). Elimina o padrão `bg-metal` + spinner isolado.

**Props:**
```
interface AuthLoadingScreenProps {
  message?: string  // padrão: "Carregando..."
}
```

**Bloco de código a adicionar:**
- `'use client'` — componente cliente (pode ser chamado em Client Components)
- `<div className="min-h-screen flex items-center justify-center bg-background">`
- Inner `<div className="flex flex-col items-center gap-3">`
  - Spinner: `<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />`
  - Texto: `<p className="text-sm text-muted-foreground">{message}</p>` (renderizado apenas se `message` for fornecido)

---

### 1.2 `components/auth/AuthCard.tsx`

**Propósito:** Card de formulário padronizado com shimmer line, shadow e border corretos. Elimina o padrão `bg-card/90 backdrop-blur-sm rounded-2xl border-border/60`.

**Props:**
```
interface AuthCardProps {
  children: React.ReactNode
  className?: string
}
```

**Bloco de código a adicionar:**
- `<div className="bg-surface border border-border2 rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-8 {className}">`
- Shimmer line obrigatório como primeiro filho: `<div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />`
- `{children}`

---

### 1.3 `components/auth/AuthLabel.tsx`

**Propósito:** Label de formulário padronizado com uppercase, tracking e cor corretos. Elimina o padrão `text-sm font-semibold text-foreground` em todas as páginas de auth.

**Props:**
```
interface AuthLabelProps {
  htmlFor: string
  children: React.ReactNode
}
```

**Bloco de código a adicionar:**
- `<label htmlFor={htmlFor} className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground">`
- `{children}`

---

### 1.4 `components/auth/AuthPageWrapper.tsx`

**Propósito:** Wrapper de página com background dark, grid SVG decorativo e botão "Voltar ao Início" opcionais. Cobre o layout base de todas as páginas de auth de formulário (register, forgot-password, reset-password, set-password).

**Props:**
```
interface AuthPageWrapperProps {
  children: React.ReactNode
  showGrid?: boolean       // padrão: true
  showBackButton?: boolean // padrão: true
  gridId?: string          // ID único do pattern SVG para evitar colisões no DOM
}
```

**Bloco de código a adicionar:**
- `'use client'` — precisa do `useRouter` para o botão de voltar
- Import de `useRouter` de `next/navigation`
- Import de `Home` de `lucide-react`
- `<div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background">`
- Grid SVG condicional (`showGrid`): `<div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">` com `<svg>` e `<pattern>` usando `gridId` como `id`
- Botão "Voltar ao Início" condicional (`showBackButton`): `className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-card hover:text-brand-primary transition-all shadow-md cursor-pointer"`
- `{children}`

---

## 2. Arquivos a MODIFICAR

### 2.1 `app/auth/callback/page.tsx`

**Mudança:** Única — trocar `bg-metal` por `bg-background` na linha 37.

**Trecho a alterar:**
```
// ANTES (linha 37):
<div className="min-h-screen flex items-center justify-center bg-metal">

// DEPOIS:
<div className="min-h-screen flex items-center justify-center bg-background">
```

**Nada mais muda** — lógica de auth, spinner e texto já estão corretos.

---

### 2.2 `app/auth/set-password/page.tsx`

**Mudanças (5 pontos):**

**a) Loading state (linha 73–79) — substituir `bg-metal` e adicionar texto:**
```
// ANTES:
<div className="min-h-screen flex items-center justify-center bg-metal">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
</div>

// DEPOIS: usar <AuthLoadingScreen message="Verificando sessão..." />
// (import de components/auth/AuthLoadingScreen)
```

**b) Background do form (linha 82) — trocar `bg-metal`:**
```
// ANTES:
<div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-metal">

// DEPOIS: usar <AuthPageWrapper gridId="grid-setpw">
// (import de components/auth/AuthPageWrapper)
// Remover o bloco do grid SVG interno (linhas 84–93), pois o wrapper o inclui
// Remover o wrapper div externo, mantendo apenas o conteúdo interno
```

**c) Card (linha 109) — substituir `bg-card/90 backdrop-blur-sm rounded-2xl border-border/60`:**
```
// ANTES:
<div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/60 p-8">

// DEPOIS: usar <AuthCard>
// (import de components/auth/AuthCard)
// Remover o p-8 — já incluso no AuthCard
```

**d) Ícone KeyRound wrapper (linha 111):**
```
// ANTES:
<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
  <KeyRound className="w-5 h-5 text-primary" />

// DEPOIS:
<div className="w-10 h-10 rounded-[8px] bg-green-dim border border-green-border flex items-center justify-center">
  <KeyRound className="w-5 h-5 text-brand-primary" />
```

**e) Título (linha 115):**
```
// ANTES:
<h1 className="text-xl font-bold text-brand-deep">Criar sua senha</h1>

// DEPOIS:
<h1 className="text-xl font-black tracking-tight text-foreground">Criar sua senha</h1>
```

**f) Labels (linhas 122 e 151):**
```
// ANTES:
<label htmlFor="password" className="block text-sm font-semibold mb-2 text-foreground">

// DEPOIS: usar <AuthLabel htmlFor="password">
// (import de components/auth/AuthLabel)
// Aplicar para ambos os labels (Nova senha e Confirmar senha)
```

---

### 2.3 `app/reset-password/page.tsx`

**Mudanças (5 pontos):**

**a) Loading state (linha 59–67) — substituir `bg-metal` e `text-brand-deep`:**
```
// ANTES:
<div className="min-h-screen flex items-center justify-center bg-metal">
  <p className="font-semibold text-brand-deep">Validando link...</p>
</div>

// DEPOIS: usar <AuthLoadingScreen message="Validando link..." />
```

**b) Background do form (linha 70) — trocar `bg-metal`:**
```
// ANTES:
<div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-metal">

// DEPOIS: envolver todo o conteúdo em <AuthPageWrapper gridId="grid-reset">
// Remover o bloco grid SVG interno (linhas 72–81), pois o wrapper o inclui
// Manter o botão "Voltar ao Início" separado OU usar showBackButton do wrapper
// (o botão já existe nas linhas 83–91, pode ser removido se usar AuthPageWrapper com showBackButton=true)
```

**c) Card (linha 107):**
```
// ANTES:
<div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/60 p-8">

// DEPOIS: usar <AuthCard>
```

**d) Título (linha 109):**
```
// ANTES:
<h1 className="text-2xl font-bold mb-2 text-brand-deep">Redefinir senha</h1>

// DEPOIS:
<h1 className="text-2xl font-black tracking-tight text-foreground mb-2">Redefinir senha</h1>
```

**e) Labels (linhas 119 e 139):**
```
// ANTES:
<label htmlFor="password" className="block text-sm font-semibold mb-2 text-foreground">

// DEPOIS: usar <AuthLabel htmlFor="password">
```

**f) Adicionar link "Voltar ao login" DENTRO do card — antes do `<div className="mb-6">`:**
```tsx
// INSERIR antes do <div className="mb-6"> (linha 108):
import { ArrowLeft } from 'lucide-react'; // já importado na página — verificar

<button
  onClick={() => router.push('/login')}
  className="flex items-center gap-2 text-sm font-medium mb-6 text-muted-foreground hover:text-brand-primary transition-colors"
>
  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
  Voltar ao login
</button>
```

---

### 2.4 `app/login/page.tsx`

**Mudanças (5 pontos):**

**a) Background global (linha 127):**
```
// ANTES:
<div className="min-h-screen flex relative bg-metal">

// DEPOIS:
<div className="min-h-screen flex relative bg-background">
```

**b) Hero esquerdo (linha 141) — adicionar background sidebar:**
O `<div>` do lado esquerdo deve receber `style={{ background: 'var(--sidebar)' }}`:
```
// ANTES:
<div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden">

// DEPOIS:
<div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden"
  style={{ background: 'var(--sidebar)' }}>
```

**c) Card do formulário (linha 209):**
```
// ANTES:
<div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/60 p-8">

// DEPOIS: usar <AuthCard>
// Adicionar import de AuthCard
// Remover o wrapper div externo, conteúdo permanece igual
```

**d) Título (linha 211):**
```
// ANTES:
<h1 className="text-3xl font-bold mb-2 text-brand-deep">Bem-vindo de volta</h1>

// DEPOIS:
<h1 className="text-2xl font-black tracking-tight text-foreground mb-2">Bem-vindo de volta</h1>
```

**e) Labels (linhas 224 e 259):**
```
// ANTES:
<label htmlFor="email" className="block text-sm font-semibold mb-2 text-foreground">

// DEPOIS: substituir por <AuthLabel htmlFor="email">
// Aplicar para o label de "E-mail" e o label de "Senha"
// ATENÇÃO: o label de "Senha" está em um <div className="flex items-center justify-between mb-2">
//          junto com o link "Esqueceu a senha?" — manter o wrapper div, usar AuthLabel dentro
```

**f) Estado de erro (linha 323):**
```
// ANTES:
className="flex items-center gap-3 p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl"

// DEPOIS:
className="flex items-center gap-3 p-4 bg-red-dim border border-red-border rounded-xl"
```

**g) Inputs — reduzir padding vertical:**
```
// ANTES: py-4 (linhas 251 e 294)
// DEPOIS: py-3
// Aplicar nos dois inputs (email e password)
```

---

### 2.5 `app/register/page.tsx`

**Mudanças (4 pontos):**

**a) Background global (linha 63):**
```
// ANTES:
<div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden bg-metal">

// DEPOIS: usar <AuthPageWrapper gridId="grid-register" showBackButton={true}>
// Remover o bloco grid SVG interno (linhas 64–83)
// Remover o botão "Voltar ao Início" inline (linhas 86–93) — o wrapper o inclui
// Manter apenas o conteúdo <main> interno
```

**b) Card (linha 113):**
```
// ANTES:
<div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/60 p-8">

// DEPOIS: usar <AuthCard>
```

**c) Título (linha 116):**
```
// ANTES:
<h1 className="text-2xl font-bold text-brand-deep">Criar Conta</h1>

// DEPOIS:
<h1 className="text-2xl font-black tracking-tight text-foreground">Criar Conta</h1>
```

**d) Labels do shadcn `<Label>` (linhas 128, 146, 164, 183):**
```
// ANTES:
<Label htmlFor="nome" className="font-semibold text-foreground">

// DEPOIS:
<Label htmlFor="nome" className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">

// Aplicar para TODOS os quatro Labels: Nome Completo, E-mail, Senha, Perfil de Acesso
```

**e) Descrição de perfil (linha 202):**
```
// ANTES:
<p className="text-sm text-muted-foreground">
  <strong>Administrador:</strong> acesso completo... <strong>Operador:</strong>...
</p>

// DEPOIS:
<p className="text-xs text-muted-foreground">
  <strong className="font-bold text-foreground">Administrador:</strong> acesso completo...{' '}
  <strong className="font-bold text-foreground">Operador:</strong>...
</p>
```

---

### 2.6 `app/forgot-password/page.tsx`

**Mudanças (4 pontos):**

**a) Background global (linha 46):**
```
// ANTES:
<div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-metal">

// DEPOIS: usar <AuthPageWrapper gridId="grid-forgot" showBackButton={true}>
// Remover o bloco grid SVG interno (linhas 48–57)
// Remover o botão "Voltar ao Início" inline (linhas 60–67) — o wrapper o inclui
```

**b) Card (linha 85):**
```
// ANTES:
<div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/60 p-8">

// DEPOIS: usar <AuthCard>
```

**c) Título (linha 97):**
```
// ANTES:
<h1 className="text-2xl font-bold mb-2 text-brand-deep">Recuperar senha</h1>

// DEPOIS:
<h1 className="text-2xl font-black tracking-tight text-foreground mb-2">Recuperar senha</h1>
```

**d) Label (linha 116):**
```
// ANTES:
<label htmlFor="email" className="block text-sm font-semibold mb-2 text-foreground">

// DEPOIS: usar <AuthLabel htmlFor="email">
```

**e) Input — padding (linha 130):**
```
// ANTES: py-3 (já correto — não muda)
// Verificar: este input já usa py-3, OK.
```

**f) Estado de sucesso (linha 106):**
```
// ANTES:
<div className="p-4 rounded-xl text-sm border bg-status-success/10 border-status-success/30 text-brand-deep">

// DEPOIS:
<div className="p-4 bg-green-dim border border-green-border rounded-[8px] text-foreground text-sm">
```

---

### 2.7 `app/privacidade/page.tsx`

**Mudanças (4 pontos):**

**a) Background global (linha 9):**
```
// ANTES:
<div className="min-h-screen bg-gray-50 dark:bg-background">

// DEPOIS:
<div className="min-h-screen bg-background">
```

**b) Adicionar imports no topo do arquivo:**
```
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
```
Nota: este arquivo é Server Component — não adicionar `'use client'`. O link "Voltar" pode ser um `<Link>` simples.

**c) Adicionar logo ANTES do bloco `<div className="mb-8">` (atualmente linha 11):**
```tsx
// INSERIR após <div className="max-w-3xl mx-auto px-6 py-16">:
<div className="flex items-center justify-center mb-10">
  <Image
    src="/logo_degrad-hor.png"
    alt="GestSilo"
    width={200}
    height={50}
    className="object-contain brightness-110"
    priority
  />
</div>
```

**d) Link "Voltar ao login" (linhas 12–17):**
```
// ANTES:
<Link href="/login" className="text-sm text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground transition-colors">
  ← Voltar ao login
</Link>

// DEPOIS:
<Link href="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
  Voltar ao login
</Link>
```

**e) Article / Card (linha 20):**
```
// ANTES:
<article className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-border p-10 prose dark:prose-invert prose-gray max-w-none">

// DEPOIS:
<article className="bg-surface border border-border2 rounded-[13px] p-10 max-w-none relative overflow-hidden">
  {/* shimmer line */}
  <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
```

**f) Tipografia do artigo — substituir classes inline de `prose`:**

Elementos que precisam de classes explícitas (o `prose` é removido):
- `<h1>` (linha 21): `className="text-2xl font-black text-foreground mb-2"`
- Data `<p>` (linha 24): `className="text-xs text-muted-foreground mb-8"`
- Todos os `<h2>` (linhas 28, 35, 42, 49, 56, 61): `className="text-base font-bold text-foreground mt-6 mb-2"`
- Todos os `<p>` do corpo: `className="text-sm text-muted-foreground leading-relaxed mb-3"`
- Tags `<a>` (linhas 53, 65): `className="text-brand-primary hover:opacity-80"`
- Remover as classes `text-gray-900 dark:text-foreground` e `text-gray-500 dark:text-muted-foreground` do h1 e data-p

---

### 2.8 `app/termos/page.tsx`

**Mudanças:** Estrutura idêntica a `/privacidade` — aplicar exatamente as mesmas 5 mudanças acima:
1. Background: `bg-background`
2. Adicionar imports `Image` e `ArrowLeft`
3. Adicionar logo após o container principal
4. Link "Voltar": tokens dark sem `gray-`
5. Article: `bg-surface border border-border2 rounded-[13px]` + shimmer + tipografia com tokens

Os títulos `<h2>` e `<p>` do corpo de `/termos` têm o mesmo padrão — aplicar `text-base font-bold text-foreground` e `text-sm text-muted-foreground` respectivamente.

---

### 2.9 `app/suporte/page.tsx`

**Mudanças (7 pontos):**

**a) Background global (linha 26):**
```
// ANTES:
<div className="min-h-screen bg-gray-50 dark:bg-background">

// DEPOIS:
<div className="min-h-screen bg-background relative overflow-hidden">
```

**b) Adicionar imports no topo:**
```
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
```
Este arquivo é `'use client'` — `Image` pode ser importado normalmente.

**c) Adicionar grid SVG decorativo e logo ANTES do `<div className="max-w-2xl...">`:**
```tsx
{/* Grid decorativo */}
<div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid-suporte" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--brand-green-vivid)" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-suporte)" />
  </svg>
</div>
```

Dentro do container `max-w-2xl`, ANTES do bloco `<div className="mb-8">`:
```tsx
<div className="flex items-center justify-center mb-10">
  <Image src="/logo_degrad-hor.png" alt="GestSilo" width={200} height={50}
    className="object-contain brightness-110" priority />
</div>
```

**d) Link "Voltar ao login" (linhas 29–35):**
```
// ANTES:
<Link href="/login" className="text-sm text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground transition-colors">

// DEPOIS:
<Link href="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
  Voltar ao login
</Link>
```

**e) Card (linha 37):**
```
// ANTES:
<div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-border p-10">

// DEPOIS:
<div className="bg-surface border border-border2 rounded-[13px] p-8 relative overflow-hidden">
  <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
```

**f) Título e subtítulo (linhas 38–48):**
```
// ANTES:
<h1 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-2">Suporte</h1>
<p className="text-gray-600 dark:text-muted-foreground text-sm mb-8">

// DEPOIS:
<h1 className="text-2xl font-black tracking-tight text-foreground mb-2">Suporte</h1>
<p className="text-sm text-muted-foreground mb-8">
// Link do e-mail dentro do p: className="text-brand-primary hover:opacity-80"
// Remover "dark:text-primary"
```

**g) Labels (linhas 63–67, 86–90, 109–113) — todos os três labels:**
```
// ANTES:
className="block text-sm font-semibold text-gray-700 dark:text-foreground mb-2"

// DEPOIS:
className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground"
```

**h) Inputs (linhas 68–79, 92–103) e Textarea (linhas 114–124):**
```
// ANTES:
className="w-full px-4 py-3 bg-white dark:bg-muted/30 border border-gray-200 dark:border-border rounded-xl text-gray-900 dark:text-foreground ..."
onFocus={(e) => (e.target.style.boxShadow = window.matchMedia(...) ...)}
onBlur={(e) => (e.target.style.boxShadow = '')}

// DEPOIS:
className="w-full px-4 py-3 bg-input border border-border rounded-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm shadow-sm transition-all"
// Remover completamente: onFocus, onBlur, placeholder-gray-400
// Textarea: adicionar resize-none
```

**i) Estado de sucesso (linha 52):**
```
// ANTES:
<div className="p-4 bg-primary/10 dark:bg-primary/10 border border-primary/30 dark:border-primary/30 rounded-xl text-primary dark:text-primary text-sm">

// DEPOIS:
<div className="p-4 bg-green-dim border border-green-border rounded-[8px] text-foreground text-sm">
```

---

### 2.10 `app/page.tsx` (Landing Page)

Este arquivo é o mais extenso — mudanças em múltiplas seções. Não foi lido na íntegra durante a spec; a implementação deve ler o arquivo completo antes de editar.

**Mudanças por seção:**

**a) Navbar:**
```
// Substituir background de bg-metal por:
// style={{ background: 'rgba(28,28,28,0.92)' }} + className com "backdrop-blur-md border-b border-border"
// Links nav: text-muted-foreground hover:text-brand-primary
// Botão "Entrar": text-muted-foreground hover:text-foreground
```

**b) Hero section:**
```
// Background: substituir bg-metal por bg-background
// Subtítulo: substituir text-foreground/80 por text-muted-foreground
```

**c) Seção Funcionalidades:**
```
// Background: bg-bg2
// Título da seção: text-foreground (remover text-brand-deep)
// Cards: substituir bg-brand-deep + bordas coloridas variadas por:
//   bg-surface border border-border2 rounded-[13px]
//   Adicionar shimmer line em cada card
//   hover: hover:bg-surface2
// Bordas coloridas variadas: REMOVER (substituir pela borda padrão border-border2)
// Manter apenas a cor do ícone como acento semântico
// Título do card: text-foreground font-bold
// Texto do card: text-muted-foreground (substituir text-gray-300)
```

**d) Seção Benefícios:**
```
// Background: bg-background
// Título: text-foreground (remover text-brand-deep)
// Label UPPERCASE: text-xs font-bold uppercase tracking-widest text-brand-primary
// Substituir emojis por Lucide icons:
//   ⚡ → <Zap className="w-5 h-5 text-brand-primary" />
//   📍 → <MapPin className="w-5 h-5 text-brand-primary" />
//   💰 → <TrendingDown className="w-5 h-5 text-brand-primary" />
//   🔒 → <Shield className="w-5 h-5 text-brand-primary" />
// Ícone wrapper: bg-green-dim border border-green-border rounded-[8px] w-12 h-12
// Remover badge "🏆 #1 no agro"
```

**e) Seção Planos:**
```
// Background: bg-bg2
// Título: text-foreground (remover text-brand-deep)
// Cards normais: bg-surface border border-border2 rounded-[13px]
// Badge "Mais popular": remover ⭐, texto puro text-xs font-bold uppercase
// Texto de features: text-sm text-muted-foreground
```

**f) CTA Final:**
```
// Background: bg-background
// Título: text-foreground (remover text-brand-deep)
// Texto: text-muted-foreground
```

**g) Footer:**
```
// Background: substituir bg-metal por style={{ background: 'var(--sidebar)' }}
// Adicionar: border-t border-border
// Texto: text-muted-foreground
// Links: text-muted-foreground hover:text-brand-primary
// Títulos de coluna: text-xs font-bold uppercase tracking-widest text-foreground
```

**Imports a adicionar em `app/page.tsx`:**
```
import { Zap, MapPin, TrendingDown, Shield } from 'lucide-react';
```

---

## 3. Resumo: Arquivos Criados vs. Modificados

| Ação | Arquivo | Mudanças-chave |
|---|---|---|
| CRIAR | `components/auth/AuthLoadingScreen.tsx` | Novo componente — loading screen dark |
| CRIAR | `components/auth/AuthCard.tsx` | Novo componente — card padronizado + shimmer |
| CRIAR | `components/auth/AuthLabel.tsx` | Novo componente — label uppercase |
| CRIAR | `components/auth/AuthPageWrapper.tsx` | Novo componente — wrapper com bg + grid + back button |
| MODIFICAR | `app/auth/callback/page.tsx` | 1 mudança: bg-metal → bg-background |
| MODIFICAR | `app/auth/set-password/page.tsx` | 6 mudanças: loading, bg, card, ícone, título, labels |
| MODIFICAR | `app/reset-password/page.tsx` | 6 mudanças: loading, bg, card, título, labels, + "Voltar ao login" |
| MODIFICAR | `app/login/page.tsx` | 7 mudanças: bg, hero bg, card, título, labels, erro, padding inputs |
| MODIFICAR | `app/register/page.tsx` | 5 mudanças: bg, card, título, labels, descrição perfil |
| MODIFICAR | `app/forgot-password/page.tsx` | 5 mudanças: bg, card, título, label, estado sucesso |
| MODIFICAR | `app/privacidade/page.tsx` | 5 mudanças: bg, logo, link voltar, article card, tipografia |
| MODIFICAR | `app/termos/page.tsx` | 5 mudanças: mesmas de privacidade |
| MODIFICAR | `app/suporte/page.tsx` | 9 mudanças: bg, logo, grid, link voltar, card, título, labels, inputs, sucesso |
| MODIFICAR | `app/page.tsx` | 7 mudanças: navbar, hero, funcionalidades, benefícios, planos, CTA, footer |

---

## 4. Ordem Sugerida de Implementação

### Fase 1 — P0: Criar componentes base (sem tocar nas páginas ainda)
1. `components/auth/AuthLoadingScreen.tsx`
2. `components/auth/AuthCard.tsx`
3. `components/auth/AuthLabel.tsx`
4. `components/auth/AuthPageWrapper.tsx`

**Validação:** TypeScript compila sem erros nos 4 componentes.

### Fase 2 — P0: Correções críticas de background e títulos
5. `app/auth/callback/page.tsx` — 1 linha, zero risco
6. `app/auth/set-password/page.tsx` — loading state + bg + card + título
7. `app/reset-password/page.tsx` — loading state + bg + card + título
8. `app/login/page.tsx` — bg + hero bg + card + título
9. `app/register/page.tsx` — bg + card + título
10. `app/forgot-password/page.tsx` — bg + card + título

**Validação:** `npm run build` sem erros TypeScript. Testar fluxo completo: landing → login → callback → set-password → reset-password.

### Fase 3 — P1: Labels e estados de formulário
11. Aplicar `<AuthLabel>` em todas as páginas de auth (set-password, reset-password, login, register, forgot-password)
12. Corrigir estado de erro no login (`bg-red-dim border-red-border`)
13. Corrigir estado de sucesso no forgot-password (`bg-green-dim`)
14. Adicionar "Voltar ao login" dentro do card em reset-password

**Validação:** Inspecionar cada página visualmente — labels uppercase, bordas de erro/sucesso corretas.

### Fase 4 — P1: Institucionais
15. `app/privacidade/page.tsx`
16. `app/termos/page.tsx`
17. `app/suporte/page.tsx` (mais trabalhoso — inputs têm onFocus/onBlur a remover)

**Validação:** Testar formulário de suporte completo — preencher, submeter, estado de sucesso.

### Fase 5 — P2: Landing page (`app/page.tsx`)
18. Ler o arquivo completo antes de editar
19. Navbar → Hero → Funcionalidades → Benefícios → Planos → CTA → Footer
20. Substituir emojis por Lucide icons
21. Adicionar imports de `Zap, MapPin, TrendingDown, Shield`

**Validação:** `npm run build` + inspecionar cada seção da landing page.

### Fase 6 — P3: Refatoração com componentes (opcional, após P0–P2 validados)
22. Revisitar as páginas de auth e substituir os padrões inline pelos componentes criados na Fase 1
23. `npm run test` — confirmar 646+ testes passando

---

## 5. Invariantes — O Que NÃO Mudar

- Toda a lógica de autenticação (handlers, redirects, useEffect, getSession, onAuthStateChange)
- Estrutura split desktop do login (hero esquerdo lg:w-1/2 + form direito lg:w-1/2)
- Grid pattern SVG verde decorativo — apenas o background por trás muda
- Gradiente verde nos botões submit (`linear-gradient(135deg, #00A651 0%, #00843D 100%)`)
- Imagem hero da landing (`imagem-hero.webp`)
- Gradiente verde no card Pro dos planos
- Mockup de stats da seção Benefícios
- Funcionalidade do `<Select>` de Perfil no Register (shadcn)
- Rate limiting nas rotas de API
- Conteúdo textual (h1 da página, parágrafos, listas) de `/privacidade` e `/termos`
- Comportamento do formulário de suporte (`mailto:`)
- `metadata` export de `/privacidade` — arquivo continua Server Component
- `'use client'` dos arquivos que já são client — não remover

---

*Spec gerada em 2026-05-18. Implementar após revisão e confirmação.*
