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
  calcularNPK,
  otimizarNPK,
  getAllFertilizantes,
  type NPKInput,
  type Fertilizante,
} from '@/lib/calculadoras';
import { npkInputSchema } from '@/validators/calculadoras';
import { ResultCard } from './ResultCard';
import { FertilizantesManager } from './FertilizantesManager';
import { ExportPDFDialog } from '../dialogs';
import { AlertCircle, AlertTriangle, Download, HelpCircle, Info, Zap } from 'lucide-react';

interface NPKCalculatorProps {
  fertilizantes?: Fertilizante[];
}

export function NPKCalculator({ fertilizantes: initialFerts }: NPKCalculatorProps) {
  const [formData, setFormData] = useState<NPKInput>({
    n_nec: '',
    p_nec: '',
    k_nec: '',
    area: '',
    modo: 'otimizado',
    fertilizantes_selecionados: [],
  });

  const [resultado, setResultado] = useState<any>(null);
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
    // Limpar resultado ao alterar inputs para evitar confusão
    if (['n_nec', 'p_nec', 'k_nec', 'area'].includes(field)) {
      setResultado(null);
    }
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

      // Usar setTimeout para não travar a UI
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = otimizarNPK(data);

      if (!res || res.top5.length === 0) {
        toast.error('Nenhuma combinação viável encontrada. Tente selecionar mais fertilizantes.');
        setResultado(null);
      } else {
        setResultado(res);
        toast.success(`${res.top5.length} opção(ões) encontrada(s)`);
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
    } finally {
      setIsCalculating(false);
    }
  }

  const getMargemColor = (percent: number): 'primary' | 'warning' | 'destructive' => {
    if (percent < 0) return 'destructive';
    if (percent > 10) return 'warning';
    return 'primary';
  };

  return (
    <div className="space-y-8">
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
              {erros.n_nec && <p className="text-xs text-destructive">{erros.n_nec}</p>}
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
              {erros.p_nec && <p className="text-xs text-destructive">{erros.p_nec}</p>}
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
              {erros.k_nec && <p className="text-xs text-destructive">{erros.k_nec}</p>}
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
            {erros.area && <p className="text-xs text-destructive">{erros.area}</p>}
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

      {/* RESULTADO - MELHOR OPÇÃO */}
      {resultado && resultado.melhorOpcao && (
        <div className="space-y-6" role="region" aria-live="polite" aria-label="Resultado do cálculo NPK">
          <ResultCard
            title="Melhor Opção (Menor Custo)"
            value={resultado.melhorOpcao.custoTotal_r_ha}
            unit="R$/ha"
            subtitle="Total para a Área"
            subtitleValue={resultado.melhorOpcao.custoTotal_r_ha * parseFloat(formData.area || '0')}
            subtitleUnit="R$"
            color="primary"
            details={[
              { label: 'Fertilizante(s)', value: resultado.melhorOpcao.fertilizantes.map((f: any) => f.fertilizante.nome).join(' + ') },
              { label: 'Sacos/ha', value: resultado.melhorOpcao.fertilizantes.reduce((acc: number, f: any) => acc + f.sacos_por_ha, 0) },
              { label: 'Total Sacos', value: resultado.melhorOpcao.fertilizantes.reduce((acc: number, f: any) => acc + f.total_sacos, 0) },
            ]}
          />

          {/* COMPOSIÇÃO DO MELHOR OPÇÃO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Composição da Recomendação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultado.melhorOpcao.fertilizantes.map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold">{item.fertilizante.nome}</h4>
                    <Badge variant="outline">
                      {item.fertilizante.teor_n_percent}-{item.fertilizante.teor_p_percent}-{item.fertilizante.teor_k_percent}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Dose</p>
                      <p className="font-semibold">{item.dose_kg_ha.toFixed(0)} kg/ha</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sacos/ha</p>
                      <p className="font-semibold">{item.sacos_por_ha}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Custo</p>
                      <p className="font-semibold">R$ {item.custo_por_ha.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* MARGEM NUTRICIONAL */}
              <div className="mt-6 space-y-3 border-t pt-4">
                <h5 className="text-sm font-semibold">Margem Nutricional Fornecida</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">N</p>
                    <p className="text-lg font-bold">
                      {resultado.melhorOpcao.nutrientes_fornecidos.n.toFixed(0)} kg/ha
                    </p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="outline"
                          className={`mt-2 text-xs ${resultado.melhorOpcao.margemErro.n_percent >= 0 && resultado.melhorOpcao.margemErro.n_percent <= 15 ? 'border-green-500 bg-green-50 text-green-700' : 'border-yellow-500 bg-yellow-50 text-yellow-700'}`}
                        >
                          {resultado.melhorOpcao.margemErro.n_percent > 0 ? '+' : ''}
                          {resultado.melhorOpcao.margemErro.n_percent.toFixed(0)}%
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Diferença em relação à meta de {formData.n_nec} kg/ha
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">P₂O₅</p>
                    <p className="text-lg font-bold">
                      {resultado.melhorOpcao.nutrientes_fornecidos.p.toFixed(0)} kg/ha
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-2 text-xs ${resultado.melhorOpcao.margemErro.p_percent >= 0 && resultado.melhorOpcao.margemErro.p_percent <= 15 ? 'border-green-500 bg-green-50 text-green-700' : 'border-yellow-500 bg-yellow-50 text-yellow-700'}`}
                    >
                      {resultado.melhorOpcao.margemErro.p_percent > 0 ? '+' : ''}
                      {resultado.melhorOpcao.margemErro.p_percent.toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">K₂O</p>
                    <p className="text-lg font-bold">
                      {resultado.melhorOpcao.nutrientes_fornecidos.k.toFixed(0)} kg/ha
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-2 text-xs ${resultado.melhorOpcao.margemErro.k_percent >= 0 && resultado.melhorOpcao.margemErro.k_percent <= 15 ? 'border-green-500 bg-green-50 text-green-700' : 'border-yellow-500 bg-yellow-50 text-yellow-700'}`}
                    >
                      {resultado.melhorOpcao.margemErro.k_percent > 0 ? '+' : ''}
                      {resultado.melhorOpcao.margemErro.k_percent.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TOP 5 OPÇÕES */}
          {resultado.top5 && resultado.top5.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Top {resultado.top5.length} Opções (ordenadas por custo)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* TABELA PARA DESKTOP */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Fertilizante(s)</TableHead>
                        <TableHead className="text-right">Dose (kg/ha)</TableHead>
                        <TableHead className="text-right">Sacos/ha</TableHead>
                        <TableHead className="text-right">Custo (R$/ha)</TableHead>
                        <TableHead className="text-center">Margem N/P/K</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.top5.map((opcao: any, idx: number) => (
                        <TableRow key={idx} className={idx === 0 ? 'bg-primary/5' : ''}>
                          <TableCell className="font-bold">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">
                            {opcao.fertilizantes.map((f: any) => f.fertilizante.nome).join(' + ')}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {opcao.fertilizantes.map((f: any) => f.dose_kg_ha.toFixed(0)).join(' + ')}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {opcao.fertilizantes.reduce((acc: number, f: any) => acc + f.sacos_por_ha, 0)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            R$ {opcao.custoTotal_r_ha.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <div className="flex gap-1 justify-center">
                              <Badge variant="outline" className="text-xs">
                                {opcao.margemErro.n_percent.toFixed(0)}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {opcao.margemErro.p_percent.toFixed(0)}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {opcao.margemErro.k_percent.toFixed(0)}%
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* CARDS PARA MOBILE */}
                <div className="md:hidden space-y-3">
                  {resultado.top5.map((opcao: any, idx: number) => (
                    <div key={idx} className={`rounded-lg border p-4 space-y-2 ${idx === 0 ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-lg font-bold text-primary">#{idx + 1}</span>
                        <Badge className="bg-primary">
                          R$ {opcao.custoTotal_r_ha.toFixed(2)}/ha
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Fertilizante(s)</p>
                          <p className="font-medium">{opcao.fertilizantes.map((f: any) => f.fertilizante.nome).join(' + ')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Dose</p>
                            <p className="font-semibold">{opcao.fertilizantes.map((f: any) => f.dose_kg_ha.toFixed(0)).join(' + ')} kg/ha</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Sacos/ha</p>
                            <p className="font-semibold">{opcao.fertilizantes.reduce((acc: number, f: any) => acc + f.sacos_por_ha, 0)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 pt-2">
                          <Badge variant="outline" className="text-xs">N: {opcao.margemErro.n_percent.toFixed(0)}%</Badge>
                          <Badge variant="outline" className="text-xs">P: {opcao.margemErro.p_percent.toFixed(0)}%</Badge>
                          <Badge variant="outline" className="text-xs">K: {opcao.margemErro.k_percent.toFixed(0)}%</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* INFO */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
              A margem nutricional aceita é de 0% a +15% em relação à meta. Margem verde = dentro do ideal.
              Consulte um agrônomo para validar a recomendação.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpenExportDialog(true)}
            disabled={!resultado}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório PDF
          </Button>

          <ExportPDFDialog
            open={openExportDialog}
            onOpenChange={setOpenExportDialog}
            calculadora="npk"
            dadosNPK={resultado ? { input: formData, resultado } : undefined}
          />
        </div>
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

      {/* DISCLAIMER PERMANENTE */}
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
        <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
          Resultados indicativos para apoio à decisão. A recomendação final deve ser feita por um engenheiro agrônomo com base em análise completa do solo e da cultura.
        </AlertDescription>
      </Alert>
    </div>
  );
}
