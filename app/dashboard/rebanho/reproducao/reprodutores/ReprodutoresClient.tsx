'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ReprodutorFormDialog } from '@/components/rebanho/reproducao/ReprodutorFormDialog';
import { ReprodutorListagem } from '@/components/rebanho/reproducao/ReprodutorListagem';
import type { Reprodutor } from '@/lib/types/rebanho-reproducao';

interface ReprodutoresClientProps {
  initialReprodutores: Reprodutor[];
  isAdmin: boolean;
}

export function ReprodutoresClient({ initialReprodutores, isAdmin }: ReprodutoresClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReprodutor, setSelectedReprodutor] = useState<Reprodutor | null>(null);
  const router = useRouter();

  const handleEdit = (reprodutor: Reprodutor) => {
    setSelectedReprodutor(reprodutor);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    router.refresh();
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedReprodutor(null);
    router.refresh();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reprodutores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os reprodutores e sêmen da sua fazenda
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => {
            setSelectedReprodutor(null);
            setIsFormOpen(true);
          }} className="h-12">
            <Plus className="mr-2 h-4 w-4" />
            Novo Reprodutor
          </Button>
        )}
      </div>

      <ReprodutorListagem
        reprodutores={initialReprodutores}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ReprodutorFormDialog
        reprodutor={selectedReprodutor ?? undefined}
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
