'use client';

import { useForm, type FieldValues } from 'react-hook-form';
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
import { criarAgendamentoSchema, type CriarAgendamentoInput } from '@/lib/validations/assessoria';
import { criarAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { HorarioDisponivel } from '@/lib/types/assessoria';
import { formatDate } from '@/lib/utils';

interface AgendamentoFormProps {
  isOpen: boolean;
  onClose: () => void;
  horarioSelecionado: HorarioDisponivel | null;
  consultorId: string;
  onAfterSubmit?: () => Promise<void>;
}

export default function AgendamentoForm({
  isOpen,
  onClose,
  horarioSelecionado,
  consultorId,
  onAfterSubmit,
}: AgendamentoFormProps) {
  const form = useForm({
    resolver: zodResolver(criarAgendamentoSchema),
    defaultValues: {
      horario_disponivel_id: horarioSelecionado?.id || '',
      consultor_id: consultorId,
      tipo: 'reuniao_video' as const,
      observacoes: '',
      link_reuniao: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const result = await criarAgendamentoAction(data);
      if (result.success) {
        toast.success('Solicitação enviada! O assessor confirmará em breve.');
        form.reset();
        onClose();
        if (onAfterSubmit) await onAfterSubmit();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao criar agendamento');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
          <DialogDescription>
            {horarioSelecionado
              ? `Horário: ${formatDate(horarioSelecionado.data_hora)} às ${new Date(horarioSelecionado.data_hora).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Selecione um horário'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Reunião *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reuniao_video">📹 Reunião por Vídeo</SelectItem>
                      <SelectItem value="chamada_telefone">☎️ Chamada Telefônica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('tipo') === 'reuniao_video' && (
              <FormField
                control={form.control as any}
                name="link_reuniao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link da Reunião (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://meet.google.com/... ou https://zoom.us/..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control as any}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os tópicos que gostaria de discutir (adubação, silagem, rebanho, etc.)..."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Solicitar Agendamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
