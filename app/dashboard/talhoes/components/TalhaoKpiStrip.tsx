'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { type Talhao, type CicloAgricola } from '@/lib/types/talhoes';

interface Props {
  talhoes: Talhao[];
  ciclosAtivos: Record<string, CicloAgricola>;
}

function formatArea(value: number): string {
  // Sem casas decimais quando inteiro; até 2 casas caso contrário
  return Number.isInteger(value)
    ? value.toLocaleString('pt-BR')
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function TalhaoKpiStrip({ talhoes, ciclosAtivos }: Props) {
  const stats = useMemo(() => {
    const totalAreas = talhoes.length;
    const areaTotal = talhoes.reduce((acc, t) => acc + (t.area_ha ?? 0), 0);

    const idsComCiclo = talhoes.filter((t) => ciclosAtivos[t.id]);
    const emCultivo = idsComCiclo.length;
    const areaEmCultivo = idsComCiclo.reduce((acc, t) => acc + (t.area_ha ?? 0), 0);

    const culturas = new Set(idsComCiclo.map((t) => ciclosAtivos[t.id].cultura));
    const culturasAtivas = culturas.size;

    const disponiveis = totalAreas - emCultivo;

    return { totalAreas, areaTotal, emCultivo, areaEmCultivo, culturasAtivas, disponiveis };
  }, [talhoes, ciclosAtivos]);

  if (talhoes.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Áreas</div>
          <div className="text-3xl font-bold text-foreground">{stats.totalAreas}</div>
          <div className="text-xs text-muted-foreground mt-1">talhões cadastrados</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Área Total</div>
          <div className="text-3xl font-bold text-foreground">{formatArea(stats.areaTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">hectares</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Em Cultivo</div>
          <div className="text-3xl font-bold text-green-400">{stats.emCultivo}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.emCultivo > 0 ? `${formatArea(stats.areaEmCultivo)} ha plantados` : 'nenhuma área plantada'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Culturas Ativas</div>
          <div className="text-3xl font-bold text-foreground">{stats.culturasAtivas}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.disponiveis > 0
              ? `${stats.disponiveis} área${stats.disponiveis !== 1 ? 's' : ''} disponíve${stats.disponiveis !== 1 ? 'is' : 'l'}`
              : 'todas em uso'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
