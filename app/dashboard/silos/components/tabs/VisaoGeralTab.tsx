'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Silo, type Talhao } from '@/lib/supabase';
import { Edit2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VisaoGeralTabProps {
  silo: Silo;
  talhao: Talhao | null;
  custo: number | null;
  densidade: number | null;
  insumoLona: string | null;
  insumoInoculante: string | null;
  onEdit: () => void;
}

export function VisaoGeralTab({
  silo,
  talhao,
  custo,
  densidade,
  insumoLona,
  insumoInoculante,
  onEdit,
}: VisaoGeralTabProps) {
  const isLegacy = !talhao;

  return (
    <div className="space-y-6">
      {/* Alerta de Silo Legado */}
      {isLegacy && (
        <Card className="rounded-2xl bg-amber-50 shadow-sm border-amber-200">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Silo sem vínculo de talhão</p>
              <p className="text-sm text-amber-800">
                Edite os dados do silo para vincular a um talhão e tabilir informações de cultura e safra.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. Dados do Silo */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Dados do Silo</CardTitle>
            <CardDescription>Informações básicas de estrutura e capacidade</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="gap-2"
            aria-label="Editar dados do silo"
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-semibold text-lg">{silo.nome}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Tipo de Estrutura</p>
            <Badge variant="secondary">{silo.tipo}</Badge>
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
        </CardContent>
      </Card>

      {/* 2. Rastreabilidade & Custo */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Rastreabilidade & Custo</CardTitle>
          <CardDescription>Informações de produção e economia</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Custo de Produção</p>
            {custo !== null ? (
              <p className="font-semibold text-lg text-green-700">
                R$ {custo.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                /ton
              </p>
            ) : (
              <p className="font-medium">-</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Densidade Aparente</p>
            {densidade !== null ? (
              <p className="font-semibold text-lg">{densidade} kg/m³</p>
            ) : (
              <p className="font-medium">-</p>
            )}
          </div>
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
            <p className="text-sm text-muted-foreground">Enchimento Previsto</p>
            <p className="font-medium">-</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Fechamento Previsto</p>
            <p className="font-medium">-</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Esvaziamento Previsto</p>
            <p className="font-medium">-</p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Insumos */}
      <Card className="rounded-2xl bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Insumos Utilizados</CardTitle>
          <CardDescription>Materiais consumidos no processo de silagem</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Lona</p>
            <p className="font-medium">{insumoLona || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Inoculante</p>
            <p className="font-medium">{insumoInoculante || '-'}</p>
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
          <p className="text-sm text-muted-foreground">
            Nenhuma observação registrada
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
