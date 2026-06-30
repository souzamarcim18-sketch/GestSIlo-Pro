import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import {
  listProducoesLeiteirasNoPeriodo,
  totalProducaoLeiteiraPeriodo,
  getDELMedioAtivo,
} from '@/lib/supabase/rebanho-leiteira';
import { Milk, CalendarDays, Gauge, Droplets, Activity, Percent } from 'lucide-react';
import { DashboardLeiteiro } from '@/components/rebanho/leiteira/DashboardLeiteiro';
import { KpiCard } from '@/app/dashboard/rebanho/components/KpiCard';
import { calcularKpisLeiteiros } from '@/lib/calculos/indicadores-rebanho';
import type { Animal } from '@/lib/types/rebanho';

export const metadata = {
  title: 'Gestão Leiteira | GestSilo',
};

export default async function LeiteiraPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const fazendaId = await getCurrentFazendaId();

  // Buscar dados iniciais: últimos 30 dias
  const hoje = new Date();
  const inicio30dias = new Date(hoje);
  inicio30dias.setDate(inicio30dias.getDate() - 30);
  const dataInicio = inicio30dias.toISOString().split('T')[0];
  const dataFim = hoje.toISOString().split('T')[0];

  // Buscar animais fêmeas em lactação + dupla-aptidão
  const [producoesData, totaisData, animaisRes, delMedio] = await Promise.all([
    listProducoesLeiteirasNoPeriodo(dataInicio, dataFim),
    totalProducaoLeiteiraPeriodo(dataInicio, dataFim),
    supabase
      .from('animais')
      .select(
        'id, brinco, nome, sexo, tipo_rebanho, status_reprodutivo, categoria, status, lote_id, deleted_at'
      )
      .eq('fazenda_id', fazendaId)
      .eq('sexo', 'Fêmea')
      .in('tipo_rebanho', ['leiteiro', 'dupla_aptidao'])
      .is('deleted_at', null),
    getDELMedioAtivo(),
  ]);

  const animais = JSON.parse(JSON.stringify((animaisRes.data || []) as Animal[])) as Animal[];

  // KPIs via serviço reusável (Fase 4, P4.1) — mesma fonte da superfície de
  // Indicadores do Rebanho; reusa os dados já buscados (sem round-trip extra).
  const kpis = calcularKpisLeiteiros({
    animais,
    producoes: producoesData.map((p) => ({ data: p.data, volume_litros: p.volume_litros })),
    totalLitrosPeriodo: totaisData.total_litros,
    delMedioDias: delMedio,
    dataInicio,
    dataFim,
  });

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão Leiteira</h1>
          <p className="text-muted-foreground mt-1">Acompanhe a produção de leite da propriedade</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Produção Hoje"
            valor={`${kpis.producaoHojeLitros.toFixed(1)} L`}
            icon={<Milk className="h-5 w-5" />}
          />
          <KpiCard
            label="Produção Média/Dia"
            valor={`${kpis.producaoMediaDiariaLitros.toFixed(1)} L`}
            sublabel="últimos 30 dias"
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <KpiCard
            label="Produção Média/Vaca"
            valor={`${kpis.producaoMediaPorVacaLitros.toFixed(1)} L`}
            sublabel="por vaca em lactação"
            icon={<Droplets className="h-5 w-5" />}
          />
          <KpiCard
            label="DEL Médio"
            valor={kpis.delMedioDias !== null ? `${kpis.delMedioDias} dias` : '—'}
            sublabel="dias em lactação"
            icon={<Gauge className="h-5 w-5" />}
          />
          <KpiCard
            label="Em lactação"
            valor={kpis.vacasEmLactacao}
            sublabel={`${kpis.vacasEmSeco} em seco`}
            icon={<Activity className="h-5 w-5" />}
          />
          <KpiCard
            label="Eficiência do Rebanho"
            valor={kpis.taxaEficienciaPct !== null ? `${kpis.taxaEficienciaPct}%` : '—'}
            sublabel="vacas em produção"
            icon={<Percent className="h-5 w-5" />}
          />
        </div>

        {/* Painel Interativo */}
        <DashboardLeiteiro
          producoes={producoesData}
          animais={animais}
          totais={totaisData}
        />
      </div>
    </div>
  );
}
