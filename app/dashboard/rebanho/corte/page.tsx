import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCorte } from '@/components/rebanho/corte/DashboardCorte';
import type { Animal, PesoAnimal, Lote } from '@/lib/types/rebanho';

export const metadata = {
  title: 'Gestão de Corte | GestSilo',
};

export default async function CortePage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const fazendaId = await getCurrentFazendaId();

  // Buscar animais de corte/dupla-aptidão ativos
  const [animaisRes, lotesRes, pesosRes] = await Promise.all([
    supabase
      .from('animais')
      .select(
        'id, brinco, nome, sexo, tipo_rebanho, categoria, status, lote_id, peso_atual, deleted_at'
      )
      .eq('fazenda_id', fazendaId)
      .in('tipo_rebanho', ['corte', 'dupla_aptidao'])
      .eq('status', 'Ativo')
      .is('deleted_at', null),
    supabase
      .from('lotes')
      .select('id, nome, tipo_rebanho')
      .eq('fazenda_id', fazendaId)
      .in('tipo_rebanho', ['corte', 'misto']),
    supabase
      .from('pesos_animal')
      .select('id, animal_id, data_pesagem, peso_kg')
      .eq('fazenda_id', fazendaId)
      .order('data_pesagem', { ascending: false }),
  ]);

  const animais = JSON.parse(JSON.stringify((animaisRes.data || []) as Animal[]));
  const lotes = JSON.parse(JSON.stringify((lotesRes.data || []) as Lote[]));
  const pesos = JSON.parse(JSON.stringify((pesosRes.data || []) as PesoAnimal[]));

  // Dados iniciais (últimos 90 dias)
  const hoje = new Date();
  const inicio90dias = new Date(hoje);
  inicio90dias.setDate(inicio90dias.getDate() - 90);
  const data90dias = inicio90dias.toISOString().split('T')[0];

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Corte</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o ganho de peso e projeção de abate do rebanho
          </p>
        </div>

        {animais.length === 0 ? (
          <Card className="bg-muted/50 p-8 text-center">
            <CardTitle className="mb-2">Nenhum animal de corte cadastrado</CardTitle>
            <CardDescription>
              Crie um animal com tipo de rebanho &quot;Corte&quot; ou &quot;Dupla Aptidão&quot; para começar a acompanhar.
            </CardDescription>
          </Card>
        ) : (
          <DashboardCorte
            animais={animais}
            lotes={lotes}
            pesos={pesos}
            data90dias={data90dias}
          />
        )}
      </div>
    </div>
  );
}
