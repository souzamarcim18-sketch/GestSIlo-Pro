'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Silo } from '@/lib/supabase';
import { ArrowLeft, Edit2, AlertTriangle } from 'lucide-react';

interface SiloDetailHeaderProps {
  silo: Silo;
  status: 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção';
  onBack: () => void;
  onEdit: () => void;
  talhaoNome?: string | null;
}

const statusConfig: Record<string, { emoji: string; color: string; label: string }> = {
  Enchendo: { emoji: '🔵', color: 'bg-blue-500', label: 'Enchendo' },
  Fechado: { emoji: '🟡', color: 'bg-yellow-500', label: 'Fechado' },
  Aberto: { emoji: '🟢', color: 'bg-green-500', label: 'Aberto' },
  Vazio: { emoji: '⚫', color: 'bg-gray-500', label: 'Vazio' },
  Atenção: { emoji: '🔴', color: 'bg-red-500', label: 'Atenção' },
};

export function SiloDetailHeader({
  silo,
  status,
  onBack,
  onEdit,
  talhaoNome,
}: SiloDetailHeaderProps) {
  const statusInfo = statusConfig[status] || statusConfig.Vazio;
  const isLegacy = !talhaoNome || talhaoNome === null;

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

        {/* Informações de talhão e cultura */}
        <div className="text-sm text-muted-foreground space-y-1">
          {talhaoNome ? (
            <>
              <p>Talhão: <span className="font-medium text-foreground">{talhaoNome}</span></p>
            </>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700">
                <strong>⚠️ Silo legado</strong> — Edite os dados para vincular a um talhão
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
