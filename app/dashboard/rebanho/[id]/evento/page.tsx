'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/Breadcrumbs';

import { TipoEvento } from '@/lib/types/rebanho';
import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';
import { listLotes } from '@/lib/supabase/rebanho';
import type { Lote } from '@/lib/types/rebanho';

// Tipo interno do formulário — superconjunto de todos os campos possíveis.
// O submit monta o payload tipado correto antes de enviar ao server action.
interface EventoFormValues {
  tipo: TipoEvento;
  data_evento: string;
  observacoes: string;
  // PESAGEM
  peso_kg: string;
  condicao_corporal: string;
  metodo: string;
  // VENDA
  comprador: string;
  valor_venda: string;
  // TRANSFERÊNCIA
  lote_id_destino: string;
  // COBERTURA
  reprodutor_id: string;
  // DIAGNÓSTICO
  resultado: string;
  // PARTO
  tipo_parto: string;
}

const TIPO_LABELS: Record<TipoEvento, string> = {
  [TipoEvento.NASCIMENTO]: 'Nascimento',
  [TipoEvento.PESAGEM]: 'Pesagem',
  [TipoEvento.COBERTURA]: 'Cobertura',
  [TipoEvento.DIAGNOSTICO_PRENHEZ]: 'Diagnóstico de Prenhez',
  [TipoEvento.PARTO]: 'Parto',
  [TipoEvento.SECAGEM]: 'Secagem',
  [TipoEvento.ABORTO]: 'Aborto',
  [TipoEvento.DESCARTE]: 'Descarte',
  [TipoEvento.DESMAME]: 'Desmame',
  [TipoEvento.MORTE]: 'Morte',
  [TipoEvento.VENDA]: 'Venda',
  [TipoEvento.TRANSFERENCIA_LOTE]: 'Transferência de Lote',
};

const HOJE = new Date().toISOString().split('T')[0];

function buildPayload(animalId: string, v: EventoFormValues): unknown {
  const base = {
    animal_id: animalId,
    tipo: v.tipo,
    data_evento: v.data_evento,
    observacoes: v.observacoes || null,
  };

  switch (v.tipo) {
    case TipoEvento.PESAGEM:
      return {
        ...base,
        peso_kg: v.peso_kg ? Number(v.peso_kg) : undefined,
        condicao_corporal: v.condicao_corporal ? Number(v.condicao_corporal) : null,
        metodo: v.metodo || 'balanca',
      };
    case TipoEvento.VENDA:
      return {
        ...base,
        comprador: v.comprador || null,
        valor_venda: v.valor_venda ? Number(v.valor_venda) : null,
      };
    case TipoEvento.TRANSFERENCIA_LOTE:
      return { ...base, lote_id_destino: v.lote_id_destino };
    case TipoEvento.COBERTURA:
      return { ...base, reprodutor_id: v.reprodutor_id || null };
    case TipoEvento.DIAGNOSTICO_PRENHEZ:
      return { ...base, resultado: v.resultado };
    case TipoEvento.PARTO:
      return { ...base, tipo_parto: v.tipo_parto || null };
    default:
      return base;
  }
}

export default function EventoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const animalId = params.id;

  const [isLoading, setIsLoading] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const { register, handleSubmit, watch, control, reset, formState: { errors } } =
    useForm<EventoFormValues>({
      defaultValues: {
        tipo: TipoEvento.PESAGEM,
        data_evento: HOJE,
        observacoes: '',
        peso_kg: '',
        condicao_corporal: '',
        metodo: 'balanca',
        comprador: '',
        valor_venda: '',
        lote_id_destino: '',
        reprodutor_id: '',
        resultado: '',
        tipo_parto: '',
      },
    });

  const tipoSelecionado = watch('tipo');

  useEffect(() => {
    listLotes(100, 0).then(setLotes).catch(() => {});
  }, []);

  const onSubmit = handleSubmit(async (v) => {
    setErroServidor(null);
    setIsLoading(true);
    try {
      const payload = buildPayload(animalId, v);
      const result = await registrarEventoAction(animalId, payload);
      if (result.success) {
        toast.success('Evento registrado com sucesso');
        router.push(`/dashboard/rebanho/${animalId}`);
      } else {
        setErroServidor(result.error ?? 'Erro ao registrar evento');
        toast.error(result.error ?? 'Erro ao registrar evento');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setErroServidor(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  });

  const showPesagem = tipoSelecionado === TipoEvento.PESAGEM;
  const showVenda = tipoSelecionado === TipoEvento.VENDA;
  const showTransferencia = tipoSelecionado === TipoEvento.TRANSFERENCIA_LOTE;
  const showCobertura = tipoSelecionado === TipoEvento.COBERTURA;
  const showDiagnostico = tipoSelecionado === TipoEvento.DIAGNOSTICO_PRENHEZ;
  const showParto = tipoSelecionado === TipoEvento.PARTO;

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <Breadcrumbs />

      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/rebanho/${animalId}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">Registrar Evento</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Evento *</Label>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      reset((prev) => ({ ...prev, tipo: val as TipoEvento, data_evento: prev.data_evento }));
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TipoEvento).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="data_evento">Data do Evento *</Label>
              <Input
                id="data_evento"
                type="date"
                max={HOJE}
                disabled={isLoading}
                {...register('data_evento', { required: 'Data obrigatória' })}
              />
              {errors.data_evento && (
                <p className="text-sm text-destructive">{errors.data_evento.message}</p>
              )}
            </div>

            {/* PESAGEM */}
            {showPesagem && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="peso_kg">Peso (kg) *</Label>
                  <Input
                    id="peso_kg"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isLoading}
                    {...register('peso_kg', { required: 'Peso obrigatório' })}
                  />
                  {errors.peso_kg && (
                    <p className="text-sm text-destructive">{errors.peso_kg.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condicao_corporal">Condição Corporal (1–5)</Label>
                  <Controller
                    name="condicao_corporal"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                        <SelectTrigger id="condicao_corporal">
                          <SelectValue placeholder="Não avaliar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Não avaliar</SelectItem>
                          <SelectItem value="1">1 — Muito magro</SelectItem>
                          <SelectItem value="2">2 — Magro</SelectItem>
                          <SelectItem value="3">3 — Ideal</SelectItem>
                          <SelectItem value="4">4 — Gordo</SelectItem>
                          <SelectItem value="5">5 — Obeso</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metodo">Método</Label>
                  <Controller
                    name="metodo"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || 'balanca'} onValueChange={field.onChange} disabled={isLoading}>
                        <SelectTrigger id="metodo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="balanca">Balança</SelectItem>
                          <SelectItem value="estimativa_visual">Estimativa Visual</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </>
            )}

            {/* VENDA */}
            {showVenda && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="comprador">Comprador</Label>
                  <Input
                    id="comprador"
                    placeholder="Nome do comprador"
                    disabled={isLoading}
                    {...register('comprador')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_venda">Valor (R$)</Label>
                  <Input
                    id="valor_venda"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isLoading}
                    {...register('valor_venda')}
                  />
                </div>
              </>
            )}

            {/* TRANSFERÊNCIA DE LOTE */}
            {showTransferencia && (
              <div className="space-y-2">
                <Label htmlFor="lote_id_destino">Lote Destino *</Label>
                <Controller
                  name="lote_id_destino"
                  control={control}
                  rules={{ required: 'Lote destino obrigatório' }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                      <SelectTrigger id="lote_id_destino">
                        <SelectValue placeholder="Selecionar lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotes.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.lote_id_destino && (
                  <p className="text-sm text-destructive">{errors.lote_id_destino.message}</p>
                )}
              </div>
            )}

            {/* COBERTURA */}
            {showCobertura && (
              <div className="space-y-2">
                <Label htmlFor="reprodutor_id">Reprodutor (opcional)</Label>
                <Input
                  id="reprodutor_id"
                  placeholder="UUID do reprodutor"
                  disabled={isLoading}
                  {...register('reprodutor_id')}
                />
              </div>
            )}

            {/* DIAGNÓSTICO DE PRENHEZ */}
            {showDiagnostico && (
              <div className="space-y-2">
                <Label htmlFor="resultado">Resultado *</Label>
                <Controller
                  name="resultado"
                  control={control}
                  rules={{ required: 'Resultado obrigatório' }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                      <SelectTrigger id="resultado">
                        <SelectValue placeholder="Selecionar resultado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positivo">Positivo (Prenha)</SelectItem>
                        <SelectItem value="negativo">Negativo (Vazia)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.resultado && (
                  <p className="text-sm text-destructive">{errors.resultado.message}</p>
                )}
              </div>
            )}

            {/* PARTO */}
            {showParto && (
              <div className="space-y-2">
                <Label htmlFor="tipo_parto">Tipo de Parto</Label>
                <Controller
                  name="tipo_parto"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                      <SelectTrigger id="tipo_parto">
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simples">Simples</SelectItem>
                        <SelectItem value="gemelar">Gemelar</SelectItem>
                        <SelectItem value="triplo">Triplo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações relevantes..."
                rows={3}
                disabled={isLoading}
                {...register('observacoes')}
              />
            </div>

            {erroServidor && (
              <p className="text-sm text-destructive">{erroServidor}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isLoading}
                onClick={() => router.push(`/dashboard/rebanho/${animalId}`)}
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
        </CardContent>
      </Card>
    </div>
  );
}
