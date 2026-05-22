'use client';

import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ocupacaoFormSchema, type OcupacaoFormData } from '@/lib/validations/pastagens';
import { registrarEntradaLoteAction } from '../actions';
import { supabase } from '@/lib/supabase';
import { FATORES_UA_POR_CATEGORIA, UA_FATOR_PADRAO, type ResultadoCalculoUA } from '@/lib/types/pastagens';

interface Lote {
  id: string;
  nome: string;
}

interface OcupacaoFormProps {
  piqueteId: string;
  areaHa: number;
  onSuccess: () => void;
}

export function OcupacaoForm({ piqueteId, areaHa, onSuccess }: OcupacaoFormProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [calculoUA, setCalculoUA] = useState<ResultadoCalculoUA | null>(null);
  const [calculando, setCalculando] = useState(false);

  const form = useForm<OcupacaoFormData>({
    resolver: zodResolver(ocupacaoFormSchema),
    defaultValues: {
      piquete_id: piqueteId,
      lote_id: '',
      data_entrada: new Date().toISOString().split('T')[0],
      data_saida_prevista: '',
      altura_dossel_entrada_cm: undefined,
      observacoes: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const loteId = form.watch('lote_id');

  useEffect(() => {
    supabase
      .from('lotes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        setLotes((data ?? []) as Lote[]);
        setLoadingLotes(false);
      });
  }, []);

  useEffect(() => {
    if (!loteId) {
      setCalculoUA(null);
      return;
    }

    setCalculando(true);

    async function calcular() {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 90);
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      const { data: animais } = await supabase
        .from('animais')
        .select('id, categoria')
        .eq('lote_id', loteId)
        .eq('status', 'Ativo');

      if (!animais || animais.length === 0) {
        setCalculoUA({ ua_total: 0, ua_por_ha: null, peso_medio_kg: 0, quantidade_animais: 0, metodo: 'fator_categoria', animais_sem_pesagem: 0 });
        setCalculando(false);
        return;
      }

      const animalIds = animais.map((a) => a.id);
      const { data: pesagens } = await supabase
        .from('pesos_animal')
        .select('animal_id, peso_kg, data_pesagem')
        .in('animal_id', animalIds)
        .gte('data_pesagem', dataLimiteStr)
        .order('data_pesagem', { ascending: false });

      const pesagemPorAnimal = new Map<string, number>();
      for (const p of pesagens ?? []) {
        if (!pesagemPorAnimal.has(p.animal_id)) {
          pesagemPorAnimal.set(p.animal_id, Number(p.peso_kg));
        }
      }

      let uaTotal = 0;
      let pesoTotal = 0;
      let animaisSemPesagem = 0;

      for (const animal of animais) {
        const pesoReal = pesagemPorAnimal.get(animal.id);
        if (pesoReal !== undefined) {
          uaTotal += pesoReal / 450;
          pesoTotal += pesoReal;
        } else {
          const fator = FATORES_UA_POR_CATEGORIA[animal.categoria ?? ''] ?? UA_FATOR_PADRAO;
          uaTotal += fator;
          pesoTotal += fator * 450;
          animaisSemPesagem++;
        }
      }

      const qtd = animais.length;
      setCalculoUA({
        ua_total: uaTotal,
        ua_por_ha: areaHa > 0 ? uaTotal / areaHa : null,
        peso_medio_kg: qtd > 0 ? pesoTotal / qtd : 0,
        quantidade_animais: qtd,
        metodo: animaisSemPesagem === 0 ? 'peso_real' : 'fator_categoria',
        animais_sem_pesagem: animaisSemPesagem,
      });
      setCalculando(false);
    }

    calcular();
  }, [loteId, areaHa]);

  async function onSubmit(data: OcupacaoFormData) {
    const result = await registrarEntradaLoteAction({
      ...data,
      data_saida_prevista: data.data_saida_prevista || null,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Entrada de lote registrada.');
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="lote_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Lote *</FormLabel>
              <Select
                key={loadingLotes ? 'lote-loading' : 'lote-ready'}
                onValueChange={field.onChange}
                value={field.value || undefined}
                disabled={loadingLotes}
              >
                <FormControl>
                  <SelectTrigger className="bg-[#222] border-white/10 text-sm">
                    <SelectValue placeholder={loadingLotes ? 'Carregando lotes...' : 'Selecionar lote...'}>
                      {field.value
                        ? (lotes.find((l) => l.id === field.value)?.nome ?? field.value)
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#222] border-white/10">
                  {lotes.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum lote encontrado</div>
                  ) : (
                    lotes.map((l) => (
                      <SelectItem key={l.id} value={l.id} className="text-sm">
                        {l.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Resultado do cálculo de UA */}
        {(calculando || calculoUA) && (
          <div
            className="rounded-lg p-3 space-y-2"
            style={{ background: 'rgba(0,196,90,0.06)', border: '1px solid rgba(0,196,90,0.15)' }}
          >
            {calculando ? (
              <p className="text-xs text-muted-foreground">Calculando UA do lote...</p>
            ) : calculoUA && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Cálculo UA</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      calculoUA.metodo === 'peso_real'
                        ? 'border-green-500/30 text-green-400 bg-green-500/10'
                        : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                    }`}
                  >
                    {calculoUA.metodo === 'peso_real' ? 'Peso real' : 'Estimativa'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Animais</div>
                    <div className="font-semibold text-foreground">{calculoUA.quantidade_animais}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Peso médio</div>
                    <div className="font-semibold text-foreground">{calculoUA.peso_medio_kg.toFixed(0)} kg</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">UA/ha</div>
                    <div className="font-semibold text-foreground">
                      {calculoUA.ua_por_ha !== null ? calculoUA.ua_por_ha.toFixed(2) : '—'}
                    </div>
                  </div>
                </div>
                {calculoUA.animais_sem_pesagem > 0 && (
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    {calculoUA.animais_sem_pesagem} animal(is) sem pesagem nos últimos 90 dias — usando fator por categoria
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_entrada"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Data de entrada *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="bg-[#222] border-white/10 text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_saida_prevista"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Saída prevista</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ''}
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
          name="altura_dossel_entrada_cm"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Altura dossel entrada (cm)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Ex: 25"
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
                  placeholder="Condições do pasto, estado do lote..."
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
            disabled={isSubmitting || !loteId}
            className="bg-[#00c45a] hover:bg-[#00a84d] text-black font-semibold"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar entrada'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
