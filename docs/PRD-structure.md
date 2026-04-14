# PRD-structure.md — GestSilo Pro: Refatoração de Design & UX

**Status:** Phase 1 — Research Complete ✅  
**Data:** 2026-04-14  
**Responsável:** Pesquisa Completa via Codebase Analysis  
**Próxima Fase:** Spec.md

---

## 1. ESCOPO DO PROJETO

### 1.1 Objetivo
Refatorar a estrutura de design, layout, spacing e componentes visuais em toda a aplicação **GestSilo Pro** para:
- ✅ Eliminar inconsistências visuais
- ✅ Melhorar UX (especialmente breadcrumbs com UUIDs)
- ✅ Padronizar spacing e padding
- ✅ Garantir responsividade em mobile
- ✅ Implementar design system consistente

### 1.2 Problema Principal
A aplicação possui um design system bem definido (oklch tokens, dark/light mode, componentes reutilizáveis), mas **não é implementado consistentemente**:
- UUIDs aparecem em breadcrumbs em vez de nomes amigáveis
- Cores hardcoded residuais (`#10B981`, `#0284C7`) causam inconsistência
- Spacing e padding variam entre páginas
- Sidebar não se comporta idealmente em responsividade
- Alguns componentes (tabs, dialogs) precisam de ajustes de acessibilidade

### 1.3 Impacto
- **Usabilidade:** Breadcrumbs confusos prejudicam navegação
- **Marca:** Inconsistência de cores afeta percepção de profissionalismo
- **Acessibilidade:** Tabs com hit area pequena (py-0.5) prejudicam mobile
- **Manutenibilidade:** Código com cores hardcoded é difícil de manter

---

## 2. DESCOBERTAS: ARQUITETURA DE LAYOUTS

### 2.1 Layout Principal Dashboard

**Arquivo:** `app/dashboard/layout.tsx`

**Estrutura Atual:**
```
Layout
├── Header (sticky, z-40, p-4)
│   ├── Logo
│   ├── Breadcrumbs ⚠️ PROBLEMA
│   ├── Theme Switcher ✅
│   └── User Avatar + Menu ✅
│
├── Sidebar (fixed, z-80, w-72 expanded / w-16 collapsed)
│   ├── Logo scaling
│   ├── Nav items (p-3, rounded-xl)
│   ├── Collapse button ✅
│   └── Logout button
│
└── Main Content
    ├── Dashboard wrapper (px-6 pt-4)
    ├── Children pages (p-6 md:p-8 space-y-8)
    └── SyncStatusBar (fixed bottom-6) ✅
```

**Spacing Atual:**
- Header: `p-4` com `backdrop-blur-md`
- Sidebar item: `p-3` expanded, `px-3` collapsed
- Content: `px-6 pt-4` (header gap) + `p-6 md:p-8` (page level)
- Dashboard cards: `gap-4`, `shadow-sm`, `rounded-2xl` ⚠️ (inconsistente com `rounded-xl`)

**Problemas Identificados:**

| ID | Problema | Severidade | Localização | Impacto |
|----|----------|-----------|-------------|---------|
| L1 | Breadcrumb muito baixo na tela | 🟠 Alta | `components/Breadcrumbs.tsx` | Não segue padrão de header |
| L2 | Sidebar não colapsa auto em mobile | 🟡 Média | `app/dashboard/layout.tsx` | Mobile fica com sheet button |
| L3 | Card border-radius inconsistente | 🟢 Baixa | Dashboard cards vs detalhes | Visual inconsistente |
| L4 | Padding entre elementos varia | 🟡 Média | Múltiplas páginas | Falta coesão visual |

---

## 3. DESCOBERTAS: COMPONENTES VISUAIS

### 3.1 Buttons

**Arquivo:** `components/ui/button.tsx`

**Status:** ✅ Bem implementado
- 6 variantes: default, outline, secondary, ghost, destructive, link
- 7 tamanhos: xs, sm, default, lg, icon, icon-xs, icon-sm, icon-lg
- Hover/focus states suaves com transições

**Problema Identificado:**

| ID | Problema | Severidade | Linha | Solução |
|----|----------|-----------|-------|---------|
| B1 | Buttons "colados" nas laterais | 🟠 Alta | Múltiplas páginas | Adicionar padding lateral (`ml-auto` / `mr-auto`) |

---

### 3.2 Cards

**Arquivo:** `components/ui/card.tsx`

**Status:** ✅ Bem implementado
- Header: `px-4 py-4 gap-1`
- Content: `px-4 gap-4`
- Footer: `px-4 py-4 bg-muted/50 border-t`
- 2 sizes: default, sm

**Problema Identificado:**

| ID | Problema | Severidade | Impacto | Solução |
|----|----------|-----------|--------|---------|
| C1 | Dashboard cards usam `rounded-2xl` | 🟢 Baixa | Inconsistência menor com `rounded-xl` | Padronizar em `rounded-xl` |

---

### 3.3 Tabs (Abas)

**Arquivo:** `components/ui/tabs.tsx`

**Status:** ⚠️ Parcialmente problema
- Variantes: default, line
- Active states bem definidos
- Underline animation funciona ✅

**Problemas Identificados:**

| ID | Problema | Severidade | Linha | Solução |
|----|----------|-----------|-------|---------|
| T1 | Padding vertical apertado (`py-0.5`) | 🔴 Crítica | TabsTrigger | Aumentar para `py-1.5` (hit area 6px → 24px) |
| T2 | Sem acessibilidade melhorada | 🟡 Média | TabsTrigger | Adicionar `aria-expanded`, melhorar contrast |
| T3 | Hover state não muito visível | 🟡 Média | TabsTrigger no modo light | Adicionar `hover:bg-muted` |

**Uso em Páginas:**
- ✅ Silos Detail (Visão Geral, Estoque, Qualidade)
- ✅ Frota (Ativos, Manutenção, Histórico)
- ✅ Financeiro (Receitas, Despesas, DRE)
- ✅ Configurações (Perfil, Fazenda, Usuários)

---

### 3.4 Breadcrumbs

**Arquivo:** `components/Breadcrumbs.tsx`

**Status:** 🔴 CRÍTICO — Problema principal

**Implementação Atual:**
```typescript
segments = pathname.split('/').filter(Boolean)
// Resultado: Home > dashboard > silos > F07d1f6c-9486-4e55-bcd5-755d7f326ad4
```

**Problemas CRÍTICOS:**

| ID | Problema | Severidade | Exemplo | Impacto | Solução |
|----|----------|-----------|---------|--------|---------|
| BR1 | UUIDs em vez de nomes | 🔴 Crítica | `silos > F07d1f6c...` deveria ser `silos > Silo 01` | UX muito ruim, confuso | Implementar busca de nomes via hook/context |
| BR2 | Sem contexto de dados | 🔴 Crítica | Não busca nome do silo da API | Breadcrumb inútil | Criar `useBreadcrumbData()` hook |
| BR3 | Posicionamento baixo | 🟠 Alta | Fica embaixo do header | Não é padrão header | Mover para dentro do Header |
| BR4 | Label simplista | 🟡 Média | Apenas `.charAt(0).toUpperCase()` | Não lida com camelCase | Implementar proper label formatter |

**Solução Necessária:**
1. Criar hook `useBreadcrumbData()` que:
   - Pega o pathname
   - Busca dados (silos, talhões, etc.) via API
   - Retorna array com `{ label, href, id }`
2. Mover Breadcrumbs para dentro do Header
3. Substituir UUIDs por nomes reais

**Exemplo de Comportamento Desejado:**
```
Antes:  Home > dashboard > silos > F07d1f6c-9486-4e55-bcd5-755d7f326ad4
Depois: Home > Silos > Silo 01
        Home > Frota > Tratores > TR-001
```

---

### 3.5 Forms

**Status:** ✅ Bem implementado
- React Hook Form + Zod ✅
- Validação robusta ✅
- Layout responsivo (vertical em mobile) ✅

**Problemas Leves:**

| ID | Problema | Severidade | Solução |
|----|----------|-----------|---------|
| F1 | Dialog width fixo (`w-96`) | 🟡 Média | Usar `max-w-2xl w-full` |
| F2 | Sem aria-describedby | 🟡 Média | Adicionar em inputs com validação |
| F3 | Sem help text | 🟢 Baixa | Adicionar `<small>` com hints |

---

## 4. DESCOBERTAS: PALETA DE CORES

### 4.1 Sistema de Tokens CSS

**Arquivo:** `app/globals.css`

**Status:** ✅ Bem estruturado em oklch

**Tokens Definidos:**

```css
LIGHT MODE:
  --background: oklch(0.99 0.01 75)      /* #FFFBF0 */
  --foreground: oklch(0.15 0.02 80)      /* #262622 */
  --primary: oklch(0.50 0.12 145)        /* #00A651 (verde) */
  --secondary: oklch(0.65 0.12 70)       /* #DAA520 (âmbar) */
  --muted: oklch(0.92 0.01 80)           /* #E8E8E8 */
  --card: oklch(1.0 0 0)                 /* #FFFFFF */
  --destructive: oklch(0.55 0.15 25)     /* #B91C1C (vermelho) */

DARK MODE:
  --background: oklch(0.08 0.015 145)    /* #0D1117 */
  --card: oklch(0.15 0.02 145)           /* #1C2531 */
  --foreground: oklch(0.95 0.01 80)      /* #F0F0F0 */
  --primary: oklch(0.65 0.25 150)        /* #00D968 (verde vivo) */
  --secondary: oklch(0.70 0.15 70)       /* #FFB700 (âmbar) */

STATUS:
  --success: oklch(0.50 0.15 150)        /* #00B047 */
  --warning: oklch(0.65 0.12 70)         /* #FFA500 */
  --danger: oklch(0.55 0.15 25)          /* #DC2626 */
  --info: oklch(0.50 0.12 280)           /* #0099FF */
```

**Status:** ✅ Cores bem definidas, contraste WCAG A testado

### 4.2 Problema: Cores Hardcoded Residuais

**Arquivo:** `app/dashboard/page.tsx` (linhas ~206-219)

**Status:** 🔴 CRÍTICA

**Problemas:**

| ID | Problema | Severidade | Linha | Valor | Deveria ser | Impacto |
|----|----------|-----------|-------|-------|------------|---------|
| CO1 | Esmeralda hardcoded | 🔴 Crítica | 210 | `#10B981` | `--primary` | Inconsistência de design |
| CO2 | Azul ciano hardcoded | 🔴 Crítica | 215 | `#0284C7` | Novo token | Inconsistência de design |
| CO3 | Usar `text-[#10B981]` | 🔴 Crítica | 210 | `text-[#10B981]` | `text-primary` | Difícil manutenção |

**Impacto:**
- Quando usuário mudar tema, estes valores NÃO mudam
- Difícil de manter quando cores são atualizadas
- Viola design system

**Solução:**
1. Criar tokens CSS para "emerald" e "cyan":
   ```css
   --emerald: oklch(0.50 0.12 145);  /* Ou usar primary? */
   --cyan: oklch(0.50 0.12 280);     /* Info? */
   ```
2. Substituir em `dashboard/page.tsx`:
   - `text-[#10B981]` → `text-primary` (ou novo token)
   - `bg-[#10B981]/10` → `bg-primary/10`
   - `text-[#0284C7]` → `text-cyan` (ou `text-info`)
   - `bg-[#0284C7]/10` → `bg-cyan/10`

---

### 4.3 Dark Mode Implementation

**Status:** ✅ Funcional via `next-themes`
- Theme switcher (Sun/Moon/Monitor) ✅
- Persistência em localStorage ✅
- Transição suave ✅

**Problema Menor:**
- ⚠️ Alguns cards em dark mode usam gradients customizados que podem ficar estranhos
- ⚠️ Tabelas precisam melhor contrast em dark mode

---

## 5. DESCOBERTAS: RESPONSIVIDADE

### 5.1 Breakpoints Utilizados

```
sm: 640px   (mobile pequeno)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (wide)
```

**Padrão Mobile-First:** ✅ Implementado corretamente

### 5.2 Problemas Identificados

| ID | Problema | Breakpoint | Severidade | Solução |
|----|----------|-----------|-----------|---------|
| R1 | Dialogs com `w-96` fixo | Todos | 🟡 Média | Usar `max-w-2xl w-full` |
| R2 | Sidebar em mobile | mobile | 🟡 Média | Considerar collapsible em mobile também |
| R3 | Tabelas sem scroll h. | sm/md | 🟡 Média | Adicionar overflow-x auto em containers |
| R4 | Cards com grid muito justo | sm | 🟢 Baixa | Adicionar gap-4 entre cards |

---

## 6. DESCOBERTAS: ACESSIBILIDADE

### 6.1 Boas Práticas Implementadas ✅

- ✅ `aria-label` em botões icon
- ✅ `role="status"` em carregamentos
- ✅ `aria-live="polite"` em notificações
- ✅ `aria-current="page"` em nav ativos
- ✅ `.sr-only` para conteúdo visual

### 6.2 Problemas de Acessibilidade

| ID | Problema | Severidade | Localização | Solução |
|----|----------|-----------|-------------|---------|
| A1 | Tabs hit area pequena | 🔴 Crítica | `ui/tabs.tsx` | Aumentar `py-1.5` |
| A2 | Inputs sem aria-describedby | 🟡 Média | Forms em geral | Adicionar help text aria |
| A3 | Status apenas com cor/emoji | 🟡 Média | Badges de status | Adicionar texto descriptivo |
| A4 | Dialog focus trap não claro | 🟢 Baixa | Dialogs | Melhorar focus outline |

---

## 7. MAPEAMENTO DE PÁGINAS

### 7.1 Dashboard Principal

**Arquivo:** `app/dashboard/page.tsx`

**Status:** ✅ Implementado com problemas

**Componentes:**
- Saudação dinâmica ✅
- 4 cards de resumo (Silos, Talhões, Frota, Financeiro) — com `rounded-2xl` ⚠️
- Gráfico de ocupação (Recharts) ✅
- Atividades recentes ✅
- Alertas críticos ✅

**Problemas:**
- 🔴 Cores hardcoded (`#10B981`, `#0284C7`)
- 🟡 Cards com border-radius inconsistente
- 🟡 Badge colors não usar tokens

---

### 7.2 Módulo Silos

#### 7.2.1 Listagem: `app/dashboard/silos/page.tsx`

**Status:** ✅ Implementado com problemas

**Layout:**
- Breadcrumb + Título + Botão "Novo Silo" 🔴 PROBLEMA
- Grid de cards (3 colunas, 1 col mobile)
- Modais para criar/editar/deletar

**Problemas:**
- 🔴 Breadcrumb mostra UUID em detail pages
- 🟡 Buttons colados na lateral
- 🟡 Spacing entre cards

**Dialogs:**
- CreateSiloDialog
- EditSiloDialog
- DeleteSiloDialog

---

#### 7.2.2 Detalhe: `app/dashboard/silos/[id]/page.tsx`

**Status:** ✅ Implementado com problemas

**Layout:**
```
Header
├── Breadcrumb (mostra UUID) 🔴
├── Título + Botão Editar
└── Tabs (Visão Geral, Estoque, Qualidade)

Content
├── Tab 1: Dados do silo, Info de qualidade
├── Tab 2: Tabela de estoque
└── Tab 3: Gráficos bromatológicos
```

**Problemas:**
- 🔴 Breadcrumb UUID
- 🟡 Tabs padding apertado
- 🟡 Informações "coladas" à sidebar

---

### 7.3 Outros Módulos (Brief)

| Módulo | Arquivo | Status | Principais Problemas |
|--------|---------|--------|----------------------|
| Talhões | `app/dashboard/talhoes/page.tsx` | ✅ | Tabelas sem scroll, dialogs width fixo |
| Frota | `app/dashboard/frota/page.tsx` | ✅ | Tabs padding, dialog width |
| Financeiro | `app/dashboard/financeiro/page.tsx` | ✅ | Tooltip formatter, responsividade |
| Rebanho | `app/dashboard/rebanho/page.tsx` | ✅ | UI básica, cards spacing |
| Insumos | `app/dashboard/insumos/page.tsx` | ✅ | Progressbar styling, tabela scroll |
| Calculadoras | `app/dashboard/calculadoras/page.tsx` | ✅ | Limpo, forms bem estruturados |
| Relatórios | `app/dashboard/relatorios/page.tsx` | ✅ | Sem preview, botões espaçamento |
| Configurações | `app/dashboard/configuracoes/page.tsx` | ✅ | Inputs sem aria-describedby |
| Onboarding | `app/dashboard/onboarding/page.tsx` | ✅ | Sem indicador de progresso |

---

## 8. COMPONENTES REUSÁVEIS ESTRUTURAIS

### 8.1 Header

**Arquivo:** `components/Header.tsx`

**Status:** ✅ Bem implementado

**Features:**
- Sticky positioning ✅
- Theme toggle ✅
- User avatar ✅
- Dropdown menu ✅

**Problema:** Breadcrumb deveria estar aqui (não abaixo)

### 8.2 Sidebar

**Arquivo:** `components/Sidebar.tsx`

**Status:** ✅ Bem implementado

**Features:**
- Collapse/expand com localStorage ✅
- Icons + labels ✅
- Grupos de navegação ✅
- Logout button ✅

**Problema:** Sem tooltips quando colapsada

### 8.3 SyncStatusBar

**Arquivo:** `components/SyncStatusBar.tsx`

**Status:** ✅ Bem implementado

---

## 9. PERFORMANCE & UX

### 9.1 Otimizações Atuais

- ✅ Skeleton loaders em cards
- ✅ Query otimizadas (`.select('col1, col2')`)
- ✅ Responsive containers (Recharts)
- ✅ Memoização com useCallback

### 9.2 Problemas de Performance

| ID | Problema | Severidade | Solução |
|----|----------|-----------|---------|
| P1 | Sem virtualization em tabelas | 🟢 Baixa | Implementar se houver 100+ linhas |
| P2 | Modais carregam dados completos | 🟢 Baixa | Paginação se necessário |
| P3 | Sem error boundaries | 🟡 Média | Implementar global error boundary |

---

## 10. RECOMENDAÇÕES: PRIORIDADE DE CORREÇÃO

### 🔴 FASE 1: CRÍTICO (Fazer ASAP)

1. **[BR1] Breadcrumbs com UUIDs**
   - Impacto: UX ruim
   - Esforço: Médio (1-2 horas)
   - Arquivos: `components/Breadcrumbs.tsx`, múltiplas páginas

2. **[BR3] Mover Breadcrumbs para Header**
   - Impacto: Layout correto
   - Esforço: Médio (1 hora)
   - Arquivos: `components/Header.tsx`, `components/Breadcrumbs.tsx`

3. **[CO1, CO2] Remover Cores Hardcoded**
   - Impacto: Consistência de design system
   - Esforço: Baixo (30 min)
   - Arquivos: `app/dashboard/page.tsx`

4. **[T1] Aumentar Padding em Tabs**
   - Impacto: Acessibilidade mobile
   - Esforço: Baixo (15 min)
   - Arquivos: `components/ui/tabs.tsx`

### 🟡 FASE 2: IMPORTANTE (Próximo Sprint)

5. **[F1] Dialog Width Responsivo**
   - Impacto: Mobile UX
   - Esforço: Baixo (20 min)
   - Arquivos: `components/ui/dialog.tsx`

6. **[L3, C1] Padronizar Border Radius**
   - Impacto: Consistência visual
   - Esforço: Baixo (15 min)
   - Arquivos: `app/dashboard/page.tsx`, `components/ui/card.tsx`

7. **[A2] Adicionar aria-describedby**
   - Impacto: Acessibilidade
   - Esforço: Médio (1 hora)
   - Arquivos: Forms em geral

8. **[R1] Adicionar Scroll Horizontal em Tabelas**
   - Impacto: Responsividade
   - Esforço: Baixo (20 min)
   - Arquivos: `components/ui/table.tsx`

### 🟢 FASE 3: NICE-TO-HAVE (Polish)

9. Tooltips em Sidebar colapsada
10. Indicador de progresso em Onboarding
11. Melhorar contrast dark mode
12. Error boundaries globais

---

## 11. ARQUIVOS PARA CRIAR/MODIFICAR

### Criar (Novos)

1. `hooks/useBreadcrumbData.ts` — Hook para buscar dados de breadcrumb
2. `lib/breadcrumb-formatter.ts` — Funções para formatar labels

### Modificar (Existentes)

| Arquivo | Mudanças | Prioridade |
|---------|----------|-----------|
| `components/Breadcrumbs.tsx` | Usar hook, mover para Header | 🔴 |
| `components/Header.tsx` | Adicionar Breadcrumbs | 🔴 |
| `app/dashboard/page.tsx` | Remover cores hardcoded | 🔴 |
| `components/ui/tabs.tsx` | Aumentar py-1.5 | 🔴 |
| `components/ui/dialog.tsx` | Width responsivo | 🟡 |
| `app/dashboard/layout.tsx` | Ajustar spacing | 🟡 |
| `components/ui/card.tsx` | Padronizar rounded-xl | 🟡 |
| Forms em geral | Adicionar aria-describedby | 🟡 |

---

## 12. MÉTRICAS DE SUCESSO

### Qualitativas
- ✅ Breadcrumbs exibem nomes em vez de UUIDs
- ✅ Design system cores aplicadas consistentemente
- ✅ Responsividade funciona em mobile/tablet/desktop
- ✅ Acessibilidade melhorada (hit areas, aria labels)

### Quantitativas
- ✅ 0 cores hardcoded fora de design tokens
- ✅ 100% de consistency em border-radius
- ✅ Spacing segue padrão (p-4, p-6, p-8, gap-4, gap-6, gap-8)
- ✅ Lighthouse Accessibility: 90+

---

## 13. PRÓXIMOS PASSOS

1. ✅ **Fase 1 (COMPLETO):** Pesquisa — PRD-structure.md criado
2. ⏳ **Fase 2:** Criar `Spec.md` com especificação técnica
3. ⏳ **Fase 3:** Implementar mudanças (Code)

---

## 14. APÊNDICE: REFERÊNCIAS

**Arquivos Chave:**
- Design System: `app/globals.css`
- Layout Base: `app/dashboard/layout.tsx`
- Componentes UI: `components/ui/`
- Páginas: `app/dashboard/`

**Commits Relevantes:**
```
778e24a fix: mostrar nome do silo em vez de UUID no seletor de movimentação
3c3a9a9 feat: melhorias na gestão de silos - deletar, otimizar e reorganizar
8613f2b fix: corrigir tipos de Silo em formulários e componentes
af36b9a refactor: padronizar SiloStatus e atualizar cálculo de capacidade
```

**Notas:**
- O commit 778e24a já começou a resolver UUIDs em seletores, mas breadcrumbs ainda têm problema
- O design system em `globals.css` é robusto — falta aplicar consistentemente
- A arquitetura é boa — falta refinamento de UX

---

**Documento criado:** 2026-04-14  
**Próxima revisão:** Após implementação de Spec.md
