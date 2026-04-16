'use client';

import { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Trash2, Edit } from 'lucide-react';

interface TabelaHistoricoProps {
  planejamentos: PlanejamentoSilagem[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function TabelaHistorico({
  planejamentos,
  onView,
  onEdit,
  onDelete,
  isLoading,
}: TabelaHistoricoProps) {
  if (planejamentos.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum planejamento salvo ainda
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo de Rebanho</TableHead>
            <TableHead>Sistema</TableHead>
            <TableHead>Data Criação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planejamentos.map((planejamento) => (
            <TableRow key={planejamento.id}>
              <TableCell className="font-medium">{planejamento.nome}</TableCell>
              <TableCell>{planejamento.sistema.tipo_rebanho}</TableCell>
              <TableCell className="capitalize">
                {planejamento.sistema.sistema_producao.replace('-', ' ')}
              </TableCell>
              <TableCell>
                {new Date(planejamento.created_at).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(planejamento.id)}
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(planejamento.id)}
                  title="Editar nome"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(planejamento.id)}
                  className="text-destructive hover:text-destructive"
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
