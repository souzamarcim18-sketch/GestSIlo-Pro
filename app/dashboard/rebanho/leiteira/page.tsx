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
  const animalEmLactacao = animais.filter((a: Animal) => a.status_reprodutivo === 'lactacao');

  // Calcular KPIs
  const producaoHoje = producoesData
    .filter((p) => p.data === dataFim)
    .reduce((acc, p) => acc + p.volume_litros, 0);

  const totalProducao = totaisData.total_litros;
  const diasPeriodo = Math.max(1, Math.floor((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const producaoMediaDiaria = totalProducao / diasPeriodo;
  const producaoMediaPorVaca = animalEmLactacao.length > 0 ? totalProducao / diasPeriodo / animalEmLactacao.length : 0;

  const animalEmSeco = animais.filter((a) => a.status_reprodutivo === 'seca');

  // Taxa de eficiência: vacas em lactação ÷ total de fêmeas adultas (lactação + seco + vazias)
  const animaisVazias = animais.filter((a) => a.status_reprodutivo === 'vazia' && a.status === 'Ativo');
  const totalFemeasAdultas = animalEmLactacao.length + animalEmSeco.length + animaisVazias.length;
  const taxaEficiencia = totalFemeasAdultas > 0
    ? Math.round((animalEmLactacao.length / totalFemeasAdultas) * 100)
    : null;

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
            valor={`${producaoHoje.toFixed(1)} L`}
            icon={<Milk className="h-5 w-5" />}
          />
          <KpiCard
            label="Produção Média/Dia"
            valor={`${producaoMediaDiaria.toFixed(1)} L`}
            sublabel="últimos 30 dias"
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <KpiCard
            label="Produção Média/Vaca"
            valor={`${producaoMediaPorVaca.toFixed(1)} L`}
            sublabel="por vaca em lactação"
            icon={<Droplets className="h-5 w-5" />}
          />
          <KpiCard
            label="DEL Médio"
            valor={delMedio !== null ? `${delMedio} dias` : '—'}
            sublabel="dias em lactação"
            icon={<Gauge className="h-5 w-5" />}
          />
          <KpiCard
            label="Em lactação"
            valor={animalEmLactacao.length}
            sublabel={`${animalEmSeco.length} em seco`}
            icon={<Activity className="h-5 w-5" />}
          />
          <KpiCard
            label="Eficiência do Rebanho"
            valor={taxaEficiencia !== null ? `${taxaEficiencia}%` : '—'}
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
