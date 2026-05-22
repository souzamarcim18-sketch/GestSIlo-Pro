'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { colaboradorFormSchema, type ColaboradorFormData } from '@/lib/validations/mao-de-obra';
import {
  criarColaboradorAction,
  atualizarColaboradorAction,
} from '../actions';
import {
  FUNCOES_COLABORADOR,
  VINCULOS_COLABORADOR,
  type Colaborador,
} from '@/lib/types/mao-de-obra';

interface ColaboradorFormProps {
  colaborador?: Colaborador;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ColaboradorForm({ colaborador, onSuccess, onCancel }: ColaboradorFormProps) {
  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorFormSchema),
    defaultValues: {
      nome: colaborador?.nome ?? '',
      funcao: colaborador?.funcao ?? 'Auxiliar',
      vinculo: colaborador?.vinculo ?? 'Diarista',
      tipo_valor: colaborador?.tipo_valor ?? 'diaria',
      valor_ref: colaborador?.valor_ref ?? 0,
      observacoes: colaborador?.observacoes ?? '',
    },
  });

  const { isSubmitting } = form.formState;
  const tipoValor = form.watch('tipo_valor');

  async function onSubmit(data: ColaboradorFormData) {
    const result = colaborador
      ? await atualizarColaboradorAction(colaborador.id, data)
      : await criarColaboradorAction(data);

    if (result.success) {
      toast.success(colaborador ? 'Colaborador atualizado.' : 'Colaborador criado.');
      onSuccess();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do colaborador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="funcao"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Função</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FUNCOES_COLABORADOR.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vinculo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Vínculo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VINCULOS_COLABORADOR.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="tipo_valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Tipo de valor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="hora">Por hora</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor_ref"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  Valor {tipoValor === 'diaria' ? 'por diária (R$)' : 'por hora (R$)'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
              <FormLabel className="text-sm">Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações opcionais..."
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="font-semibold"
            style={{ background: '#738D45', color: '#fff' }}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {colaborador ? 'Salvar alterações' : 'Criar colaborador'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
