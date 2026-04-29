'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { calcularCalagem, type CalagemInput, type MetodoCalagemType } from '@/lib/calculadoras';
import { calagemInputSchema } from '@/lib/validations/calculadoras';
import { tabelaCaDesejadoUFLA } from '@/lib/calculadoras/smp-tabela';
import { ResultCard } from './ResultCard';
import { ExportPDFDialog } from '../dialogs';
import { AlertCircle, AlertTriangle, ChevronDown, Download, HelpCircle, Lightbulb } from 'lucide-react';

interface CalagemCalculatorProps {
  initialMethod?: MetodoCalagemType;
  onResultChange?: (result: any) => void;
}

export function CalagemCalculator({ initialMethod = 'saturacao' }: CalagemCalculatorProps) {
  const [metodo, setMetodo] = useState<MetodoCalagemType>(initialMethod);
  const [formData, setFormData] = useState<CalagemInput>({
    metodo: initialMethod,
    area: '',
    prnt: '80',
    al: '',
    ca: '',
    mg: '',
    ctc: '',
    v1: '',
    v2: '60',
    ph_smp: '',
    textura: 'media',
    cultura: 'milho',
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);

  function handleMethodChange(newMethod: MetodoCalagemType) {
    setMetodo(newMethod);
    // Resetar resultado ao trocar de método, mantendo Área e PRNT (comuns)
    setFormData(prev => ({
      ...prev,
      metodo: newMethod,
      al: '',
      ca: '',
      mg: '',
      ctc: '',
      v1: '',
      v2: '60',
      ph_smp: '',
      textura: 'media',
      cultura: 'milho',
    }));
    setShowDetalhes(false);
    setErros({});
  }

  const resultado = useMemo(() => {
    try {
      const data = { ...formData, metodo };
      const validado = calagemInputSchema.parse(data);
      const res = calcularCalagem(validado as unknown as CalagemInput);
      return res;
    } catch (error) {
      return null;
    }
  }, [formData, metodo]);

  function handleCalular() {
    try {
      const data = { ...formData, metodo };
      calagemInputSchema.parse(data);
      setErros({});

      if (!resultado) {
        toast.error('Preencha os dados necessários para o cálculo');
      } else {
        toast.success('Cálculo realizado com sucesso');
      }
    } catch (error: any) {
      const errosObj: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          errosObj[path] = err.message;
        });
      }
      setErros(errosObj);
      toast.error('Verifique os dados do formulário');
    }
  }

  function handleInputChange(field: string, value: string | number | null | undefined) {
    if (value === null || value === undefined) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    setErros(prev => ({ ...prev, [field]: '' }));
  }

  const culturas = Object.keys(tabelaCaDesejadoUFLA);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* FORMULÁRIO */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Cálculo de Calagem</CardTitle>
          <CardDescription>Escolha um método de cálculo e insira os dados da análise de solo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SELEÇÃO DE MÉTODO */}
          <div className="space-y-3">
            <Label>Método de Cálculo</Label>
            <Tabs value={metodo} onValueChange={v => handleMethodChange(v as MetodoCalagemType)}>
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                <TabsTrigger value="saturacao" className="text-xs">
                  Saturação V%
                </TabsTrigger>
                <TabsTrigger value="al_ca_mg" className="text-xs">
                  Al+Ca/Mg
                </TabsTrigger>
                <TabsTrigger value="mg_manual" className="text-xs">
                  MG Manual
                </TabsTrigger>
                <TabsTrigger value="smp" className="text-xs">
                  SMP
                </TabsTrigger>
                <TabsTrigger value="ufla" className="text-xs">
                  UFLA
                </TabsTrigger>
              </TabsList>

              {/* CAMPOS COMUNS */}
              <div className="space-y-4 mt-6 pb-6 border-b">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="area">Área do Talhão (ha) *</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Tamanho da área a ser calada, em hectares
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="area"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.area}
                      onChange={e => handleInputChange('area', e.target.value)}
                      placeholder="Ex: 10 ou 5.5"
                      className={erros.area ? 'border-destructive' : ''}
                    />
                    {erros.area && <p className="text-xs text-destructive">{erros.area}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="prnt">PRNT do Calcário (%) *</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Poder Relativo de Neutralização Total - eficácia do calcário
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="prnt"
                      type="number"
                      step="0.1"
                      value={formData.prnt}
                      onChange={e => handleInputChange('prnt', e.target.value)}
                      placeholder="Ex: 80 (típico)"
                      className={erros.prnt ? 'border-destructive' : ''}
                    />
                    {erros.prnt && <p className="text-xs text-destructive">{erros.prnt}</p>}
                  </div>
                </div>
              </div>

              {/* CAMPOS POR MÉTODO */}
              <TabsContent value="saturacao" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="v1">V1 Atual (%)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Saturação de bases atual, obtida da análise de solo
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="v1"
                      type="number"
                      step="0.1"
                      value={formData.v1}
                      onChange={e => handleInputChange('v1', e.target.value)}
                      placeholder="Ex: 40"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="v2">V2 Desejado (%)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Saturação de bases alvo após calagem (típico: 60-70%)
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="v2"
                      type="number"
                      step="0.1"
                      value={formData.v2}
                      onChange={e => handleInputChange('v2', e.target.value)}
                      placeholder="Ex: 60"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="ctc">CTC(T) (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Capacidade de Troca Catiônica Total do solo
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="ctc"
                      type="number"
                      step="0.01"
                      value={formData.ctc}
                      onChange={e => handleInputChange('ctc', e.target.value)}
                      placeholder="Ex: 5.5"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="al_ca_mg" className="space-y-4 mt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="al">Al³⁺ (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Alumínio trocável — quanto maior, mais calagem necessária
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="al"
                      type="number"
                      step="0.01"
                      value={formData.al}
                      onChange={e => handleInputChange('al', e.target.value)}
                      placeholder="Ex: 0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="ca">Ca²⁺ (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Cálcio trocável presente no solo
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="ca"
                      type="number"
                      step="0.01"
                      value={formData.ca}
                      onChange={e => handleInputChange('ca', e.target.value)}
                      placeholder="Ex: 1.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="mg">Mg²⁺ (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Magnésio trocável presente no solo
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="mg"
                      type="number"
                      step="0.01"
                      value={formData.mg}
                      onChange={e => handleInputChange('mg', e.target.value)}
                      placeholder="Ex: 0.8"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mg_manual" className="space-y-4 mt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="al">Al³⁺ (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Alumínio trocável — ponderado por 3x neste método
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="al"
                      type="number"
                      step="0.01"
                      value={formData.al}
                      onChange={e => handleInputChange('al', e.target.value)}
                      placeholder="Ex: 0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="ca">Ca²⁺ (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Cálcio trocável presente no solo
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="ca"
                      type="number"
                      step="0.01"
                      value={formData.ca}
                      onChange={e => handleInputChange('ca', e.target.value)}
                      placeholder="Ex: 1.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="mg">Mg²⁺ (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Magnésio trocável presente no solo
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="mg"
                      type="number"
                      step="0.01"
                      value={formData.mg}
                      onChange={e => handleInputChange('mg', e.target.value)}
                      placeholder="Ex: 0.8"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="smp" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="ph_smp">pH SMP</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          pH medido em solução tampon SMP (EMBRAPA)
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="ph_smp"
                      type="number"
                      step="0.1"
                      min="4"
                      max="8"
                      value={formData.ph_smp}
                      onChange={e => handleInputChange('ph_smp', e.target.value)}
                      placeholder="Ex: 5.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="textura">Textura do Solo</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Classificação de textura afeta a interpolação na tabela SMP
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.textura || 'media'}
                      onValueChange={v => handleInputChange('textura', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arenosa">Arenosa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="argilosa">Argilosa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ufla" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="ca">Ca²⁺ Atual (cmolc/dm³)</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Cálcio trocável presente no solo
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="ca"
                      type="number"
                      step="0.01"
                      value={formData.ca}
                      onChange={e => handleInputChange('ca', e.target.value)}
                      placeholder="Ex: 2.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="cultura">Cultura</Label>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Cultura define o Ca desejado na tabela UFLA
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.cultura || 'milho'}
                      onValueChange={v => handleInputChange('cultura', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {culturas.map(c => (
                          <SelectItem key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* BOTÃO CALCULAR */}
          <Button onClick={handleCalular} className="w-full" size="lg">
            Calcular Necessidade de Calagem
          </Button>

          {/* DETALHES DO CÁLCULO */}
          {resultado?.detalhe && (
            <Collapsible open={showDetalhes} onOpenChange={setShowDetalhes}>
              <CollapsibleTrigger className="w-full">
                <Button variant="outline" className="w-full justify-between">
                  <span>Detalhes do Cálculo</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showDetalhes ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-3 pt-4 border-t">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Fórmula: {resultado.detalhe.formula}</p>
                  {resultado.detalhe.etapas && (
                    <div className="bg-muted rounded-lg p-3 space-y-1">
                      {Object.entries(resultado.detalhe.etapas).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-mono font-semibold">
                            {typeof value === 'number' ? value.toFixed(3) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* VALIDAÇÕES */}
          {resultado?.validacoes && resultado.validacoes.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {resultado.validacoes.map((v, i) => (
                  <p key={i} className="text-sm">{v}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* RESULTADO */}
      {resultado && (
        <div className="space-y-4" role="region" aria-live="polite" aria-label="Resultado do cálculo de calagem">
          <ResultCard
            title="Necessidade de Calagem"
            value={resultado.nc}
            unit="t/ha"
            subtitle="Total para a Área"
            subtitleValue={resultado.total}
            subtitleUnit="toneladas"
            color="primary"
            tips={[
              'Realize a calagem 60-90 dias antes do plantio',
              'Incorporar o mais profundamente possível',
              'Se NC > 3 t/ha, considere parcelar em 2 safras',
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Dica Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                • A qualidade do calcário (PRNT) afeta a dose final
              </p>
              <p>
                • Gessagem pode ser necessária se houver Al em profundidade
              </p>
              <p>
                • Consulte um agrônomo para confirmar a recomendação
              </p>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpenExportDialog(true)}
            disabled={!resultado}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>

          <ExportPDFDialog
            open={openExportDialog}
            onOpenChange={setOpenExportDialog}
            calculadora="calagem"
            dadosCalagem={resultado ? { input: { ...formData, metodo }, resultado } : undefined}
          />
        </div>
      )}

      {/* DISCLAIMER PERMANENTE */}
      <div className="lg:col-span-2">
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
            Resultados indicativos para apoio à decisão. A recomendação final deve ser feita por um engenheiro agrônomo com base na análise de solo completa.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
