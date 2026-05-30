import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import {
  listProducoesLeiteirasNoPeriodo,
  totalProducaoLeiteiraPeriodo,
} from '@/lib/supabase/rebanho-leiteira';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLeiteiro } from '@/components/rebanho/leiteira/DashboardLeiteiro';
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
  const [producoesData, totaisData, animaisRes] = await Promise.all([
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

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão Leiteira</h1>
          <p className="text-muted-foreground mt-1">Acompanhe a produção de leite da propriedade</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Produção Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{producaoHoje.toFixed(1)} L</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Produção Média/Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{producaoMediaDiaria.toFixed(1)} L</div>
              <p className="text-xs text-muted-foreground mt-1">últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Produção Média/Vaca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{producaoMediaPorVaca.toFixed(1)} L</div>
              <p className="text-xs text-muted-foreground mt-1">por vaca em lactação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status do Rebanho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {animalEmLactacao.length} em lactação
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {animalEmSeco.length} em seco
              </p>
            </CardContent>
          </Card>
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
