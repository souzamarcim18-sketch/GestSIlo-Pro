import { DashboardReprodutivo } from '@/components/rebanho/reproducao/DashboardReprodutivo';
import {
  queryEventosRebanho,
  queryIndicadoresReprodutivos,
  queryParametrosReprodutivos,
  queryRepetidoras,
} from '@/lib/supabase/rebanho-reproducao';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EventoReprodutivo } from '@/lib/types/rebanho-reproducao';
import type { Animal } from '@/lib/types/rebanho';

export default async function ReproducaoPage() {
  const fazendaId = await getCurrentFazendaId();
  const supabase = await createSupabaseServerClient();

  const hoje = new Date();
  const inicio120dias = new Date(hoje);
  inicio120dias.setDate(inicio120dias.getDate() - 120);
  const dataInicio = inicio120dias.toISOString().split('T')[0];
  const dataFim = hoje.toISOString().split('T')[0];

  const [
    eventos,
    animaisRes,
    repetidoras,
    taxaPrenhez,
    contagemPorStatus,
    distribuicaoDetalhada,
    psmMedia,
    iepMedia,
    taxaConcepçaoIA,
    diasEmAberto,
    taxaServiço,
    idadePrimeiraPariçao,
    parametros,
  ] = await Promise.all([
    queryEventosRebanho.listByPeriodo(fazendaId, dataInicio, dataFim),
    supabase
      .from('animais')
      .select('id, brinco, lote_id, status_reprodutivo, tipo_rebanho')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null),
    queryRepetidoras.list(fazendaId),
    queryIndicadoresReprodutivos.getTaxaPrenhez(fazendaId),
    queryIndicadoresReprodutivos.getContagemPorStatus(fazendaId),
    queryIndicadoresReprodutivos.getDistribuicaoReprodutivaDetalhada(fazendaId),
    queryIndicadoresReprodutivos.getPSMMedia(fazendaId),
    queryIndicadoresReprodutivos.getIEPMedia(fazendaId),
    queryIndicadoresReprodutivos.getTaxaConcepçãoIA(fazendaId),
    queryIndicadoresReprodutivos.getDiasEmAberto(fazendaId),
    queryIndicadoresReprodutivos.getTaxaServiço(fazendaId),
    queryIndicadoresReprodutivos.getIdadePrimeiraPariçao(fazendaId),
    queryParametrosReprodutivos.get(),
  ]);

  return (
    <DashboardReprodutivo
      eventos={eventos as EventoReprodutivo[]}
      animais={(animaisRes.data ?? []) as Animal[]}
      repetidoras={repetidoras}
      distribuicaoDetalhada={distribuicaoDetalhada}
      indicadores={{
        taxaPrenhez,
        contagemPorStatus,
        psmMedia,
        iepMedia,
        taxaConcepçaoIA,
        diasEmAberto,
        taxaServiço,
        idadePrimeiraPariçao,
      }}
      parametros={parametros}
    />
  );
}
