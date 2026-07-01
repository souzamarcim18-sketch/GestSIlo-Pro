import { CadastroRapidoClient } from './CadastroRapidoClient';
import { listLotes } from '@/lib/supabase/rebanho';

export const metadata = {
  title: 'Cadastro Rápido de Rebanho | GestSilo',
};

export default async function CadastroRapidoPage() {
  const lotes = await listLotes(200, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cadastro Rápido de Rebanho</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre vários animais de uma vez digitando direto na tela — sem precisar de planilha.
          Defina os dados que se repetem uma vez só e preencha apenas o que muda por animal.
        </p>
      </div>
      <CadastroRapidoClient lotes={lotes} />
    </div>
  );
}
