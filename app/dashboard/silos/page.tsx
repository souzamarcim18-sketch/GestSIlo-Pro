import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Silo, type MovimentacaoSilo, type Talhao } from '@/lib/supabase';
import { calcularDadosSilos } from './helpers';
import { SilosClient } from './SilosClient';

export const metadata = {
  title: 'Silos | GestSilo',
};

export default async function SilosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single();
  const isAdmin = profileData?.perfil === 'Administrador';

  const [silosRes, talhoesRes, insumosRes] = await Promise.all([
    supabase
      .from('silos')
      .select('id, nome, tipo, talhao_id, cultura_ensilada, data_fechamento, data_abertura_real, data_abertura_prevista, volume_ensilado_ton_mv, materia_seca_percent, comprimento_m, largura_m, altura_m, observacoes_gerais, custo_aquisicao_rs_ton, insumo_lona_id, insumo_inoculante_id, created_at, fazenda_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('talhoes')
      .select('id, nome, area_ha, tipo_solo, status, fazenda_id, observacoes')
      .order('nome', { ascending: true }),
    supabase
      .from('insumos')
      .select('id, nome, categoria:categorias_insumo(nome)')
      .eq('ativo', true)
      .order('nome', { ascending: true }),
  ]);

  const silos = (silosRes.data ?? []) as Silo[];
  const talhoes = (talhoesRes.data ?? []) as Talhao[];

  type InsumoComCategoria = { id: string; nome: string; categoria: { nome: string } | { nome: string }[] | null };
  const todosInsumos = (insumosRes.data ?? []) as unknown as InsumoComCategoria[];
  const getCategoriaNome = (cat: InsumoComCategoria['categoria']): string => {
    if (!cat) return '';
    if (Array.isArray(cat)) return cat[0]?.nome ?? '';
    return cat.nome ?? '';
  };
  const insumosLona = todosInsumos
    .filter((i) => getCategoriaNome(i.categoria).toLowerCase().includes('lona'))
    .map(({ id, nome }) => ({ id, nome }));
  const insumosInoculante = todosInsumos
    .filter((i) => getCategoriaNome(i.categoria).toLowerCase().includes('inoculante'))
    .map(({ id, nome }) => ({ id, nome }));

  let movimentacoes: MovimentacaoSilo[] = [];
  if (silos.length > 0) {
    const movsRes = await supabase
      .from('movimentacoes_silo')
      .select('id, silo_id, tipo, subtipo, quantidade, data, talhao_id, responsavel, observacao, valor_unitario, comprador, receita_id')
      .in('silo_id', silos.map(s => s.id))
      .order('data', { ascending: false });
    movimentacoes = (movsRes.data ?? []) as MovimentacaoSilo[];
  }

  const siloCardData = calcularDadosSilos(silos, movimentacoes);

  return (
    <SilosClient
      initialSiloCardData={siloCardData}
      initialTalhoes={talhoes}
      initialInsumosLona={insumosLona}
      initialInsumosInoculante={insumosInoculante}
      isAdmin={isAdmin}
    />
  );
}
