'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Insumo } from '@/types/insumos';

interface AlertsSectionProps {
  criticos?: Insumo[];
}

export default function AlertsSection({ criticos = [] }: AlertsSectionProps) {
  if (!criticos.length) {
    return null;
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Alertas de Estoque Crítico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {criticos.slice(0, 5).map((insumo) => (
            <div key={insumo.id} className="flex justify-between items-center p-2 rounded bg-background text-sm">
              <div>
                <div className="font-medium">{insumo.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {insumo.estoque_atual} {insumo.unidade} (mín: {insumo.estoque_minimo})
                </div>
              </div>
              <Badge variant="destructive">Crítico</Badge>
            </div>
          ))}
          {criticos.length > 5 && (
            <p className="text-xs text-muted-foreground">+{criticos.length - 5} outros...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
