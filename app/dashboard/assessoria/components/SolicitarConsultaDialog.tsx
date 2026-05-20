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
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/AuthProvider';

interface SolicitarConsultaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit: () => Promise<void>;
}

const solicitacaoConsultaSchema = z.object({
  nome: z.string().min(3, 'Nome é obrigatório'),
  fazenda: z.string().min(3, 'Nome da fazenda é obrigatório'),
  localizacao: z.string().min(5, 'Localização é obrigatória'),
  telefone: z.string().min(10, 'Telefone/WhatsApp inválido'),
  email: z.string().email('Email inválido'),
  sugestao_dia: z.string().min(1, 'Sugestão de dia é obrigatória'),
  sugestao_horario: z.string().min(1, 'Sugestão de horário é obrigatória'),
});

type SolicitacaoConsultaInput = z.infer<typeof solicitacaoConsultaSchema>;

const CONSULTOR_ID = process.env.NEXT_PUBLIC_CONSULTOR_ID || '00000000-0000-4000-8000-000000000000';

export default function SolicitarConsultaDialog({
  isOpen,
  onClose,
  onAfterSubmit,
}: SolicitarConsultaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();

  const form = useForm<SolicitacaoConsultaInput>({
    resolver: zodResolver(solicitacaoConsultaSchema),
    defaultValues: {
      nome: profile?.nome || '',
      fazenda: '',
      localizacao: '',
      telefone: '',
      email: profile?.email || '',
      sugestao_dia: '',
      sugestao_horario: '',
    },
  });

  const handleSubmit = async (data: SolicitacaoConsultaInput) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/assessoria/solicitar-consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          consultor_id: CONSULTOR_ID,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar solicitação');
      }

      toast.success('Solicitação enviada com sucesso!');
      toast.info('O assessor agronômico entrará em contato em breve para confirmar a data e hora da consulta.');
      form.reset();
      onClose();
      await onAfterSubmit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Consulta com Assessor</DialogTitle>
          <DialogDescription>
            Preencha seus dados para que o assessor agronômico possa entrar em contato
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Usuário *</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="fazenda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fazenda *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da sua fazenda" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="localizacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização *</FormLabel>
                  <FormControl>
                    <Input placeholder="Cidade e Estado" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone/WhatsApp *</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 98765-4321" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" type="email" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="sugestao_dia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sugestão de Dia *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 15/06/2026" type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="sugestao_horario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sugestão de Horário *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 14:30" type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
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
