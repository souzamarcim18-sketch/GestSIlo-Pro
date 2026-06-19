'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Talhao, type CicloAgricola } from '@/lib/types/talhoes';
import { type Profile } from '@/lib/supabase';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { getStatusDisplay } from '../helpers';

interface TalhaoDetailHeaderProps {
  talhao: Talhao;
  cicloAtivo?: CicloAgricola;
  onEdit?: () => void;
  onDelete?: () => void;
  profile?: Profile | null;
}

export function TalhaoDetailHeader({
  talhao,
  cicloAtivo,
  onEdit,
  onDelete,
  profile,
}: TalhaoDetailHeaderProps) {
  const router = useRouter();
  const statusDisplay = getStatusDisplay(talhao.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{talhao.nome}</h2>
          <div className="flex items-center gap-2">
            <Badge style={{ backgroundColor: statusDisplay.color, color: 'white' }}>
              {statusDisplay.label}
            </Badge>
            <span className="text-sm text-muted-foreground">{talhao.area_ha} ha</span>
            {cicloAtivo && (
              <span className="text-sm text-primary">
                • {cicloAtivo.cultura}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </Button>
          {profile?.perfil === 'Administrador' && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Deletar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
