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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 -ml-2 shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <h2 className="text-2xl font-bold tracking-tight">{talhao.nome}</h2>

      <Badge style={{ backgroundColor: statusDisplay.color, color: 'white' }}>
        {statusDisplay.label}
      </Badge>
      <span className="text-sm text-muted-foreground">{talhao.area_ha} ha</span>
      {cicloAtivo && (
        <span className="text-sm text-primary">• {cicloAtivo.cultura}</span>
      )}

      <div className="ml-auto flex gap-2">
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
  );
}
