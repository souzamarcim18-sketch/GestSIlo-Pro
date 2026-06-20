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

const statusConfig: Record<SiloStatus, { dot: string; badge: string; label: string }> = {
  Enchendo: { dot: 'bg-blue-400', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300', label: 'Enchendo' },
  Fechado: { dot: 'bg-yellow-400', badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300', label: 'Fechado' },
  Aberto: { dot: 'bg-primary', badge: 'border-green-border bg-green-dim text-primary', label: 'Aberto' },
  Vazio: { dot: 'bg-muted-foreground', badge: 'border-border bg-muted/50 text-muted-foreground', label: 'Vazio' },
  Crítico: { dot: 'bg-red-400', badge: 'border-red-500/30 bg-red-500/10 text-red-300', label: 'Crítico' },
  Esgotado: { dot: 'bg-muted-foreground', badge: 'border-border bg-muted/50 text-muted-foreground', label: 'Esgotado' },
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

      {/* Linha 2: nome + status (mesma linha) + ações à direita */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* Nome + status badge inline */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">{silo.nome}</h1>
          <Badge
            variant="outline"
            className={`gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.badge}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} aria-hidden="true" />
            {statusInfo.label}
          </Badge>
          {talhaoNome && (
            <span className="text-sm text-muted-foreground">
              • Talhão: <span className="font-medium text-foreground">{talhaoNome}</span>
            </span>
          )}
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
