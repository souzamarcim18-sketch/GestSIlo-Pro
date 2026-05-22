'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { pastagemFormSchema, type PastagemFormData } from '@/lib/validations/pastagens';
import { criarPastagemAction, atualizarPastagemAction } from '../actions';
import type { Pastagem } from '@/lib/types/pastagens';

const SISTEMAS = [
  { value: 'rotacionado', label: 'Rotacionado' },
  { value: 'continuo', label: 'Contínuo' },
  { value: 'semi_intensivo', label: 'Semi-intensivo' },
] as const;

interface PastagemFormProps {
  pastagem?: Pastagem;
  onSuccess: () => void;
}

export function PastagemForm({ pastagem, onSuccess }: PastagemFormProps) {
  const form = useForm<PastagemFormData>({
    resolver: zodResolver(pastagemFormSchema),
    defaultValues: {
      nome: pastagem?.nome ?? '',
      especie_forrageira: pastagem?.especie_forrageira ?? '',
      area_total_ha: pastagem?.area_total_ha ?? ('' as unknown as number),
      sistema_pastejo: pastagem?.sistema_pastejo ?? 'rotacionado',
      observacoes: pastagem?.observacoes ?? '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const sistemaPastejo = form.watch('sistema_pastejo');

  async function onSubmit(data: PastagemFormData) {
    const result = pastagem
      ? await atualizarPastagemAction(pastagem.id, data)
      : await criarPastagemAction(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(pastagem ? 'Pastagem atualizada.' : 'Pastagem criada.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Nome *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Pastagem Norte"
                  {...field}
                  className="bg-[#222] border-white/10 text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="especie_forrageira"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Espécie forrageira</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Brachiaria brizantha cv. Marandu"
                  {...field}
                  value={field.value ?? ''}
                  className="bg-[#222] border-white/10 text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="area_total_ha"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Área total (ha) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    {...field}
                    value={field.value === undefined || field.value === null ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    className="bg-[#222] border-white/10 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sistema_pastejo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Sistema de pastejo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-[#222] border-white/10 text-sm">
                      <SelectValue>
                        {SISTEMAS.find((s) => s.value === field.value)?.label ?? field.value}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#222] border-white/10">
                    {SISTEMAS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Aviso sistema contínuo */}
        {sistemaPastejo === 'continuo' && !pastagem && (
          <div
            className="rounded-lg p-3 flex items-start gap-2"
            style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
          >
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              No sistema contínuo, um piquete único será criado automaticamente cobrindo toda a área da pastagem. Não é necessário dividir em piquetes.
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Informações adicionais..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                  className="bg-[#222] border-white/10 text-sm resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">* campos obrigatórios</p>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#00c45a] hover:bg-[#00a84d] text-black font-semibold"
          >
            {isSubmitting ? 'Salvando...' : pastagem ? 'Salvar alterações' : 'Criar pastagem'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
