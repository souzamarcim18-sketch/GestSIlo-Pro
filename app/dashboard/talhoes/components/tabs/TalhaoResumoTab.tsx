'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Talhao, type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';
import { type Profile } from '@/lib/supabase';
import { AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { TalhaoForm } from '../dialogs/TalhaoForm';
import { CicloForm } from '../dialogs/CicloForm';
import { calcularCustoTotalEstimado, calcularCustoPorHectare, verificarAlertaSilagem } from '../../helpers';

interface TalhaoResumoTabProps {
  talhao: Talhao;
  cicloAtivo?: CicloAgricola;
  atividades: AtividadeCampo[];
  onEditTalhao?: () => void;
  onDeleteTalhao?: () => void;
  onRefresh?: () => void;
  profile?: Profile | null;
}

export function TalhaoResumoTab({
  talhao,
  cicloAtivo,
  atividades,
  onEditTalhao,
  onDeleteTalhao,
  onRefresh,
  profile,
}: TalhaoResumoTabProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddCicloOpen, setIsAddCicloOpen] = useState(false);

  const custoTotal = calcularCustoTotalEstimado(atividades);
  const custoPorHa = calcularCustoPorHectare(custoTotal, talhao.area_ha);
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
            <div className="py-8 text-center">
              <div className="text-muted-foreground">Nenhum ciclo agrícola ativo</div>
              <Button
                className="mt-4"
                onClick={() => setIsAddCicloOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Ciclo Agrícola
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custos */}
      {cicloAtivo && (
        <Card>
          <CardHeader>
            <CardTitle>Custos do Ciclo</CardTitle>
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
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Baseado em {atividades.length} atividades registradas
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setIsEditOpen(true)}
          className="flex-1"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Editar Talhão
        </Button>
        {cicloAtivo && (
          <Button
            onClick={() => setIsAddCicloOpen(true)}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Ciclo
          </Button>
        )}
        {profile?.perfil === 'Administrador' && (
          <Button
            variant="destructive"
            onClick={onDeleteTalhao}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Deletar
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <TalhaoForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        talhao={talhao}
        onSuccess={() => {
          setIsEditOpen(false);
          onRefresh?.();
        }}
      />

      <CicloForm
        open={isAddCicloOpen}
        onOpenChange={setIsAddCicloOpen}
        talhaoId={talhao.id}
        onSuccess={() => {
          setIsAddCicloOpen(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}
