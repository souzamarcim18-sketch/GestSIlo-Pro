'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Beef, Milk, Layers, Gauge, AlertTriangle } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { AnimalParaPainel, PainelRebanhoExtras } from '@/lib/supabase/rebanho';
import type { Lote } from '@/lib/types/rebanho';

// Mesmo gráfico de composição por categoria usado no dashboard principal —
// reutilizado tanto para "por lote" quanto para "por categoria" para manter
// visual e altura consistentes.
const PieCategoriasRebanho = dynamic(
  () =>
    import('@/components/widgets/PieCategoriasRebanho').then((m) => ({
      default: m.PieCategoriasRebanho,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 animate-pulse rounded-lg bg-muted/40" />
    ),
  }
);

interface Props {
  animais: AnimalParaPainel[];
  lotes: Lote[];
  extras: PainelRebanhoExtras;
}

export function PainelResumo({ animais, lotes, extras }: Props) {
  const resumo = useMemo(() => {
    const ativos = animais.filter((a) => a.status === 'Ativo');

    const femeasCount = (arr: AnimalParaPainel[]) =>
      arr.filter((a) => a.sexo === 'Fêmea').length;

    // Gado de leite: leiteiro + dupla aptidão; corte: corte
    const leite = ativos.filter(
      (a) => a.tipo_rebanho === 'leiteiro' || a.tipo_rebanho === 'dupla_aptidao'
    );
    const corte = ativos.filter((a) => a.tipo_rebanho === 'corte');

    // Lotação UA/ha = (soma dos pesos / 450) / área total de pastagens
    const somaPesos = ativos.reduce((acc, a) => acc + (a.peso_atual ?? 0), 0);
    const totalUA = somaPesos / 450;
    const lotacaoUAha =
      extras.areaPastagensHa > 0 ? totalUA / extras.areaPastagensHa : null;

    // Composição por lote (apenas ativos) — contagens absolutas por lote
    const nomePorLote = new Map(lotes.map((l) => [l.id, l.nome]));
    const porLote: Record<string, number> = {};
    for (const a of ativos) {
      const nome = a.lote_id
        ? nomePorLote.get(a.lote_id) ?? 'Sem lote'
        : 'Sem lote';
      porLote[nome] = (porLote[nome] ?? 0) + 1;
    }
    const lotesData = Object.entries(porLote)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Composição por categoria (mesmo gráfico do dashboard principal)
    const porCategoria: Record<string, number> = {};
    for (const a of ativos) {
      const cat = a.categoria ?? 'Sem categoria';
      porCategoria[cat] = (porCategoria[cat] ?? 0) + 1;
    }
    const categoriasData = Object.entries(porCategoria)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalAtivos: ativos.length,
      totalFemeas: femeasCount(ativos),
      leiteTotal: leite.length,
      leiteFemeas: femeasCount(leite),
      leiteMachos: leite.length - femeasCount(leite),
      corteTotal: corte.length,
      corteFemeas: femeasCount(corte),
      corteMachos: corte.length - femeasCount(corte),
      lotacaoUAha,
      totalLotes: lotes.length,
      lotesData,
      categoriasData,
    };
  }, [animais, lotes, extras.areaPastagensHa]);

  const alertas = [
    { label: 'Próximos partos (30 dias)', valor: extras.partosProximos },
    { label: 'Vacinações pendentes (15 dias)', valor: extras.vacinacoesPendentes },
    { label: 'Mortes (últimos 30 dias)', valor: extras.mortesRecentes },
    { label: 'Pesagens em atraso', valor: extras.pesagensEmAtraso },
  ].filter((a) => a.valor > 0);

  return (
    <section className="space-y-4">
      {/* Faixa de KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Animais ativos"
          valor={resumo.totalAtivos}
          sublabel={`${resumo.totalFemeas} fêmeas / ${resumo.totalAtivos - resumo.totalFemeas} machos`}
          icon={<Beef className="h-5 w-5" />}
        />
        <KpiCard
          label="Gado de leite"
          valor={resumo.leiteTotal}
          sublabel={`${resumo.leiteFemeas} fêmeas / ${resumo.leiteMachos} machos`}
          icon={<Milk className="h-5 w-5" />}
        />
        <KpiCard
          label="Gado de corte"
          valor={resumo.corteTotal}
          sublabel={`${resumo.corteFemeas} fêmeas / ${resumo.corteMachos} machos`}
          icon={<Beef className="h-5 w-5" />}
        />
        <KpiCard
          label="Lotação"
          valor={
            resumo.lotacaoUAha !== null
              ? `${resumo.lotacaoUAha.toFixed(1)} UA/ha`
              : '—'
          }
          icon={<Gauge className="h-5 w-5" />}
        />
        <KpiCard
          label="Lotes cadastrados"
          valor={resumo.totalLotes}
          icon={<Layers className="h-5 w-5" />}
        />
      </div>

      {/* Donuts de composição + alertas críticos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Composição por lote
            </h3>
          </CardHeader>
          <CardContent className="flex min-h-[144px] items-center">
            {resumo.totalAtivos > 0 ? (
              <PieCategoriasRebanho
                data={resumo.lotesData}
                total={resumo.lotesData.length}
                centerLabel={resumo.lotesData.length === 1 ? 'lote' : 'lotes'}
              />
            ) : (
              <p className="w-full py-8 text-center text-sm text-muted-foreground">
                Sem animais ativos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Composição por categoria
            </h3>
          </CardHeader>
          <CardContent className="flex min-h-[144px] items-center">
            {resumo.totalAtivos > 0 ? (
              <PieCategoriasRebanho
                data={resumo.categoriasData}
                total={resumo.totalAtivos}
              />
            ) : (
              <p className="w-full py-8 text-center text-sm text-muted-foreground">
                Sem animais ativos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" />
              Alertas críticos
            </h3>
          </CardHeader>
          <CardContent>
            {alertas.length > 0 ? (
              <ul className="space-y-2">
                {alertas.map((a) => (
                  <li
                    key={a.label}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-muted-foreground">{a.label}</span>
                    <span className="font-semibold text-foreground">{a.valor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum alerta no momento
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
