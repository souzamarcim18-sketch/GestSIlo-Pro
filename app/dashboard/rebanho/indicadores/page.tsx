import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type FiltrosIndicadores, type TipoExploracao } from '@/types/rebanho-indicadores';
import IndicadoresClient from './IndicadoresClient';
import IndicadoresSkeleton from './components/IndicadoresSkeleton';

export const metadata = {
  title: 'Indicadores Zootécnicos | GestSilo Pro',
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

  // Fetch tipo_exploracao e lotes da fazenda
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
  const lotes = (lotesRes.data as any[]) || [];

  // Parse searchParams para filtros iniciais
  const searchParams = await props.searchParams;
  const initFiltros: FiltrosIndicadores = {
    periodo: (searchParams?.periodo as any) || '90d',
    dataInicio: searchParams?.dataInicio ? new Date(searchParams.dataInicio as string) : undefined,
    dataFim: searchParams?.dataFim ? new Date(searchParams.dataFim as string) : undefined,
    lotes: searchParams?.lotes ? (searchParams.lotes as string).split(',') : undefined,
    categorias: searchParams?.categorias ? (searchParams.categorias as string).split(',') : undefined,
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Indicadores Zootécnicos</h1>
        <p className="text-sm text-gray-600">Acompanhe o desempenho do rebanho e análise de produtividade</p>
      </header>

      <Suspense fallback={<IndicadoresSkeleton />}>
        <IndicadoresClient
          initialFiltros={initFiltros}
          tipoExploracao={tipoExploracao}
          lotes={lotes}
        />
      </Suspense>
    </div>
  );
}
