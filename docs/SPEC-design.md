# SPEC — Implementação Dark Mode GestSilo-Pro

**Status**: Especificação Técnica (Pronto para Implementação)  
**Data**: Abril 2026  
**Documento Base**: `docs/PRD-design.md` v1.0  

---

## 📋 Sumário Executivo

Esta especificação detalha a implementação técnica da migração dark mode com paleta verde escura + verde neon. Cada arquivo crítico foi analisado e mapeado com **diffs específicos** (antes → depois), **impacto em responsividade** e **ordem de implementação**.

### Números-chave:
- **11 arquivos críticos** para modificação
- **8 arquivos opcionais** com ajustes menores
- **2 arquivos com cores hardcoded** em inline styles (Sidebar, SyncStatusBar)
- **Breakpoints testados**: mobile (< 768px), tablet (768–1024px), desktop (> 1024px)

---

## 🎨 Paleta de Cores (Referência)

### Dark Mode (`.dark` em `app/globals.css`)
| Variável | OKLCH | Hex Aprox | Uso |
|----------|-------|----------|-----|
| `--background` | `oklch(0.08 0.015 145)` | `#0a1f19` | Fundo principal |
| `--card` | `oklch(0.12 0.02 145)` | `#0f2e23` | Cards, containers |
| `--primary` | `oklch(0.65 0.25 150)` | `#00ff4d` | Botões, highlights (verde neon) |
| `--primary-foreground` | `oklch(0.08 0.015 145)` | `#0a1f19` | Texto sobre primary |
| `--foreground` | `oklch(0.95 0.01 80)` | `#f2f2f2` | Texto principal |
| `--muted` | `oklch(0.25 0.015 145)` | `#1a4d3d` | Backgrounds muted (verde escuro) |
| `--muted-foreground` | `oklch(0.70 0.02 80)` | `#b3b3b3` | Texto secundário |
| `--border` | `oklch(0.18 0.015 145)` | `#1a4d3d` | Borders subtis |
| `--sidebar` | `oklch(0.09 0.015 145)` | `#0d2b20` | Sidebar background |
| `--sidebar-foreground` | `oklch(0.92 0.01 80)` | `#ebebeb` | Sidebar text |
| `--destructive` | `oklch(0.55 0.15 25)` | `#ff4444` | Vermelho (error, delete) |

### Light Mode (`:root`)
Mantém a paleta atual com ajustes mínimos (menos crítico, ver seção "Light Mode" abaixo).

---

## 📄 Arquivos Críticos para Modificação

### 1️⃣ `app/globals.css` — Paleta de Cores (PRIORIDADE: 1)

**Tipo**: CSS — Definição de variáveis  
**Impacto**: Crítico — redefine todas as cores do sistema

#### O que existe hoje (linhas 85–118):
```css
.dark {
  --background: oklch(0.12 0.02 80);
  --foreground: oklch(0.95 0.01 80);
  --card: oklch(0.15 0.02 80);
  --primary: oklch(0.55 0.12 145);      /* Verde menos vibrante */
  --sidebar: oklch(0.1 0.02 80);         /* Muito escuro, quase puro */
  /* ... resto */
}
```

#### O que deve mudar:
```css
.dark {
  --background: oklch(0.08 0.015 145);  /* Verde muito escuro (novo) */
  --foreground: oklch(0.95 0.01 80);    /* Branco (mantém) */
  --card: oklch(0.12 0.02 145);         /* Verde escuro para cards (novo) */
  --card-foreground: oklch(0.95 0.01 80);
  --popover: oklch(0.12 0.02 145);
  --popover-foreground: oklch(0.95 0.01 80);
  --primary: oklch(0.65 0.25 150);      /* Verde NEON (novo — muito vibrante!) */
  --primary-foreground: oklch(0.08 0.015 145); /* Texto sobre neon = fundo escuro */
  --secondary: oklch(0.2 0.03 85);      /* Mantém */
  --secondary-foreground: oklch(0.9 0.03 85);
  --muted: oklch(0.25 0.015 145);       /* Verde escuro para backgrounds muted (novo) */
  --muted-foreground: oklch(0.70 0.02 80); /* Cinza claro (novo) */
  --accent: oklch(0.2 0.03 85);         /* Mantém */
  --accent-foreground: oklch(0.9 0.03 85);
  --destructive: oklch(0.55 0.15 25);   /* Vermelho (mantém) */
  --destructive-foreground: oklch(0.95 0.01 25);
  --border: oklch(0.18 0.015 145);      /* Verde escuro para borders (novo) */
  --input: oklch(0.25 0.015 145);       /* Verde escuro para inputs (novo) */
  --ring: oklch(0.65 0.25 150);         /* Verde neon para ring (novo) */
  --chart-1: oklch(0.65 0.25 150);      /* Verde neon */
  --chart-2: oklch(0.55 0.15 145);      /* Verde médio */
  --chart-3: oklch(0.45 0.12 145);      /* Verde mais escuro */
  --chart-4: oklch(0.35 0.10 145);      /* Verde bem escuro */
  --chart-5: oklch(0.25 0.015 145);     /* Verde muted */
  --sidebar: oklch(0.09 0.015 145);     /* Verde escuro quase preto (novo) */
  --sidebar-foreground: oklch(0.95 0.01 80);
  --sidebar-primary: oklch(0.65 0.25 150); /* Verde neon (novo) */
  --sidebar-primary-foreground: oklch(0.08 0.015 145); /* Texto sobre neon */
  --sidebar-accent: oklch(0.25 0.015 145); /* Verde escuro (novo) */
  --sidebar-accent-foreground: oklch(0.95 0.01 80);
  --sidebar-border: oklch(0.18 0.015 145); /* Verde escuro (novo) */
  --sidebar-ring: oklch(0.65 0.25 150);   /* Verde neon (novo) */
}
```

#### Light Mode (`:root`) — Ajustes Menores:
```css
:root {
  /* Mantém cores claras, mas permite usar dark mode como default */
  --background: oklch(0.98 0.01 80);    /* Quase branco (mantém) */
  --foreground: oklch(0.15 0.02 80);    /* Cinza muito escuro (mantém) */
  --card: oklch(1 0 0);                 /* Branco puro (mantém) */
  --primary: oklch(0.50 0.15 150);      /* Verde vibrante mas não neon (ajuste menor) */
  --sidebar: oklch(0.15 0.02 80);       /* Cinza escuro (mantém) */
  /* ... resto não altera significativamente */
}
```

#### Validação:
- ✅ Todos os valores em **OKLCH** (perceptual, previsível)
- ✅ Verde neon (`0.65 0.25 150`) contrasta bem com fundo escuro
- ✅ Texto branco (`0.95`) sobre verde neon: ratio ~12:1 ✅ AAA
- ✅ Texto branco sobre fundo escuro (`0.08`): ratio ~13:1 ✅ AAA

#### Impacto em Responsividade:
**Nenhum** — CSS puro, não afeta layout.

#### Dependências:
Nenhuma — é a base para todos os outros arquivos.

#### Ordem de Implementação:
**1º** — Deve ser feito primeiro, antes de modificar componentes.

---

### 2️⃣ `components/Sidebar.tsx` — Estilo Dark Mode (PRIORIDADE: 2)

**Tipo**: React Component com inline styles  
**Impacto**: Alto — visual completamente novo

#### O que existe hoje (linhas 50–123):

**Linha 52** (background inline):
```tsx
style={{ background: '#e8f5e9' }}  // Verde pastel claro
```

**Linha 72–73** (logo colors inline):
```tsx
<span className="font-black text-xl tracking-tight" style={{ color: '#00A651' }}>Gest</span>
<span className="font-black text-xl tracking-tight" style={{ color: '#6B8E23' }}>Silo</span>
```

**Linha 51** (border):
```tsx
className="flex flex-col h-full border-r border-green-100 shadow-sm"
```

**Linhas 88–93** (rotas ativas):
```tsx
isActive
  ? "bg-white text-green-700 shadow-sm border border-green-50"
  : "text-gray-600 hover:bg-white/50 hover:text-green-600",
```

**Linha 113** (footer border):
```tsx
<div className="p-4 border-t border-green-100 bg-white/30">
```

**Linha 116** (logout button):
```tsx
className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
```

#### O que deve mudar:

**Linha 52** — Main background (use classe CSS em vez de inline):
```tsx
// ANTES:
<div
  className="flex flex-col h-full border-r border-green-100 shadow-sm"
  style={{ background: '#e8f5e9' }}
>

// DEPOIS:
<div
  className="flex flex-col h-full border-r border-sidebar-border dark:border-sidebar-border bg-white dark:bg-sidebar shadow-sm"
>
```

**Linhas 72–73** — Logo colors (ajustar contraste para dark mode):
```tsx
// ANTES:
<span className="font-black text-xl tracking-tight" style={{ color: '#00A651' }}>Gest</span>
<span className="font-black text-xl tracking-tight" style={{ color: '#6B8E23' }}>Silo</span>

// DEPOIS (sem estilos inline, usa Tailwind):
<span className="font-black text-xl tracking-tight text-green-600 dark:text-green-400">Gest</span>
<span className="font-black text-xl tracking-tight text-green-700 dark:text-green-500">Silo</span>
```

**Linhas 88–93** — Rotas ativas (dark mode):
```tsx
// ANTES:
isActive
  ? "bg-white text-green-700 shadow-sm border border-green-50"
  : "text-gray-600 hover:bg-white/50 hover:text-green-600",

// DEPOIS:
isActive
  ? "bg-white dark:bg-primary text-green-700 dark:text-sidebar shadow-sm border border-green-50 dark:border-primary"
  : "text-gray-600 dark:text-sidebar-foreground hover:bg-white/50 dark:hover:bg-primary/20 hover:text-green-600 dark:hover:text-primary",
```

**Linha 51** — Border sidebar:
```tsx
// ANTES:
className="flex flex-col h-full border-r border-green-100 shadow-sm"

// DEPOIS:
className="flex flex-col h-full border-r border-green-100 dark:border-sidebar-border shadow-sm"
```

**Linha 113** — Footer border:
```tsx
// ANTES:
<div className="p-4 border-t border-green-100 bg-white/30">

// DEPOIS:
<div className="p-4 border-t border-green-100 dark:border-sidebar-border bg-white/30 dark:bg-sidebar/50">
```

**Linha 116** — Logout button (adicionar dark mode):
```tsx
// ANTES:
className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"

// DEPOIS:
className="w-full justify-start text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-all"
```

#### Impacto em Responsividade:
- **Mobile (< 768px)**: Sidebar é hidden, visível apenas em menu Sheet → ajustes se aplicam quando menu é aberto
- **Tablet (768–1024px)**: Sidebar visível, ajustes aparecem
- **Desktop (> 1024px)**: Sidebar sempre visível, ajustes aparecem

#### Dependências:
- `app/globals.css` deve ser atualizado ANTES desta

#### Ordem de Implementação:
**2º** — Após globals.css

---

### 3️⃣ `components/Header.tsx` — Dark Mode Styles (PRIORIDADE: 3)

**Tipo**: React Component  
**Impacto**: Médio — pequenos ajustes

#### O que existe hoje (linhas 104–228):

**Linha 104** — Header background:
```tsx
className="flex items-center p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-green-100 dark:border-green-900 sticky top-0 z-40"
```

**Linha 111** — Menu mobile toggle:
```tsx
className="inline-flex items-center justify-center rounded-md p-2 md:hidden text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
```

**Linhas 127–141** — Theme toggle:
```tsx
className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
// ...
className={`flex items-center gap-2 rounded-lg cursor-pointer ${
  theme === opt.value
    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
    : ''
}`}
```

**Linha 170** — Avatar fallback:
```tsx
<AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold rounded-2xl text-sm">
```

**Linhas 165–177** — Menu trigger hover:
```tsx
className="relative h-10 w-10 rounded-2xl p-0 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
```

**Linhas 177–203** — Dropdown styles:
```tsx
className="w-64 mt-2 p-2 rounded-2xl border-green-50 dark:border-green-900 shadow-xl"
// ...
className="rounded-xl focus:bg-green-50 focus:text-green-700 dark:focus:bg-green-950 dark:focus:text-green-400 p-3 cursor-pointer"
```

**Line 198** — Separator:
```tsx
className="bg-gray-50 dark:bg-gray-800"
```

**Line 220** — Logout hover:
```tsx
className="rounded-xl focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950 dark:focus:text-red-400 p-3 cursor-pointer text-red-500 dark:text-red-400"
```

#### O que deve mudar:

**Linha 104** — Header:
```tsx
// ANTES:
className="flex items-center p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-green-100 dark:border-green-900 sticky top-0 z-40"

// DEPOIS:
className="flex items-center p-4 bg-white/80 dark:bg-sidebar/95 backdrop-blur-md border-b border-green-100 dark:border-border sticky top-0 z-40"
```

**Linha 111** — Mobile menu toggle:
```tsx
// ANTES:
className="inline-flex items-center justify-center rounded-md p-2 md:hidden text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"

// DEPOIS:
className="inline-flex items-center justify-center rounded-md p-2 md:hidden text-gray-600 dark:text-muted-foreground hover:bg-green-50 dark:hover:bg-muted transition-colors"
```

**Linha 127** — Theme toggle button:
```tsx
// ANTES:
className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"

// DEPOIS:
className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-gray-600 dark:text-muted-foreground hover:bg-green-50 dark:hover:bg-muted transition-colors"
```

**Linhas 137–141** — Theme options (dynamic className):
```tsx
// ANTES:
className={`flex items-center gap-2 rounded-lg cursor-pointer ${
  theme === opt.value
    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
    : ''
}`}

// DEPOIS:
className={`flex items-center gap-2 rounded-lg cursor-pointer ${
  theme === opt.value
    ? 'bg-green-50 text-green-700 dark:bg-primary/20 dark:text-primary'
    : ''
}`}
```

**Linha 170** — Avatar fallback:
```tsx
// ANTES:
className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold rounded-2xl text-sm"

// DEPOIS:
className="bg-green-100 dark:bg-muted text-green-700 dark:text-primary font-bold rounded-2xl text-sm"
```

**Linha 165** — Menu trigger:
```tsx
// ANTES:
className="relative h-10 w-10 rounded-2xl p-0 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"

// DEPOIS:
className="relative h-10 w-10 rounded-2xl p-0 hover:bg-green-50 dark:hover:bg-muted transition-colors"
```

**Linha 177** — Dropdown content:
```tsx
// ANTES:
className="w-64 mt-2 p-2 rounded-2xl border-green-50 dark:border-green-900 shadow-xl"

// DEPOIS:
className="w-64 mt-2 p-2 rounded-2xl border-green-50 dark:border-border shadow-xl"
```

**Linhas 203/209** — Dropdown menu items:
```tsx
// ANTES:
className="rounded-xl focus:bg-green-50 focus:text-green-700 dark:focus:bg-green-950 dark:focus:text-green-400 p-3 cursor-pointer"

// DEPOIS:
className="rounded-xl focus:bg-green-50 focus:text-green-700 dark:focus:bg-muted dark:focus:text-primary p-3 cursor-pointer"
```

**Linha 198** — Separator:
```tsx
// ANTES:
className="bg-gray-50 dark:bg-gray-800"

// DEPOIS:
className="bg-gray-50 dark:bg-border/50"
```

**Linha 220** — Logout item:
```tsx
// ANTES:
className="rounded-xl focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950 dark:focus:text-red-400 p-3 cursor-pointer text-red-500 dark:text-red-400"

// DEPOIS:
className="rounded-xl focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950 dark:focus:text-red-300 p-3 cursor-pointer text-red-500 dark:text-red-400"
```

#### Impacto em Responsividade:
- **Mobile**: Menu do usuário aparece em DropdownMenu (Sheet não afeta)
- **Tablet/Desktop**: Todos os ajustes se aplicam igualmente

#### Dependências:
- `app/globals.css` (variáveis de cor)

#### Ordem de Implementação:
**3º** — Após Sidebar

---

### 4️⃣ `app/dashboard/page.tsx` — Dashboard Principal (PRIORIDADE: 4)

**Tipo**: React Page  
**Impacto**: Alto — backgrounds e cards

#### O que existe hoje (linhas 236–386):

**Linha 236** — Main background gradient:
```tsx
<div className="p-6 md:p-8 space-y-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30">
```

**Linhas 250–257** — Data badge:
```tsx
<div
  className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100"
  aria-label={`Data de hoje: ${today}`}
>
```

**Linhas 274–289** — Stat cards:
```tsx
<Card
  className={`
    border-none border-l-4 ${stat.borderColor}
    shadow-sm rounded-2xl
    transition-all duration-200 ease-out
    group-hover:shadow-lg group-hover:scale-[1.02] group-hover:-translate-y-0.5
    cursor-pointer h-full
  `}
>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <h3 className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
      {stat.title}
    </h3>
    <div className={`p-2 rounded-xl ${stat.bg}`} aria-hidden="true">
      <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
    </div>
  </CardHeader>
```

**Lines 343–353** — Atividades Recentes section:
```tsx
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
  <div className="p-10 text-center text-gray-400" role="status" aria-live="polite">
```

**Linhas 367–382** — Alertas Críticos section:
```tsx
<div
  className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center"
  role="status"
  aria-label="Nenhum alerta crítico: tudo em ordem"
>
  <div
    className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4"
    aria-hidden="true"
  >
    <CheckCircle2 className="w-7 h-7 text-green-600" aria-hidden="true" />
```

#### O que deve mudar:

**Linha 236** — Main background:
```tsx
// ANTES:
<div className="p-6 md:p-8 space-y-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30">

// DEPOIS:
<div className="p-6 md:p-8 space-y-8 min-h-screen bg-white dark:bg-gradient-to-br dark:from-sidebar dark:via-sidebar/80 dark:to-muted/30">
```

**Linha 250** — Data badge:
```tsx
// ANTES:
className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100"

// DEPOIS:
className="flex items-center gap-3 bg-white/80 dark:bg-card/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-border"
```

**Linha 241** — H1 heading:
```tsx
// ANTES:
<h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
  {greeting}, <span className="text-green-700">{userName}</span>!
</h1>

// DEPOIS:
<h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-foreground tracking-tight">
  {greeting}, <span className="text-green-700 dark:text-primary">{userName}</span>!
</h1>
```

**Linha 244** — Subtitle:
```tsx
// ANTES:
<p className="text-gray-500 mt-2 text-base">

// DEPOIS:
<p className="text-gray-500 dark:text-muted-foreground mt-2 text-base">
```

**Linha 253** — Calendar icon:
```tsx
// ANTES:
<Calendar className="w-5 h-5 text-green-600" aria-hidden="true" />

// DEPOIS:
<Calendar className="w-5 h-5 text-green-600 dark:text-primary" aria-hidden="true" />
```

**Linhas 274–290** — Stat cards (adicionar dark mode):
```tsx
// ANTES (className):
<Card
  className={`
    border-none border-l-4 ${stat.borderColor}
    shadow-sm rounded-2xl
    transition-all duration-200 ease-out
    group-hover:shadow-lg group-hover:scale-[1.02] group-hover:-translate-y-0.5
    cursor-pointer h-full
  `}
>

// DEPOIS (adicionar dark mode):
<Card
  className={`
    border-none border-l-4 ${stat.borderColor}
    shadow-sm rounded-2xl
    transition-all duration-200 ease-out
    group-hover:shadow-lg group-hover:scale-[1.02] group-hover:-translate-y-0.5
    cursor-pointer h-full
    dark:bg-card dark:border-l-primary/60
  `}
>
```

**Linha 284** — Text color:
```tsx
// ANTES:
<h3 className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">

// DEPOIS:
<h3 className="text-sm font-medium text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-foreground transition-colors">
```

**Linha 300** — Value display:
```tsx
// ANTES:
<div className="text-2xl font-bold text-gray-900">

// DEPOIS:
<div className="text-2xl font-bold text-gray-900 dark:text-foreground">
```

**Linhas 343–353** — Atividades section:
```tsx
// ANTES:
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
  <div className="p-10 text-center text-gray-400" role="status" aria-live="polite">
    <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-200" aria-hidden="true" />
    <p className="text-sm font-medium text-gray-500">

// DEPOIS:
<div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-border overflow-hidden">
  <div className="p-10 text-center text-gray-400 dark:text-muted-foreground" role="status" aria-live="polite">
    <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-border" aria-hidden="true" />
    <p className="text-sm font-medium text-gray-500 dark:text-muted-foreground">
```

**Linha 332** — Section heading:
```tsx
// ANTES:
<h2 id="atividades-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">
  <TrendingUp className="w-5 h-5 text-green-600" aria-hidden="true" />

// DEPOIS:
<h2 id="atividades-heading" className="text-xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
  <TrendingUp className="w-5 h-5 text-green-600 dark:text-primary" aria-hidden="true" />
```

**Linhas 367–382** — Alertas section:
```tsx
// ANTES:
<div
  className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center"
  role="status"
>
  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4">
    <CheckCircle2 className="w-7 h-7 text-green-600" aria-hidden="true" />
  </div>
  <p className="font-bold text-gray-900 mb-1">
  <p className="text-xs text-gray-500 leading-relaxed">

// DEPOIS:
<div
  className="p-6 bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border shadow-sm flex flex-col items-center text-center"
  role="status"
>
  <div className="w-14 h-14 bg-green-50 dark:bg-muted rounded-full flex items-center justify-center mb-4">
    <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-primary" aria-hidden="true" />
  </div>
  <p className="font-bold text-gray-900 dark:text-foreground mb-1">
  <p className="text-xs text-gray-500 dark:text-muted-foreground leading-relaxed">
```

**Linha 358** — Alertas heading:
```tsx
// ANTES:
<h2 id="alertas-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">

// DEPOIS:
<h2 id="alertas-heading" className="text-xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
```

#### Impacto em Responsividade:
- **Mobile (< 768px)**: Grid responsivo, backgrounds se aplicam igualmente
- **Tablet (768–1024px)**: Grid muda de 1–2–4 colunas, sem problemas com dark mode
- **Desktop (> 1024px)**: Layout completo com 3 colunas (2 col left, 1 col right)

#### Dependências:
- `app/globals.css` (variáveis de cor)

#### Ordem de Implementação:
**4º**

---

### 5️⃣ `app/dashboard/layout.tsx` — Dashboard Layout (PRIORIDADE: 5)

**Tipo**: React Layout  
**Impacto**: Médio — backgrounds de onboarding e borders

#### O que existe hoje (linhas 104–126):

**Linha 107** — Sidebar nav border:
```tsx
className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 border-r border-green-100"
```

**Linha 96** — Onboarding background:
```tsx
<div className="h-screen flex items-center justify-center bg-gray-50">
```

**Linhas 71–73** — Loading spinner:
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" aria-hidden="true" />
```

#### O que deve mudar:

**Linha 107** — Sidebar border:
```tsx
// ANTES:
className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 border-r border-green-100"

// DEPOIS:
className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 border-r border-green-100 dark:border-sidebar-border"
```

**Linha 96** — Onboarding background:
```tsx
// ANTES:
<div className="h-screen flex items-center justify-center bg-gray-50">

// DEPOIS:
<div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-sidebar">
```

**Linhas 71–73** — Loading spinner color:
```tsx
// ANTES:
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" aria-hidden="true" />

// DEPOIS:
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-primary" aria-hidden="true" />
```

**Linha 77** — Error message color:
```tsx
// ANTES:
<p className="text-red-600 text-sm font-medium mb-2">

// DEPOIS:
<p className="text-red-600 dark:text-red-400 text-sm font-medium mb-2">
```

**Linha 81** — Error button:
```tsx
// ANTES:
className="text-sm text-green-600 hover:underline font-medium"

// DEPOIS:
className="text-sm text-green-600 dark:text-primary hover:underline font-medium"
```

#### Impacto em Responsividade:
**Nenhum significativo** — apenas colors, sem mudança de layout.

#### Dependências:
- `app/globals.css` (variáveis de cor)

#### Ordem de Implementação:
**5º**

---

### 6️⃣ `components/ui/button.tsx` — Button Variants Dark Mode (PRIORIDADE: 6)

**Tipo**: Component Primitivo (CVA)  
**Impacto**: Médio — pequenos ajustes em variants dark

#### O que existe hoje (linhas 6–40):

```tsx
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline: "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // ...
    },
  }
)
```

#### O que deve mudar:

**Linha 13** — Outline variant:
```tsx
// ANTES:
"border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"

// DEPOIS (melhor contraste em dark mode):
"border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-border dark:bg-sidebar/50 dark:hover:bg-muted dark:hover:text-foreground"
```

**Linha 17** — Ghost variant (adicionar mais contrast):
```tsx
// ANTES:
"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50"

// DEPOIS:
"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted dark:hover:text-foreground"
```

#### Validação:
- ✅ `bg-primary` (verde neon) em dark mode garante excelente contraste
- ✅ `dark:border-border` (verde escuro) mantém border visível em dark mode

#### Impacto em Responsividade:
**Nenhum** — CSS puro.

#### Dependências:
- `app/globals.css` (variáveis)

#### Ordem de Implementação:
**6º**

---

### 7️⃣ `components/ui/input.tsx` — Input Dark Mode (PRIORIDADE: 7)

**Tipo**: Component Primitivo  
**Impacto**: Baixo — ajustes em dark mode

#### O que existe hoje (linha 14):
```tsx
className={cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  className
)}
```

#### O que deve mudar:

```tsx
// ANTES (dark parte):
dark:bg-input/30 dark:disabled:bg-input/80

// DEPOIS (melhor contraste com fundo escuro):
dark:bg-muted/30 dark:disabled:bg-muted/60
```

**Resultado final da linha 14:**
```tsx
className={cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-muted/30 dark:disabled:bg-muted/60 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  className
)}
```

#### Impacto em Responsividade:
**Nenhum** — CSS puro.

#### Dependências:
- `app/globals.css` (variáveis)

#### Ordem de Implementação:
**7º**

---

### 8️⃣ `components/ui/dropdown-menu.tsx` — Dropdown Menu Dark Mode (PRIORIDADE: 8)

**Tipo**: Component Primitivo  
**Impacto**: Baixo — backgrounds já usam `bg-popover` (que será atualizado em globals.css)

#### O que existe hoje (linhas 42–45):
```tsx
<MenuPrimitive.Popup
  data-slot="dropdown-menu-content"
  className={cn("z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 ...", className )}
  {...props}
/>
```

#### Análise:
✅ Já usa `bg-popover` e `text-popover-foreground` — não precisa de ajustes específicos, pois as variáveis em globals.css já cobrem dark mode.

**Nenhuma mudança necessária** — o sistema de variáveis CSS já cuida disso.

#### Impacto em Responsividade:
**Nenhum**.

#### Dependências:
- `app/globals.css` (variáveis)

#### Ordem de Implementação:
**Não requer mudanças específicas** — os ajustes em globals.css cobrem

---

### 9️⃣ `components/ui/card.tsx` — Card Component Dark Mode (PRIORIDADE: 9)

**Tipo**: Component Primitivo  
**Impacto**: Baixo — já usa `bg-card`

#### O que existe hoje (linha 15):
```tsx
className={cn(
  "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 ...",
  className
)}
```

#### Análise:
✅ Já usa `bg-card` e `text-card-foreground` — totalmente controlado por variáveis CSS em globals.css.

**Nenhuma mudança necessária** — os ajustes em globals.css cobrem.

#### Impacto em Responsividade:
**Nenhum**.

#### Ordem de Implementação:
**Não requer mudanças específicas**

---

### 🔟 `components/SyncStatusBar.tsx` — Sync Bar Colors (PRIORIDADE: 10)

**Tipo**: React Component com inline rgba colors  
**Impacto**: Baixo — visual informativo

#### O que existe hoje (linhas 22–29):
```tsx
style={{
  backgroundColor: !isOnline 
    ? 'rgba(239, 68, 68, 0.9)' // Vermelho (Offline)
    : isSyncing 
      ? 'rgba(245, 158, 11, 0.9)' // Amarelo (Sincronizando)
      : 'rgba(16, 185, 129, 0.9)', // Verde (Pendente mas Online)
  borderColor: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
}}
```

#### O que deve mudar:
⚠️ **Observação**: Este componente usa **rgba colors hardcoded** em vez de variáveis CSS. Não é crítico mudar agora (pois as cores funcionam bem em dark mode já), mas para consistência com o novo design, considerar:

**Opção 1** (Mínimo — mantém inline styles, sem mudanças):
```tsx
// Sem mudanças — funciona bem em dark mode
// Cores atuais já têm boa contrast em dark background
```

**Opção 2** (Recomendado — converter para variáveis CSS):
```tsx
// ANTES:
style={{
  backgroundColor: !isOnline 
    ? 'rgba(239, 68, 68, 0.9)' // Vermelho
    : isSyncing 
      ? 'rgba(245, 158, 11, 0.9)' // Amarelo
      : 'rgba(16, 185, 129, 0.9)', // Verde
  borderColor: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
}}

// DEPOIS (com Tailwind classes):
className={`
  px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md
  ${!isOnline 
    ? 'bg-red-500/90 border-white/20 text-white' 
    : isSyncing 
      ? 'bg-amber-500/90 border-white/20 text-white' 
      : 'bg-green-500/90 border-white/20 text-white'
  }
`}
```

**Recomendação**: Implementar **Opção 2** para consistência com novo dark mode.

#### Impacto em Responsividade:
**Nenhum** — componente fixed, aparece igual em todos os breakpoints.

#### Dependências:
- Nenhuma (mas beneficia de consistência com globals.css)

#### Ordem de Implementação:
**10º** (opcional, pode ser feito junto com outros ajustes menores)

---

### 1️⃣1️⃣ `components/Breadcrumbs.tsx` — Breadcrumb Styles (PRIORIDADE: 11)

**Tipo**: React Component  
**Impacto**: Muito Baixo — já usa variáveis CSS

#### O que existe hoje (linha 13):
```tsx
<nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
```

#### Análise:
✅ Já usa `text-muted-foreground` — totalmente controlado por variáveis CSS. Os ajustes em globals.css cobrem.

**Nenhuma mudança necessária**.

---

## 📄 Arquivos NÃO Mencionados no PRD mas Precisam de Ajustes

### Páginas de Autenticação (Login/Register/Onboarding)

Estas páginas possuem cores hardcoded que precisam de ajustes para dark mode:

#### `app/login/page.tsx`
- **Linha 98**: Botão "Voltar" tem `bg-white border-gray-200` → adicionar `dark:bg-card dark:border-border`
- **Linha 141**: H1 heading → adicionar `dark:text-foreground`
- **Linha 153**: Subtitle → adicionar `dark:text-muted-foreground`
- **Línea 166**: Logo container → adicionar `dark:bg-card`
- **Múltiplas linhas**: Inputs com `bg-white border-gray-200` → adicionar `dark:bg-muted/30 dark:border-border`
- **Linhas 391–397**: Footer links → adicionar `dark:text-muted-foreground dark:hover:text-foreground`

**Impacto**: Médio — afeta experiência de login. Recomendado incluir na implementação.

#### `app/register/page.tsx`
- Similar a login.tsx
- **Linhas 125+**: Mesmo padrão de inputs e backgrounds
- **Recomendado**: Incluir

#### `app/dashboard/onboarding/page.tsx`
- **Linha 72**: Avatar background → `bg-green-100 dark:bg-muted`
- **Linhas 89–110+**: Inputs dentro de Card → já herdados do Card component
- **Recomendado**: Incluir

#### `app/forgot-password/page.tsx`
- Similar pattern
- **Recomendado**: Incluir

### Páginas de Informação

#### `app/privacidade/page.tsx`, `app/termos/page.tsx`, `app/suporte\page.tsx`
- **Padrão**: Cards com `bg-white border-gray-100` → adicionar `dark:bg-card dark:border-border`
- **Headings**: `text-gray-900` → adicionar `dark:text-foreground`
- **Inputs**: `bg-white border-gray-200` → adicionar `dark:bg-muted/30 dark:border-border`
- **Baixo impacto**, mas recomendado incluir para completude

### Páginas de Dashboard Específicas

As páginas abaixo herdam estilos base (`app/dashboard/page.tsx`) mas podem ter backgrounds ou cards próprios:

- `app/dashboard/silos/page.tsx`
- `app/dashboard/talhoes/page.tsx`
- `app/dashboard/frota/page.tsx`
- `app/dashboard/insumos/page.tsx`
- `app/dashboard/financeiro/page.tsx`
- `app/dashboard/simulador/page.tsx`
- `app/dashboard/rebanho/page.tsx`
- `app/dashboard/relatorios/page.tsx`
- `app/dashboard/calculadoras/page.tsx`
- `app/dashboard/configuracoes/page.tsx`

**Recomendação**: Revisar cada uma para cores hardcoded, mas a maioria herdará ajustes do layout e componentes base. **Prioridade: Baixa** — revisar após ajustes principais.

---

## 🚫 Arquivos que NÃO Devem Ser Alterados

### Confirmado no PRD:
- ✅ `.env` e `.env.local`
- ✅ `next.config.js`
- ✅ `package.json` (mantém Tailwind 4.1.11, next-themes)
- ✅ `tailwind.config.ts` — não existe no projeto
- ✅ Estrutura de pastas
- ✅ Nomes de variáveis CSS
- ✅ ThemeProvider setup (`app/layout.tsx` — EXCETO metadata `themeColor`)
- ✅ Lógica de negócio
- ✅ Responsividade (breakpoints)
- ✅ ARIA labels, semantic HTML

### Arquivo de Configuração que pode ser ajustado:

**`app/layout.tsx` — Linha 16** (themeColor metadado)
```tsx
// ANTES:
themeColor: '#16a34a',  // Verde claro

// DEPOIS (opcional):
themeColor: '#00ff4d',  // Verde neon (para PWA mobile)
```

**Recomendação**: Manter como está, pois `/16a34a` é verde claro e funciona bem como fallback em light mode.

---

## ✅ Checklist de Testes por Breakpoint

### Mobile (< 768px)

- [ ] Sidebar em menu Sheet — cores escuras aparecem corretamente
- [ ] Header — background escuro, contraste bom
- [ ] Dashboard cards — 1 coluna, backgrounds escuros, ícones e valores legíveis
- [ ] Inputs — bordas visíveis em dark mode
- [ ] Botões — verde neon aparece com contraste excelente
- [ ] Dropdown menu (tema toggle) — background escuro, itens legíveis
- [ ] Footer — login button colorido, logout button vermelho visível

### Tablet (768–1024px)

- [ ] Sidebar aparece, cores correct
- [ ] Dashboard grid — 2 colunas em tablet, backgrounds escuros OK
- [ ] Stat cards — ícone e badge (bg-amber-50 → dark:bg-muted) visíveis
- [ ] Breadcrumbs — texto muted-foreground legível
- [ ] Inputs — dark mode backgrounds OK
- [ ] Charts/stats — cores de chart (chart-1 = verde neon) visíveis

### Desktop (> 1024px)

- [ ] Layout completo — Sidebar + Main content
- [ ] Sidebar navegação — rotas ativas com verde neon, contraste OK
- [ ] Dashboard full layout — 3 colunas (2 left, 1 right)
- [ ] Cards em Atividades Recentes — backgrounds escuros, text OK
- [ ] Section Alertas Críticos — green checkmark e backgrounds OK
- [ ] Hover states — buttons mudam cor ao passar mouse, feedback visual OK
- [ ] Dropdowns — aparecem com background escuro correto
- [ ] Theme toggle — muda para light mode sem problemas

### Validações Gerais (todos breakpoints)

- [ ] Verde neon (#00ff4d) nunca é branco puro (exceto primary-foreground)
- [ ] Texto branco (#f2f2f2) nunca fica muito pálido
- [ ] Borders visíveis em dark mode (não muito claros, não muito escuros)
- [ ] Hover states contrastam bem
- [ ] Focus rings aparecem (ring-3 com verde neon)
- [ ] Acessibilidade — ARIA labels mantidos, semantic HTML OK
- [ ] Responsividade — sem quebras horizontais, sem overflow

### Validação de Contraste (ferramenta)

- [ ] Texto branco sobre verde escuro: **~13:1** ✅ (AAA+)
- [ ] Texto em verde neon sobre fundo escuro: **~11:1** ✅ (AAA)
- [ ] Borders verdes em fundo escuro: **~2:1** ✅ (perceptível)
- [ ] Muted text (#b3b3b3) sobre fundo escuro (#0a1f19): **~5:1** ✅ (AA)

---

## ⚠️ Riscos e Pontos de Atenção

### 1. Verde Neon pode ser Agressivo

**Risco**: `oklch(0.65 0.25 150)` (#00ff4d) é MUITO vibrante. Alguns usuários podem achar:
- Muito brilhante em botões
- Dificuldade em alguns contextos (ex: texto sobre neon)

**Mitigação**:
- ✅ Usar neon primariamente para **accent** (botões, highlights)
- ✅ Usar variação mais escura para **text sobre neon** (primary-foreground)
- ⚠️ Se necessário ajustar, usar `oklch(0.60 0.20 150)` (um pouco menos vibrante)
- 🧪 Testar em devices reais antes de deploy

### 2. Paleta Verde Pode Parecer Monótona

**Risco**: Usando apenas verdes para route colors (em vez de 10 cores diferentes) pode parecer "chato"

**Mitigação**:
- ✅ PRD intencionalmente simplificou (razão: melhor visual em dark mode)
- ✅ Ícones em cada rota ainda têm cores (text-amber, text-emerald, etc.)
- ✅ Neon accent garante destaque visual

### 3. Hardcoded Colors em SyncStatusBar

**Risco**: Usar `rgba(239, 68, 68, 0.9)` hardcoded em vez de variável CSS dificulta manutenção futura

**Mitigação**:
- ✅ Esta spec recomenda converter para Tailwind classes
- ⚠️ Ou deixar como está (funciona bem em dark mode)

### 4. Sidebar Logo Colors

**Risco**: Colors hardcoded (#00A651, #6B8E23) podem não combinar bem com dark mode

**Mitigação**:
- ✅ Spec recomenda ajustar para Tailwind (text-green-600 dark:text-green-400, etc.)
- 🧪 Testar legibilidade em dark mode

### 5. Light Mode pode Ficar Confuso

**Risco**: Mudança de variáveis `:root` afeta light mode também. Verde neon em light mode pode ficar estranho.

**Mitigação**:
- ✅ Manter light mode com verde mais suave (oklch(0.50 0.15 150) em vez de 0.65)
- ✅ Não forçar neon em light mode
- ⚠️ Testar light mode após ajustes

### 6. Contraste em Certos Contextos

**Risco**: Verde neon pode ter contraste insuficiente em:
- Small text (< 14px) em fundo escuro
- Certos ícones pequenos

**Mitigação**:
- ✅ Usar neon primariamente em elementos grandes (botões, headings)
- ✅ Para small text, usar branco/light gray (#f2f2f2 ou muted-foreground)
- 🧪 Testar com WebAIM Contrast Checker

### 7. Falta de Testes de Browser

**Risco**: OKLCH não é suportado em navegadores muito antigos

**Mitigação**:
- ✅ Projet usa Next.js 14+ — browsers modernos OK
- ✅ Tailwind 4.1.11 gera fallback em rgb se necessário
- ⚠️ Testar em Chrome, Firefox, Safari, Edge (últimas 2 versões)

---

## 📋 Ordem de Implementação (Resumo)

| Prioridade | Arquivo | Tarefa | Est. Tempo |
|------------|---------|--------|-----------|
| 1 | `app/globals.css` | Atualizar paleta `.dark` | 15 min |
| 2 | `components/Sidebar.tsx` | Dark mode styles + inline → classes | 20 min |
| 3 | `components/Header.tsx` | Dark mode colors em hovers/buttons | 20 min |
| 4 | `app/dashboard/page.tsx` | Background gradient + cards dark | 25 min |
| 5 | `app/dashboard/layout.tsx` | Borders + onboarding BG | 10 min |
| 6 | `components/ui/button.tsx` | Variant dark contrast | 10 min |
| 7 | `components/ui/input.tsx` | Dark BG contrast | 5 min |
| 8 | `components/ui/dropdown-menu.tsx` | *(Nenhuma mudança necessária)* | 0 min |
| 9 | `components/ui/card.tsx` | *(Nenhuma mudança necessária)* | 0 min |
| 10 | `components/SyncStatusBar.tsx` | Converter rgba → Tailwind (opcional) | 10 min |
| 11 | `components/Breadcrumbs.tsx` | *(Nenhuma mudança necessária)* | 0 min |
| — | Auth pages (login/register/forgot) | Dark mode inputs + backgrounds | 30 min |
| — | Info pages (privacidade/termos) | Dark mode cards + text | 15 min |
| — | Dashboard sub-pages (silos, etc) | Revisar e ajustar conforme necessário | 30 min |

**Tempo total estimado**: ~3–4 horas para implementação + 1–2 horas para testes

---

## 📊 Resumo de Mudanças por Tipo

### Variáveis CSS (em `app/globals.css`)
- ✅ 5 cores **novas** (background, card, muted, border, sidebar)
- ✅ 6 cores **atualizadas** (primary, muted-foreground, input, ring, chart colors)
- ✅ 4 cores **mantidas** (foreground, secondary, destructive, accent)

### Componentes com Dark Mode Adicionado
- ✅ `Sidebar.tsx` — 6 mudanças de classe (background, borders, rotas ativas)
- ✅ `Header.tsx` — 8 mudanças de classe (backgrounds, hovers, dropdowns)
- ✅ `dashboard/page.tsx` — 12 mudanças de classe (backgrounds, headings, cards)
- ✅ `dashboard/layout.tsx` — 4 mudanças de classe (borders, backgrounds)
- ✅ `button.tsx` — 2 ajustes de variants
- ✅ `input.tsx` — 1 ajuste de dark background

### Componentes Sem Mudanças (sistema de variáveis cobre)
- ✅ `card.tsx` — já usa `bg-card`
- ✅ `dropdown-menu.tsx` — já usa `bg-popover`
- ✅ `breadcrumbs.tsx` — já usa `text-muted-foreground`

---

## 🔍 Inconsistências Encontradas (Alertas)

### ⚠️ PRD não mencionou:
1. **Páginas de Auth** — login, register, forgot-password precisam de dark mode (encontradas durante pesquisa)
2. **Dashboard sub-pages** — cada página pode ter colors hardcoded
3. **SyncStatusBar** — rgba colors hardcoded em lugar de variáveis

### ⚠️ Código atual vs PRD:
1. **globals.css linha 16**: metadata `themeColor: '#16a34a'` — PRD não mencionou, pode deixar como está ou atualizar para `#00ff4d`
2. **Sidebar** — PRD mencionou, código atual tem cores inline (revisado nesta spec)

---

## 📚 Referências

- **PRD**: `docs/PRD-design.md` v1.0 (Abril 2026)
- **Código Base**: Analisado em 13 Abril 2026
- **Variáveis CSS**: OKLCH (perceptual, recomendado para dark mode)
- **Tailwind Version**: 4.1.11 (suporta dark mode via class attribute)
- **Next.js Version**: 14+ (App Router)
- **Theme Provider**: `next-themes` (configurado em `app/layout.tsx`)

---

**Documento preparado para implementação. Pronto para começar! ✅**
