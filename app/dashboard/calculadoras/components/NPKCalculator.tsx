'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  otimizarNPK,
  getAllFertilizantes,
  type NPKInput,
  type Fertilizante,
  type FertilizanteComDose,
  type FertilizanteCombinacao,
} from '@/lib/calculadoras';
import { z } from 'zod';
import { npkInputSchema } from '@/lib/validations/calculadoras';
import { FertilizantesManager } from './FertilizantesManager';
import { ExportPDFDialog } from '../dialogs';
import { AlertCircle, AlertTriangle, Download, HelpCircle, Info, Leaf, Sprout, Zap } from 'lucide-react';

export type FaseAdubacao = 'plantio' | 'cobertura';

interface NPKCalculatorProps {
  fertilizantes?: Fertilizante[];
}

export function NPKCalculator({ fertilizantes: initialFerts }: NPKCalculatorProps) {
  const [faseAdubacao, setFaseAdubacao] = useState<FaseAdubacao>('plantio');
  const [formData, setFormData] = useState<NPKInput>({
    n_nec: '',
    p_nec: '',
    k_nec: '',
    area: '',
    modo: 'otimizado',
    fertilizantes_selecionados: [],
  });

  const [resultado, setResultado] = useState<ReturnType<typeof otimizarNPK>>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedFerts, setSelectedFerts] = useState<string[]>([]);
  const [allFerts, setAllFerts] = useState<Fertilizante[]>([]);
  const [openExportDialog, setOpenExportDialog] = useState(false);

  useEffect(() => {
    if (initialFerts) {
      setAllFerts(initialFerts);
      setSelectedFerts(initialFerts.map(f => f.id));
    } else {
      const ferts = getAllFertilizantes();
      setAllFerts(ferts);
      setSelectedFerts(ferts.map(f => f.id));
    }
  }, [initialFerts]);

  function handleInputChange(field: string, value: string | number) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErros(prev => ({ ...prev, [field]: '' }));
    if (['n_nec', 'p_nec', 'k_nec', 'area'].includes(field)) {
      setResultado(null);
    }
  }

  function handleFaseChange(fase: FaseAdubacao) {
    setFaseAdubacao(fase);
    setResultado(null);
  }

  async function handleOtimizar() {
    try {
      const data = {
        ...formData,
        fertilizantes_selecionados: selectedFerts,
        modo: 'otimizado' as const,
      };

      npkInputSchema.parse(data);
      setErros({});

      if (selectedFerts.length === 0) {
        toast.error('Selecione pelo menos um fertilizante');
        return;
      }

      setIsCalculating(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      const res = otimizarNPK(data);

      if (!res || res.top5.length === 0) {
        toast.error('Nenhuma combinação viável encontrada. Tente selecionar mais fertilizantes.');
        setResultado(null);
      } else {
        setResultado(res);
        toast.success(`${res.top5.length} opção(ões) encontrada(s)`);
      }
    } catch (error) {
      const errosObj: Record<string, string> = {};
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          errosObj[path] = err.message;
        });
      }
      setErros(errosObj);
      toast.error('Verifique os dados do formulário');
    } finally {
      setIsCalculating(false);
    }
  }

  const faseLabelMap: Record<FaseAdubacao, string> = {
    plantio: 'Adubação de Base (Plantio)',
    cobertura: 'Adubação de Cobertura',
  };

  return (
    <div className="space-y-8">
      {/* SELETOR DE FASE */}
      <Card>
        <CardHeader>
          <CardTitle>Fase de Adubação</CardTitle>
          <CardDescription>
            Selecione a fase para orientar o cálculo e registrar corretamente no relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleFaseChange('plantio')}
              className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                faseAdubacao === 'plantio'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <Sprout className={`h-6 w-6 shrink-0 ${faseAdubacao === 'plantio' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className={`font-semibold text-sm ${faseAdubacao === 'plantio' ? 'text-primary' : ''}`}>
                  Adubação de Base (Plantio)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aplicada no sulco ou área antes/durante o plantio. Foco em P e K.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFaseChange('cobertura')}
              className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                faseAdubacao === 'cobertura'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <Leaf className={`h-6 w-6 shrink-0 ${faseAdubacao === 'cobertura' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className={`font-semibold text-sm ${faseAdubacao === 'cobertura' ? 'text-primary' : ''}`}>
                  Adubação de Cobertura
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aplicada após emergência da cultura. Foco em N para desenvolvimento vegetativo.
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* FORMULÁRIO NPK */}
      <Card>
        <CardHeader>
          <CardTitle>Cálculo de Adubação NPK</CardTitle>
          <CardDescription>
            Insira a necessidade de nutrientes e selecione os fertilizantes para otimização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* INPUTS NECESSIDADE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="n">N (kg/ha) *</Label>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Nitrogênio necessário obtido da análise de solo
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="n"
                type="number"
                step="1"
                value={formData.n_nec}
                onChange={e => handleInputChange('n_nec', e.target.value)}
                placeholder="Ex: 90 (típico)"
                className={erros.n_nec ? 'border-destructive' : ''}
              />
              {erros.n_nec && <p className="text-sm text-destructive">{erros.n_nec}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="p">P₂O₅ (kg/ha) *</Label>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Pentóxido de fósforo necessário (fórmula agronômica)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="p"
                type="number"
                step="1"
                value={formData.p_nec}
                onChange={e => handleInputChange('p_nec', e.target.value)}
                placeholder="Ex: 60 (típico)"
                className={erros.p_nec ? 'border-destructive' : ''}
              />
              {erros.p_nec && <p className="text-sm text-destructive">{erros.p_nec}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="k">K₂O (kg/ha) *</Label>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Óxido de potássio necessário (fórmula agronômica)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="k"
                type="number"
                step="1"
                value={formData.k_nec}
                onChange={e => handleInputChange('k_nec', e.target.value)}
                placeholder="Ex: 60 (típico)"
                className={erros.k_nec ? 'border-destructive' : ''}
              />
              {erros.k_nec && <p className="text-sm text-destructive">{erros.k_nec}</p>}
            </div>
          </div>

          {/* ÁREA */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="area">Área do Talhão (ha) *</Label>
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Tamanho da área a ser adubada, em hectares
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="area"
              type="number"
              step="0.1"
              value={formData.area}
              onChange={e => handleInputChange('area', e.target.value)}
              placeholder="Ex: 10 ou 5.5"
              className={erros.area ? 'border-destructive' : ''}
            />
            {erros.area && <p className="text-sm text-destructive">{erros.area}</p>}
          </div>

          {/* BOTÃO OTIMIZAR */}
          <Button onClick={handleOtimizar} disabled={isCalculating} className="w-full" size="lg">
            {isCalculating ? 'Otimizando...' : 'Otimizar Combinações'}
          </Button>
        </CardContent>
      </Card>

      {/* GERENCIADOR DE FERTILIZANTES */}
      <FertilizantesManager
        selectedIds={selectedFerts}
        onSelectionChange={setSelectedFerts}
        onFertilizantesChange={() => {
          const ferts = getAllFertilizantes();
          setAllFerts(ferts);
        }}
      />

      {/* RESULTADOS — DOIS PAINÉIS */}
      {resultado && resultado.maisBarata && (
        <div className="space-y-6" role="region" aria-live="polite" aria-label="Resultado do cálculo NPK">
          {/* FASE */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {faseAdubacao === 'plantio' ? (
                <Sprout className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Leaf className="h-3.5 w-3.5 mr-1.5" />
              )}
              {faseLabelMap[faseAdubacao]}
            </Badge>
          </div>

          {/* DOIS PAINÉIS LADO A LADO */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* PAINEL 1 — MAIS BARATA */}
            <OpcaoPainelCard
              titulo="Opção Mais Econômica"
              descricao="Menor custo de aquisição por hectare"
              acento="green"
              icone={<Zap className="h-4 w-4" />}
              opcaoPrincipal={resultado.maisBarata}
              demaisOpcoes={resultado.topMaisBarata.slice(1)}
              area={parseFloat(formData.area || '0')}
              nNec={formData.n_nec}
            />

            {/* PAINEL 2 — MAIS SIMPLES */}
            <OpcaoPainelCard
              titulo="Opção Mais Simples"
              descricao="Menor número de fertilizantes — operação de campo mais fácil"
              acento="blue"
              icone={<Leaf className="h-4 w-4" />}
              opcaoPrincipal={resultado.maisSimples}
              demaisOpcoes={resultado.topMaisSimples.slice(1)}
              area={parseFloat(formData.area || '0')}
              nNec={formData.n_nec}
            />
          </div>

          {/* INFO */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
              Margem nutricional aceita: 0% a +15% em relação à meta. As duas opções apresentadas
              atendem os requisitos nutricionais — escolha considerando custo de aquisição e
              complexidade da operação de campo. Consulte um agrônomo para validar.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpenExportDialog(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório PDF
          </Button>

          <ExportPDFDialog
            open={openExportDialog}
            onOpenChange={setOpenExportDialog}
            calculadora="npk"
            faseAdubacao={faseAdubacao}
            dadosNPK={resultado ? { input: formData, resultado: resultado as unknown as import('@/lib/calculadoras').NPKResult } : undefined}
          />
        </div>
      )}

      {/* BOTÃO PDF MESMO SEM RESULTADO (desabilitado) */}
      {!resultado && (
        <Button
          variant="outline"
          className="w-full"
          disabled
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório PDF
        </Button>
      )}

      {/* MENSAGEM DE ERRO - SEM RESULTADO */}
      {!resultado && formData.area && formData.n_nec && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Clique em &quot;Otimizar Combinações&quot; para gerar as recomendações de adubação.
          </AlertDescription>
        </Alert>
      )}

      {/* DISCLAIMER EXPANDIDO */}
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
        <AlertDescription className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
          <p>
            <strong>Resultados indicativos para apoio à decisão.</strong> A recomendação final deve ser feita por um
            engenheiro agrônomo com base em análise completa do solo e da cultura.
          </p>
          <p>
            <strong>Importante:</strong> Este cálculo considera apenas os <strong>custos de aquisição dos fertilizantes</strong>.
            O produtor deve considerar também os custos logísticos das operações agrícolas envolvidas no uso desses adubos —
            como transporte, mão de obra de aplicação, horas-máquina, combustível e demais insumos operacionais.
            Quanto menor o número de fertilizantes diferentes utilizados, mais simples e barata tende a ser a operação de campo.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ========== COMPONENTE INTERNO: PAINEL DE OPÇÃO ==========

interface OpcaoPainelCardProps {
  titulo: string;
  descricao: string;
  acento: 'green' | 'blue';
  icone: React.ReactNode;
  opcaoPrincipal: FertilizanteCombinacao;
  demaisOpcoes: FertilizanteCombinacao[];
  area: number;
  nNec: string;
}

function OpcaoPainelCard({
  titulo,
  descricao,
  acento,
  icone,
  opcaoPrincipal,
  demaisOpcoes,
  area,
  nNec,
}: OpcaoPainelCardProps) {
  const borderClass = acento === 'green' ? 'border-green-500/40' : 'border-blue-500/40';
  const headerBg = acento === 'green'
    ? 'bg-green-50 dark:bg-green-950/20'
    : 'bg-blue-50 dark:bg-blue-950/20';
  const iconColor = acento === 'green' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400';
  const badgeClass = acento === 'green'
    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
    : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  const margemOkClass = 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300';
  const margemWarnClass = 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300';

  const totalFertilizantes = opcaoPrincipal.fertilizantes.length;
  const totalSacosPorHa = opcaoPrincipal.fertilizantes.reduce(
    (acc: number, f: FertilizanteComDose) => acc + f.sacos_por_ha, 0
  );
  const custoTotal = opcaoPrincipal.custoTotal_r_ha * area;

  return (
    <Card className={`border-2 ${borderClass}`}>
      {/* CABEÇALHO */}
      <CardHeader className={`${headerBg} rounded-t-lg pb-3`}>
        <div className="flex items-center gap-2">
          <span className={iconColor}>{icone}</span>
          <CardTitle className="text-base">{titulo}</CardTitle>
        </div>
        <CardDescription className="text-xs mt-1">{descricao}</CardDescription>

        {/* KPIs RÁPIDOS */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Custo/ha</p>
            <p className="font-bold text-sm">R$ {opcaoPrincipal.custoTotal_r_ha.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total área</p>
            <p className="font-bold text-sm">R$ {custoTotal.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Nº adubos</p>
            <p className="font-bold text-sm">{totalFertilizantes}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* FERTILIZANTES DA OPÇÃO PRINCIPAL */}
        {opcaoPrincipal.fertilizantes.map((item: FertilizanteComDose, idx: number) => (
          <div key={idx} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm leading-tight">{item.fertilizante.nome}</h4>
              <Badge variant="outline" className="text-xs shrink-0">
                {item.fertilizante.teor_n_percent}-{item.fertilizante.teor_p_percent}-{item.fertilizante.teor_k_percent}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Dose</p>
                <p className="font-semibold">{item.dose_kg_ha.toFixed(0)} kg/ha</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sacos/ha</p>
                <p className="font-semibold">{item.sacos_por_ha}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo/ha</p>
                <p className="font-semibold">R$ {item.custo_por_ha.toFixed(0)}</p>
              </div>
            </div>
          </div>
        ))}

        {/* MARGEM NUTRICIONAL */}
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nutrientes fornecidos</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { label: 'N', valor: opcaoPrincipal.nutrientes_fornecidos.n, margem: opcaoPrincipal.margemErro.n_percent },
                { label: 'P₂O₅', valor: opcaoPrincipal.nutrientes_fornecidos.p, margem: opcaoPrincipal.margemErro.p_percent },
                { label: 'K₂O', valor: opcaoPrincipal.nutrientes_fornecidos.k, margem: opcaoPrincipal.margemErro.k_percent },
              ] as const
            ).map(({ label, valor, margem }) => (
              <div key={label} className="rounded-md bg-muted p-2 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-sm">{valor.toFixed(0)}<span className="text-xs font-normal"> kg/ha</span></p>
                <Badge
                  variant="outline"
                  className={`mt-1 text-xs ${margem >= 0 && margem <= 15 ? margemOkClass : margemWarnClass}`}
                >
                  {margem > 0 ? '+' : ''}{margem.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* OUTRAS OPÇÕES DESTA CATEGORIA */}
        {demaisOpcoes.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Outras opções ({demaisOpcoes.length})
            </p>
            <div className="space-y-1.5">
              {demaisOpcoes.map((op: FertilizanteCombinacao, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs gap-2">
                  <span className="text-muted-foreground shrink-0">#{idx + 2}</span>
                  <span className="font-medium flex-1 min-w-0 truncate">
                    {op.fertilizantes.map((f: FertilizanteComDose) => f.fertilizante.nome).join(' + ')}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${badgeClass}`}>
                      {op.fertilizantes.length} {op.fertilizantes.length === 1 ? 'adubo' : 'adubos'}
                    </Badge>
                    <span className="font-semibold">R$ {op.custoTotal_r_ha.toFixed(0)}/ha</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
