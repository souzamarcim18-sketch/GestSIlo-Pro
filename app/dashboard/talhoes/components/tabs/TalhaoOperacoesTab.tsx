'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type CicloAgricola, type AtividadeCampo } from '@/lib/types/talhoes';
import { Plus, AlertCircle } from 'lucide-react';
import { AtividadeDialog } from '../dialogs/AtividadeDialog';

interface TalhaoOperacoesTabProps {
  talhaoId: string;
  talhaoAreaHa?: number;
  cicloAtivo?: CicloAgricola;
  atividades: AtividadeCampo[];
  onRefresh?: () => void;
}

const ITEMS_PER_PAGE = 20;

export function TalhaoOperacoesTab({
  talhaoId,
  talhaoAreaHa,
  cicloAtivo,
  atividades,
  onRefresh,
}: TalhaoOperacoesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrar atividades
  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((atividade) => {
      if (tipoFiltro && atividade.tipo_operacao !== tipoFiltro) return false;
      if (dataInicio && atividade.data < dataInicio) return false;
      if (dataFim && atividade.data > dataFim) return false;
      return true;
    });
  }, [atividades, tipoFiltro, dataInicio, dataFim]);

  // Paginação
  const totalPages = Math.ceil(atividadesFiltradas.length / ITEMS_PER_PAGE);
  const atividadesPaginadas = atividadesFiltradas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const tipos = Array.from(new Set(atividades.map((a) => a.tipo_operacao))).sort();

  if (!cicloAtivo) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Crie um ciclo agrícola antes de registrar atividades.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botão e Filtros */}
      <div className="flex justify-between items-start gap-4">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Atividade
        </Button>

        <div className="grid grid-cols-3 gap-3 flex-1">
          <div className="space-y-2">
            <Label className="text-xs">Tipo de Operação</Label>
            <Select value={tipoFiltro || ''} onValueChange={(v) => setTipoFiltro(v as string)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Atividades Registradas
            {atividadesFiltradas.length > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                ({atividadesFiltradas.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atividadesFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade registrada.
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo de Operação</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atividadesPaginadas.map((atividade) => (
                      <TableRow key={atividade.id}>
                        <TableCell>
                          {new Date(atividade.data).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {atividade.tipo_operacao}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {atividade.maquina_id ? 'Sim' : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {atividade.horas_maquina ? `${atividade.horas_maquina}h` : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {atividade.custo_total
                            ? `R$ ${atividade.custo_total.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground flex items-center px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <AtividadeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        talhaoId={talhaoId}
        talhaoAreaHa={talhaoAreaHa}
        cicloAtivo={cicloAtivo}
        onSuccess={() => {
          setIsDialogOpen(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}
