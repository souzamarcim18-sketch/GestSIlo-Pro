'use client';

import { useRouter } from 'next/navigation';
import { Beef, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MiniCardRebanhoData } from '@/app/dashboard/rebanho/indicadores/actions';

interface MiniCardRebanhoClientProps {
  data: MiniCardRebanhoData;
}

export function MiniCardRebanhoClient({ data }: MiniCardRebanhoClientProps) {
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
        className="rounded-[13px] p-6 h-full transition-all duration-300 group-hover:-translate-y-1"
      >
        <CardContent className="p-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="uppercase tracking-[0.13em] font-bold text-[0.475rem] text-[#688070]">
                Rebanho
              </p>
            </div>
            <div className="p-3 rounded-xl transition-colors" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Beef className="h-5 w-5 text-[#00c45a]" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#688070]">Total</p>
              <span className="text-lg font-black tracking-tight text-[#dceede]">
                {data.totalAnimais}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-[#688070]">GMD</p>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black tracking-tight text-[#dceede]">
                  {formatNumber(data.gmd)}
                </span>
                <span className="text-xs text-[#688070] ml-1">kg/d</span>
                <div className={cn(
                  'flex items-center gap-0.5 ml-2',
                  data.trendGMD === 'up' ? 'text-[#00c45a]' : data.trendGMD === 'down' ? 'text-[#f5d000]' : 'text-[#688070]'
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
              <p className="text-xs text-[#688070]">Prenhez</p>
              <span className="text-lg font-black tracking-tight text-[#dceede]">
                {data.taxaPrenhez}%
              </span>
            </div>

            <div className="pt-2 mt-2 border-t border-white/10">
              <p className="text-xs font-semibold text-[#688070] hover:text-[#dceede] transition-colors">
                Ver Indicadores →
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
