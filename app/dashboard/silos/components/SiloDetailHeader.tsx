// components/silos/SiloDetailHeader.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Silo } from '@/lib/supabase';
import { ArrowLeft, Edit2, Trash2, RotateCw, Plus } from 'lucide-react';

type SiloStatus = 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Crítico' | 'Esgotado';

interface SiloDetailHeaderProps {
  silo: Silo;
  status: SiloStatus;
  onBack: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  onNovaMovimentacao?: () => void;
  talhaoNome?: string | null;
}

const statusConfig: Record<SiloStatus, { emoji: string; color: string; label: string }> = {
  Enchendo: { emoji: '🔵', color: 'bg-blue-500', label: 'Enchendo' },
  Fechado: { emoji: '🟡', color: 'bg-yellow-500', label: 'Fechado' },
  Aberto: { emoji: '🟢', color: 'bg-green-500', label: 'Aberto' },
  Vazio: { emoji: '⚫', color: 'bg-gray-500', label: 'Vazio' },
  Crítico: { emoji: '🔴', color: 'bg-red-500', label: 'Crítico' },
  Esgotado: { emoji: '⚫', color: 'bg-gray-800', label: 'Esgotado' },
};

export function SiloDetailHeader({
  silo,
  status,
  onBack,
  onEdit,
  onDelete,
  onRefresh,
  onNovaMovimentacao,
  talhaoNome,
}: SiloDetailHeaderProps) {
  const statusInfo = statusConfig[status];

  return (
    <div className="space-y-3 mb-2">
      {/* Linha 1: botão voltar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2 -ml-2 shrink-0"
        aria-label="Voltar para lista de silos"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Linha 2: nome + ações */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
        {/* Nome + status (abaixo) + talhão */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#00A651]">{silo.nome}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge className={`text-xs text-white ${statusInfo.color}`}>
              {statusInfo.emoji} {statusInfo.label}
            </Badge>
            {talhaoNome && (
              <span className="text-sm text-muted-foreground">
                • Talhão: <span className="font-medium text-foreground">{talhaoNome}</span>
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="gap-2"
              aria-label="Atualizar dados do silo"
            >
              <RotateCw className="h-4 w-4" />
              Atualizar
            </Button>
          )}
          {onNovaMovimentacao && (
            <Button
              onClick={onNovaMovimentacao}
              size="sm"
              className="gap-2"
              aria-label="Registrar movimentação"
            >
              <Plus className="h-4 w-4" />
              Registrar Movimentação
            </Button>
          )}
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label="Editar dados do silo"
          >
            <Edit2 className="h-4 w-4" />
            Editar Dados
          </Button>
          {onDelete && (
            <Button
              onClick={onDelete}
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Deletar silo"
            >
              <Trash2 className="h-4 w-4" />
              Deletar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
