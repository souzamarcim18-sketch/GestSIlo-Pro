'use client';

import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Pill, Syringe, TestTubes, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { criarEventoSanitarioSchema, type CriarEventoSanitarioInput } from '@/lib/validations/rebanho';
import { criarEventoSanitarioAction } from '@/app/dashboard/rebanho/sanidade/actions';
import type { Animal, Lote } from '@/lib/types/rebanho';
import type { TipoEventoSanitario } from '@/lib/types/rebanho-sanitario';

interface FormEventoSanitarioProps {
  animalPre?: Animal;
  lotes?: Lote[];
  animais?: Animal[];
  onSuccess: () => void;
}

type TipoForm = TipoEventoSanitario;

const getErrorMessage = (error: any): string | null => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error.message && typeof error.message === 'string') return error.message;
  return null;
};

const TIPO_LABELS: Record<TipoForm, string> = {
  vacinacao: 'Vacinação',
  vermifugacao: 'Vermifugação',
  tratamento_veterinario: 'Tratamento Veterinário',
  exame_laboratorial: 'Exame Laboratorial',
};

const TIPO_ICONS: Record<TipoForm, React.ReactElement> = {
  vacinacao: <Syringe className="w-4 h-4" />,
  vermifugacao: <Bug className="w-4 h-4" />,
  tratamento_veterinario: <Pill className="w-4 h-4" />,
  exame_laboratorial: <TestTubes className="w-4 h-4" />,
};

const TIPO_COLORS: Record<TipoForm, string> = {
  vacinacao: 'bg-green-100 text-green-800 border-green-300',
  vermifugacao: 'bg-blue-100 text-blue-800 border-blue-300',
  tratamento_veterinario: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  exame_laboratorial: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function FormEventoSanitario({
  animalPre,
  lotes = [],
  animais = [],
  onSuccess,
}: FormEventoSanitarioProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoForm>('vacinacao');
  const [multipleAnimals, setMultipleAnimals] = useState(false);
  const [selectedAnimalsIds, setSelectedAnimalsIds] = useState<Set<string>>(
    animalPre ? new Set([animalPre.id]) : new Set()
  );

  const defaultValues = {
    tipo: selectedTipo,
    animal_id: animalPre?.id || '',
    data_evento: new Date().toISOString().split('T')[0],
    responsavel: null,
    observacoes: null,
    vacina_nome: null,
    dose: null,
    via_aplicacao: 'intramuscular' as const,
    lote_produto: null,
    data_proxima_dose: null,
    diagnostico: null,
    medicamento: null,
    duracao_dias: null,
    resultado: null,
    tipo_exame: null,
    numero_protocolo: null,
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<any>({
    resolver: zodResolver(criarEventoSanitarioSchema),
    defaultValues,
  });

  const tipoValue = watch('tipo') || selectedTipo;

  const animaisPorLote = useMemo(() => {
    if (!lotes || lotes.length === 0) return {};
    const grouped: Record<string, Animal[]> = {};
    lotes.forEach((lote) => {
      grouped[lote.id] = animais.filter((a) => a.lote_id === lote.id);
    });
    return grouped;
  }, [lotes, animais]);

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const animalIds = multipleAnimals ? Array.from(selectedAnimalsIds) : [data.animal_id];

      if (animalIds.length === 0) {
        toast.error('Selecione ao menos um animal');
        setIsLoading(false);
        return;
      }

      const payload = {
        ...data,
        animal_id: animalIds.length === 1 ? animalIds[0] : animalIds,
      };

      const result = await criarEventoSanitarioAction(payload);

      if (result.success) {
        toast.success(
          `${TIPO_LABELS[selectedTipo]} registrada${animalIds.length > 1 ? ' para ' + animalIds.length + ' animais' : ''}`
        );
        reset(defaultValues);
        setSelectedAnimalsIds(animalPre ? new Set([animalPre.id]) : new Set());
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao registrar evento sanitário');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  });

  const toggleAnimal = (animalId: string) => {
    const newSet = new Set(selectedAnimalsIds);
    if (newSet.has(animalId)) {
      newSet.delete(animalId);
    } else {
      newSet.add(animalId);
    }
    setSelectedAnimalsIds(newSet);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Tipo de Evento */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold uppercase tracking-[0.13em]">Tipo de Evento *</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TIPO_LABELS) as TipoForm[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => {
                setSelectedTipo(tipo);
              }}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                tipoValue === tipo
                  ? `${TIPO_COLORS[tipo]} border-current`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {TIPO_ICONS[tipo]}
              <span className="text-sm font-medium">{TIPO_LABELS[tipo]}</span>
            </button>
          ))}
        </div>
        <input type="hidden" {...register('tipo')} value={tipoValue} />
      </div>

      {/* Seleção de Animal(is) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold uppercase tracking-[0.13em]">Animal(is) *</Label>
          {!animalPre && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="multiple-animals"
                checked={multipleAnimals}
                onCheckedChange={(checked) => setMultipleAnimals(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="multiple-animals" className="font-normal cursor-pointer">
                Múltiplos
              </Label>
            </div>
          )}
        </div>

        {multipleAnimals && !animalPre ? (
          <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3">
            {lotes.length > 0 && (
              <>
                {lotes.map((lote) => (
                  <div key={lote.id}>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{lote.nome}</p>
                    <div className="space-y-2 ml-3">
                      {(animaisPorLote[lote.id] || []).map((animal) => (
                        <div key={animal.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`animal-${animal.id}`}
                            checked={selectedAnimalsIds.has(animal.id)}
                            onCheckedChange={() => toggleAnimal(animal.id)}
                            disabled={isLoading}
                          />
                          <Label
                            htmlFor={`animal-${animal.id}`}
                            className="font-normal cursor-pointer text-sm"
                          >
                            {animal.brinco} {animal.nome ? `(${animal.nome})` : ''}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <Select value={watch('animal_id')} onValueChange={(v) => {}}>
            <SelectTrigger disabled={isLoading || !!animalPre}>
              <SelectValue placeholder="Selecione um animal" />
            </SelectTrigger>
            <SelectContent>
              {animais.map((animal) => (
                <SelectItem key={animal.id} value={animal.id}>
                  {animal.brinco} {animal.nome ? `(${animal.nome})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <input type="hidden" {...register('animal_id')} value={animalPre?.id || watch('animal_id')} />
        {getErrorMessage(errors.animal_id) && <p className="text-sm text-red-600">{getErrorMessage(errors.animal_id)}</p>}
      </div>

      {/* Data do Evento */}
      <div className="space-y-2">
        <Label htmlFor="data-evento" className="text-sm font-semibold">Data do Evento *</Label>
        <Input
          id="data-evento"
          type="date"
          {...register('data_evento')}
          disabled={isLoading}
        />
        {getErrorMessage(errors.data_evento) && (
          <p className="text-sm text-red-600">{getErrorMessage(errors.data_evento)}</p>
        )}
      </div>

      {/* VACINAÇÃO */}
      {tipoValue === 'vacinacao' && (
        <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="space-y-2">
            <Label htmlFor="vacina-nome" className="text-sm font-semibold">Nome da Vacina *</Label>
            <Input
              id="vacina-nome"
              placeholder="Ex: Febre Aftosa"
              {...register('vacina_nome')}
              disabled={isLoading}
            />
            {getErrorMessage(errors.vacina_nome) && (
              <p className="text-sm text-red-600">{getErrorMessage(errors.vacina_nome)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dose" className="text-sm font-semibold">Dose *</Label>
            <Input
              id="dose"
              placeholder="Ex: 1ª dose, Reforço anual"
              {...register('dose')}
              disabled={isLoading}
            />
            {getErrorMessage(errors.dose) && <p className="text-sm text-red-600">{getErrorMessage(errors.dose)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="via-aplicacao" className="text-sm font-semibold">Via de Aplicação *</Label>
            <Select defaultValue="intramuscular">
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subcutanea">Subcutânea</SelectItem>
                <SelectItem value="intramuscular">Intramuscular</SelectItem>
                <SelectItem value="intranasal">Intranasal</SelectItem>
                <SelectItem value="oral">Oral</SelectItem>
                <SelectItem value="topica">Tópica</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" {...register('via_aplicacao')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lote-produto" className="text-sm font-semibold">Lote do Produto</Label>
            <Input
              id="lote-produto"
              placeholder="Número do lote"
              {...register('lote_produto')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-proxima" className="text-sm font-semibold">Data da Próxima Dose</Label>
            <Input
              id="data-proxima"
              type="date"
              {...register('data_proxima_dose')}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* VERMIFUGAÇÃO */}
      {tipoValue === 'vermifugacao' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="space-y-2">
            <Label htmlFor="produto-nome" className="text-sm font-semibold">Produto *</Label>
            <Input
              id="produto-nome"
              placeholder="Ex: Vermífugo ABC"
              {...register('vacina_nome')}
              disabled={isLoading}
            />
            {errors.vacina_nome?.message && (
              <p className="text-sm text-red-600">{String(errors.vacina_nome.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="via-aplicacao2" className="text-sm font-semibold">Via de Aplicação *</Label>
            <Select defaultValue="oral">
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subcutanea">Subcutânea</SelectItem>
                <SelectItem value="intramuscular">Intramuscular</SelectItem>
                <SelectItem value="intranasal">Intranasal</SelectItem>
                <SelectItem value="oral">Oral</SelectItem>
                <SelectItem value="topica">Tópica</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" {...register('via_aplicacao')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lote-produto2" className="text-sm font-semibold">Lote do Produto</Label>
            <Input
              id="lote-produto2"
              placeholder="Número do lote"
              {...register('lote_produto')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-proxima2" className="text-sm font-semibold">Data da Próxima Aplicação</Label>
            <Input
              id="data-proxima2"
              type="date"
              {...register('data_proxima_dose')}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* TRATAMENTO VETERINÁRIO */}
      {tipoValue === 'tratamento_veterinario' && (
        <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="space-y-2">
            <Label htmlFor="diagnostico" className="text-sm font-semibold">Diagnóstico *</Label>
            <Textarea
              id="diagnostico"
              placeholder="Descreva o diagnóstico..."
              rows={3}
              {...register('diagnostico')}
              disabled={isLoading}
            />
            {getErrorMessage(errors.diagnostico) && (
              <p className="text-sm text-red-600">{getErrorMessage(errors.diagnostico)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicamento" className="text-sm font-semibold">Medicamento *</Label>
            <Input
              id="medicamento"
              placeholder="Nome do medicamento"
              {...register('medicamento')}
              disabled={isLoading}
            />
            {getErrorMessage(errors.medicamento) && (
              <p className="text-sm text-red-600">{getErrorMessage(errors.medicamento)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duracao" className="text-sm font-semibold">Duração do Tratamento (dias)</Label>
            <Input
              id="duracao"
              type="number"
              placeholder="Número de dias"
              {...register('duracao_dias', { valueAsNumber: true })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resultado" className="text-sm font-semibold">Resultado</Label>
            <Select>
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_tratamento">Em Tratamento</SelectItem>
                <SelectItem value="cura">Cura</SelectItem>
                <SelectItem value="melhora">Melhora</SelectItem>
                <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                <SelectItem value="obito">Óbito</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" {...register('resultado')} />
          </div>
        </div>
      )}

      {/* EXAME LABORATORIAL */}
      {tipoValue === 'exame_laboratorial' && (
        <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="space-y-2">
            <Label htmlFor="tipo-exame" className="text-sm font-semibold">Tipo de Exame *</Label>
            <Input
              id="tipo-exame"
              placeholder="Ex: Brucelose, Tuberculose"
              {...register('tipo_exame')}
              disabled={isLoading}
            />
            {getErrorMessage(errors.tipo_exame) && (
              <p className="text-sm text-red-600">{getErrorMessage(errors.tipo_exame)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resultado-exame" className="text-sm font-semibold">Resultado</Label>
            <Input
              id="resultado-exame"
              placeholder="Resultado (será preenchido depois)"
              {...register('resultado')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero-protocolo" className="text-sm font-semibold">Número do Protocolo</Label>
            <Input
              id="numero-protocolo"
              placeholder="Número do protocolo do laboratório"
              {...register('numero_protocolo')}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Responsável */}
      <div className="space-y-2">
        <Label htmlFor="responsavel" className="text-sm font-semibold">Responsável</Label>
        <Input
          id="responsavel"
          placeholder="Nome do responsável"
          {...register('responsavel')}
          disabled={isLoading}
        />
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="observacoes" className="text-sm font-semibold">Observações</Label>
        <Textarea
          id="observacoes"
          placeholder="Observações adicionais..."
          rows={2}
          {...register('observacoes')}
          disabled={isLoading}
        />
      </div>

      {/* Botões */}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar {TIPO_LABELS[(tipoValue as TipoForm) || 'vacinacao']}
      </Button>
    </form>
  );
}
