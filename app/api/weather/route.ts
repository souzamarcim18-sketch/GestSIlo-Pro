import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  type WeatherWidgetData,
  type WeatherCurrent,
  type WeatherForecast,
  weatherWidgetDataSchema,
} from '@/lib/weather';
import { calculateAlerts, getWeatherIcon } from '@/lib/widget-utils';

/**
 * ──────────────────────────────────────────────────────────────
 * WEATHER API ROUTE
 * ──────────────────────────────────────────────────────────────
 *
 * GET /api/weather?latitude=X&longitude=Y&location=Curitiba,%20PR
 *
 * Busca dados de clima da OpenWeatherMap e retorna em nosso formato.
 * - Cache server-side: Map em memória (últimas buscas)
 * - Fallback: se API falhar, retorna cache + isOffline: true
 * - Headers: Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600
 */

/**
 * Cache em memória server-side
 * Chave: "lat,lon" → WeatherWidgetData + timestamp
 */
const weatherCache = new Map<
  string,
  {
    data: WeatherWidgetData;
    timestamp: number;
  }
>();

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Validação de params
 */
const queryParamsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  location: z.string().optional().default('Sua fazenda'),
});

/**
 * Schema da resposta da OpenWeatherMap (weather)
 */
interface OpenWeatherCurrent {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    visibility: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  rain?: {
    '1h': number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  dt: number;
}

/**
 * Schema da resposta da OpenWeatherMap (forecast)
 */
interface OpenWeatherForecast {
  list: Array<{
    dt: number;
    main: {
      temp_min: number;
      temp_max: number;
    };
    rain?: {
      '3h': number;
    };
    pop: number; // probabilidade de precipitação (0-1)
    weather: Array<{
      description: string;
      icon: string;
    }>;
  }>;
}

/**
 * Transforma resposta OpenWeatherMap para nosso formato
 */
function transformOpenWeatherMap(
  current: OpenWeatherCurrent,
  forecast: OpenWeatherForecast,
  location: string,
  latitude: number,
  longitude: number
): WeatherWidgetData {
  // Transformar clima atual
  const weatherCurrent: WeatherCurrent = {
    temperature: Math.round(current.main.temp * 10) / 10,
    feelsLike: Math.round(current.main.feels_like * 10) / 10,
    humidity: current.main.humidity,
    windSpeed: Math.round(current.wind.speed * 3.6 * 10) / 10, // convert m/s to km/h
    windDegree: current.wind.deg,
    cloudCover: current.clouds.all,
    precipitationMm: current.rain?.['1h'] ?? 0,
    description: current.weather[0]?.description ?? 'Desconhecido',
    icon: getWeatherIcon(current.weather[0]?.icon ?? ''),
    visibility: current.main.visibility,
  };

  // Agrupar forecast por dia (API retorna a cada 3h)
  // Pegar apenas os próximos 3 dias
  const forecastByDay = new Map<
    string,
    {
      temps: number[];
      minTemp: number;
      maxTemp: number;
      precipitations: number[];
      popValues: number[];
      description: string;
      icon: string;
      date: string;
    }
  >();

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  forecast.list.forEach((item) => {
    const itemDate = new Date(item.dt * 1000);

    // Ignorar dados de hoje e pegar apenas próximos 3 dias
    if (itemDate < now || itemDate > threeDaysLater) {
      return;
    }

    const dateKey = itemDate.toISOString().split('T')[0]; // "2026-04-15"

    if (!forecastByDay.has(dateKey)) {
      forecastByDay.set(dateKey, {
        temps: [],
        minTemp: Infinity,
        maxTemp: -Infinity,
        precipitations: [],
        popValues: [],
        description: '',
        icon: '',
        date: dateKey,
      });
    }

    const dayData = forecastByDay.get(dateKey)!;
    const avgTemp = (item.main.temp_min + item.main.temp_max) / 2;

    dayData.temps.push(avgTemp);
    dayData.minTemp = Math.min(dayData.minTemp, item.main.temp_min);
    dayData.maxTemp = Math.max(dayData.maxTemp, item.main.temp_max);
    dayData.precipitations.push(item.rain?.['3h'] ?? 0);
    dayData.popValues.push(item.pop ?? 0);
    dayData.description = item.weather[0]?.description ?? dayData.description;
    dayData.icon = item.weather[0]?.icon ?? dayData.icon;
  });

  // Converter Map para array e arredondar valores
  const weatherForecast: WeatherForecast[] = Array.from(forecastByDay.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3) // primeiros 3 dias
    .map((day) => ({
      date: day.date,
      dayOfWeek: getDayOfWeekPt(new Date(day.date)),
      tempMin: Math.round(day.minTemp * 10) / 10,
      tempMax: Math.round(day.maxTemp * 10) / 10,
      precipitationMm: Math.round(day.precipitations.reduce((a, b) => a + b, 0) * 10) / 10,
      precipitationProbability: Math.round(
        (day.popValues.reduce((a, b) => a + b, 0) / day.popValues.length) * 100
      ),
      description: day.description,
      icon: getWeatherIcon(day.icon),
    }));

  // Calcular alertas
  const alerts = calculateAlerts(weatherCurrent, weatherForecast);

  // Calcular expiração do cache (30 minutos)
  const now_iso = new Date();
  const expiresAt = new Date(now_iso.getTime() + 30 * 60 * 1000);

  return {
    location,
    latitude,
    longitude,
    current: weatherCurrent,
    forecast: weatherForecast,
    alerts,
    lastUpdate: new Date(current.dt * 1000).toISOString(),
    fetchedAt: now_iso.toISOString(),
    isOffline: false,
    cacheExpiresAt: expiresAt.toISOString(),
  };
}

/**
 * Retorna nome do dia da semana em português
 */
function getDayOfWeekPt(date: Date): string {
  const days = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];
  return days[date.getDay()];
}

/**
 * Handler GET
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Parse & validate
    const url = new URL(req.url);
    const latitude = parseFloat(url.searchParams.get('latitude') ?? '');
    const longitude = parseFloat(url.searchParams.get('longitude') ?? '');
    const location = url.searchParams.get('location') ?? 'Sua fazenda';

    const params = queryParamsSchema.parse({ latitude, longitude, location });

    // 2. Check cache
    const cacheKey = `${params.latitude},${params.longitude}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          'X-Cache-Status': 'hit',
        },
      });
    }

    // 3. Fetch from OpenWeatherMap
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error('[weather/route] OPENWEATHER_API_KEY not configured');

      // Tentar retornar do cache mesmo que expirado
      if (cached) {
        const offlineData: WeatherWidgetData = {
          ...cached.data,
          isOffline: true,
        };
        return NextResponse.json(offlineData, {
          headers: {
            'Cache-Control': 'public, s-maxage=1800',
            'X-Cache-Status': 'offline',
          },
        });
      }

      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${params.latitude}&lon=${params.longitude}&units=metric&lang=pt_br&appid=${apiKey}`,
        { next: { revalidate: 600 } } // 10 min revalidate
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${params.latitude}&lon=${params.longitude}&units=metric&lang=pt_br&appid=${apiKey}`,
        { next: { revalidate: 600 } }
      ),
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      console.warn('[weather/route] OpenWeatherMap API failed', {
        currentStatus: currentRes.status,
        forecastStatus: forecastRes.status,
      });

      // Fallback: retornar cache com isOffline: true
      if (cached) {
        const offlineData: WeatherWidgetData = {
          ...cached.data,
          isOffline: true,
        };
        return NextResponse.json(offlineData, {
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

    // 4. Parse & transform
    const current: OpenWeatherCurrent = await currentRes.json();
    const forecast: OpenWeatherForecast = await forecastRes.json();

    const weatherData = transformOpenWeatherMap(
      current,
      forecast,
      params.location,
      params.latitude,
      params.longitude
    );

    // Validate against schema
    const validated = weatherWidgetDataSchema.parse(weatherData);

    // 5. Save to cache
    weatherCache.set(cacheKey, {
      data: validated,
      timestamp: Date.now(),
    });

    // 6. Return
    return NextResponse.json(validated, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'X-Cache-Status': 'miss',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[weather/route] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
