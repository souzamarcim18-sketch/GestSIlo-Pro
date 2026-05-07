'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { listProducoesLeiteiras } from '@/lib/supabase/rebanho-leiteira';
import {
  criarProducaoLeiteiraAction,
  editarProducaoLeiteiraAction,
  deletarProducaoLeiteiraAction,
} from '@/app/dashboard/rebanho/leiteira/actions';
import type { ProducaoLeiteira } from '@/lib/types/rebanho-leiteira';
import type { Animal } from '@/lib/types/rebanho';

interface AbaProducaoLeiteiraProps {
  animal: Animal;
  isAdmin: boolean;
  canRegister: boolean;
}

const TURNO_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  dia_inteiro: 'Dia Inteiro',
};

export function AbaProducaoLeiteira({ animal, isAdmin, canRegister }: AbaProducaoLeiteiraProps) {
  const [producoes, setProducoes] = useState<ProducaoLeiteira[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [editando, setEditando] = useState<ProducaoLeiteira | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    turno: 'dia_inteiro' as any,
    volume_litros: '',
    observacoes: '',
  });

  useEffect(() => {
    fetchProducoes();
  }, [animal.id]);

  const fetchProducoes = async () => {
    setLoading(true);
    try {
      const data = await listProducoesLeiteiras(animal.id, 100, 0);
      setProducoes(data);
    } catch (err) {
      toast.error('Erro ao carregar produções');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      animal_id: animal.id,
      ...formData,
      volume_litros: parseFloat(formData.volume_litros),
    };

    try {
      if (editando) {
        const result = await editarProducaoLeiteiraAction(editando.id, payload);
        if (result.success) {
          toast.success('Produção atualizada com sucesso');
          setEditando(null);
        } else {
          toast.error(result.error || 'Erro ao atualizar produção');
        }
      } else {
        const result = await criarProducaoLeiteiraAction(payload);
        if (result.success) {
          toast.success('Produção registrada com sucesso');
        } else {
          toast.error(result.error || 'Erro ao registrar produção');
        }
      }

      setFormData({
        data: new Date().toISOString().split('T')[0],
        turno: 'dia_inteiro',
        volume_litros: '',
        observacoes: '',
      });
      setIsOpenDialog(false);
      fetchProducoes();
    } catch (err) {
      toast.error('Erro ao processar produção');
    }
  };

  const handleEdit = (producao: ProducaoLeiteira) => {
    setEditando(producao);
    setFormData({
      data: producao.data,
      turno: producao.turno,
      volume_litros: producao.volume_litros.toString(),
      observacoes: producao.observacoes || '',
    });
    setIsOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja deletar esta produção?')) return;

    try {
      const result = await deletarProducaoLeiteiraAction(id);
      if (result.success) {
        toast.success('Produção deletada com sucesso');
        fetchProducoes();
      } else {
        toast.error(result.error || 'Erro ao deletar produção');
      }
    } catch (err) {
      toast.error('Erro ao deletar produção');
    }
  };

  // Status de lactação
  const statusLactacao = (() => {
    if (animal.status_reprodutivo === 'lactacao') {
      if (!animal.data_ultimo_parto) return 'Em lactação';
      const diasSdeParto = Math.floor(
        (new Date().getTime() - new Date(animal.data_ultimo_parto).getTime()) / (1000 * 60 * 60 * 24)
      );
      return `Em lactação — Dia ${diasSdeParto}`;
    }
    if (animal.status_reprodutivo === 'seca') {
      if (animal.data_parto_previsto) {
        return `Período seco — Parto previsto em ${new Date(animal.data_parto_previsto).toLocaleDateString('pt-BR')}`;
      }
      return 'Período seco';
    }
    return 'Sem lactação registrada';
  })();

  // Média de produção
  const producaoMediaDiaria = producoes.length > 0
    ? producoes.reduce((acc, p) => acc + p.volume_litros, 0) / 30
    : 0;

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status de Lactação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Status Atual</p>
            <p className="text-lg font-semibold">{statusLactacao}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Produção Média Diária</p>
            <p className="text-lg font-semibold">{producaoMediaDiaria.toFixed(1)} L/dia</p>
          </div>
        </CardContent>
      </Card>

      {/* Botão Registrar */}
      {canRegister && (
        <Button onClick={() => {
          setEditando(null);
          setFormData({
            data: new Date().toISOString().split('T')[0],
            turno: 'dia_inteiro',
            volume_litros: '',
            observacoes: '',
          });
          setIsOpenDialog(true);
        }} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Registrar Produção
        </Button>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Produções</CardTitle>
          <CardDescription>Últimas 30 produções registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : producoes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma produção registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Observações</TableHead>
                    {(isAdmin || canRegister) && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {producoes.map((producao) => (
                    <TableRow key={producao.id}>
                      <TableCell>{new Date(producao.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{TURNO_LABELS[producao.turno] || producao.turno}</TableCell>
                      <TableCell className="font-medium">{producao.volume_litros.toFixed(1)} L</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {producao.observacoes || '—'}
                      </TableCell>
                      {(isAdmin || canRegister) && (
                        <TableCell className="text-right space-x-2">
                          {canRegister && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(producao)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(producao.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Registrar/Editar */}
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Produção' : 'Registrar Produção'}</DialogTitle>
            <DialogDescription>
              Animal: {animal.brinco}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="turno">Turno</Label>
              <Select
                value={formData.turno}
                onValueChange={(value) => setFormData({ ...formData, turno: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                  <SelectItem value="dia_inteiro">Dia Inteiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="volume">Volume (L)</Label>
              <Input
                id="volume"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.volume_litros}
                onChange={(e) => setFormData({ ...formData, volume_litros: e.target.value })}
                placeholder="0.0"
                required
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Notas adicionais..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpenDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editando ? 'Atualizar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
