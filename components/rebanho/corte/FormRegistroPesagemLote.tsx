'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { registrarPesagemLoteAction } from '@/app/dashboard/rebanho/corte/actions';
import type { Animal, Lote } from '@/lib/types/rebanho';

interface FormRegistroPesagemLoteProps {
  animais: Animal[];
  lotes: Lote[];
  onSuccess?: () => void;
}

interface LinhaRegistro {
  animal_id: string;
  peso_kg: string;
  condicao_corporal: string;
}

export function FormRegistroPesagemLote({
  animais,
  lotes,
  onSuccess,
}: FormRegistroPesagemLoteProps) {
  const [modo, setModo] = useState<'individual' | 'lote'>('lote');
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [metodo, setMetodo] = useState('balanca');
  const [loading, setLoading] = useState(false);

  // Modo Lote
  const [loteIdSelecionado, setLoteIdSelecionado] = useState<string>('');
  const [linhasRegistro, setLinhasRegistro] = useState<LinhaRegistro[]>([]);

  // Modo Individual
  const [animalIdIndividual, setAnimalIdIndividual] = useState<string>('');
  const [pesoIndividual, setPesoIndividual] = useState<string>('');
  const [ccIndividual, setCcIndividual] = useState<string>('');

  // Quando selecionar um lote, preencher com os animais do lote
  const handleSelectLote = (loteId: string) => {
    setLoteIdSelecionado(loteId);
    const animaisDoLote = animais.filter((a) => a.lote_id === loteId);
    setLinhasRegistro(
      animaisDoLote.map((a) => ({
        animal_id: a.id,
        peso_kg: '',
        condicao_corporal: '',
      }))
    );
  };

  // Atualizar uma linha
  const handleUpdateLinha = (index: number, field: keyof LinhaRegistro, value: string) => {
    const nova = [...linhasRegistro];
    nova[index] = { ...nova[index], [field]: value };
    setLinhasRegistro(nova);
  };

  // Submeter em modo Lote
  const handleSubmitLote = async () => {
    if (!loteIdSelecionado) {
      toast.error('Selecione um lote');
      return;
    }

    const todasValidas = linhasRegistro.every((l) => l.peso_kg && parseFloat(l.peso_kg) > 0);
    if (!todasValidas) {
      toast.error('Preencha o peso de todos os animais');
      return;
    }

    setLoading(true);
    try {
      const result = await registrarPesagemLoteAction({
        lote_id: loteIdSelecionado,
        data_pesagem: dataRegistro,
        metodo,
        pesagens: linhasRegistro.map((l) => ({
          animal_id: l.animal_id,
          peso_kg: parseFloat(l.peso_kg),
          condicao_corporal: l.condicao_corporal
            ? parseInt(l.condicao_corporal)
            : null,
        })),
      });

      if (result.success) {
        toast.success(`${result.count} pesagens registradas com sucesso`);
        setLinhasRegistro([]);
        setLoteIdSelecionado('');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Erro ao registrar');
      }
    } catch (error) {
      toast.error('Erro ao registrar pesagens');
    } finally {
      setLoading(false);
    }
  };

  // Submeter em modo Individual
  const handleSubmitIndividual = async () => {
    if (!animalIdIndividual || !pesoIndividual) {
      toast.error('Selecione o animal e preencha o peso');
      return;
    }

    setLoading(true);
    try {
      const result = await registrarPesagemLoteAction({
        lote_id: animais.find((a) => a.id === animalIdIndividual)?.lote_id || '',
        data_pesagem: dataRegistro,
        metodo,
        pesagens: [
          {
            animal_id: animalIdIndividual,
            peso_kg: parseFloat(pesoIndividual),
            condicao_corporal: ccIndividual ? parseInt(ccIndividual) : null,
          },
        ],
      });

      if (result.success) {
        toast.success('Pesagem registrada com sucesso');
        setAnimalIdIndividual('');
        setPesoIndividual('');
        setCcIndividual('');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Erro ao registrar');
      }
    } catch (error) {
      toast.error('Erro ao registrar pesagem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campos Comuns */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Data</Label>
          <Input
            type="date"
            value={dataRegistro}
            onChange={(e) => setDataRegistro(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <Label>Método</Label>
          <Select value={metodo} onValueChange={(v) => v && setMetodo(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanca">Balança</SelectItem>
              <SelectItem value="estimativa_visual">Estimativa Visual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Modo</Label>
          <Select value={modo} onValueChange={(v) => v && setModo(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="lote">Em Lote</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* MODO INDIVIDUAL */}
      {modo === 'individual' && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Animal</Label>
              <Select value={animalIdIndividual} onValueChange={(v) => v && setAnimalIdIndividual(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {animais.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.brinco} {animal.nome ? `(${animal.nome})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Peso (kg) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={pesoIndividual}
                onChange={(e) => setPesoIndividual(e.target.value)}
                min="1"
                max="2000"
                step="0.1"
              />
            </div>

            <div>
              <Label>CC (1-5)</Label>
              <Select value={ccIndividual} onValueChange={(v) => setCcIndividual(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem CC</SelectItem>
                  <SelectItem value="1">1 - Muito Magra</SelectItem>
                  <SelectItem value="2">2 - Magra</SelectItem>
                  <SelectItem value="3">3 - Normal</SelectItem>
                  <SelectItem value="4">4 - Gorda</SelectItem>
                  <SelectItem value="5">5 - Muito Gorda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmitIndividual} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </div>
      )}

      {/* MODO LOTE */}
      {modo === 'lote' && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <div>
            <Label>Lote *</Label>
            <Select value={loteIdSelecionado} onValueChange={(v) => v && handleSelectLote(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um lote..." />
              </SelectTrigger>
              <SelectContent>
                {lotes.map((lote) => (
                  <SelectItem key={lote.id} value={lote.id}>
                    {lote.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {linhasRegistro.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brinco</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Peso (kg) *</TableHead>
                    <TableHead>CC (1-5)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasRegistro.map((linha, idx) => {
                    const animal = animais.find((a) => a.id === linha.animal_id);
                    return (
                      <TableRow key={linha.animal_id}>
                        <TableCell className="font-medium">{animal?.brinco}</TableCell>
                        <TableCell>{animal?.nome || '—'}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="0"
                            value={linha.peso_kg}
                            onChange={(e) =>
                              handleUpdateLinha(idx, 'peso_kg', e.target.value)
                            }
                            min="1"
                            max="2000"
                            step="0.1"
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={linha.condicao_corporal}
                            onValueChange={(v) =>
                              handleUpdateLinha(idx, 'condicao_corporal', v || '')
                            }
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSubmitLote} disabled={loading || linhasRegistro.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar {linhasRegistro.length} Pesagens
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
