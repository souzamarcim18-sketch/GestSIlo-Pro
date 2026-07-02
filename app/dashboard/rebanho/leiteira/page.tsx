import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import {
  listProducoesLeiteirasNoPeriodo,
  totalProducaoLeiteiraPeriodo,
  getDELMedioAtivo,
} from '@/lib/supabase/rebanho-leiteira';
import {
  queryEventosRebanho,
  queryIndicadoresReprodutivos,
  queryParametrosReprodutivos,
  queryRepetidoras,
  queryReprodutores,
} from '@/lib/supabase/rebanho-reproducao';
import { queryDoadoras } from '@/lib/supabase/rebanho-doadoras';
import { Milk, CalendarDays, Gauge, Droplets, Activity, Percent } from 'lucide-react';
import { KpiCard } from '@/app/dashboard/rebanho/components/KpiCard';
import { calcularKpisLeiteiros } from '@/lib/calculos/indicadores-rebanho';
import { LeiteiraPainel } from './LeiteiraPainel';
import type { Animal } from '@/lib/types/rebanho';
import type { EventoReprodutivo } from '@/lib/types/rebanho-reproducao';

export const metadata = {
  title: 'Gestão Leiteira | GestSilo',
};

// Espécies que aparecem no painel de leite.
const ESPECIES_LEITE = ['leiteiro', 'dupla_aptidao'] as const;

export default async function LeiteiraPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const fazendaId = await getCurrentFazendaId();

  const hoje = new Date();
  const inicio30dias = new Date(hoje);
  inicio30dias.setDate(inicio30dias.getDate() - 30);
  const dataInicio = inicio30dias.toISOString().split('T')[0];
  const dataFim = hoje.toISOString().split('T')[0];

  const inicio120 = new Date(hoje);
  inicio120.setDate(inicio120.getDate() - 120);
  const dataInicioRepro = inicio120.toISOString().split('T')[0];

  const [
    producoesData,
    totaisData,
    animaisRes,
    delMedio,
    perfilRes,
    eventos,
    animaisReproRes,
    repetidoras,
    contagemPorStatus,
    distribuicaoDetalhada,
    taxaPrenhez,
    psmMedia,
    iepMedia,
    taxaConcepcaoIA,
    diasEmAberto,
    taxaServico,
    idadePrimeiraParicao,
    parametros,
    reprodutoresRes,
    doadoras,
  ] = await Promise.all([
    listProducoesLeiteirasNoPeriodo(dataInicio, dataFim),
    totalProducaoLeiteiraPeriodo(dataInicio, dataFim),
    supabase
      .from('animais')
      .select(
        'id, brinco, nome, sexo, tipo_rebanho, status_reprodutivo, categoria, status, lote_id, deleted_at'
      )
      .eq('fazenda_id', fazendaId)
      .eq('sexo', 'Fêmea')
      .in('tipo_rebanho', ESPECIES_LEITE)
      .is('deleted_at', null),
    getDELMedioAtivo(),
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
    queryEventosRebanho.listByPeriodo(fazendaId, dataInicioRepro, dataFim),
    supabase
      .from('animais')
      .select('id, brinco, nome, lote_id, status_reprodutivo, tipo_rebanho, sexo, status, categoria')
      .eq('fazenda_id', fazendaId)
      .in('tipo_rebanho', ESPECIES_LEITE)
      .is('deleted_at', null),
    queryRepetidoras.list(fazendaId),
    queryIndicadoresReprodutivos.getContagemPorStatus(fazendaId, [...ESPECIES_LEITE]),
    queryIndicadoresReprodutivos.getDistribuicaoReprodutivaDetalhada(fazendaId),
    queryIndicadoresReprodutivos.getTaxaPrenhez(fazendaId),
    queryIndicadoresReprodutivos.getPSMMedia(fazendaId),
    queryIndicadoresReprodutivos.getIEPMedia(fazendaId),
    queryIndicadoresReprodutivos.getTaxaConcepçãoIA(fazendaId),
    queryIndicadoresReprodutivos.getDiasEmAberto(fazendaId),
    queryIndicadoresReprodutivos.getTaxaServiço(fazendaId),
    queryIndicadoresReprodutivos.getIdadePrimeiraPariçao(fazendaId),
    queryParametrosReprodutivos.get('leiteiro'),
    queryReprodutores.list(1, 100, [...ESPECIES_LEITE]),
    queryDoadoras.list([...ESPECIES_LEITE]),
  ]);

  const animais = JSON.parse(JSON.stringify((animaisRes.data || []) as Animal[])) as Animal[];
  const isAdmin = perfilRes.data?.perfil === 'Administrador';

  const kpis = calcularKpisLeiteiros({
    animais,
    producoes: producoesData.map((p) => ({ data: p.data, volume_litros: p.volume_litros })),
    totalLitrosPeriodo: totaisData.total_litros,
    delMedioDias: delMedio,
    dataInicio,
    dataFim,
  });

  const animaisRepro = JSON.parse(JSON.stringify(animaisReproRes.data ?? [])) as Animal[];
  const animaisFemea = (animaisReproRes.data ?? [])
    .filter((a) => a.sexo === 'Fêmea' && a.status === 'Ativo')
    .map((a) => ({ id: a.id, brinco: a.brinco, nome: a.nome }));

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão Leiteira</h1>
          <p className="text-muted-foreground mt-1">
            Produção, reprodução e indicadores do rebanho leiteiro
          </p>
        </div>

        {/* KPIs principais — sempre no topo, fora das abas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Produção Hoje" valor={`${kpis.producaoHojeLitros.toFixed(1)} L`} icon={<Milk className="h-5 w-5" />} />
          <KpiCard label="Produção Média/Dia" valor={`${kpis.producaoMediaDiariaLitros.toFixed(1)} L`} sublabel="últimos 30 dias" icon={<CalendarDays className="h-5 w-5" />} />
          <KpiCard label="Produção Média/Vaca" valor={`${kpis.producaoMediaPorVacaLitros.toFixed(1)} L`} sublabel="por vaca em lactação" icon={<Droplets className="h-5 w-5" />} />
          <KpiCard label="DEL Médio" valor={kpis.delMedioDias !== null ? `${kpis.delMedioDias} dias` : '—'} sublabel="dias em lactação" icon={<Gauge className="h-5 w-5" />} />
          <KpiCard label="Em lactação" valor={kpis.vacasEmLactacao} sublabel={`${kpis.vacasEmSeco} em seco`} icon={<Activity className="h-5 w-5" />} />
          <KpiCard label="Eficiência do Rebanho" valor={kpis.taxaEficienciaPct !== null ? `${kpis.taxaEficienciaPct}%` : '—'} sublabel="vacas em produção" icon={<Percent className="h-5 w-5" />} />
        </div>

        <LeiteiraPainel
          producoes={producoesData}
          animais={animais}
          totais={totaisData}
          isAdmin={isAdmin}
          reproducao={{
            eventos: eventos as EventoReprodutivo[],
            animais: animaisRepro,
            repetidoras,
            distribuicaoDetalhada,
            indicadores: {
              taxaPrenhez,
              contagemPorStatus,
              psmMedia,
              iepMedia,
              taxaConcepçaoIA: taxaConcepcaoIA,
              diasEmAberto,
              taxaServiço: taxaServico,
              idadePrimeiraPariçao: idadePrimeiraParicao,
            },
            parametros,
            reprodutores: reprodutoresRes.dados,
            doadoras,
            animaisFemea,
          }}
        />
      </div>
    </div>
  );
}
