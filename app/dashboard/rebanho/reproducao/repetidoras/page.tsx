import { RepetidorasAlerta } from '@/components/rebanho/reproducao/RepetidorasAlerta';
import { queryRepetidoras } from '@/lib/supabase/rebanho-reproducao';
import { getCurrentFazendaId } from '@/lib/auth/helpers';

export default async function RepetidorasPage() {
  const fazendaId = await getCurrentFazendaId();
  const animais = await queryRepetidoras.list(fazendaId);

  return <RepetidorasAlerta animais={animais} />;
}
