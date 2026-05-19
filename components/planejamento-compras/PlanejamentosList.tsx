'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Pencil, Ban, Trash2, ChevronRight } from 'lucide-react';
import { cancelarPlanejamentoAction } from '@/app/dashboard/planejamento-compras/actions';
import DeletePlanejamentoDialog from './DeletePlanejamentoDialog';
import type { PlanejamentoAtividadeComDetalhes, StatusPlanejamento } from '@/lib/types/planejamento-compras';

const STATUS_LABEL: Record<StatusPlanejamento, string> = {
  planejada: 'Planejada',
  executada: 'Executada',
  cancelada: 'Cancelada',
};

const STATUS_CLASS: Record<StatusPlanejamento, string> = {
  planejada: 'bg-[rgba(0,196,90,0.09)] text-[#00c45a] border-[rgba(0,196,90,0.2)]',
  executada: 'bg-[rgba(59,130,246,0.09)] text-blue-400 border-[rgba(59,130,246,0.2)]',
  cancelada: 'bg-[rgba(107,114,128,0.09)] text-muted-foreground border-[rgba(107,114,128,0.2)]',
};

interface PlanejamentosListProps {
  planejamentos: PlanejamentoAtividadeComDetalhes[];
  isAdmin: boolean;
  onRefresh?: () => void;
  onEdit?: (planejamento: PlanejamentoAtividadeComDetalhes) => void;
  loading?: boolean;
}

export default function PlanejamentosList({
  planejamentos,
  isAdmin,
  onRefresh,
  onEdit,
  loading = false,
}: PlanejamentosListProps) {
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusPlanejamento | 'todos'>('todos');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; descricao: string } | null>(null);

  async function handleCancelar(id: string) {
    setCancelingId(id);
    const result = await cancelarPlanejamentoAction(id);
    setCancelingId(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Atividade cancelada');
      onRefresh?.();
    }
  }

  const filtered = planejamentos.filter((p) => {
    const matchSearch =
      !search ||
      p.talhao.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.tipo_operacao.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFiltro === 'todos' || p.status === statusFiltro;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Buscar por talhão ou operação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm sm:max-w-xs"
        />
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as StatusPlanejamento | 'todos')}>
          <SelectTrigger className="text-sm sm:w-44">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="planejada">Planejada</SelectItem>
            <SelectItem value="executada">Executada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {planejamentos.length === 0
            ? 'Nenhuma atividade planejada ainda.'
            : 'Nenhuma atividade encontrada com os filtros aplicados.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border/40">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Talhão</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operação</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data Prevista</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Insumos</th>
                <th className="py-2.5 px-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 text-sm font-medium">{p.talhao.nome}</td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground">{p.tipo_operacao}</td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground">
                    {format(new Date(p.data_prevista + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className={STATUS_CLASS[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground">
                    {p.insumos.length > 0
                      ? `${p.insumos.length} insumo${p.insumos.length !== 1 ? 's' : ''}`
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 justify-end">
                      {isAdmin && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit?.(p)}
                            aria-label="Editar atividade"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {p.status !== 'cancelada' && p.status !== 'executada' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-yellow-400"
                              onClick={() => handleCancelar(p.id)}
                              disabled={cancelingId === p.id}
                              aria-label="Cancelar atividade"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                            onClick={() =>
                              setDeleteTarget({
                                id: p.id,
                                descricao: `${p.tipo_operacao} — ${p.talhao.nome}`,
                              })
                            }
                            aria-label="Excluir atividade"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Link href={`/dashboard/planejamento-compras/${p.id}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          aria-label="Ver detalhes"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeletePlanejamentoDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        planejamentoId={deleteTarget?.id}
        descricao={deleteTarget?.descricao}
        onSuccess={onRefresh}
      />
    </div>
  );
}
