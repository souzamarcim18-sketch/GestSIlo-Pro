'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { type Talhao } from '@/lib/types/talhoes';
import { type Profile } from '@/lib/supabase';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';

interface TalhaoDetailHeaderProps {
  talhao: Talhao;
  onEdit?: () => void;
  onDelete?: () => void;
  profile?: Profile | null;
}

export function TalhaoDetailHeader({
  talhao,
  onEdit,
  onDelete,
  profile,
}: TalhaoDetailHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2 -ml-2 shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-primary">{talhao.nome}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{talhao.area_ha} ha</p>
        </div>

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
    </div>
  );
}
