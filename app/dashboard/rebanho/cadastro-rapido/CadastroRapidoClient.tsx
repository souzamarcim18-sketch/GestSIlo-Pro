'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleButtonGroup } from '@/components/ui/toggle-button-group';
import { toast } from 'sonner';
import { cadastrarAnimaisLoteAction } from '@/app/dashboard/rebanho/actions';
import type { CSVImportResult } from '@/lib/types/rebanho';

type Sexo = 'Fêmea' | 'Macho';
type TipoRebanho = 'leiteiro' | 'corte' | 'dupla_aptidao';
type Origem = 'nascido' | 'comprado';

const TIPO_REBANHO_OPTIONS = [
  { value: 'leiteiro' as const, label: 'Leiteiro' },
  { value: 'corte' as const, label: 'Corte' },
  { value: 'dupla_aptidao' as const, label: 'Dupla aptidão' },
];

const SEXO_OPTIONS = [
  { value: 'Fêmea' as const, label: 'Fêmea' },
  { value: 'Macho' as const, label: 'Macho' },
];

const ORIGEM_OPTIONS = [
  { value: 'nascido' as const, label: 'Nascido' },
  { value: 'comprado' as const, label: 'Comprado' },
];

interface LinhaGrade {
  brinco: string;
  nome: string;
  sexo: Sexo;
  data_nascimento: string; // YYYY-MM-DD
  data_nascimento_estimada: boolean;
  origem: Origem;
  raca: string;
  lote: string;
  peso_nascimento: string;
  peso_atual: string;
}

interface Padrao {
  tipo_rebanho: TipoRebanho;
  lote: string;
  raca: string;
  sexo: Sexo;
  origem: Origem;
  data_nascimento: string;
}

const NATIVE_SELECT =
  'h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring/30';

function novaLinha(padrao: Padrao): LinhaGrade {
  return {
    brinco: '',
    nome: '',
    sexo: padrao.sexo,
    data_nascimento: padrao.data_nascimento,
    data_nascimento_estimada: false,
    origem: padrao.origem,
    raca: padrao.raca,
    lote: padrao.lote,
    peso_nascimento: '',
    peso_atual: '',
  };
}

export function CadastroRapidoClient() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<'padrao' | 'grade' | 'concluido'>('padrao');

  const [padrao, setPadrao] = useState<Padrao>({
    tipo_rebanho: 'leiteiro',
    lote: '',
    raca: '',
    sexo: 'Fêmea',
    origem: 'nascido',
    data_nascimento: '',
  });

  const [linhas, setLinhas] = useState<LinhaGrade[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<CSVImportResult | null>(null);

  // Gerador de brincos sequenciais
  const [prefixo, setPrefixo] = useState('');
  const [inicio, setInicio] = useState('1');
  const [quantidade, setQuantidade] = useState('10');
  const [digitos, setDigitos] = useState('3');

  const iniciarGrade = useCallback(() => {
    setLinhas([novaLinha(padrao), novaLinha(padrao), novaLinha(padrao)]);
    setEtapa('grade');
  }, [padrao]);

  const adicionarLinha = useCallback(() => {
    setLinhas((prev) => [...prev, novaLinha(padrao)]);
  }, [padrao]);

  const removerLinha = useCallback((idx: number) => {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const atualizarCampo = useCallback(
    <K extends keyof LinhaGrade>(idx: number, campo: K, valor: LinhaGrade[K]) => {
      setLinhas((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l))
      );
    },
    []
  );

  const gerarBrincos = useCallback(() => {
    const qtd = parseInt(quantidade, 10);
    const ini = parseInt(inicio, 10);
    const pad = parseInt(digitos, 10);
    if (!Number.isFinite(qtd) || qtd <= 0 || qtd > 500) {
      toast.error('Quantidade deve ser entre 1 e 500');
      return;
    }
    if (!Number.isFinite(ini) || ini < 0) {
      toast.error('Número inicial inválido');
      return;
    }
    const novas: LinhaGrade[] = Array.from({ length: qtd }, (_, k) => {
      const num = String(ini + k).padStart(Number.isFinite(pad) ? pad : 0, '0');
      return { ...novaLinha(padrao), brinco: `${prefixo}${num}` };
    });
    setLinhas(novas);
    toast.success(`${qtd} brincos gerados.`);
  }, [quantidade, inicio, digitos, prefixo, padrao]);

  const linhasPreenchidas = useMemo(
    () => linhas.filter((l) => l.brinco.trim() !== ''),
    [linhas]
  );

  const salvar = useCallback(async () => {
    if (linhasPreenchidas.length === 0) {
      toast.error('Preencha ao menos um brinco');
      return;
    }
    setSalvando(true);
    try {
      const payload = linhasPreenchidas.map((l) => ({
        brinco: l.brinco.trim(),
        nome: l.nome.trim(),
        sexo: l.sexo,
        data_nascimento: l.data_nascimento,
        data_nascimento_estimada: l.data_nascimento_estimada ? 'true' : 'false',
        tipo_rebanho: padrao.tipo_rebanho,
        lote: l.lote.trim(),
        raca: l.raca.trim(),
        origem: l.origem,
        // Peso ao nascimento só faz sentido para animal nascido na propriedade.
        peso_nascimento: l.origem === 'nascido' ? l.peso_nascimento.trim() : '',
        peso_atual: l.peso_atual.trim(),
      }));

      const res = await cadastrarAnimaisLoteAction({ linhas: payload });
      setResultado(res);
      setEtapa('concluido');

      if (res.importados > 0) {
        toast.success(`${res.importados} animal(is) cadastrado(s)!`);
      }
      if (res.erros.length > 0) {
        toast.warning(`${res.erros.length} linha(s) com erro`);
      }
    } catch {
      toast.error('Erro ao cadastrar animais');
    } finally {
      setSalvando(false);
    }
  }, [linhasPreenchidas, padrao]);

  const reiniciar = useCallback(() => {
    setResultado(null);
    setLinhas([]);
    setEtapa('padrao');
  }, []);

  // ---- Etapa 1: dados em comum ----
  if (etapa === 'padrao') {
    return (
      <Card className="max-w-2xl space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.13em]">Dados em comum</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Valem para todos os animais cadastrados agora (podem ser ajustados linha a linha depois).
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de rebanho</Label>
            <ToggleButtonGroup
              aria-label="Tipo de rebanho"
              options={TIPO_REBANHO_OPTIONS}
              value={padrao.tipo_rebanho}
              onChange={(v) => setPadrao((p) => ({ ...p, tipo_rebanho: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Sexo predominante</Label>
            <ToggleButtonGroup
              aria-label="Sexo predominante"
              options={SEXO_OPTIONS}
              value={padrao.sexo}
              onChange={(v) => setPadrao((p) => ({ ...p, sexo: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Origem predominante</Label>
            <ToggleButtonGroup
              aria-label="Origem predominante"
              options={ORIGEM_OPTIONS}
              value={padrao.origem}
              onChange={(v) => setPadrao((p) => ({ ...p, origem: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Data de nascimento padrão (opcional)</Label>
            <Input
              type="date"
              value={padrao.data_nascimento}
              onChange={(e) => setPadrao((p) => ({ ...p, data_nascimento: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Lote (opcional)</Label>
            <Input
              value={padrao.lote}
              onChange={(e) => setPadrao((p) => ({ ...p, lote: e.target.value }))}
              placeholder="Ex.: Lote A"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Raça (opcional)</Label>
            <Input
              value={padrao.raca}
              onChange={(e) => setPadrao((p) => ({ ...p, raca: e.target.value }))}
              placeholder="Ex.: Nelore"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={iniciarGrade}>Continuar</Button>
        </div>
      </Card>
    );
  }

  // ---- Etapa 2: grade ----
  if (etapa === 'grade') {
    return (
      <div className="space-y-6">
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.13em] flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Gerar brincos em sequência
          </h2>
          <p className="text-sm text-muted-foreground">
            Para quem ainda não numerou os animais: gere uma faixa automática (ex.: BZ-001 a BZ-050).
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Prefixo</Label>
              <Input value={prefixo} onChange={(e) => setPrefixo(e.target.value)} placeholder="BZ-" />
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input value={inicio} onChange={(e) => setInicio(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>Dígitos</Label>
              <Input value={digitos} onChange={(e) => setDigitos(e.target.value)} inputMode="numeric" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={gerarBrincos} className="w-full">
                Gerar
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.13em]">
              Animais ({linhasPreenchidas.length})
            </h2>
            <Button variant="outline" size="sm" onClick={adicionarLinha}>
              <Plus className="mr-1 h-4 w-4" /> Linha
            </Button>
          </div>

          <ScrollArea className="max-h-[460px] w-full">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Brinco *</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Nome</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Sexo</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Nascimento *</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Estimada</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Origem</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Raça</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Lote</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Peso nasc. (kg)</th>
                  <th className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Peso atual (kg)</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-1 py-1">
                      <Input
                        value={linha.brinco}
                        onChange={(e) => atualizarCampo(idx, 'brinco', e.target.value)}
                        className="h-8 min-w-[110px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        value={linha.nome}
                        onChange={(e) => atualizarCampo(idx, 'nome', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        className={`${NATIVE_SELECT} min-w-[90px]`}
                        value={linha.sexo}
                        onChange={(e) => atualizarCampo(idx, 'sexo', e.target.value as Sexo)}
                      >
                        <option value="Fêmea">Fêmea</option>
                        <option value="Macho">Macho</option>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        type="date"
                        value={linha.data_nascimento}
                        onChange={(e) => atualizarCampo(idx, 'data_nascimento', e.target.value)}
                        className="h-8 min-w-[140px]"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <Checkbox
                        checked={linha.data_nascimento_estimada}
                        onCheckedChange={(checked) =>
                          atualizarCampo(idx, 'data_nascimento_estimada', checked === true)
                        }
                        aria-label="Data estimada"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        className={`${NATIVE_SELECT} min-w-[110px]`}
                        value={linha.origem}
                        onChange={(e) => atualizarCampo(idx, 'origem', e.target.value as Origem)}
                      >
                        <option value="nascido">Nascido</option>
                        <option value="comprado">Comprado</option>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        value={linha.raca}
                        onChange={(e) => atualizarCampo(idx, 'raca', e.target.value)}
                        className="h-8 min-w-[110px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        value={linha.lote}
                        onChange={(e) => atualizarCampo(idx, 'lote', e.target.value)}
                        className="h-8 min-w-[110px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        value={linha.peso_nascimento}
                        onChange={(e) => atualizarCampo(idx, 'peso_nascimento', e.target.value)}
                        inputMode="decimal"
                        disabled={linha.origem !== 'nascido'}
                        placeholder={linha.origem !== 'nascido' ? '—' : ''}
                        className="h-8 min-w-[100px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        value={linha.peso_atual}
                        onChange={(e) => atualizarCampo(idx, 'peso_atual', e.target.value)}
                        inputMode="decimal"
                        className="h-8 min-w-[100px]"
                      />
                    </td>
                    <td className="px-1 py-1 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removerLinha(idx)}
                        aria-label="Remover linha"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setEtapa('padrao')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button onClick={salvar} disabled={salvando || linhasPreenchidas.length === 0}>
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cadastrando…
              </>
            ) : (
              <>Cadastrar {linhasPreenchidas.length} animal(is)</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Etapa 3: concluído ----
  if (etapa === 'concluido' && resultado) {
    return (
      <div className="max-w-2xl space-y-6">
        {resultado.importados > 0 && (
          <Alert className="border-green-500/20 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>{resultado.importados} animal(is) cadastrado(s) com sucesso!</strong>
              {resultado.lote_criado_nome && (
                <p className="mt-1 text-sm">
                  Lote criado: <strong>{resultado.lote_criado_nome}</strong>
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {resultado.erros.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.13em] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              {resultado.erros.length} linha(s) não cadastrada(s)
            </h3>
            <div className="space-y-2">
              {resultado.erros.map((erro, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 border-l-4 border-red-500 bg-red-50/50 px-3 py-2 text-xs dark:bg-red-950/20"
                >
                  <div className="font-semibold text-red-700 dark:text-red-300">
                    {erro.brinco ? `Brinco: ${erro.brinco}` : 'Linha inválida'}
                  </div>
                  <div className="text-red-600 dark:text-red-400">{erro.mensagem}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={reiniciar}>
            Cadastrar mais
          </Button>
          <Button onClick={() => router.push('/dashboard/rebanho')}>Ir para o rebanho</Button>
        </div>
      </div>
    );
  }

  return null;
}
