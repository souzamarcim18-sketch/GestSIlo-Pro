'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Talhao, type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';
import { AlertCircle } from 'lucide-react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { calcularCustoTotalEstimado, calcularCustoPorHectare, calcularBreakdownCusto, verificarAlertaSilagem } from '../../helpers';

interface TalhaoResumoTabProps {
  talhao: Talhao;
  cicloAtivo?: CicloAgricola;
  atividades: AtividadeCampo[];
  onRefresh?: () => void;
}

export function TalhaoResumoTab({
  talhao,
  cicloAtivo,
  atividades,
}: TalhaoResumoTabProps) {
  const custoTotal = calcularCustoTotalEstimado(atividades);
  const custoPorHa = calcularCustoPorHectare(custoTotal, talhao.area_ha);
  const breakdown = calcularBreakdownCusto(atividades);
  const alertaSilagem = cicloAtivo ? verificarAlertaSilagem(cicloAtivo) : null;

  return (
    <div className="space-y-4">
      {/* Alerta de Silagem */}
      {alertaSilagem?.ativo && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            ⚠️ Atenção: janela de colheita de silagem se aproxima em{' '}
            <strong>{alertaSilagem.diasRestantes} dias</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Dados do Talhão */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Talhão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Nome</div>
              <div className="font-semibold">{talhao.nome}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Área</div>
              <div className="font-semibold">{talhao.area_ha} ha</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tipo de Solo</div>
              <div className="font-semibold">{talhao.tipo_solo || 'Não informado'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-semibold">{talhao.status}</div>
            </div>
          </div>
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
        <CardHeader>
          <CardTitle>Ciclo Agrícola Ativo</CardTitle>
        </CardHeader>
        <CardContent>
          {cicloAtivo ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Cultura</div>
                  <div className="font-semibold">{cicloAtivo.cultura}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant="outline">Ativo</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Data de Plantio</div>
                  <div className="font-semibold">
                    {new Date(cicloAtivo.data_plantio).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Colheita Prevista</div>
                  <div className="font-semibold">
                    {new Date(cicloAtivo.data_colheita_prevista).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              {cicloAtivo.custo_total_estimado && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Custo Total Estimado</div>
                  <div className="text-lg font-semibold text-primary">
                    R$ {cicloAtivo.custo_total_estimado.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-1">
              <div className="text-muted-foreground">Nenhum ciclo agrícola ativo</div>
              <p className="text-sm text-muted-foreground">
                Registre um preparo de solo ou plantio na aba{' '}
                <strong>Operações Agrícolas</strong> para iniciar um ciclo
                automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custos */}
      {cicloAtivo && (
        <Card>
          <CardHeader>
            <CardTitle>Custo de Produção do Ciclo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Custo Total</div>
                <div className="text-2xl font-bold text-primary">
                  R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Custo por ha</div>
                <div className="text-2xl font-bold text-primary">
                  R$ {custoPorHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            {/* Breakdown por componente */}
            <div className="pt-2 border-t space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Composição do custo</div>
              <div className="grid grid-cols-1 gap-1">
                {breakdown.insumos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Insumos (custo médio)</span>
                    <span className="font-medium">R$ {breakdown.insumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {breakdown.maquinas > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Máquinas (custo/hora)</span>
                    <span className="font-medium">R$ {breakdown.maquinas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {breakdown.servicos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Serviços terceirizados</span>
                    <span className="font-medium">R$ {breakdown.servicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {breakdown.outros > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outros</span>
                    <span className="font-medium">R$ {breakdown.outros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground pt-1 border-t">
              Baseado em {atividades.length} atividades registradas
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
