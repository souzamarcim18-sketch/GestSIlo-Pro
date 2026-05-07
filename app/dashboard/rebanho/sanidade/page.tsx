import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  listAlertasVacinacao,
  listEventosSanitarios,
} from '@/lib/supabase/rebanho-sanitario';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Animal, Lote } from '@/lib/types/rebanho';
import type { EventoSanitarioRow } from '@/lib/types/rebanho-sanitario';
import { SanidadeDashboard } from '@/components/rebanho/sanidade/SanidadeDashboard';

export const metadata = {
  title: 'Sanidade | GestSilo Pro',
};

export default async function SanidadePage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const fazendaId = await getCurrentFazendaId();

  // Buscar alertas de vacinação (próximos 15 dias + vencidos)
  const alertas = await listAlertasVacinacao(15);

  // Buscar todos os eventos sanitários (últimos 90 dias)
  const hoje = new Date();
  const inicio90dias = new Date(hoje);
  inicio90dias.setDate(inicio90dias.getDate() - 90);
  const dataInicio = inicio90dias.toISOString().split('T')[0];
  const dataFim = hoje.toISOString().split('T')[0];

  const eventos = await listEventosSanitarios(
    { data_inicio: dataInicio, data_fim: dataFim },
    1000,
    0
  );

  // Buscar todos os animais para seleção
  const { data: animaisRes } = await supabase
    .from('animais')
    .select('id, brinco, nome, sexo, tipo_rebanho, categoria, status, lote_id, deleted_at')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('brinco');

  const animais = (animaisRes || []) as Animal[];

  // Buscar todos os lotes para seleção
  const { data: lotesRes } = await supabase
    .from('lotes')
    .select('id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at')
    .eq('fazenda_id', fazendaId)
    .order('nome');

  const lotes = (lotesRes || []) as Lote[];

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <Breadcrumbs />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Sanidade Animal</h1>
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
