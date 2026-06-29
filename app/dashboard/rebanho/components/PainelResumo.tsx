'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Beef, Milk, HeartPulse, CalendarClock } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { Animal, Lote } from '@/lib/types/rebanho';

// Recharts via next/dynamic + ssr:false (padrão do projeto para gráficos)
const GraficoComposicao = dynamic(
  () =>
    import('../indicadores/components/charts/GraficoComposicao').then((m) => ({
      default: m.GraficoComposicao,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-lg bg-muted/40" />
    ),
  }
);

// periodo é exigido pela assinatura de GraficoComposicaoProps mas não é
// usado na renderização do donut — passamos um stub mínimo.
const PERIODO_STUB = { periodo: '90d' } as const;

interface Props {
  animais: Animal[];
  lotes: Lote[];
}

// Categorias que representam vacas em lactação (cobre variações de grafia)
const CATEGORIAS_LACTACAO = ['vaca em lactação', 'vaca em lactacao'];

export function PainelResumo({ animais, lotes }: Props) {
  const resumo = useMemo(() => {
    const ativos = animais.filter((a) => a.status === 'Ativo');

    const emLactacao = ativos.filter((a) =>
      CATEGORIAS_LACTACAO.includes((a.categoria ?? '').toLowerCase())
    ).length;

    const femeas = ativos.filter((a) => a.sexo === 'Fêmea').length;
    const prenhas = ativos.filter(
      (a) => a.status_reprodutivo === 'prenha'
    ).length;
    const taxaPrenhez = femeas > 0 ? (prenhas / femeas) * 100 : null;

    const hoje = new Date();
    const limite30 = new Date(hoje);
    limite30.setDate(limite30.getDate() + 30);
    const partosProximos = ativos.filter((a) => {
      if (!a.data_parto_previsto) return false;
      // Parse local para evitar shift de fuso em datas YYYY-MM-DD
      const [ano, mes, dia] = a.data_parto_previsto.split('-').map(Number);
      const d = new Date(ano, (mes ?? 1) - 1, dia ?? 1);
      return d >= hoje && d <= limite30;
    }).length;

    // Composição por lote (apenas ativos)
    const nomePorLote = new Map(lotes.map((l) => [l.id, l.nome]));
    const porLote: Record<string, number> = {};
    for (const a of ativos) {
      const nome = a.lote_id
        ? nomePorLote.get(a.lote_id) ?? 'Sem lote'
        : 'Sem lote';
      porLote[nome] = (porLote[nome] ?? 0) + 1;
    }
    const composicaoLotes = paraPercentual(porLote, ativos.length);

    // Composição reprodutiva (apenas fêmeas ativas com status_reprodutivo)
    const porStatusRepr: Record<string, number> = {};
    let totalReprodutivo = 0;
    for (const a of ativos) {
      if (a.sexo !== 'Fêmea' || !a.status_reprodutivo) continue;
      const label = LABEL_STATUS_REPRODUTIVO[a.status_reprodutivo] ?? a.status_reprodutivo;
      porStatusRepr[label] = (porStatusRepr[label] ?? 0) + 1;
      totalReprodutivo += 1;
    }
    const composicaoReprodutiva = paraPercentual(porStatusRepr, totalReprodutivo);

    return {
      totalAtivos: ativos.length,
      emLactacao,
      prenhas,
      taxaPrenhez,
      femeas,
      partosProximos,
      composicaoLotes,
      composicaoReprodutiva,
      temReprodutivo: totalReprodutivo > 0,
    };
  }, [animais, lotes]);

  return (
    <section className="space-y-4">
      {/* Faixa de KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Animais ativos"
          valor={resumo.totalAtivos}
          sublabel={`${resumo.femeas} fêmeas`}
          icon={<Beef className="h-5 w-5" />}
        />
        <KpiCard
          label="Em lactação"
          valor={resumo.emLactacao}
          icon={<Milk className="h-5 w-5" />}
        />
        <KpiCard
          label="Prenhez"
          valor={
            resumo.taxaPrenhez !== null
              ? `${resumo.taxaPrenhez.toFixed(0)}%`
              : '—'
          }
          sublabel={`${resumo.prenhas} prenhas`}
          icon={<HeartPulse className="h-5 w-5" />}
        />
        <KpiCard
          label="Partos em 30 dias"
          valor={resumo.partosProximos}
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>

      {/* Donuts de composição */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Composição por lote
            </h3>
          </CardHeader>
          <CardContent>
            {resumo.totalAtivos > 0 ? (
              <GraficoComposicao dados={resumo.composicaoLotes} periodo={PERIODO_STUB} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem animais ativos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Composição reprodutiva
            </h3>
          </CardHeader>
          <CardContent>
            {resumo.temReprodutivo ? (
              <GraficoComposicao
                dados={resumo.composicaoReprodutiva}
                periodo={PERIODO_STUB}
              />
            ) : (
              <div className="flex h-80 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Sem dados reprodutivos das fêmeas
                </p>
                <Link
                  href="/dashboard/rebanho/reproducao"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ir para Reprodução
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// Converte contagens absolutas em percentuais (categoria → %)
function paraPercentual(
  contagens: Record<string, number>,
  total: number
): Record<string, number> {
  if (total === 0) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(contagens)) {
    out[k] = (v / total) * 100;
  }
  return out;
}

const LABEL_STATUS_REPRODUTIVO: Record<string, string> = {
  vazia: 'Vazia',
  inseminada: 'Inseminada',
  prenha: 'Prenha',
  lactacao: 'Lactação',
  seca: 'Seca',
  descartada: 'Descartada',
};
