'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Talhao, type CicloAgricola } from '@/lib/types/talhoes';
import { Map, Sprout } from 'lucide-react';
import { getStatusDisplay } from '../helpers';

interface TalhaoCardProps {
  talhao: Talhao;
  cicloAtivo?: CicloAgricola;
  onClick?: () => void;
}

export function TalhaoCard({ talhao, cicloAtivo, onClick }: TalhaoCardProps) {
  const statusDisplay = getStatusDisplay(talhao.status);

  return (
    <Card
      className="rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">{talhao.nome}</CardTitle>
        <Map className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">{talhao.area_ha} ha</div>
          <div className="text-xs">Solo: {talhao.tipo_solo || 'Não informado'}</div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Badge style={{ backgroundColor: statusDisplay.color, color: 'white' }}>
            {statusDisplay.label}
          </Badge>
        </div>

        {cicloAtivo && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Sprout className="w-4 h-4 text-primary" />
              <div>
                <div className="font-medium">{cicloAtivo.cultura}</div>
                <div className="text-xs text-muted-foreground">
                  Plantio: {new Date(cicloAtivo.data_plantio).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
