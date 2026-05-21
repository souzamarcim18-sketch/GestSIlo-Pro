import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Talhao, type EventoDAP } from '@/lib/types/talhoes';
import { CalendarioClient } from './CalendarioClient';

export const metadata = {
  title: 'Calendário | GestSilo',
};

interface EventoDAP_Extended extends EventoDAP {
  talhao_nome?: string;
}

export default async function CalendarioPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const [talhoesRes, eventosRes] = await Promise.all([
    supabase
      .from('talhoes')
      .select('id, nome, fazenda_id, area_ha, tipo_solo, status, observacoes, created_at, updated_at')
      .order('nome'),
    supabase
      .from('eventos_dap')
      .select('id, ciclo_id, talhao_id, cultura, tipo_operacao, dias_apos_plantio, dias_apos_plantio_final, data_esperada, data_realizada, status, atividade_campo_id, created_at, updated_at, talhoes(nome)')
      .order('data_esperada', { ascending: true }),
  ]);

  const talhoes = (talhoesRes.data ?? []) as Talhao[];

  const eventos: EventoDAP_Extended[] = ((eventosRes.data ?? []) as any[]).map((evt) => ({
    ...evt,
    talhao_nome: evt.talhoes?.nome,
    talhoes: undefined,
  }));

  const culturas = Array.from(new Set(eventos.map((e) => e.cultura).filter(Boolean))) as string[];

  return (
    <CalendarioClient
      initialTalhoes={talhoes}
      initialEventos={eventos}
      initialCulturas={culturas}
    />
  );
}
