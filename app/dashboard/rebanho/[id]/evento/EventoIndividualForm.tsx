'use client';

import { useState } from 'react';
import { useForm, type Resolver, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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

import { TipoEvento } from '@/lib/types/rebanho';
import type { Lote } from '@/lib/types/rebanho';
import {
  criarEventoNascimentoSchema,
  criarEventoPesagemSchema,
  criarEventoMorteSchema,
  criarEventoVendaSchema,
  criarEventoTransferenciaSchema,
  criarEventoCoberturaSchema,
  criarEventoDiagnosticoPrenhezSchema,
  criarEventoPartoSchema,
  criarEventoDesmameSchema,
  criarEventoSecagemSchema,
  criarEventoAbortoSchema,
  criarEventoDescarteSchema,
} from '@/lib/validations/rebanho';
import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';

const HOJE = new Date().toISOString().split('T')[0];

type EventoResolver = Resolver<EventoFormValues>;

// Mapa tipo → resolver Zod. Mesma fonte de validação da rota de escrita única
// (a Server Action `registrarEventoAction` valida com `criarEventoSchema`).
// Os resolvers são construídos com schemas concretos para preservar a inferência.
const RESOLVER_POR_TIPO: Record<TipoEvento, EventoResolver | undefined> = {
  [TipoEvento.NASCIMENTO]: zodResolver(criarEventoNascimentoSchema) as unknown as EventoResolver,
  [TipoEvento.PESAGEM]: zodResolver(criarEventoPesagemSchema) as unknown as EventoResolver,
  [TipoEvento.MORTE]: zodResolver(criarEventoMorteSchema) as unknown as EventoResolver,
  [TipoEvento.VENDA]: zodResolver(criarEventoVendaSchema) as unknown as EventoResolver,
  [TipoEvento.TRANSFERENCIA_LOTE]: zodResolver(criarEventoTransferenciaSchema) as unknown as EventoResolver,
  [TipoEvento.COBERTURA]: zodResolver(criarEventoCoberturaSchema) as unknown as EventoResolver,
  [TipoEvento.DIAGNOSTICO_PRENHEZ]: zodResolver(criarEventoDiagnosticoPrenhezSchema) as unknown as EventoResolver,
  [TipoEvento.PARTO]: zodResolver(criarEventoPartoSchema) as unknown as EventoResolver,
  [TipoEvento.DESMAME]: zodResolver(criarEventoDesmameSchema) as unknown as EventoResolver,
  [TipoEvento.SECAGEM]: zodResolver(criarEventoSecagemSchema) as unknown as EventoResolver,
  [TipoEvento.ABORTO]: zodResolver(criarEventoAbortoSchema) as unknown as EventoResolver,
  [TipoEvento.DESCARTE]: zodResolver(criarEventoDescarteSchema) as unknown as EventoResolver,
  // Tratado por `mudarCategoriaAction`, não pela RPC de eventos.
  [TipoEvento.MUDANCA_CATEGORIA]: undefined,
};

// Superconjunto dos campos do formulário. O resolver Zod por tipo só valida e
// repassa os campos pertinentes; o restante é ignorado pelo schema.
interface EventoFormValues extends FieldValues {
  animal_id: string;
  tipo: TipoEvento;
  data_evento: string;
  observacoes: string | null;
  peso_kg?: number;
  escore_condicao_corporal?: number | null;
  comprador?: string | null;
  valor_venda?: number | null;
  lote_id_destino?: string;
  tipo_cobertura?: string;
  reprodutor_id?: string | null;
  resultado_prenhez?: string;
  tipo_parto?: string | null;
}

interface EventoIndividualFormProps {
  animalId: string;
  tipo: TipoEvento;
  lotes: Lote[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function EventoIndividualForm({
  animalId,
  tipo,
  lotes,
  onSuccess,
  onCancel,
}: EventoIndividualFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EventoFormValues>({
    resolver: RESOLVER_POR_TIPO[tipo],
    defaultValues: {
      animal_id: animalId,
      tipo,
      data_evento: HOJE,
      observacoes: null,
      escore_condicao_corporal: null,
      comprador: null,
      valor_venda: null,
      lote_id_destino: '',
      tipo_cobertura: '',
      reprodutor_id: null,
      resultado_prenhez: '',
      tipo_parto: null,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    try {
      // `values` já está validado/coagido pelo schema do tipo selecionado.
      // Persistência pela rota de escrita única → RPC registrar_evento_com_status.
      const result = await registrarEventoAction(animalId, values);
      if (result.success) {
        toast.success('Evento registrado com sucesso');
        onSuccess();
      } else {
        toast.error(result.error ?? 'Erro ao registrar evento');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Data */}
        <FormField
          control={form.control}
          name="data_evento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data do Evento *</FormLabel>
              <FormControl>
                <Input type="date" max={HOJE} disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PESAGEM */}
        {tipo === TipoEvento.PESAGEM && (
          <>
            <FormField
              control={form.control}
              name="peso_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isLoading}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? undefined : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="escore_condicao_corporal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escore de Condição Corporal (1–5)</FormLabel>
                  <Select
                    value={field.value != null ? String(field.value) : ''}
                    onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Não avaliar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Não avaliar</SelectItem>
                      <SelectItem value="1">1 — Muito magro</SelectItem>
                      <SelectItem value="2">2 — Magro</SelectItem>
                      <SelectItem value="3">3 — Ideal</SelectItem>
                      <SelectItem value="4">4 — Gordo</SelectItem>
                      <SelectItem value="5">5 — Obeso</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* VENDA */}
        {tipo === TipoEvento.VENDA && (
          <>
            <FormField
              control={form.control}
              name="comprador"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprador</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do comprador"
                      disabled={isLoading}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valor_venda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isLoading}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* TRANSFERÊNCIA DE LOTE */}
        {tipo === TipoEvento.TRANSFERENCIA_LOTE && (
          <FormField
            control={form.control}
            name="lote_id_destino"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lote Destino *</FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar lote" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lotes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* COBERTURA */}
        {tipo === TipoEvento.COBERTURA && (
          <>
            <FormField
              control={form.control}
              name="tipo_cobertura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Cobertura *</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monta_natural">Monta Natural</SelectItem>
                      <SelectItem value="ia_convencional">
                        Inseminação Artificial (IA)
                      </SelectItem>
                      <SelectItem value="iatf">
                        IATF — Inseminação em Tempo Fixo
                      </SelectItem>
                      <SelectItem value="tetf">
                        Transferência de Embrião (TE/TF)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reprodutor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reprodutor (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="UUID do reprodutor"
                      disabled={isLoading}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* DIAGNÓSTICO DE PRENHEZ */}
        {tipo === TipoEvento.DIAGNOSTICO_PRENHEZ && (
          <FormField
            control={form.control}
            name="resultado_prenhez"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resultado *</FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar resultado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="positivo">Positivo (Prenha)</SelectItem>
                    <SelectItem value="negativo">Negativo (Vazia)</SelectItem>
                    <SelectItem value="duvidoso">Duvidoso</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* PARTO */}
        {tipo === TipoEvento.PARTO && (
          <FormField
            control={form.control}
            name="tipo_parto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Parto</FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={(val) => field.onChange(val || null)}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="distocico">Distócico</SelectItem>
                    <SelectItem value="cesariana">Cesariana</SelectItem>
                    <SelectItem value="simples">Simples</SelectItem>
                    <SelectItem value="gemelar">Gemelar</SelectItem>
                    <SelectItem value="triplo">Triplo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Observações — comum a todos os tipos */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações relevantes..."
                  rows={3}
                  disabled={isLoading}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              'Registrar Evento'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
