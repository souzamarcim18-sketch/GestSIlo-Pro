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
import { ColaboradorSelect } from '@/components/ColaboradorSelect';

interface FormEventoSanitarioProps {
  animalPre?: Animal;
  lotes?: Lote[];
  animais?: Animal[];
  onSuccess: () => void;
}

type TipoForm = TipoEventoSanitario;

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
  vacinacao: 'bg-green-500/15 text-green-400 border-green-500/30',
  vermifugacao: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  tratamento_veterinario: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  exame_laboratorial: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const TIPO_SECTION_COLORS: Record<TipoForm, string> = {
  vacinacao: 'bg-green-500/8 border-green-500/20',
  vermifugacao: 'bg-blue-500/8 border-blue-500/20',
  tratamento_veterinario: 'bg-yellow-500/8 border-yellow-500/20',
  exame_laboratorial: 'bg-purple-500/8 border-purple-500/20',
};

function buildDefaultValues(tipo: TipoForm, animalId?: string) {
  const base = {
    animal_id: animalId ?? '',
    data_evento: new Date().toISOString().split('T')[0],
    responsavel: null,
    observacoes: null,
    colaborador_id: undefined,
  };
  if (tipo === 'vacinacao') {
    return { ...base, tipo: 'vacinacao' as const, vacina_nome: '', dose: '', via_aplicacao: 'intramuscular' as const, lote_produto: null, data_proxima_dose: null };
  }
  if (tipo === 'vermifugacao') {
    return { ...base, tipo: 'vermifugacao' as const, vacina_nome: '', via_aplicacao: 'oral' as const, lote_produto: null, data_proxima_dose: null };
  }
  if (tipo === 'tratamento_veterinario') {
    return { ...base, tipo: 'tratamento_veterinario' as const, diagnostico: '', medicamento: '', duracao_dias: null, resultado: null };
  }
  return { ...base, tipo: 'exame_laboratorial' as const, tipo_exame: '', resultado: null, numero_protocolo: null };
}

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

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CriarEventoSanitarioInput>({
    resolver: zodResolver(criarEventoSanitarioSchema),
    defaultValues: buildDefaultValues('vacinacao', animalPre?.id) as unknown as CriarEventoSanitarioInput,
  });

  const tipoValue = watch('tipo') ?? selectedTipo;

  const handleTipoChange = (tipo: TipoForm) => {
    setSelectedTipo(tipo);
    const animalId = animalPre?.id ?? (watch('animal_id') as string | undefined) ?? '';
    reset(buildDefaultValues(tipo, animalId) as unknown as CriarEventoSanitarioInput);
  };

  const animaisPorLote = useMemo(() => {
    if (!lotes || lotes.length === 0) return {};
    const grouped: Record<string, Animal[]> = {};
    lotes.forEach((lote) => {
      grouped[lote.id] = animais.filter((a) => a.lote_id === lote.id);
    });
    return grouped;
  }, [lotes, animais]);

  // Animais sem lote
  const animaisSemLote = useMemo(
    () => animais.filter((a) => !a.lote_id),
    [animais]
  );

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const animalIds = multipleAnimals
        ? Array.from(selectedAnimalsIds)
        : [data.animal_id as string];

      if (animalIds.length === 0 || (animalIds.length === 1 && !animalIds[0])) {
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
        reset(buildDefaultValues('vacinacao', animalPre?.id) as unknown as CriarEventoSanitarioInput);
        setSelectedTipo('vacinacao');
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
              onClick={() => handleTipoChange(tipo)}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                tipoValue === tipo
                  ? TIPO_COLORS[tipo]
                  : 'border-border bg-card hover:bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              {TIPO_ICONS[tipo]}
              <span className="text-sm font-medium">{TIPO_LABELS[tipo]}</span>
            </button>
          ))}
        </div>
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
          <div className="space-y-3 max-h-96 overflow-y-auto border border-border rounded-lg p-3 bg-card">
            {lotes.map((lote) => {
              const animaisDoLote = animaisPorLote[lote.id] ?? [];
              if (animaisDoLote.length === 0) return null;
              return (
                <div key={lote.id}>
                  <p className="text-sm font-semibold text-foreground mb-2">{lote.nome}</p>
                  <div className="space-y-2 ml-3">
                    {animaisDoLote.map((animal) => (
                      <div key={animal.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`animal-${animal.id}`}
                          checked={selectedAnimalsIds.has(animal.id)}
                          onCheckedChange={() => toggleAnimal(animal.id)}
                          disabled={isLoading}
                        />
                        <Label htmlFor={`animal-${animal.id}`} className="font-normal cursor-pointer text-sm">
                          {animal.brinco} {animal.nome ? `(${animal.nome})` : ''}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {animaisSemLote.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Sem lote</p>
                <div className="space-y-2 ml-3">
                  {animaisSemLote.map((animal) => (
                    <div key={animal.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`animal-${animal.id}`}
                        checked={selectedAnimalsIds.has(animal.id)}
                        onCheckedChange={() => toggleAnimal(animal.id)}
                        disabled={isLoading}
                      />
                      <Label htmlFor={`animal-${animal.id}`} className="font-normal cursor-pointer text-sm">
                        {animal.brinco} {animal.nome ? `(${animal.nome})` : ''}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedAnimalsIds.size > 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                {selectedAnimalsIds.size} animal(is) selecionado(s)
              </p>
            )}
          </div>
        ) : (
          <Controller
            control={control}
            name="animal_id"
            render={({ field }) => (
              <Select
                value={field.value as string | undefined}
                onValueChange={field.onChange}
                disabled={isLoading || !!animalPre}
              >
                <SelectTrigger>
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
          />
        )}
        {errors.animal_id && (
          <p className="text-sm text-destructive">{String(errors.animal_id.message)}</p>
        )}
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
        {errors.data_evento && (
          <p className="text-sm text-destructive">{String(errors.data_evento.message)}</p>
        )}
      </div>

      {/* VACINAÇÃO */}
      {tipoValue === 'vacinacao' && (
        <div className={`space-y-4 p-4 rounded-lg border ${TIPO_SECTION_COLORS['vacinacao']}`}>
          <div className="space-y-2">
            <Label htmlFor="vacina-nome" className="text-sm font-semibold">Nome da Vacina *</Label>
            <Input
              id="vacina-nome"
              placeholder="Ex: Febre Aftosa"
              {...register('vacina_nome')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dose" className="text-sm font-semibold">Dose *</Label>
            <Input
              id="dose"
              placeholder="Ex: 1ª dose, Reforço anual"
              {...register('dose')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Via de Aplicação *</Label>
            <Controller
              control={control}
              name="via_aplicacao"
              render={({ field }) => (
                <Select value={field.value as string | undefined} onValueChange={field.onChange} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subcutanea">Subcutânea</SelectItem>
                    <SelectItem value="intramuscular">Intramuscular</SelectItem>
                    <SelectItem value="intranasal">Intranasal</SelectItem>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="topica">Tópica</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lote-produto" className="text-sm font-semibold">Lote do Produto</Label>
            <Input id="lote-produto" placeholder="Número do lote" {...register('lote_produto')} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-proxima" className="text-sm font-semibold">Data da Próxima Dose</Label>
            <Input id="data-proxima" type="date" {...register('data_proxima_dose')} disabled={isLoading} />
          </div>
        </div>
      )}

      {/* VERMIFUGAÇÃO */}
      {tipoValue === 'vermifugacao' && (
        <div className={`space-y-4 p-4 rounded-lg border ${TIPO_SECTION_COLORS['vermifugacao']}`}>
          <div className="space-y-2">
            <Label htmlFor="produto-nome" className="text-sm font-semibold">Produto *</Label>
            <Input
              id="produto-nome"
              placeholder="Ex: Vermífugo ABC"
              {...register('vacina_nome')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Via de Aplicação *</Label>
            <Controller
              control={control}
              name="via_aplicacao"
              render={({ field }) => (
                <Select value={field.value as string | undefined} onValueChange={field.onChange} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subcutanea">Subcutânea</SelectItem>
                    <SelectItem value="intramuscular">Intramuscular</SelectItem>
                    <SelectItem value="intranasal">Intranasal</SelectItem>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="topica">Tópica</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lote-produto2" className="text-sm font-semibold">Lote do Produto</Label>
            <Input id="lote-produto2" placeholder="Número do lote" {...register('lote_produto')} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-proxima2" className="text-sm font-semibold">Data da Próxima Aplicação</Label>
            <Input id="data-proxima2" type="date" {...register('data_proxima_dose')} disabled={isLoading} />
          </div>
        </div>
      )}

      {/* TRATAMENTO VETERINÁRIO */}
      {tipoValue === 'tratamento_veterinario' && (
        <div className={`space-y-4 p-4 rounded-lg border ${TIPO_SECTION_COLORS['tratamento_veterinario']}`}>
          <div className="space-y-2">
            <Label htmlFor="diagnostico" className="text-sm font-semibold">Diagnóstico *</Label>
            <Textarea
              id="diagnostico"
              placeholder="Descreva o diagnóstico..."
              rows={3}
              {...register('diagnostico')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medicamento" className="text-sm font-semibold">Medicamento *</Label>
            <Input
              id="medicamento"
              placeholder="Nome do medicamento"
              {...register('medicamento')}
              disabled={isLoading}
            />
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
            <Label className="text-sm font-semibold">Resultado</Label>
            <Controller
              control={control}
              name="resultado"
              render={({ field }) => (
                <Select value={field.value as string | undefined} onValueChange={field.onChange} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_tratamento">Em Tratamento</SelectItem>
                    <SelectItem value="cura">Cura</SelectItem>
                    <SelectItem value="melhora">Melhora</SelectItem>
                    <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                    <SelectItem value="obito">Óbito</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      )}

      {/* EXAME LABORATORIAL */}
      {tipoValue === 'exame_laboratorial' && (
        <div className={`space-y-4 p-4 rounded-lg border ${TIPO_SECTION_COLORS['exame_laboratorial']}`}>
          <div className="space-y-2">
            <Label htmlFor="tipo-exame" className="text-sm font-semibold">Tipo de Exame *</Label>
            <Input
              id="tipo-exame"
              placeholder="Ex: Brucelose, Tuberculose"
              {...register('tipo_exame')}
              disabled={isLoading}
            />
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

      {/* Executado por (colaborador cadastrado) */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Executado por</Label>
        <Controller
          control={control}
          name="colaborador_id"
          render={({ field }) => (
            <ColaboradorSelect
              value={field.value ?? undefined}
              onChange={field.onChange}
              disabled={isLoading}
            />
          )}
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

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar {TIPO_LABELS[tipoValue as TipoForm]}
      </Button>
    </form>
  );
}
