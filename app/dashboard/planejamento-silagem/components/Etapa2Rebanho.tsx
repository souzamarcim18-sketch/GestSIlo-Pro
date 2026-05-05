'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronLeft, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORIAS_LEITE, CATEGORIAS_CORTE } from '@/lib/constants/planejamento-silagem';
import { WizardState } from '@/lib/types/planejamento-silagem';
import { detectarRebanho, projetarRebanho } from '@/lib/supabase/rebanho';
import { mapearCategoriasProjetadas } from '@/lib/services/planejamento-silagem';
import type { RebanhoProjetado } from '@/lib/types/rebanho';

interface Etapa2RebanhoProps {
  wizard: WizardState;
  onNext: (rebanho: Record<string, number>, dataAlvo: Date, snapshot?: any) => void;
  onBack: () => void;
  errors: Record<string, string>;
}

export function Etapa2Rebanho({
  wizard,
  onNext,
  onBack,
  errors,
}: Etapa2RebanhoProps) {
  const categorias =
    wizard.sistema?.tipo_rebanho === 'Leite' ? CATEGORIAS_LEITE : CATEGORIAS_CORTE;

  // Estados
  const [quantidades, setQuantidades] = useState<Record<string, number>>(
    wizard.rebanho || {}
  );
  const [dataAlvo, setDataAlvo] = useState<string>(() => {
    if (wizard.dataAlvo) {
      return wizard.dataAlvo.toISOString().split('T')[0];
    }
    const hoje = new Date();
    const futuro = new Date(hoje);
    futuro.setDate(futuro.getDate() + 30);
    return futuro.toISOString().split('T')[0];
  });

  const [detectando, setDetectando] = useState(true);
  const [rebanhoDetectado, setRebanhoDetectado] = useState(false);
  const [razaoDeteccao, setRazaoDeteccao] = useState<'vazio' | 'sem_acesso' | 'nenhum' | null>(null);
  const [dadosProjetados, setDadosProjetados] = useState<RebanhoProjetado | null>(null);
  const [categoriasNaoMapeadas, setCategoriasNaoMapeadas] = useState<string[]>([]);
  const [usarDadosReais, setUsarDadosReais] = useState(true);
  const [reprojetando, setReprojetando] = useState(false);
  const [estadoInicial, setEstadoInicial] = useState<Record<string, number> | null>(null);

  const totalCabecas = useMemo(() => {
    return Object.values(quantidades).reduce((a, b) => a + (b || 0), 0);
  }, [quantidades]);

  // Detectar rebanho ao montar
  useEffect(() => {
    const executarDeteccao = async () => {
      try {
        setDetectando(true);
        const deteccao = await detectarRebanho();

        if (deteccao.rebanho_detectado) {
          setRebanhoDetectado(true);
          // Projetar para dataAlvo
          const dataAlvoObj = new Date(dataAlvo);
          const projecao = await projetarRebanho(dataAlvoObj);
          setDadosProjetados(projecao);

          // Mapear categorias
          const { mapeadas, naoMapeadas } = mapearCategoriasProjetadas(
            projecao.categorias,
            wizard.sistema?.tipo_rebanho || 'Leite',
            categorias
          );

          setCategoriasNaoMapeadas(naoMapeadas);
          setQuantidades(mapeadas);
          setEstadoInicial(mapeadas);
          setUsarDadosReais(true);

          if (naoMapeadas.length > 0) {
            toast.info(
              `${naoMapeadas.length} categoria(s) do rebanho não puderam ser mapeadas`
            );
          }
        } else {
          setRebanhoDetectado(false);
          setRazaoDeteccao(deteccao.razao || 'nenhum');
        }
      } catch (erro) {
        toast.error('Erro ao detectar rebanho');
        setRebanhoDetectado(false);
        setRazaoDeteccao('nenhum');
      } finally {
        setDetectando(false);
      }
    };

    executarDeteccao();
  }, []);

  // Re-projetar quando dataAlvo muda
  const handleDataAlvoChange = async (novaData: string) => {
    setDataAlvo(novaData);

    if (!rebanhoDetectado || !dadosProjetados) return;

    try {
      setReprojetando(true);
      const dataAlvoObj = new Date(novaData);
      const projecao = await projetarRebanho(dataAlvoObj);
      setDadosProjetados(projecao);

      // Re-mapear
      const { mapeadas, naoMapeadas } = mapearCategoriasProjetadas(
        projecao.categorias,
        wizard.sistema?.tipo_rebanho || 'Leite',
        categorias
      );

      setCategoriasNaoMapeadas(naoMapeadas);
      if (usarDadosReais) {
        setQuantidades(mapeadas);
        setEstadoInicial(mapeadas);
      }
    } catch (erro) {
      toast.error('Erro ao reprojetar rebanho');
    } finally {
      setReprojetando(false);
    }
  };

  const handleToggleUsarDados = () => {
    if (!usarDadosReais && dadosProjetados && estadoInicial) {
      // Voltando a usar dados reais
      setQuantidades(estadoInicial);
    }
    // Ao desabilitar (usar manual), quantidades permanecem como estão
    setUsarDadosReais(!usarDadosReais);
  };

  const handleQuantidadeChange = (catId: string, value: string) => {
    const num = parseInt(value, 10);
    setQuantidades((prev) => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const validarDataAlvo = (): boolean => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAlvoObj = new Date(dataAlvo);
    dataAlvoObj.setHours(0, 0, 0, 0);
    const maximo = new Date(hoje);
    maximo.setFullYear(maximo.getFullYear() + 1);

    if (dataAlvoObj < hoje) {
      toast.error('Data alvo não pode estar no passado');
      return false;
    }
    if (dataAlvoObj > maximo) {
      toast.error('Data alvo não pode ultrapassar 365 dias a partir de hoje');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validarDataAlvo()) return;

    // Se rebanho foi detectado, passar o snapshot inicial para rastrear edições
    let snapshot = undefined;
    if (rebanhoDetectado && dadosProjetados && estadoInicial) {
      snapshot = {
        composicao: Object.entries(estadoInicial).map(([categoria_id, quantidade]) => ({
          categoria_id,
          quantidade,
        })),
        total_cabecas: Object.values(estadoInicial).reduce((a, b) => a + b, 0),
        partos_inclusos: dadosProjetados.fatores_aplicados.partos_confirmados,
        data_calculo: dadosProjetados.data_calculo.toISOString(),
      };
    }

    onNext(quantidades, new Date(dataAlvo), snapshot);
  };

  return (
    <div className="space-y-6">
      {/* Data alvo da projeção */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data alvo da projeção</CardTitle>
          <CardDescription>
            Informe até que data você deseja projetar o rebanho
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Input
              type="date"
              value={dataAlvo}
              onChange={(e) => handleDataAlvoChange(e.target.value)}
              className="w-full md:w-48"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo: hoje | Máximo: 365 dias a partir de hoje
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detecção de rebanho */}
      {detectando ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detectando rebanho...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
      ) : rebanhoDetectado ? (
        <>
          {/* Dados projetados detectados */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  Rebanho Detectado
                </Badge>
              </CardTitle>
              <CardDescription>
                Dados projetados automaticamente para a data selecionada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 bg-white rounded border border-green-200">
                <div>
                  <p className="font-medium text-sm">
                    {usarDadosReais ? 'Usar dados reais' : 'Ajustar manualmente'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usarDadosReais
                      ? 'Os valores abaixo estão bloqueados'
                      : 'Você pode ajustar os valores'}
                  </p>
                </div>
                <Button
                  variant={usarDadosReais ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleUsarDados}
                  disabled={reprojetando}
                >
                  {usarDadosReais ? 'Desbloquear edição' : 'Bloquear edição'}
                </Button>
              </div>

              {/* Categorias não mapeadas */}
              {categoriasNaoMapeadas.length > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">
                    Categorias não mapeadas
                  </AlertTitle>
                  <AlertDescription className="text-blue-800 text-sm">
                    As seguintes categorias do seu rebanho não foram encontradas
                    nas pré-definições e foram ignoradas:{' '}
                    <strong>{categoriasNaoMapeadas.join(', ')}</strong>
                  </AlertDescription>
                </Alert>
              )}

              {/* Loading durante reprojeção */}
              {reprojetando && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recalculando projeção...
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : razaoDeteccao === 'vazio' ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg">Sem rebanho cadastrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você ainda não cadastrou animais na seção Gestão de Rebanho. Para usar
              a projeção automática, cadastre seu rebanho primeiro.
            </p>
            <a
              href="/dashboard/rebanho/novo"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center px-4 py-2 w-full border rounded-md hover:bg-gray-50"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Cadastrar rebanho agora
            </a>
            <p className="text-xs text-muted-foreground italic">
              Você pode voltar aqui depois de cadastrar seus animais
            </p>
          </CardContent>
        </Card>
      ) : razaoDeteccao === 'sem_acesso' ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg">Acesso não disponível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A projeção automática requer que você tenha assinado um plano que
              inclua a funcionalidade de Gestão de Rebanho.
            </p>
            <a
              href="/dashboard/configuracoes/planos"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center px-4 py-2 w-full border rounded-md hover:bg-gray-50"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Ver planos disponíveis
            </a>
          </CardContent>
        </Card>
      ) : null}

      {/* Rebanho */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Rebanho
            {rebanhoDetectado && usarDadosReais && (
              <Badge variant="secondary" className="ml-2">
                Bloqueado (dados reais)
              </Badge>
            )}
            {rebanhoDetectado && !usarDadosReais && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                Editável
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {rebanhoDetectado && usarDadosReais
              ? 'Quantidades detectadas e projetadas'
              : 'Informe a quantidade de animais para cada categoria'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">PV (kg)</TableHead>
                  <TableHead className="text-right">CMS base (kg/dia)</TableHead>
                  <TableHead className="text-right">% Silagem</TableHead>
                  <TableHead className="text-right">Qtd. Cabeças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{cat.nome}</p>
                        <p className="text-xs text-muted-foreground">{cat.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {cat.pv_ref_kg}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {cat.cms_base_kg_dia.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {(cat.pct_silagem_base * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={quantidades[cat.id] || 0}
                        onChange={(e) =>
                          handleQuantidadeChange(cat.id, e.target.value)
                        }
                        disabled={usarDadosReais && rebanhoDetectado}
                        className="w-16 text-right"
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha de totais */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right">
                    {totalCabecas}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Validação */}
          {errors.rebanho && (
            <Alert variant="destructive">
              <AlertDescription>{errors.rebanho}</AlertDescription>
            </Alert>
          )}

          {totalCabecas === 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Cadastre ao menos 1 animal para continuar
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          onClick={handleNext}
          disabled={totalCabecas === 0}
          size="lg"
        >
          Próximo <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
