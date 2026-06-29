'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  AlertCircle,
  Baby,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Milk,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
import type { PieLabelRenderProps } from 'recharts';
import type { EventoReprodutivo, ParametrosReprodutivosFazenda } from '@/lib/types/rebanho-reproducao';
import type { Animal } from '@/lib/types/rebanho';
import type { AnimalRepetidora } from '@/lib/supabase/rebanho-reproducao';

const PieChart = dynamic(() => import('recharts').then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((m) => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });

interface DashboardReprodutivoProps {
  eventos: EventoReprodutivo[];
  animais: Animal[];
  repetidoras: AnimalRepetidora[];
  distribuicaoDetalhada: { key: string; label: string; value: number }[];
  indicadores: {
    taxaPrenhez: number;
    psmMedia: number | null;
    iepMedia: number | null;
    taxaConcepçaoIA: number | null;
    diasEmAberto: { media_dias: number | null; animais_count: number };
    taxaServiço: number | null;
    idadePrimeiraPariçao: number | null;
    contagemPorStatus: {
      vazia: number;
      inseminada: number;
      prenha: number;
      lactacao: number;
      seca: number;
      descartada: number;
    };
  };
  parametros: ParametrosReprodutivosFazenda | null;
}

interface KanbanCard {
  evento_id: string;
  animal_id: string;
  brinco: string;
  tipo: string;
  data_evento: string;
  status?: string;
}

// Cores alinhadas com o design system (chart-1..5 + extras)
const PIE_COLORS: Record<string, string> = {
  vazia_lactacao: '#e05454',   // chart-4 (vermelho)
  vazia_seca:     '#f5d000',   // chart-2 (ouro)
  prenha_lactacao: '#00c45a',  // chart-1 (verde primário)
  prenha_seca:    '#4aaae6',   // chart-3 (azul)
  novilha_prenha: '#688070',   // chart-5 (verde acinzentado)
  novilha_vazia:  '#a78bfa',   // lilás suave
  inseminada:     '#fb923c',   // laranja
};

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontSize: '12px',
} as const;

function formatRelativeDays(dateStr: string | null): string {
  if (!dateStr) return 'Sem data';
  const date = new Date(dateStr + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`;
  return `há ${Math.floor(diffDays / 30)} meses`;
}

export function DashboardReprodutivo({
  eventos,
  animais,
  repetidoras,
  distribuicaoDetalhada,
  indicadores,
  parametros,
}: DashboardReprodutivoProps) {
  const [loteFilter, setLoteFilter] = useState<string>('');
  const [periodoInicio, setPeriodoInicio] = useState<string>(() =>
    subDays(new Date(), 90).toISOString().split('T')[0]
  );
  const [periodoFim, setPeriodoFim] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [repetidorasExpanded, setRepetidorasExpanded] = useState(false);

  const metaTaxaPrenhez = parametros?.meta_taxa_prenhez_pct ?? 85;
  const metaPSM = parametros?.meta_psm_dias ?? 90;
  const metaIEP = parametros?.meta_iep_dias ?? 400;

  const lotes = useMemo(
    () => Array.from(new Set(animais.map((a) => a.lote_id).filter(Boolean))) as string[],
    [animais]
  );

  const animalMap = useMemo(() => new Map(animais.map((a) => [a.id, a])), [animais]);

  // --- Kanban (3 colunas — sem Histórico) ---
  const colunas = useMemo(() => {
    const hoje = new Date();
    const hoje_minus_45 = new Date(hoje);
    hoje_minus_45.setDate(hoje_minus_45.getDate() - 45);

    const diagnosticoPendente: KanbanCard[] = [];
    const partoPróximo: KanbanCard[] = [];
    const secagemPróxima: KanbanCard[] = [];

    const eventosPorAnimal: Record<string, EventoReprodutivo[]> = {};
    eventos.forEach((e) => {
      if (!eventosPorAnimal[e.animal_id]) eventosPorAnimal[e.animal_id] = [];
      eventosPorAnimal[e.animal_id].push(e);
    });

    eventos.forEach((evento) => {
      const animal = animalMap.get(evento.animal_id);
      if (!animal) return;
      if (loteFilter && animal.lote_id !== loteFilter) return;
      if (evento.data_evento < periodoInicio || evento.data_evento > periodoFim) return;

      const card: KanbanCard = {
        evento_id: evento.id,
        animal_id: evento.animal_id,
        brinco: animal.brinco,
        tipo: evento.tipo,
        data_evento: evento.data_evento,
      };

      if (evento.tipo === 'cobertura' && evento.data_evento >= hoje_minus_45.toISOString().split('T')[0]) {
        const temDiagnostico = eventosPorAnimal[evento.animal_id]?.some(
          (e) => e.tipo === 'diagnostico_prenhez' && e.data_evento > evento.data_evento
        );
        if (!temDiagnostico) diagnosticoPendente.push(card);
      }

      if (evento.tipo === 'diagnostico_prenhez' && evento.resultado_prenhez === 'positivo') {
        const diasGestacao = evento.idade_gestacional_dias || 0;
        const previsaoParto = new Date(evento.data_evento);
        previsaoParto.setDate(previsaoParto.getDate() + (283 - diasGestacao));
        if (
          previsaoParto >= hoje &&
          previsaoParto <= new Date(periodoFim) &&
          !partoPróximo.some((c) => c.animal_id === evento.animal_id && c.tipo === 'diagnostico_prenhez')
        ) {
          partoPróximo.push({
            ...card,
            tipo: 'parto_previsto',
            status: `Previsto: ${format(previsaoParto, 'dd/MM', { locale: ptBR })}`,
          });
        }
      }

      if (evento.tipo === 'parto') {
        const previsaoSecagem = new Date(evento.data_evento);
        previsaoSecagem.setDate(previsaoSecagem.getDate() + 60);
        if (
          previsaoSecagem >= hoje &&
          previsaoSecagem <= new Date(periodoFim) &&
          !secagemPróxima.some((c) => c.animal_id === evento.animal_id && c.tipo === 'secagem_prevista')
        ) {
          secagemPróxima.push({
            ...card,
            tipo: 'secagem_prevista',
            status: `Prevista: ${format(previsaoSecagem, 'dd/MM', { locale: ptBR })}`,
          });
        }
      }
    });

    return [
      { label: 'Diagnóstico Pendente', borderColor: 'border-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/20', cards: diagnosticoPendente },
      { label: 'Parto Próximo', borderColor: 'border-red-500', bgColor: 'bg-red-50 dark:bg-red-950/20', cards: partoPróximo },
      { label: 'Secagem Próxima', borderColor: 'border-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/20', cards: secagemPróxima },
    ];
  }, [eventos, loteFilter, periodoInicio, periodoFim, animalMap]);

  // Dados do gráfico de pizza — usa distribuição detalhada por categoria + status
  const pieData = useMemo(
    () => distribuicaoDetalhada.map((item) => ({ name: item.label, value: item.value, status: item.key })),
    [distribuicaoDetalhada]
  );

  // Fêmeas em aberto: status vazia ou inseminada
  const femasEmAberto = indicadores.contagemPorStatus.vazia + indicadores.contagemPorStatus.inseminada;

  const psmAbaixaMeta = indicadores.psmMedia !== null && indicadores.psmMedia <= metaPSM;
  const iepDentroMeta =
    indicadores.iepMedia !== null && indicadores.iepMedia >= 365 && indicadores.iepMedia <= metaIEP;
  const barProgressTaxaPrenhez = Math.min(100, Math.round((indicadores.taxaPrenhez / metaTaxaPrenhez) * 100));

  const tipoEventoMap: Record<string, string> = {
    cobertura: 'Cobertura',
    diagnostico_prenhez: 'Diagnóstico',
    parto: 'Parto',
    secagem: 'Secagem',
    aborto: 'Aborto',
    descarte: 'Descarte',
    parto_previsto: 'Parto',
    secagem_prevista: 'Secagem',
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* ── Seção 1: Cards de contagem rápida ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em] flex items-center gap-1.5">
            <Baby className="h-3.5 w-3.5" />
            Prenhez Confirmada
          </p>
          <p className="text-3xl font-bold mt-1">{indicadores.contagemPorStatus.prenha}</p>
          <p className="text-xs text-muted-foreground mt-1">fêmeas prenhes</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em] flex items-center gap-1.5">
            <CircleDashed className="h-3.5 w-3.5" />
            Fêmeas em Aberto
          </p>
          <p className="text-3xl font-bold mt-1">{femasEmAberto}</p>
          <p className="text-xs text-muted-foreground mt-1">vazias + aguardando protocolo</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em] flex items-center gap-1.5">
            <Milk className="h-3.5 w-3.5" />
            Em Lactação
          </p>
          <p className="text-3xl font-bold mt-1">{indicadores.contagemPorStatus.lactacao}</p>
          <p className="text-xs text-muted-foreground mt-1">vacas lactando</p>
        </div>
        <button
          onClick={() => setRepetidorasExpanded((v) => !v)}
          className={`rounded-lg border p-4 text-left transition-colors ${
            repetidoras.length > 0
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30'
              : 'border-border/40 bg-muted/30 hover:bg-muted/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em] flex items-center gap-1">
                {repetidoras.length > 0 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                Repetidoras
              </p>
              <p className="text-3xl font-bold mt-1">{repetidoras.length}</p>
              <p className="text-xs text-muted-foreground mt-1">3+ coberturas sem prenhez</p>
            </div>
            {repetidoras.length > 0 && (
              repetidorasExpanded
                ? <ChevronUp className="h-4 w-4 text-amber-500 mt-1" />
                : <ChevronDown className="h-4 w-4 text-amber-500 mt-1" />
            )}
          </div>
        </button>
      </div>

      {/* ── Expansão da lista de repetidoras ── */}
      {repetidorasExpanded && repetidoras.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 divide-y divide-amber-100 dark:divide-amber-900/30">
          {repetidoras.map((animal) => (
            <div key={animal.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{animal.brinco}{animal.nome ? ` — ${animal.nome}` : ''}</p>
                  <p className="text-xs text-muted-foreground">
                    {animal.coberturas_count} cobertura{animal.coberturas_count !== 1 ? 's' : ''} · última {formatRelativeDays(animal.ultima_cobertura_data)}
                  </p>
                </div>
              </div>
              <Link href={`/dashboard/rebanho/${animal.id}`}>
                <Button variant="outline" size="sm" className="text-xs">Ver animal</Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Seção 2: Filtros + Kanban (3 colunas) ── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.13em] text-muted-foreground mb-3">Acompanhamento</h2>
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <div className="space-y-1">
            <Label htmlFor="lote-filtro" className="text-sm font-semibold">Lote</Label>
            <Select value={loteFilter} onValueChange={(v) => setLoteFilter(v ?? '')}>
              <SelectTrigger id="lote-filtro">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {lotes.map((lote) => (
                  <SelectItem key={lote} value={lote}>{lote}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="periodo-inicio" className="text-sm font-semibold">Data Inicial</Label>
            <Input id="periodo-inicio" type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="periodo-fim" className="text-sm font-semibold">Data Final</Label>
            <Input id="periodo-fim" type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {colunas.map((coluna) => (
            <div key={coluna.label} className={`rounded-lg border-2 ${coluna.borderColor} ${coluna.bgColor} p-4 min-h-48`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-xs uppercase tracking-[0.13em]">{coluna.label}</h3>
                <Badge variant="secondary">{coluna.cards.length}</Badge>
              </div>
              {coluna.cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum animal</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {coluna.cards.map((card) => (
                    <div key={card.evento_id} className="bg-background rounded-md p-3 border border-border/40 shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-brand-primary">{card.brinco}</span>
                        <Badge variant="outline" className="text-xs">{tipoEventoMap[card.tipo] || card.tipo}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(card.data_evento), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      {card.status && <p className="text-xs text-brand-primary font-medium mt-0.5">{card.status}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Seção 3: Indicadores reprodutivos ── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.13em] text-muted-foreground mb-3">Indicadores Reprodutivos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-lg border border-border/40 bg-muted/30 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">Taxa de Prenhez</p>
            <p className="text-4xl font-bold">{indicadores.taxaPrenhez}%</p>
            <p className="text-xs text-muted-foreground">Meta: {metaTaxaPrenhez}%</p>
            <Progress value={barProgressTaxaPrenhez} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {indicadores.taxaPrenhez >= metaTaxaPrenhez ? '✓ Meta atingida' : '⚠ Abaixo da meta'}
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">PSM Médio</p>
            <p className="text-4xl font-bold">{indicadores.psmMedia !== null ? indicadores.psmMedia : '—'}</p>
            <p className="text-xs text-muted-foreground">Meta: ≤ {metaPSM} dias</p>
            {indicadores.psmMedia !== null && (
              <div className="flex items-center gap-1.5">
                {psmAbaixaMeta ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-600" />}
                <p className="text-xs text-muted-foreground">{psmAbaixaMeta ? '✓ Abaixo da meta' : '⚠ Acima da meta'}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">IEP Médio</p>
            <p className="text-4xl font-bold">{indicadores.iepMedia !== null ? indicadores.iepMedia : '—'}</p>
            <p className="text-xs text-muted-foreground">Meta: {metaIEP} dias</p>
            {indicadores.iepMedia !== null && (
              <div className="flex items-center gap-1.5">
                {iepDentroMeta ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-600" />}
                <p className="text-xs text-muted-foreground">{iepDentroMeta ? '✓ Na meta' : '⚠ Fora da meta'}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">Taxa de Concepção IA</p>
            <p className="text-4xl font-bold">{indicadores.taxaConcepçaoIA !== null ? `${indicadores.taxaConcepçaoIA}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">Diagnósticos positivos após IA</p>
            {indicadores.taxaConcepçaoIA !== null && (
              <p className="text-xs text-muted-foreground">
                {indicadores.taxaConcepçaoIA >= 50 ? '✓ Bom resultado' : '⚠ Verificar técnica'}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">Dias em Aberto</p>
            <p className="text-4xl font-bold">{indicadores.diasEmAberto.media_dias !== null ? indicadores.diasEmAberto.media_dias : '—'}</p>
            <p className="text-xs text-muted-foreground">{indicadores.diasEmAberto.animais_count} vaca(s) em lactação</p>
            {indicadores.diasEmAberto.media_dias !== null && (
              <p className="text-xs text-muted-foreground">
                {indicadores.diasEmAberto.media_dias <= metaPSM ? '✓ Abaixo da meta' : '⚠ Acima da meta'}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">Taxa de Serviço</p>
            <p className="text-4xl font-bold">{indicadores.taxaServiço !== null ? `${indicadores.taxaServiço}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">Coberturas / fêmeas aptas</p>
            {indicadores.taxaServiço !== null && (
              <p className="text-xs text-muted-foreground">
                {indicadores.taxaServiço >= 100 ? '✓ Boa cobertura' : '⚠ Verificar'}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.13em]">Idade Primeira Parição</p>
            <p className="text-4xl font-bold">
              {indicadores.idadePrimeiraPariçao !== null ? `${indicadores.idadePrimeiraPariçao}m` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Idade média em meses</p>
            {indicadores.idadePrimeiraPariçao !== null && (
              <p className="text-xs text-muted-foreground">
                {indicadores.idadePrimeiraPariçao <= 28 ? '✓ Ideal' : '⚠ Acima da meta'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Seção 4: Distribuição por status reprodutivo ── */}
      {pieData.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/30 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.13em] text-muted-foreground mb-4">
            Distribuição por Status Reprodutivo
          </h2>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={260} className="flex-1 min-w-0">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ cx: pcx, cy: pcy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
                    if ((percent as number) < 0.05) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.6;
                    const x = (pcx as number) + radius * Math.cos(-midAngle! * RADIAN);
                    const y = (pcy as number) + radius * Math.sin(-midAngle! * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                        {`${((percent as number) * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  outerRadius={110}
                  innerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={`cell-${entry.status}`} fill={PIE_COLORS[entry.status] ?? 'hsl(215 16% 47%)'} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => {
                    const v = typeof value === 'number' ? value : 0;
                    const total = pieData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                    return [`${v} animal(is) — ${pct}%`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda manual à direita */}
            <div className="flex flex-col gap-2 min-w-[160px]">
              {pieData.map((entry) => {
                const total = pieData.reduce((s, d) => s + d.value, 0);
                const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={entry.status} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[entry.status] ?? 'hsl(215 16% 47%)' }}
                      />
                      <span className="text-sm text-foreground">{entry.name}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{entry.value} <span className="text-xs text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
