import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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
        <h1 className="text-3xl font-bold tracking-tight">Importar Animais</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Faça upload de um arquivo CSV para importar múltiplos animais de uma vez. Você revisa
          tudo antes de confirmar — linhas com erro são sinalizadas e só as válidas são importadas.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Não tem os dados em planilha?{' '}
          <a href="/dashboard/rebanho/cadastro-rapido" className="font-medium text-primary underline">
            Use o cadastro rápido em grade
          </a>
          .
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
              <strong>nome</strong>, <strong>tipo_rebanho</strong> (leiteiro/corte/dupla_aptidao),
              <strong> categoria</strong>, <strong>raca</strong> (opcionais)
            </li>
            <li>
              <strong>lote</strong>: Nome do lote (opcional, criado se não existir)
            </li>
            <li>
              <strong>origem</strong> (nascido/comprado), <strong>peso_nascimento</strong>,
              <strong> peso_atual</strong> (opcionais)
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
            <li>✓ Aceita separador vírgula (,) ou ponto e vírgula (;)</li>
            <li>✓ Você revisa tudo antes de confirmar a importação</li>
            <li>✓ Brincos duplicados (no arquivo ou já existentes) são sinalizados</li>
            <li>✓ Lotes são criados automaticamente se necessário</li>
            <li>✓ Categoria é calculada automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
