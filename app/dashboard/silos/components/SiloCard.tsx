// app/dashboard/silos/components/SiloCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type Silo } from '@/lib/supabase';
import { type SiloStatus } from '../helpers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SiloCardProps {
  silo: Silo;
  estoque: number;
  msAtual: number | null;
  consumoDiario: number | null;
  estoquePara: number | null;
  status: SiloStatus;
  onClick?: () => void;
  dataFechamento?: string | null;
  dataAbertura?: string | null;
}

const statusConfig: Record<SiloStatus, { emoji: string; color: string; label: string }> = {
  Enchendo: { emoji: '🔵', color: 'bg-blue-500', label: 'Enchendo' },
  Fechado: { emoji: '🟡', color: 'bg-yellow-500', label: 'Fechado' },
  Aberto: { emoji: '🟢', color: 'bg-green-500', label: 'Aberto' },
  Vazio: { emoji: '⚫', color: 'bg-gray-500', label: 'Vazio' },
  Crítico: { emoji: '🟠', color: 'bg-orange-500', label: 'Crítico' },
  Esgotado: { emoji: '🔴', color: 'bg-red-500', label: 'Esgotado' },
};

/**
 * Retorna a capacidade do silo em toneladas.
 * Prioriza volume_ensilado_ton_mv (já em toneladas de MV).
 * Fallback: volume geométrico em m³ (indicativo, não é tonelada real).
 */
function getCapacidade(silo: Silo): number {
  if (silo.volume_ensilado_ton_mv) {
    return silo.volume_ensilado_ton_mv;
  }
  if (silo.comprimento_m && silo.largura_m && silo.altura_m) {
    return silo.comprimento_m * silo.largura_m * silo.altura_m;
  }
  return 0;
}

export function SiloCard({
  silo,
  estoque,
  msAtual,
  consumoDiario,
  estoquePara,
  status,
  onClick,
  dataFechamento,
  dataAbertura,
}: SiloCardProps) {
  const capacidade = getCapacidade(silo);
  const percentage = capacidade > 0
    ? Math.min(Math.round((estoque / capacidade) * 100), 100)
    : 0;
  const statusInfo = statusConfig[status] ?? statusConfig.Vazio;
  const progressLabel = `${silo.nome}: ${percentage}% de ocupação — ${estoque.toFixed(1)} de ${capacidade.toFixed(1)} toneladas`;

  return (
    <Card
      onClick={onClick}
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      role="article"
      aria-label={`Silo ${silo.nome}, ${statusInfo.label}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold">{silo.nome}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {silo.tipo}
              </Badge>
              <Badge className={`text-xs text-white ${statusInfo.color}`}>
                {statusInfo.emoji} {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Subtítulo: cultura ensilada */}
        {silo.cultura_ensilada ? (
          <p className="text-sm text-muted-foreground">{silo.cultura_ensilada}</p>
        ) : (
          <p className="text-sm text-amber-600 font-medium">⚠️ Sem cultura definida</p>
        )}

        {/* Barra de progresso do estoque */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-medium">{estoque.toFixed(1)} ton</span>
            <span className="text-muted-foreground">
              {capacidade > 0 ? `${capacidade.toFixed(1)} ton` : 'N/D'}
            </span>
          </div>
          <Progress
            value={percentage}
            className="h-2.5"
            aria-label={progressLabel}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage}%</span>
          </div>
        </div>

        {/* Linha: MS original | MS atual */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
          <div>
            <span className="text-muted-foreground">MS Original:</span>
            <p className="font-medium">
              {silo.materia_seca_percent ? `${silo.materia_seca_percent}%` : '-'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">MS Atual:</span>
            <p className="font-medium">{msAtual !== null ? `${msAtual}%` : '-'}</p>
          </div>
        </div>

        {/* Linha: Estoque para X dias | Consumo X ton/dia */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Estoque:</span>
            <p className="font-medium">
              {estoquePara !== null ? `${estoquePara} dias` : '-'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Consumo:</span>
            <p className="font-medium">
              {consumoDiario !== null ? `${consumoDiario.toFixed(2)} t/dia` : '-'}
            </p>
          </div>
        </div>

        {/* Linha: Fechado em dd/mm/yyyy | Aberto em dd/mm/yyyy */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Fechado em:</span>
            <p className="font-medium">
              {dataFechamento
                ? format(new Date(dataFechamento), 'dd/MM/yyyy', { locale: ptBR })
                : '-'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Aberto em:</span>
            <p className="font-medium">
              {dataAbertura
                ? format(new Date(dataAbertura), 'dd/MM/yyyy', { locale: ptBR })
                : '-'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
