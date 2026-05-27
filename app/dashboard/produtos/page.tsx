import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProdutosClient } from './ProdutosClient';
import { listCategoriasProduto } from '@/lib/supabase/produtos';

export const metadata = {
  title: 'Produtos | GestSilo',
};

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const [profileRes, categorias] = await Promise.all([
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
    listCategoriasProduto(),
  ]);

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  return <ProdutosClient isAdmin={isAdmin} initialCategorias={categorias} />;
}
