import { queryEventosRebanho } from '@/lib/supabase/rebanho-reproducao';
import { sou_admin, getCurrentFazendaId } from '@/lib/auth/helpers';
import { EventosListagem } from '@/components/rebanho/reproducao/EventosListagem';
import { getDateRangeLast90Days } from '@/lib/utils/date-range';
import type { EventoReprodutivo } from '@/lib/types/rebanho-reproducao';

export default async function EventosPage() {
  const { dataInicio, dataFim } = getDateRangeLast90Days();

  const [fazenda_id, admin] = await Promise.all([
    getCurrentFazendaId(),
    sou_admin(),
  ]);

  const eventosData = await queryEventosRebanho.listByPeriodo(
    fazenda_id,
    dataInicio,
    dataFim,
  );

  const eventos = eventosData as EventoReprodutivo[];

  return <EventosListagem eventos={eventos} isAdmin={admin} />;
}
