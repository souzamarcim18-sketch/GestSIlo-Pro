'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Map,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  PackageOpen,
  Wheat,
  CalendarCheck,
  PawPrint,
  Grid3X3,
  Sprout,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getProximasOperacoes } from '@/lib/supabase/talhoes';
import type { ProximaOperacao, CicloAgricola } from '@/lib/types/talhoes';
import { verificarAlertaSilagem } from '@/app/dashboard/talhoes/helpers';

interface DashboardStats {
  // Silagem
  silosOcupacaoPct: string;
  silosDetalhe: string;
  silosTotalCadastrados: string;
  silosAutonomiaDias: string;
  silosConsumoDiario: string;
  silosAbertos: string;
  silosAbertosDetalhe: string;
  silosTaxaPerdas: string;
  silosCulturasEnsiladas: string;
  silosUltimaAbertura: string;
  silosUltimaAberturaDetalhe: string;
  // Lavouras
  talhaoAreaTotal: string;
  talhaoTotalCadastrados: string;
  // Financeiro
  receitaMes: string;
  despesaMes: string;
  // Frota
  maquinasTotal: string;
  maquinasDetalhe: string;
}

const statsInicial: DashboardStats = {
  silosOcupacaoPct: '—', silosDetalhe: '—',
  silosTotalCadastrados: '—', silosAutonomiaDias: '—',
  silosConsumoDiario: '—', silosAbertos: '—',
  silosAbertosDetalhe: '—', silosTaxaPerdas: '—',
  silosCulturasEnsiladas: '—', silosUltimaAbertura: '—',
  silosUltimaAberturaDetalhe: '—', talhaoAreaTotal: '—',
  talhaoTotalCadastrados: '—', receitaMes: '—',
  despesaMes: '—', maquinasTotal: '—', maquinasDetalhe: '—',
};

interface ProximaOperacaoComBadge extends ProximaOperacao {
  janelaColheita?: { ativo: boolean; diasRestantes: number };
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[0.6rem] font-bold uppercase tracking-[0.18em] mb-3"
      style={{ color: '#2a4433' }}
    >
      {children}
    </p>
  );
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  href,
  loading,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  href: string;
  loading: boolean;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="text-left group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c45a] focus-visible:ring-offset-2 rounded-[13px]"
    >
      <Card className="rounded-[13px] p-5 h-full transition-all duration-300 group-hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="uppercase tracking-[0.13em] font-bold text-[0.475rem] text-[#688070]">
              {title}
            </p>
            {loading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-black tracking-tight text-[#dceede] truncate">
                  {value}
                </p>
                <p className="text-xs text-[#688070] truncate">{detail}</p>
              </>
            )}
          </div>
          <div
            className="shrink-0 p-2.5 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Icon className="h-4 w-4 text-[#00c45a]" />
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function DashboardPage() {
  const { fazendaId, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [proximasOperacoes, setProximasOperacoes] = useState<ProximaOperacaoComBadge[]>([]);
  const [loadingOperacoes, setLoadingOperacoes] = useState(true);

  const hour = new Date().getHours();
  const greeting =
    hour >= 12 && hour < 18
      ? 'Boa tarde'
      : hour >= 18 || hour < 5
        ? 'Boa noite'
        : 'Bom dia';

  const userName =
    user?.user_metadata?.nome?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    'Produtor';

  useEffect(() => {
    if (authLoading) return;
    const init = async () => {
      setLoading(true);
      try {
        if (!fazendaId) {
          setStats(statsInicial);
          return;
        }

        const now = new Date();
        const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];
        const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        const [silosRes, talhoesRes, maquinasRes, manutRes, finRes, movsRecentesRes] =
          await Promise.all([
            supabase
              .from('silos')
              .select('id, nome, volume_ensilado_ton_mv, cultura_ensilada, data_abertura_real, estoque_atual')
              .eq('fazenda_id', fazendaId),
            supabase
              .from('talhoes')
              .select('area_ha')
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
          ]);

        const silosData = silosRes.data ?? [];

        // Ocupação dos silos (via movimentações de todos os silos da fazenda)
        let silosOcupacaoPct = '—';
        let silosDetalhe = '—';
        if (silosData.length > 0) {
          const totalVolume = silosData.reduce(
            (acc, s) => acc + (s.volume_ensilado_ton_mv ?? 0),
            0
          );
          const siloIds = silosData.map((s) => s.id);
          const allMovsRes = siloIds.length > 0
            ? await supabase
                .from('movimentacoes_silo')
                .select('silo_id, tipo, quantidade')
                .in('silo_id', siloIds)
            : { data: [] };

          const allMovs = allMovsRes.data ?? [];
          const estoquePorSilo: Record<string, number> = {};
          for (const mov of allMovs) {
            if (!estoquePorSilo[mov.silo_id]) estoquePorSilo[mov.silo_id] = 0;
            estoquePorSilo[mov.silo_id] += mov.tipo === 'Entrada' ? mov.quantidade : -mov.quantidade;
          }
          const totalEstoque = Object.values(estoquePorSilo).reduce(
            (acc, v) => acc + Math.max(v, 0),
            0
          );
          const ocupPct =
            totalVolume > 0 ? Math.round((totalEstoque / totalVolume) * 100) : 0;
          silosOcupacaoPct = `${ocupPct}%`;
          silosDetalhe = `${totalEstoque.toLocaleString('pt-BR')} / ${totalVolume.toLocaleString('pt-BR')} ton`;
        }

        // Total de silos cadastrados
        const silosTotalCadastrados =
          silosData.length > 0 ? silosData.length.toString() : '—';

        // Silos abertos
        const silosAbertosData = silosData.filter(
          (s) => s.data_abertura_real && (s.estoque_atual ?? 0) > 0
        );
        const silosAbertos =
          silosAbertosData.length > 0 ? silosAbertosData.length.toString() : '0';
        const silosAbertosDetalhe =
          silosAbertosData.length > 0
            ? silosAbertosData
                .map((s) => s.nome)
                .slice(0, 2)
                .join(', ') +
              (silosAbertosData.length > 2 ? ` +${silosAbertosData.length - 2}` : '')
            : 'Nenhum silo aberto';

        // Culturas ensiladas
        const culturas = [
          ...new Set(
            silosData.map((s) => s.cultura_ensilada).filter(Boolean)
          ),
        ] as string[];
        const silosCulturasEnsiladas =
          culturas.length > 0 ? culturas.slice(0, 3).join(', ') : '—';

        // Última abertura real
        const silosComAbertura = silosData
          .filter((s) => s.data_abertura_real)
          .sort(
            (a, b) =>
              new Date(b.data_abertura_real!).getTime() -
              new Date(a.data_abertura_real!).getTime()
          );
        const silosUltimaAbertura =
          silosComAbertura.length > 0
            ? new Date(silosComAbertura[0].data_abertura_real!).toLocaleDateString(
                'pt-BR',
                { day: '2-digit', month: '2-digit', year: '2-digit' }
              )
            : '—';
        const silosUltimaAberturaDetalhe =
          silosComAbertura.length > 0
            ? silosComAbertura[0].nome
            : 'Nenhuma abertura registrada';

        // Consumo médio diário (últimos 30 dias) — saídas exceto Descarte
        const movsRecentes = movsRecentesRes.data ?? [];
        const saidasConsumo = movsRecentes.filter(
          (m) => m.tipo === 'Saída' && m.subtipo !== 'Descarte'
        );
        const totalConsumo30dias = saidasConsumo.reduce(
          (acc, m) => acc + (m.quantidade ?? 0),
          0
        );
        const consumoDiario = totalConsumo30dias / 30;
        const silosConsumoDiario =
          consumoDiario > 0
            ? `${consumoDiario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg/dia`
            : '—';

        // Autonomia = estoque atual ÷ consumo diário
        const totalEstoqueAtual = silosData.reduce(
          (acc, s) => acc + Math.max(s.estoque_atual ?? 0, 0),
          0
        );
        const autonomiaDias =
          consumoDiario > 0
            ? Math.round((totalEstoqueAtual * 1000) / consumoDiario)
            : null;
        const silosAutonomiaDias =
          autonomiaDias !== null ? `${autonomiaDias} dias` : '—';

        // Taxa de perdas
        const saidasDescarte = movsRecentes.filter(
          (m) => m.tipo === 'Saída' && m.subtipo === 'Descarte'
        );
        const totalDescarte = saidasDescarte.reduce(
          (acc, m) => acc + (m.quantidade ?? 0),
          0
        );
        const totalSaidas = movsRecentes
          .filter((m) => m.tipo === 'Saída')
          .reduce((acc, m) => acc + (m.quantidade ?? 0), 0);
        const silosTaxaPerdas =
          totalSaidas > 0
            ? ((totalDescarte / totalSaidas) * 100).toFixed(1) + '%'
            : '—';

        // Lavouras
        const talhoesData = talhoesRes.data ?? [];
        const talhaoAreaTotal =
          talhoesData.length > 0
            ? `${talhoesData
                .reduce((acc, t) => acc + (t.area_ha ?? 0), 0)
                .toLocaleString('pt-BR')} ha`
            : '—';
        const talhaoTotalCadastrados =
          talhoesData.length > 0 ? talhoesData.length.toString() : '—';

        // Financeiro
        const finData = finRes.data ?? [];
        const receitaMes =
          finData.length > 0
            ? formatBRL(
                finData
                  .filter((l) => l.tipo === 'Receita')
                  .reduce((acc, l) => acc + l.valor, 0)
              )
            : '—';
        const despesaMes =
          finData.length > 0
            ? formatBRL(
                finData
                  .filter((l) => l.tipo === 'Despesa')
                  .reduce((acc, l) => acc + l.valor, 0)
              )
            : '—';

        // Frota
        const totalMaquinas = maquinasRes.count ?? 0;
        const manutencoesCount = manutRes.count ?? 0;
        const maquinasTotal = totalMaquinas > 0 ? `${totalMaquinas}` : '—';
        const maquinasDetalhe =
          totalMaquinas > 0
            ? manutencoesCount > 0
              ? `${manutencoesCount} manutenção(ões) pendente(s)`
              : 'Sem manutenções pendentes'
            : '—';

        setStats({
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
          talhaoAreaTotal,
          talhaoTotalCadastrados,
          receitaMes,
          despesaMes,
          maquinasTotal,
          maquinasDetalhe,
        });
      } catch {
        toast.error('Erro ao carregar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [authLoading, fazendaId]);

  useEffect(() => {
    if (!fazendaId) {
      setProximasOperacoes([]);
      setLoadingOperacoes(false);
      return;
    }

    const loadProximasOperacoes = async () => {
      setLoadingOperacoes(true);
      try {
        const operacoes = await getProximasOperacoes(fazendaId);

        const { data: ciclosData, error: ciclosError } = await supabase
          .from('ciclos_agricolas')
          .select('id, cultura, data_colheita_prevista, data_colheita_real')
          .eq('ativo', true);

        if (ciclosError) throw ciclosError;

        let alertaSilagemAtivo = false;
        const operacoesEnriquecidas: ProximaOperacaoComBadge[] = operacoes.map((op) => {
          const cicloCorrespondente = (ciclosData || []).find(
            (c: { id: string; cultura: string; data_colheita_prevista: string; data_colheita_real: string | null }) =>
              c.data_colheita_prevista === op.data_esperada &&
              c.cultura.includes('Silagem')
          );

          let janelaColheita: { ativo: boolean; diasRestantes: number } | undefined;
          if (cicloCorrespondente) {
            const alerta = verificarAlertaSilagem(cicloCorrespondente as CicloAgricola);
            if (alerta && alerta.ativo && op.tipo_operacao.toLowerCase().includes('colheita')) {
              janelaColheita = alerta;
              alertaSilagemAtivo = true;
            }
          }

          return { ...op, janelaColheita };
        });

        if (alertaSilagemAtivo && !sessionStorage.getItem('alerta_silagem_exibido')) {
          const proximoEvento = operacoesEnriquecidas.find((op) => op.janelaColheita?.ativo);
          if (proximoEvento && proximoEvento.janelaColheita) {
            toast.warning(
              `Atenção: janela de colheita de ${proximoEvento.cultura} no ${proximoEvento.talhao_nome} se aproxima em ${proximoEvento.janelaColheita.diasRestantes} dias`
            );
            sessionStorage.setItem('alerta_silagem_exibido', 'true');
          }
        }

        setProximasOperacoes(operacoesEnriquecidas.slice(0, 10));
      } catch (error) {
        console.error('Erro ao carregar próximas operações:', error);
        setProximasOperacoes([]);
      } finally {
        setLoadingOperacoes(false);
      }
    };

    loadProximasOperacoes();
  }, [fazendaId]);

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-muted/30">

      {/* Saudação */}
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-deep">
          {greeting}, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumo da sua propriedade
        </p>
      </div>

      {/* Silagem */}
      <section aria-label="Silagem">
        <SectionLabel>Silagem</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard title="OCUPAÇÃO DOS SILOS" value={stats?.silosOcupacaoPct ?? '—'} detail={stats?.silosDetalhe ?? '—'} icon={Database} href="/dashboard/silos" loading={loading} />
          <KpiCard title="AUTONOMIA ESTIMADA" value={stats?.silosAutonomiaDias ?? '—'} detail="Dias de estoque" icon={Clock} href="/dashboard/silos" loading={loading} />
          <KpiCard title="CONSUMO MÉDIO/DIA" value={stats?.silosConsumoDiario ?? '—'} detail="Últimos 30 dias" icon={TrendingUp} href="/dashboard/silos" loading={loading} />
          <KpiCard title="SILOS CADASTRADOS" value={stats?.silosTotalCadastrados ?? '—'} detail="Total cadastrado" icon={Database} href="/dashboard/silos" loading={loading} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="SILOS ABERTOS" value={stats?.silosAbertos ?? '—'} detail={stats?.silosAbertosDetalhe ?? '—'} icon={PackageOpen} href="/dashboard/silos" loading={loading} />
          <KpiCard title="TAXA DE PERDAS" value={stats?.silosTaxaPerdas ?? '—'} detail="Saídas por descarte" icon={AlertTriangle} href="/dashboard/silos" loading={loading} />
          <KpiCard title="CULTURAS ENSILADAS" value={stats?.silosCulturasEnsiladas ?? '—'} detail="Culturas nos silos" icon={Wheat} href="/dashboard/silos" loading={loading} />
          <KpiCard title="ÚLTIMA ABERTURA" value={stats?.silosUltimaAbertura ?? '—'} detail={stats?.silosUltimaAberturaDetalhe ?? '—'} icon={CalendarCheck} href="/dashboard/silos" loading={loading} />
        </div>
      </section>

      {/* Rebanho */}
      <section aria-label="Rebanho">
        <SectionLabel>Rebanho</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="TOTAL DE ANIMAIS" value="—" detail="Animais cadastrados" icon={PawPrint} href="/dashboard/rebanho" loading={loading} />
          <KpiCard title="LOTES ATIVOS" value="—" detail="Lotes cadastrados" icon={Grid3X3} href="/dashboard/rebanho" loading={loading} />
          <KpiCard title="PRÓXIMO EVENTO" value="—" detail="Pesagem ou DG" icon={Calendar} href="/dashboard/rebanho" loading={loading} />
          <KpiCard title="ALERTA REPRODUTIVO" value="—" detail="Eventos pendentes" icon={AlertTriangle} href="/dashboard/rebanho" loading={loading} />
        </div>
      </section>

      {/* Lavouras */}
      <section aria-label="Lavouras">
        <SectionLabel>Lavouras</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="ÁREA TOTAL" value={stats?.talhaoAreaTotal ?? '—'} detail="Área cadastrada" icon={Map} href="/dashboard/talhoes" loading={loading} />
          <KpiCard title="EM CULTIVO" value="—" detail="Área plantada" icon={Sprout} href="/dashboard/talhoes" loading={loading} />
          <KpiCard title="CULTURAS ATIVAS" value="—" detail="Distribuição" icon={Wheat} href="/dashboard/talhoes" loading={loading} />
          <KpiCard title="TALHÕES" value={stats?.talhaoTotalCadastrados ?? '—'} detail="Cadastrados" icon={Map} href="/dashboard/talhoes" loading={loading} />
        </div>
      </section>

      {/* Operações */}
      <section aria-label="Operações">
        <SectionLabel>Operações</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="FROTA" value={stats?.maquinasTotal ?? '—'} detail="Máquinas cadastradas" icon={Truck} href="/dashboard/frota" loading={loading} />
          <KpiCard title="MANUTENÇÃO" value={stats?.maquinasDetalhe ?? '—'} detail="Próxima manutenção" icon={AlertTriangle} href="/dashboard/frota" loading={loading} />
          <KpiCard title="RECEITA DO MÊS" value={stats?.receitaMes ?? '—'} detail="Mês corrente" icon={TrendingUp} href="/dashboard/financeiro" loading={loading} />
          <KpiCard title="DESPESA DO MÊS" value={stats?.despesaMes ?? '—'} detail="Mês corrente" icon={DollarSign} href="/dashboard/financeiro" loading={loading} />
        </div>
      </section>

      {/* Main Content */}
      <div className="space-y-6 mt-8">

        {/* Próximas Operações */}
        <Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-brand-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 id="operacoes-heading" className="text-lg font-semibold text-foreground">
                  Próximas Operações
                </h2>
                <p className="text-xs text-muted-foreground">Próximos 5 dias</p>
              </div>
            </div>
          </div>

          {loadingOperacoes ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : proximasOperacoes.length > 0 ? (
            <div className="space-y-2">
              {proximasOperacoes.map((op) => (
                <div
                  key={op.id}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between text-sm"
                >
                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-medium text-foreground min-w-14">
                      {formatarData(op.data_esperada)}
                    </span>
                    <span className="text-muted-foreground">{op.tipo_operacao}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="font-medium text-foreground">{op.talhao_nome}</span>
                    <span className="text-muted-foreground">({op.cultura})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {op.janelaColheita?.ativo && (
                      <Badge className="bg-status-warning/15 text-status-warning border-status-warning/30 hover:bg-status-warning/20">
                        Janela de colheita
                      </Badge>
                    )}
                    <Badge className={getStatusBadgeColor(op.status)}>
                      {op.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium">Nenhuma operação nos próximos dias</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Operações planejadas aparecem aqui.
              </p>
            </div>
          )}
        </Card>

        {/* Grid de Atividades + Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Atividades Recentes */}
          <Card className="bg-card rounded-2xl p-6 shadow-sm lg:col-span-2 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="atividades-heading"
                className="text-lg font-semibold text-foreground"
              >
                Atividades Recentes
              </h2>
              <button
                className="text-sm font-semibold text-brand-primary hover:text-brand-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-2 py-1 transition-colors"
                aria-label="Ver todas as atividades recentes"
              >
                Ver tudo
              </button>
            </div>

            <div className="p-10 text-center text-muted-foreground" role="status" aria-live="polite">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma atividade registrada recentemente.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Suas últimas movimentações aparecerão aqui.
              </p>
            </div>
          </Card>

          {/* Alertas Críticos */}
          <div className="flex flex-col gap-6">
            <Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <h2
                id="alertas-heading"
                className="text-lg font-semibold text-foreground mb-4"
              >
                Alertas Críticos
              </h2>

              <div
                className="flex flex-col items-center text-center"
                role="status"
                aria-label="Nenhum alerta crítico: tudo em ordem"
              >
                <div
                  className="w-14 h-14 bg-status-success/15 rounded-full flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <CheckCircle2 className="w-7 h-7 text-status-success" aria-hidden="true" />
                </div>
                <p className="font-bold text-foreground mb-1">Tudo em ordem!</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Não há alertas críticos ou manutenções pendentes para hoje.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function talhoesDetail(stats: DashboardStats | null): string {
  if (!stats || stats.talhaoAreaTotal === '—') return 'Nenhuma cultura ativa';
  return 'Área total cadastrada';
}

function getStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'planejado':
      return 'bg-status-info/15 text-status-info border-status-info/30 hover:bg-status-info/20';
    case 'realizado':
      return 'bg-status-success/15 text-status-success border-status-success/30 hover:bg-status-success/20';
    case 'atrasado':
      return 'bg-status-danger/15 text-status-danger border-status-danger/30 hover:bg-status-danger/20';
    default:
      return 'bg-muted text-muted-foreground border-border hover:bg-muted/80';
  }
}

function formatarData(data: string): string {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
