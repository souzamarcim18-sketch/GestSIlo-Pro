'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Silo } from '@/lib/supabase';
import { type SiloStatus } from '../helpers';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreVertical, Pencil, Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface SiloCardProps {
  silo: Silo;
  estoque: number;
  msAtual: number | null;
  consumoDiario: number | null;
  estoquePara: number | null;
  status: SiloStatus;
  onClick?: () => void;
  onEdit?: () => void;
  dataFechamento?: string | null;
  dataAberturaReal?: string | null;
  dataAberturaPrevia?: string | null;
}

const STATUS_CONFIG: Record<SiloStatus, { label: string; badgeClass: string; gaugeColor: string }> = {
  Enchendo: {
    label: 'Enchendo',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    gaugeColor: '#4aaae6',
  },
  Fechado: {
    label: 'Fechado',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    gaugeColor: '#4aaae6',
  },
  Aberto: {
    label: 'Aberto',
    badgeClass: 'bg-green-500/15 text-green-400 border-green-500/30',
    gaugeColor: '#00c45a',
  },
  Vazio: {
    label: 'Vazio',
    badgeClass: 'bg-muted/50 text-muted-foreground border-border',
    gaugeColor: 'var(--muted-foreground)',
  },
  Crítico: {
    label: 'Crítico',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    gaugeColor: '#e05454',
  },
  Esgotado: {
    label: 'Esgotado',
    badgeClass: 'bg-red-900/20 text-red-500 border-red-700/30',
    gaugeColor: '#e05454',
  },
};

const CULTURA_COLORS: Record<string, string> = {
  milho: '#f5a623',
  sorgo: '#9b59b6',
  capim: '#27ae60',
  braquiaria: '#27ae60',
  napier: '#27ae60',
  cana: '#2ecc71',
  girassol: '#f1c40f',
  aveia: '#e8c98a',
  azevem: '#6db86d',
  trigo: '#d4a843',
};

function getCulturaColor(cultura: string | null | undefined): string {
  if (!cultura) return '#6b7280';
  const key = cultura.toLowerCase().trim();
  for (const [k, v] of Object.entries(CULTURA_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#6b7280';
}

function getCapacidade(silo: Silo): number {
  if (silo.volume_ensilado_ton_mv) return silo.volume_ensilado_ton_mv;
  if (silo.comprimento_m && silo.largura_m && silo.altura_m) {
    return silo.comprimento_m * silo.largura_m * silo.altura_m;
  }
  return 0;
}

function MiniGauge({ percentual, color }: { percentual: number; color: string }) {
  const data = [{ value: Math.min(percentual, 100), fill: color }];
  return (
    <div className="relative w-[140px] h-[140px] shrink-0">
      <div
        className="absolute inset-0 rounded-full blur-lg opacity-[0.14] pointer-events-none"
        style={{ background: color }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          startAngle={210}
          endAngle={-30}
          data={data}
          barSize={8}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            background={{ fill: 'var(--muted)' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-extrabold leading-none" style={{ color }}>
          {percentual}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">cheio</span>
      </div>
    </div>
  );
}

function MsTrend({ msOriginal, msAtual }: { msOriginal: number | null; msAtual: number | null }) {
  if (msOriginal === null && msAtual === null) return <span className="text-muted-foreground">—</span>;

  const base = msOriginal ?? msAtual!;
  const atual = msAtual ?? msOriginal!;
  const diff = atual - base;

  if (msOriginal === null || msAtual === null || Math.abs(diff) < 0.1) {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground">
        <Minus className="w-3 h-3" />
        <span>estável</span>
      </span>
    );
  }

  return diff > 0 ? (
    <span className="flex items-center gap-0.5 text-green-400">
      <TrendingUp className="w-3 h-3" />
      <span>+{diff.toFixed(1)}%</span>
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-red-400">
      <TrendingDown className="w-3 h-3" />
      <span>{diff.toFixed(1)}%</span>
    </span>
  );
}

export function SiloCard({
  silo,
  estoque,
  msAtual,
  status,
  onClick,
  onEdit,
  dataFechamento,
  dataAberturaReal,
  dataAberturaPrevia,
}: SiloCardProps) {
  const capacidade = getCapacidade(silo);
  const percentage = capacidade > 0 ? Math.min(Math.round((estoque / capacidade) * 100), 100) : 0;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Vazio;

  const gaugeColor =
    status === 'Vazio' || status === 'Esgotado'
      ? cfg.gaugeColor
      : percentage >= 60
        ? '#00c45a'
        : percentage >= 30
          ? '#f5d000'
          : '#e05454';

  const culturaColor = getCulturaColor(silo.cultura_ensilada ?? silo.tipo);

  const diasFechado =
    dataFechamento && !dataAberturaReal
      ? differenceInDays(new Date(), new Date(dataFechamento))
      : null;

  const fmtDate = (d: string | null | undefined) =>
    d ? format(new Date(d), 'dd/MM/yy', { locale: ptBR }) : null;

  const fechamentoFmt = fmtDate(dataFechamento);
  const aberturaFmt = fmtDate(dataAberturaReal ?? dataAberturaPrevia);

  return (
    <Card
      className="relative flex flex-col gap-0 rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-border transition-all duration-150"
      style={{ borderLeft: `4px solid ${culturaColor}` }}
      role="article"
      aria-label={`Silo ${silo.nome}, ${cfg.label}`}
      onClick={onClick}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <div className="min-w-0">
          <p className="text-base font-semibold truncate leading-tight">{silo.nome}</p>
          <p className="text-sm text-muted-foreground truncate mt-1">
            {silo.cultura_ensilada ?? silo.tipo ?? '—'}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className={`text-xs font-semibold px-2 py-0.5 border ${cfg.badgeClass}`}
          >
            {cfg.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Ações do silo"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onClick}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Corpo: gauge + KPIs */}
      <div className="flex items-center gap-5 px-4 py-2">
        <MiniGauge percentual={percentage} color={gaugeColor} />

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Estoque */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Estoque</p>
            <p className="text-sm font-semibold">
              {estoque.toFixed(1)}{' '}
              <span className="text-muted-foreground font-normal">
                / {capacidade > 0 ? `${capacidade.toFixed(0)} ton` : 'N/D'}
              </span>
            </p>
          </div>

          {/* MS */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">MS</p>
            <div className="text-sm font-semibold">
              {msAtual !== null ? (
                <span className="flex items-center gap-1.5">
                  {msAtual}%
                  <MsTrend msOriginal={silo.materia_seca_percent} msAtual={msAtual} />
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-2 mt-auto border-t border-border/40 bg-muted/20">
        <div className="flex gap-4">
          {fechamentoFmt ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Fechamento</span>
              <span className="text-xs font-medium">{fechamentoFmt}</span>
            </div>
          ) : null}
          {aberturaFmt ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Abertura</span>
              <span className="text-xs font-medium">{aberturaFmt}</span>
            </div>
          ) : null}
          {!fechamentoFmt && !aberturaFmt && (
            <span className="text-xs text-muted-foreground">Sem datas registradas</span>
          )}
        </div>
        {diasFechado !== null && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Fechado há {diasFechado} dias
          </span>
        )}
      </div>
    </Card>
  );
}
