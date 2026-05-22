'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
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
import { eventoManejoFormSchema, type EventoManejoFormData } from '@/lib/validations/pastagens';
import { registrarEventoManejoAction } from '../actions';
import { supabase } from '@/lib/supabase';
import type { TipoEventoManejo } from '@/lib/types/pastagens';
import { ColaboradorSelect } from '@/components/ColaboradorSelect';

const TIPO_CONFIG: Record<TipoEventoManejo, { label: string; alteraStatus?: string }> = {
  adubacao_manutencao: { label: 'Adubação de manutenção' },
  calagem:             { label: 'Calagem' },
  rocagem:             { label: 'Roçagem' },
  ressemeadura:        { label: 'Ressemeadura' },
  irrigacao:           { label: 'Irrigação' },
  reforma:             { label: 'Reforma de pastagem', alteraStatus: 'Em reforma' },
  interdicao:          { label: 'Interdição', alteraStatus: 'Interditado' },
  outro:               { label: 'Outro' },
};

const TIPOS_COM_INSUMO: TipoEventoManejo[] = ['adubacao_manutencao', 'calagem', 'ressemeadura'];
const TIPOS_COM_MAQUINA: TipoEventoManejo[] = ['adubacao_manutencao', 'calagem', 'ressemeadura', 'rocagem'];

interface Insumo { id: string; nome: string; unidade: string }
interface Maquina { id: string; nome: string }

interface EventoManejoFormProps {
  piqueteId: string;
  onSuccess: () => void;
}

export function EventoManejoForm({ piqueteId, onSuccess }: EventoManejoFormProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const form = useForm<EventoManejoFormData>({
    resolver: zodResolver(eventoManejoFormSchema),
    defaultValues: {
      piquete_id: piqueteId,
      tipo: 'adubacao_manutencao',
      data: new Date().toISOString().split('T')[0],
      insumo_id: undefined,
      quantidade_insumo: undefined,
      unidade_insumo: '',
      dose_por_ha: undefined,
      maquina_id: undefined,
      custo_estimado: undefined,
      observacoes: '',
      colaborador_id: undefined,
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const tipo = form.watch('tipo') as TipoEventoManejo;
  const mostraInsumo = TIPOS_COM_INSUMO.includes(tipo);
  const mostraMaquina = TIPOS_COM_MAQUINA.includes(tipo);
  const alteraStatus = TIPO_CONFIG[tipo]?.alteraStatus;

  useEffect(() => {
    Promise.all([
      supabase.from('insumos').select('id, nome, unidade').order('nome'),
      supabase.from('maquinas').select('id, nome').order('nome'),
    ]).then(([insRes, maqRes]) => {
      setInsumos((insRes.data ?? []) as Insumo[]);
      setMaquinas((maqRes.data ?? []) as Maquina[]);
      setLoadingOptions(false);
    });
  }, []);

  async function onSubmit(data: EventoManejoFormData) {
    const result = await registrarEventoManejoAction({
      ...data,
      insumo_id: data.insumo_id ?? null,
      maquina_id: data.maquina_id ?? null,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Evento de manejo registrado.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Tipo de evento *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-[#222] border-white/10 text-sm">
                      <SelectValue>
                        {TIPO_CONFIG[field.value as TipoEventoManejo]?.label ?? field.value}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#222] border-white/10">
                    {(Object.keys(TIPO_CONFIG) as TipoEventoManejo[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">
                        {TIPO_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Data *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="bg-[#222] border-white/10 text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Aviso status */}
        {alteraStatus && (
          <div
            className="rounded-lg p-3 flex items-start gap-2"
            style={{ background: 'rgba(245,208,0,0.08)', border: '1px solid rgba(245,208,0,0.2)' }}
          >
            <AlertTriangle className="h-4 w-4 text-[#f5d000] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#f5d000]">
              O status do piquete será alterado para <strong>{alteraStatus}</strong> ao registrar este evento.
            </p>
          </div>
        )}

        {/* Campos de insumo */}
        {mostraInsumo && (
          <>
            <FormField
              control={form.control}
              name="insumo_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Insumo</FormLabel>
                  <Select
                    key={loadingOptions ? 'ins-loading' : 'ins-ready'}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={loadingOptions}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-[#222] border-white/10 text-sm">
                        <SelectValue placeholder={loadingOptions ? 'Carregando...' : 'Selecionar insumo...'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#222] border-white/10">
                      {insumos.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum insumo encontrado</div>
                      ) : (
                        insumos.map((i) => (
                          <SelectItem key={i.id} value={i.id} className="text-sm">
                            {i.nome} ({i.unidade})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="quantidade_insumo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Quantidade</FormLabel>
                    <FormControl>
                      <Input
                        type="number" step="0.01" min="0.01"
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
                name="unidade_insumo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Unidade</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: kg, L"
                        {...field}
                        value={field.value ?? ''}
                        className="bg-[#222] border-white/10 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dose_por_ha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">Dose/ha</FormLabel>
                    <FormControl>
                      <Input
                        type="number" step="0.01" min="0.01"
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
          </>
        )}

        {/* Máquina */}
        {mostraMaquina && (
          <FormField
            control={form.control}
            name="maquina_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Máquina</FormLabel>
                <Select
                  key={loadingOptions ? 'maq-loading' : 'maq-ready'}
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                  disabled={loadingOptions}
                >
                  <FormControl>
                    <SelectTrigger className="bg-[#222] border-white/10 text-sm">
                      <SelectValue placeholder={loadingOptions ? 'Carregando...' : 'Selecionar máquina...'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#222] border-white/10">
                    {maquinas.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma máquina encontrada</div>
                    ) : (
                      maquinas.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-sm">
                          {m.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Custo estimado */}
        <FormField
          control={form.control}
          name="custo_estimado"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Custo estimado (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number" step="0.01" min="0"
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
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalhes do manejo..."
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

        <FormField
          control={form.control}
          name="colaborador_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Responsável</FormLabel>
              <FormControl>
                <ColaboradorSelect
                  value={field.value ?? undefined}
                  onChange={field.onChange}
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
            {isSubmitting ? 'Registrando...' : 'Registrar evento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
