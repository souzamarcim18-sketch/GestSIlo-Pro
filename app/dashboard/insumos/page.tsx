import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InsumosClient } from './InsumosClient';

export const metadata = {
  title: 'Insumos | GestSilo',
};

export default async function InsumosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  return <InsumosClient />;
}
