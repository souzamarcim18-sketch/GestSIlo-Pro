'use client';

import { useMemo } from 'react';
import { Map, Ruler, Sprout, Leaf } from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
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
      <KpiCard
        label="Áreas"
        valor={stats.totalAreas}
        sublabel="talhões cadastrados"
        icon={<Map className="h-5 w-5" />}
      />
      <KpiCard
        label="Área Total"
        valor={formatArea(stats.areaTotal)}
        sublabel="hectares"
        icon={<Ruler className="h-5 w-5" />}
      />
      <KpiCard
        label="Em Cultivo"
        valor={stats.emCultivo}
        sublabel={stats.emCultivo > 0 ? `${formatArea(stats.areaEmCultivo)} ha plantados` : 'nenhuma área plantada'}
        icon={<Sprout className="h-5 w-5" />}
      />
      <KpiCard
        label="Culturas Ativas"
        valor={stats.culturasAtivas}
        sublabel={
          stats.disponiveis > 0
            ? `${stats.disponiveis} área${stats.disponiveis !== 1 ? 's' : ''} disponíve${stats.disponiveis !== 1 ? 'is' : 'l'}`
            : 'todas em uso'
        }
        icon={<Leaf className="h-5 w-5" />}
      />
    </div>
  );
}
