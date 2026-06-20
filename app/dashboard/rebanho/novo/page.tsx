'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleButtonGroup } from '@/components/ui/toggle-button-group';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { criarAnimalAction } from '../actions';
import { listLotes } from '@/lib/supabase/rebanho';
import type { Lote } from '@/lib/types/rebanho';
import { CATEGORIAS_POR_TIPO } from '@/lib/types/rebanho';

// Sentinel para "Sem lote" — Radix Select não aceita value="" (causa erro).
const SEM_LOTE = '__none__';

type Origem = 'nascido' | 'comprado';
type TipoRebanho = 'leiteiro' | 'corte' | 'dupla_aptidao';

const SEXO_OPTIONS = [
  { value: 'Fêmea' as const, label: 'Fêmea' },
  { value: 'Macho' as const, label: 'Macho' },
];

const TIPO_REBANHO_OPTIONS = [
  { value: 'leiteiro' as const, label: 'Leiteiro' },
  { value: 'corte' as const, label: 'Corte' },
  { value: 'dupla_aptidao' as const, label: 'Dupla Aptidão' },
];

const ORIGEM_OPTIONS = [
  { value: 'nascido' as const, label: 'Nascido na propriedade' },
  { value: 'comprado' as const, label: 'Comprado' },
];

const hoje = () => new Date().toISOString().split('T')[0];

// Incrementa a parte numérica de um brinco preservando zeros à esquerda.
// "001" -> "002", "VACA-09" -> "VACA-10", "abc" -> "abc" (inalterado)
function incrementarBrinco(brinco: string): string {
  const match = brinco.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return brinco;
  const [, prefixo, numero, sufixo] = match;
  const proximo = String(Number(numero) + 1).padStart(numero.length, '0');
  return `${prefixo}${proximo}${sufixo}`;
}

export default function NovoAnimalPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();
  const brincoRef = useRef<HTMLInputElement>(null);

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos "fixos" (mantidos entre cadastros sequenciais)
  const [tipoRebanho, setTipoRebanho] = useState<TipoRebanho>('leiteiro');
  const [categoria, setCategoria] = useState<string>('');
  const [raca, setRaca] = useState<string>('');
  const [origem, setOrigem] = useState<Origem>('nascido');
  const [loteId, setLoteId] = useState<string>(SEM_LOTE);
  const [dataNascimento, setDataNascimento] = useState<string>(hoje());
  const [dataEstimada, setDataEstimada] = useState(false);

  // Campos por animal
  const [brinco, setBrinco] = useState('');
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState<'Macho' | 'Fêmea'>('Fêmea');
  const [pesoNascimento, setPesoNascimento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [contadorSessao, setContadorSessao] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.perfil !== 'Administrador') {
      toast.error('Apenas administradores podem criar animais');
      router.push('/dashboard/rebanho');
      return;
    }

    const carregarLotes = async () => {
      try {
        const data = await listLotes(100, 0);
        setLotes(data);
      } catch {
        toast.error('Erro ao carregar lotes');
      }
    };
    carregarLotes();
  }, [authLoading, profile, router]);

  const salvar = useCallback(
    async (continuar: boolean): Promise<boolean> => {
      if (!brinco.trim()) {
        toast.error('Informe o brinco do animal');
        brincoRef.current?.focus();
        return false;
      }

      setIsSubmitting(true);

      const dados: Record<string, unknown> = {
        brinco: brinco.trim(),
        nome: nome.trim(),
        sexo,
        tipo_rebanho: tipoRebanho,
        categoria,
        data_nascimento: dataNascimento,
        data_nascimento_estimada: dataEstimada,
        lote_id: loteId === SEM_LOTE ? '' : loteId,
        raca: raca.trim(),
        origem,
        peso_nascimento:
          origem === 'nascido' && pesoNascimento
            ? Number(pesoNascimento.replace(',', '.'))
            : '',
        observacoes: observacoes.trim(),
      };

      try {
        const result = await criarAnimalAction(dados);
        if (!result.success) {
          toast.error(result.error || 'Erro ao criar animal');
          return false;
        }

        if (continuar) {
          // Mantém os campos fixos; limpa os por-animal e prepara o próximo brinco.
          toast.success(`${brinco.trim()} cadastrado`);
          setContadorSessao((c) => c + 1);
          setBrinco(incrementarBrinco(brinco.trim()));
          setNome('');
          setPesoNascimento('');
          setObservacoes('');
          // refoco no brinco para digitar/conferir o próximo
          setTimeout(() => brincoRef.current?.select(), 0);
          return true;
        }

        toast.success('Animal criado com sucesso');
        router.push(`/dashboard/rebanho/${result.animal_id}`);
        return true;
      } catch {
        toast.error('Erro ao criar animal');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      brinco,
      nome,
      sexo,
      tipoRebanho,
      categoria,
      dataNascimento,
      dataEstimada,
      loteId,
      raca,
      origem,
      pesoNascimento,
      observacoes,
      router,
    ]
  );

  const categoriasDisponiveis = CATEGORIAS_POR_TIPO[tipoRebanho] ?? [];

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Animal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {contadorSessao > 0
                ? `${contadorSessao} animal(is) cadastrado(s) nesta sessão`
                : 'Cadastre um animal por vez ou use a importação em lote'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/rebanho/importar')}
          >
            <Upload className="size-4" aria-hidden="true" />
            Importar planilha (CSV)
          </Button>
        </div>

        {/* Aviso de produtividade para grandes volumes */}
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Muitos animais para cadastrar?</span>{' '}
          Use <span className="text-foreground">Salvar e cadastrar próximo</span> — os campos fixos
          (tipo, categoria, raça, lote, origem e data) são mantidos e o brinco avança
          automaticamente. Para centenas de animais, prefira a{' '}
          <Link href="/dashboard/rebanho/importar" className="text-primary underline underline-offset-2">
            importação por planilha
          </Link>
          .
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void salvar(false);
          }}
          className="space-y-5"
        >
          {/* SEÇÃO: Identificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identificação</CardTitle>
              <CardDescription>Como o animal é reconhecido no rebanho</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="brinco">Brinco *</Label>
                  <Input
                    id="brinco"
                    ref={brincoRef}
                    value={brinco}
                    onChange={(e) => setBrinco(e.target.value)}
                    placeholder="Ex: 001"
                    autoFocus
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome (opcional)</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Princesa"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Sexo *</Label>
                  <ToggleButtonGroup
                    aria-label="Sexo"
                    options={SEXO_OPTIONS}
                    value={sexo}
                    onChange={setSexo}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      max={hoje()}
                      required
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Checkbox
                        id="data_nascimento_estimada"
                        checked={dataEstimada}
                        onCheckedChange={(checked) => setDataEstimada(checked === true)}
                        disabled={isSubmitting}
                      />
                      <Label
                        htmlFor="data_nascimento_estimada"
                        className="text-sm cursor-pointer whitespace-nowrap"
                      >
                        Estimada
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO: Classificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classificação</CardTitle>
              <CardDescription>Tipo, categoria, raça e lote do animal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo de Rebanho *</Label>
                  <ToggleButtonGroup
                    aria-label="Tipo de Rebanho"
                    options={TIPO_REBANHO_OPTIONS}
                    value={tipoRebanho}
                    onChange={(val) => {
                      setTipoRebanho(val);
                      setCategoria('');
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={categoria} onValueChange={(val) => setCategoria(val ?? '')}>
                    <SelectTrigger id="categoria" disabled={isSubmitting}>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriasDisponiveis.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="raca">Raça</Label>
                  <Input
                    id="raca"
                    value={raca}
                    onChange={(e) => setRaca(e.target.value)}
                    placeholder="Ex: Holandês"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lote_id">Lote</Label>
                  <Select value={loteId} onValueChange={(value) => setLoteId(value || SEM_LOTE)}>
                    <SelectTrigger id="lote_id" disabled={isSubmitting}>
                      <SelectValue placeholder="Sem lote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_LOTE}>Sem lote</SelectItem>
                      {lotes.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO: Origem */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Origem</CardTitle>
              <CardDescription>Procedência do animal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Origem *</Label>
                  <ToggleButtonGroup
                    aria-label="Origem"
                    options={ORIGEM_OPTIONS}
                    value={origem}
                    onChange={setOrigem}
                    disabled={isSubmitting}
                  />
                </div>
                {origem === 'nascido' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="peso_nascimento">Peso ao Nascimento (kg)</Label>
                    <Input
                      id="peso_nascimento"
                      type="number"
                      step="0.01"
                      min="0"
                      value={pesoNascimento}
                      onChange={(e) => setPesoNascimento(e.target.value)}
                      placeholder="Ex: 35.5"
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione informações extras sobre o animal"
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void salvar(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar e cadastrar próximo'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Salvar e finalizar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
