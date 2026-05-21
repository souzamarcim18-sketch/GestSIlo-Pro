import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Talhao, type CicloAgricola } from '@/lib/types/talhoes';
import { TalhoesClient } from './TalhoesClient';

export const metadata = {
  title: 'Talhões | GestSilo',
};

export default async function TalhoesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const talhoesRes = await supabase
    .from('talhoes')
    .select('id, nome, area_ha, tipo_solo, status, fazenda_id, observacoes')
    .order('nome', { ascending: true });

  const talhoes = (talhoesRes.data ?? []) as Talhao[];

  const ciclosAtivos: Record<string, CicloAgricola> = {};

  if (talhoes.length > 0) {
    const ciclosRes = await supabase
      .from('ciclos_agricolas')
      .select('id, talhao_id, cultura, data_plantio, data_colheita_prevista, data_colheita_real, produtividade_ton_ha, custo_total_estimado, permite_rebrota, ativo, created_at, updated_at')
      .in('talhao_id', talhoes.map(t => t.id))
      .order('data_plantio', { ascending: false });

    ((ciclosRes.data ?? []) as CicloAgricola[]).forEach((ciclo) => {
      if (ciclo.ativo && !ciclosAtivos[ciclo.talhao_id]) {
        ciclosAtivos[ciclo.talhao_id] = ciclo;
      }
    });
  }

  return (
    <TalhoesClient
      initialTalhoes={talhoes}
      initialCiclosAtivos={ciclosAtivos}
    />
  );
}
