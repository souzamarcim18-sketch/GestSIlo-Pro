'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Silo, type Talhao } from '@/lib/supabase';
import { type FatiaCusto } from '@/lib/supabase/silos';

/** Subconjunto de Insumo exibido no card de insumos utilizados. */
export type InsumoResumo = {
  id: string;
  nome: string;
  unidade: string;
  custo_medio: number;
};
import { calcularDensidade } from '@/lib/supabase/silos';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatBRL } from '@/lib/utils';

// Paleta do donut derivada de CSS vars do design system (tema-aware).
const CORES_DONUT = [
  'var(--chart-1)', 'var(--chart-3)', 'var(--status-warning)', 'var(--destructive)',
  'var(--chart-5)', 'var(--primary)', 'var(--chart-4)', 'var(--muted-foreground)',
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: FatiaCusto & { pct: number };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground">{formatBRL(value)}</p>
      <p className="text-muted-foreground">{data.pct.toFixed(1)}%</p>
    </div>
  );
}

/**
 * Card "Dados do Silo" — informações de estrutura/capacidade + datas importantes.
 * Pensado para ocupar a coluna esquerda, ao lado dos cards de estoque.
 */
export function DadosSiloCard({ silo }: { silo: Silo }) {
  const diasFermentacao =
    silo.data_fechamento && silo.data_abertura_real
      ? Math.floor(
          (new Date(silo.data_abertura_real).getTime() -
            new Date(silo.data_fechamento).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  return (
    <Card className="rounded-2xl bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dados do Silo</CardTitle>
        <CardDescription>Estrutura, capacidade e ciclos de armazenamento</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Nome</p>
          <p className="font-semibold text-lg">{silo.nome}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Tipo de Estrutura</p>
          <Badge variant="secondary" className="text-sm">{silo.tipo}</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Volume Ensilado</p>
          <p className="font-semibold text-lg">
            {silo.volume_ensilado_ton_mv ? `${silo.volume_ensilado_ton_mv} ton` : '-'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Cultura Ensilada</p>
          <p className="font-medium">{silo.cultura_ensilada || 'Não informada'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Matéria Seca Original</p>
          <p className="font-semibold text-lg">{silo.materia_seca_percent || '-'}%</p>
        </div>
        {silo.comprimento_m && silo.largura_m && silo.altura_m && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Dimensões</p>
            <p className="font-medium">
              {silo.comprimento_m} m × {silo.largura_m} m × {silo.altura_m} m
            </p>
          </div>
        )}
        {silo.comprimento_m && silo.largura_m && silo.altura_m && silo.volume_ensilado_ton_mv && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Densidade</p>
            {(() => {
              const dens = calcularDensidade(
                silo.volume_ensilado_ton_mv,
                silo.comprimento_m,
                silo.largura_m,
                silo.altura_m
              );
              const dotColor =
                dens >= 650
                  ? 'bg-primary'
                  : dens >= 550
                    ? 'bg-[color:var(--status-warning)]'
                    : 'bg-destructive';
              return (
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
                  <p className="font-medium">{dens.toFixed(0)} kg/m³</p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Datas importantes (antes em card próprio) */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Fechamento</p>
          <p className="font-medium">
            {silo.data_fechamento
              ? new Date(silo.data_fechamento).toLocaleDateString('pt-BR')
              : '-'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {silo.data_abertura_real ? 'Abertura Real' : 'Previsão de Abertura'}
          </p>
          <p className="font-medium">
            {silo.data_abertura_real
              ? new Date(silo.data_abertura_real).toLocaleDateString('pt-BR')
              : silo.data_abertura_prevista
                ? new Date(silo.data_abertura_prevista).toLocaleDateString('pt-BR')
                : '-'}
          </p>
        </div>
        {diasFermentacao !== null && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Dias de Fermentação</p>
            <p className="font-medium">{diasFermentacao} dias</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Card "Rastreabilidade & Custo" — talhão de origem, custos e gráfico donut.
 */
export function RastreabilidadeCustoCard({
  silo,
  talhao,
  custo,
}: {
  silo: Silo;
  talhao: Talhao | null;
  custo: { fatias: FatiaCusto[]; custoPorTonelada: number; custoTotal: number } | null;
}) {
  const temGrafico = custo !== null && custo.fatias.length >= 2;

  const fatiasComPct =
    custo?.fatias.map((f) => ({
      ...f,
      pct: custo.custoTotal > 0 ? (f.valor / custo.custoTotal) * 100 : 0,
    })) ?? [];

  return (
    <Card className="rounded-2xl bg-card shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Rastreabilidade & Custo</CardTitle>
        <CardDescription>Informações de produção e economia</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Linha superior: talhão + números */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {silo.talhao_id && talhao && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Talhão de Origem</p>
              <p className="font-medium">{talhao.nome}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {silo.talhao_id ? 'Custo de Produção' : 'Custo de Aquisição'}
            </p>
            {custo !== null ? (
              <p className="font-semibold text-lg text-primary">
                {formatBRL(custo.custoPorTonelada)}/ton
              </p>
            ) : (
              <p className="font-medium">-</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Custo Total Estimado</p>
            {custo !== null ? (
              <p className="font-semibold text-lg">{formatBRL(custo.custoTotal)}</p>
            ) : (
              <p className="font-medium">-</p>
            )}
          </div>
        </div>

        {/* Gráfico donut + legenda */}
        {temGrafico && (
          <div className="flex flex-col md:flex-row items-center gap-8 pt-2 border-t border-border">
            {/* Donut */}
            <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fatiasComPct}
                    dataKey="valor"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    strokeWidth={2}
                    stroke="var(--card)"
                  >
                    {fatiasComPct.map((_, i) => (
                      <Cell key={i} fill={CORES_DONUT[i % CORES_DONUT.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Label central */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-semibold leading-tight">
                  {formatBRL(custo!.custoTotal)}
                </p>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 w-full">
              {fatiasComPct.map((fatia, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1 shrink-0 rounded-sm"
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: CORES_DONUT[i % CORES_DONUT.length],
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fatia.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBRL(fatia.valor)}
                      <span className="ml-1 text-muted-foreground/70">
                        ({fatia.pct.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Card "Insumos Utilizados" — lona e inoculante.
 */
export function InsumosCard({
  insumoLona,
  insumoInoculante,
}: {
  insumoLona: InsumoResumo | null;
  insumoInoculante: InsumoResumo | null;
}) {
  return (
    <Card className="rounded-2xl bg-card shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Insumos Utilizados</CardTitle>
        <CardDescription>Materiais consumidos no processo de silagem</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Lona</p>
          {insumoLona ? (
            <>
              <p className="font-medium">{insumoLona.nome}</p>
              {insumoLona.custo_medio > 0 && (
                <p className="text-sm text-muted-foreground">
                  Custo médio: {formatBRL(insumoLona.custo_medio)}/{insumoLona.unidade}
                </p>
              )}
            </>
          ) : (
            <p className="font-medium">-</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Inoculante</p>
          {insumoInoculante ? (
            <>
              <p className="font-medium">{insumoInoculante.nome}</p>
              {insumoInoculante.custo_medio > 0 && (
                <p className="text-sm text-muted-foreground">
                  Custo médio: {formatBRL(insumoInoculante.custo_medio)}/{insumoInoculante.unidade}
                </p>
              )}
            </>
          ) : (
            <p className="font-medium">-</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card "Observações" — anotações gerais. Ocupa largura total.
 */
export function ObservacoesCard({ silo }: { silo: Silo }) {
  return (
    <Card className="rounded-2xl bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Observações</CardTitle>
        <CardDescription>Anotações e detalhes adicionais</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          {silo.observacoes_gerais || 'Nenhuma observação registrada'}
        </p>
      </CardContent>
    </Card>
  );
}
