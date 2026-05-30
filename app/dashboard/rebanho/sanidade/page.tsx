import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import {
  listAlertasVacinacao,
  listEventosSanitarios,
} from '@/lib/supabase/rebanho-sanitario';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Animal, Lote } from '@/lib/types/rebanho';
import type { EventoSanitarioRow } from '@/lib/types/rebanho-sanitario';
import { SanidadeDashboard } from '@/components/rebanho/sanidade/SanidadeDashboard';

export const metadata = {
  title: 'Sanidade | GestSilo',
};

export default async function SanidadePage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const fazendaId = await getCurrentFazendaId();

  const hoje = new Date();
  const inicio90dias = new Date(hoje);
  inicio90dias.setDate(inicio90dias.getDate() - 90);
  const dataInicio = inicio90dias.toISOString().split('T')[0];
  const dataFim = hoje.toISOString().split('T')[0];

  const [alertas, eventos, animaisRes, lotesRes] = await Promise.all([
    listAlertasVacinacao(15),
    listEventosSanitarios({ data_inicio: dataInicio, data_fim: dataFim }, 1000, 0),
    supabase
      .from('animais')
      .select('id, brinco, nome, sexo, tipo_rebanho, categoria, status, lote_id, deleted_at')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .eq('status', 'Ativo')
      .order('brinco'),
    supabase
      .from('lotes')
      .select('id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at')
      .eq('fazenda_id', fazendaId)
      .order('nome'),
  ]);

  const animais = JSON.parse(JSON.stringify((animaisRes.data || []) as Animal[]));
  const lotes = JSON.parse(JSON.stringify((lotesRes.data || []) as Lote[]));

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sanidade Animal</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe vacinações, vermifugações, tratamentos e exames
          </p>
        </div>

        <SanidadeDashboard
          alertas={alertas}
          eventos={eventos}
          animais={animais}
          lotes={lotes}
        />
      </div>
    </div>
  );
}
