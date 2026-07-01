import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  type Silo,
  type MovimentacaoSilo,
  type Talhao,
  type AvaliacaoBromatologica,
  type AvaliacaoPSPS,
} from '@/lib/supabase';
import { getCustoSiloDetalhado } from '@/lib/supabase/silos';
import { SiloDetailClient } from './SiloDetailClient';
import { type InsumoResumo } from '../components/tabs/VisaoGeralTab';

export const metadata = {
  title: 'Detalhe do Silo | GestSilo',
};

const SILO_COLS =
  'id, nome, tipo, talhao_id, cultura_ensilada, data_fechamento, data_abertura_real, data_abertura_prevista, volume_ensilado_ton_mv, materia_seca_percent, comprimento_m, largura_m, altura_m, observacoes_gerais, custo_aquisicao_rs_ton, insumo_lona_id, insumo_lona2_id, insumo_inoculante_id, created_at, fazenda_id';

export default async function SiloDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: siloId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const [siloRes, profileRes] = await Promise.all([
    supabase.from('silos').select(SILO_COLS).eq('id', siloId).maybeSingle(),
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
  ]);

  const silo = siloRes.data as Silo | null;
  if (!silo) notFound();

  const isAdmin = profileRes.data?.perfil === 'Administrador';

  // Demais dados em paralelo — dependem do silo já carregado.
  const [movsRes, talhoesRes, bromRes, pspsRes, custo] = await Promise.all([
    supabase
      .from('movimentacoes_silo')
      .select('id, silo_id, tipo, subtipo, quantidade, data, talhao_id, responsavel, observacao, valor_unitario, comprador, receita_id')
      .eq('silo_id', siloId)
      .order('data', { ascending: false }),
    supabase
      .from('talhoes')
      .select('id, nome, area_ha, tipo_solo, status, fazenda_id, observacoes')
      .order('nome', { ascending: true }),
    supabase
      .from('avaliacoes_bromatologicas')
      .select('id, silo_id, data, momento, ms, pb, fdn, fda, amido, ndt, ph, avaliador, created_at')
      .eq('silo_id', siloId)
      .order('data', { ascending: false }),
    supabase
      .from('avaliacoes_psps')
      .select('id, silo_id, data, momento, peneira_19mm, peneira_8_19mm, peneira_4_8mm, peneira_fundo_4mm, tmp_mm, tamanho_teorico_corte_mm, kernel_processor, avaliador, created_at')
      .eq('silo_id', siloId)
      .order('data', { ascending: false }),
    getCustoSiloDetalhado(silo, supabase),
  ]);

  const talhoes = (talhoesRes.data ?? []) as Talhao[];
  const talhao = silo.talhao_id ? talhoes.find((t) => t.id === silo.talhao_id) ?? null : null;

  // Insumos de lona/inoculante para exibição
  const insumoIds = [silo.insumo_lona_id, silo.insumo_inoculante_id].filter(
    (v): v is string => !!v
  );
  let insumoLona: InsumoResumo | null = null;
  let insumoInoculante: InsumoResumo | null = null;
  if (insumoIds.length > 0) {
    const { data: insumosData } = await supabase
      .from('insumos')
      .select('id, nome, unidade, custo_medio')
      .in('id', insumoIds);
    const lista = (insumosData ?? []) as InsumoResumo[];
    insumoLona = lista.find((i) => i.id === silo.insumo_lona_id) ?? null;
    insumoInoculante = lista.find((i) => i.id === silo.insumo_inoculante_id) ?? null;
  }

  return (
    <SiloDetailClient
      initialSilo={silo}
      initialMovimentacoes={(movsRes.data ?? []) as MovimentacaoSilo[]}
      initialTalhoes={talhoes}
      initialTalhao={talhao}
      initialAvaliacoesBromatologicas={(bromRes.data ?? []) as AvaliacaoBromatologica[]}
      initialAvaliacoesPsps={(pspsRes.data ?? []) as AvaliacaoPSPS[]}
      initialCusto={custo}
      initialInsumoLona={insumoLona}
      initialInsumoInoculante={insumoInoculante}
      isAdmin={isAdmin}
    />
  );
}
