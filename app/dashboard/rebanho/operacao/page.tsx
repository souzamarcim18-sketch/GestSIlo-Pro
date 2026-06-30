import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getResumoOperacaoDia } from '@/lib/supabase/rebanho-pendencias';
import { OperacaoDiaClient } from './OperacaoDiaClient';

export const metadata = {
  title: 'Operação do dia | GestSilo',
};

/**
 * Operação do dia (Fase 3 — SPEC-rebanho345 §6.3.3).
 *
 * Superfície de LEITURA derivada de alertas já existentes. Sem persistência de
 * tarefa, sem fonte de verdade nova. RSC busca o resumo e passa ao client.
 */
export default async function OperacaoDiaPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const resumo = await getResumoOperacaoDia();

  return <OperacaoDiaClient resumo={resumo} />;
}
