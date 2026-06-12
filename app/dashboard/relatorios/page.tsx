import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { RelatoriosClient } from './RelatoriosClient';
import type { EntidadeOption } from '@/components/relatorios/EntidadeFilter';

export const metadata = {
  title: 'Relatórios | GestSilo',
};

export default async function RelatoriosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const [
    fazendaRes,
    silosRes,
    talhoesRes,
    maquinasRes,
    insumosRes,
    produtosRes,
    pastagensRes,
    colaboradoresRes,
  ] = await Promise.all([
    supabase.from('fazendas').select('nome').eq('id', fazendaId).single(),
    supabase.from('silos').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
    supabase.from('talhoes').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
    supabase.from('maquinas').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
    supabase.from('insumos').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
    supabase.from('produtos').select('id, nome').eq('fazenda_id', fazendaId).eq('ativo', true).order('nome'),
    supabase.from('pastagens').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
    supabase.from('colaboradores').select('id, nome').eq('fazenda_id', fazendaId).eq('ativo', true).order('nome'),
  ]);

  const asOptions = (data: { id: string; nome: string }[] | null): EntidadeOption[] =>
    (data ?? []).map((r) => ({ id: r.id, nome: r.nome }));

  return (
    <RelatoriosClient
      fazendaId={fazendaId}
      fazendaNome={fazendaRes.data?.nome ?? 'Minha Fazenda'}
      entidades={{
        silos: asOptions(silosRes.data),
        talhoes: asOptions(talhoesRes.data),
        maquinas: asOptions(maquinasRes.data),
        insumos: asOptions(insumosRes.data),
        produtos: asOptions(produtosRes.data),
        pastagens: asOptions(pastagensRes.data),
        colaboradores: asOptions(colaboradoresRes.data),
      }}
    />
  );
}
