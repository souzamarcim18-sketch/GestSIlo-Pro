// components/silos/SiloDetailHeader.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Silo } from '@/lib/supabase';
import { ArrowLeft, Edit2 } from 'lucide-react';

type SiloStatus = 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Crítico' | 'Esgotado';

interface SiloDetailHeaderProps {
  silo: Silo;
  status: SiloStatus;
  onBack: () => void;
  onEdit: () => void;
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
  talhaoNome,
}: SiloDetailHeaderProps) {
  const statusInfo = statusConfig[status];

  return (
    <div className="space-y-4 mb-6">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2"
        aria-label="Voltar para lista de silos"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Header Principal */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{silo.nome}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline">{silo.tipo}</Badge>
              <Badge className={`text-white ${statusInfo.color}`}>
                {statusInfo.emoji} {statusInfo.label}
              </Badge>
            </div>
          </div>
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
        </div>

        {/* Informações de talhão */}
        {talhaoNome && (
          <div className="text-sm text-muted-foreground">
            <p>Talhão: <span className="font-medium text-foreground">{talhaoNome}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
