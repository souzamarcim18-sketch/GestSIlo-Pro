'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { registrarMovimentacaoAction, listAnimaisAtivosAction, listLotesAction } from '../actions';
import type { Animal, Lote } from '@/lib/types/rebanho';

interface RegistrarMovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type TipoMovimentacao = 'nascimento' | 'compra' | 'venda' | 'morte' | 'descarte' | 'abate_proprio' | 'transferencia_lote';

export default function RegistrarMovimentacaoDialog({
  open,
  onOpenChange,
  onSuccess,
}: RegistrarMovimentacaoDialogProps) {
  const [tipo, setTipo] = useState<TipoMovimentacao | ''>('');
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [animalSelecionado, setAnimalSelecionado] = useState<string | null>('');
  const [animalEmLote, setAnimalEmLote] = useState(false);
  const [animaisSelecionados, setAnimaisSelecionados] = useState<string[]>([]);

  // Form fields
  const [dataEvento, setDataEvento] = useState(new Date().toISOString().split('T')[0]);
  const [fornecedor, setFornecedor] = useState<string | null>('');
  const [pesoEntrada, setPesoEntrada] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [comprador, setComprador] = useState<string | null>('');
  const [pesoSaida, setPesoSaida] = useState('');
  const [valorRecebido, setValorRecebido] = useState('');
  const [causaMorte, setCausaMorte] = useState<string | null>('');
  const [motivoDescarte, setMotivoDescarte] = useState<string | null>('');
  const [pesoAbate, setPesoAbate] = useState('');
  const [rendimentoCarcaca, setRendimentoCarcaca] = useState('52');
  const [loteDestino, setLoteDestino] = useState<string | null>('');
  const [observacoes, setObservacoes] = useState('');
  const [vendaEmLote, setVendaEmLote] = useState(false);
  const [transferenciaEmLote, setTransferenciaEmLote] = useState(false);

  // Carregar dados
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [animaisData, lotesData] = await Promise.all([
          listAnimaisAtivosAction(),
          listLotesAction(),
        ]);
        setAnimais(animaisData);
        setLotes(lotesData);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipo) {
      toast.error('Selecione um tipo de movimentação');
      return;
    }

    // Validações por tipo
    if (tipo === 'nascimento' && !animalSelecionado) {
      toast.error('Selecione um animal');
      return;
    }

    if (tipo === 'compra' && !animalSelecionado) {
      toast.error('Selecione um animal');
      return;
    }

    if (tipo === 'compra' && !fornecedor) {
      toast.error('Informe o fornecedor');
      return;
    }

    if ((tipo === 'venda' || tipo === 'transferencia_lote') && animaisSelecionados.length === 0) {
      toast.error('Selecione pelo menos um animal');
      return;
    }

    if (tipo === 'venda' && !comprador) {
      toast.error('Informe o comprador');
      return;
    }

    if (tipo === 'transferencia_lote' && !loteDestino) {
      toast.error('Selecione o lote de destino');
      return;
    }

    if (tipo === 'descarte' && !motivoDescarte) {
      toast.error('Informe o motivo do descarte');
      return;
    }

    if (tipo === 'abate_proprio' && !pesoAbate) {
      toast.error('Informe o peso de abate');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tipo,
        animal_id: animalSelecionado ?? undefined,
        animal_ids: animaisSelecionados.length > 0 ? animaisSelecionados : animalSelecionado ? [animalSelecionado] : [],
        data_evento: dataEvento,
        fornecedor: fornecedor ?? undefined,
        peso_entrada_kg: pesoEntrada ? parseFloat(pesoEntrada) : undefined,
        valor_pago: valorPago ? parseFloat(valorPago) : undefined,
        comprador: comprador ?? undefined,
        peso_saida_kg: pesoSaida ? parseFloat(pesoSaida) : undefined,
        valor_recebido: valorRecebido ? parseFloat(valorRecebido) : undefined,
        causa_morte: causaMorte ?? undefined,
        motivo_descarte: motivoDescarte ?? undefined,
        peso_abate_kg: pesoAbate ? parseFloat(pesoAbate) : undefined,
        rendimento_carcaca_pct: rendimentoCarcaca ? parseFloat(rendimentoCarcaca) : undefined,
        lote_destino_id: loteDestino ?? undefined,
        observacoes,
      };

      const result = await registrarMovimentacaoAction(payload);

      if (result.success) {
        toast.success('Movimentação registrada com sucesso');
        onOpenChange(false);
        resetForm();
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao registrar movimentação');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTipo('');
    setAnimalSelecionado('');
    setAnimaisSelecionados([]);
    setDataEvento(new Date().toISOString().split('T')[0]);
    setFornecedor('');
    setPesoEntrada('');
    setValorPago('');
    setComprador('');
    setPesoSaida('');
    setValorRecebido('');
    setCausaMorte('');
    setMotivoDescarte('');
    setPesoAbate('');
    setRendimentoCarcaca('52');
    setLoteDestino('');
    setObservacoes('');
    setVendaEmLote(false);
    setTransferenciaEmLote(false);
  };

  const toggleAnimalSelection = (animalId: string) => {
    setAnimaisSelecionados((prev) =>
      prev.includes(animalId) ? prev.filter((id) => id !== animalId) : [...prev, animalId]
    );
  };

  const getAnimalsPorLote = (loteId: string) => {
    return animais.filter((a) => a.lote_id === loteId);
  };

  const getLoteAtualAnimal = () => {
    const animal = animais.find((a) => a.id === animalSelecionado);
    return animal?.lote_id || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogDescription>
            Registre um novo evento de movimentação no rebanho
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo */}
          <div>
            <Label htmlFor="tipo">Tipo de Movimentação *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimentacao)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nascimento">Nascimento</SelectItem>
                <SelectItem value="compra">Compra</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="morte">Morte</SelectItem>
                <SelectItem value="descarte">Descarte</SelectItem>
                <SelectItem value="abate_proprio">Abate Próprio</SelectItem>
                <SelectItem value="transferencia_lote">Transferência entre Lotes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo && (
            <>
              {/* Data */}
              <div>
                <Label htmlFor="data_evento">Data do Evento *</Label>
                <Input
                  type="date"
                  id="data_evento"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  required
                />
              </div>

              {/* Campos específicos por tipo */}
              {tipo === 'nascimento' && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      O nascimento é registrado automaticamente ao cadastrar um novo animal com origem &quot;Nascido na propriedade&quot;.
                      Use este registro apenas para nascimentos ocorridos antes da implantação do sistema.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="animal">Animal *</Label>
                    <Select value={animalSelecionado} onValueChange={setAnimalSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {animais.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.brinco} - {a.nome} ({a.categoria})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </>
              )}

              {tipo === 'compra' && (
                <>
                  <div>
                    <Label htmlFor="animal">Animal *</Label>
                    <Select value={animalSelecionado} onValueChange={setAnimalSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {animais
                          .filter((a) => a.origem === 'comprado')
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.brinco} - {a.nome} ({a.categoria})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fornecedor">Fornecedor *</Label>
                    <Input
                      id="fornecedor"
                      value={fornecedor ?? ''}
                      onChange={(e) => setFornecedor(e.target.value)}
                      placeholder="Nome do fornecedor"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pesoEntrada">Peso (kg)</Label>
                      <Input
                        type="number"
                        id="pesoEntrada"
                        value={pesoEntrada}
                        onChange={(e) => setPesoEntrada(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <Label htmlFor="valorPago">Valor Pago (R$)</Label>
                      <Input
                        type="number"
                        id="valorPago"
                        value={valorPago}
                        onChange={(e) => setValorPago(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </>
              )}

              {tipo === 'venda' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="vendaEmLote"
                      checked={vendaEmLote}
                      onCheckedChange={(checked) => setVendaEmLote(checked as boolean)}
                    />
                    <Label htmlFor="vendaEmLote">Venda em lote</Label>
                  </div>

                  {!vendaEmLote ? (
                    <div>
                      <Label htmlFor="animal">Animal *</Label>
                      <Select value={animalSelecionado} onValueChange={setAnimalSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um animal" />
                        </SelectTrigger>
                        <SelectContent>
                          {animais.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.brinco} - {a.nome} ({a.categoria})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label>Selecione os animais *</Label>
                      <Select value="" onValueChange={() => {}}>
                        <SelectTrigger disabled>
                          <SelectValue placeholder="Selecione animais abaixo" />
                        </SelectTrigger>
                      </Select>

                      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {animais.map((a) => (
                          <div key={a.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`animal-${a.id}`}
                              checked={animaisSelecionados.includes(a.id)}
                              onCheckedChange={() => toggleAnimalSelection(a.id)}
                            />
                            <Label htmlFor={`animal-${a.id}`} className="font-normal cursor-pointer">
                              {a.brinco} - {a.nome} ({a.categoria})
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Esta ação marcará o(s) animal(is) como Vendido e os removerá do rebanho ativo. Esta ação não pode ser desfeita.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="comprador">Comprador *</Label>
                    <Input
                      id="comprador"
                      value={comprador ?? ''}
                      onChange={(e) => setComprador(e.target.value)}
                      placeholder="Nome do comprador"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pesoSaida">Peso (kg)</Label>
                      <Input
                        type="number"
                        id="pesoSaida"
                        value={pesoSaida}
                        onChange={(e) => setPesoSaida(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <Label htmlFor="valorRecebido">Valor Recebido (R$)</Label>
                      <Input
                        type="number"
                        id="valorRecebido"
                        value={valorRecebido}
                        onChange={(e) => setValorRecebido(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </>
              )}

              {tipo === 'morte' && (
                <>
                  <div>
                    <Label htmlFor="animal">Animal *</Label>
                    <Select value={animalSelecionado} onValueChange={setAnimalSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {animais.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.brinco} - {a.nome} ({a.categoria})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Esta ação marcará o animal como Morto e o removerá do rebanho ativo. Esta ação não pode ser desfeita.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="causaMorte">Causa da Morte *</Label>
                    <Select value={causaMorte} onValueChange={setCausaMorte}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma causa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doenca">Doença</SelectItem>
                        <SelectItem value="acidente">Acidente</SelectItem>
                        <SelectItem value="predador">Predador</SelectItem>
                        <SelectItem value="desconhecida">Causa Desconhecida</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </>
              )}

              {tipo === 'descarte' && (
                <>
                  <div>
                    <Label htmlFor="animal">Animal *</Label>
                    <Select value={animalSelecionado} onValueChange={setAnimalSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {animais.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.brinco} - {a.nome} ({a.categoria})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="motivoDescarte">Motivo do Descarte *</Label>
                    <Input
                      id="motivoDescarte"
                      value={motivoDescarte ?? ''}
                      onChange={(e) => setMotivoDescarte(e.target.value)}
                      placeholder="Descreva o motivo do descarte"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </>
              )}

              {tipo === 'abate_proprio' && (
                <>
                  <div>
                    <Label htmlFor="animal">Animal *</Label>
                    <Select value={animalSelecionado} onValueChange={setAnimalSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {animais
                          .filter((a) => ['corte', 'dupla_aptidao'].includes(a.tipo_rebanho))
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.brinco} - {a.nome} ({a.categoria})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pesoAbate">Peso de Abate (kg) *</Label>
                      <Input
                        type="number"
                        id="pesoAbate"
                        value={pesoAbate}
                        onChange={(e) => setPesoAbate(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="rendimentoCarcaca">Rendimento Carcaça (%)</Label>
                      <Input
                        type="number"
                        id="rendimentoCarcaca"
                        value={rendimentoCarcaca}
                        onChange={(e) => setRendimentoCarcaca(e.target.value)}
                        placeholder="52"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </>
              )}

              {tipo === 'transferencia_lote' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transferenciaEmLote"
                      checked={transferenciaEmLote}
                      onCheckedChange={(checked) => setTransferenciaEmLote(checked as boolean)}
                    />
                    <Label htmlFor="transferenciaEmLote">Transferência em lote</Label>
                  </div>

                  {!transferenciaEmLote ? (
                    <div>
                      <Label htmlFor="animal">Animal *</Label>
                      <Select value={animalSelecionado} onValueChange={setAnimalSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um animal" />
                        </SelectTrigger>
                        <SelectContent>
                          {animais.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.brinco} - {a.nome} ({a.categoria})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label>Selecione os animais *</Label>
                      <Select value="" onValueChange={() => {}}>
                        <SelectTrigger disabled>
                          <SelectValue placeholder="Selecione animais abaixo" />
                        </SelectTrigger>
                      </Select>

                      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {animais.map((a) => (
                          <div key={a.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`animal-transfer-${a.id}`}
                              checked={animaisSelecionados.includes(a.id)}
                              onCheckedChange={() => toggleAnimalSelection(a.id)}
                            />
                            <Label htmlFor={`animal-transfer-${a.id}`} className="font-normal cursor-pointer">
                              {a.brinco} - {a.nome} ({a.categoria})
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="loteDestino">Lote de Destino *</Label>
                    <Select value={loteDestino} onValueChange={setLoteDestino}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotes
                          .filter((l) => l.id !== getLoteAtualAnimal())
                          .map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || loadingData}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
