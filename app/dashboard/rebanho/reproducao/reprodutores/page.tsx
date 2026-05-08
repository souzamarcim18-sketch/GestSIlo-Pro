import { queryReprodutores } from '@/lib/supabase/rebanho-reproducao';
import { sou_admin } from '@/lib/auth/helpers';
import { ReprodutoresClient } from './ReprodutoresClient';

export default async function ReprodutoresPage() {
  const [{ dados: reprodutores }, admin] = await Promise.all([
    queryReprodutores.list(),
    sou_admin(),
  ]);

  return <ReprodutoresClient initialReprodutores={reprodutores} isAdmin={admin} />;
}
