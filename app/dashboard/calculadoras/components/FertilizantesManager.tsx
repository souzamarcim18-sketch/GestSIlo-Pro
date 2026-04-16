'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FERTILIZANTES_PADRAO,
  loadFertilizantesCustomizados,
  saveFertilizantesCustomizados,
  addFertilizanteCustomizado,
  deleteFertilizanteCustomizado,
  updatePrecosCustomizados,
} from '@/lib/calculadoras';
import type { Fertilizante } from '@/lib/calculadoras';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FertilizantesManagerProps {
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onFertilizantesChange?: () => void;
}

export function FertilizantesManager({
  selectedIds = [],
  onSelectionChange,
  onFertilizantesChange,
}: FertilizantesManagerProps) {
  const [fertilizantes, setFertilizantes] = useState<Fertilizante[]>([]);
  const [customizados, setCustomizados] = useState<Fertilizante[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    teor_n_percent: 0,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 0,
  });
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const loadFertilizantes = useCallback(() => {
    const customizados = loadFertilizantesCustomizados();
    const todos = [...FERTILIZANTES_PADRAO, ...customizados];
    setFertilizantes(todos);
    setCustomizados(customizados);

    // Carregar preços customizados do localStorage
    const precosEditados = localStorage.getItem('gestsilo_precos_editados');
    if (precosEditados) {
      setEditingPrices(JSON.parse(precosEditados));
    }
  }, []);

  useEffect(() => {
    loadFertilizantes();
  }, [loadFertilizantes]);

  useEffect(() => {
    setSelected(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);

  function handleAddFertilizante() {
    if (!formData.nome.trim()) {
      toast.error('Nome do fertilizante é obrigatório');
      return;
    }

    try {
      addFertilizanteCustomizado({
        nome: formData.nome,
        teor_n_percent: formData.teor_n_percent,
        teor_p_percent: formData.teor_p_percent,
        teor_k_percent: formData.teor_k_percent,
        preco_saco_50kg: formData.preco_saco_50kg,
        unidade: 'kg',
      });

      toast.success('Fertilizante adicionado com sucesso');
      setFormData({
        nome: '',
        teor_n_percent: 0,
        teor_p_percent: 0,
        teor_k_percent: 0,
        preco_saco_50kg: 0,
      });
      setShowAddDialog(false);
      loadFertilizantes();
      onFertilizantesChange?.();
    } catch {
      toast.error('Erro ao adicionar fertilizante');
    }
  }

  function handleDeleteFertilizante(id: string) {
    try {
      deleteFertilizanteCustomizado(id);
      toast.success('Fertilizante removido');
      setSelected(selected.filter(sid => sid !== id));
      loadFertilizantes();
      onFertilizantesChange?.();
    } catch {
      toast.error('Erro ao remover fertilizante');
    }
  }

  function handlePriceChange(id: string, newPrice: number) {
    const updated = { ...editingPrices, [id]: newPrice };
    setEditingPrices(updated);
    localStorage.setItem('gestsilo_precos_editados', JSON.stringify(updated));
    updatePrecosCustomizados(updated);
  }

  function getDisplayPrice(fertilizante: Fertilizante): number {
    return editingPrices[fertilizante.id] ?? fertilizante.preco_saco_50kg;
  }

  function toggleSelection(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fertilizantes Disponíveis</CardTitle>
          <CardDescription>
            Selecione os fertilizantes a usar na otimização. Você pode editar preços e adicionar customizados.
          </CardDescription>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Fertilizante Customizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Fertilizante</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: NPK 10-10-10"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="n">N %</Label>
                  <Input
                    id="n"
                    type="number"
                    value={formData.teor_n_percent}
                    onChange={e => setFormData({ ...formData, teor_n_percent: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p">P %</Label>
                  <Input
                    id="p"
                    type="number"
                    value={formData.teor_p_percent}
                    onChange={e => setFormData({ ...formData, teor_p_percent: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="k">K %</Label>
                  <Input
                    id="k"
                    type="number"
                    value={formData.teor_k_percent}
                    onChange={e => setFormData({ ...formData, teor_k_percent: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco">Preço (R$/saco 50kg)</Label>
                <Input
                  id="preco"
                  type="number"
                  value={formData.preco_saco_50kg}
                  onChange={e => setFormData({ ...formData, preco_saco_50kg: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                />
              </div>
              <Button onClick={handleAddFertilizante} className="w-full">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        {fertilizantes.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum fertilizante disponível. Adicione fertilizantes customizados para usar a calculadora.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selected.length === fertilizantes.length && fertilizantes.length > 0}
                      onCheckedChange={checked => {
                        setSelected(checked ? fertilizantes.map(f => f.id) : []);
                      }}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">N-P-K (%)</TableHead>
                  <TableHead className="text-right">Preço (R$/saco)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fertilizantes.map(fert => (
                  <TableRow key={fert.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(fert.id)}
                        onCheckedChange={() => toggleSelection(fert.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {fert.nome}
                        {fert.customizado && (
                          <Badge variant="secondary" className="text-xs">
                            Customizado
                          </Badge>
                        )}
                        {!fert.customizado && (
                          <Badge variant="outline" className="text-xs">
                            Padrão
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {fert.teor_n_percent}-{fert.teor_p_percent}-{fert.teor_k_percent}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm">R$</span>
                        <Input
                          type="number"
                          value={getDisplayPrice(fert)}
                          onChange={e => handlePriceChange(fert.id, parseFloat(e.target.value) || 0)}
                          step="0.01"
                          className="w-24 text-right"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {fert.customizado && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFertilizante(fert.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {selected.length > 0 && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <strong>{selected.length}</strong> fertilizante(s) selecionado(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
