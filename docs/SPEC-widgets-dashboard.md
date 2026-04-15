# SPEC: Widgets de Previsão do Tempo e Cotações de Mercado

**Data**: 2026-04-14  
**Status**: Especificação Técnica  
**Versão**: 1.0  
**Baseado em**: PRD-widgets-dashboard.md (Fase 1)

---

## 📋 Sumário Executivo

Esta especificação detalha a implementação de dois widgets informativos para o dashboard do GestSilo Pro:
1. **Weather Widget** — Previsão do tempo com dados da OpenWeatherMap (API Route server-side)
2. **Market Quotes Widget** — Cotações de mercado (CEPEA com estratégia a definir)

Ambos devem funcionar offline (cache), responder rapidamente (< 1s), e seguir os padrões visuais e arquiteturais do projeto.

---

## 1. DECISÕES TÉCNICAS FINALIZADAS

### 1.1 API de Clima: OpenWeatherMap
**SOBRESCREVE o PRD que recomendava Open-Meteo**

- **Provedor**: OpenWeatherMap (https://openweathermap.org)
- **Endpoints**:
  - Clima atual: `https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&lang=pt_br&appid={KEY}`
  - Previsão 5 dias: `https://api.openweathermap.org/data/2.5/forecast?lat={lon}&lon={lon}&units=metric&lang=pt_br&appid={KEY}`
- **Auth**: Variável de ambiente `OPENWEATHER_API_KEY` (server-side, **SEM** prefixo `NEXT_PUBLIC_`)
- **Free Tier**: 1.000 chamadas/dia, 60/minuto (suficiente para refresh 30min)
- **Protocolos**: 
  - Chamada **OBRIGATORIAMENTE** via API Route (`app/api/weather/route.ts`)
  - Client-side faz fetch apenas para `/api/weather`
  - API key nunca exposta no navegador

### 1.2 Cotações de Mercado: CEPEA (Estratégia Híbrida)
**SOBRESCREVE o PRD que sugeria mock data como MVP**

#### Análise de Estratégias
| Estratégia | Viabilidade | Esforço | Confiabilidade | Recomendação |
|-----------|-------------|---------|-----------------|--------------|
| Web Scraping CEPEA (Cheerio/puppeteer) | Média | Alto | Baixa (frágil a mudanças) | Não — manutenção pesada |
| API agrobr (lib Python) | Média | Alto | Média | Não — requer servidor Python |
| Iframe Redação Agro | Baixa | Baixo | Alta | Não — sem dados estruturados |
| API intermediária (ex: Finnhub) | Alta | Baixo | Alta | **SIM — primeira fase** |
| Mock com variações | Alta | Muito Baixo | - | **SIM — parallelo à integração real** |

#### Decisão Executiva
**Fase 1 (MVP — esta implementação)**:
- Implementar widget com **API Route** (`app/api/cotacoes/route.ts`) pronta para integração
- Popular com **mock data estruturada** (dados realistas, variações aleatórias)
- Suportar fallback a cache com `isOffline: true`
- Preparar contrato de tipos para futura troca de fonte

**Fase 2 (Próxima)**:
- Integrar com API real (será definida após pesquisa de parceria com CEPEA ou intermediária)
- Trocar apenas a lógica da rota sem impacto no UI/hooks/tipos

**Por que Mock agora?**
- ✅ Desacoplamento da complexidade de scraping/API real
- ✅ Rápida validação do widget com dados estruturados
- ✅ Suporta testes sem dependência externa
- ✅ Pronto para migração quando API real disponível

#### Commodities Monitoradas
```
- BOI: Boi Gordo (@) — R$/kg — CEPEA @gado
- LEITE: Leite (R$/L) — CEPEA litro
- MILHO: Milho (sc 60kg) — Milho Esalq
- SOJA: Soja (sc 60kg) — Soja Esalq
```

### 1.3 Segurança — Regra Ouro
**Nenhuma API key no cliente**
```
❌ NEVER: NEXT_PUBLIC_OPENWEATHER_API_KEY=xxx
❌ NEVER: Client-side fetch direto para APIs externas

✅ ALWAYS: 
  - Server-side API Route (app/api/weather/route.ts)
  - Client-side fetch(/api/weather)
```

---

## 2. ARQUIVOS A CRIAR (NOVOS)

### 2.1 Types & Validação

#### `lib/types/weather.ts`
**Responsabilidade**: Tipagens e schemas Zod para dados climáticos  
**Exporta**: 
- `WeatherCurrent` (type)
- `WeatherForecast` (type)
- `WeatherAlert` (type)
- `WeatherWidgetData` (type)
- Schemas Zod correspondentes

**Interfaces**:
```typescript
// Clima atual
type WeatherCurrent = {
  temperature: number;              // °C
  feelsLike: number;                // sensação térmica
  humidity: number;                 // 0-100 %
  windSpeed: number;                // km/h
  windDegree: number;               // 0-360° (direção)
  cloudCover: number;               // 0-100 %
  precipitationMm: number;          // mm (chuva atual)
  description: string;              // "Ensolarado", "Nublado", etc
  icon: string;                     // nome ícone Lucide: "CloudSun", "CloudRain", etc
  visibility: number;               // metros
};

// Previsão por dia
type WeatherForecast = {
  date: string;                     // ISO: "2026-04-15"
  dayOfWeek: string;                // "Terça" (formato local)
  tempMin: number;
  tempMax: number;
  precipitationMm: number;
  precipitationProbability: number; // 0-100 %
  description: string;
  icon: string;
};

// Alertas críticos
type WeatherAlert = {
  type: 'rain' | 'temperature' | 'wind';
  severity: 'warning' | 'critical';
  message: string;                  // "Chuva > 30mm esperada"
  affectedHours: number;            // quantas horas a partir de agora
};

// Dados completos do widget
type WeatherWidgetData = {
  location: string;                 // "Curitiba, PR"
  latitude: number;
  longitude: number;
  current: WeatherCurrent;
  forecast: WeatherForecast[];      // próximos 3 dias
  alerts: WeatherAlert[];
  lastUpdate: string;               // ISO timestamp da API
  fetchedAt: string;                // ISO timestamp do fetch local
  isOffline: boolean;               // true se servido de cache
  cacheExpiresAt: string;           // ISO timestamp when cache expires
};
```

**Schemas Zod**:
```typescript
const weatherCurrentSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().nonnegative(),
  windDegree: z.number().min(0).max(360),
  cloudCover: z.number().min(0).max(100),
  precipitationMm: z.number().nonnegative().default(0),
  description: z.string(),
  icon: z.string(),
  visibility: z.number().nonnegative(),
});

const weatherForecastSchema = z.object({
  date: z.string().datetime(),
  dayOfWeek: z.string(),
  tempMin: z.number(),
  tempMax: z.number(),
  precipitationMm: z.number().nonnegative(),
  precipitationProbability: z.number().min(0).max(100),
  description: z.string(),
  icon: z.string(),
});

const weatherAlertSchema = z.object({
  type: z.enum(['rain', 'temperature', 'wind']),
  severity: z.enum(['warning', 'critical']),
  message: z.string(),
  affectedHours: z.number().positive(),
});

const weatherWidgetDataSchema = z.object({
  location: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  current: weatherCurrentSchema,
  forecast: z.array(weatherForecastSchema),
  alerts: z.array(weatherAlertSchema),
  lastUpdate: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  isOffline: z.boolean().default(false),
  cacheExpiresAt: z.string().datetime(),
});
```

**Dependências**: `zod`

---

#### `lib/types/market.ts`
**Responsabilidade**: Tipagens e schemas Zod para cotações de mercado  
**Exporta**: 
- `MarketQuote` (type)
- `MarketQuotesData` (type)
- Schemas Zod correspondentes

**Interfaces**:
```typescript
// Cotação de uma commodity
type MarketQuote = {
  symbol: string;                   // "BOI", "LEITE", "MILHO", "SOJA"
  name: string;                     // "Boi Gordo", "Leite (R$/L)", etc
  unit: string;                     // "kg", "L", "sc", "@"
  currentPrice: number;             // em R$
  previousPrice: number;            // preço anterior (para cálculo variação)
  variation: number;                // R$ (currentPrice - previousPrice)
  variationPercent: number;         // % ((currentPrice-prev)/prev * 100)
  trend: 'up' | 'down' | 'stable';  // determinado por variationPercent
  lastUpdate: string;               // ISO timestamp
  source: string;                   // "mock" | "cepea" | "api"
  high24h?: number;                 // máxima das últimas 24h
  low24h?: number;                  // mínima das últimas 24h
};

// Dados completos do widget
type MarketQuotesData = {
  quotes: MarketQuote[];
  lastUpdate: string;               // ISO timestamp
  fetchedAt: string;                // ISO timestamp do fetch local
  isOffline: boolean;               // true se servido de cache
  isAvailable: boolean;             // false se API falhou
  errorMessage?: string;            // motivo de falha (se houver)
  cacheExpiresAt: string;           // ISO timestamp when cache expires
};
```

**Schemas Zod**:
```typescript
const marketQuoteSchema = z.object({
  symbol: z.enum(['BOI', 'LEITE', 'MILHO', 'SOJA']),
  name: z.string(),
  unit: z.string(),
  currentPrice: z.number().nonnegative(),
  previousPrice: z.number().nonnegative(),
  variation: z.number(),
  variationPercent: z.number(),
  trend: z.enum(['up', 'down', 'stable']),
  lastUpdate: z.string().datetime(),
  source: z.string(),
  high24h: z.number().nonnegative().optional(),
  low24h: z.number().nonnegative().optional(),
});

const marketQuotesDataSchema = z.object({
  quotes: z.array(marketQuoteSchema),
  lastUpdate: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  isOffline: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  errorMessage: z.string().optional(),
  cacheExpiresAt: z.string().datetime(),
});
```

**Dependências**: `zod`

---

### 2.2 API Routes (Server-Side)

#### `app/api/weather/route.ts`
**Responsabilidade**: Fetch clima de OpenWeatherMap, validação, cache, fallback offline  
**Método HTTP**: `GET`  
**Query Params**:
- `latitude: number` (obrigatório) — latitude da fazenda
- `longitude: number` (obrigatório) — longitude da fazenda
- `location: string` (opcional) — nome da localização para display

**Fluxo**:
1. Validar params com Zod
2. Tentar fetch de `/data/2.5/weather` (clima atual) + `/data/2.5/forecast` (previsão)
3. Mapear resposta OpenWeatherMap → `WeatherWidgetData`
4. Calcular alertas críticos (chuva > 30mm, vento > 40 km/h, queda temp > 10°C)
5. Guardar em cache (Redis ou IDB via endpoint separado)
6. Retornar JSON com `200 OK`
7. **Se falhar**: Recuperar do cache, marcar `isOffline: true`, retornar `200 OK`
8. **Se sem cache**: Retornar `503 Service Unavailable` com mensagem

**Transformação OpenWeatherMap → Nosso Schema**:
```typescript
// OpenWeatherMap current response
{
  main: { temp, feels_like, humidity, visibility },
  wind: { speed, deg },
  clouds: { all },
  rain: { '1h': mm },
  weather: [{ description, icon }],
  dt: unix_timestamp
}

// Nosso WeatherCurrent
{
  temperature: main.temp,
  feelsLike: main.feels_like,
  humidity: main.humidity,
  windSpeed: wind.speed * 3.6,  // convert m/s to km/h
  windDegree: wind.deg,
  cloudCover: clouds.all,
  precipitationMm: rain?.['1h'] ?? 0,
  description: capitalize(weather[0].description),
  icon: mapWeatherIcon(weather[0].icon),  // 01d → CloudSun
  visibility: main.visibility,
}
```

**Códigos de Resposta**:
- `200 OK` — Dados retornados (frescos ou cache)
- `400 Bad Request` — Params inválidos (latitude/longitude fora do range)
- `401 Unauthorized` — API key inválida (unlikely, mas documentar)
- `429 Too Many Requests` — Rate limit atingido (não retry, retornar cache)
- `503 Service Unavailable` — API down E sem cache disponível
- `500 Internal Server Error` — Erro inesperado no parsing

**Headers de Resposta**:
```
Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600
Content-Type: application/json
X-Cache-Status: hit | miss | offline
```

**Pseudo-código**:
```typescript
export async function GET(req: NextRequest) {
  try {
    // 1. Parse & validate
    const url = new URL(req.url);
    const latitude = parseFloat(url.searchParams.get('latitude') ?? '');
    const longitude = parseFloat(url.searchParams.get('longitude') ?? '');
    const location = url.searchParams.get('location') ?? 'Sua fazenda';
    
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: 'Invalid latitude/longitude' },
        { status: 400 }
      );
    }

    // 2. Fetch from OpenWeatherMap
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=pt_br&appid=${apiKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=pt_br&appid=${apiKey}`),
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      // Try cache
      const cached = await getCachedWeather(latitude, longitude);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=1800',
            'X-Cache-Status': 'offline',
          },
        });
      }
      return NextResponse.json(
        { error: 'Weather API unavailable' },
        { status: 503 }
      );
    }

    // 3. Parse & transform
    const current = await currentRes.json();
    const forecast = await forecastRes.json();
    
    const weatherData = transformOpenWeatherMap(current, forecast, location);
    const validated = weatherWidgetDataSchema.parse(weatherData);

    // 4. Save to cache
    await cacheWeather(latitude, longitude, validated);

    // 5. Return
    return NextResponse.json(validated, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'X-Cache-Status': 'miss',
      },
    });
  } catch (error) {
    console.error('[weather/route.ts]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Dependências**: `next/server`, `zod`, `openweather-api`, `lib/types/weather.ts`, `lib/cache-widget.ts`

---

#### `app/api/cotacoes/route.ts`
**Responsabilidade**: Fetch cotações (mock ou API real futura), validação, cache  
**Método HTTP**: `GET`  
**Query Params**:
- `source: string` (opcional) — "mock" | "cepea" (default: "mock")

**Fluxo (MVP — Mock Data)**:
1. **Se `source === "mock"`** (default):
   - Gerar dados mock estruturados com variações aleatórias
   - Aplicar "variação do dia" (consistente durante 24h)
   - Guardar em cache por 2 horas
   - Retornar `200 OK`

2. **Se `source === "cepea"`** (futuro):
   - Chamar API real de cotações (a ser definida)
   - Mapear resposta → `MarketQuote[]`
   - Guardar em cache por 2 horas
   - Retornar `200 OK` ou fallback de cache

**Mock Data Generation**:
```typescript
// Preços base (realistas, atualizado em 2026-04)
const baseQuotes = {
  BOI: { price: 285.50, unit: 'kg' },
  LEITE: { price: 1.89, unit: 'L' },
  MILHO: { price: 68.30, unit: 'sc' },
  SOJA: { price: 135.40, unit: 'sc' },
};

// Daily variation (persistente em localStorage ou seed de data)
// Varia entre -2% a +2% por commodity
// Seed: hash(Date.now() / 86400000) → assegura consistência no dia

function generateDailyVariation(symbol: string): number {
  const seed = getDailySeed();
  const hash = simpleHash(`${symbol}-${seed}`);
  return (hash % 400) / 100 - 2; // -2% a +2%
}

function generateMockQuote(symbol: string): MarketQuote {
  const base = baseQuotes[symbol];
  const variation = generateDailyVariation(symbol);
  const currentPrice = base.price * (1 + variation / 100);
  const previousPrice = base.price; // anterior era o base

  return {
    symbol,
    name: symbolToName(symbol),
    unit: base.unit,
    currentPrice,
    previousPrice,
    variation: currentPrice - previousPrice,
    variationPercent: variation,
    trend: variation > 0.5 ? 'up' : variation < -0.5 ? 'down' : 'stable',
    lastUpdate: new Date().toISOString(),
    source: 'mock',
    high24h: currentPrice * 1.02,
    low24h: currentPrice * 0.98,
  };
}
```

**Códigos de Resposta**:
- `200 OK` — Dados retornados (mock, cache, ou API real)
- `503 Service Unavailable` — Ambos API falhou E cache expirado
- `500 Internal Server Error` — Erro inesperado

**Headers**:
```
Cache-Control: public, s-maxage=7200, stale-while-revalidate=3600
Content-Type: application/json
X-Quotes-Source: mock | cepea | offline
```

**Dependências**: `next/server`, `zod`, `lib/types/market.ts`, `lib/cache-widget.ts`

---

### 2.3 Services & Utilities

#### `lib/weather.ts`
**Responsabilidade**: Client-side abstração para fetch de weather via `/api/weather`  
**Exporta**: 
- `fetchWeather(latitude, longitude, location): Promise<WeatherWidgetData>`
- `getCachedWeather(latitude, longitude): Promise<WeatherWidgetData | null>`
- `clearWeatherCache(latitude, longitude): Promise<void>`

**Funções**:
```typescript
export async function fetchWeather(
  latitude: number,
  longitude: number,
  location: string
): Promise<WeatherWidgetData> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    location,
  });

  const response = await fetch(`/api/weather?${params}`);
  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return weatherWidgetDataSchema.parse(data);
}

export async function getCachedWeather(
  latitude: number,
  longitude: number
): Promise<WeatherWidgetData | null> {
  // Usar localStorage com chave `weather-{lat}-{lon}`
  // Verificar expiração (cacheExpiresAt)
  // Retornar null se expirado
}

export async function clearWeatherCache(
  latitude: number,
  longitude: number
): Promise<void> {
  // Remover do localStorage
}
```

**Dependências**: `lib/types/weather.ts`

---

#### `lib/quotes.ts`
**Responsabilidade**: Client-side abstração para fetch de cotações via `/api/cotacoes`  
**Exporta**: 
- `fetchQuotes(source?: 'mock' | 'cepea'): Promise<MarketQuotesData>`
- `getCachedQuotes(): Promise<MarketQuotesData | null>`
- `clearQuotesCache(): Promise<void>`

**Funções**:
```typescript
export async function fetchQuotes(
  source: 'mock' | 'cepea' = 'mock'
): Promise<MarketQuotesData> {
  const params = new URLSearchParams({ source });
  const response = await fetch(`/api/cotacoes?${params}`);
  
  if (!response.ok) {
    throw new Error(`Quotes fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return marketQuotesDataSchema.parse(data);
}

export async function getCachedQuotes(): Promise<MarketQuotesData | null> {
  // localStorage com chave `quotes`
  // Verificar expiração
}

export async function clearQuotesCache(): Promise<void> {
  // Remover do localStorage
}
```

**Dependências**: `lib/types/market.ts`

---

#### `lib/widget-utils.ts`
**Responsabilidade**: Helpers de formatação (temperatura, moeda, datas, ícones)  
**Exporta**: 
- `formatTemperature(value, unit): string`
- `formatBRL(value): string`
- `formatPercent(value): string`
- `formatDateTime(date): string`
- `getWeatherIcon(code): IconComponent`
- `getTrendIcon(trend): IconComponent`
- `getWindDirection(degree): string`
- `calculateAlerts(current, forecast): WeatherAlert[]`

**Exemplos**:
```typescript
export function formatTemperature(
  value: number,
  unit: 'C' | 'F' = 'C'
): string {
  return `${value.toFixed(1)}°${unit}`;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getWeatherIcon(
  openWeatherCode: string
): keyof typeof lucideIcons {
  // Mapear códigos OpenWeather para nomes Lucide
  // "01d" → "Sun", "02d" → "CloudSun", "09d" → "CloudRain", etc
  const iconMap: Record<string, keyof typeof lucideIcons> = {
    '01d': 'Sun',
    '01n': 'Moon',
    '02d': 'CloudSun',
    '02n': 'CloudMoon',
    '03d': 'Cloud',
    '04d': 'Cloud',
    '09d': 'CloudDrizzle',
    '10d': 'CloudRain',
    '11d': 'CloudLightning',
    '13d': 'CloudSnow',
    '50d': 'CloudFog',
  };
  return iconMap[openWeatherCode] ?? 'Cloud';
}

export function calculateAlerts(
  current: WeatherCurrent,
  forecast: WeatherForecast[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Alerta chuva
  if (current.precipitationMm > 30) {
    alerts.push({
      type: 'rain',
      severity: 'critical',
      message: `Chuva intensa: ${current.precipitationMm}mm. Cuidado com silos abertos!`,
      affectedHours: 1,
    });
  }

  // Alerta previsão chuva nos próximos 3 dias
  forecast.forEach((day, idx) => {
    if (day.precipitationMm > 30) {
      alerts.push({
        type: 'rain',
        severity: 'warning',
        message: `Chuva esperada em ${day.dayOfWeek}: ${day.precipitationMm}mm`,
        affectedHours: 24 * (idx + 1),
      });
    }
  });

  // Alerta vento
  if (current.windSpeed > 40) {
    alerts.push({
      type: 'wind',
      severity: 'warning',
      message: `Vento forte: ${current.windSpeed.toFixed(1)} km/h`,
      affectedHours: 1,
    });
  }

  return alerts;
}
```

**Dependências**: `lucide-react`, `date-fns`

---

#### `lib/cache-widget.ts`
**Responsabilidade**: Cache abstrato (localStorage com TTL, preparado para IDB futura)  
**Exporta**: 
- `setCacheItem(key, value, ttlMinutes): Promise<void>`
- `getCacheItem(key): Promise<T | null>`
- `clearCacheItem(key): Promise<void>`
- `isCacheExpired(expiresAt): boolean`

**Implementação (localStorage inicial)**:
```typescript
const CACHE_PREFIX = 'geststilo-widget-';

export async function setCacheItem<T>(
  key: string,
  value: T,
  ttlMinutes: number = 30
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const cacheData = {
    value,
    expiresAt: expiresAt.toISOString(),
  };

  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('[cache-widget.ts] localStorage write failed:', error);
    // Silently fail — widget continuará tentando fetch
  }
}

export async function getCacheItem<T>(key: string): Promise<T | null> {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const { value, expiresAt } = JSON.parse(cached);

    if (isCacheExpired(expiresAt)) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return value as T;
  } catch (error) {
    console.warn('[cache-widget.ts] localStorage read failed:', error);
    return null;
  }
}

export async function clearCacheItem(key: string): Promise<void> {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.warn('[cache-widget.ts] localStorage clear failed:', error);
  }
}

export function isCacheExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
```

**Notas**:
- Implementação inicial com localStorage (todos os browsers modernos suportam)
- Preparado para migração a IndexedDB se cache > 5MB
- Sem dependências externas (usar APIs nativas)

---

### 2.4 Hooks

#### `hooks/useWeather.ts`
**Responsabilidade**: Gerenciar estado, fetch, refresh, auto-atualização de dados climáticos  
**Exporta**: `useWeather(latitude?, longitude?, location?): UseWeatherReturn`

**Interface de Retorno**:
```typescript
interface UseWeatherReturn {
  data: WeatherWidgetData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdate: string | null;
  isOffline: boolean;
}
```

**Comportamento**:
- Carrega dados ao montar (se `latitude` e `longitude` fornecidos)
- Auto-refresh a cada 30 minutos
- Suporta refresh manual via botão
- Gerencia loading/error state
- Persiste em cache para offline

**Pseudo-código**:
```typescript
export function useWeather(
  latitude?: number,
  longitude?: number,
  location: string = 'Sua fazenda'
) {
  const [data, setData] = useState<WeatherWidgetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!latitude || !longitude) return;

    setLoading(true);
    setError(null);

    try {
      const freshData = await fetchWeather(latitude, longitude, location);
      setData(freshData);
      
      // Save to cache
      await setCacheItem(
        `weather-${latitude}-${longitude}`,
        freshData,
        30 // 30 minutos
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));

      // Try cache
      const cached = await getCachedWeather(latitude, longitude);
      if (cached) {
        setData({ ...cached, isOffline: true });
      }
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, location]);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [latitude, longitude]);

  // Auto-refresh cada 30min
  useEffect(() => {
    const interval = setInterval(refresh, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdate: data?.fetchedAt ?? null,
    isOffline: data?.isOffline ?? false,
  };
}
```

**Dependências**: `lib/weather.ts`, `lib/cache-widget.ts`, `lib/types/weather.ts`

---

#### `hooks/useMarketQuotes.ts`
**Responsabilidade**: Gerenciar estado, fetch, refresh, auto-atualização de cotações  
**Exporta**: `useMarketQuotes(source?): UseMarketQuotesReturn`

**Interface de Retorno**:
```typescript
interface UseMarketQuotesReturn {
  data: MarketQuotesData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdate: string | null;
  isOffline: boolean;
}
```

**Comportamento**:
- Carrega dados ao montar
- Auto-refresh a cada 5 minutos (mercado é dinâmico)
- Suporta refresh manual
- Gerencia loading/error state
- Fallback a cache se API falhar

**Pseudo-código**:
```typescript
export function useMarketQuotes(source: 'mock' | 'cepea' = 'mock') {
  const [data, setData] = useState<MarketQuotesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const freshData = await fetchQuotes(source);
      setData(freshData);
      
      // Save to cache (2h)
      await setCacheItem('quotes', freshData, 120);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));

      // Try cache
      const cached = await getCachedQuotes();
      if (cached) {
        setData({ ...cached, isOffline: true });
      }
    } finally {
      setLoading(false);
    }
  }, [source]);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [source]);

  // Auto-refresh cada 5min
  useEffect(() => {
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdate: data?.fetchedAt ?? null,
    isOffline: data?.isOffline ?? false,
  };
}
```

**Dependências**: `lib/quotes.ts`, `lib/cache-widget.ts`, `lib/types/market.ts`

---

### 2.5 Components

#### `components/widgets/WeatherWidget.tsx`
**Responsabilidade**: Widget principal de clima com layout completo  
**Props**:
```typescript
interface WeatherWidgetProps {
  latitude?: number;
  longitude?: number;
  location?: string;
  className?: string;
}
```

**Estados Internos**:
- `data: WeatherWidgetData | null` — dados carregados
- `loading: boolean` — carregando
- `error: Error | null` — erro (exibe fallback)
- `isOffline: boolean` — servindo de cache

**Estrutura JSX**:
```
┌─────────────────────────────────────────────┐
│ Card (rounded-2xl, shadow-sm)               │
│  ┌──────────────────────────────────────┐   │
│  │ Header: "Previsão do Tempo"    [🔄]  │   │ ← com botão refresh
│  ├──────────────────────────────────────┤   │
│  │ [LOCATION] 📍 Curitiba, PR           │   │
│  │ [CURRENT WEATHER]                    │   │
│  │   22°C / Sente-se 20°C               │   │
│  │   💧 65% | 💨 12 km/h | 👁️ 5km      │   │
│  │ [FORECAST - 3 DIAS]                  │   │
│  │   [DayCard] [DayCard] [DayCard]      │   │
│  │ [ALERTS - se houver]                 │   │
│  │   ⚠️ Chuva esperada amanhã           │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Skeleton Loader** (enquanto `loading === true`):
- 3 skeleton lines para location/temp
- 3 skeleton cards para forecast
- Altura total ~250px

**Estado Vazio**:
- Se `!latitude || !longitude`:
  ```
  📍 Configure a localização da sua fazenda em Configurações
  para ver a previsão do tempo.
  ```

**Estado Erro**:
- Se `error && !isOffline`:
  ```
  ⚠️ Erro ao carregar previsão. Tente novamente.
  [Refresh Button]
  ```

**Responsividade**:
- Mobile: stack vertical, font menor
- Desktop: layout completo conforme ASCII acima
- Forecast cards: `grid-cols-1 sm:grid-cols-3`

**Acessibilidade**:
- `aria-label="Widget de previsão do tempo"`
- `aria-live="polite"` para atualizações
- `aria-label` em cada ícone de clima
- Valores de temperatura como texto (não apenas visual)

**Ícones Lucide**:
- CloudSun, CloudMoon, Cloud, CloudRain, CloudDrizzle, CloudLightning, CloudSnow, CloudFog
- Droplets (umidade), Wind (vento), Eye (visibilidade)
- RotateCcw (refresh), AlertTriangle (alerta)

**Dependências**: `hooks/useWeather.ts`, `lib/widget-utils.ts`, `lib/types/weather.ts`, componentes UI (Card, Skeleton, Button, etc)

---

#### `components/widgets/QuotesWidget.tsx`
**Responsabilidade**: Widget principal de cotações  
**Props**:
```typescript
interface QuotesWidgetProps {
  source?: 'mock' | 'cepea';
  className?: string;
}
```

**Estados Internos**:
- `data: MarketQuotesData | null`
- `loading: boolean`
- `error: Error | null`
- `isOffline: boolean`

**Estrutura JSX**:
```
┌────────────────────────────┐
│ Card (rounded-2xl)         │
│  ┌──────────────────────┐  │
│  │ Cotações de Mercado  │  │ [🔄] 14:32
│  ├──────────────────────┤  │
│  │ [QuoteCard] BOI      │  │
│  │ [QuoteCard] LEITE    │  │
│  │ [QuoteCard] MILHO    │  │
│  │ [QuoteCard] SOJA     │  │
│  │                      │  │
│  │ [Offline Badge]      │  │ (se isOffline)
│  └──────────────────────┘  │
└────────────────────────────┘
```

**Skeleton Loader**:
- 4 skeleton rows (um por commodity)
- Altura ~40px cada

**Estado Erro**:
- Se falhar E sem cache:
  ```
  ⚠️ Cotações indisponíveis no momento.
  [Refresh Button]
  ```

**Responsividade**:
- Mobile: stack vertical (cards fullwidth)
- Desktop: grid ou flex (conforme espaço)

**Acessibilidade**:
- `aria-label="Cotações de mercado"`
- Cada quote card com `role="article"`
- Variação (↑/↓) indicada textualmente além de cor

**Ícones Lucide**:
- Trending Up / Trending Down (tendência)
- RefreshCcw (botão refresh)
- AlertCircle (erro)

**Dependências**: `hooks/useMarketQuotes.ts`, `lib/widget-utils.ts`, `lib/types/market.ts`, `components/widgets/QuoteCard.tsx`

---

#### `components/widgets/QuoteCard.tsx`
**Responsabilidade**: Card individual de uma cotação  
**Props**:
```typescript
interface QuoteCardProps {
  quote: MarketQuote;
  className?: string;
}
```

**Estrutura JSX**:
```
┌──────────────────────────────┐
│ 🐄 Boi Gordo (@)             │
│ R$ 285,50                    │ ← grande, bold
│ ↑ +2,10 (+0,7%)              │ ← verde se up
│ H: 285,80 | L: 284,20        │ ← min/max 24h
└──────────────────────────────┘
```

**Estilos**:
- Trending UP: verde (`text-green-600`, ícone `TrendingUp`)
- Trending DOWN: vermelho (`text-red-600`, ícone `TrendingDown`)
- Trending STABLE: cinza (`text-gray-500`)
- Preço: `text-2xl font-bold`
- Variação: `text-sm font-semibold` com cor apropriada

**Acessibilidade**:
- Descrição textual: "{name} {currentPrice} {variation} {trend}"

**Dependências**: `lib/widget-utils.ts`, `lib/types/market.ts`, `lucide-react`

---

### 2.6 Dashboard Integration

#### Modificação: `app/dashboard/page.tsx`
**O QUE muda**:
1. Adicionar imports de WeatherWidget e QuotesWidget
2. Adicionar chamada a `useAuth()` para obter `latitude` e `longitude` da fazenda (preparação)
3. Inserir `<WeatherWidget />` entre greeting e stats grid
4. Substituir "Alertas Críticos" por `<QuotesWidget />` no main content grid

**COMO muda**:
```typescript
'use client';

import { ... } from 'react';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';
import { QuotesWidget } from '@/components/widgets/QuotesWidget';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { fazendaId, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fazendaData, setFazendaData] = useState<FazendaData | null>(null);

  // ── Fetch fazenda data (latitude/longitude) ──────────────
  useEffect(() => {
    if (!fazendaId || authLoading) return;
    const fetchFazendaData = async () => {
      const res = await supabase
        .from('fazendas')
        .select('latitude, longitude, localizacao')
        .eq('id', fazendaId)
        .single();
      
      if (res.data) {
        setFazendaData(res.data);
      }
    };
    fetchFazendaData();
  }, [fazendaId, authLoading]);

  // ... resto do código existente ...

  return (
    <div className="space-y-6 p-6">
      {/* Greeting */}
      <div className="text-3xl font-bold">
        {greeting}, {userName}! 👋
      </div>

      {/* ← NOVO: Weather Widget aqui */}
      {fazendaData && (
        <WeatherWidget
          latitude={fazendaData.latitude}
          longitude={fazendaData.longitude}
          location={fazendaData.localizacao}
        />
      )}

      {/* Stats Grid — sem mudanças */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ... cards existentes ... */}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes — sem mudanças */}
        <div className="lg:col-span-2">
          {/* ... */}
        </div>

        {/* ← SUBSTITUIR "Alertas Críticos" por Quotes Widget */}
        <div className="lg:col-span-1">
          <QuotesWidget source="mock" />
        </div>
      </div>
    </div>
  );
}
```

**POR QUE muda**:
- Clima é **crítico** para operações (decisões de colheita/silos)
- Deve ter visibilidade imediata (entre greeting e stats)
- Cotações informam decisões de venda/compra
- Substitui "Alertas Críticos" (menos usado, pode mover para notificações depois)

---

## 3. VARIÁVEIS DE AMBIENTE

### Necessárias para Implementação

#### `OPENWEATHER_API_KEY`
- **Descrição**: Chave de API do OpenWeatherMap (free tier)
- **Onde obter**: https://openweathermap.org/api → Sign up → API keys
- **Exemplo**: `abc123def456ghi789jkl012mno345pqr`
- **Onde colocar**: 
  - Dev: `.env.local`
  - Prod: Vercel Environment Variables
- **Acesso**: Apenas server-side (`app/api/weather/route.ts`)
- **Refazer**: Não, stável por anos

#### (Futuro) CEPEA_API_KEY ou QUOTES_API_URL
- **Descrição**: Configuração para API real de cotações (Fase 2)
- **Quando adicioná-la**: Ao integrar com API de verdade
- **Por enquanto**: Não necessária (usando mock)

---

## 4. ORDEM DE IMPLEMENTAÇÃO

**Sequência recomendada** (com checkpoints de teste):

### 1️⃣ **Tipagens & Schemas** (Baseline)
   - Criar `lib/types/weather.ts`
   - Criar `lib/types/market.ts`
   - ✅ Checkpoint: `npm run lint` — sem erros de tipos

### 2️⃣ **Utilities & Cache**
   - Criar `lib/widget-utils.ts` (formatação, cálculo alertas)
   - Criar `lib/cache-widget.ts` (localStorage)
   - ✅ Checkpoint: Testar `formatBRL(123.45)` → "R$ 123,45"

### 3️⃣ **API Routes** (Backend)
   - Criar `app/api/weather/route.ts`
   - Criar `app/api/cotacoes/route.ts`
   - Configurar `OPENWEATHER_API_KEY` em `.env.local`
   - ✅ Checkpoint: `curl http://localhost:3000/api/weather?latitude=-25.4&longitude=-49.3` → JSON válido

### 4️⃣ **Client Services**
   - Criar `lib/weather.ts` (fetch wrapper)
   - Criar `lib/quotes.ts` (fetch wrapper)
   - ✅ Checkpoint: Teste manual de `fetchWeather()` no console

### 5️⃣ **Hooks**
   - Criar `hooks/useWeather.ts`
   - Criar `hooks/useMarketQuotes.ts`
   - ✅ Checkpoint: Renderizar hook em teste, verificar auto-refresh

### 6️⃣ **Components**
   - Criar `components/widgets/QuoteCard.tsx`
   - Criar `components/widgets/QuotesWidget.tsx`
   - Criar `components/widgets/WeatherWidget.tsx`
   - ✅ Checkpoint: Storybook ou manual rendering com mock data

### 7️⃣ **Dashboard Integration**
   - Modificar `app/dashboard/page.tsx`
   - Adicionar campos `latitude`, `longitude` a `fazendas` table (via migration)
   - ✅ Checkpoint: Dashboard renderiza ambos widgets, não quebra layout existente

### 8️⃣ **Testing & Refinement**
   - Teste offline (DevTools Network offline)
   - Teste responsivo (mobile/tablet/desktop)
   - Teste acessibilidade (axe DevTools)
   - Teste performance (Lighthouse)

---

## 5. TESTES SUGERIDOS

### Testes Manuais (Validação Funcional)

#### Weather Widget
1. **Carregar dados**
   - Abrir dashboard com `latitude=-25.4, longitude=-49.3` (Curitiba)
   - Verificar clima atual + 3 dias aparecem
   - Verificar icons corretos (Sun, Cloud, CloudRain, etc)

2. **Refresh manual**
   - Clicar botão 🔄
   - Verificar `lastUpdate` timestamp muda
   - Verificar sem erro no console

3. **Offline**
   - DevTools Network → Offline
   - Recarregar página
   - Verificar dados aparecem de cache com badge "Offline"

4. **Alertas críticos**
   - Mock resposta com `precipitationMm: 40` (chuva forte)
   - Verificar alerta vermelho aparece
   - Verificar mensagem é legível

5. **Sem localização**
   - Apagar `latitude` dos props
   - Verificar mensagem "Configure a localização..."

#### Quotes Widget
1. **Carrega 4 cotações**
   - Verificar BOI, LEITE, MILHO, SOJA aparecem
   - Verificar preços formatados em BRL
   - Verificar variação % correta

2. **Trend visual**
   - Mock variação > 1% → trending up (verde, ↑)
   - Mock variação < -1% → trending down (vermelho, ↓)
   - Mock variação entre → stable (cinza, →)

3. **Refresh automático**
   - Notar timestamp
   - Esperar 5min (ou mock relógio)
   - Verificar timestamp muda

4. **Offline**
   - Network offline
   - Recarregar
   - Verificar badge "Offline" aparece
   - Verificar dados visíveis do cache

#### Responsividade
1. **Mobile (<640px)**
   - Weather forecast cards: stack vertical
   - Quote cards: fullwidth, sem grid
   - Sem truncamento de texto

2. **Tablet (640-1024px)**
   - Weather forecast: 2 cards, 1 embaixo
   - Quote cards: 2 colunas

3. **Desktop (>1024px)**
   - Weather: layout conforme spec
   - Quotes no grid lg:col-span-1

#### Acessibilidade
1. **Screen reader** (NVDA/JAWS)
   - Ler título widget
   - Ler temperatura e umidade
   - Ler nome commodity e preço

2. **Keyboard nav**
   - Tab ao botão refresh
   - Enter para click

3. **Contraste de cores**
   - Axe DevTools: sem alertas
   - Validar verde/vermelho + símbolo (not color-only)

### Edge Cases
- **API timeout**: Request > 10s → fallback cache imediato
- **Formato inválido**: API retorna HTML (erro 500) → fallback cache + error toast
- **Cache corrompida**: localStorage com JSON inválido → clear + retry
- **Localização inválida**: latitude > 90 ou < -90 → validation error 400
- **Sem internet ao montar**: componenteDidMount offline → cache se existir, senão skeleton indefinido

---

## 6. ESTRUTURA FINAL DE ARQUIVOS

```
app/
├── api/
│   ├── weather/
│   │   └── route.ts                    ← NEW
│   └── cotacoes/
│       └── route.ts                    ← NEW
├── dashboard/
│   └── page.tsx                        ← MODIFY (adicionar widgets)
│
lib/
├── types/
│   ├── weather.ts                      ← NEW
│   └── market.ts                       ← NEW
├── weather.ts                          ← NEW (client service)
├── quotes.ts                           ← NEW (client service)
├── widget-utils.ts                     ← NEW (helpers)
├── cache-widget.ts                     ← NEW (cache logic)
└── [existentes — sem mudanças]
│
hooks/
├── useWeather.ts                       ← NEW
├── useMarketQuotes.ts                  ← NEW
└── [existentes — sem mudanças]
│
components/
├── widgets/
│   ├── WeatherWidget.tsx               ← NEW
│   ├── QuotesWidget.tsx                ← NEW
│   ├── QuoteCard.tsx                   ← NEW
│   └── [sub-componentes weather se necessário]
└── [existentes — sem mudanças]

docs/
├── PRD-widgets-dashboard.md            ← Existente
└── SPEC-widgets-dashboard.md           ← Este arquivo (NEW)
```

---

## 7. DEPENDÊNCIAS EXTERNAS

### Já Disponíveis (package.json — NÃO ADICIONAR)
- ✅ `react` 19+
- ✅ `next` 15.4+
- ✅ `lucide-react` 0.553+
- ✅ `recharts` 3.8+ (para mini-gráficos futuros)
- ✅ `date-fns` 4.1+
- ✅ `sonner` 2.0+ (toasts)
- ✅ `zod` 4.3+ (validação)
- ✅ `@supabase/supabase-js` (para fetch fazenda data)

### Nenhuma Nova Dependência Necessária
Todas as libs acima já estão no projeto. **NÃO adicionar** axios, ky, ou similares — usar `fetch` nativo.

---

## 8. NOTAS FINAIS

### Convenções de Código Esperadas
1. **TypeScript strict mode**: Sem `any`, todos os types explícitos
2. **Error handling**: Try-catch em async, nunca fail silently
3. **Logging**: `console.error` em API routes, `console.warn` para fallbacks
4. **Naming**: camelCase para vars, PascalCase para componentes/types
5. **Imports**: Usar `@/` alias para paths (já configurado no projeto)
6. **Components**: Usar `'use client'` apenas onde necessário (hooks com state)

### Padrões Visuais
- **Card**: `rounded-2xl shadow-sm hover:shadow-md` (do projeto)
- **Cores**: Design system existente (verde primário, etc)
- **Spacing**: Tailwind utilities (`gap-4`, `p-6`, etc)
- **Responsividade**: `sm:`, `lg:` breakpoints (mobile-first)

### Performance
- **Lazy loading**: Importar componentes com `dynamic()` se houver múltiplos
- **Memoization**: Usar `useMemo` para alertas (se array grande)
- **Request coalescing**: Não fazer 2 requests simultâneos da mesma data
- **Bundle size**: Não adicionar libs pesadas (lodash, moment, etc)

### Segurança
- **API key**: Nunca logar ou enviar para client
- **CORS**: OpenWeatherMap tem CORS habilitado, OK para server-side
- **Input validation**: Zod em todos os endpoints
- **Sanitização**: Não interpolar `location` string diretamente em URLs

---

## Anexo A: Exemplo de Mock Data para Cotações

```json
{
  "quotes": [
    {
      "symbol": "BOI",
      "name": "Boi Gordo",
      "unit": "@",
      "currentPrice": 285.50,
      "previousPrice": 282.80,
      "variation": 2.70,
      "variationPercent": 0.95,
      "trend": "up",
      "lastUpdate": "2026-04-14T10:00:00Z",
      "source": "mock",
      "high24h": 286.20,
      "low24h": 282.50
    },
    {
      "symbol": "LEITE",
      "name": "Leite (R$/L)",
      "unit": "L",
      "currentPrice": 1.89,
      "previousPrice": 1.84,
      "variation": 0.05,
      "variationPercent": 2.72,
      "trend": "up",
      "lastUpdate": "2026-04-14T10:00:00Z",
      "source": "mock",
      "high24h": 1.90,
      "low24h": 1.83
    },
    {
      "symbol": "MILHO",
      "name": "Milho (sc 60kg)",
      "unit": "sc",
      "currentPrice": 68.30,
      "previousPrice": 69.50,
      "variation": -1.20,
      "variationPercent": -1.73,
      "trend": "down",
      "lastUpdate": "2026-04-14T10:00:00Z",
      "source": "mock",
      "high24h": 69.80,
      "low24h": 68.00
    },
    {
      "symbol": "SOJA",
      "name": "Soja (sc 60kg)",
      "unit": "sc",
      "currentPrice": 135.40,
      "previousPrice": 131.60,
      "variation": 3.80,
      "variationPercent": 2.88,
      "trend": "up",
      "lastUpdate": "2026-04-14T10:00:00Z",
      "source": "mock",
      "high24h": 135.80,
      "low24h": 131.50
    }
  ],
  "lastUpdate": "2026-04-14T10:00:00Z",
  "fetchedAt": "2026-04-14T10:00:15Z",
  "isOffline": false,
  "isAvailable": true,
  "cacheExpiresAt": "2026-04-14T12:00:15Z"
}
```

---

## Anexo B: OpenWeatherMap Response → Mapping

```typescript
// OpenWeatherMap current
{
  "coord": { "lon": -49.3, "lat": -25.4 },
  "weather": [
    { "id": 803, "main": "Clouds", "description": "nublado", "icon": "04d" }
  ],
  "main": {
    "temp": 22,
    "feels_like": 20,
    "temp_min": 18,
    "temp_max": 24,
    "pressure": 1013,
    "humidity": 65,
    "visibility": 5000
  },
  "wind": { "speed": 3.5, "deg": 120 },
  "clouds": { "all": 75 },
  "rain": { "1h": 0 },
  "dt": 1713095415
}

// → WeatherCurrent
{
  "temperature": 22,
  "feelsLike": 20,
  "humidity": 65,
  "windSpeed": 12.6,  // 3.5 m/s * 3.6
  "windDegree": 120,
  "cloudCover": 75,
  "precipitationMm": 0,
  "description": "Nublado",
  "icon": "Cloud",      // mapped from "04d"
  "visibility": 5000
}
```

---

## Conclusão

Esta especificação técnica proporciona:
- ✅ Tipagem completa (TypeScript + Zod)
- ✅ API Routes server-side seguras
- ✅ Hooks reutilizáveis para state management
- ✅ Componentes responsivos e acessíveis
- ✅ Cache offline com fallback
- ✅ Estratégia de mock → real para cotações
- ✅ Ordem clara de implementação com checkpoints

**Próximo passo**: Implementação seguindo sequência § 4, começando por tipagens e schemas.
