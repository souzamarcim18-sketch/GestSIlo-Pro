'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { piqueteFormSchema, type PiqueteFormData } from '@/lib/validations/pastagens';
import { criarPiqueteAction, atualizarPiqueteAction } from '../actions';
import type { Piquete } from '@/lib/types/pastagens';

interface PiqueteFormProps {
  pastagemId: string;
  piquete?: Piquete;
  onSuccess: () => void;
}

export function PiqueteForm({ pastagemId, piquete, onSuccess }: PiqueteFormProps) {
  const form = useForm<PiqueteFormData>({
    resolver: zodResolver(piqueteFormSchema),
    defaultValues: {
      pastagem_id: pastagemId,
      nome: piquete?.nome ?? '',
      area_ha: piquete?.area_ha ?? ('' as unknown as number),
      ua_suportada: piquete?.ua_suportada ?? ('' as unknown as number),
      dias_descanso_ideal: piquete?.dias_descanso_ideal ?? ('' as unknown as number),
      altura_entrada_cm: piquete?.altura_entrada_cm ?? ('' as unknown as number),
      altura_saida_cm: piquete?.altura_saida_cm ?? ('' as unknown as number),
      observacoes: piquete?.observacoes ?? '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: PiqueteFormData) {
    const result = piquete
      ? await atualizarPiqueteAction(piquete.id, data)
      : await criarPiqueteAction(data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(piquete ? 'Piquete atualizado.' : 'Piquete criado.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Nome *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: P1, A, Norte"
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
            name="area_ha"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Área (ha) *</FormLabel>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ua_suportada"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">UA suportada (UA/ha)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="Ex: 2,5"
                    {...field}
                    value={field.value === undefined || field.value === null ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-[#222] border-white/10 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dias_descanso_ideal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Dias de descanso ideal</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 30"
                    {...field}
                    value={field.value === undefined || field.value === null ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-[#222] border-white/10 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="altura_entrada_cm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Altura entrada (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 25"
                    {...field}
                    value={field.value === undefined || field.value === null ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-[#222] border-white/10 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="altura_saida_cm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Altura saída (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 10"
                    {...field}
                    value={field.value === undefined || field.value === null ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-[#222] border-white/10 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Informações adicionais..."
                  rows={2}
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

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#00c45a] hover:bg-[#00a84d] text-black font-semibold"
          >
            {isSubmitting ? 'Salvando...' : piquete ? 'Salvar alterações' : 'Criar piquete'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
