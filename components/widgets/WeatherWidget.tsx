'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Cloud, Droplets, RefreshCw, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { WeatherWidgetData } from '@/lib/weather';
import {
  formatTemperature,
  formatDateTime,
  formatForecastDate,
  getWeatherIconComponent,
  getWindDirection,
} from '@/lib/widget-utils';
import { getCacheItem, setCacheItem, isCacheExpired } from '@/lib/cache-widget';
import { cn } from '@/lib/utils';

interface WeatherWidgetProps {
  latitude?: number | null;
  longitude?: number | null;
  location?: string;
}

/**
 * ──────────────────────────────────────────────────────────────
 * WEATHER WIDGET
 * ──────────────────────────────────────────────────────────────
 *
 * Exibe previsão do tempo com:
 * - Clima atual (temperatura, umidade, vento)
 * - Previsão para próximos 3 dias
 * - Alertas críticos (chuva, vento, temperatura)
 * - Auto-refresh a cada 30 minutos
 * - Cache em localStorage
 */

export function WeatherWidget({
  latitude,
  longitude,
  location = 'Sua fazenda',
}: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache key
  const cacheKey = latitude && longitude ? `weather-${latitude}-${longitude}` : null;

  /**
   * Fetch dados de clima
   */
  const fetchWeather = useCallback(async () => {
    if (!latitude || !longitude) {
      setError('Localização não configurada');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        location: location,
      });

      const res = await fetch(`/api/weather?${params}`, {
        next: { revalidate: 1800 }, // 30 minutos
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const weatherData: WeatherWidgetData = await res.json();

      // Validar dados
      if (weatherData.forecast.length === 0) {
        throw new Error('Dados de previsão inválidos');
      }

      // Salvar em cache
      if (cacheKey) {
        setCacheItem(cacheKey, weatherData, 30); // 30 minutos TTL
      }

      setData(weatherData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao buscar clima';

      // Tentar recuperar do cache
      if (cacheKey) {
        const cached = getCacheItem<WeatherWidgetData>(cacheKey);
        if (cached) {
          setData({ ...cached, isOffline: true });
          setError('Mostrando dados em cache');
          return;
        }
      }

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [latitude, longitude, location, cacheKey]);

  /**
   * Carregar ao montar ou quando lat/lon mudam
   */
  useEffect(() => {
    // Tentar carregar do cache primeiro
    if (cacheKey && !data) {
      const cached = getCacheItem<WeatherWidgetData>(cacheKey);
      if (cached && !isCacheExpired(cached.cacheExpiresAt)) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    fetchWeather();
  }, [latitude, longitude, cacheKey, fetchWeather, data]);

  /**
   * Auto-refresh a cada 30 minutos
   */
  useEffect(() => {
    if (!latitude || !longitude) return;

    const interval = setInterval(() => {
      setRefreshing(true);
      fetchWeather();
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, [latitude, longitude, fetchWeather]);

  // Estado vazio: sem localização
  if (!latitude || !longitude) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Previsão do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Configure a localização da sua fazenda em Configurações para ver a
          previsão do tempo.
        </CardContent>
      </Card>
    );
  }

  // Loading
  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Previsão do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Erro
  if (error && !data) {
    return (
      <Card className="rounded-2xl shadow-sm border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-red-900">
            Erro na Previsão
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-800">
          <p className="mb-3">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchWeather();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const current = data.current;
  const forecast = data.forecast;
  const WindIcon = Wind;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg font-semibold">
            📍 {data.location}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Atualizado {formatDateTime(data.fetchedAt)}
            {data.isOffline && ' (offline)'}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setRefreshing(true);
            fetchWeather();
          }}
          disabled={refreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw
            className={cn('w-4 h-4', refreshing && 'animate-spin')}
          />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* CLIMA ATUAL */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Agora
          </h3>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {formatTemperature(current.temperature)}
                </span>
                <span className="text-sm text-muted-foreground">
                  Sensação: {formatTemperature(current.feelsLike)}
                </span>
              </div>
              <div>
                {(() => {
                  const IconComponent = getWeatherIconComponent(current.icon);
                  return (
                    <IconComponent className="w-12 h-12 text-blue-600" />
                  );
                })()}
              </div>
            </div>

            <p className="text-sm capitalize text-muted-foreground">
              {current.description}
            </p>

            {/* Mini cards de info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-2 text-center">
                <Droplets className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <p className="text-sm font-medium">{current.humidity}%</p>
                <p className="text-xs text-muted-foreground">Umidade</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <WindIcon className="w-4 h-4 mx-auto text-cyan-500 mb-1" />
                <p className="text-sm font-medium">
                  {current.windSpeed.toFixed(1)} km/h
                </p>
                <p className="text-xs text-muted-foreground">
                  {getWindDirection(current.windDegree)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <Cloud className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                <p className="text-sm font-medium">{current.cloudCover}%</p>
                <p className="text-xs text-muted-foreground">Nuvens</p>
              </div>
            </div>
          </div>
        </div>

        {/* PREVISÃO 3 DIAS */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Próximos 3 dias
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {forecast.map((day) => {
              const IconComponent = getWeatherIconComponent(day.icon);
              return (
                <div
                  key={day.date}
                  className="bg-slate-50 rounded-xl p-3 text-center space-y-2"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatForecastDate(day.date)}
                  </p>
                  <IconComponent className="w-8 h-8 mx-auto text-slate-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {formatTemperature(day.tempMax)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTemperature(day.tempMin)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-blue-600 font-medium">
                      {day.precipitationProbability}% chuva
                    </p>
                    {day.precipitationMm > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {day.precipitationMm.toFixed(1)}mm
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ALERTAS */}
        {data.alerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Alertas
            </h3>
            {data.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-lg p-3 flex items-start gap-3',
                  alert.severity === 'critical'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-5 h-5 flex-shrink-0 mt-0.5',
                    alert.severity === 'critical'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  )}
                />
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      alert.severity === 'critical'
                        ? 'text-red-900'
                        : 'text-yellow-900'
                    )}
                  >
                    {alert.message}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      alert.severity === 'critical'
                        ? 'text-red-700'
                        : 'text-yellow-700'
                    )}
                  >
                    Próximas {alert.affectedHours}h
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
