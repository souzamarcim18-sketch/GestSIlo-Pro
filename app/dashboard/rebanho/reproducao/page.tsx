import { CalendarioReprodutivo } from '@/components/rebanho/reproducao/CalendarioReprodutivo';
import { queryEventosRebanho } from '@/lib/supabase/rebanho-reproducao';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ReproducaoPage() {
  const fazendaId = await getCurrentFazendaId();
  const supabase = await createSupabaseServerClient();

  // Buscar eventos dos últimos 120 dias para o Kanban
  const hoje = new Date();
  const inicio120dias = new Date(hoje);
  inicio120dias.setDate(inicio120dias.getDate() - 120);
  const dataInicio = inicio120dias.toISOString().split('T')[0];
  const dataFim = hoje.toISOString().split('T')[0];

  const [eventos, animais] = await Promise.all([
    queryEventosRebanho.listByPeriodo(fazendaId, dataInicio, dataFim),
    supabase
      .from('animais')
      .select('id, brinco, lote_id, status_reprodutivo, tipo_rebanho')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null),
  ]);

  const animaisData = animais.data || [];

  return (
    <CalendarioReprodutivo
      eventos={eventos as any}
      animais={animaisData as any}
    />
  );
}
