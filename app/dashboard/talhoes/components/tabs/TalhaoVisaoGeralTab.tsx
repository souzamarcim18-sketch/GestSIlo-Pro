'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Talhao, type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { AtividadeDialog } from '../dialogs/AtividadeDialog';
import {
  calcularCustoTotalEstimado,
  calcularCustoPorHectare,
  calcularBreakdownCusto,
  verificarAlertaColheita,
} from '../../helpers';

interface TalhaoVisaoGeralTabProps {
  talhao: Talhao;
  talhaoId: string;
  cicloAtivo?: CicloAgricola;
  atividades: AtividadeCampo[];
  onRefresh?: () => void;
  /** Controle externo do dialog de registrar operação (botão no header) */
  isDialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

const ITEMS_PER_PAGE = 20;

const formatBRL = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export function TalhaoVisaoGeralTab({
  talhao,
  talhaoId,
  cicloAtivo,
  atividades,
  onRefresh,
  isDialogOpen,
  onDialogOpenChange,
}: TalhaoVisaoGeralTabProps) {
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const custoTotal = calcularCustoTotalEstimado(atividades);
  const custoPorHa = calcularCustoPorHectare(custoTotal, talhao.area_ha);
  const breakdown = calcularBreakdownCusto(atividades);
  const alertaColheita = cicloAtivo ? verificarAlertaColheita(cicloAtivo) : null;

  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((atividade) => {
      if (tipoFiltro && atividade.tipo_operacao !== tipoFiltro) return false;
      if (dataInicio && atividade.data < dataInicio) return false;
      if (dataFim && atividade.data > dataFim) return false;
      return true;
    });
  }, [atividades, tipoFiltro, dataInicio, dataFim]);

  const totalPages = Math.ceil(atividadesFiltradas.length / ITEMS_PER_PAGE);
  const atividadesPaginadas = atividadesFiltradas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const tipos = Array.from(new Set(atividades.map((a) => a.tipo_operacao))).sort();

  return (
    <div className="space-y-4">
      {/* Alerta de Colheita — aproximação ou vencimento sem registro */}
      {alertaColheita && cicloAtivo && (
        <Alert
          className={
            alertaColheita.severidade === 'critico'
              ? 'border-red-500 bg-red-50 dark:bg-red-950'
              : alertaColheita.severidade === 'urgente'
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
          }
        >
          {alertaColheita.atrasado ? (
            <AlertTriangle
              className={
                alertaColheita.severidade === 'critico'
                  ? 'h-4 w-4 text-red-600 dark:text-red-400'
                  : 'h-4 w-4 text-orange-600 dark:text-orange-400'
              }
            />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          )}
          <AlertDescription
            className={
              alertaColheita.severidade === 'critico'
                ? 'text-red-800 dark:text-red-200'
                : alertaColheita.severidade === 'urgente'
                  ? 'text-orange-800 dark:text-orange-200'
                  : 'text-yellow-800 dark:text-yellow-200'
            }
          >
            {alertaColheita.atrasado ? (
              <>
                Colheita de <strong>{cicloAtivo.cultura}</strong> atrasada há{' '}
                <strong>{Math.abs(alertaColheita.diasRestantes)} dia(s)</strong> — prevista para{' '}
                {new Date(cicloAtivo.data_colheita_prevista).toLocaleDateString('pt-BR')} e ainda não
                registrada.
              </>
            ) : alertaColheita.diasRestantes === 0 ? (
              <>
                Colheita de <strong>{cicloAtivo.cultura}</strong> prevista para{' '}
                <strong>hoje</strong>.
              </>
            ) : (
              <>
                Janela de colheita de <strong>{cicloAtivo.cultura}</strong> se aproxima em{' '}
                <strong>{alertaColheita.diasRestantes} dia(s)</strong>.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* COLUNA ESQUERDA — informações do talhão */}
        <div className="space-y-4 lg:col-span-1">
          {/* Dados do Talhão */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados do Talhão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <InfoRow label="Tipo de Solo" value={talhao.tipo_solo || 'Não informado'} />
              <InfoRow label="Status" value={talhao.status} />
              {talhao.observacoes && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Observações</div>
                  <div className="text-sm">{talhao.observacoes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ciclo Ativo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ciclo Agrícola Ativo</CardTitle>
            </CardHeader>
            <CardContent>
              {cicloAtivo ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Cultura</div>
                      <div className="font-semibold">{cicloAtivo.cultura}</div>
                    </div>
                    <Badge variant="outline">Ativo</Badge>
                  </div>
                  <InfoRow
                    label="Data de Plantio"
                    value={new Date(cicloAtivo.data_plantio).toLocaleDateString('pt-BR')}
                  />
                  <InfoRow
                    label="Colheita Prevista"
                    value={new Date(cicloAtivo.data_colheita_prevista).toLocaleDateString('pt-BR')}
                  />
                  {cicloAtivo.custo_total_estimado && (
                    <div className="pt-2 border-t">
                      <div className="text-sm text-muted-foreground">Custo Total Estimado</div>
                      <div className="text-lg font-semibold text-primary">
                        {formatBRL(cicloAtivo.custo_total_estimado)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center space-y-1">
                  <div className="text-sm text-muted-foreground">Nenhum ciclo agrícola ativo</div>
                  <p className="text-xs text-muted-foreground">
                    Registre um preparo de solo ou plantio em <strong>Operações</strong> para
                    iniciar um ciclo automaticamente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custos */}
          {cicloAtivo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Custo de Produção do Ciclo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Custo Total</div>
                    <div className="text-xl font-bold text-primary">{formatBRL(custoTotal)}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Custo por ha</div>
                    <div className="text-xl font-bold text-primary">{formatBRL(custoPorHa)}</div>
                  </div>
                </div>
                <CustoComposicao breakdown={breakdown} custoTotal={custoTotal} />
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Baseado em {atividades.length} atividades registradas
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* COLUNA DIREITA — operações agrícolas */}
        <div className="space-y-4 lg:col-span-2">
          {!cicloAtivo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum ciclo agrícola ativo. Registre um preparo de solo ou plantio para iniciar um
                novo ciclo automaticamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Card de Operações Agrícolas com filtros no cabeçalho */}
          <Card>
            <CardHeader className="pb-3 space-y-4">
              <CardTitle className="text-base">
                Operações Agrícolas
                {atividadesFiltradas.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({atividadesFiltradas.length})
                  </span>
                )}
              </CardTitle>

              {/* Filtros dentro do card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Tipo de Operação</Label>
                  <Select
                    value={tipoFiltro || ''}
                    onValueChange={(v) => setTipoFiltro(v as string)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {tipos.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Data Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Data Fim</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => {
                      setDataFim(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {atividadesFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma operação registrada.
                </div>
              ) : (
                <>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo de Operação</TableHead>
                          <TableHead>Máquina</TableHead>
                          <TableHead>Horas</TableHead>
                          <TableHead>Custo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {atividadesPaginadas.map((atividade) => (
                          <TableRow key={atividade.id}>
                            <TableCell>
                              {new Date(atividade.data).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{atividade.tipo_operacao}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {atividade.maquina_id ? 'Sim' : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {atividade.horas_maquina ? `${atividade.horas_maquina}h` : '-'}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {atividade.custo_total ? formatBRL(atividade.custo_total) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground flex items-center px-2">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog */}
      <AtividadeDialog
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        talhaoId={talhaoId}
        talhaoNome={talhao.nome}
        talhaoAreaHa={talhao.area_ha}
        cicloAtivo={cicloAtivo}
        onSuccess={() => {
          onDialogOpenChange(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-right">{value}</span>
    </div>
  );
}

type Breakdown = { insumos: number; maquinas: number; servicos: number; outros: number };

const COMPONENTES_CUSTO: { key: keyof Breakdown; label: string; color: string }[] = [
  { key: 'insumos', label: 'Insumos', color: '#00A651' },
  { key: 'maquinas', label: 'Máquinas', color: '#3B82F6' },
  { key: 'servicos', label: 'Serviços terceirizados', color: '#F59E0B' },
  { key: 'outros', label: 'Outros', color: '#A78BFA' },
];

function CustoComposicao({
  breakdown,
  custoTotal,
}: {
  breakdown: Breakdown;
  custoTotal: number;
}) {
  const segmentos = COMPONENTES_CUSTO.map((c) => ({
    ...c,
    value: breakdown[c.key],
    pct: custoTotal > 0 ? (breakdown[c.key] / custoTotal) * 100 : 0,
  })).filter((s) => s.value > 0);

  if (segmentos.length === 0) return null;

  return (
    <div className="pt-2 border-t space-y-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Composição do custo
      </div>

      {/* Barra empilhada */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segmentos.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            title={`${s.label}: ${formatBRL(s.value)} (${s.pct.toFixed(0)}%)`}
          />
        ))}
      </div>

      {/* Legenda detalhada */}
      <div className="grid grid-cols-1 gap-1.5">
        {segmentos.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-1.5">
              <span className="font-medium">{formatBRL(s.value)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {s.pct.toFixed(0)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
