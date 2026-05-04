'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { criarCoberturaSchema, type CriarCoberturaInput } from '@/lib/validations/rebanho-reproducao';
import { lancarCoberturaAction } from '@/app/dashboard/rebanho/reproducao/actions';
import type { Reprodutor } from '@/lib/types/rebanho-reproducao';
import type { Animal } from '@/lib/types/rebanho';

interface CoberturaFormDialogProps {
  animal: Animal;
  reprodutores: Reprodutor[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Bate com TipoCoberturaEnum (banco: eventos_rebanho.tipo_cobertura)
const tiposCoberturaMap = {
  monta_natural: 'Monta Natural',
  ia_convencional: 'IA Convencional',
  iatf: 'IATF',
  tetf: 'TETF',
  fiv: 'FIV',
  repasse: 'Repasse',
};

export function CoberturaFormDialog({
  animal,
  reprodutores,
  isOpen,
  onOpenChange,
  onSuccess,
}: CoberturaFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [repSearch, setRepSearch] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CriarCoberturaInput>({
    resolver: zodResolver(criarCoberturaSchema),
    defaultValues: {
      animal_id: animal.id,
      tipo: 'cobertura',
      data_evento: new Date().toISOString().split('T')[0],
      tipo_cobertura: 'monta_natural',
      reprodutor_id: '',
      observacoes: '',
    },
  });

  const filteredReprodutores = useMemo(() => {
    if (!repSearch) return reprodutores;
    const lower = repSearch.toLowerCase();
    return reprodutores.filter(
      (r) =>
        r.nome.toLowerCase().includes(lower) ||
        r.numero_registro?.toLowerCase().includes(lower)
    );
  }, [reprodutores, repSearch]);

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await lancarCoberturaAction(data);
      if (!result.success) {
        throw new Error(result.erro || 'Erro desconhecido');
      }
      toast.success('Cobertura registrada com sucesso');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar cobertura');
    } finally {
      setIsLoading(false);
    }
  });

  const tipoCoberturaValue = watch('tipo_cobertura');
  const reprodutorIdValue = watch('reprodutor_id');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Cobertura</DialogTitle>
          <DialogDescription>
            Animal: <strong>{animal.brinco}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_evento">Data do Evento *</Label>
            <Input
              id="data_evento"
              type="date"
              {...register('data_evento')}
              disabled={isLoading}
              className="h-12"
            />
            {errors.data_evento && (
              <p className="text-sm text-red-600">{errors.data_evento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_cobertura">Tipo de Cobertura *</Label>
            <Select
              value={tipoCoberturaValue}
              onValueChange={(v) => setValue('tipo_cobertura', v as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="tipo_cobertura" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tiposCoberturaMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo_cobertura && (
              <p className="text-sm text-red-600">{errors.tipo_cobertura.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reprodutor_id">Reprodutor *</Label>
            <Input
              type="text"
              placeholder="Buscar por nome ou registro..."
              value={repSearch}
              onChange={(e) => setRepSearch(e.target.value)}
              disabled={isLoading}
              className="h-12"
            />
            <Select
              value={reprodutorIdValue ?? ''}
              onValueChange={(v) => setValue('reprodutor_id', v as string)}
              disabled={isLoading}
            >
              <SelectTrigger id="reprodutor_id" className="h-12">
                <SelectValue placeholder="Selecionar reprodutor" />
              </SelectTrigger>
              <SelectContent>
                {filteredReprodutores.length > 0 ? (
                  filteredReprodutores.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome} {r.numero_registro ? `(${r.numero_registro})` : ''}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    Nenhum reprodutor encontrado
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.reprodutor_id && (
              <p className="text-sm text-red-600">{errors.reprodutor_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre a cobertura..."
              {...register('observacoes')}
              disabled={isLoading}
              className="min-h-20 resize-none"
            />
            {errors.observacoes && (
              <p className="text-sm text-red-600">{errors.observacoes.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Cobertura'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
