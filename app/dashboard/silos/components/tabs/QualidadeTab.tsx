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

interface AvaliacaoBromatologica {
  id: string;
  data: string;
  momento: string;
  avaliador: string;
  pb: number;
  fd: number;
  fda: number;
  energia: number;
  umidade: number;
}

interface AvaliacaoPSPS {
  id: string;
  data: string;
  peneira1: number; // 19 mm
  peneira2: number; // 8 mm
  peneira3: number; // 1.18 mm
  peneira4: number; // fundo
  tmp: number;
  status: 'Ideal' | 'Bom' | 'Ruim';
}

interface QualidadeTabProps {
  siloId: string;
  avaliacoesBromatologicas: AvaliacaoBromatologica[];
  avaliacoesPsps: AvaliacaoPSPS[];
  onNovaBromatologica: () => void;
  onNovaPsps: () => void;
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
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        id={`bromatologica-${aval.id}`}
                        className="font-semibold text-sm"
                      >
                        {format(new Date(aval.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {aval.momento} • Avaliador: {aval.avaliador}
                      </p>
                    </div>
                  </div>

                  {/* Valores em Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">PB</span>
                      <p className="font-bold">{aval.pb.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FD</span>
                      <p className="font-bold">{aval.fd.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FDA</span>
                      <p className="font-bold">{aval.fda.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Energia</span>
                      <p className="font-bold">{aval.energia.toFixed(2)} Mcal/kg</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Umidade</span>
                      <p className="font-bold">{aval.umidade.toFixed(1)}%</p>
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

      {/* Seção: Análise PSPS (Penn State Particle Separator) */}
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
                const statusColor: Record<string, string> = {
                  Ideal: 'bg-green-100 text-green-700 border-green-200',
                  Bom: 'bg-blue-100 text-blue-700 border-blue-200',
                  Ruim: 'bg-red-100 text-red-700 border-red-200',
                };

                return (
                  <div
                    key={aval.id}
                    className="p-4 border rounded-lg space-y-4"
                    role="region"
                    aria-labelledby={`psps-${aval.id}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          id={`psps-${aval.id}`}
                          className="font-semibold text-sm"
                        >
                          {format(new Date(aval.data), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <Badge className={statusColor[aval.status] || statusColor.Bom}>
                        {aval.status}
                      </Badge>
                    </div>

                    {/* Peneiras */}
                    <div className="space-y-3 text-sm">
                      {/* Peneira 1 (19 mm) */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">
                            Peneira 1 (19 mm): {aval.peneira1.toFixed(1)}%
                          </span>
                          <span className="font-semibold">{aval.peneira1.toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={aval.peneira1}
                          className="h-1.5"
                          aria-label={`Peneira 1: ${aval.peneira1.toFixed(1)}%`}
                        />
                      </div>

                      {/* Peneira 2 (8 mm) */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">
                            Peneira 2 (8 mm): {aval.peneira2.toFixed(1)}%
                          </span>
                          <span className="font-semibold">{aval.peneira2.toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={aval.peneira2}
                          className="h-1.5"
                          aria-label={`Peneira 2: ${aval.peneira2.toFixed(1)}%`}
                        />
                      </div>

                      {/* Peneira 3 (1.18 mm) */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">
                            Peneira 3 (1.18 mm): {aval.peneira3.toFixed(1)}%
                          </span>
                          <span className="font-semibold">{aval.peneira3.toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={aval.peneira3}
                          className="h-1.5"
                          aria-label={`Peneira 3: ${aval.peneira3.toFixed(1)}%`}
                        />
                      </div>

                      {/* Fundo (< 1.18 mm) */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">
                            Fundo (&lt;1.18 mm): {aval.peneira4.toFixed(1)}%
                          </span>
                          <span className="font-semibold">{aval.peneira4.toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={aval.peneira4}
                          className="h-1.5"
                          aria-label={`Fundo: ${aval.peneira4.toFixed(1)}%`}
                        />
                      </div>

                      {/* TMP - Tempo Médio de Mastigação */}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TMP (min)</span>
                          <span className="font-semibold">{aval.tmp.toFixed(1)} min</span>
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
