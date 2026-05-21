import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import type { Financeiro } from '@/lib/supabase';
import { FinanceiroClient } from './FinanceiroClient';

export const metadata = {
  title: 'Financeiro | GestSilo',
};

export default async function FinanceiroPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const [lancamentosRes, categoriasRes, profileRes] = await Promise.all([
    supabase
      .from('financeiro')
      .select('id, tipo, descricao, categoria, valor, data, forma_pagamento, referencia_tipo, referencia_id, fazenda_id, created_at')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false }),
    supabase
      .from('financeiro')
      .select('categoria')
      .eq('fazenda_id', fazendaId),
    supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single(),
  ]);

  const lancamentos = (lancamentosRes.data ?? []) as Financeiro[];
  const categorias = [...new Set((categoriasRes.data ?? []).map((r) => r.categoria).filter(Boolean))] as string[];
  const isAdmin = profileRes.data?.perfil === 'Administrador';

  return (
    <FinanceiroClient
      initialLancamentos={lancamentos}
      initialCategorias={categorias}
      isAdmin={isAdmin}
      fazendaId={fazendaId}
    />
  );
}
