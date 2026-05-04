'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, AlertCircle, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { deletarEventoReprodutivo } from '@/app/dashboard/rebanho/reproducao/actions';
import { ReproducaoStats } from './ReproducaoStats';
import { getAllEventosLocais } from '@/lib/db/eventosRebanho';
import { getSyncStatus } from '@/lib/db/syncQueue';
import { useSyncContext } from './ReproducaoSyncProvider';
import type { EventoReprodutivo } from '@/lib/types/rebanho-reproducao';
import type { EventoReprodutivoLocal } from '@/lib/db/eventosRebanho';

interface EventosListagemProps {
  eventos: EventoReprodutivo[];
  isAdmin: boolean;
}

const tipoEventoMap: Record<string, string> = {
  cobertura: 'Cobertura',
  diagnostico: 'Diagnóstico',
  diagnostico_prenhez: 'Diagnóstico',
  parto: 'Parto',
  desmame: 'Desmame',
  secagem: 'Secagem',
  aborto: 'Aborto',
  descarte: 'Descarte',
};

interface EventoLocalUi {
  id: string;
  tipo: string;
  data_evento: string;
  animal_id: string;
  sync_status: 'pending' | 'syncing' | 'error';
  error_message?: string;
  is_local: true;
}

export function EventosListagem({ eventos, isAdmin }: EventosListagemProps) {
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [eventosLocais, setEventosLocais] = useState<EventoLocalUi[]>([]);
  const { syncNow } = useSyncContext();

  const filtrados = useMemo(() => {
    let resultado: Array<EventoReprodutivo | EventoLocalUi> = [...eventos];

    // Aplicar filtros ao servidor
    if (tipoFiltro) {
      resultado = resultado.filter(
        (e) => e.tipo === tipoFiltro || (e.tipo === 'diagnostico_prenhez' && tipoFiltro === 'diagnostico')
      );
    }

    if (dataInicio) {
      resultado = resultado.filter((e) => e.data_evento >= dataInicio);
    }

    if (dataFim) {
      resultado = resultado.filter((e) => e.data_evento <= dataFim);
    }

    // Aplicar mesmos filtros aos eventos locais e colocar no topo
    let locaisFiltrados = [...eventosLocais];
    if (tipoFiltro) {
      locaisFiltrados = locaisFiltrados.filter(
        (e) => e.tipo === tipoFiltro || (e.tipo === 'diagnostico_prenhez' && tipoFiltro === 'diagnostico')
      );
    }
    if (dataInicio) {
      locaisFiltrados = locaisFiltrados.filter((e) => e.data_evento >= dataInicio);
    }
    if (dataFim) {
      locaisFiltrados = locaisFiltrados.filter((e) => e.data_evento <= dataFim);
    }

    // Mesclar: locais primeiro, depois servidor, ordenados por data
    const merged = [...locaisFiltrados, ...resultado];
    return merged.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());
  }, [eventos, eventosLocais, tipoFiltro, dataInicio, dataFim]);

  const itemsPorPagina = 50;
  const paginas = Math.ceil(filtrados.length / itemsPorPagina);
  const inicio = (currentPage - 1) * itemsPorPagina;
  const fim = inicio + itemsPorPagina;
  const eventosPaginados = filtrados.slice(inicio, fim);

  useEffect(() => {
    const carregarEventosLocais = async () => {
      const locais = await getAllEventosLocais();
      const syncStatus = await getSyncStatus();

      const eventosUi: EventoLocalUi[] = locais.map((evento) => ({
        id: evento.id,
        tipo: evento.tipo_evento,
        data_evento: evento.data_evento,
        animal_id: evento.animal_id,
        sync_status: evento._sync_status === 'pending' ? 'pending' : evento._sync_status === 'error' ? 'error' : 'pending',
        is_local: true,
      }));

      setEventosLocais(eventosUi);
    };

    carregarEventosLocais();
    const interval = setInterval(carregarEventosLocais, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;

    setIsDeleting(id);
    try {
      const result = await deletarEventoReprodutivo(id);
      if (!result.success) {
        throw new Error(result.erro || 'Erro ao deletar evento');
      }
      toast.success('Evento deletado com sucesso');
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar evento');
    } finally {
      setIsDeleting(null);
    }
  };

  const SyncStatusBadgeRow = ({ status, errorMessage }: { status: string; errorMessage?: string }) => {
    if (status === 'synced' || !status) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Sincronizado
        </Badge>
      );
    }
    if (status === 'pending') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-amber-100 text-amber-800">
          <Clock className="h-3 w-3" />
          Pendente
        </Badge>
      );
    }
    if (status === 'error') {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Erro
          </Badge>
          {errorMessage && (
            <span className="text-xs text-muted-foreground" title={errorMessage}>
              ?
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  const resumoPayload = (evento: EventoReprodutivo | EventoLocalUi) => {
    if ('is_local' in evento) {
      // Evento local — não tem dados específicos, apenas tipo
      return '—';
    }

    switch (evento.tipo) {
      case 'cobertura':
        return evento.tipo_cobertura ? tipoEventoMap[evento.tipo_cobertura] : '—';
      case 'diagnostico_prenhez':
        return evento.resultado_prenhez ? evento.resultado_prenhez : '—';
      case 'parto':
        return evento.gemelar ? 'Gemelar' : 'Único';
      case 'secagem':
      case 'aborto':
      case 'descarte':
        return 'Registrado';
      default:
        return '—';
    }
  };

  if (filtrados.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <ReproducaoStats eventos={eventos} />
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum evento reprodutivo encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <ReproducaoStats eventos={eventos} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tipo-filtro">Tipo de Evento</Label>
          <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v ?? '')}>
            <SelectTrigger id="tipo-filtro">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="cobertura">Cobertura</SelectItem>
              <SelectItem value="diagnostico">Diagnóstico</SelectItem>
              <SelectItem value="parto">Parto</SelectItem>
              <SelectItem value="secagem">Secagem</SelectItem>
              <SelectItem value="aborto">Aborto</SelectItem>
              <SelectItem value="descarte">Descarte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="data-inicio">Data Inicial</Label>
          <Input
            id="data-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => {
              setDataInicio(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data-fim">Data Final</Label>
          <Input
            id="data-fim"
            type="date"
            value={dataFim}
            onChange={(e) => {
              setDataFim(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Animal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventosPaginados.map((evento) => {
              const isLocal = 'is_local' in evento;
              const syncStatus = isLocal ? evento.sync_status : 'synced';
              const errorMessage = isLocal ? evento.error_message : undefined;

              return (
                <TableRow key={evento.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(evento.data_evento), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-semibold">{evento.animal_id.slice(0, 8)}</TableCell>
                  <TableCell>{tipoEventoMap[evento.tipo] || evento.tipo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {resumoPayload(evento)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <SyncStatusBadgeRow status={syncStatus} errorMessage={errorMessage} />
                      {isLocal && syncStatus === 'error' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setIsSyncing(evento.id);
                            try {
                              await syncNow();
                            } finally {
                              setIsSyncing(null);
                            }
                          }}
                          disabled={isSyncing === evento.id}
                          className="h-6 w-6 p-0"
                          title="Tentar sincronizar"
                        >
                          <RefreshCw className={`h-3 w-3 ${isSyncing === evento.id ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(evento.id)}
                        disabled={isDeleting === evento.id}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {paginas} ({filtrados.length} eventos)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(paginas, currentPage + 1))}
              disabled={currentPage === paginas}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
