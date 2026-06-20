import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parsePlanoSlug } from '@/lib/planos';
import { verificarAlertaSilagem, verificarAlertaColheita } from '@/app/dashboard/talhoes/helpers';
import type { CicloAgricola, ProximaOperacao } from '@/lib/types/talhoes';
import { DashboardClient } from './DashboardClient';
import type { DashboardData, AlertaCritico, ProximaOperacaoComBadge } from './dashboard-data';
import { daysBetween, formatarDataBR, derivarAlertasEtapa1, derivarAlertasPastagens, derivarAlertasSilosAbertos } from './alertas-helpers';
import { getAtividadesRecentes } from '@/lib/supabase/calendario';
import { formatBRL } from '@/lib/utils';

type InsumoAlertaRow = {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
};

type ManutencaoAlertaRow = {
  id: string;
  proxima_manutencao: string;
  status: string;
  maquinas: { nome: string } | null;
};

type ProdutoAlertaRow = {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
};

type VacinacaoAlertaRow = {
  id: string;
  animal_id: string;
  vacina_nome: string | null;
  data_proxima_dose: string;
  animais: { brinco: string | null; nome: string | null } | null;
};


export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profileFazenda } = await supabase
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();
  if (!profileFazenda?.fazenda_id) redirect('/dashboard/onboarding');
  const fazendaId = profileFazenda!.fazenda_id!;

  const { data: fazendaData } = await supabase
    .from('fazendas')
    .select('plano_atual')
    .eq('id', fazendaId)
    .single();
  const planoAtual = parsePlanoSlug(fazendaData?.plano_atual);

  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const mesAnteriorInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const mesAnteriorFim = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const hoje = now.toISOString().split('T')[0];
  const proximosDias = new Date(now);
  proximosDias.setDate(now.getDate() + 5);
  const proximosDiasStr = proximosDias.toISOString().split('T')[0];
  const doisDiasAtras = new Date(now);
  doisDiasAtras.setDate(now.getDate() - 2);
  const doisDiasAtrasStr = doisDiasAtras.toISOString().split('T')[0];
  const proximosSete = new Date(now);
  proximosSete.setDate(now.getDate() + 7);
  const proximosSeteStr = proximosSete.toISOString().split('T')[0];
  const proximosQuinze = new Date(now);
  proximosQuinze.setDate(now.getDate() + 15);
  const proximosQuinzeStr = proximosQuinze.toISOString().split('T')[0];

  const [
    silosRes,
    talhoesRes,
    maquinasRes,
    manutRes,
    finRes,
    movsRecentesRes,
    todasMovsSilosRes,
    animaisCategRes,
    ciclosRes,
    animaisTipoRes,
    lotesRes,
    animaisPorLoteRes,
    eventosOperacoesRes,
    insumosAlertaRes,
    manutencoesAlertaRes,
    vacinacoesAlertaRes,
    produtosAlertaRes,
    piquetesAlertaRes,
    atividadesRecentesRes,
    finAcumuladoRes,
    finMesAnteriorRes,
  ] = await Promise.all([
    supabase
      .from('silos')
      .select('id, nome, volume_ensilado_ton_mv, cultura_ensilada, data_abertura_real')
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
      .from('movimentacoes_silo')
      .select('silo_id, tipo, quantidade')
      .eq('fazenda_id', fazendaId),
    supabase
      .from('animais')
      .select('categoria')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null),
    supabase
      .from('ciclos_agricolas')
      .select('id, cultura, data_plantio, data_colheita_prevista, data_colheita_real, talhao_id, talhoes(id, nome, fazenda_id)')
      .eq('ativo', true),
    supabase
      .from('animais')
      .select('tipo_rebanho')
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null),
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
      .is('deleted_at', null)
      .not('lote_id', 'is', null),
    supabase
      .from('eventos_dap')
      .select('id, data_esperada, data_realizada, tipo_operacao, status, cultura, talhoes(id, nome, fazenda_id)')
      .gte('data_esperada', doisDiasAtrasStr)
      .lte('data_esperada', proximosDiasStr)
      .order('data_esperada', { ascending: true }),
    supabase.rpc('get_insumos_abaixo_minimo', { p_fazenda_id: fazendaId }),
    supabase
      .from('manutencoes')
      .select('id, proxima_manutencao, status, maquinas(nome)')
      .eq('fazenda_id', fazendaId)
      .neq('status', 'concluida')
      .lte('proxima_manutencao', proximosSeteStr)
      .order('proxima_manutencao', { ascending: true })
      .limit(5),
    supabase
      .from('eventos_sanitarios')
      .select('id, animal_id, vacina_nome, data_proxima_dose, animais(brinco, nome)')
      .eq('tipo', 'vacinacao')
      .is('deleted_at', null)
      .lte('data_proxima_dose', proximosQuinzeStr)
      .order('data_proxima_dose', { ascending: true })
      .limit(10),
    supabase
      .from('produtos')
      .select('id, nome, unidade, estoque_atual, estoque_minimo')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .gt('estoque_minimo', 0),
    supabase
      .from('piquetes')
      .select(`
        id, nome, status, necessita_reforma, ua_suportada, dias_descanso_ideal, updated_at,
        pastagens!inner(id, nome, ativo, area_total_ha),
        ocupacoes_piquete(ua_real, data_entrada, data_saida_prevista, data_saida_real)
      `)
      .eq('pastagens.ativo', true)
      .eq('fazenda_id', fazendaId),
    getAtividadesRecentes(supabase),
    supabase
      .from('financeiro')
      .select('tipo, valor')
      .eq('fazenda_id', fazendaId)
      .lt('data', mesInicio),
    supabase
      .from('financeiro')
      .select('tipo, valor')
      .eq('fazenda_id', fazendaId)
      .gte('data', mesAnteriorInicio)
      .lte('data', mesAnteriorFim),
  ]);

  // --- Silagem ---
  const silosData = silosRes.data ?? [];
  const todasMovsSilos = todasMovsSilosRes.data ?? [];

  // Calcula estoque real por silo somando entradas − saídas (silos.estoque_atual não tem trigger)
  const estoquePorSilo: Record<string, number> = {};
  for (const mov of todasMovsSilos) {
    const atual = estoquePorSilo[mov.silo_id] ?? 0;
    estoquePorSilo[mov.silo_id] = mov.tipo === 'Entrada' ? atual + (mov.quantidade ?? 0) : atual - (mov.quantidade ?? 0);
  }

  let silosOcupacaoPct = '—';
  let silosDetalhe = '—';
  let silosOcupacaoPctNum = 0;
  let silosGaugeDetalhe = '';

  if (silosData.length > 0) {
    const totalVolume = silosData.reduce((acc, s) => acc + (s.volume_ensilado_ton_mv ?? 0), 0);
    const totalEstoque = silosData.reduce((acc, s) => acc + Math.max(estoquePorSilo[s.id] ?? 0, 0), 0);
    const ocupPct = totalVolume > 0 ? Math.round((totalEstoque / totalVolume) * 100) : 0;
    silosOcupacaoPct = `${ocupPct}%`;
    silosDetalhe = `${totalEstoque.toLocaleString('pt-BR')} / ${totalVolume.toLocaleString('pt-BR')} ton`;
    silosOcupacaoPctNum = ocupPct;
    silosGaugeDetalhe = silosDetalhe;
  }

  const silosTotalCadastrados = silosData.length > 0 ? silosData.length.toString() : '—';

  const silosAbertosData = silosData.filter((s) => s.data_abertura_real && (estoquePorSilo[s.id] ?? 0) > 0);
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
  const consumoDiarioKg = (totalConsumo30dias * 1000) / 30;
  const silosConsumoDiario =
    consumoDiarioKg > 0
      ? `${consumoDiarioKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg/dia`
      : '—';

  // Série diária de consumo dos últimos 30 dias (kg/dia) para sparkline
  const consumoPorDia = new Map<string, number>();
  for (const m of saidasConsumo) {
    if (!m.data) continue;
    const dia = m.data.slice(0, 10);
    consumoPorDia.set(dia, (consumoPorDia.get(dia) ?? 0) + (m.quantidade ?? 0) * 1000);
  }
  const consumoSparkline: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    consumoSparkline.push(Math.round(consumoPorDia.get(d) ?? 0));
  }

  const totalEstoqueAtual = silosData.reduce((acc, s) => acc + Math.max(estoquePorSilo[s.id] ?? 0, 0), 0);
  const autonomiaDias = consumoDiarioKg > 0 ? Math.round((totalEstoqueAtual * 1000) / consumoDiarioKg) : null;
  const silosAutonomiaDias =
    autonomiaDias === null ? '—' : autonomiaDias > 365 ? 'Mais de 1 ano' : `${autonomiaDias} dias`;

  const saidasDescarte = movsRecentes.filter((m) => m.tipo === 'Saída' && m.subtipo === 'Descarte');
  const totalDescarte = saidasDescarte.reduce((acc, m) => acc + (m.quantidade ?? 0), 0);
  const totalSaidas = movsRecentes.filter((m) => m.tipo === 'Saída').reduce((acc, m) => acc + (m.quantidade ?? 0), 0);
  const silosTaxaPerdas = totalSaidas > 0 ? ((totalDescarte / totalSaidas) * 100).toFixed(1) + '%' : '—';

  const volumePorCultura: Record<string, number> = {};
  for (const silo of silosData) {
    const cultura = silo.cultura_ensilada ?? 'Desconhecida';
    const estoque = Math.max(estoquePorSilo[silo.id] ?? 0, 0);
    volumePorCultura[cultura] = (volumePorCultura[cultura] ?? 0) + estoque;
  }
  const totalVolumeComCultura = Object.values(volumePorCultura).reduce((a, b) => a + b, 0);
  const culturasEnsiladas = Object.entries(volumePorCultura).map(([name, value]) => ({
    name,
    value,
    pct: totalVolumeComCultura > 0 ? Math.round((value / totalVolumeComCultura) * 100) : 0,
  }));

  // --- Lavouras ---
  const talhoesData = talhoesRes.data ?? [];
  const talhaoAreaTotal =
    talhoesData.length > 0
      ? `${talhoesData.reduce((acc, t) => acc + (t.area_ha ?? 0), 0).toLocaleString('pt-BR')} ha`
      : '—';
  const talhaoTotalCadastrados = talhoesData.length > 0 ? talhoesData.length.toString() : '—';

  type CicloAtivoRow = {
    id: string;
    cultura: string | null;
    data_plantio: string | null;
    data_colheita_prevista: string | null;
    data_colheita_real: string | null;
    talhao_id: string | null;
    talhoes: { id: string; nome: string; fazenda_id: string } | null;
  };
  // O join do Supabase infere `talhoes` como array, mas a relação é many-to-one
  const ciclosData = ((ciclosRes.data ?? []) as unknown as (Omit<CicloAtivoRow, 'talhoes'> & {
    talhoes: { id: string; nome: string; fazenda_id: string }[] | { id: string; nome: string; fazenda_id: string } | null;
  })[]).map((c) => ({
    ...c,
    talhoes: Array.isArray(c.talhoes) ? (c.talhoes[0] ?? null) : c.talhoes,
  })) satisfies CicloAtivoRow[];

  const contagemCult: Record<string, number> = {};
  for (const c of ciclosData) {
    const cult = c.cultura ?? 'Sem cultura';
    contagemCult[cult] = (contagemCult[cult] ?? 0) + 1;
  }
  const culturasAtivas = Object.entries(contagemCult).map(([name, value]) => ({ name, value }));

  // --- Financeiro ---
  const finData = finRes.data ?? [];
  const receitaMesNum = finData.filter((l) => l.tipo === 'Receita').reduce((acc, l) => acc + l.valor, 0);
  const despesaMesNum = finData.filter((l) => l.tipo === 'Despesa').reduce((acc, l) => acc + l.valor, 0);
  const receitaMes = formatBRL(receitaMesNum);
  const despesaMes = formatBRL(despesaMesNum);

  const finAcumulado = finAcumuladoRes.data ?? [];
  const receitaAcumulada = finAcumulado.filter((l) => l.tipo === 'Receita').reduce((acc, l) => acc + l.valor, 0);
  const despesaAcumulada = finAcumulado.filter((l) => l.tipo === 'Despesa').reduce((acc, l) => acc + l.valor, 0);
  const saldoAcumuladoNum = receitaAcumulada - despesaAcumulada;

  // Variação percentual vs mês anterior (null quando não há base de comparação)
  const finMesAnterior = finMesAnteriorRes.data ?? [];
  const receitaMesAnteriorNum = finMesAnterior.filter((l) => l.tipo === 'Receita').reduce((acc, l) => acc + l.valor, 0);
  const despesaMesAnteriorNum = finMesAnterior.filter((l) => l.tipo === 'Despesa').reduce((acc, l) => acc + l.valor, 0);
  const variacao = (atual: number, anterior: number): number | null =>
    anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : null;
  const receitaVariacaoPct = variacao(receitaMesNum, receitaMesAnteriorNum);
  const despesaVariacaoPct = variacao(despesaMesNum, despesaMesAnteriorNum);

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
  type EventoDapRow = { id: string; data_esperada: string | null; data_realizada: string | null; tipo_operacao: string | null; status: string | null; cultura: string | null; talhoes: { id: string; nome: string; fazenda_id: string } | null };
  const eventosRaw = (eventosOperacoesRes.data ?? []) as unknown as EventoDapRow[];
  const operacoesFiltradas = eventosRaw.filter((evt) => evt.talhoes?.fazenda_id === fazendaId);
  const proximasOperacoes: ProximaOperacaoComBadge[] = operacoesFiltradas
    .map((evento) => {
      const cicloCorrespondente = ciclosData.find(
        (c) =>
          c.data_colheita_prevista === evento.data_esperada &&
          (c.cultura ?? '').includes('Silagem')
      );
      let janelaColheita: { ativo: boolean; diasRestantes: number } | undefined;
      if (cicloCorrespondente) {
        const alerta = verificarAlertaSilagem({
          cultura: cicloCorrespondente.cultura ?? '',
          data_colheita_prevista: cicloCorrespondente.data_colheita_prevista ?? '',
          data_colheita_real: cicloCorrespondente.data_colheita_real,
        } as CicloAgricola);
        if (alerta?.ativo && (evento.tipo_operacao as string).toLowerCase().includes('colheita')) {
          janelaColheita = alerta;
        }
      }
      return {
        id: evento.id,
        data_esperada: evento.data_esperada ?? '',
        data_realizada: evento.data_realizada,
        tipo_operacao: evento.tipo_operacao ?? '',
        status: (evento.status ?? 'Planejado') as ProximaOperacao['status'],
        cultura: evento.cultura ?? '',
        talhao_nome: evento.talhoes?.nome || 'N/A',
        janelaColheita,
      };
    })
    .slice(0, 10);

  // Campos numéricos brutos para alertas
  const silosAutonomiaDiasNum = autonomiaDias;
  const silosTaxaPerdasNum = totalSaidas > 0 ? (totalDescarte / totalSaidas) * 100 : null;
  const manutencoesPendentesCount = manutRes.count ?? 0;

  // Etapa 1 — alertas derivados de dados já disponíveis
  const alertasEtapa1 = derivarAlertasEtapa1({
    proximasOperacoes,
    autonomiaDiasNum: silosAutonomiaDiasNum,
    taxaPerdasNum: silosTaxaPerdasNum,
  });

  // Etapa 2 — alertas de insumos
  const insumosAbaixoMinimo = (insumosAlertaRes.data ?? []) as InsumoAlertaRow[];
  const alertasInsumos: AlertaCritico[] = insumosAbaixoMinimo.map((i) => ({
    id: `insumo_${i.id}`,
    tipo: i.estoque_atual === 0 ? ('insumo_critico' as const) : ('insumo_urgente' as const),
    severidade: i.estoque_atual === 0 ? ('critico' as const) : ('urgente' as const),
    mensagem: `${i.nome} — Estoque ${i.estoque_atual === 0 ? 'esgotado' : 'abaixo do mínimo'}`,
    detalhe: `${i.estoque_atual} ${i.unidade} (mín: ${i.estoque_minimo} ${i.unidade})`,
    href: '/dashboard/insumos',
  }));

  // Etapa 2 — alertas de manutenções refinadas
  const manutencoesVencidas = (manutencoesAlertaRes.data ?? []) as unknown as ManutencaoAlertaRow[];
  const alertasManutencao: AlertaCritico[] = manutencoesVencidas.map((m) => {
    const vencida = m.proxima_manutencao <= hoje;
    const nomeMaquina = (m.maquinas as { nome: string } | null)?.nome ?? 'Máquina sem nome';
    const diasRestantes = daysBetween(hoje, m.proxima_manutencao);
    return {
      id: `manutencao_${m.id}`,
      tipo: vencida ? ('manutencao_vencida' as const) : ('manutencao_urgente' as const),
      severidade: vencida ? ('critico' as const) : ('urgente' as const),
      mensagem: vencida
        ? `Manutenção vencida — ${nomeMaquina}`
        : `Manutenção em ${diasRestantes} dia(s) — ${nomeMaquina}`,
      detalhe: `Prevista para ${formatarDataBR(m.proxima_manutencao)}`,
      href: '/dashboard/frota',
    };
  });

  // Etapa 2 — alertas de vacinações
  const vacinacoesVencendo = (vacinacoesAlertaRes.data ?? []) as unknown as VacinacaoAlertaRow[];
  const alertasVacinacao: AlertaCritico[] = vacinacoesVencendo.map((v) => {
    const dias = daysBetween(hoje, v.data_proxima_dose);
    const vencida = dias < 0;
    const nomeAnimal = v.animais?.nome ?? v.animais?.brinco ?? 'Animal sem identificação';
    return {
      id: `vacinacao_${v.id}`,
      tipo: vencida ? ('vacinacao_vencida' as const) : ('vacinacao_urgente' as const),
      severidade: vencida ? ('critico' as const) : ('urgente' as const),
      mensagem: vencida
        ? `Vacinação vencida há ${Math.abs(dias)} dia(s) — ${nomeAnimal}`
        : `Vacinação em ${dias} dia(s) — ${nomeAnimal}`,
      detalhe: v.vacina_nome ?? 'Vacina não especificada',
      href: '/dashboard/rebanho/sanidade',
    };
  });

  // Etapa 2 — alertas de produtos
  const produtosAbaixoMinimo = ((produtosAlertaRes.data ?? []) as ProdutoAlertaRow[])
    .filter((p) => p.estoque_atual < p.estoque_minimo);
  const alertasProdutos: AlertaCritico[] = produtosAbaixoMinimo.map((p) => ({
    id: `produto_${p.id}`,
    tipo: 'produto_urgente' as const,
    severidade: 'urgente' as const,
    mensagem: `${p.nome} — Estoque abaixo do mínimo`,
    detalhe: `${p.estoque_atual} ${p.unidade} (mín: ${p.estoque_minimo} ${p.unidade})`,
    href: '/dashboard/produtos',
  }));

  // Etapa 2 — alertas de colheita pendente/atrasada (ciclo ativo sem colheita registrada)
  const alertasColheita: AlertaCritico[] = ciclosData
    .filter((c) => c.talhoes?.fazenda_id === fazendaId && c.data_colheita_prevista)
    .flatMap((c) => {
      const alerta = verificarAlertaColheita({
        data_colheita_prevista: c.data_colheita_prevista ?? '',
        data_colheita_real: c.data_colheita_real,
      } as CicloAgricola);
      if (!alerta) return [];
      const cultura = c.cultura ?? 'Cultura';
      const talhaoNome = c.talhoes?.nome ?? 'Talhão';
      const href = c.talhao_id ? `/dashboard/talhoes/${c.talhao_id}` : '/dashboard/talhoes';
      const alertaCritico: AlertaCritico = {
        id: `colheita_pendente_${c.id}`,
        tipo: 'colheita_pendente',
        severidade: alerta.severidade,
        mensagem: alerta.atrasado
          ? `Colheita atrasada — ${cultura} (${talhaoNome})`
          : alerta.diasRestantes === 0
            ? `Colheita hoje — ${cultura} (${talhaoNome})`
            : `Colheita em ${alerta.diasRestantes} dia(s) — ${cultura} (${talhaoNome})`,
        detalhe: alerta.atrasado
          ? `Prevista para ${formatarDataBR(c.data_colheita_prevista!)} — ainda não registrada`
          : `Prevista para ${formatarDataBR(c.data_colheita_prevista!)}`,
        href,
      };
      return [alertaCritico];
    });

  // --- Pastagens: área e count derivados do join ---
  type PiqueteComPastagem = {
    pastagens: { id: string; area_total_ha: number } | null;
  };
  const rawPiquetes = (piquetesAlertaRes.data ?? []) as unknown as PiqueteComPastagem[];
  const pastagensMap = new Map<string, number>();
  for (const p of rawPiquetes) {
    if (p.pastagens) pastagensMap.set(p.pastagens.id, p.pastagens.area_total_ha);
  }
  const pastagensCount = pastagensMap.size;
  const pastagensAreaTotalHa = Array.from(pastagensMap.values()).reduce((acc, v) => acc + v, 0);

  // Etapa 2 — alertas de pastagens + KPIs de pastagens
  const piquetesParaAlertas = (piquetesAlertaRes.data ?? []) as unknown as Parameters<typeof derivarAlertasPastagens>[0];
  const alertasPastagens = derivarAlertasPastagens(piquetesParaAlertas);

  const totalPiquetes = piquetesParaAlertas.length;
  const piquetesEmPastejo = piquetesParaAlertas.filter((p) => p.status === 'Em pastejo').length;
  const piquetesEmReforma = piquetesParaAlertas.filter((p) => p.status === 'Em reforma').length;
  const piquetesProntosEntrada = piquetesParaAlertas.filter((p) => {
    if (p.status !== 'Descanso' || p.dias_descanso_ideal === null) return false;
    const ocupacoes = (p.ocupacoes_piquete ?? []) as { data_saida_real: string | null }[];
    const ultimaSaida = ocupacoes
      .filter((o) => o.data_saida_real !== null)
      .sort((a, b) => (b.data_saida_real! > a.data_saida_real! ? 1 : -1))[0]?.data_saida_real ?? null;
    if (!ultimaSaida) return false;
    const dias = Math.floor((new Date(hoje).getTime() - new Date(ultimaSaida).getTime()) / (1000 * 60 * 60 * 24));
    return dias >= p.dias_descanso_ideal;
  }).length;

  // Etapa 2 — alertas de silos abertos sem consumo há 3+ dias
  const silosAbertosParaAlerta = silosData
    .filter((s) => s.data_abertura_real)
    .map((s) => ({ id: s.id, nome: s.nome, data_abertura_real: s.data_abertura_real }));
  const movsParaAlerta = (movsRecentesRes.data ?? []).map((m) => ({
    silo_id: m.silo_id,
    tipo: m.tipo,
    data: m.data,
  }));
  const alertasSilosAbertos = derivarAlertasSilosAbertos(silosAbertosParaAlerta, movsParaAlerta);

  const alertas: AlertaCritico[] = [
    ...alertasEtapa1,
    ...alertasColheita,
    ...alertasInsumos,
    ...alertasManutencao,
    ...alertasVacinacao,
    ...alertasProdutos,
    ...alertasPastagens,
    ...alertasSilosAbertos,
  ];

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
    receitaMesNum,
    despesaMesNum,
    receitaVariacaoPct,
    despesaVariacaoPct,
    saldoAcumuladoNum,
    consumoSparkline,
    maquinasTotal,
    maquinasDetalhe,
    totalAnimais,
    categoriasRebanho,
    composicaoRebanho,
    lotesAtivos,
    proximasOperacoes,
    totalPiquetes,
    piquetesEmPastejo,
    piquetesProntosEntrada,
    piquetesEmReforma,
    pastagensAreaTotalHa,
    pastagensCount,
    silosAutonomiaDiasNum,
    silosTaxaPerdasNum,
    manutencoesPendentesCount,
    alertas,
    atividadesRecentes: atividadesRecentesRes,
    planoAtual,
  };

  return <DashboardClient data={data} userName={userName} />;
}
