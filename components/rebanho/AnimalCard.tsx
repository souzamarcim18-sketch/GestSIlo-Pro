'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import type { Animal } from '@/lib/types/rebanho';
import { cn } from '@/lib/utils';

interface AnimalCardProps {
  animal: Animal;
  className?: string;
}

const statusColor = {
  Ativo: 'bg-green-100 text-green-800',
  Morto: 'bg-red-100 text-red-800',
  Vendido: 'bg-orange-100 text-orange-800',
} as const;

export function AnimalCard({ animal, className }: AnimalCardProps) {
  return (
    <Link href={`/dashboard/rebanho/${animal.id}`}>
      <Card
        className={cn(
          'hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full',
          className
        )}
      >
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-2xl font-bold text-blue-600">{animal.brinco}</p>
                <p className="text-sm text-muted-foreground mt-1">{animal.categoria}</p>
              </div>
              <Badge className={cn('text-xs font-medium', statusColor[animal.status])}>
                {animal.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-semibold">Sexo</p>
                <p className="font-medium">{animal.sexo === 'Macho' ? '♂ Macho' : '♀ Fêmea'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold">Peso</p>
                <p className="font-medium">
                  {animal.peso_atual ? `${animal.peso_atual.toFixed(1)} kg` : '—'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center text-blue-600 text-sm font-medium group">
              Ver detalhes
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
