'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Silo } from '@/lib/supabase';
import { toast } from 'sonner';
import { q } from '@/lib/supabase/queries-audit';

const movSchema = z.object({
  silo_id: z.string().min(1, 'Selecione um silo'),
  tipo: z.enum(['Entrada', 'Saída'] as const),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  responsavel: z.string().min(1, 'Informe o responsável'),
  observacao: z.string().optional(),
});

type MovFormData = z.infer<typeof movSchema>;

interface MovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  silos: Silo[];
  siloId?: string; // Se fornecido, fixa o silo
  onSuccess: () => void;
}

export function MovimentacaoDialog({
  open,
  onOpenChange,
  silos,
  siloId,
  onSuccess,
}: MovimentacaoDialogProps) {
  const form = useForm<MovFormData>({
    resolver: zodResolver(movSchema),
    defaultValues: {
      silo_id: siloId || '',
      tipo: 'Entrada',
      quantidade: 0,
      responsavel: '',
      observacao: '',
    },
  });

  const handleSubmit = async (data: MovFormData) => {
    try {
      await q.movimentacoesSilo.create({
        silo_id: data.silo_id,
        tipo: data.tipo,
        quantidade: data.quantidade,
        responsavel: data.responsavel || null,
        observacao: data.observacao || null,
        talhao_id: null,
        data: new Date().toISOString(),
      });
      toast.success('Movimentação registrada com sucesso!');
      form.reset({ ...form.getValues(), quantidade: 0, responsavel: '', observacao: '' });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar movimentação');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogDescription>
            Registre entrada ou saída de silagem do silo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Silo (mostrar dropdown só se não fixo) */}
          {!siloId && (
            <div className="space-y-2">
              <Label htmlFor="mov-silo">Silo</Label>
              <Controller
                control={form.control}
                name="silo_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="mov-silo">
                      <SelectValue placeholder="Selecione o silo" />
                    </SelectTrigger>
                    <SelectContent>
                      {silos.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.silo_id && (
                <p className="text-xs text-destructive">{form.formState.errors.silo_id.message}</p>
              )}
            </div>
          )}

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="mov-tipo">Tipo</Label>
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="mov-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem>
                    <SelectItem value="Saída">Saída</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.tipo && (
              <p className="text-xs text-destructive">{form.formState.errors.tipo.message}</p>
            )}
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="mov-qty">Quantidade (toneladas)</Label>
            <Input
              id="mov-qty"
              type="number"
              step="0.1"
              aria-required="true"
              {...form.register('quantidade', { valueAsNumber: true })}
            />
            {form.formState.errors.quantidade && (
              <p className="text-xs text-destructive">{form.formState.errors.quantidade.message}</p>
            )}
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="mov-resp">Responsável</Label>
            <Input
              id="mov-resp"
              aria-required="true"
              {...form.register('responsavel')}
            />
            {form.formState.errors.responsavel && (
              <p className="text-xs text-destructive">{form.formState.errors.responsavel.message}</p>
            )}
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="mov-obs">Observações</Label>
            <Input id="mov-obs" {...form.register('observacao')} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
