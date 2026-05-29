'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertCircle, CopyPlus, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CamposCompartilhados } from '@/components/rebanho/lote/CamposCompartilhados';
import { criarEventosLoteAction } from '@/app/dashboard/rebanho/eventos/lote/actions';
import {
  TIPOS_EVENTO_LOTE,
  LABEL_TIPO_EVENTO,
  type TipoEventoLote,
  type WizardStep,
  type AnimalParaLote,
  type ResultadoLote,
} from '@/lib/types/rebanho-lote';
import { dadosCompartilhadosPorTipo } from '@/lib/validations/rebanho-lote';
import type { Lote } from '@/lib/types/rebanho';
import type { FieldValues } from 'react-hook-form';

interface Props {
  animais: AnimalParaLote[];
  lotes: Lote[];
}

// Determina se um campo individual é obrigatório para o tipo
function getCamposObrigatorios(tipo: TipoEventoLote): string[] {
  switch (tipo) {
    case 'pesagem':
      return ['peso_kg'];
    case 'diagnostico_prenhez':
      return ['resultado_prenhez'];
    default:
      return [];
  }
}

// Verifica se uma linha tem todos os campos obrigatórios preenchidos
function linhaValida(
  animalId: string,
  tipo: TipoEventoLote,
  dadosIndividuais: Record<string, Record<string, unknown>>
): boolean {
  const obrigatorios = getCamposObrigatorios(tipo);
  if (obrigatorios.length === 0) return true;
  const dados = dadosIndividuais[animalId] ?? {};
  return obrigatorios.every((campo) => {
    const val = dados[campo];
    return val !== undefined && val !== null && val !== '';
  });
}

// Colunas editáveis por tipo
interface ColunaTabela {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  obrigatorio?: boolean;
  opcoes?: Array<{ value: string; label: string }>;
  minWidth?: string;
}

function getColunasParaTipo(tipo: TipoEventoLote): ColunaTabela[] {
  switch (tipo) {
    case 'pesagem':
      return [
        { key: 'peso_kg', label: 'Peso (kg)', type: 'number', obrigatorio: true, minWidth: '100px' },
        { key: 'escore_condicao_corporal', label: 'Escore (1-5)', type: 'number', minWidth: '100px' },
      ];
    case 'cobertura':
      return [
        { key: 'reprodutor_id', label: 'Reprodutor (ID)', type: 'text', minWidth: '160px' },
        { key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' },
      ];
    case 'diagnostico_prenhez':
      return [
        {
          key: 'resultado_prenhez',
          label: 'Resultado',
          type: 'select',
          obrigatorio: true,
          minWidth: '140px',
          opcoes: [
            { value: 'positivo', label: 'Positivo' },
            { value: 'negativo', label: 'Negativo' },
            { value: 'duvidoso', label: 'Duvidoso' },
          ],
        },
        { key: 'idade_gestacional_dias', label: 'Idade Gest. (dias)', type: 'number', minWidth: '140px' },
        { key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' },
      ];
    case 'transferencia_lote':
      return [];
    case 'secagem':
      return [{ key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' }];
    case 'aborto':
      return [
        { key: 'causa_aborto', label: 'Causa', type: 'text', minWidth: '160px' },
        { key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' },
      ];
    case 'descarte':
      return [{ key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' }];
    case 'desmame':
      return [
        { key: 'peso_kg', label: 'Peso ao Desmame (kg)', type: 'number', minWidth: '160px' },
        { key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' },
      ];
    case 'aspiracao_opu':
      return [
        { key: 'oocitos_coletados', label: 'Oócitos Coletados', type: 'number', minWidth: '140px' },
        { key: 'oocitos_viaveis', label: 'Oócitos Viáveis', type: 'number', minWidth: '120px' },
        {
          key: 'grau_qualidade_opu',
          label: 'Grau Qualidade',
          type: 'select',
          minWidth: '120px',
          opcoes: [
            { value: 'I', label: 'I' },
            { value: 'II', label: 'II' },
            { value: 'III', label: 'III' },
            { value: 'IV', label: 'IV' },
          ],
        },
        { key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' },
      ];
    case 'protocolo_hormonal':
      return [{ key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' }];
    case 'transferencia_embriao':
      return [
        { key: 'grau_embriao', label: 'Grau Embrião (1-4)', type: 'number', minWidth: '140px' },
        { key: 'raca_embriao', label: 'Raça Embrião', type: 'text', minWidth: '140px' },
        { key: 'reprodutor_id', label: 'Reprodutor Doador (ID)', type: 'text', minWidth: '180px' },
        {
          key: 'resultado_te',
          label: 'Resultado TE',
          type: 'select',
          minWidth: '140px',
          opcoes: [
            { value: 'transferido', label: 'Transferido' },
            { value: 'nao_transferido', label: 'Não transferido' },
          ],
        },
        { key: 'observacoes', label: 'Observações', type: 'text', minWidth: '200px' },
      ];
  }
}

// Indicador de progresso
function StepIndicator({ step }: { step: WizardStep }) {
  const passos = [
    { num: 1, label: 'Configurar' },
    { num: 2, label: 'Selecionar' },
    { num: 3, label: 'Preencher' },
  ];
  return (
    <div className="flex items-center gap-2 mb-6">
      {passos.map((p, i) => (
        <div key={p.num} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
              step > p.num
                ? 'bg-primary text-primary-foreground'
                : step === p.num
                  ? 'border-2 border-primary text-primary'
                  : 'border border-muted-foreground/40 text-muted-foreground'
            )}
          >
            {p.num}
          </div>
          <span
            className={cn(
              'text-sm',
              step === p.num ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}
          >
            {p.label}
          </span>
          {i < passos.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          )}
        </div>
      ))}
    </div>
  );
}

export function EventosLoteClient({ animais, lotes }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [tipo, setTipo] = useState<TipoEventoLote | null>(null);
  const [animaisSelecionados, setAnimaisSelecionados] = useState<AnimalParaLote[]>([]);
  const [dadosIndividuais, setDadosIndividuais] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errosDialog, setErrosDialog] = useState<ResultadoLote['erros'] | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Filtros etapa 2
  const [filtroLote, setFiltroLote] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroSexo, setFiltroSexo] = useState<string>('');
  const [inputBusca, setInputBusca] = useState<string>('');
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Debounce da busca
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBuscaChange = useCallback((valor: string) => {
    setInputBusca(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setTermoBusca(valor), 300);
  }, []);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Form do step 1
  const schemaStep1 = tipo ? dadosCompartilhadosPorTipo[tipo] : dadosCompartilhadosPorTipo['pesagem'];
  const form = useForm<FieldValues>({
    resolver: zodResolver(schemaStep1) as unknown as Resolver<FieldValues>,
    defaultValues: { data_evento: new Date().toISOString().split('T')[0] },
    mode: 'onChange',
  });

  const today = new Date().toISOString().split('T')[0];

  // Categorias e lotes únicos para filtros
  const categorias = useMemo(
    () => Array.from(new Set(animais.map((a) => a.categoria))).sort(),
    [animais]
  );
  const lotesComAnimais = useMemo(() => {
    const ids = new Set(animais.map((a) => a.lote_id).filter(Boolean));
    return lotes.filter((l) => ids.has(l.id));
  }, [animais, lotes]);

  // Animais filtrados (etapa 2)
  const animaisFiltrados = useMemo(() => {
    return animais.filter((a) => {
      if (filtroLote && a.lote_id !== filtroLote) return false;
      if (filtroCategoria && a.categoria !== filtroCategoria) return false;
      if (filtroSexo && a.sexo !== filtroSexo) return false;
      if (termoBusca) {
        const t = termoBusca.toLowerCase();
        return a.brinco.toLowerCase().includes(t) || (a.nome ?? '').toLowerCase().includes(t);
      }
      return true;
    });
  }, [animais, filtroLote, filtroCategoria, filtroSexo, termoBusca]);

  const selecionadosSet = useMemo(
    () => new Set(animaisSelecionados.map((a) => a.id)),
    [animaisSelecionados]
  );

  const toggleAnimal = useCallback((animal: AnimalParaLote) => {
    setAnimaisSelecionados((prev) => {
      if (prev.some((a) => a.id === animal.id)) {
        return prev.filter((a) => a.id !== animal.id);
      }
      return [...prev, animal];
    });
  }, []);

  const selecionarTodosFiltrados = useCallback(() => {
    setAnimaisSelecionados((prev) => {
      const novoSet = new Set(prev.map((a) => a.id));
      const novos = animaisFiltrados.filter((a) => !novoSet.has(a.id));
      return [...prev, ...novos];
    });
  }, [animaisFiltrados]);

  const limparSelecao = useCallback(() => setAnimaisSelecionados([]), []);

  // Atualiza campo individual de um animal
  const setDadoIndividual = useCallback(
    (animalId: string, campo: string, valor: unknown) => {
      setDadosIndividuais((prev) => ({
        ...prev,
        [animalId]: { ...(prev[animalId] ?? {}), [campo]: valor },
      }));
    },
    []
  );

  // Cascata: aplica valor da linha 0 nas demais
  const aplicarCascata = useCallback(
    (campo: string) => {
      if (animaisSelecionados.length === 0) return;
      const primeiroId = animaisSelecionados[0].id;
      const valor = (dadosIndividuais[primeiroId] ?? {})[campo];
      setDadosIndividuais((prev) => {
        const novo = { ...prev };
        for (const a of animaisSelecionados.slice(1)) {
          novo[a.id] = { ...(novo[a.id] ?? {}), [campo]: valor };
        }
        return novo;
      });
    },
    [animaisSelecionados, dadosIndividuais]
  );

  const colunas = tipo ? getColunasParaTipo(tipo) : [];

  const animaisCompletos = useMemo(() => {
    if (!tipo) return 0;
    return animaisSelecionados.filter((a) => linhaValida(a.id, tipo, dadosIndividuais)).length;
  }, [animaisSelecionados, tipo, dadosIndividuais]);

  // Navegar step 1 → 2
  const irParaStep2 = form.handleSubmit(() => {
    if (!tipo) return;
    setStep(2);
  });

  const handleTipoChange = useCallback(
    (novoTipo: TipoEventoLote) => {
      setTipo(novoTipo);
      const dataAtual = form.getValues('data_evento') as string | undefined;
      form.reset({ data_evento: dataAtual ?? today });
      setAnimaisSelecionados([]);
      setDadosIndividuais({});
    },
    [form, today]
  );

  const handleSubmit = useCallback(async () => {
    if (!tipo) return;
    setIsSubmitting(true);
    try {
      const compartilhados = form.getValues() as Record<string, unknown>;
      const animaisParaEnviar = animaisSelecionados.filter((a) =>
        linhaValida(a.id, tipo, dadosIndividuais)
      );

      const result = await criarEventosLoteAction({
        tipo,
        dados_compartilhados: compartilhados,
        animais: animaisParaEnviar.map((a) => ({
          animal_id: a.id,
          dados_individuais: dadosIndividuais[a.id] ?? {},
        })),
      });

      if (!result.success && !result.data) {
        toast.error(result.error ?? 'Erro ao processar lançamento em lote');
        return;
      }

      const { inseridos, erros } = result.data!;

      if (erros.length === 0) {
        toast.success(`${inseridos} evento(s) registrado(s) com sucesso.`);
        router.push('/dashboard/rebanho');
      } else if (inseridos > 0) {
        toast.warning(`${inseridos} evento(s) registrado(s). ${erros.length} falharam.`);
        setErrosDialog(erros);
      } else {
        toast.error('Nenhum evento foi registrado. Verifique os dados e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
      setConfirmDialog(false);
    }
  }, [tipo, form, animaisSelecionados, dadosIndividuais, router]);

  const handleConfirmarClick = useCallback(() => {
    if (!tipo) return;
    if (animaisCompletos < animaisSelecionados.length) {
      setConfirmDialog(true);
    } else {
      handleSubmit();
    }
  }, [tipo, animaisCompletos, animaisSelecionados.length, handleSubmit]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lançamento em Lote</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registre eventos para múltiplos animais de uma vez
        </p>
      </div>

      <StepIndicator step={step} />

      {/* ── ETAPA 1 ── */}
      {step === 1 && (
        <div className="space-y-6 rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold">Etapa 1 — Configurar o Evento</h2>

          <div className="space-y-2">
            <Label htmlFor="tipo-evento" className="text-sm font-medium">
              Tipo de Evento <span className="text-destructive">*</span>
            </Label>
            <Select value={tipo ?? ''} onValueChange={(v) => handleTipoChange(v as TipoEventoLote)}>
              <SelectTrigger id="tipo-evento" className="h-10 max-w-sm">
                <SelectValue placeholder="Selecione o tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_EVENTO_LOTE.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LABEL_TIPO_EVENTO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Form {...form}>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data-evento" className="text-sm font-medium">
                  Data do Evento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="data-evento"
                  type="date"
                  max={today}
                  className="h-10 max-w-[200px]"
                  {...form.register('data_evento')}
                />
                {form.formState.errors['data_evento'] && (
                  <p className="text-sm text-destructive">
                    {String(form.formState.errors['data_evento']?.message ?? '')}
                  </p>
                )}
              </div>

              {tipo && (
                <CamposCompartilhados tipo={tipo} form={form} lotes={lotes} />
              )}
            </form>
          </Form>

          <div className="flex justify-end pt-2">
            <Button
              onClick={irParaStep2}
              disabled={!tipo || !form.formState.isValid}
              className="h-10"
            >
              Próximo
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── ETAPA 2 ── */}
      {step === 2 && (
        <div className="space-y-4 rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold">
            Etapa 2 — Selecionar Animais{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({animaisSelecionados.length} selecionados)
            </span>
          </h2>

          {/* Filtros */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-sm">Lote</Label>
              <Select value={filtroLote} onValueChange={(v) => setFiltroLote(!v || v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os lotes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os lotes</SelectItem>
                  {lotesComAnimais.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Categoria</Label>
              <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(!v || v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Sexo</Label>
              <Select value={filtroSexo} onValueChange={(v) => setFiltroSexo(!v || v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Fêmea">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Buscar</Label>
              <Input
                placeholder="Brinco ou nome"
                value={inputBusca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Ações de seleção */}
          <div className="flex items-center gap-3 text-sm">
            <Button variant="outline" size="sm" onClick={selecionarTodosFiltrados} className="h-8">
              Selecionar todos os filtrados ({animaisFiltrados.length})
            </Button>
            {animaisSelecionados.length > 0 && (
              <Button variant="ghost" size="sm" onClick={limparSelecao} className="h-8 text-muted-foreground">
                Limpar seleção
              </Button>
            )}
          </div>

          {/* Tabela de animais */}
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="text-sm">Brinco</TableHead>
                  <TableHead className="text-sm">Nome</TableHead>
                  <TableHead className="text-sm">Categoria</TableHead>
                  <TableHead className="text-sm">Lote Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animaisFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum animal encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  animaisFiltrados.map((animal) => (
                    <TableRow
                      key={animal.id}
                      className="cursor-pointer"
                      onClick={() => toggleAnimal(animal)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selecionadosSet.has(animal.id)}
                          onCheckedChange={() => toggleAnimal(animal)}
                          aria-label={`Selecionar ${animal.brinco}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{animal.brinco}</TableCell>
                      <TableCell className="text-sm">{animal.nome ?? '—'}</TableCell>
                      <TableCell className="text-sm">{animal.categoria}</TableCell>
                      <TableCell className="text-sm">{animal.lote_nome ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="h-10">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {animaisSelecionados.length} animal(is) selecionado(s)
              </span>
              <Button
                onClick={() => setStep(3)}
                disabled={animaisSelecionados.length === 0}
                className="h-10"
              >
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ETAPA 3 ── */}
      {step === 3 && tipo && (
        <div className="space-y-4 rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold">
            Etapa 3 — Dados Individuais
          </h2>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm min-w-[80px]">Brinco</TableHead>
                  <TableHead className="text-sm min-w-[100px]">Nome</TableHead>
                  {colunas.map((col) => (
                    <TableHead key={col.key} className="text-sm" style={{ minWidth: col.minWidth }}>
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
                        {col.obrigatorio && <span className="text-destructive">*</span>}
                        {colunas.length > 0 && (
                          <button
                            type="button"
                            title="Aplicar valor da primeira linha a todos"
                            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => aplicarCascata(col.key)}
                          >
                            <CopyPlus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {animaisSelecionados.map((animal, rowIdx) => {
                  const dados = dadosIndividuais[animal.id] ?? {};
                  return (
                    <TableRow key={animal.id}>
                      <TableCell className="text-sm font-medium">{animal.brinco}</TableCell>
                      <TableCell className="text-sm">{animal.nome ?? '—'}</TableCell>
                      {colunas.map((col, colIdx) => {
                        const valor = dados[col.key];
                        const vazio = col.obrigatorio && (valor === undefined || valor === null || valor === '');
                        const inputId = `cell-${animal.id}-${col.key}`;
                        return (
                          <TableCell key={col.key} className="p-1">
                            {col.type === 'select' ? (
                              <div className={cn('relative', vazio && 'ring-1 ring-amber-500 rounded-md')}>
                                <Select
                                  value={String(valor ?? '')}
                                  onValueChange={(v) => setDadoIndividual(animal.id, col.key, v === '' ? null : v)}
                                >
                                  <SelectTrigger
                                    id={inputId}
                                    className={cn('h-9 text-sm', vazio && 'border-amber-500')}
                                    style={{ minWidth: col.minWidth }}
                                  >
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">—</SelectItem>
                                    {col.opcoes?.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {vazio && (
                                  <AlertCircle className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 pointer-events-none" />
                                )}
                              </div>
                            ) : (
                              <div className="relative">
                                <Input
                                  id={inputId}
                                  type={col.type === 'number' ? 'number' : 'text'}
                                  value={String(valor ?? '')}
                                  onChange={(e) =>
                                    setDadoIndividual(
                                      animal.id,
                                      col.key,
                                      e.target.value === '' ? null : e.target.value
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextRowIdx = rowIdx + 1;
                                      if (nextRowIdx < animaisSelecionados.length) {
                                        const nextId = `cell-${animaisSelecionados[nextRowIdx].id}-${col.key}`;
                                        document.getElementById(nextId)?.focus();
                                      }
                                    }
                                  }}
                                  className={cn(
                                    'h-9 text-sm',
                                    vazio && 'border-amber-500 focus-visible:ring-amber-500/50'
                                  )}
                                  style={{ minWidth: col.minWidth }}
                                  step={col.key === 'escore_condicao_corporal' ? 0.5 : undefined}
                                  min={col.type === 'number' ? 0 : undefined}
                                />
                                {vazio && (
                                  <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 pointer-events-none" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      {colunas.length === 0 && (
                        <TableCell className="text-sm text-muted-foreground italic">
                          Sem campos adicionais — todos serão movidos para o lote selecionado
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)} className="h-10">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {animaisCompletos} de {animaisSelecionados.length} animal(is) preenchido(s)
              </span>
              <Button
                onClick={handleConfirmarClick}
                disabled={isSubmitting || animaisSelecionados.length === 0}
                className="h-10"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar lançamento
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmação parcial */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar lançamento parcial</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {animaisSelecionados.length - animaisCompletos} de {animaisSelecionados.length} animal(is) têm dados incompletos.
            Deseja salvar apenas os {animaisCompletos} com dados válidos?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || animaisCompletos === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar {animaisCompletos} animal(is)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de erros parciais */}
      <Dialog open={!!errosDialog} onOpenChange={() => setErrosDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Animais com falha no registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {errosDialog?.map((e) => (
              <div key={e.animal_id} className="flex items-start gap-2 text-sm">
                <Badge variant="destructive" className="shrink-0">{e.brinco}</Badge>
                <span className="text-muted-foreground">{e.motivo}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setErrosDialog(null)}>
              Fechar
            </Button>
            <Button onClick={() => router.push('/dashboard/rebanho')}>
              Ir para o Rebanho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
