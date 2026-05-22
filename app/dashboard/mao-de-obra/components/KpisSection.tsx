'use client';

import { DollarSign, ClipboardList, Star, TrendingUp } from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import type { KpisMaoObra } from '@/lib/types/mao-de-obra';

interface KpisSectionProps {
  kpis: KpisMaoObra;
}

export function KpisSection({ kpis }: KpisSectionProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Custo total do mês */}
      <div
        className="rounded-lg p-4 flex flex-col gap-1"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <DollarSign className="h-3.5 w-3.5" />
          Custo do Mês
        </div>
        <div className="text-3xl font-bold text-foreground">{formatBRL(kpis.custo_total_mes)}</div>
        <div className="text-xs text-muted-foreground">mês corrente</div>
      </div>

      {/* Atividades do mês */}
      <div
        className="rounded-lg p-4 flex flex-col gap-1"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <ClipboardList className="h-3.5 w-3.5" />
          Atividades
        </div>
        <div className="text-3xl font-bold text-foreground">{kpis.qtd_atividades_mes}</div>
        <div className="text-xs text-muted-foreground">registradas no mês</div>
      </div>

      {/* Colaborador destaque */}
      <div
        className="rounded-lg p-4 flex flex-col gap-1"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <Star className="h-3.5 w-3.5" />
          Destaque
        </div>
        {kpis.colaborador_destaque ? (
          <>
            <div className="text-sm font-bold text-foreground leading-tight mt-1">
              {kpis.colaborador_destaque.nome}
            </div>
            <div className="text-xs text-muted-foreground">
              {kpis.colaborador_destaque.qtd_atividades} atividade{kpis.colaborador_destaque.qtd_atividades !== 1 ? 's' : ''} no mês
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground mt-1">—</div>
        )}
      </div>

      {/* Top tipos */}
      <div
        className="rounded-lg p-4 flex flex-col gap-1"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <TrendingUp className="h-3.5 w-3.5" />
          Top Atividades
        </div>
        {kpis.top3_tipos.length > 0 ? (
          <div className="flex flex-col gap-1 mt-1">
            {kpis.top3_tipos.map((t, i) => (
              <div key={t.tipo} className="flex items-center justify-between">
                <span
                  className="text-xs truncate max-w-[110px]"
                  style={{ color: i === 0 ? '#738D45' : 'inherit' }}
                  title={t.tipo}
                >
                  {t.tipo}
                </span>
                <span className="text-xs font-semibold text-foreground ml-1">
                  {formatBRL(t.custo_total)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-1">—</div>
        )}
      </div>
    </div>
  );
}
