# PRD — Redesign Dark Mode GestSilo-Pro

**Versão**: 1.0  
**Data**: Abril 2026  
**Objetivo**: Transformar GestSilo-Pro em um dark mode inspirado no app de plantas "Nature Your Plant", com paleta verde escura + verde neon, maximizando contraste e modernidade.

---

## 1. Objetivo Geral

Migrar o GestSilo-Pro de um design light/claro com verde pastel para um **dark mode agressivo com verde muito escuro como base e verde neon como accent**, inspirado no design do app de plantas. O resultado final deve:

- ✅ Ser visualmente coeso e moderno
- ✅ Manter excelente contrast ratio (WCAG AA+)
- ✅ Facilitar a leitura em ambientes com pouca luz
- ✅ Criar forte identidade visual com verde escuro + neon
- ✅ Reduzir strain ocular para uso prolongado

---

## 2. Paleta de Cores Nova

### **Cores Base (Dark Mode Padrão)**

| Elemento | OKLCH Atual | OKLCH Novo | Hex Aproximado | Uso |
|----------|------------|-----------|----------------|-----|
| **Background** | `oklch(0.98 0.01 80)` | `oklch(0.08 0.015 145)` | `#0a1f19` | Fundo da página |
| **Card/Container** | `oklch(1 0 0)` | `oklch(0.12 0.02 145)` | `#0f2e23` | Cards, containers |
| **Primary (Accent)** | `oklch(0.45 0.1 145)` | `oklch(0.65 0.25 150)` | `#00ff4d` | Botões, links, highlights |
| **Primary Foreground** | `oklch(0.98 0.01 145)` | `oklch(0.08 0.015 145)` | `#0a1f19` | Texto em botões green |
| **Foreground (Texto)** | `oklch(0.15 0.02 80)` | `oklch(0.95 0.01 80)` | `#f2f2f2` | Texto principal |
| **Muted** | `oklch(0.92 0.03 85)` | `oklch(0.25 0.015 145)` | `#1a4d3d` | Backgrounds muted |
| **Muted Foreground** | `oklch(0.45 0.05 85)` | `oklch(0.70 0.02 80)` | `#b3b3b3` | Texto secundário |
| **Border** | `oklch(0.85 0.03 85)` | `oklch(0.18 0.015 145)` | `#1a4d3d` | Borders subtis |
| **Sidebar Background** | `oklch(0.2 0.02 80)` | `oklch(0.09 0.015 145)` | `#0d2b20` | Sidebar fundo |
| **Sidebar Text** | `oklch(0.95 0.01 80)` | `oklch(0.92 0.01 80)` | `#ebebeb` | Sidebar texto |

### **Cores Secundárias (Mantém existentes com ajustes)**

| Elemento | Uso |
|----------|-----|
| `#ff4444` | Destructive (erro, delete) |
| `#ffaa00` | Warning/Alert (amber) |
| `#4488ff` | Info (sky) |
| Verdes complementares | Manter multicolor routes, mas darker |

### **Sistema de Cores por Rota (Simplificado)**

Em vez de 10 cores diferentes, reduzir para variações de verde:

```
Dashboard    → Verde médio (#00ff4d ou #00d946)
Silos        → Verde escuro (#1a4d3d)
Planejador   → Verde escuro (#1a4d3d)
Simulador    → Verde neon (#00ff4d)
Calculadoras → Verde neon (#00ff4d)
Talhões      → Verde médio (#00d946)
Insumos      → Verde escuro (#1a4d3d)
Frota        → Verde médio (#00d946)
Financeiro   → Verde neon (#00ff4d)
Relatórios   → Verde médio (#00d946)
```

---

## 3. Mudanças por Componente

### **3.1 Arquivo: `app/globals.css`**

**Mudanças:**
- Atualizar `:root` (light mode) para fundo mais claro e accent mais vibrante
- Atualizar `.dark` com nova paleta OKLCH acima
- Adicionar override para `@media (prefers-color-scheme: dark)` para forçar dark por default

**Impacto:** Alto — redefine todas as cores do sistema

```css
/* Antes */
:root {
  --background: oklch(0.98 0.01 80);
  --primary: oklch(0.45 0.1 145);
  --sidebar: oklch(0.2 0.02 80);
}

/* Depois */
:root {
  --background: oklch(0.95 0.01 80);
  --primary: oklch(0.60 0.20 150);
  --sidebar: oklch(0.15 0.02 80);
}

.dark {
  --background: oklch(0.08 0.015 145);
  --primary: oklch(0.65 0.25 150);
  --sidebar: oklch(0.09 0.015 145);
  /* ... resto da paleta */
}
```

---

### **3.2 Arquivo: `components/Sidebar.tsx`**

**Mudanças:**
- Remover background verde claro (`#e8f5e9`) → usar novo dark green
- Atualizar cores de texto para branco/light gray
- Manter logotipo, mas ajustar contraste
- Rotas: remover background branco em ativo → verde neon com fundo dark
- Footer (logout): manter red para destructive

**Detalhes:**

```tsx
/* Antes */
style={{ background: '#e8f5e9' }} // Light green

/* Depois */
className="bg-sidebar dark:bg-sidebar" // Usa nova variável

/* Rotas ativas */
// Antes: isActive ? "bg-white text-green-700"
// Depois: isActive ? "bg-primary text-sidebar dark:bg-primary dark:text-sidebar"
```

**Impacto:** Alto — visual radicalmente diferente

---

### **3.3 Arquivo: `components/Header.tsx`**

**Mudanças:**
- Fundo: `bg-white/80 dark:bg-gray-900/80` → `dark:bg-sidebar/95`
- Border: `border-green-100 dark:border-green-900` → `dark:border-border`
- Tema toggle: manter, mas styles atualizar para dark theme
- Avatar fallback: `bg-green-100 dark:bg-green-900` → `dark:bg-muted`
- Buttons hover: `hover:bg-green-50 dark:hover:bg-green-950` → `dark:hover:bg-muted`

**Impacto:** Médio — pequenos ajustes no visual

---

### **3.4 Arquivo: `app/dashboard/page.tsx`** (Dashboard principal)

**Mudanças:**
- Background gradient: `from-gray-50 via-white to-green-50/30` → `dark:from-sidebar via-sidebar/80 to-muted/30`
- Stat cards: adicionar `dark:bg-card dark:border-border` para contraste melhor
- Icons background: `bg-amber-50` → `dark:bg-muted`, manter cor do ícone
- Card borders: adicionar mais contraste

**Antes:**
```tsx
className="p-6 md:p-8 space-y-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30"
```

**Depois:**
```tsx
className="p-6 md:p-8 space-y-8 min-h-screen dark:bg-gradient-to-br dark:from-sidebar dark:via-sidebar/80 dark:to-muted/30"
```

**Impacto:** Alto — redefine visual da página principal

---

### **3.5 Arquivo: `app/dashboard/layout.tsx`**

**Mudanças:**
- Onboarding background: `bg-gray-50` → `dark:bg-sidebar`
- Loading spinner: manter verde, mas validar contraste
- Border sidebar: `border-green-100` → `dark:border-border`

**Impacto:** Baixo — apenas backgrounds

---

### **3.6 Componentes UI genéricos** (`components/ui/`)

**Card (`card.tsx`)**
- Já usa `bg-card` que será revertido — OK ✅

**Button (`button.tsx`)**
- Verificar variants:
  - `default`: OK com primária nova (verde neon)
  - `outline`: adicionar dark mode styles para border visível
  - `ghost`: manter dark:hover:bg-muted
  - `destructive`: OK, vermelho mantém visibility

**Input (`input.tsx`)**
- Ajustar `border-input dark:border-input` para novo border color
- Fundo: `dark:bg-input/30` → `dark:bg-muted/50`

**Dropdown / Dialog / Sheet**
- Backgrounds usar `bg-card` (novo dark green) ✅
- Borders usar `border-border` (new muted green) ✅

**Impacto:** Médio — pequenos ajustes em dark mode

---

### **3.7 Outros componentes**

**`components/Breadcrumbs.tsx`**
- Ajustar cores de texto se necessário
- Separator: usar novo `border-border`

**`components/SyncStatusBar.tsx`**
- Backgrounds e borders: usar novo sistema de cores

**Impacto:** Baixo — apenas ajustes de cor

---

## 4. Arquivos Afetados

### **🔴 Críticos (DEVEM ser atualizados)**
1. ✅ `app/globals.css` — Redefine todas as cores base
2. ✅ `components/Sidebar.tsx` — Visual completamente novo
3. ✅ `app/dashboard/page.tsx` — Backgrounds e cards
4. ✅ `app/layout.tsx` — ThemeProvider (verificar tema default)

### **🟡 Importantes (Devem ser revistos)**
5. `components/Header.tsx` — Estilos dark mode
6. `app/dashboard/layout.tsx` — Backgrounds
7. `components/ui/button.tsx` — Variants dark mode
8. `components/ui/input.tsx` — Dark mode styling
9. `components/ui/dropdown-menu.tsx` — Dark backgrounds
10. `components/ui/card.tsx` — Já suporta bg-card, OK

### **🟢 Menores (Possíveis tweaks)**
11. `components/Breadcrumbs.tsx`
12. `components/SyncStatusBar.tsx`
13. Páginas individuais (`silos`, `talhoes`, `financeiro`, etc.) — herdam estilos base

---

## 5. O QUE NÃO DEVE SER ALTERADO

### ❌ **Nunca tocar:**
- ✅ `.env` e `.env.local` — arquivo de configuração
- ✅ `next.config.js` — configuração Next.js
- ✅ `package.json` — dependências (manter Tailwind 4.1.11, next-themes)
- ✅ `tailwind.config.ts` — não existe no projeto, estilos vêm de globals.css + Tailwind default
- ✅ Estrutura de pastas (`app/`, `components/`, `lib/`, etc.)
- ✅ Nomes de variáveis CSS (--background, --primary, --sidebar, etc.) — já existem
- ✅ ThemeProvider setup (next-themes já está configurado)
- ✅ Lógica de negócio (queries, auth, estado)
- ✅ Responsividade (mobile/desktop breakpoints) — manter igual
- ✅ Acessibilidade (ARIA labels, semantic HTML)

### ⚠️ **Pode ser revisado, mas com cuidado:**
- Light mode (`:root`) — atualizar palette, mas manter funcional
- Cores de rota — simplificar para tons de verde, não remover
- Border radius — pode aumentar se necessário
- Shadows — podem ser aumentados para melhor profundidade em dark mode

---

## 6. Checklist de Implementação

- [ ] Atualizar `app/globals.css` com nova paleta OKLCH
- [ ] Testar light mode (`:root`) em navegador
- [ ] Testar dark mode (`.dark`) em navegador
- [ ] Atualizar `components/Sidebar.tsx` com estilos novos
- [ ] Atualizar `components/Header.tsx` com dark mode
- [ ] Revisar `components/ui/button.tsx` — variants dark
- [ ] Revisar `components/ui/input.tsx` — border e background dark
- [ ] Revisar `components/ui/dropdown-menu.tsx` — backgrounds
- [ ] Atualizar `app/dashboard/page.tsx` — backgrounds e cards
- [ ] Atualizar `app/dashboard/layout.tsx` — backgrounds
- [ ] Testar todas as páginas do dashboard em light e dark mode
- [ ] Validar contrast ratio (mínimo WCAG AA, ideal AAA)
- [ ] Testar em mobile e desktop
- [ ] Verificar overflow de backgrounds em sections

---

## 7. Notas Técnicas

### **OKLCH vs Hex**
- Usar OKLCH nas variáveis CSS (melhor percepção visual)
- Hex é apenas referência aproximada para comunica

ção

### **Dark Mode com next-themes**
- Já está configurado em `app/layout.tsx`
- Atributo `attribute="class"` — adiciona `.dark` ao `<html>`
- Default: `"system"` — respeita preferência do SO

### **Contrast Ratio**
- Texto branco (#f2f2f2) sobre fundo verde escuro (#0a1f19): ~13:1 ✅ (AAA)
- Verde neon (#00ff4d) em botões: validar, pode ser muito bright
- Se necessário, usar variações de green: `oklch(0.60 0.20 150)` em vez de 0.65

### **Validação**
Testar com ferramentas:
- Chrome DevTools — Accessibility panel
- WebAIM Contrast Checker
- Figma plugin ou online tool

---

## 8. Resultado Esperado

### **Antes (Atual)**
- Sidebar: luz verde pastel claro (#e8f5e9)
- Fundo: quase branco (oklch(0.98))
- Primary: verde médio padrão
- Feel: light, airy, pastel

### **Depois (Target)**
- Sidebar: verde escuro quase preto (#0d2b20)
- Fundo: verde muito escuro com tint (#0a1f19)
- Primary: verde neon super vibrante (#00ff4d)
- Texto: branco/light gray (#f2f2f2)
- Feel: dark, moderno, premium, inspired by "Nature Your Plant" app
- Contraste: excelente, sem eye strain

---

## 9. Alternativas Consideradas e Descartadas

| Opção | Razão Descartada |
|-------|------------------|
| Cinza/Preto puro (sem verde) | Perde identidade de brand agrícola |
| Verde pastel mantido | Não teria suficiente contrast em dark mode |
| Múltiplas cores de rota mantidas | Confuso em dark mode, melhor apenas verdes |
| Light mode removido | Preservar opção para usuários que preferem |

---

## 10. Próximos Passos (Futuro)

- [ ] Criar componentes de plant care specifics com verde neon como accent
- [ ] Adicionar dark mode toggle na Header (já existe)
- [ ] Implementar CSS animations (fade-in) em cards
- [ ] Testar em tablets e smartwatches (PWA)
- [ ] A/B test: dark mode novo vs. atual

---

**Documento finalizado em: Abril 2026**  
**Aprovação necessária antes de implementação**
