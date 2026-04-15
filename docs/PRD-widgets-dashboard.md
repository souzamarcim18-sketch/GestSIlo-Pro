# PRD: Widgets de Previsão do Tempo e Cotações de Mercado

**Data**: 2026-04-14  
**Status**: Pesquisa & Planejamento  
**Versão**: 1.0

---

## 1. Contexto: Estado Atual do Dashboard

### Layout Existente
O dashboard principal (`app/dashboard/page.tsx`) segue uma estrutura bem definida:

```
┌──────────────────────────────────────────────┐
│  Greeting (Bom dia/tarde/noite, Produtor)    │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Stats Grid (4 colunas em lg, 2 em sm, 1 em mobile)
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐
│  │  Silos 🌾   │  Talhões 📍 │  Frota 🚜   │  Financeiro 💰
│  │  (Verde)    │  (Branco)   │  (Branco)   │  (Branco)
│  └─────────────┴─────────────┴─────────────┴─────────────┘
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Main Content (lg:grid-cols-3, gap-6)       │
│  ┌─────────────────────────────────┐  ┌──────────┐
│  │  Atividades Recentes            │  │  Alertas │
│  │  (lg:col-span-2)                │  │  Críticos│
│  │  [Empty State]                  │  │  (col-1) │
│  └─────────────────────────────────┘  └──────────┘
└──────────────────────────────────────────────┘
```

### Padrões de UI Identificados
- **Cards**: Componente `Card`, `CardContent`, `CardHeader` com `rounded-2xl`, `shadow-sm`, `hover:shadow-md`
- **Ícones**: Lucide React (`Database`, `Map`, `Truck`, `DollarSign`, etc.)
- **Skeleton Loaders**: `<Skeleton className="h-X w-X" />` com `animate-pulse`
- **Estados de Carregamento**: Condicional com `loading` boolean
- **Responsividade**: Grid Tailwind (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- **Cores**: Design system com cores como `text-primary`, `bg-primary/10`, `text-secondary`

### Fetch de Dados
```typescript
// Pattern identificado
const [stats, setStats] = useState<DashboardStats | null>(null);

useEffect(() => {
  const init = async () => {
    const [res1, res2, ...] = await Promise.all([
      supabase.from('tabela').select('campos'),
      supabase.from('tabela2').select('campos'),
    ]);
    setStats({...});
  };
  init();
}, [authLoading, fazendaId]);
```

---

## 2. Problema

### Situação Atual
O dashboard mostra dados operacionais internos (silos, talhões, frota, financeiro), mas **faltam dados contextuais externos** que influenciam as decisões do produtor:

1. **Previsão do Tempo**: 
   - Produtor não sabe se vai chover → risco de colheita molhada de silagem
   - Impacta agendamento de atividades no campo
   - Crítico para silos abertos (fermentação pode ser prejudicada)

2. **Cotações de Mercado**:
   - Produtor não tem visibilidade de preços em tempo real
   - Não consegue tomar decisões sobre venda (boi, leite) ou compra (milho, soja)
   - Falta contexto financeiro para planejamento

### Por que agregam valor
- **Decisões mais informadas**: Clima + mercado + operação = visão 360°
- **Reduz risco**: Alertas de chuva inesperada para silos abertos
- **Otimiza venda**: Cotações em tempo real para mejor momento de vender
- **Experiência integrada**: Tudo em um só lugar (não precisa abrir 3 abas)

---

## 3. Proposta Funcional

### Widget 1: Previsão do Tempo (Weather Widget)
**Posição**: Acima do "Main Content" grid, ocupando a linha inteira (ou entre stats e main content)  
**Tamanho**: Full-width ou parcial (lg:col-span-2 se em grid)

**O que mostra**:
- Clima **atual** (temperatura, umidade, velocidade do vento)
- Previsão para **hoje e próximos 2 dias** (temperatura min/max, precipitação, chance de chuva)
- Alertas críticos (chuva > 30mm, queda brusca de temperatura, etc.)
- Ícone dinâmico (☀️ ⛅ 🌧️ ⛈️)
- Localização da fazenda (cidade/estado)

**Exemplo de layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  📍 Curitiba, PR                      ⛅ 22°C / 18°C           │
│                                       💧 65% | 💨 12 km/h     │
│  Hoje           Amanhã              Dia 16/04                │
│  ┌──────┐      ┌──────┐            ┌──────┐                 │
│  │⛅     │      │🌧️ ⚠️  │            │☀️     │                 │
│  │24°C  │      │20°C  │            │25°C  │                 │
│  │ 45%  │      │ 80%  │ chuva!    │ 30%  │                 │
│  └──────┘      └──────┘            └──────┘                 │
│  ⚠️ Alerta: Chuva esperada amanhã. Cuidado com silos abertos!
└─────────────────────────────────────────────────────────────┘
```

---

### Widget 2: Cotações de Mercado (Market Quotes Widget)
**Posição**: No grid "Main Content", substituindo ou ao lado de "Alertas Críticos" (lg:col-span-1 ou full-width)  
**Tamanho**: Flexível conforme grid

**O que mostra**:
- **Boi Gordo** (@) - R$/kg, variação (↑/↓), gráfico mini
- **Leite** - R$/litro, variação, histórico
- **Milho** - R$/sc 60kg, variação
- **Soja** - R$/sc 60kg, variação
- Hora da última atualização
- Indicador de conexão (online/offline)
- Trending indicators (↑ alta, ↓ baixa, → estável)

**Exemplo de layout**:
```
┌──────────────────────────────┐
│  Cotações de Mercado         │ 🔄 14:32
│  (Última atualização)        │
├──────────────────────────────┤
│ 🐄 Boi Gordo (@)             │
│    R$ 285,50 ↑ +2,10 (+0,7%) │ [📈 mini chart]
│                               │
│ 🥛 Leite (R$/L)              │
│    R$ 1,89 ↑ +0,05 (+2,7%)   │
│                               │
│ 🌽 Milho (sc 60kg)            │
│    R$ 68,30 ↓ -1,20 (-1,7%)   │
│                               │
│ 🌾 Soja (sc 60kg)             │
│    R$ 135,40 ↑ +3,80 (+2,9%)  │
└──────────────────────────────┘
```

---

## 4. Requisitos Funcionais

### Widget de Previsão do Tempo

#### 4.1.1 Dados Climáticos
- [ ] Buscar clima atual: temperatura, umidade relativa, velocidade do vento, cobertura de nuvens
- [ ] Buscar previsão para próximos 3 dias: temperatura min/max, precipitação, chance de chuva
- [ ] Suportar múltiplos formatos de temperatura (°C / °F) — inicialmente °C
- [ ] Exibir descrição do clima (ensolarado, nublado, chuvoso, tempestade)
- [ ] Mostrar localização da fazenda (cidade, UF) extraída do perfil

#### 4.1.2 Alertas Climáticos
- [ ] Alerta de chuva > 30mm no dia
- [ ] Alerta de queda de temperatura > 10°C em 12h
- [ ] Alerta de vento > 40 km/h
- [ ] Exibir em card destacado (vermelho/laranja) quando crítico
- [ ] Toast notification para alertas críticos (opcional)

#### 4.1.3 Componentes Visuais
- [ ] Ícones dinâmicos (Lucide React: CloudSun, Cloud, CloudRain, CloudDrizzle, CloudLightning, Wind, Droplets, Thermometer)
- [ ] Mini-gráfico de temperatura nos próximos 3 dias (opcional, pode usar Recharts)
- [ ] Skeleton loader enquanto busca dados
- [ ] Estado vazio (quando sem localização da fazenda)

#### 4.1.4 Atualizações
- [ ] Carregar dados ao montar o componente
- [ ] Atualizar a cada **30 minutos** automaticamente
- [ ] Botão refresh manual
- [ ] Timestamp da última atualização

---

### Widget de Cotações de Mercado

#### 4.2.1 Cotações
- [ ] Buscar cotações de: **Boi Gordo (@)**, **Leite (R$/L)**, **Milho (sc 60kg)**, **Soja (sc 60kg)**
- [ ] Exibir: preço atual, variação em R$ e %
- [ ] Indicador visual (↑ verde, ↓ vermelho, → cinza)
- [ ] Histórico mínimo: preço anterior (para calcular variação)
- [ ] Mini-gráfico de tendência (últimas 7 dias, opcional)

#### 4.2.2 Atualização de Dados
- [ ] Carregar dados ao montar o componente
- [ ] Atualizar a cada **5 minutos** (mercado é dinâmico)
- [ ] Mostrar timestamp da última atualização
- [ ] Indicador de conexão (online/offline com API)
- [ ] Fallback: exibir último valor cache se API falhar

#### 4.2.3 Componentes Visuais
- [ ] Cards ou lista com ícone, nome, preço, variação
- [ ] Skeleton loader enquanto busca dados
- [ ] Estado vazio (se API não disponível)
- [ ] Botão refresh manual
- [ ] Responsivo (stack vertical em mobile, cards em desktop)

#### 4.2.4 Interatividade (Fora de Escopo - Fase 2)
- ❌ Clicar em cotação para ver gráfico detalhado
- ❌ Configurar alertas de preço (notificação quando boi < R$ 250)
- ❌ Histórico completo

---

## 5. Requisitos Não-Funcionais

### Performance
- [ ] Widget weather: load < 1s (cache 30min)
- [ ] Widget quotes: load < 800ms (cache 5min)
- [ ] Sem bloquear renderização do dashboard (async)
- [ ] Skeleton loaders para feedback visual imediato

### Offline & PWA
- [ ] Ambos widgets devem funcionar offline (cache anterior)
- [ ] Service Worker armazena último valor de cada API
- [ ] Indicador visual quando offline (badge "Offline" nos dados)
- [ ] Sincronizar quando reconectar

### Responsividade
- [ ] Mobile (< 640px): Stack vertical, adaptado
- [ ] Tablet (640px - 1024px): 2 colunas
- [ ] Desktop (> 1024px): Layout otimizado

### Acessibilidade
- [ ] ARIA labels nos ícones
- [ ] Valores numéricos com suporte a screen readers
- [ ] Cores não são o único indicador (↑/↓ além de cor)
- [ ] Contraste mínimo WCAG AA

### Segurança
- [ ] API keys para weather/quotes em env vars
- [ ] Não expor API keys no client-side (usar Server Actions/Route Handler se necessário)
- [ ] HTTPS only
- [ ] Rate limiting respeitado (não fazer mais requests que permitido)

---

## 6. Dependências Técnicas

### APIs Externas Necessárias

#### 6.1 Previsão do Tempo
**Opção 1: OpenWeatherMap (Recomendado)**
- API: `https://api.openweathermap.org/data/2.5/forecast` (5 dias a cada 3h)
- Plan: Free (1000 req/dia, suficiente)
- Auth: `OPENWEATHER_API_KEY`
- Latência: ~500ms
- Rate limit: 60 req/min (OK para 30min refresh)

**Opção 2: Open-Meteo (Free, sem API key)**
- API: `https://api.open-meteo.com/v1/forecast`
- Plan: Free unlimited
- Auth: Nenhuma
- Latência: ~300ms
- Advantage: Sem precisar de env var

**Recomendação: Open-Meteo** (free, simples, sem config)

#### 6.2 Cotações de Mercado
**Opção 1: API de commodity brasileira (CEPEA/USP)**
- Boi Gordo: CEPEA Indicadores
- Leite: CEPEA Indicadores
- Grãos: Informações.com.br ou similar
- **Problema**: Sem API pública, precisa scraping ou parceria

**Opção 2: Integração com serviço de commodity global**
- Alpha Vantage (tem commodities)
- Finnhub (tem commodities)
- **Problema**: Não tem cotações brasileiras específicas (Boi Gordo em @)

**Opção 3: Mock/Simulação (MVP)**
- Dados hardcoded com variações aleatórias
- Útil para MVP até encontrar API de verdade
- Depois migra para API real

**Recomendação para MVP**: Usar **mock data** com refresh, depois integrar com API real (fase 2)

### Libs Já Disponíveis
- ✅ `recharts` (3.8.1) - gráficos mini
- ✅ `lucide-react` (0.553.0) - ícones
- ✅ `date-fns` (4.1.0) - formatação de datas
- ✅ `sonner` (2.0.7) - toasts para alertas
- ✅ `zod` (4.3.6) - validação de dados de API

### Libs Possíveis de Adicionar (Fora de Escopo - Não adicionar agora)
- `axios` ou `ky` - cliente HTTP mais simples
- Mas Next.js já tem `fetch` nativo, pode usar diretamente

### Variáveis de Ambiente Novas
```env
# Previsão do Tempo (Open-Meteo - nenhuma necessária, é free)
# Ou se usar OpenWeatherMap:
NEXT_PUBLIC_OPENWEATHER_API_KEY=seu_api_key

# Cotações de Mercado (a definir quando integrar API real)
NEXT_PUBLIC_QUOTES_API_KEY=seu_api_key
NEXT_PUBLIC_QUOTES_API_URL=https://api.exemplo.com
```

**Nota**: Variáveis com `NEXT_PUBLIC_` ficam visíveis no client (OK para API keys não sensíveis). Para APIs sensíveis, usar Server Actions.

---

## 7. Estrutura de Dados

### 7.1 Type: WeatherData
```typescript
export type WeatherCurrent = {
  temperature: number;        // em °C
  feelsLike: number;          // sensação térmica
  humidity: number;           // 0-100 %
  windSpeed: number;          // km/h
  cloudCover: number;         // 0-100 %
  description: string;        // "Ensolarado", "Nublado", etc.
  icon: string;               // nome do ícone Lucide
};

export type WeatherForecast = {
  date: string;               // ISO: 2026-04-15
  tempMin: number;
  tempMax: number;
  precipitationMm: number;
  precipitationProbability: number;  // 0-100 %
  description: string;
  icon: string;
};

export type WeatherAlert = {
  type: 'rain' | 'temperature' | 'wind';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
};

export type WeatherWidgetData = {
  location: string;           // "Curitiba, PR"
  current: WeatherCurrent;
  forecast: WeatherForecast[];  // próximos 3 dias
  alerts: WeatherAlert[];
  lastUpdate: string;         // ISO timestamp
  isOffline: boolean;
};
```

### 7.2 Type: MarketQuote
```typescript
export type MarketQuote = {
  symbol: string;             // "BOI", "LEITE", "MILHO", "SOJA"
  name: string;               // "Boi Gordo", "Leite (R$/L)", etc.
  currentPrice: number;       // em R$
  previousPrice: number;      // preço anterior (para variação)
  variation: number;          // em R$ (currentPrice - previousPrice)
  variationPercent: number;   // em %
  trend: 'up' | 'down' | 'stable';
  lastUpdate: string;         // ISO timestamp
  icon: string;               // ícone Lucide ou emoji
};

export type MarketQuotesData = {
  quotes: MarketQuote[];
  lastUpdate: string;
  isOffline: boolean;
  isAvailable: boolean;       // se API está disponível
};
```

### 7.3 Armazenamento em Cache (IDB - IndexedDB)
```typescript
// Salvar em IDB para offline
const cacheKey = `weather-${fazendaId}`;
await db.put('widgets-cache', {
  key: cacheKey,
  data: weatherData,
  timestamp: Date.now(),
  expiry: Date.now() + 30*60*1000  // 30min expiry
});

// Recuperar de cache se offline
const cached = await db.get('widgets-cache', cacheKey);
if (cached && Date.now() < cached.expiry) {
  // usar dados em cache
}
```

---

## 8. Layout & Posicionamento no Dashboard

### Cenário A: Weather acima dos stats (Recomendado)
```
┌────────────────────────────────────────────┐
│ Greeting                                   │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ [WEATHER WIDGET - Full Width]              │  ← NEW
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Stats Grid (4 cols)                        │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Main Content (Atividades | Alertas Críticos)
│ ┌──────────────────┐  ┌──────────────────┐ │
│ │ Atividades       │  │ Cotações Mercado │  │ ← QUOTES AQUI
│ │ (lg:col-span-2)  │  │ (lg:col-span-1)  │ │
│ └──────────────────┘  └──────────────────┘ │
└────────────────────────────────────────────┘
```

### Cenário B: Weather no card principal
```
┌────────────────────────────────────────────┐
│ Greeting                                   │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Stats Grid (4 cols)                        │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Main Content (3 cols em lg)                │
│ ┌──────────────────┐  ┌───────────────────┐ │
│ │ Atividades       │  │ Weather (acima)   │ │
│ │ (lg:col-span-2)  │  │ Cotações (abaixo) │ │
│ │                  │  └───────────────────┘ │
│ └──────────────────┘                       │
└────────────────────────────────────────────┘
```

**Decisão Final**: **Cenário A** (weather full-width entre greeting e stats). Motivo:
- Visibilidade imediata
- Crítico para operações (decisões baseadas em clima)
- Não compete com Atividades Recentes por espaço

---

## 9. Riscos & Decisões

### 9.1 Rate Limits de API
**Risk**: Open-Meteo é free, pode ter limite de requisições  
**Mitigação**: 
- Refresh a cada 30min (não 5min)
- Cache em IDB + localStorage
- Fallback para dados em cache se API falhar

**Risk**: Se integrar API de cotações real, pode ter rate limit  
**Mitigação**:
- Usar Server Actions em vez de client-side (evita expor API key)
- Cache de 5min mínimo
- Mostrar "Dados de X minutos atrás" se cache

### 9.2 Precisão de Localização
**Risk**: Campo `localizacao` em fazendas é string genérica (não tem lat/lon)  
**Decisão**: Usar geocoding
- Opção 1: Requisição ao Nominatim (Open Street Map) para lat/lon
- Opção 2: Pedir ao usuário durante onboarding: "Qual é a cidade da sua fazenda?"
- **Recomendação**: Opção 2 (mais simples, menos API calls)

**Action**: Adicionar campo `cidade` e `estado` na tabela `fazendas` (ou usar parse de `localizacao`)

### 9.3 Offline First vs Servidor
**Decision**: Hybrid approach
- Tentar buscar API on-demand (quando widget monta ou refresh clicado)
- Se falhar, servir cache
- Service Worker sincroniza periodicamente (quando online)

### 9.4 Quando não há localizacao
**Scenario**: Usuário criou fazenda sem localização  
**Solution**:
- Widget Weather mostra: "Configure a localização da fazenda em Configurações"
- Widget Quotes mostra: "Dados nacionais (sem localização específica)"

### 9.5 Responsabilidade de Update
**Decision**: Client-side fetch (não Server Actions) para MVP
- **Pro**: Simples, rápido de implementar
- **Con**: API key visível no client (se usar)
- **Mitigação**: Usar APIs free sem auth (Open-Meteo, mock data)

---

## 10. Fora de Escopo (Fase 2+)

- ❌ Integração com API real de cotações brasileiras (depende de parceria com CEPEA/USP ou scraping)
- ❌ Alertas customizáveis (usuário define limite de chuva, temperatura, preço)
- ❌ Notificações push (requer service worker setup completo)
- ❌ Histórico gráfico detalhado (requer mais dados em DB)
- ❌ Exportar relatório clima/cotações
- ❌ Integração com forecast agrícola especializado (ex: Agritempo/INMET)
- ❌ Multi-idioma (assumir português BR por enquanto)
- ❌ Integração com terceiros (meteostat, weatherapi, etc. — usar apenas Open-Meteo nesta fase)

---

## 11. Critérios de Sucesso

### Funcionais
- [x] Weather widget renderiza com dados atualizados
- [x] Quotes widget renderiza com dados (mock ou real)
- [x] Ambos atualizam automaticamente
- [x] Funcionam offline (mostram dados em cache)
- [x] Layouts responsivos em mobile/tablet/desktop
- [x] Alertas críticos aparecem quando relevante

### Não-Funcionais
- [x] Load < 1s weather, < 800ms quotes
- [x] Zero console errors
- [x] Tests cobrindo dados/UI dos widgets
- [x] Accessibility WCAG AA mínimo

### Próximos Passos (Fase 2)
1. Pesquisar API de cotações brasileiras real
2. Implementar Server Actions para fetch seguro de API
3. Adicionar notificações push baseadas em alertas
4. Integração com dados financeiros (se vender boi gordo, atualizar receita automaticamente)

---

## Anexo A: Componentes a Serem Criados

```
components/
├── widgets/
│   ├── WeatherWidget.tsx           # Componente principal
│   ├── QuotesWidget.tsx            # Componente principal
│   ├── weather/
│   │   ├── WeatherCurrent.tsx      # Seção clima atual
│   │   ├── WeatherForecast.tsx     # Seção previsão 3 dias
│   │   └── WeatherAlerts.tsx       # Seção alertas
│   └── quotes/
│       ├── QuoteCard.tsx           # Card individual de cotação
│       └── QuotesGrid.tsx          # Grid de todas cotações
│
lib/
├── weather.ts                      # Funções para fetch weather
├── quotes.ts                       # Funções para fetch quotes
├── cache-widget.ts                 # Cache em IDB
└── widget-utils.ts                 # Helpers (formatação, etc)

types/
├── weather.ts                      # Types de weather
└── market.ts                       # Types de quotes
```

---

## Anexo B: Exemplo de Hook para Reuse

```typescript
// hooks/useWeatherWidget.ts
export function useWeatherWidget(fazendaId: string | null) {
  const [data, setData] = useState<WeatherWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const refresh = useCallback(async () => {
    if (!fazendaId) return;
    // fetch weather, save to cache, set data
  }, [fazendaId]);
  
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);
  
  return { data, loading, refresh };
}
```

---

## Conclusão

Este PRD estabelece a base para implementação de dois widgets informativos que **complementam a visão operacional atual com contexto externo crítico** (clima e mercado). 

A abordagem é **progressiva**:
1. **MVP (Fase 1)**: Open-Meteo weather + mock quotes
2. **Fase 2**: Integração com API de cotações real
3. **Fase 3**: Notificações, alertas customizáveis

**Próximo passo**: Implementação seguindo requisitos listados em § 4.
