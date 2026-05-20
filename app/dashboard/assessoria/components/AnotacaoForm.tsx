'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { anotacaoFormSchema } from '@/lib/validations/assessoria';
import { criarAnotacaoAction, atualizarAnotacaoAction } from '@/app/dashboard/assessoria/actions';
import { AnotacaoAssessoria } from '@/lib/types/assessoria';
import { type AnotacaoFormInput } from '@/lib/validations/assessoria';

interface AnotacaoFormProps {
  isOpen: boolean;
  onClose: () => void;
  anotacao?: AnotacaoAssessoria;
  onAfterSubmit?: () => Promise<void>;
}

export default function AnotacaoForm({
  isOpen,
  onClose,
  anotacao,
  onAfterSubmit,
}: AnotacaoFormProps) {
  const form = useForm({
    resolver: zodResolver(anotacaoFormSchema),
    defaultValues: {
      titulo: anotacao?.titulo || '',
      conteudo: anotacao?.conteudo || '',
      categoria: (anotacao?.categoria as any) || 'outro',
      prioridade: (anotacao?.prioridade as any) || 'normal',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      let result;
      if (anotacao) {
        result = await atualizarAnotacaoAction(anotacao.id, data);
      } else {
        result = await criarAnotacaoAction(data);
      }

      if (result.success) {
        toast.success(result.message);
        form.reset();
        onClose();
        if (onAfterSubmit) await onAfterSubmit();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao salvar anotação');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{anotacao ? 'Editar Anotação' : 'Nova Anotação'}</DialogTitle>
          <DialogDescription>
            {anotacao ? 'Edite sua anotação' : 'Crie uma nova anotação para rastrear dúvidas e sugestões'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Dúvida sobre adubação" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="conteudo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva sua dúvida ou observação com detalhes..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="duvida">Dúvida</SelectItem>
                        <SelectItem value="observacao_campo">Observação de Campo</SelectItem>
                        <SelectItem value="sugestao">Sugestão</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Anotação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
