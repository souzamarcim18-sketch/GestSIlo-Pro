'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ReprodutorFormDialog } from '@/components/rebanho/reproducao/ReprodutorFormDialog';
import { ReprodutorListagem } from '@/components/rebanho/reproducao/ReprodutorListagem';
import type { Reprodutor } from '@/lib/types/rebanho-reproducao';

// TODO: Substituir por query ao banco após criar actions.ts
const MOCK_REPRODUTORES: Reprodutor[] = [
  {
    id: '1',
    fazenda_id: 'fazenda-1',
    nome: 'Touro Lider',
    tipo: 'touro',
    raca: 'Holandês',
    numero_registro: 'HOL123456',
    data_entrada: '2024-01-15',
    observacoes: 'Reprodutor de elite',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    fazenda_id: 'fazenda-1',
    nome: 'Genética Premium IA',
    tipo: 'semen_ia',
    raca: 'Girolando',
    numero_registro: 'GIR789012',
    data_entrada: '2024-02-20',
    observacoes: '',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function ReprodutoresPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReprodutor, setSelectedReprodutor] = useState<Reprodutor | null>(null);
  const [reprodutores, setReprodutores] = useState<Reprodutor[]>(MOCK_REPRODUTORES);

  // TODO: Obter profile do AuthProvider
  const isAdmin = true;

  const handleEdit = (reprodutor: Reprodutor) => {
    setSelectedReprodutor(reprodutor);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setReprodutores(reprodutores.filter(r => r.id !== id));
  };

  const handleFormSuccess = () => {
    // TODO: Revalidar dados do banco
    setIsFormOpen(false);
    setSelectedReprodutor(null);
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
        reprodutores={reprodutores}
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
