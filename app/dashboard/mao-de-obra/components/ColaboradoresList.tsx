'use client';

import { useState } from 'react';
import { Pencil, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { DeleteColaboradorDialog } from './DeleteColaboradorDialog';
import type { Colaborador } from '@/lib/types/mao-de-obra';

interface ColaboradoresListProps {
  colaboradores: Colaborador[];
  isAdmin: boolean;
  onEdit: (c: Colaborador) => void;
  onRefresh: () => void;
}

const VINCULO_LABELS: Record<string, string> = {
  CLT: 'CLT',
  Diarista: 'Diarista',
  Empreiteiro: 'Empreiteiro',
  Familiar: 'Familiar',
};

export function ColaboradoresList({ colaboradores, isAdmin, onEdit, onRefresh }: ColaboradoresListProps) {
  const [deletando, setDeletando] = useState<Colaborador | null>(null);

  if (colaboradores.length === 0) {
    return (
      <div
        className="rounded-lg p-10 text-center"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
        {isAdmin && (
          <p className="text-xs text-muted-foreground mt-1">
            Clique em &quot;Novo Colaborador&quot; para começar.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Função</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Vínculo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Valor ref.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              {isAdmin && (
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((c, i) => (
              <tr
                key={c.id}
                style={{
                  background: i % 2 === 0 ? '#1c1c1c' : '#222222',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.funcao}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {VINCULO_LABELS[c.vinculo] ?? c.vinculo}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {formatBRL(c.valor_ref)}/{c.tipo_valor === 'diaria' ? 'dia' : 'h'}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      c.ativo
                        ? 'border-green-700 text-green-400 bg-green-950/30 text-xs'
                        : 'border-red-800 text-red-400 bg-red-950/30 text-xs'
                    }
                  >
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(c)}
                        title="Editar colaborador"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => setDeletando(c)}
                        title={c.ativo ? 'Desativar colaborador' : 'Remover colaborador'}
                      >
                        <span className="text-xs">✕</span>
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deletando && (
        <DeleteColaboradorDialog
          colaborador={deletando}
          isOpen
          onClose={() => setDeletando(null)}
          onSuccess={() => {
            setDeletando(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
