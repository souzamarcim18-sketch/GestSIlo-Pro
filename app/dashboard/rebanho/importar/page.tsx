import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ImportadorCSV } from '@/components/rebanho/ImportadorCSV';

export default async function ImportarPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  if (profile?.perfil !== 'Administrador') {
    redirect('/dashboard/rebanho');
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Importar Animais</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Faça upload de um arquivo CSV para importar múltiplos animais de uma vez.
          Linhas com erros serão exibidas, enquanto animais válidos serão importados.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ImportadorCSV onSuccess={() => {}} />
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-6 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">Formato Esperado</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>brinco</strong>: Identificador do animal (obrigatório, único)
            </li>
            <li>
              <strong>sexo</strong>: Macho ou Fêmea (obrigatório)
            </li>
            <li>
              <strong>data_nascimento</strong>: ISO ou DD/MM/YYYY (obrigatório)
            </li>
            <li>
              <strong>tipo_rebanho</strong>: leiteiro ou corte (opcional, padrão: leiteiro)
            </li>
            <li>
              <strong>lote</strong>: Nome do lote (opcional, criado se não existir)
            </li>
            <li>
              <strong>raca</strong>: Raça do animal (opcional)
            </li>
            <li>
              <strong>observacoes</strong>: Observações livres (opcional)
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Dicas</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>✓ Baixe o template para ver um exemplo</li>
            <li>✓ Máximo 10MB por arquivo</li>
            <li>✓ Brincos duplicados serão reportados como erro</li>
            <li>✓ Importação é atômica (tudo ou nada por lote)</li>
            <li>✓ Lotes são criados automaticamente se necessário</li>
            <li>✓ Categoria é calculada automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
