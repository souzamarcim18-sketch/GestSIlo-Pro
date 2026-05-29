'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Silo, type Talhao, type Insumo } from '@/lib/supabase';
import { type FatiaCusto } from '@/lib/supabase/silos';
import { calcularDensidade } from '@/lib/supabase/silos';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatBRL } from '@/lib/utils';

interface VisaoGeralTabProps {
  silo: Silo;
  talhao: Talhao | null;
  custo: { fatias: FatiaCusto[]; custoPorTonelada: number; custoTotal: number } | null;
  densidade: number | null;
  insumoLona: Insumo | null;
  insumoInoculante: Insumo | null;
}

const CORES_DONUT = [
  '#00A651', '#3B82F6', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16',
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

export function VisaoGeralTab({
  silo,
  talhao,
  custo,
  insumoLona,
  insumoInoculante,
}: VisaoGeralTabProps) {
  const temGrafico = custo !== null && custo.fatias.length >= 2;

  // Adicionar percentual a cada fatia para o tooltip
  const fatiasComPct = custo?.fatias.map((f) => ({
    ...f,
    pct: custo.custoTotal > 0 ? (f.valor / custo.custoTotal) * 100 : 0,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* 1. Dados do Silo */}
      <Card className="rounded-2xl bg-card shadow-sm lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle>Dados do Silo</CardTitle>
          <CardDescription>Informações básicas de estrutura e capacidade</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                const indicator = dens >= 650 ? '🟢' : dens >= 550 ? '🟡' : '🔴';
                return (
                  <div className="flex items-center gap-2">
                    <span>{indicator}</span>
                    <p className="font-medium">{dens.toFixed(0)} kg/m³</p>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Rastreabilidade & Custo */}
      <Card className={`rounded-2xl bg-card shadow-sm ${temGrafico ? 'lg:col-span-2' : ''}`}>
        <CardHeader>
          <CardTitle>Rastreabilidade & Custo</CardTitle>
          <CardDescription>Informações de produção e economia</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Linha superior: talhão + números */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                <p className="font-semibold text-lg text-green-700">
                  {formatBRL(custo.custoPorTonelada)}/ton
                </p>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Custo Total Estimado</p>
              {custo !== null ? (
                <p className="font-semibold text-lg">
                  {formatBRL(custo.custoTotal)}
                </p>
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
                      stroke="hsl(var(--card))"
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

      {/* 3. Datas */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Datas Importantes</CardTitle>
          <CardDescription>Ciclos de armazenamento</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          {silo.data_fechamento && silo.data_abertura_real && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Dias de Fermentação</p>
              <p className="font-medium">
                {Math.floor(
                  (new Date(silo.data_abertura_real).getTime() -
                    new Date(silo.data_fechamento).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                dias
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      </div>{/* fim grid 2 colunas */}

      {/* 4. Insumos */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Insumos Utilizados</CardTitle>
          <CardDescription>Materiais consumidos no processo de silagem</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* 5. Observações */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Anotações e detalhes adicionais</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {silo.observacoes_gerais || 'Nenhuma observação registrada'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
