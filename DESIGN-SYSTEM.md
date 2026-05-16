# GestSilo Design System

**Premium SaaS Dashboard for Agricultural Management** — Dark theme, real-time silo monitoring, livestock feed management, and predictive analytics for Brazilian agtech market.

---

## Project Context

**GestSilo** is a dashboard-driven SaaS platform designed for agricultural operations in Brazil. The system monitors multiple silos (silage storage), tracks fermentation quality, manages livestock feed distribution, and provides predictive alerts for inventory rupture, optimal feeding, and silage degradation.

The design system reflects a premium, operational aesthetic: data-heavy but elegant, with semantic color coding for quick decision-making, and sophisticated dark-mode treatment with green-accented interface elements.

### Provided Assets
- `uploads/gestsilo-design-system-prompt.md` — Complete brand guidelines and component specifications
- `uploads/gestsilo-v3.html` — Dashboard reference implementation (6 silos, KPIs, line/bar/donut charts, alert card)
- `uploads/gestsilo-silo-detail.html` — Silo detail screen (occupancy ring, quality parameters, timeline, forecast)
- `uploads/logo.png`, `logo_degrad-*.png` — Brand logomark and wordmark variations

---

## Visual Identity

### Color Palette

| Name | Value | Purpose |
|---|---|---|
| **Primary Green** | `#00c45a` | Action, success, normal operation, open/active state |
| **Alert Gold** | `#f5d000` | Warning, attention, compacting, capacity attention |
| **Info Blue** | `#4aaae6` | Information, filling, analysis, secondary action |
| **Critical Red** | `#e05454` | Error, rupture warning, critical state |
| **Dark BG** | `#161616` | Global background |
| **Dark BG2** | `#1c1c1c` | Page content background |
| **Dark BG3** | `#222222` | Elevated content background |
| **Sidebar** | `#0a140d` | Navigation sidebar |
| **Text Primary** | `#dceede` | Main text |
| **Text Muted** | `#688070` | Secondary text, labels |
| **Text Faint** | `#2a4433` | Tertiary, separators |

All colors exist as CSS custom properties (see `colors_and_type.css`). Semantic usage:
- **Occupancy < 30%** → Blue (filling phase)
- **Occupancy 30–80%** → Green (normal operation)
- **Occupancy 81–92%** → Gold (attention/compacting)
- **Occupancy > 92%** → Red (critical)
- **MS within range** → Green
- **MS below range** → Gold
- **Acid (butyric) high** → Red

### Typography

- **Font Family:** Satoshi (from fontshare.com)
- **Weights:** 400, 500, 600, 700, 900
- **Import:** `https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,900&display=swap`
- **Rendering:** `-webkit-font-smoothing: antialiased`

#### Type Scales

| Component | Tailwind / Size | Weight | Letter-spacing | Usage |
|---|---|---|---|---|
| Page Title (h1) | text-2xl / 1.375rem | 900 | -0.03em | Dashboard/screen headers |
| KPI Value | text-3xl / 1.875rem | 900 | -0.04em | Large KPI numbers in bold |
| Card Title (h2) | text-base / 1rem | 700 | -0.01em | Card headers |
| Body/Tables/Nav/KPI Sublabel | text-sm / 0.875rem (14px) | 400–700 | normal | Standard body, table cells, nav items, KPI sublabels — **MÍNIMO REQUERIDO** |
| Section Label/Badge/Small | text-xs / 0.75rem (12px) | 700 | +0.1em–0.15em | Uppercase labels, badges, notes inline — APENAS uppercase |

**Critical Rule**: Minimum text-sm (14px) for all copy. Use text-xs only for UPPERCASE labels, badges, and inline notes. **Never use arbitrary px/rem values inline** (`text-[12px]`, `text-[0.8rem]`, etc.) — always use Tailwind classes.

**Base Font Size**: Browser default (16px). No `html { font-size }` rebase. Tailwind units (text-sm = 14px, text-xs = 12px) derive from this base.

---

## Content Fundamentals

### Tone & Voice
- **Operational & Direct:** No fluff. Every label serves a purpose.
- **Portuguese (PT-BR):** All copy in Brazilian Portuguese; metric system (tons, percentages, days).
- **Shorthand for Clarity:** "Silo 01", "Milho", "Aberto", "Crítico" — single words where possible.
- **Action-Oriented:** Buttons and alerts use imperative form ("Registrar Fornecimento", "Ver todos").
- **Precision Over Warmth:** Numbers always include units (t, %, °C, pH).

### Casing & Formatting
- **Labels:** UPPERCASE with high letter-spacing (e.g., "ESTOQUE ATUAL", "MATÉRIA SECA")
- **Headings:** Title case (e.g., "Histórico de Estoque")
- **Badges/Tags:** UPPERCASE + semantic color
- **Timestamps:** "Hoje · 06:30", "28/04/26" (DD/MM/YY format)

### Emoji & Special Characters
- **No emoji** in primary UI
- **Unicode symbols:** Arrows (→, ↑, ↓), dots (·) as separators, › for breadcrumbs
- **Icons:** SVG stroke icons (14–26px, 1.5–2px stroke weight) or subtle SVG illustrations

### Copy Examples
- "Silo 01 — Ruptura em 4 dias" (alert)
- "MS 31,4% · pH 3,8 · Score A+" (parameter summary)
- "Estoque crítico: 17 t restantes. Taxa de consumo 4,8 t/d." (alert description)
- "Abertura após 85 dias de fermentação · 368 t compactadas" (timeline event)

---

## Visual Foundations

### Backgrounds & Surfaces
- **Global BG:** Solid `#161616` (charcoal dark, signature for refined look)
- **Content BG (bg2):** `#1c1c1c` (slightly lighter for page content)
- **Elevated BG (bg3):** `#222222` (used for overlays, modals, elevated surfaces)
- **Sidebar:** `#0a140d` (green-tinted, navigation identity)
- **Cards/Panels:** Semi-transparent white (`rgba(255,255,255,0.033)`) with subtle border
- **Hover/Elevation:** Slight transparency increase to `rgba(255,255,255,0.052)` + shadow enhancement
- **No gradients** in backgrounds; all surfaces are solid or semi-transparent
- **Sidebar glow:** Subtle gradient from green to transparent at top (non-interactive)
- **Visual signature:** `.bg-metal` class identifies the design system via dark charcoal base

### Shadows & Depth
- **Card shadow:** `0 2px 8px rgba(0,0,0,.28), 0 8px 28px rgba(0,0,0,.16)` — layered, soft
- **KPI shadow:** `0 2px 6px rgba(0,0,0,.3), 0 6px 24px rgba(0,0,0,.18)` — slightly stronger
- **Button shadow (primary):** `0 0 0 1px rgba(0,196,90,.45), 0 4px 20px rgba(0,196,90,.22)` — green glow
- **Sidebar shadow (inset):** `inset -1px 0 0 rgba(255,255,255,.05), 4px 0 32px rgba(0,0,0,.45)` — subtle edge + soft drop
- **All shadows:** Black-based RGBA, never white or color-based
- **No blur-heavy shadows** — max opacity ~0.35

### Borders
- **Default border:** `1px solid rgba(255,255,255,0.065)` — very subtle
- **Stronger border:** `1px solid rgba(255,255,255,0.105)` — on interactive elements
- **Semantic borders:** Color-specific `rgba(COLOR,0.2)` for hovered/focused states
- **No heavy borders** — all are low-opacity for a "floating" feel

### Shimmer & Polish
- **Card shimmer line:** `::before` element at top: `1px linear-gradient(90deg, transparent, rgba(255,255,255,.055), transparent)` — adds premium feel
- **Glow effects:** Subtle `box-shadow: 0 0 16px rgba(0,196,90,.28)` on icons, accent elements
- **No harsh edges** — all cards/buttons use `border-radius: 13px` (cards) or `8px` (buttons)

### Animations & Transitions
- **Default transition:** `all 0.14s ease` — snappy but refined
- **Blink animation (alerts):** `opacity 1 → 0.3 → 1, 2s infinite` — calm pulsing
- **Progress bars:** `transition: width 0.6s ease` — smooth fill animation on load
- **No bounce or elastic easing** — all transitions are linear or ease-in-out
- **Hover states:** Border color shift to semantic color + shadow enhancement, +opacity on text

### Imagery & Illustrations
- **No hand-drawn SVG illustrations** — instead, use placeholder blocks or geometric shapes
- **Icons:** Inline SVG with `stroke` (not fill) for consistency with UI weight
- **Color treatment:** All imagery muted or monochrome; no vibrant photography
- **Charts:** Chart.js with custom styling (see below)

### Chart Styling
- **Line charts:** `tension: 0.12` (nearly linear, analytical), points with 2px white border + colored fill
- **Bar charts:** Gradient fills (top color opaque, bottom transparent), `borderRadius: 7`, no grid on Y-axis
- **Doughnut/Ring:** `cutout: 73–76%`, no borders, soft animation
- **Tooltip:** Dark background `rgba(6,11,8,0.95)`, green border, subtle padding
- **Grid lines:** Only on Y-axis, low opacity `rgba(255,255,255,0.03)`
- **Data labels:** Above bars, font 10px Satoshi, muted color

### Hover & Interactive States
- **Cards:** Border → semantic color, shadow → glow effect
- **Buttons (primary):** Slight scale (`transform: scale(1.02)`), shadow enhancement
- **Buttons (ghost):** Opacity → 0.8, border → lighter
- **Form inputs (focus):** Border → green, `box-shadow: 0 0 0 3px var(--green-dim)`
- **Nav items (active):** Background + border + color change + subtle glow
- **Table rows (hover):** Background → `rgba(255,255,255,.015)`

### Spacing System
- **Padding (page):** `1.375rem 1.5rem`
- **Padding (card body):** `0.9375rem 1.125rem` (header) / `0.75rem 1.125rem` (body)
- **Gap (sections):** `1.125rem`
- **Gap (grid):** `0.875rem` (cards), `0.8rem` (KPI), `0.75rem` (rings)
- **Border radius (cards):** `13px`
- **Border radius (buttons/inputs):** `8px`
- **Border radius (tags):** `9999px`

### Corner Radii
- **Large elements (cards, modals):** `--radius: 13px`
- **Medium elements (buttons, badges):** `--radius-sm: 8px`
- **Small/pill elements (tags, badges):** `border-radius: 9999px`

---

## Component Architecture

### Core Patterns
1. **Card**: Surface container with shimmer line, optional header/body split, shadow
2. **KPI Card**: Semantic-colored bar accent at base, icon badge, large number value with unit
3. **Ring Chart**: Doughnut showing occupancy %, color-coded by range, center text
4. **Button (Primary)**: Green background, dark text, green glow shadow
5. **Button (Ghost)**: Transparent background, muted text, border
6. **Badge**: Semantic color + semantic dot, uppercase, rounded pill
7. **Timeline**: Vertical flow with colored dots, connecting line, event title/description
8. **Alert Card**: Gold/semantic background, animated header dot, list of alert items
9. **Table**: Uppercase headers, minimal borders, hover highlight, status badges
10. **Input/Select**: Semi-transparent surface, green focus ring, uppercase label

### Component Variations
- **Buttons:** Primary (green), Ghost (surface), Danger (red dim)
- **Badges:** Green (aberto/concluído), Gold (compactando/atenção), Blue (enchendo/análise), Red (crítico/ruptura)
- **Charts:** Line, Bar, Doughnut, Ring — all following color + animation rules above

---

## Layout Patterns

### Dashboard Grid
```
┌─────────────────────────────────────────────────────────────────┐
│ TOPBAR (52px, sticky, blur backdrop)                            │
├─────────┬───────────────────────────────────────────────────────┤
│SIDEBAR  │ MAIN (bg2, flex column, gap 1.125rem)               │
│(204px)  │                                                       │
│         │ KPI Row (4 cols) → Line chart (span 2) + Donut      │
│         │ + Alerts (right col) → Silo Rings (6 cols) → Table  │
└─────────┴───────────────────────────────────────────────────────┘
```

### Silo Detail Grid
```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb · Page Header                                    │
├──────────────────────┬──────────────────┬──────────────────┤
│ Stat Row (5 cols)                                           │
├──────────────────────┬──────────────────┬──────────────────┤
│ History (Line) (x2)  │ Occupancy Ring   │ Forecast Card    │
│ (span 2)             │                  │                  │
├──────────────────────┼──────────────────┴──────────────────┤
│ Quality Params (6)   │ MS Trend (line) + Timeline          │
└──────────────────────┴──────────────────────────────────────┘
```

---

## Iconography

### Icon System
- **Source:** Inline SVG (Lucide-style icons)
- **Stroke-based:** All icons drawn with `stroke`, not fill
- **Sizes:** 14px (nav), 26px (KPI badge), 15px (logo)
- **Stroke weight:** 1.5–2px
- **Colors:** Semantic colors matching icon context; opacity modulation for secondary icons
- **No emoji, no icon fonts** — pure SVG for precision

### Common Icons
- Dashboard (grid, 4 squares)
- Silos (house/building shape)
- Silagem (plant/leaf)
- Animais (person/users icon)
- Fornecimento (list/checklist)
- Relatórios (line chart)
- Estatísticas (bar chart)
- Configurações (gear)
- Silo storage (cylindrical shape)

---

## Usage Rules

### Mandatory Rules
1. **Never use colors outside the defined palette** — always use CSS custom properties
2. **No black borders in charts** — use `transparent` or `var(--bg)`
3. **Line chart tension max 0.18** — normally 0.12 for analytical feel
4. **Bar charts have no grid on Y** — `y.grid.display: false`
5. **All tooltips use TOOLTIP_DEFAULT object** — consistent styling across charts
6. **Sidebar always has shimmer line `::before` and glow gradient**
7. **Cards always have shimmer line `::before` at top**
8. **Labels always UPPERCASE with high letter-spacing**
9. **Important numbers always weight 900 with negative letter-spacing**
10. **No heavy box-shadows** — max rgba opacity 0.35

---

## Files in This System

- `app/globals.css` — **Source of Truth**: Applied theme, Tailwind overrides, dark-mode defaults
- `colors_and_type.css` — Reference specification: CSS variables, type scales, reset, component foundations
- `preview/` — Card samples for each category (type, colors, spacing, components)
- `assets/` — Logo files, icon assets
- `ui_kits/dashboard/` — Full dashboard UI kit (clickable, interactive)
- `SKILL.md` — Skill definition for use in Claude Code

---

**Last Updated:** May 2026  
**Status:** Foundation established, component library in progress
