import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import { verificarAlertaSilagem } from '@/app/dashboard/talhoes/helpers';
import type { CicloAgricola } from '@/lib/types/talhoes';
import { DashboardClient } from './DashboardClient';
import type { DashboardData, ProximaOperacaoComBadge } from './dashboard-data';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const fazendaId = await getCurrentFazendaId();

  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const hoje = now.toISOString().split('T')[0];
  const proximosDias = new Date(now);
  proximosDias.setDate(now.getDate() + 5);
  const proximosDiasStr = proximosDias.toISOString().split('T')[0];
  const doisDiasAtras = new Date(now);
  doisDiasAtras.setDate(now.getDate() - 2);
  const doisDiasAtrasStr = doisDiasAtras.toISOString().split('T')[0];

  const [
    silosRes,
    talhoesRes,
    maquinasRes,
    manutRes,
    finRes,
    movsRecentesRes,
    animaisCategRes,
    ciclosRes,
    animaisTipoRes,
    lotesRes,
    animaisPorLoteRes,
    eventosOperacoesRes,
  ] = await Promise.all([
    supabase
      .from('silos')
      .select('id, nome, volume_ensilado_ton_mv, cultura_ensilada, data_abertura_real, estoque_atual')
      .eq('fazenda_id', fazendaId),
    supabase
      .from('talhoes')
      .select('id, area_ha, nome')
      .eq('fazenda_id', fazendaId),
    supabase
      .from('maquinas')
      .select('id', { count: 'exact', head: true })
      .eq('fazenda_id', fazendaId),
    supabase
      .from('manutencoes')
      .select('id', { count: 'exact', head: true })
      .eq('fazenda_id', fazendaId)
      .gte('proxima_manutencao', mesInicio),
    supabase
      .from('financeiro')
      .select('tipo, valor')
      .eq('fazenda_id', fazendaId)
      .gte('data', mesInicio)
      .lte('data', mesFim),
    supabase
      .from('movimentacoes_silo')
      .select('silo_id, tipo, subtipo, quantidade, data')
      .eq('fazenda_id', fazendaId)
      .gte('data', trintaDiasAtras),
    supabase
      .from('animais')
      .select('categoria')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo'),
    supabase
      .from('ciclos_agricolas')
      .select('id, cultura, data_colheita_prevista, data_colheita_real')
      .eq('ativo', true),
    supabase
      .from('animais')
      .select('tipo_rebanho')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo'),
    supabase
      .from('lotes')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .order('nome'),
    supabase
      .from('animais')
      .select('lote_id')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .not('lote_id', 'is', null),
    supabase
      .from('eventos_dap')
      .select('id, data_esperada, data_realizada, tipo_operacao, status, cultura, talhoes(id, nome, fazenda_id)')
      .gte('data_esperada', doisDiasAtrasStr)
      .lte('data_esperada', proximosDiasStr)
      .order('data_esperada', { ascending: true }),
  ]);

  // --- Silagem ---
  const silosData = silosRes.data ?? [];
  let silosOcupacaoPct = '—';
  let silosDetalhe = '—';
  let silosOcupacaoPctNum = 0;
  let silosGaugeDetalhe = '';

  if (silosData.length > 0) {
    const totalVolume = silosData.reduce((acc, s) => acc + (s.volume_ensilado_ton_mv ?? 0), 0);
    const totalEstoque = silosData.reduce((acc, s) => acc + Math.max(s.estoque_atual ?? 0, 0), 0);
    const ocupPct = totalVolume > 0 ? Math.round((totalEstoque / totalVolume) * 100) : 0;
    silosOcupacaoPct = `${ocupPct}%`;
    silosDetalhe = `${totalEstoque.toLocaleString('pt-BR')} / ${totalVolume.toLocaleString('pt-BR')} ton`;
    silosOcupacaoPctNum = ocupPct;
    silosGaugeDetalhe = silosDetalhe;
  }

  const silosTotalCadastrados = silosData.length > 0 ? silosData.length.toString() : '—';

  const silosAbertosData = silosData.filter((s) => s.data_abertura_real && (s.estoque_atual ?? 0) > 0);
  const silosAbertos = silosAbertosData.length > 0 ? silosAbertosData.length.toString() : '0';
  const silosAbertosDetalhe =
    silosAbertosData.length > 0
      ? silosAbertosData.map((s) => s.nome).slice(0, 2).join(', ') +
        (silosAbertosData.length > 2 ? ` +${silosAbertosData.length - 2}` : '')
      : 'Nenhum silo aberto';
  const silosAbertosNomes = silosAbertosData.map((s) => s.nome).filter(Boolean) as string[];

  const culturas = [...new Set(silosData.map((s) => s.cultura_ensilada).filter(Boolean))] as string[];
  const silosCulturasEnsiladas = culturas.length > 0 ? culturas.slice(0, 3).join(', ') : '—';

  const silosComAbertura = silosData
    .filter((s) => s.data_abertura_real)
    .sort((a, b) => new Date(b.data_abertura_real!).getTime() - new Date(a.data_abertura_real!).getTime());
  const silosUltimaAbertura =
    silosComAbertura.length > 0
      ? new Date(silosComAbertura[0].data_abertura_real!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : '—';
  const silosUltimaAberturaDetalhe =
    silosComAbertura.length > 0 ? silosComAbertura[0].nome : 'Nenhuma abertura registrada';

  const movsRecentes = movsRecentesRes.data ?? [];
  const saidasConsumo = movsRecentes.filter((m) => m.tipo === 'Saída' && m.subtipo !== 'Descarte');
  const totalConsumo30dias = saidasConsumo.reduce((acc, m) => acc + (m.quantidade ?? 0), 0);
  const consumoDiario = totalConsumo30dias / 30;
  const silosConsumoDiario =
    consumoDiario > 0
      ? `${consumoDiario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg/dia`
      : '—';

  const totalEstoqueAtual = silosData.reduce((acc, s) => acc + Math.max(s.estoque_atual ?? 0, 0), 0);
  const autonomiaDias = consumoDiario > 0 ? Math.round((totalEstoqueAtual * 1000) / consumoDiario) : null;
  const silosAutonomiaDias = autonomiaDias !== null ? `${autonomiaDias} dias` : '—';

  const saidasDescarte = movsRecentes.filter((m) => m.tipo === 'Saída' && m.subtipo === 'Descarte');
  const totalDescarte = saidasDescarte.reduce((acc, m) => acc + (m.quantidade ?? 0), 0);
  const totalSaidas = movsRecentes.filter((m) => m.tipo === 'Saída').reduce((acc, m) => acc + (m.quantidade ?? 0), 0);
  const silosTaxaPerdas = totalSaidas > 0 ? ((totalDescarte / totalSaidas) * 100).toFixed(1) + '%' : '—';

  const contagemCulturas: Record<string, number> = {};
  for (const silo of silosData) {
    const cultura = silo.cultura_ensilada ?? 'Desconhecida';
    contagemCulturas[cultura] = (contagemCulturas[cultura] ?? 0) + 1;
  }
  const totalSilosComCultura = Object.values(contagemCulturas).reduce((a, b) => a + b, 0);
  const culturasEnsiladas = Object.entries(contagemCulturas).map(([name, value]) => ({
    name,
    value,
    pct: totalSilosComCultura > 0 ? Math.round((value / totalSilosComCultura) * 100) : 0,
  }));

  // --- Lavouras ---
  const talhoesData = talhoesRes.data ?? [];
  const talhaoAreaTotal =
    talhoesData.length > 0
      ? `${talhoesData.reduce((acc, t) => acc + (t.area_ha ?? 0), 0).toLocaleString('pt-BR')} ha`
      : '—';
  const talhaoTotalCadastrados = talhoesData.length > 0 ? talhoesData.length.toString() : '—';

  const ciclosData = ciclosRes.data ?? [];
  const contagemCult: Record<string, number> = {};
  for (const c of ciclosData) {
    const cult = (c.cultura as string | null) ?? 'Sem cultura';
    contagemCult[cult] = (contagemCult[cult] ?? 0) + 1;
  }
  const culturasAtivas = Object.entries(contagemCult).map(([name, value]) => ({ name, value }));

  // --- Financeiro ---
  const finData = finRes.data ?? [];
  const receitaMes =
    finData.length > 0
      ? formatBRL(finData.filter((l) => l.tipo === 'Receita').reduce((acc, l) => acc + l.valor, 0))
      : '—';
  const despesaMes =
    finData.length > 0
      ? formatBRL(finData.filter((l) => l.tipo === 'Despesa').reduce((acc, l) => acc + l.valor, 0))
      : '—';

  // --- Frota ---
  const totalMaquinas = maquinasRes.count ?? 0;
  const manutencoesCount = manutRes.count ?? 0;
  const maquinasTotal = totalMaquinas > 0 ? `${totalMaquinas}` : '—';
  const maquinasDetalhe =
    totalMaquinas > 0
      ? manutencoesCount > 0
        ? `${manutencoesCount} manutenção(ões) pendente(s)`
        : 'Sem manutenções pendentes'
      : '—';

  // --- Rebanho ---
  const animaisCategData = animaisCategRes.data ?? [];
  const contagemCat: Record<string, number> = {};
  for (const a of animaisCategData) {
    const cat = (a.categoria as string | null) ?? 'Sem categoria';
    contagemCat[cat] = (contagemCat[cat] ?? 0) + 1;
  }
  const categoriasRebanho = Object.entries(contagemCat).map(([name, value]) => ({ name, value }));
  const totalAnimais = animaisCategData.length;

  const animaisTipoData = animaisTipoRes.data ?? [];
  const contagemTipo: Record<string, number> = {};
  for (const a of animaisTipoData) {
    const tipo = (a.tipo_rebanho as string | null) ?? 'desconhecido';
    contagemTipo[tipo] = (contagemTipo[tipo] ?? 0) + 1;
  }
  const totalTipo = Object.values(contagemTipo).reduce((s, v) => s + v, 0);
  const composicaoRebanho = Object.entries(contagemTipo).map(([name, value]) => ({
    name,
    value,
    pct: Math.round((value / totalTipo) * 100),
  }));

  const lotesData = lotesRes.data ?? [];
  const contagemPorLote: Record<string, number> = {};
  for (const a of animaisPorLoteRes.data ?? []) {
    if (a.lote_id) contagemPorLote[a.lote_id] = (contagemPorLote[a.lote_id] ?? 0) + 1;
  }
  const lotesAtivos = lotesData.map((l) => ({
    id: l.id,
    nome: l.nome,
    quantidade_animais: contagemPorLote[l.id] ?? 0,
  }));

  // --- Próximas Operações ---
  const eventosRaw = (eventosOperacoesRes.data ?? []) as any[];
  const operacoesFiltradas = eventosRaw.filter((evt) => evt.talhoes?.fazenda_id === fazendaId);
  const proximasOperacoes: ProximaOperacaoComBadge[] = operacoesFiltradas
    .map((evento) => {
      const cicloCorrespondente = ciclosData.find(
        (c) =>
          c.data_colheita_prevista === evento.data_esperada &&
          (c.cultura as string).includes('Silagem')
      );
      let janelaColheita: { ativo: boolean; diasRestantes: number } | undefined;
      if (cicloCorrespondente) {
        const alerta = verificarAlertaSilagem(cicloCorrespondente as CicloAgricola);
        if (alerta?.ativo && (evento.tipo_operacao as string).toLowerCase().includes('colheita')) {
          janelaColheita = alerta;
        }
      }
      return {
        id: evento.id,
        data_esperada: evento.data_esperada,
        data_realizada: evento.data_realizada,
        tipo_operacao: evento.tipo_operacao,
        status: evento.status,
        cultura: evento.cultura,
        talhao_nome: evento.talhoes?.nome || 'N/A',
        janelaColheita,
      };
    })
    .slice(0, 10);

  const rawUserName =
    user.user_metadata?.nome?.split(' ')[0] ||
    user.user_metadata?.full_name?.split(' ')[0] ||
    'Produtor';
  const userName = rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1).toLowerCase();

  const data: DashboardData = {
    silosOcupacaoPct,
    silosDetalhe,
    silosTotalCadastrados,
    silosAutonomiaDias,
    silosConsumoDiario,
    silosAbertos,
    silosAbertosDetalhe,
    silosTaxaPerdas,
    silosCulturasEnsiladas,
    silosUltimaAbertura,
    silosUltimaAberturaDetalhe,
    silosOcupacaoPctNum,
    silosGaugeDetalhe,
    silosAbertosNomes,
    culturasEnsiladas,
    talhaoAreaTotal,
    talhaoTotalCadastrados,
    culturasAtivas,
    receitaMes,
    despesaMes,
    maquinasTotal,
    maquinasDetalhe,
    totalAnimais,
    categoriasRebanho,
    composicaoRebanho,
    lotesAtivos,
    proximasOperacoes,
  };

  return <DashboardClient data={data} userName={userName} />;
}
