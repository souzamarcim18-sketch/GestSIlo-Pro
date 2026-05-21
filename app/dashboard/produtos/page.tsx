import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProdutosClient } from './ProdutosClient';

export const metadata = {
  title: 'Produtos | GestSilo',
};

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const profileRes = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  return <ProdutosClient isAdmin={isAdmin} />;
}
