import { IndicadoresCard } from '@/components/rebanho/reproducao/IndicadoresCard';
import { queryIndicadoresReprodutivos, queryParametrosReprodutivos } from '@/lib/supabase/rebanho-reproducao';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function IndicadoresPage() {
  const fazendaId = await getCurrentFazendaId();

  const [taxaPrenhez, contagemPorStatus, psmMedia, iepMedia, parametros] = await Promise.all([
    queryIndicadoresReprodutivos.getTaxaPrenhez(fazendaId),
    queryIndicadoresReprodutivos.getContagemPorStatus(fazendaId),
    queryIndicadoresReprodutivos.getPSMMedia(fazendaId),
    queryIndicadoresReprodutivos.getIEPMedia(fazendaId),
    queryParametrosReprodutivos.get(),
  ]);

  return (
    <IndicadoresCard
      taxaPrenhez={taxaPrenhez}
      psmMedia={psmMedia}
      iepMedia={iepMedia}
      contagemPorStatus={contagemPorStatus}
      parametros={parametros}
    />
  );
}
