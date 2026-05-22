'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, X, Search, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { atividadeFormSchema, type AtividadeFormData } from '@/lib/validations/mao-de-obra';
import { criarAtividadeAction, editarAtividadeAction } from '../actions';
import {
  TIPOS_ATIVIDADE,
  HORAS_POR_DIA,
  type Colaborador,
  type AtividadeComColaboradores,
} from '@/lib/types/mao-de-obra';
import { formatBRL, calcularCustoColaborador } from '@/lib/utils';

type VinculoTipo = 'nenhum' | 'talhao' | 'silo' | 'maquina';

interface AtividadeFormProps {
  colaboradores: Colaborador[];
  talhoes: Array<{ id: string; nome: string }>;
  silos: Array<{ id: string; nome: string }>;
  maquinas: Array<{ id: string; nome: string }>;
  atividade?: AtividadeComColaboradores;
  onSuccess: () => void;
  onCancel: () => void;
}

function getVinculoInicial(a?: AtividadeComColaboradores): VinculoTipo {
  if (!a) return 'nenhum';
  if (a.talhao_id) return 'talhao';
  if (a.silo_id) return 'silo';
  if (a.maquina_id) return 'maquina';
  return 'nenhum';
}

export function AtividadeForm({
  colaboradores,
  talhoes,
  silos,
  maquinas,
  atividade,
  onSuccess,
  onCancel,
}: AtividadeFormProps) {
  const [busca, setBusca] = useState('');
  const [vinculoTipo, setVinculoTipo] = useState<VinculoTipo>(getVinculoInicial(atividade));

  const form = useForm<AtividadeFormData>({
    resolver: zodResolver(atividadeFormSchema),
    defaultValues: {
      data: atividade?.data ?? new Date().toISOString().split('T')[0],
      tipo_atividade: atividade?.tipo_atividade ?? 'Trato/alimentação do rebanho',
      colaboradores: atividade?.colaboradores.map((c) => c.id) ?? [],
      duracao_tipo: atividade?.duracao_tipo ?? 'horas',
      duracao_valor: atividade?.duracao_valor ?? 1,
      custo_manual: atividade?.custo_manual ?? undefined,
      talhao_id: atividade?.talhao_id ?? undefined,
      silo_id: atividade?.silo_id ?? undefined,
      maquina_id: atividade?.maquina_id ?? undefined,
      observacoes: atividade?.observacoes ?? '',
    },
  });

  const { isSubmitting } = form.formState;
  const colaboradoresSelecionados = form.watch('colaboradores');
  const duracaoTipo = form.watch('duracao_tipo');
  const duracaoValor = form.watch('duracao_valor') || 0;
  const custoManual = form.watch('custo_manual');

  // Preview de custo em tempo real
  const preview = useMemo(() => {
    return colaboradoresSelecionados.map((id) => {
      const c = colaboradores.find((col) => col.id === id);
      if (!c) return { id, nome: '?', custo: 0 };
      const custo = calcularCustoColaborador(duracaoTipo, duracaoValor, c.tipo_valor, c.valor_ref);
      return { id, nome: c.nome, custo };
    });
  }, [colaboradoresSelecionados, colaboradores, duracaoTipo, duracaoValor]);

  const custoCalculado = preview.reduce((acc, p) => acc + p.custo, 0);
  const custoFinal = custoManual != null && custoManual >= 0 ? custoManual : custoCalculado;

  // Texto de conversão hora↔dia
  const conversaoTexto = useMemo(() => {
    const c = colaboradores.find((col) => colaboradoresSelecionados.includes(col.id));
    if (!c || duracaoValor <= 0) return null;
    if (duracaoTipo === 'horas' && c.tipo_valor === 'diaria') {
      return `${duracaoValor}h ÷ ${HORAS_POR_DIA}h/dia = ${(duracaoValor / HORAS_POR_DIA).toFixed(2)} dias`;
    }
    if (duracaoTipo === 'dias' && c.tipo_valor === 'hora') {
      return `${duracaoValor}d × ${HORAS_POR_DIA}h/dia = ${(duracaoValor * HORAS_POR_DIA).toFixed(0)}h`;
    }
    return null;
  }, [colaboradoresSelecionados, colaboradores, duracaoTipo, duracaoValor]);

  const colaboradoresFiltrados = colaboradores.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  function toggleColaborador(id: string) {
    const atual = form.getValues('colaboradores');
    if (atual.includes(id)) {
      form.setValue('colaboradores', atual.filter((c) => c !== id), { shouldValidate: true });
    } else {
      form.setValue('colaboradores', [...atual, id], { shouldValidate: true });
    }
  }

  function handleVinculoChange(tipo: VinculoTipo) {
    setVinculoTipo(tipo);
    form.setValue('talhao_id', undefined);
    form.setValue('silo_id', undefined);
    form.setValue('maquina_id', undefined);
  }

  async function onSubmit(data: AtividadeFormData) {
    const result = atividade
      ? await editarAtividadeAction(atividade.id, data)
      : await criarAtividadeAction(data);

    if (result.success) {
      toast.success(atividade ? 'Atividade atualizada.' : 'Atividade registrada.');
      onSuccess();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Data e tipo */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="data"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo_atividade"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Tipo de atividade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_ATIVIDADE.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Multi-select colaboradores */}
        <FormField
          control={form.control}
          name="colaboradores"
          render={() => (
            <FormItem>
              <FormLabel className="text-sm">Colaboradores</FormLabel>
              {/* Chips dos selecionados */}
              {colaboradoresSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {colaboradoresSelecionados.map((id) => {
                    const c = colaboradores.find((col) => col.id === id);
                    return (
                      <Badge
                        key={id}
                        variant="outline"
                        className="gap-1 text-xs cursor-pointer"
                        style={{ background: 'rgba(115,141,69,0.15)', border: '1px solid rgba(115,141,69,0.4)', color: '#a8c56a' }}
                        onClick={() => toggleColaborador(id)}
                      >
                        {c?.nome ?? id}
                        <X className="h-3 w-3" />
                      </Badge>
                    );
                  })}
                </div>
              )}
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              {/* Lista */}
              <div
                className="rounded-lg max-h-36 overflow-y-auto"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#161616' }}
              >
                {colaboradoresFiltrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">Nenhum colaborador ativo.</p>
                ) : (
                  colaboradoresFiltrados.map((c) => {
                    const selecionado = colaboradoresSelecionados.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleColaborador(c.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors"
                        style={{
                          background: selecionado ? 'rgba(115,141,69,0.12)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <span className={selecionado ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                          {c.nome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.funcao} · {formatBRL(c.valor_ref)}/{c.tipo_valor === 'diaria' ? 'dia' : 'h'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Duração */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="duracao_tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Tipo de duração</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="horas">Horas</SelectItem>
                    <SelectItem value="dias">Dias</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duracao_valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  Quantidade ({duracaoTipo === 'horas' ? 'h' : 'd'})
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="1"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Preview de custo em tempo real */}
        {colaboradoresSelecionados.length > 0 && duracaoValor > 0 && (
          <div
            className="rounded-lg p-3 space-y-2"
            style={{ background: 'rgba(115,141,69,0.08)', border: '1px solid rgba(115,141,69,0.2)' }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#738D45' }}>
              <Calculator className="h-3.5 w-3.5" />
              Preview de custo
            </div>
            {conversaoTexto && (
              <p className="text-xs text-muted-foreground">Conversão: {conversaoTexto}</p>
            )}
            <div className="space-y-1">
              {preview.map((p) => (
                <div key={p.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{p.nome}</span>
                  <span className="font-semibold text-foreground">{formatBRL(p.custo)}</span>
                </div>
              ))}
            </div>
            <div
              className="flex justify-between text-sm font-bold pt-1"
              style={{ borderTop: '1px solid rgba(115,141,69,0.25)' }}
            >
              <span style={{ color: '#738D45' }}>Custo calculado</span>
              <span className="text-foreground">{formatBRL(custoCalculado)}</span>
            </div>
            {custoManual != null && custoManual >= 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ background: 'rgba(245,208,0,0.08)', border: '1px solid rgba(245,208,0,0.3)', color: '#f5d000' }}
                >
                  Custo fixo (manual): {formatBRL(custoManual)}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Custo manual (opcional) */}
        <FormField
          control={form.control}
          name="custo_manual"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">
                Custo manual (R$){' '}
                <span className="text-muted-foreground font-normal">— sobrescreve o calculado</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Deixe vazio para usar o calculado"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === '' ? undefined : parseFloat(v));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vínculo */}
        <div className="space-y-2">
          <FormLabel className="text-sm">Vínculo (opcional)</FormLabel>
          <div className="flex gap-2 flex-wrap">
            {(['nenhum', 'talhao', 'silo', 'maquina'] as VinculoTipo[]).map((tipo) => {
              const labels: Record<VinculoTipo, string> = {
                nenhum: 'Nenhum',
                talhao: 'Talhão',
                silo: 'Silo',
                maquina: 'Máquina',
              };
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => handleVinculoChange(tipo)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={
                    vinculoTipo === tipo
                      ? { background: '#738D45', color: '#fff' }
                      : { background: '#222', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {labels[tipo]}
                </button>
              );
            })}
          </div>

          {vinculoTipo === 'talhao' && talhoes.length > 0 && (
            <FormField
              control={form.control}
              name="talhao_id"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o talhão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {talhoes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {vinculoTipo === 'silo' && silos.length > 0 && (
            <FormField
              control={form.control}
              name="silo_id"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o silo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {silos.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {vinculoTipo === 'maquina' && maquinas.length > 0 && (
            <FormField
              control={form.control}
              name="maquina_id"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a máquina" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {maquinas.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações opcionais..."
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custo final no rodapé */}
        <div
          className="rounded-lg p-3 flex items-center justify-between"
          style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="text-sm text-muted-foreground">Custo final a registrar</span>
          <span className="text-lg font-bold" style={{ color: '#738D45' }}>
            {formatBRL(custoFinal)}
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="font-semibold"
            style={{ background: '#738D45', color: '#fff' }}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {atividade ? 'Salvar alterações' : 'Registrar atividade'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
