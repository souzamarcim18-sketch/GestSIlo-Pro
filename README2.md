# Handoff: GestSilo Dashboard — Dark Mode

## Overview

Complete redesign of the GestSilo dashboard applying a dark-mode aesthetic inspired by modern fintech UX (LumenTrade style). The design balances high information density with visual hierarchy, using a vibrant mint-green accent against a near-black background.

**Key outcomes:**
- Prominent silo monitoring with progress bars and countdown timers
- Line chart showing production trends over 6 months
- Donut chart for silage distribution by crop
- Comprehensive activity log with user avatars and status badges
- Weather sidebar with 5-day forecast
- Alerts panel with semantic color coding
- Responsive KPI strip with sparklines

## About the Design Files

The bundled HTML file (`dashboard.html`) is a **high-fidelity design reference** — a pixel-perfect prototype showing the intended look, layout, interactions, and visual language. It is **not production code**.

Your task: **Recreate this UI in your Next.js 15 + shadcn/ui + Tailwind project** using:
- Your existing component library (shadcn/ui buttons, cards, tables, etc.)
- Your design tokens (colors, spacing, typography from your codebase)
- React 19 hooks and patterns
- Recharts for the line and donut charts
- Lucide React for icons (already in use)

The design should be pixel-perfect; extract exact colors, spacing, typography, and shadow values from the prototype and apply them to your Tailwind classes or component props.

## Fidelity

**High-fidelity (hifi).** All colors, typography, spacing, shadows, and border radii are final. Hover states, badges, and progress bars are fully styled. Treat this as a pixel-perfect spec.

## Screens / Views

### Dashboard (Single Page)

**Purpose:** Central hub for farm management. Real-time silo status, production trends, upcoming operations, alerts, and activity log.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar 230px]       [Main content area 1fr]               │
│                                                               │
│ Brand                 Header (greeting + search + notif)     │
│ Nav (5 items)         ─────────────────────────────────────  │
│ Nav divider                                                   │
│ Nav (3 items)         3x Hero Silo Cards (grid 3 cols)       │
│ Nav divider           ─────────────────────────────────────  │
│ Nav (2 items)         Line Chart (1.7fr) | Donut (1fr)       │
│ Upgrade CTA           ─────────────────────────────────────  │
│                       KPI Strip (6 cols) | Weather Sidebar   │
│                       ─────────────────────────────────────  │
│                       Operations List | Alerts               │
│                       ─────────────────────────────────────  │
│                       Activity Table                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components & Detailed Specs

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0B1410` | App background, near-black forest |
| `--panel` | `#121E18` | Card/panel background |
| `--panel-2` | `#17241D` | Hover/input elevated state |
| `--line` | `rgba(143,201,138,0.08)` | Subtle borders |
| `--line-2` | `rgba(143,201,138,0.14)` | Stronger borders |
| `--mint` | `#5FE3A1` | Primary accent, vibrant |
| `--mint-2` | `#3ECB8A` | Secondary accent |
| `--mint-soft` | `rgba(95,227,161,0.12)` | Soft backgrounds |
| `--mint-glow` | `rgba(95,227,161,0.45)` | Progress bar glow |
| `--text-1` | `#EAF2EB` | Primary text |
| `--text-2` | `#9AAB9E` | Secondary text |
| `--text-3` | `#627067` | Muted text |
| `--warn` | `#E5B969` | Warning state |
| `--warn-soft` | `rgba(229,185,105,0.12)` | Warning background |
| `--danger` | `#E07B6A` | Error/critical state |
| `--danger-soft` | `rgba(224,123,106,0.12)` | Error background |
| `--info` | `#7AB3DB` | Informational state |
| `--info-soft` | `rgba(122,179,219,0.12)` | Info background |

### Typography

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| Page title (h1) | Poppins | 22px | 700 | 1 | -0.01em |
| Card title | Poppins | 15px | 600 | 1 | -0.01em |
| Body text | Inter | 13px | 400/500 | 1.4 | 0 |
| Label (uppercase) | Inter | 10px | 600 | 1 | 0.08em |
| KPI value | Poppins | 22px | 700 | 1.1 | -0.02em |
| Silo card big number | Poppins | 15px | 600 | 1 | -0.01em |
| Chart label | Inter | 10px | 400 | 1 | 0 |
| Monospace (timer, table) | JetBrains Mono | 12–13px | 600 | 1 | 0.02em |

### Spacing Scale

- `4px` — smallest gaps (checkboxes, icon spacing)
- `6px` — tight spacing
- `8px` — button padding, small gaps
- `10px` — default gap inside cards
- `12px` — medium gaps
- `14px` — card padding, default gaps between sections
- `16px` — larger margins
- `18px` — card padding (top/bottom)
- `22px` — header padding, sidebar padding
- `24px` — main content padding left/right

### Border Radius

- `5px` — checkboxes, small elements
- `9px` — buttons, small pills
- `10px` — input fields, icon buttons, small cards
- `14px` — regular cards
- `16px` — main cards, larger elements
- `22px` — shell outer border (full page container)
- `999px` — fully rounded (pills, badges)

### Shadows

- `inset 0 0 0 1px rgba(143,201,138,0.18)` — subtle border glow
- `0 6px 18px rgba(95,227,161,0.3)` — CTA button glow
- `0 6px 18px rgba(95,227,161,0.25)` — softer glow
- `0 0 12px rgba(95,227,161,0.45)` — progress bar glow

---

## Component Specifications

### 1. **Sidebar**

**Dimensions:** 230px wide, sticky, full viewport height

**Sections:**

#### Brand
- Flex, gap 10px
- Logo: 28px × 28px
- Title: "GestSilo" (Poppins 16px 700 letter-spacing -0.01em)
- Farm name: "Fazenda Três Irmãos" (Inter 10px color: `--text-3`)
- Padding: 2px 8px 22px

#### Navigation Groups
- Each group has a label (eyebrow: `--text-3`, uppercase, 0.12em letter-spacing)
- Buttons: 9px padding, 11px gap to icon, border-radius 9px
- States:
  - **Default**: `--text-2`, transparent bg, hover → `--panel` bg
  - **Active (`.on`)**: `--mint-soft` bg, `--mint` color, font-weight 600, 1px inset box-shadow
- Icon: 16px × 16px, stroke-width 1.75
- Font: Inter 13px 500 (600 when active)

#### Upgrade CTA (bottom)
- Card: `--panel` bg, `--line` border, 14px border-radius, 16px padding
- Title: Poppins 14px 700 `--text-1`
- Copy: Inter 11px `--text-2`, line-height 1.4
- Button: `--mint` bg, `#062411` text, 8px padding, 999px border-radius, font-weight 700, box-shadow: `0 6px 18px rgba(95,227,161,0.3)`

---

### 2. **Header**

**Layout:** Flex, space-between, 22px padding top/bottom, 24px left/right

**Left:**
- Greeting: h1 (Poppins 22px 700), "Dashboard"
- Subheading: Inter 12px `--text-2`, contextual message

**Right:**
- Search input: 260px wide, `--panel` bg, `--line` border, 10px border-radius, 8px padding, icon 14px
- Bell icon button: 36px × 36px, `--line` border, `--panel` bg, with red dot indicator (6px, top 8px right 9px)
- Primary CTA button: `--mint` bg, `#062411` text, 8px padding, 999px radius, 13px font, icon 14px

---

### 3. **Hero Silo Cards** (3-column grid)

**Container:** grid-template-columns: repeat(3, 1fr), gap 14px

**Card:**
- `--panel` bg, `--line` border, 16px border-radius, 18px 20px padding
- Flex column, gap 14px

**Top Section:**
- Flex, space-between
- Icon + Title + Status pill
  - Icon: 34px × 34px, `--panel-2` bg, `--line` border, 10px radius, `--mint` color
  - Title: Poppins 15px 600 `--text-1`
  - Subtext: Inter 11px `--text-3`
  - Status pill: 
    - `.active`: `--mint-soft` bg, `--mint` color
    - `.warn`: `--warn-soft` bg, `--warn` color
    - `.danger`: `--danger-soft` bg, `--danger` color
    - Padding: 3px 10px, 999px radius, font-weight 600, font-size 10px

**Metrics:**
- Display 2 metrics (occupancy + MS%)
- Label: Inter 11px `--text-2`
- Value: Poppins 14px 600 `--text-1`, unit in smaller font
- Progress bar below each:
  - Height: 3px, `rgba(255,255,255,0.06)` bg, 999px radius
  - Fill: linear-gradient(90deg, rgba(95,227,161,0.3), `--mint`)
  - Glow: box-shadow `0 0 12px rgba(95,227,161,0.45)`
  - Endpoint dot: 6px circle, `--mint` color, filter blur(2px)

**Footer:**
- Flex, space-between, `--line` border top, 8px padding-top
- Timer: "Abertura em HH:MM:SS" monospace 13px 600 `--text-1`
- CTA button: `--mint` bg, `#062411` text, 6px 14px padding, 999px radius, font-weight 700, font-size 11px
- For danger card, button is `--danger` bg with white text

---

### 4. **Line Chart** (Production Trend)

**Container:** 1.7fr of mid-row, `--panel` bg, 16px border-radius, 18px padding, `--line` border

**Header:**
- Title: Poppins 15px 600 `--text-1`, "Produção mensal (t MS)"
- Big number: Poppins 32px 700, with `--mint` "+12%" prefix, "412,8 t"
- Segment toggles (3M / 6M / 12M):
  - Flex, gap 4px, `--panel-2` bg, 3px padding, 999px radius, `--line` border
  - Inactive: Inter 11px `--text-2`, padding 5px 14px, hover → color changes
  - Active (`.on`): `--panel` bg, `--text-1` color, inset 1px `--line-2` box-shadow

**Chart:**
- SVG embedded, 700 × 200 viewBox, 100% width, 200px height, margin-top 10px
- Grid lines: `rgba(143,201,138,0.06)` @ y=40, 90, 140
- Y-axis labels: monospace 10px `--text-3` ("500t", "300t", "100t")
- Area fill: linear-gradient(to-bottom, `rgba(95,227,161,0.35)` → transparent)
- Line stroke: `#5FE3A1` 2px, round caps/joins
- Data points: 4px circles, `#0B1410` fill, `#5FE3A1` stroke 2px
- Tooltip box: `--panel-2` bg, `rgba(95,227,161,0.3)` border, 6px radius, Inter 11px 600 `--text-1`
- X-axis labels: Inter 10px `--text-3` (month names)

---

### 5. **Donut Chart** (Silage Distribution)

**Container:** 1fr of mid-row, `--panel` bg, 16px border-radius, 18px padding, `--line` border

**Header:**
- Title: Poppins 15px 600 `--text-1`
- Pill: "Safra 25/26"

**SVG Donut:**
- 100 × 100 viewBox, 180px × 180px displayed
- Background circle: `--panel-2` color, 12px stroke-width
- Segments (3): 55% mint, 28% mint-2 (opacity 0.85), 17% darker mint (opacity 0.7)
- Stroke-linecap: round
- Center text: Poppins 13px 700 `--text-1` "412 t", with Inter 6px `--text-2` subtitle

**Legend:**
- 3 rows, flex space-between
- Dot: 8px circle, respective color
- Label: Inter 12px `--text-2`
- Percentage: monospace 12px 600 `--text-1` right-aligned

---

### 6. **KPI Strip** (6 columns)

**Container:** grid-template-columns: repeat(6, 1fr), gap 14px

**Card (`.k`):**
- `--panel` bg, `--line` border, 14px border-radius, 14px 16px padding
- Label (`.k__lbl`): Inter 10px `--text-3`, uppercase, 0.06em letter-spacing, font-weight 600
- Value (`.k__val`): Poppins 22px 700 `--text-1`, line-height 1.1, letter-spacing -0.02em, margin-top 6px
  - Unit: 12px 500 `--text-3`, margin-left 2px
- Footer: flex space-between, margin-top 6px
  - Delta: Inter 10px 600, `--mint` (or `--danger` if down), monospace font
  - Sparkline: 50px × 16px SVG polyline, `#5FE3A1` stroke 1.5px, round caps

---

### 7. **Weather Card**

**Container:** 300px sidebar, gradient bg (160deg, #1E3A4D → #0E1F2A), 16px border-radius, 18px padding, `rgba(122,179,219,0.12)` border, position relative, overflow hidden

**Pseudo-element (::after):** Radial glow circle, 130px × 130px, `rgba(122,179,219,0.18)`, blur effect, positioned top-right

**Sections:**
- Location: Inter 10px uppercase, `rgba(255,255,255,0.6)`, 0.08em letter-spacing
- Current temp: flex gap 12px
  - Icon: 40px × 40px, `#B8D4E8` color
  - Big number: Poppins 42px 700 white, line-height 0.95, letter-spacing -0.02em
  - Description: Inter 11px `rgba(255,255,255,0.75)`, margin-top 2px
- 5-day forecast:
  - flex, space-between
  - Border-top: 1px `rgba(255,255,255,0.1)`, padding-top 10px
  - Each day: day name, icon, temp (monospace 11px 600)

---

### 8. **Operations List** (Upcoming)

**Layout:** Full-width card, `--panel` bg, `--line` border, 16px border-radius, 18px padding

**Header:**
- Eyebrow: Inter 10px `--text-3`, uppercase, "Próximos 5 dias"
- Title: Poppins 15px 600 `--text-1`
- CTA: Ghost button (transparent, `--text-2`, hover → `--mint`)

**List:**
- ul, no bullets, gap 0 (items separated by borders)
- Grid: 54px (date) | 1fr (content) | auto (badges)
- Each li: 11px padding, `--line` border-bottom (last child no border)

**Date Chip:**
- 54px × auto, text-center, `--panel-2` bg, `--line` border, 10px radius, 6px padding top/bottom
- Day: monospace 16px 700 `--text-1`, line-height 1
- Month: monospace 9px `--text-3`, uppercase, 0.06em letter-spacing, margin-top 2px

**Content:**
- Title: Inter 13px 600 `--text-1`
- Meta: Inter 11px `--text-3`, margin-top 2px

**Badges:** flex gap 6px
- See "Badge Styles" below

---

### 9. **Alerts Sidebar**

**Container:** 300px card, `--panel` bg, `--line` border, 16px border-radius

**Header:**
- Title: Poppins 15px 600 `--text-1`
- Count: Eyebrow style `--text-3`

**Alerts (ul, no bullets, gap 0):**
- Each li: grid 28px (icon) | 1fr (content), gap 10px, 11px padding, `--line` border-bottom (last no border)
- Icon circle: 28px × 28px, 10px border-radius, 1px border (transparent)
  - `.danger`: `--danger-soft` bg, `--danger` color
  - `.warn`: `--warn-soft` bg, `--warn` color
  - `.info`: `--info-soft` bg, `--info` color
- Title: Inter 12px 600 `--text-1`, line-height 1.35
- Meta: Inter 10px `--text-3`, margin-top 3px

---

### 10. **Activity Table**

**Container:** `--panel` bg, `--line` border, 16px border-radius, 18px padding

**Header:**
- Title: Poppins 15px 600 `--text-1`
- Tools: flex gap 8px
  - Search input (220px): `--panel-2` bg, `--line` border, 10px radius, 6px 10px padding
  - Filter button: 36px × 36px, icon button style

**Table:**
- `border-collapse: collapse`, font-size 12px
- `<th>`: Inter 10px 600 `--text-3`, uppercase, 0.06em letter-spacing, 10px padding, `--line` border-bottom
- `<td>`: 14px padding, `--line` border-bottom, `--text-1` color, vertical-align middle
- Rows: hover → `rgba(95,227,161,0.03)` bg
- Last row: no border-bottom

**Columns:**

| Column | Content | Width |
|--------|---------|-------|
| Checkbox | 18px × 18px square, 5px radius, 1.5px `--line-2` border, on state: `--mint` bg + white check | 40px |
| User | Avatar (28px circle, `--mint-soft` bg) + name (Inter 12px 500 `--text-1`) | auto |
| Operation | Inter 12px 600 | auto |
| Location | `--text-2` muted | auto |
| Status | Badge (see below) | auto |
| Value | Positive: `--mint`, Negative: `--danger`, both font-weight 600 | auto |
| Time | `--text-2` muted, monospace 10px | auto |
| Menu | 3-dot icon, `--text-3` hover → cursor pointer | 30px |

---

## Badge Styles

Applied throughout (operations, alerts, table statuses):

| Variant | Background | Text Color | Icon |
|---------|------------|------------|------|
| `.b-success` | `--mint-soft` | `--mint` | Check, trending-up, etc. |
| `.b-warn` | `--warn-soft` | `--warn` | Clock, alert-triangle |
| `.b-danger` | `--danger-soft` | `--danger` | Alert-octagon, x-circle |
| `.b-info` | `--info-soft` | `--info` | Cloud-rain, info, etc. |
| `.b-neutral` | `rgba(255,255,255,0.04)` | `--text-2` | Optional icon |

- Padding: 3px 10px (or 2px 9px for smaller variants)
- Border-radius: 999px
- Font: Inter 10px 600 (or 11px for larger)
- Icon: 11px × 11px (inline)

---

## Interactions & Behavior

### Hover States
- **Silo card:** No change
- **KPI card:** No change (static data display)
- **Nav button:** Hover → `--panel` bg, color → `--text-1`
- **CTA button:** Hover → brightness 1.1 (or subtle opacity change)
- **Table row:** Hover → `rgba(95,227,161,0.03)` bg
- **Checkbox:** Cursor pointer, hover → border brightens

### Clicks
- **Nav items:** Navigate to different sections (Silagens, Talhões, etc.)
- **Status pill / Hero card:** Could open silo detail view
- **Silo card CTA ("Abrir"/"Detalhe"/"Investigar"):** Navigate to silo detail
- **Checkbox in table:** Toggle selection (state management)
- **3-dot menu:** Open context menu (out of scope for this handoff)

### Animations (Optional, not specified in design)
- **Page transitions:** Fade-in over 200ms
- **Hover transitions:** 150ms ease on background color
- **Table row hover:** 150ms ease

### Responsive Behavior
- **Desktop (1400px+):** As specified
- **Tablet (768px–1399px):** Consider sidebar collapse, KPI strip → 3 columns, charts stack
- **Mobile:** Not in scope for this handoff, but mention to developer

### Loading States (Not shown in design)
- Skeleton cards for hero silos
- Spinner overlay on charts
- Pulse animation on alert indicators

### Error States (Not shown in design)
- Red border on silo card if data unavailable
- Muted state for unavailable operations

---

## State Management

### Data Structure

```typescript
interface Silo {
  id: string;
  name: string;
  code: string;        // SIL-0482
  crop: string;        // "Milho"
  status: 'fermenting' | 'closed' | 'warning' | 'critical';
  occupancyPercent: number;
  occupancyTons: number;
  maxTons: number;
  msPercent: number;    // massa seca %
  openingCountdownSeconds: number;
  lastSampleHours: number;
}

interface KPI {
  label: string;
  value: number;
  unit: string;
  delta: number;        // +12%, -0.6, etc.
  trend: 'up' | 'down'; // for icon + color
  sparklineData?: number[]; // for mini chart
}

interface Operation {
  id: string;
  date: string;          // "2026-04-22"
  title: string;
  meta: string;
  badges: Badge[];
}

interface Alert {
  id: string;
  type: 'danger' | 'warn' | 'info';
  title: string;
  meta: string;
}

interface ActivityLog {
  id: string;
  userInitials: string;
  userName: string;
  operation: string;
  location: string;
  status: 'success' | 'pending' | 'critical' | 'warning';
  value: string;        // "+22,4 t" or "−4,3%"
  timestamp: string;    // "há 3h", "ontem"
}

interface WeatherDay {
  day: string;          // "Ter", "Qua"
  icon: string;         // lucide-react icon name
  temp: number;
}

interface Weather {
  location: string;
  current: {
    temp: number;
    description: string;
    icon: string;
  };
  forecast: WeatherDay[];
}

interface DashboardData {
  silos: Silo[];
  kpis: KPI[];
  productionChart: {
    data: Array<{ month: string; value: number }>;
    delta: number;
    total: string;
  };
  silageDistribution: {
    total: string;
    segments: Array<{ label: string; percent: number; color: string }>;
  };
  operations: Operation[];
  alerts: Alert[];
  activityLog: ActivityLog[];
  weather: Weather;
}
```

### State Variables

```typescript
const [selectedSilo, setSelectedSilo] = useState<Silo | null>(null);
const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('6m'); // chart toggle
const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
const [searchQuery, setSearchQuery] = useState('');
const [filterRole, setFilterRole] = useState<'all' | 'operator' | 'manager'>('all');
```

### Data Fetching

Assume data comes from your Supabase backend:
- `GET /api/dashboard` → returns `DashboardData` (or paginated if large)
- `GET /api/silos` → list of all silos
- `GET /api/weather?lat=lat&lon=lon` → weather data (or third-party API)
- Operations, alerts, activity logs fetched same endpoint or separate

Use React Query / SWR for caching and real-time updates.

---

## Design Tokens

### Colors (CSS Variables)

See color palette table above. Suggested Tailwind custom config:

```typescript
// tailwind.config.ts
extend: {
  colors: {
    'gs': {
      'bg': '#0B1410',
      'panel': '#121E18',
      'panel-2': '#17241D',
      'mint': '#5FE3A1',
      'mint-2': '#3ECB8A',
      'text-1': '#EAF2EB',
      'text-2': '#9AAB9E',
      'text-3': '#627067',
      'warn': '#E5B969',
      'danger': '#E07B6A',
      'info': '#7AB3DB',
    }
  }
}
```

### Spacing

Use Tailwind's default 4px scale; all values align (2 = 8px, 3 = 12px, 4 = 16px, etc.).

### Typography

```typescript
// tailwind.config.ts
fontFamily: {
  'sans': ['Inter', 'system-ui'],
  'display': ['Poppins', 'system-ui'],
  'mono': ['JetBrains Mono', 'monospace'],
}
```

### Border Radius

```typescript
extend: {
  borderRadius: {
    'xs': '5px',
    'sm': '9px',
    'md': '10px',
    'lg': '14px',
    'xl': '16px',
    '2xl': '22px',
  }
}
```

### Shadows

```typescript
extend: {
  boxShadow: {
    'glow-mint': '0 0 12px rgba(95, 227, 161, 0.45)',
    'glow-mint-sm': '0 6px 18px rgba(95, 227, 161, 0.25)',
    'glow-mint-lg': '0 6px 18px rgba(95, 227, 161, 0.3)',
  }
}
```

---

## Assets

| Asset | Source | Usage |
|-------|--------|-------|
| Logo (icon-green.png) | GestSilo brand | Sidebar 28×28 |
| Lucide icons | lucide-react (v latest) | Navigation, KPIs, alerts, weather |
| Recharts | recharts (v2+) | Line chart, donut chart |

---

## Implementation Notes

### For the Developer (in Claude Code)

1. **Create a new page** `app/dashboard/page.tsx` (or route of choice)
2. **Set up Tailwind colors** in `tailwind.config.ts` with custom gs-* namespace
3. **Create reusable components:**
   - `<SiloCard />` — hero silo card with progress bars
   - `<KPICard />` — single KPI with sparkline
   - `<ProductionChart />` — Recharts line chart
   - `<DistributionChart />` — Recharts donut
   - `<OperationsList />` — table-style list
   - `<AlertsPanel />` — compact alert list
   - `<ActivityTable />` — full data table with checkboxes
   - `<WeatherWidget />` — weather card with forecast
   - `<Sidebar />` — navigation + upgrade CTA

4. **Use shadcn/ui components** as base:
   - Button → override styling with Tailwind classes
   - Card → use for panels/cards
   - Input → for search fields
   - Table → for activity log
   - Badge → for status badges

5. **Fetch data** in a server component or use `useEffect` + React Query
6. **Handle real-time updates** via Supabase subscriptions if applicable
7. **Add dark mode support** — design is already dark, so consider a light mode variant using the same structure

### File Structure

```
src/
  app/
    dashboard/
      page.tsx
      layout.tsx (optional, shared header/nav)
  components/
    dashboard/
      SiloCard.tsx
      KPICard.tsx
      ProductionChart.tsx
      DistributionChart.tsx
      OperationsList.tsx
      AlertsPanel.tsx
      ActivityTable.tsx
      WeatherWidget.tsx
      Sidebar.tsx
      DashboardShell.tsx (main layout wrapper)
```

---

## Files Included

- `dashboard.html` — High-fidelity HTML prototype (reference only)
- `README.md` — This file

---

## Questions?

If component specs are unclear, refer to the HTML prototype for exact pixel measurements, colors, and layout. The design is self-contained and should be implementable in your Next.js + shadcn/ui stack with a few days of work (depending on complexity of data fetching).

**Next step:** Fork in Claude Code, create the components, and build the page. Start with the sidebar and header, then move to hero cards, then charts, then tables.
