'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Database } from '@/types/supabase';

type ProdutoRow = Database['public']['Tables']['produtos']['Row'];

interface AlertsSectionProps {
  criticos?: ProdutoRow[];
}

export default function AlertsSection({ criticos = [] }: AlertsSectionProps) {
  if (!criticos.length) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Alertas de Estoque Crítico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {criticos.slice(0, 5).map((produto) => (
            <div
              key={produto.id}
              className="flex justify-between items-center p-2 rounded bg-background text-sm"
            >
              <div>
                <div className="font-medium">{produto.nome}</div>
                <div className="text-sm text-muted-foreground">
                  {produto.estoque_atual} {produto.unidade} (mín: {produto.estoque_minimo})
                </div>
              </div>
              <Badge variant="destructive">Crítico</Badge>
            </div>
          ))}
          {criticos.length > 5 && (
            <p className="text-sm text-muted-foreground">+{criticos.length - 5} outros...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
