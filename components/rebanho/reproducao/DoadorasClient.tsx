'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DoadoraFormDialog } from '@/components/rebanho/reproducao/DoadoraFormDialog';
import { DoadoraListagem } from '@/components/rebanho/reproducao/DoadoraListagem';
import type { Doadora } from '@/lib/types/rebanho-doadoras';

interface AnimalOption {
  id: string;
  brinco: string;
  nome: string | null;
}

interface DoadorasClientProps {
  initialDoadoras: Doadora[];
  isAdmin: boolean;
  especie?: 'leiteiro' | 'corte' | 'dupla_aptidao';
  /** Fêmeas ativas do rebanho — para doadoras internas. */
  animaisFemea: AnimalOption[];
}

export function DoadorasClient({
  initialDoadoras,
  isAdmin,
  especie = 'dupla_aptidao',
  animaisFemea,
}: DoadorasClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Doadora | null>(null);
  const router = useRouter();

  const handleEdit = (doadora: Doadora) => {
    setSelected(doadora);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelected(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Doadoras de oócitos para FIV/OPU — internas (do rebanho) ou externas.
        </p>
        {isAdmin && (
          <Button
            onClick={() => {
              setSelected(null);
              setIsFormOpen(true);
            }}
            className="h-12"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Doadora
          </Button>
        )}
      </div>

      <DoadoraListagem
        doadoras={initialDoadoras}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={() => router.refresh()}
      />

      <DoadoraFormDialog
        doadora={selected ?? undefined}
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
        especiePadrao={especie}
        animaisFemea={animaisFemea}
      />
    </div>
  );
}
