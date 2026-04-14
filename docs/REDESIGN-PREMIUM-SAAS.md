# Redesign Premium SaaS — GestSilo Pro

**Status:** Planejamento ✅ | Implementação ⏳  
**Data de Início:** 2026-04-13  
**Objetivo:** Elevar design visual do sistema em dark/light mode para padrão premium SaaS moderno (Linear/Vercel/Notion)

---

## 📊 Visão Geral

### Decisões do Usuário
- **Escopo:** Tudo (tokens globais + visual completo + correção de hardcoded colors)
- **Estilo:** Premium/SaaS moderno (gradientes sutis, sombras elegantes, tipografia forte)
- **Cores:** Manter verde agrícola (#00A651) mas refinar completamente
- **Prioridade:** Sistema global primeiro (globals.css → estrutura → componentes → páginas)

### Problemas Atuais
- ❌ Paleta monótica, sem variação de depth
- ❌ Cores Tailwind hardcoded misturadas com tokens CSS (`text-sky-500`, `text-green-600`, `border-green-100`)
- ❌ Sem tokens de sombra, backdrop blur ou variantes tipográficas
- ❌ Dark mode pouco sofisticado (falta profundidade)
- ❌ Light mode subutilizado (padrão é dark)
- ❌ Login com gradiente inline `style={{background: 'linear-gradient...'}}`

---

## 🎯 Fases de Implementação

### Fase 1: System Tokens (globals.css)
**Status:** ⏳ Pendente  
**Prioridade:** 🔴 CRÍTICA (muda tudo atomicamente)

#### O que fazer:
- [x] Refinar paleta de cores oklch
  - Verde primário light: `oklch(0.50 0.12 145)` → mais vibrante
  - Verde primário dark: `oklch(0.65 0.25 150)` → mais rico
  - Cor secundária âmbar/dourada: `oklch(0.65 0.12 70)` para badges/charts
  - Melhorar background light: `oklch(0.99 0.01 75)` (mais quente)
  - Melhorar background dark: criar 5 níveis (bg → sidebar → card → input → muted)

- [ ] Adicionar tokens de **sombra** (shadow utilities)
  ```css
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  ```

- [ ] Adicionar tokens de **backdrop** blur
  ```css
  --blur-sm: blur(4px);
  --blur-md: blur(8px);
  --blur-lg: blur(12px);
  ```

- [ ] Adicionar **hierarchy tipográfica** (opcional, via Tailwind)
  - `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`
  - `--font-weight-light`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`

#### Arquivos:
- `app/globals.css` — reescrever blocos `:root` e `.dark`

#### Testes:
- [ ] Dev server: `npm run dev`
- [ ] Verificar light mode em todas as páginas
- [ ] Verificar dark mode em todas as páginas
- [ ] Contrast WCAG A em ambos os modos

---

### Fase 2: Estrutura (Sidebar + Header)
**Status:** ⏳ Pendente  
**Prioridade:** 🟡 ALTA (navegação principal)

#### Sidebar.tsx
- [ ] Remover array `colors` das rotas
- [ ] Ícones monocromáticos por padrão (`sidebar-foreground`)
- [ ] Item ativo com gradiente: `bg-gradient-to-r from-primary/20 to-primary/10`
- [ ] Adicionar separadores visuais entre grupos:
  - **Operacional:** Dashboard, Silos, Talhões, Planejador, Simulador, Calculadoras
  - **Ferramentas:** Insumos, Frota, Financeiro, Relatórios
  - **Sistema:** Configurações
- [ ] Logo com `text-foreground` (sem `text-green-600` hardcoded)
- [ ] Usar apenas tokens: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-border`

#### Header.tsx
- [ ] Remover hover colors hardcoded (`hover:bg-green-50`, `hover:text-green-600`)
- [ ] Usar `hover:bg-muted dark:hover:bg-muted/80`
- [ ] Avatar border com `border-primary/20`
- [ ] Dropdown items com `focus:bg-muted`
- [ ] Theme toggle com icones refinados (Sun/Moon/Monitor)

#### Arquivos:
- `components/Sidebar.tsx`
- `components/Header.tsx`

#### Testes:
- [ ] Sidebar colapsível funciona
- [ ] Ícones com cores corretas em light/dark
- [ ] Hover states suaves
- [ ] Header sticky, backdrop blur visível
- [ ] Mobile menu (Sheet) funciona

---

### Fase 3: Componentes UI (shadcn/ui)
**Status:** ⏳ Pendente  
**Prioridade:** 🟡 MÉDIA (refinamento)

#### Componentes a melhorar:
- [ ] `components/ui/card.tsx` — adicionar `shadow-lg` default
- [ ] `components/ui/button.tsx` — refinar variants com sombras:
  - `default`: shadow-md, hover:shadow-lg
  - `destructive`: ring-red/20 no focus
  - `outline`: border-primary/50
- [ ] `components/ui/input.tsx` — focus ring com `ring-primary/30`
- [ ] `components/ui/badge.tsx` — suportar variant "amber" para destacar
- [ ] `components/ui/dialog.tsx` — adicionar backdrop blur

#### Opcionais (criar novos):
- [ ] `gradient-button.tsx` — para CTAs principais (gradiente verde)

#### Arquivos:
- `components/ui/card.tsx`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/badge.tsx`
- `components/ui/dialog.tsx`

#### Testes:
- [ ] Todos os button variants em light/dark
- [ ] Card com sombra em light/dark
- [ ] Input focus ring correto
- [ ] Badge amber visível em ambos os modos

---

### Fase 4: Páginas Principais
**Status:** ⏳ Pendente  
**Prioridade:** 🟢 MÉDIA-BAIXA (visual final)

#### Pages a refatorar (remover cores hardcoded):
- [ ] `app/login/page.tsx`
  - Remover `style={{background: 'linear-gradient...'}}`
  - Usar tokens de sombra em inputs e cards
  - Focus ring com token `--ring`

- [ ] `app/dashboard/page.tsx`
  - Remover `text-green-600`, `border-l-amber-500`, `bg-amber-50` hardcoded
  - Stat cards com `shadow-md` e `hover:shadow-lg`
  - Usar tokens para variant colors via CSS variables

- [ ] `app/dashboard/silos/page.tsx`
  - Remover `text-amber-500`, `text-emerald-500`, etc.
  - Usar badges com variant "amber", "emerald" via tokens

- [ ] `app/dashboard/financeiro/page.tsx`
  - Remover cores Tailwind em TabsList, badges
  - Usar tokens para cores de estado

- [ ] Outras páginas (talhões, frota, relatorios, etc.)
  - Audit completo: buscar por `text-*-`, `bg-*-`, `border-*-` hardcoded
  - Substituir por tokens

#### Arquivos:
- `app/login/page.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/silos/page.tsx`
- `app/dashboard/talhoes/page.tsx`
- `app/dashboard/frota/page.tsx`
- `app/dashboard/insumos/page.tsx`
- `app/dashboard/financeiro/page.tsx`
- `app/dashboard/relatorios/page.tsx`
- `app/dashboard/calculadoras/page.tsx`
- `app/dashboard/simulador/page.tsx`
- `app/dashboard/rebanho/page.tsx`
- `app/dashboard/configuracoes/page.tsx`

#### Testes:
- [ ] Login em light/dark
- [ ] Dashboard com stat cards e activity feed
- [ ] Silos com cards e tabela
- [ ] Talhões com mapa
- [ ] Financeiro com gráficos e tabelas
- [ ] Verificar que nenhuma cor Tailwind hardcoded permanece visível
- [ ] Contraste WCAG A em todas as páginas

---

## 📝 Checklist de Execução

### Pré-Requisitos
- [ ] Branch criada: `feature/dark-mode-redesign` ✅ (já existe)
- [ ] Plano documentado ✅ (este arquivo)

### Fase 1
- [ ] globals.css atualizado com novas cores oklch
- [ ] Tokens de sombra adicionados
- [ ] Dev server rodando sem erros
- [ ] Light e dark mode testados visualmente

### Fase 2
- [ ] Sidebar.tsx refatorado (sem hardcoded colors)
- [ ] Header.tsx refatorado (sem hardcoded colors)
- [ ] Separadores de menu visíveis
- [ ] Mobile menu funciona

### Fase 3
- [ ] card.tsx com shadow-lg
- [ ] button.tsx variants refinados
- [ ] input.tsx com ring correto
- [ ] badge.tsx com variant amber
- [ ] Todos os componentes testados em light/dark

### Fase 4
- [ ] Login redesenhado (sem inline styles)
- [ ] Dashboard com token colors
- [ ] Silos página com tokens
- [ ] Financeiro com tokens
- [ ] Audit completo do codebase (grep por `text-*-500`, `bg-*-`, `border-*-`)
- [ ] Build: `npm run build` sem erros
- [ ] Lint: `npm run lint` sem warnings

### Final
- [ ] Teste completo em light/dark mode
- [ ] WCAG A contrast em todas as páginas
- [ ] Responsividade em mobile, tablet, desktop
- [ ] PR criada com descrição detalhada
- [ ] Code review + aprovação
- [ ] Merge para main

---

## 🎨 Paleta Proposta (Preview)

### Light Mode
| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | `oklch(0.50 0.12 145)` | Verde principal (buttons, links, active states) |
| `--secondary` | `oklch(0.65 0.12 70)` | Âmbar/dourada (badges, charts, accent) |
| `--background` | `oklch(0.99 0.01 75)` | Fundo da página (off-white quente) |
| `--card` | `oklch(1 0 0)` | Fundo de cards (branco puro) |
| `--foreground` | `oklch(0.15 0.02 80)` | Texto principal |
| `--muted` | `oklch(0.88 0.02 80)` | Bg secundário, disabled |
| `--destructive` | `oklch(0.55 0.15 25)` | Vermelho para ações destrutivas |

### Dark Mode
| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | `oklch(0.65 0.25 150)` | Verde vibrante |
| `--secondary` | `oklch(0.70 0.15 70)` | Âmbar mais claro |
| `--background` | `oklch(0.08 0.015 145)` | Fundo (quase preto esverdeado) |
| `--sidebar` | `oklch(0.12 0.02 145)` | Sidebar (cinza esverdeado) |
| `--card` | `oklch(0.15 0.02 145)` | Cards (cinza esverdeado mais claro) |
| `--input` | `oklch(0.20 0.02 145)` | Inputs (cinza esverdeado) |
| `--muted` | `oklch(0.25 0.015 145)` | Muted text, icons |
| `--foreground` | `oklch(0.95 0.01 80)` | Texto (quase branco) |
| `--destructive` | `oklch(0.55 0.15 25)` | Vermelho |

---

## 📚 Referências

- **Tailwind v4 + oklch:** Usando space de cor perceptualmente uniforme
- **next-themes:** Dark mode via classe `.dark` com `attribute="class"`
- **shadcn/ui:** Componentes base-nova (@base-ui/react)
- **Design System:** Inspiração em Linear, Vercel, Notion

---

## 🚀 Próximos Passos

1. ✅ Plano criado
2. ⏳ User aprova plano
3. ⏳ **Fase 1:** Implementar globals.css
4. ⏳ **Fase 2:** Refatorar Sidebar + Header
5. ⏳ **Fase 3:** Melhorar componentes UI
6. ⏳ **Fase 4:** Redesenhar páginas
7. ⏳ Teste completo + PR

---

## 📖 Notas de Desenvolvimento

### Comandos úteis
```bash
# Rodar dev server
npm run dev

# Build de produção
npm run build

# Lint
npm run lint

# Verificar cores hardcoded
grep -r "text-\(sky\|amber\|emerald\|rose\|indigo\|lime\|blue\|green\|orange\|purple\)" app/ components/

grep -r "bg-\(green\|amber\|gray\|white\)-" app/ components/

grep -r "border-\(green\|amber\|gray\|border\)-" app/ components/
```

### Tips
- Use `@apply` no CSS para aplicar classes Tailwind aos tokens
- Sempre testar em light **e** dark mode
- Usar DevTools para inspecionar variáveis CSS (`:root` e `.dark`)
- Verficar acessibilidade: color contrast no Chrome DevTools

---

**Última atualização:** 2026-04-13  
**Próxima revisão:** Após Fase 1
