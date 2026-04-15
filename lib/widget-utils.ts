import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  TrendingDown,
  TrendingUp,
  Minus,
  Wind,
} from 'lucide-react';
import type { WeatherAlert, WeatherCurrent, WeatherForecast } from '@/lib/weather';

/**
 * ──────────────────────────────────────────────────────────────
 * FORMATTING UTILITIES
 * ──────────────────────────────────────────────────────────────
 */

/**
 * Formata temperatura com unidade
 * @param value Temperatura em °C
 * @param unit 'C' | 'F' (padrão: 'C')
 * @returns "22.0°C" ou "71.6°F"
 */
export function formatTemperature(value: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    const fahrenheit = (value * 9) / 5 + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }
  return `${value.toFixed(1)}°C`;
}

/**
 * Formata valor em BRL
 * @param value Valor numérico
 * @returns "R$ 285,50"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata percentual com sinal
 * @param value Percentual (ex: 2.5 para 2,5%)
 * @returns "+2,50%" ou "-1,80%"
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Formata data e hora local
 * @param date ISO string ou Date
 * @returns "14/04 às 14:32"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd/MM 'às' HH:mm", { locale: ptBR });
}

/**
 * Formata data para exibição de previsão
 * @param date ISO string no formato "YYYY-MM-DD"
 * @returns "Hoje", "Amanhã", ou "16/04"
 */
export function formatForecastDate(date: string, referenceDate: Date = new Date()): string {
  const forecastDate = new Date(date);
  const today = new Date(referenceDate);

  // Comparar apenas datas (ignorar hora)
  const todayStr = today.toISOString().split('T')[0];
  const forecastStr = forecastDate.toISOString().split('T')[0];

  if (todayStr === forecastStr) {
    return 'Hoje';
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (tomorrowStr === forecastStr) {
    return 'Amanhã';
  }

  return format(forecastDate, 'dd/MM', { locale: ptBR });
}

/**
 * ──────────────────────────────────────────────────────────────
 * ICON MAPPING
 * ──────────────────────────────────────────────────────────────
 */

/**
 * Mapeia código de ícone OpenWeatherMap para nome de ícone Lucide
 * Códigos OpenWeatherMap: 01d, 01n, 02d, 02n, etc.
 * Ver: https://openweathermap.org/weather-conditions
 */
export function getWeatherIcon(openWeatherCode: string): string {
  const code = openWeatherCode.slice(0, 2);

  const iconMap: Record<string, string> = {
    '01': 'Sun',               // clear sky
    '02': 'CloudSun',          // few clouds
    '03': 'Cloud',             // scattered clouds
    '04': 'Cloud',             // broken clouds
    '09': 'CloudDrizzle',      // shower rain
    '10': 'CloudRain',         // rain
    '11': 'CloudLightning',    // thunderstorm
    '13': 'CloudSnow',         // snow
    '50': 'CloudFog',          // mist
  };

  return iconMap[code] || 'Cloud';
}

/**
 * Retorna componente de ícone Lucide baseado no nome
 */
export function getWeatherIconComponent(iconName: string) {
  const iconMap: Record<string, React.ComponentType<any>> = {
    Sun: Sun,
    Cloud: Cloud,
    CloudSun: CloudSun,
    CloudRain: CloudRain,
    CloudDrizzle: CloudDrizzle,
    CloudLightning: CloudLightning,
    CloudSnow: CloudSnow,
    CloudFog: CloudFog,
    Droplets: Droplets,
    Wind: Wind,
  };

  return iconMap[iconName] || Cloud;
}

/**
 * Retorna ícone de tendência (TrendingUp, TrendingDown, Minus)
 */
export function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  const iconMap: Record<string, React.ComponentType<any>> = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  };

  return iconMap[trend] || Minus;
}

/**
 * ──────────────────────────────────────────────────────────────
 * WIND & DIRECTION
 * ──────────────────────────────────────────────────────────────
 */

/**
 * Converte graus para direção cardeal
 * @param degree 0-360
 * @returns "N", "NE", "L", "SE", etc.
 */
export function getWindDirection(degree: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'L', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const index = Math.round((degree % 360) / 22.5);
  return directions[index % directions.length];
}

/**
 * Converte velocidade do vento de m/s para km/h
 */
export function convertWindSpeed(meterPerSecond: number): number {
  return meterPerSecond * 3.6;
}

/**
 * ──────────────────────────────────────────────────────────────
 * WEATHER ALERTS
 * ──────────────────────────────────────────────────────────────
 */

/**
 * Calcula alertas críticos baseado nos dados de clima
 * - Chuva > 30mm esperada
 * - Vento > 40 km/h
 * - Queda brusca de temperatura > 10°C nos próximos dias
 */
export function calculateAlerts(
  current: WeatherCurrent,
  forecast: WeatherForecast[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Alerta de chuva
  if (current.precipitationMm > 30 || forecast.some((f) => f.precipitationMm > 30)) {
    alerts.push({
      type: 'rain',
      severity: 'critical',
      message: 'Chuva > 30mm esperada. Cuidado com silos abertos!',
      affectedHours: 24,
    });
  } else if (
    current.precipitationMm > 5 ||
    forecast.some((f) => f.precipitationProbability > 70)
  ) {
    alerts.push({
      type: 'rain',
      severity: 'warning',
      message: 'Chuva esperada nos próximos dias',
      affectedHours: 48,
    });
  }

  // Alerta de vento
  if (current.windSpeed > 40) {
    alerts.push({
      type: 'wind',
      severity: 'critical',
      message: `Vento forte: ${current.windSpeed.toFixed(1)} km/h. Risco de danos a estruturas.`,
      affectedHours: 12,
    });
  } else if (current.windSpeed > 30) {
    alerts.push({
      type: 'wind',
      severity: 'warning',
      message: `Vento moderado: ${current.windSpeed.toFixed(1)} km/h`,
      affectedHours: 12,
    });
  }

  // Alerta de queda de temperatura
  if (forecast.length > 0) {
    const currentTemp = current.temperature;
    const nextDayTemp = forecast[0]?.tempMin ?? currentTemp;
    const tempDrop = currentTemp - nextDayTemp;

    if (tempDrop > 10) {
      alerts.push({
        type: 'temperature',
        severity: 'warning',
        message: `Queda brusca de temperatura: -${tempDrop.toFixed(1)}°C esperada`,
        affectedHours: 48,
      });
    }
  }

  return alerts;
}
