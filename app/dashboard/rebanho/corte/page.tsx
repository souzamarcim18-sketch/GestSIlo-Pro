import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import {
  queryEventosRebanho,
  queryIndicadoresReprodutivos,
  queryParametrosReprodutivos,
  queryRepetidoras,
  queryReprodutores,
} from '@/lib/supabase/rebanho-reproducao';
import { queryDoadoras } from '@/lib/supabase/rebanho-doadoras';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { CortePainel } from './CortePainel';
import type { Animal, PesoAnimal, Lote } from '@/lib/types/rebanho';
import type { EventoReprodutivo } from '@/lib/types/rebanho-reproducao';

export const metadata = {
  title: 'Gestão de Corte | GestSilo',
};

const ESPECIES_CORTE = ['corte', 'dupla_aptidao'] as const;

export default async function CortePage() {
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
  const inicio90dias = new Date(hoje);
  inicio90dias.setDate(inicio90dias.getDate() - 90);
  const data90dias = inicio90dias.toISOString().split('T')[0];
  const dataFim = hoje.toISOString().split('T')[0];
  const inicio120 = new Date(hoje);
  inicio120.setDate(inicio120.getDate() - 120);
  const dataInicioRepro = inicio120.toISOString().split('T')[0];

  const [
    animaisRes,
    lotesRes,
    pesosRes,
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
    supabase
      .from('animais')
      .select('id, brinco, nome, sexo, tipo_rebanho, categoria, status, lote_id, peso_atual, deleted_at')
      .eq('fazenda_id', fazendaId)
      .in('tipo_rebanho', ESPECIES_CORTE)
      .eq('status', 'Ativo')
      .is('deleted_at', null),
    supabase
      .from('lotes')
      .select('id, nome, tipo_rebanho')
      .eq('fazenda_id', fazendaId)
      .in('tipo_rebanho', ['corte', 'misto']),
    supabase
      .from('pesos_animal')
      .select('id, animal_id, data_pesagem, peso_kg')
      .eq('fazenda_id', fazendaId)
      .order('data_pesagem', { ascending: false }),
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
    queryEventosRebanho.listByPeriodo(fazendaId, dataInicioRepro, dataFim),
    supabase
      .from('animais')
      .select('id, brinco, nome, lote_id, status_reprodutivo, tipo_rebanho, sexo, status')
      .eq('fazenda_id', fazendaId)
      .in('tipo_rebanho', ESPECIES_CORTE)
      .is('deleted_at', null),
    queryRepetidoras.list(fazendaId),
    queryIndicadoresReprodutivos.getContagemPorStatus(fazendaId, [...ESPECIES_CORTE]),
    queryIndicadoresReprodutivos.getDistribuicaoReprodutivaDetalhada(fazendaId),
    queryIndicadoresReprodutivos.getTaxaPrenhez(fazendaId),
    queryIndicadoresReprodutivos.getPSMMedia(fazendaId),
    queryIndicadoresReprodutivos.getIEPMedia(fazendaId),
    queryIndicadoresReprodutivos.getTaxaConcepçãoIA(fazendaId),
    queryIndicadoresReprodutivos.getDiasEmAberto(fazendaId),
    queryIndicadoresReprodutivos.getTaxaServiço(fazendaId),
    queryIndicadoresReprodutivos.getIdadePrimeiraPariçao(fazendaId),
    queryParametrosReprodutivos.get('corte'),
    queryReprodutores.list(1, 100, [...ESPECIES_CORTE]),
    queryDoadoras.list([...ESPECIES_CORTE]),
  ]);

  const animais = JSON.parse(JSON.stringify((animaisRes.data || []) as Animal[]));
  const lotes = JSON.parse(JSON.stringify((lotesRes.data || []) as Lote[]));
  const pesos = JSON.parse(JSON.stringify((pesosRes.data || []) as PesoAnimal[]));
  const isAdmin = perfilRes.data?.perfil === 'Administrador';

  const animaisRepro = JSON.parse(JSON.stringify(animaisReproRes.data ?? [])) as Animal[];
  const animaisFemea = (animaisReproRes.data ?? [])
    .filter((a) => a.sexo === 'Fêmea' && a.status === 'Ativo')
    .map((a) => ({ id: a.id, brinco: a.brinco, nome: a.nome }));

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Corte</h1>
          <p className="text-muted-foreground mt-1">
            Desempenho, reprodução e indicadores do rebanho de corte
          </p>
        </div>

        {animais.length === 0 ? (
          <Card className="bg-muted/50 p-8 text-center">
            <CardTitle className="mb-2">Nenhum animal de corte cadastrado</CardTitle>
            <CardDescription>
              Crie um animal com tipo de rebanho &quot;Corte&quot; ou &quot;Dupla Aptidão&quot; para começar a acompanhar.
            </CardDescription>
          </Card>
        ) : (
          <CortePainel
            animais={animais}
            lotes={lotes}
            pesos={pesos}
            data90dias={data90dias}
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
        )}
      </div>
    </div>
  );
}
