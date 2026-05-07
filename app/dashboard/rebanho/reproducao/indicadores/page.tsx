import { IndicadoresCard } from '@/components/rebanho/reproducao/IndicadoresCard';
import { queryIndicadoresReprodutivos, queryParametrosReprodutivos } from '@/lib/supabase/rebanho-reproducao';
import { getCurrentFazendaId } from '@/lib/auth/helpers';

export default async function IndicadoresPage() {
  const fazendaId = await getCurrentFazendaId();

  const [
    taxaPrenhez,
    contagemPorStatus,
    psmMedia,
    iepMedia,
    taxaConcepçaoIA,
    diasEmAberto,
    taxaServiço,
    idadePrimeiraPariçao,
    parametros,
  ] = await Promise.all([
    queryIndicadoresReprodutivos.getTaxaPrenhez(fazendaId),
    queryIndicadoresReprodutivos.getContagemPorStatus(fazendaId),
    queryIndicadoresReprodutivos.getPSMMedia(fazendaId),
    queryIndicadoresReprodutivos.getIEPMedia(fazendaId),
    queryIndicadoresReprodutivos.getTaxaConcepçãoIA(fazendaId),
    queryIndicadoresReprodutivos.getDiasEmAberto(fazendaId),
    queryIndicadoresReprodutivos.getTaxaServiço(fazendaId),
    queryIndicadoresReprodutivos.getIdadePrimeiraPariçao(fazendaId),
    queryParametrosReprodutivos.get(),
  ]);

  return (
    <IndicadoresCard
      taxaPrenhez={taxaPrenhez}
      psmMedia={psmMedia}
      iepMedia={iepMedia}
      taxaConcepçaoIA={taxaConcepçaoIA}
      diasEmAberto={diasEmAberto}
      taxaServiço={taxaServiço}
      idadePrimeiraPariçao={idadePrimeiraPariçao}
      contagemPorStatus={contagemPorStatus}
      parametros={parametros}
    />
  );
}
