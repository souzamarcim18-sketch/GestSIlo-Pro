// components/silos/SiloDetailHeader.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Silo } from '@/lib/supabase';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';

type SiloStatus = 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Crítico' | 'Esgotado';

interface SiloDetailHeaderProps {
  silo: Silo;
  status: SiloStatus;
  onBack: () => void;
  onEdit: () => void;
  onDelete?: () => void;
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
  talhaoNome,
}: SiloDetailHeaderProps) {
  const statusInfo = statusConfig[status];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
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

      <h1 className="text-2xl font-bold tracking-tight">{silo.nome}</h1>

      <Badge variant="outline" className="text-sm">{silo.tipo}</Badge>
      <Badge className={`text-sm text-white ${statusInfo.color}`}>
        {statusInfo.emoji} {statusInfo.label}
      </Badge>
      {talhaoNome && (
        <span className="text-sm text-muted-foreground">
          • Talhão: <span className="font-medium text-foreground">{talhaoNome}</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
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
  );
}
