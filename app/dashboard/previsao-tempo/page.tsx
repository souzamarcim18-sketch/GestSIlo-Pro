'use client';

import { useAuth } from '@/hooks/useAuth';
import { useFazendaCoordinates } from '@/hooks/useFazendaCoordinates';
import { WeatherWidget } from '@/components/widgets';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CloudSun, MapPin, Settings, Sprout, Droplets, Wind, Thermometer, Eye } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import type { WeatherWidgetData } from '@/lib/weather';
import { formatTemperature, getWindDirection } from '@/lib/widget-utils';
import { Skeleton } from '@/components/ui/skeleton';

const agriTips: Record<string, { icon: React.ElementType; tip: string; color: string }[]> = {
  rain: [
    { icon: Droplets, tip: 'Evite aplicação de defensivos agrícolas durante ou antes de chuvas.', color: 'text-blue-600' },
    { icon: Sprout, tip: 'Bom período para transplante de mudas — o solo ficará úmido.', color: 'text-green-600' },
  ],
  wind: [
    { icon: Wind, tip: 'Vento forte: suspenda pulverizações para evitar deriva de produtos.', color: 'text-cyan-600' },
    { icon: Eye, tip: 'Monitore a estrutura de silos e coberturas com vento acima de 40 km/h.', color: 'text-orange-600' },
  ],
  hot: [
    { icon: Thermometer, tip: 'Temperatura elevada: aumente a frequência de hidratação do rebanho.', color: 'text-red-600' },
    { icon: Sprout, tip: 'Prefira realizar operações de campo no início da manhã ou final da tarde.', color: 'text-green-600' },
  ],
  cold: [
    { icon: Thermometer, tip: 'Temperatura baixa: verifique a proteção do rebanho contra o frio.', color: 'text-blue-500' },
    { icon: Sprout, tip: 'Atenção ao risco de geada em culturas sensíveis.', color: 'text-green-600' },
  ],
  clear: [
    { icon: Sprout, tip: 'Dia propício para operações de campo, colheita e movimentação de silagem.', color: 'text-green-600' },
    { icon: Droplets, tip: 'Aproveite o tempo seco para aplicação de defensivos de contato.', color: 'text-blue-600' },
  ],
};

function getAgriTips(data: WeatherWidgetData) {
  const tips: { icon: React.ElementType; tip: string; color: string }[] = [];
  const { current, alerts } = data;

  if (alerts.some(a => a.type === 'rain')) tips.push(...(agriTips.rain ?? []));
  if (alerts.some(a => a.type === 'wind')) tips.push(...(agriTips.wind ?? []));
  if (current.temperature > 35) tips.push(...(agriTips.hot ?? []));
  if (current.temperature < 10) tips.push(...(agriTips.cold ?? []));
  if (tips.length === 0) tips.push(...(agriTips.clear ?? []));

  return tips.slice(0, 3);
}

export default function PrevisaoTempoPage() {
  const { fazendaId } = useAuth();
  const { latitude, longitude, location } = useFazendaCoordinates(fazendaId);
  const [weatherData, setWeatherData] = useState<WeatherWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = useCallback(async () => {
    if (!latitude || !longitude) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        location: location ?? 'Sua fazenda',
      });
      const res = await fetch(`/api/weather?${params}`);
      if (res.ok) setWeatherData(await res.json());
    } catch {
      // WeatherWidget handles error state
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, location]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  const tips = weatherData ? getAgriTips(weatherData) : [];

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen bg-muted/30">

      {/* Cabeçalho */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <CloudSun className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Previsão do Tempo</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location ?? 'Localização não configurada'}
            </p>
          </div>
        </div>
      </div>

      {/* Sem localização */}
      {!latitude && !longitude && !loading && (
        <Card className="rounded-2xl shadow-sm border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <MapPin className="h-8 w-8 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Localização da fazenda não configurada
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Configure as coordenadas da sua propriedade em Configurações para ver a previsão do tempo.
              </p>
            </div>
            <Link
              href="/dashboard/configuracoes"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'border-amber-400 text-amber-800 hover:bg-amber-100' })}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Widget principal */}
      <WeatherWidget
        latitude={latitude}
        longitude={longitude}
        location={location ?? 'Sua fazenda'}
      />

      {/* Condições detalhadas */}
      {weatherData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Temperatura',
              value: formatTemperature(weatherData.current.temperature),
              sub: `Sensação ${formatTemperature(weatherData.current.feelsLike)}`,
              icon: Thermometer,
              color: 'text-orange-500',
              bg: 'bg-orange-50 dark:bg-orange-950/20',
            },
            {
              label: 'Umidade',
              value: `${weatherData.current.humidity}%`,
              sub: 'Umidade relativa',
              icon: Droplets,
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-950/20',
            },
            {
              label: 'Vento',
              value: `${weatherData.current.windSpeed.toFixed(1)} km/h`,
              sub: getWindDirection(weatherData.current.windDegree),
              icon: Wind,
              color: 'text-cyan-500',
              bg: 'bg-cyan-50 dark:bg-cyan-950/20',
            },
            {
              label: 'Visibilidade',
              value: `${(weatherData.current.visibility / 1000).toFixed(1)} km`,
              sub: 'Visibilidade atual',
              icon: Eye,
              color: 'text-slate-500',
              bg: 'bg-slate-50 dark:bg-slate-950/20',
            },
          ].map((item) => (
            <Card key={item.label} className={`rounded-2xl shadow-sm ${item.bg}`}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && latitude && longitude && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      )}

      {/* Recomendações agrícolas */}
      {tips.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <Sprout className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Recomendações Agrícolas</h2>
                <p className="text-xs text-muted-foreground">Baseadas nas condições climáticas de hoje</p>
              </div>
            </div>
            <ul className="space-y-3">
              {tips.map((t, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                  <t.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${t.color}`} />
                  <p className="text-sm text-foreground">{t.tip}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
