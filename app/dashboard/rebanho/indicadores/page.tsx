import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type FiltrosIndicadores, type TipoExploracao, type PeriodoPreset } from '@/types/rebanho-indicadores';
import { listAlertasVacinacao } from '@/lib/supabase/rebanho-sanitario';
import { type AlertaAnimal } from '@/lib/supabase/rebanho-indicadores';
import IndicadoresClient from './IndicadoresClient';
import IndicadoresSkeleton from './components/IndicadoresSkeleton';
import { IndicadoresRebanhoSurface } from './IndicadoresRebanhoSurface';

export interface AlertasRebanho {
  vacinacoes: Awaited<ReturnType<typeof listAlertasVacinacao>>;
  partosPrevistos: AlertaAnimal[];
  vacasSecasComParto: AlertaAnimal[];
  semPesagem: AlertaAnimal[];
}

export const metadata = {
  title: 'Indicadores do Rebanho | GestSilo',
};

interface PageProps {
  searchParams?: Promise<Record<string, string | string[]>>;
}

export default async function IndicadoresPage(props: PageProps) {
  const supabase = await createSupabaseServerClient();

  // Validar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Fetch tipo_exploracao + lotes da fazenda (filtros do detalhe zootécnico).
  // Os alertas que antes eram exibidos aqui passaram para o "Resumo executivo"
  // da superfície única (IndicadoresRebanhoSurface), que reusa o serviço de
  // pendências da Fase 3 — sem duplicar a lista na UI (SPEC §7.5).
  const [fazendaRes, lotesRes] = await Promise.all([
    supabase
      .from('fazendas')
      .select('tipo_exploracao')
      .single(),
    supabase
      .from('lotes')
      .select('id, fazenda_id, nome, descricao, data_criacao, created_at, updated_at')
      .order('nome', { ascending: true }),
  ]);

  if (fazendaRes.error) {
    throw new Error(`Erro ao carregar tipo de exploração: ${fazendaRes.error.message}`);
  }

  const tipoExploracao: TipoExploracao = (fazendaRes.data?.tipo_exploracao || 'MISTO') as TipoExploracao;
  const lotes = JSON.parse(JSON.stringify(lotesRes.data ?? []));

  // Parse searchParams para filtros iniciais
  const searchParams = await props.searchParams;
  const initFiltros: FiltrosIndicadores = {
    periodo: (['30d', '90d', '365d', 'safra', 'custom'].includes(searchParams?.periodo as string)
      ? searchParams?.periodo
      : '90d') as PeriodoPreset,
    dataInicio: searchParams?.dataInicio ? (searchParams.dataInicio as string) : undefined,
    dataFim: searchParams?.dataFim ? (searchParams.dataFim as string) : undefined,
    lotes: searchParams?.lotes ? (searchParams.lotes as string).split(',') : undefined,
    categorias: searchParams?.categorias ? (searchParams.categorias as string).split(',') : undefined,
  };

  return (
    <div className="container mx-auto space-y-8 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Indicadores do Rebanho</h1>
        <p className="text-sm text-muted-foreground">
          Visão única do desempenho do rebanho, organizada por subdomínio
        </p>
      </header>

      {/* Superfície ÚNICA — seções por subdomínio (Fase 4). O detalhe
          zootécnico (corte/desempenho/efetivo + filtros + export) é injetado
          DENTRO da seção Corte; não há camada de indicadores paralela. */}
      <Suspense fallback={<IndicadoresSkeleton />}>
        <IndicadoresRebanhoSurface
          corteDetalhe={
            <IndicadoresClient
              initialFiltros={initFiltros}
              tipoExploracao={tipoExploracao}
              lotes={lotes}
            />
          }
        />
      </Suspense>
    </div>
  );
}
