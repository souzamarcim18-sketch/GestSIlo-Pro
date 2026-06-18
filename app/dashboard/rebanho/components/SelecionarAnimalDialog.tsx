'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Animal } from '@/lib/types/rebanho';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animais: Animal[];
}

/**
 * Modal de seleção de animal para registrar um evento individual.
 * Filtra por brinco ou nome e navega para a ficha de registro de evento.
 */
export function SelecionarAnimalDialog({ open, onOpenChange, animais }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState('');

  const animaisFiltrados = useMemo(() => {
    const ativos = animais.filter((a) => a.status === 'Ativo');
    const termo = busca.trim().toLowerCase();
    if (!termo) return ativos;
    return ativos.filter(
      (a) =>
        a.brinco?.toLowerCase().includes(termo) ||
        a.nome?.toLowerCase().includes(termo)
    );
  }, [animais, busca]);

  const handleSelecionar = (animalId: string) => {
    onOpenChange(false);
    router.push(`/dashboard/rebanho/${animalId}/evento`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar animal</DialogTitle>
          <DialogDescription>
            Escolha o animal para registrar o evento.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            placeholder="Buscar por brinco ou nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border border-border/50">
          {animaisFiltrados.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Nenhum animal ativo encontrado.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {animaisFiltrados.map((animal) => (
                <li key={animal.id}>
                  <button
                    type="button"
                    onClick={() => handleSelecionar(animal.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{animal.brinco}</span>
                      {animal.nome && (
                        <span className="text-muted-foreground">{animal.nome}</span>
                      )}
                    </span>
                    {animal.categoria && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {animal.categoria}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
