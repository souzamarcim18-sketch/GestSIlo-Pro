'use client';

import type { UseFormReturn, FieldValues } from 'react-hook-form';
import type { TipoEventoLote } from '@/lib/types/rebanho-lote';
import type { Lote } from '@/lib/types/rebanho';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Props {
  tipo: TipoEventoLote | null;
  form: UseFormReturn<FieldValues>;
  lotes: Lote[];
}

export function CamposCompartilhados({ tipo, form, lotes }: Props) {
  if (!tipo) return null;

  switch (tipo) {
    case 'pesagem':
    case 'secagem':
    case 'aborto':
    case 'desmame':
    case 'aspiracao_opu':
    case 'transferencia_embriao':
      // Apenas data_evento (exibida fora deste componente) — sem campos adicionais
      return null;

    case 'cobertura':
      return (
        <FormField
          control={form.control}
          name="tipo_cobertura"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cobertura</FormLabel>
              <FormControl>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monta_natural">Monta Natural</SelectItem>
                    <SelectItem value="ia_convencional">IA Convencional</SelectItem>
                    <SelectItem value="iatf">IATF</SelectItem>
                    <SelectItem value="tetf">TETF</SelectItem>
                    <SelectItem value="fiv">FIV</SelectItem>
                    <SelectItem value="repasse">Repasse</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'diagnostico_prenhez':
      return (
        <FormField
          control={form.control}
          name="metodo_diagnostico"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Diagnóstico</FormLabel>
              <FormControl>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="palpacao">Palpação</SelectItem>
                    <SelectItem value="ultrassom">Ultrassom</SelectItem>
                    <SelectItem value="sangue">Exame de Sangue</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'transferencia_lote':
      return (
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="lote_id_destino"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lote de Destino</FormLabel>
                <FormControl>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes.map((lote) => (
                        <SelectItem key={lote.id} value={lote.id}>
                          {lote.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
              Todos os animais selecionados serão movidos para o lote de destino.
            </AlertDescription>
          </Alert>
        </div>
      );

    case 'descarte':
      return (
        <FormField
          control={form.control}
          name="motivo_descarte"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo do Descarte</FormLabel>
              <FormControl>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idade">Idade</SelectItem>
                    <SelectItem value="reprodutivo">Reprodutivo</SelectItem>
                    <SelectItem value="sanitario">Sanitário</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="aprumos">Aprumos</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'protocolo_hormonal':
      return (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="finalidade_protocolo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Finalidade do Protocolo</FormLabel>
                <FormControl>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a finalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_iatf">Pré-IATF</SelectItem>
                      <SelectItem value="pre_te">Pré-TE</SelectItem>
                      <SelectItem value="monta_natural">Monta Natural</SelectItem>
                      <SelectItem value="sincronizacao_receptoras">Sincronização de Receptoras</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="produto_hormonal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto Hormonal</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: GnRH"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dose_produto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dose</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 2ml"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="via_aplicacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Via de Aplicação</FormLabel>
                  <FormControl>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Via" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IM">IM (Intramuscular)</SelectItem>
                        <SelectItem value="IV">IV (Intravenosa)</SelectItem>
                        <SelectItem value="SC">SC (Subcutânea)</SelectItem>
                        <SelectItem value="SL">SL (Sublingual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}
