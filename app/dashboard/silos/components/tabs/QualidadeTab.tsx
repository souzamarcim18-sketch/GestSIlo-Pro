'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Microscope, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AvaliacaoBromatologica, AvaliacaoPSPS } from '@/lib/supabase';
import { calcularStatusPeneira, calcularStatusTmp } from '@/lib/supabase/silos';
import { FAIXAS_PSPS, TMP_IDEAL_SEM_KP, TMP_IDEAL_COM_KP } from '@/lib/validations/silos';

interface QualidadeTabProps {
  siloId: string;
  avaliacoesBromatologicas: AvaliacaoBromatologica[];
  avaliacoesPsps: AvaliacaoPSPS[];
  onNovaBromatologica: () => void;
  onNovaPsps: () => void;
}

function StatusIcon({ status }: { status: 'ok' | 'fora' }) {
  return status === 'ok' ? <span aria-label="ok">✅</span> : <span aria-label="fora">⚠️</span>;
}

function formatVal(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val as number)) return '-';
  return (val as number).toFixed(decimals);
}

export function QualidadeTab({
  siloId,
  avaliacoesBromatologicas,
  avaliacoesPsps,
  onNovaBromatologica,
  onNovaPsps,
}: QualidadeTabProps) {
  return (
    <div className="space-y-6">
      {/* Seção: Análise Bromatológica */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Microscope className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <div>
              <CardTitle>Análise Bromatológica</CardTitle>
              <CardDescription>Composição química e nutritiva</CardDescription>
            </div>
          </div>
          <Button
            onClick={onNovaBromatologica}
            size="sm"
            variant="outline"
            className="gap-2"
            aria-label="Registrar nova análise bromatológica"
          >
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </CardHeader>
        <CardContent>
          {avaliacoesBromatologicas.length > 0 ? (
            <div className="space-y-4">
              {avaliacoesBromatologicas.map((aval) => (
                <div
                  key={aval.id}
                  className="p-4 border rounded-lg space-y-3"
                  role="region"
                  aria-labelledby={`bromatologica-${aval.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        id={`bromatologica-${aval.id}`}
                        className="font-semibold text-sm"
                      >
                        {format(new Date(aval.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {aval.momento}
                        {aval.avaliador ? ` • ${aval.avaliador}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline">{aval.momento}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">MS</span>
                      <p className="font-bold">{formatVal(aval.ms)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PB</span>
                      <p className="font-bold">{formatVal(aval.pb)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FDN</span>
                      <p className="font-bold">{formatVal(aval.fdn)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FDA</span>
                      <p className="font-bold">{formatVal(aval.fda)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amido</span>
                      <p className="font-bold">{formatVal(aval.amido)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">NDT</span>
                      <p className="font-bold">{formatVal(aval.ndt)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">pH</span>
                      <p className="font-bold">{formatVal(aval.ph, 2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Microscope className="h-8 w-8 opacity-40 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm">Nenhuma análise bromatológica registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção: Análise PSPS */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" aria-hidden="true" />
            <div>
              <CardTitle>Análise PSPS</CardTitle>
              <CardDescription>Distribuição de tamanho de partículas</CardDescription>
            </div>
          </div>
          <Button
            onClick={onNovaPsps}
            size="sm"
            variant="outline"
            className="gap-2"
            aria-label="Registrar nova análise PSPS"
          >
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </CardHeader>
        <CardContent>
          {avaliacoesPsps.length > 0 ? (
            <div className="space-y-4">
              {avaliacoesPsps.map((aval) => {
                const tmpStatus =
                  aval.tmp_mm !== null && aval.tmp_mm !== undefined
                    ? calcularStatusTmp(aval.tmp_mm, aval.kernel_processor)
                    : null;
                const tmpFaixa = aval.kernel_processor ? TMP_IDEAL_COM_KP : TMP_IDEAL_SEM_KP;

                const peneiras = [
                  { key: 'peneira_19mm', label: '>19mm', valor: aval.peneira_19mm },
                  { key: 'peneira_8_19mm', label: '8–19mm', valor: aval.peneira_8_19mm },
                  { key: 'peneira_4_8mm', label: '4–8mm', valor: aval.peneira_4_8mm },
                  { key: 'peneira_fundo_4mm', label: '<4mm', valor: aval.peneira_fundo_4mm },
                ] as const;

                return (
                  <div
                    key={aval.id}
                    className="p-4 border rounded-lg space-y-4"
                    role="region"
                    aria-labelledby={`psps-${aval.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p id={`psps-${aval.id}`} className="font-semibold text-sm">
                          {format(new Date(aval.data), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {aval.momento}
                          {aval.avaliador ? ` • ${aval.avaliador}` : ''}
                        </p>
                      </div>
                      <Badge variant={aval.kernel_processor ? 'default' : 'secondary'}>
                        {aval.kernel_processor ? 'Com KP' : 'Sem KP'}
                      </Badge>
                    </div>

                    {/* Peneiras com indicadores individuais */}
                    <div className="space-y-3 text-sm">
                      {peneiras.map(({ key, label, valor }) => {
                        const status = calcularStatusPeneira(key, valor);
                        const faixa = FAIXAS_PSPS[key];
                        return (
                          <div key={key}>
                            <div className="flex justify-between mb-1 text-xs">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <StatusIcon status={status} />
                                Peneira {label}
                                <span className="text-muted-foreground/70">
                                  ({faixa.min}–{faixa.max}%)
                                </span>
                              </span>
                              <span className="font-semibold">{valor.toFixed(1)}%</span>
                            </div>
                            <Progress
                              value={valor}
                              className="h-1.5"
                              aria-label={`Peneira ${label}: ${valor.toFixed(1)}%`}
                            />
                          </div>
                        );
                      })}

                      {/* TMP calculado pelo BD */}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            {tmpStatus && <StatusIcon status={tmpStatus} />}
                            TMP — Tamanho Médio de Partícula
                            <span className="text-muted-foreground/70">
                              ({tmpFaixa.min}–{tmpFaixa.max} mm)
                            </span>
                          </span>
                          <span className="font-semibold">
                            {aval.tmp_mm !== null && aval.tmp_mm !== undefined
                              ? `${aval.tmp_mm.toFixed(2)} mm`
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 opacity-40 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm">Nenhuma análise PSPS registrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
