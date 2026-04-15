import { z } from 'zod';

/**
 * ──────────────────────────────────────────────────────────────
 * TYPES: Weather Widget
 * ──────────────────────────────────────────────────────────────
 */

export type WeatherCurrent = {
  temperature: number;           // °C
  feelsLike: number;            // sensação térmica
  humidity: number;              // 0-100 %
  windSpeed: number;             // km/h
  windDegree: number;            // 0-360° (direção do vento)
  cloudCover: number;            // 0-100 %
  precipitationMm: number;       // mm (chuva atual)
  description: string;           // "Ensolarado", "Nublado", etc
  icon: string;                  // nome ícone Lucide: "CloudSun", "CloudRain", etc
  visibility: number;            // metros
};

export type WeatherForecast = {
  date: string;                  // formato "YYYY-MM-DD" (apenas data, não datetime)
  dayOfWeek: string;             // "Terça"
  tempMin: number;               // °C
  tempMax: number;               // °C
  precipitationMm: number;       // mm
  precipitationProbability: number;  // 0-100 %
  description: string;           // "Nublado", etc
  icon: string;                  // nome ícone Lucide
};

export type WeatherAlert = {
  type: 'rain' | 'temperature' | 'wind';
  severity: 'warning' | 'critical';
  message: string;               // "Chuva > 30mm esperada"
  affectedHours: number;         // quantas horas a partir de agora
};

export type WeatherWidgetData = {
  location: string;              // "Curitiba, PR"
  latitude: number;
  longitude: number;
  current: WeatherCurrent;
  forecast: WeatherForecast[];   // próximos 3 dias
  alerts: WeatherAlert[];
  lastUpdate: string;            // ISO timestamp da API (OpenWeatherMap)
  fetchedAt: string;             // ISO timestamp do fetch local
  isOffline: boolean;            // true se servido de cache
  cacheExpiresAt: string;        // ISO timestamp when cache expires
};

/**
 * ──────────────────────────────────────────────────────────────
 * ZOD SCHEMAS: Validação
 * ──────────────────────────────────────────────────────────────
 */

export const weatherCurrentSchema = z.object({
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

export const weatherForecastSchema = z.object({
  date: z.string(),  // "YYYY-MM-DD" — CORREÇÃO 4: não é datetime
  dayOfWeek: z.string(),
  tempMin: z.number(),
  tempMax: z.number(),
  precipitationMm: z.number().nonnegative(),
  precipitationProbability: z.number().min(0).max(100),
  description: z.string(),
  icon: z.string(),
});

export const weatherAlertSchema = z.object({
  type: z.enum(['rain', 'temperature', 'wind']),
  severity: z.enum(['warning', 'critical']),
  message: z.string(),
  affectedHours: z.number().positive(),
});

export const weatherWidgetDataSchema = z.object({
  location: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  current: weatherCurrentSchema,
  forecast: z.array(weatherForecastSchema).min(1),
  alerts: z.array(weatherAlertSchema).default([]),
  lastUpdate: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  isOffline: z.boolean().default(false),
  cacheExpiresAt: z.string().datetime(),
});
