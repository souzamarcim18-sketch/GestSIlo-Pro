'use client';

import { useRouter } from 'next/navigation';
import { Beef, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MiniCardRebanhoData } from '@/app/dashboard/rebanho/indicadores/actions';

interface MiniCardRebanhoClientProps {
  data: MiniCardRebanhoData;
}

function MiniCardRebanhoClient({ data }: MiniCardRebanhoClientProps) {
  const router = useRouter();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return '—';
    return num.toFixed(2);
  };

  return (
    <button
      onClick={() => router.push('/dashboard/rebanho/indicadores')}
      className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded-2xl w-full"
      aria-label="Rebanho - clique para ver indicadores"
    >
      <Card
        className="rounded-2xl p-6 h-full border-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
          boxShadow: '0 4px 16px rgba(0, 132, 61, 0.25)',
        }}
      >
        <CardContent className="p-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Rebanho
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-colors">
              <Beef className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/75">Total</p>
              <span className="text-lg font-semibold text-white">
                {data.totalAnimais}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-white/75">GMD</p>
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold text-white">
                  {formatNumber(data.gmd)}
                </span>
                <span className="text-xs text-white/75 ml-1">kg/d</span>
                <div className={cn(
                  'flex items-center gap-0.5 ml-2',
                  data.trendGMD === 'up' ? 'text-green-200' : data.trendGMD === 'down' ? 'text-yellow-200' : 'text-white/50'
                )}>
                  {getTrendIcon(data.trendGMD)}
                  {data.trendValor !== undefined && (
                    <span className="text-xs font-medium">
                      {data.trendValor.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-white/75">Prenhez</p>
              <span className="text-lg font-semibold text-white">
                {data.taxaPrenhez}%
              </span>
            </div>

            <div className="pt-2 mt-2 border-t border-white/10">
              <p className="text-xs font-semibold text-white/90 hover:text-white transition-colors">
                Ver Indicadores →
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export async function MiniCardRebanho() {
  const { getMiniCardRebanhoAction } = await import('@/app/dashboard/rebanho/indicadores/actions');

  let data: MiniCardRebanhoData | null = null;
  let error: string | null = null;

  try {
    data = await getMiniCardRebanhoAction();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar dados';
  }

  if (error || !data) {
    return (
      <Card
        className="rounded-2xl p-6 h-full border-0"
        style={{
          background: 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
          boxShadow: '0 4px 16px rgba(0, 132, 61, 0.25)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Rebanho
            </p>
            <p className="text-sm text-white/85">
              {error || 'Sem dados'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
            <Beef className="h-5 w-5 text-white" />
          </div>
        </div>
      </Card>
    );
  }

  return <MiniCardRebanhoClient data={data} />;
}
