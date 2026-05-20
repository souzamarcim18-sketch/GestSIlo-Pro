'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { criarAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { criarAgendamentoSchema } from '@/lib/validations/assessoria';

interface SolicitarConsultaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => Promise<void>;
}

const CONSULTOR_ID = process.env.NEXT_PUBLIC_CONSULTOR_ID || '00000000-0000-4000-8000-000000000000';

export default function SolicitarConsultaDialog({
  isOpen,
  onClose,
  onAfterSubmit,
}: SolicitarConsultaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(criarAgendamentoSchema),
    defaultValues: {
      consultor_id: CONSULTOR_ID,
      tipo: 'reuniao_video',
      observacoes: '',
      horario_disponivel_id: '',
      link_reuniao: undefined,
    },
  });

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const result = await criarAgendamentoAction(data);
      if (result.success) {
        toast.success('Solicitação enviada com sucesso!');
        toast.info('O assessor agronômico entrará em contato em breve para confirmar a data e hora da consulta.');
        form.reset();
        onClose();
        await onAfterSubmit();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Consulta com Assessor</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da sua solicitação de consulta agronômica
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Consulta</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reuniao_video">Reunião por Vídeo</SelectItem>
                      <SelectItem value="chamada_telefone">Chamada Telefônica</SelectItem>
                      <SelectItem value="visita_presencial">Visita Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Escolha o formato preferido para sua consulta
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto da Consulta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o assunto ou dúvida que deseja abordar com o assessor agronômico"
                      className="resize-none h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Forneça detalhes sobre o que você precisa discutir
                  </FormDescription>
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
