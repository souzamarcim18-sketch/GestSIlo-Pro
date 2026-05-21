import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { calcularLinhasRelatorio, type RawVinculo } from '@/lib/supabase/planejamento-compras';
import type { PlanejamentoAtividadeComDetalhes } from '@/lib/types/planejamento-compras';
import { PlanejamentoComprasClient } from './PlanejamentoComprasClient';

export const metadata = {
  title: 'Planejamento de Compras | GestSilo',
};

export default async function PlanejamentoComprasPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const [plResult, talhaoResult, cicloResult, relatorioResult, profileResult] = await Promise.all([
    supabase
      .from('planejamentos_atividade')
      .select(`
        id, talhao_id, ciclo_id, tipo_operacao, data_prevista, status, observacoes,
        fazenda_id, created_by, created_at, updated_at,
        talhao:talhoes(id, nome, area_ha),
        ciclo:ciclos_agricolas(id, cultura),
        insumos:planejamento_insumos(
          id, planejamento_id, insumo_id, quantidade, fazenda_id, created_at,
          insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
        )
      `)
      .eq('fazenda_id', fazendaId)
      .order('data_prevista', { ascending: true }),
    supabase
      .from('talhoes')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true }),
    supabase
      .from('ciclos_agricolas')
      .select('id, cultura')
      .eq('ativo', true)
      .order('cultura', { ascending: true }),
    supabase
      .from('planejamento_insumos')
      .select(`
        insumo_id, quantidade,
        planejamento:planejamentos_atividade!inner(id, status, data_prevista, talhao_id),
        insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
      `)
      .eq('fazenda_id', fazendaId)
      .eq('planejamento.status', 'planejada'),
    supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single(),
  ]);

  const planejamentos = (plResult.data ?? []) as unknown as PlanejamentoAtividadeComDetalhes[];
  const talhoes = (talhaoResult.data ?? []) as { id: string; nome: string }[];
  const ciclos = (cicloResult.data ?? []) as { id: string; cultura: string }[];
  const linhasRelatorio = calcularLinhasRelatorio((relatorioResult.data ?? []) as unknown as RawVinculo[]);
  const isAdmin = profileResult.data?.perfil === 'Administrador';

  return (
    <PlanejamentoComprasClient
      initialPlanejamentos={planejamentos}
      initialTalhoes={talhoes}
      initialCiclos={ciclos}
      initialLinhasRelatorio={linhasRelatorio}
      isAdmin={isAdmin}
      fazendaId={fazendaId}
    />
  );
}
