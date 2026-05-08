'use client';

import { Button } from '@/components/ui/button';
import {
  Activity,
  Zap,
  Heart,
  Baby,
  Droplet,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import type { TipoEventoReprodutivo } from '../RegistroEventoDialog';

interface TipoEventoSelectorProps {
  onSelect: (tipo: TipoEventoReprodutivo) => void;
}

const TIPOS_EVENTO: Array<{
  tipo: TipoEventoReprodutivo;
  label: string;
  descricao: string;
  icon: React.ReactNode;
}> = [
  {
    tipo: 'cobertura',
    label: 'Cobertura / Monta',
    descricao: 'Registrar cobertura (monta natural ou IA)',
    icon: <Heart className="h-5 w-5" />,
  },
  {
    tipo: 'diagnostico_prenhez',
    label: 'Diagnóstico de Prenhez',
    descricao: 'Resultado de ultrassom, palpação ou sangue',
    icon: <Zap className="h-5 w-5" />,
  },
  {
    tipo: 'parto',
    label: 'Parto',
    descricao: 'Registrar parto e crias nascidas',
    icon: <Baby className="h-5 w-5" />,
  },
  {
    tipo: 'secagem',
    label: 'Secagem',
    descricao: 'Registrar secagem de lactação',
    icon: <Droplet className="h-5 w-5" />,
  },
  {
    tipo: 'aborto',
    label: 'Aborto / Perda',
    descricao: 'Registrar aborto ou perda gestacional',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    tipo: 'descarte',
    label: 'Descarte',
    descricao: 'Registrar descarte do animal',
    icon: <Trash2 className="h-5 w-5" />,
  },
];

export function TipoEventoSelector({ onSelect }: TipoEventoSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 py-4">
      {TIPOS_EVENTO.map((tipo) => (
        <Button
          key={tipo.tipo}
          variant="outline"
          className="h-auto justify-start gap-3 p-3"
          onClick={() => onSelect(tipo.tipo)}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="text-muted-foreground">{tipo.icon}</div>
            <div className="text-left">
              <div className="font-semibold text-sm">{tipo.label}</div>
              <div className="text-xs text-muted-foreground">{tipo.descricao}</div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
