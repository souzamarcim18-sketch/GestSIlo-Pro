'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { gerarHorariosPeriodoAction } from '../../actions';

const schema = z.object({
  data_inicio: z.string().min(1, 'Data inicial é obrigatória'),
  data_fim: z.string().min(1, 'Data final é obrigatória'),
  hora_inicio: z.string().min(1, 'Hora inicial é obrigatória'),
  hora_fim: z.string().min(1, 'Hora final é obrigatória'),
  intervalo_minutos: z.number().int().min(15).max(480),
  dias_semana: z.array(z.number()).min(1, 'Selecione pelo menos um dia'),
});

type FormInput = z.infer<typeof schema>;

const diasSemana = [
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sábado' },
  { valor: 0, label: 'Domingo' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAfterSubmit?: () => Promise<void>;
}

export default function GerarHorariosPeriodoDialog({ isOpen, onClose, onAfterSubmit }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hora_inicio: '09:00',
      hora_fim: '17:00',
      intervalo_minutos: 60,
      dias_semana: [1, 2, 3, 4, 5], // Segunda a sexta por padrão
    },
  });

  const onSubmit = async (data: FormInput) => {
    try {
      setIsSubmitting(true);

      // Converter datas para ISO
      const [anoI, mesI, diaI] = data.data_inicio.split('-');
      const dataInicio = new Date(parseInt(anoI), parseInt(mesI) - 1, parseInt(diaI)).toISOString();

      const [anoF, mesF, diaF] = data.data_fim.split('-');
      const dataFim = new Date(parseInt(anoF), parseInt(mesF) - 1, parseInt(diaF)).toISOString();

      const result = await gerarHorariosPeriodoAction({
        data_inicio: dataInicio,
        data_fim: dataFim,
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim,
        intervalo_minutos: data.intervalo_minutos,
        dias_semana: data.dias_semana,
      });

      if (result.success) {
        toast.success(result.message);
        form.reset();
        onClose();
        if (onAfterSubmit) await onAfterSubmit();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Período de Horários</DialogTitle>
          <DialogDescription>
            Crie múltiplos slots de disponibilidade para um período específico
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Inicial *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Final *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hora_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Inicial *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hora_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Final *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="intervalo_minutos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo entre slots *</FormLabel>
                  <Select value={field.value.toString()} onValueChange={(v) => field.onChange(v ? parseInt(v) : 0)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1h 30min</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dias_semana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dias da Semana *</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {diasSemana.map((dia) => (
                      <FormItem key={dia.valor} className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(dia.valor)}
                            onCheckedChange={(checked: boolean) => {
                              const novo = checked
                                ? [...field.value, dia.valor]
                                : field.value.filter((v: number) => v !== dia.valor);
                              field.onChange(novo);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{dia.label}</FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Gerando...' : 'Gerar Horários'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
