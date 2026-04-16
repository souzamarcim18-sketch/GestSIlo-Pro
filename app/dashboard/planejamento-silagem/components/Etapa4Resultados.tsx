'use client';

import { useState } from 'react';
import { ChevronLeft, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  formatTon,
  formatHa,
  formatM2,
  formatKgDia,
  formatPercent,
} from '@/lib/utils/format-planejamento';
import {
  gerarExemplosDimensaoPainel,
  calcularPainelMultiplosSilos,
} from '@/lib/services/planejamento-silagem';
import { WizardState, ResultadosPlanejamento, AlertaPlanejamento } from '@/lib/types/planejamento-silagem';
import { AlertasDinamicos } from './AlertasDinamicos';
import { TabelaDetalhamento } from './TabelaDetalhamento';
import { GraficoParticipacao } from './GraficoParticipacao';
import { toast } from 'sonner';

interface Etapa4ResultadosProps {
  wizard: WizardState;
  resultados: ResultadosPlanejamento;
  alertas: AlertaPlanejamento[];
  onBack: () => void;
  onSave: (nome: string) => Promise<void>;
  isSaving: boolean;
}

export function Etapa4Resultados({
  wizard,
  resultados,
  alertas,
  onBack,
  onSave,
  isSaving,
}: Etapa4ResultadosProps) {
  const [nomePlanejamento, setNomePlanejamento] = useState('');
  const [erroNome, setErroNome] = useState('');

  const handleSave = async () => {
    if (!nomePlanejamento.trim()) {
      setErroNome('Nome do planejamento é obrigatório');
      return;
    }
    setErroNome('');
    await onSave(nomePlanejamento);
    setNomePlanejamento('');
  };

  const handleExportPDF = () => {
    toast.info('Feature em desenvolvimento');
  };

  if (!wizard.sistema || !wizard.parametros) {
    return <div className="text-center text-muted-foreground">Dados incompletos</div>;
  }

  // Gerar exemplos de dimensão
  const exemplosDimensao = gerarExemplosDimensaoPainel(resultados.area_painel_m2);
  const exemploMultiplosSilos =
    resultados.area_painel_m2 > 15
      ? calcularPainelMultiplosSilos(resultados.area_painel_m2, 2)
      : null;

  // Preparar dados para gráfico
  const dadosGrafico = resultados.categorias_calculo
    .filter((cat) => cat.quantidade_cabecas > 0)
    .map((cat) => ({
      nome: cat.nome,
      participacao: cat.participacao_pct,
    }))
    .sort((a, b) => b.participacao - a.participacao);

  return (
    <div className="space-y-6">
      {/* === Cards de Resumo === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Demanda MS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Demanda MS Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTon(resultados.demanda_ms_total_ton)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">ton</p>
          </CardContent>
        </Card>

        {/* Demanda MO com perdas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Demanda MO (com perdas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTon(resultados.demanda_mo_com_perdas_ton)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">ton</p>
          </CardContent>
        </Card>

        {/* Consumo diário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Consumo Diário MO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatKgDia(resultados.consumo_diario_mo_kg)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">kg/dia</p>
          </CardContent>
        </Card>

        {/* Área de plantio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Área de Plantio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHa(resultados.area_plantio_ha)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">ha</p>
          </CardContent>
        </Card>
      </div>

      {/* === Card Painel Frontal === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Painel Frontal do Silo</CardTitle>
          <CardDescription>
            Dimensionamento da área frontal baseado em taxa de retirada de{' '}
            {wizard.parametros.taxa_retirada_kg_m2_dia} kg/m²/dia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Área máxima do painel: {formatM2(resultados.area_painel_m2)} m²
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Exemplos de dimensão:</p>
            <ul className="space-y-1">
              {exemplosDimensao.map((ex, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">
                  • {ex.largura.toFixed(1)} m larg. × {ex.altura.toFixed(1)} m alt. ={' '}
                  {formatM2(ex.area)}
                </li>
              ))}
            </ul>
          </div>

          {exemploMultiplosSilos && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                Se usar 2 silos simultâneos:
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                • cada painel ≤ {formatM2(exemploMultiplosSilos.area_por_silo)} m² (ex.:{' '}
                {exemploMultiplosSilos.exemplo.largura.toFixed(1)} m ×{' '}
                {exemploMultiplosSilos.exemplo.altura.toFixed(1)} m)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Tabela Detalhamento === */}
      <TabelaDetalhamento categorias={resultados.categorias_calculo} />

      {/* === Gráfico Participação === */}
      <GraficoParticipacao dados={dadosGrafico} />

      {/* === Alertas Fixos === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas Técnicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertDescription className="text-sm">
              Valores estimados com base em parâmetros médios. Ajuste conforme
              manejo real e orientação de nutricionista.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="text-sm">
              Inclui margem de segurança de <strong>{wizard.parametros.perdas_percent}%</strong>{' '}
              para perdas.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="text-sm">
              Dietas com maior proporção de concentrado reduzem a participação da
              silagem. Consulte um nutricionista para otimizar a relação
              volumoso:concentrado.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="text-sm">
              A área do painel frontal indica o tamanho <strong>MÁXIMO</strong> para
              manter taxa de retirada ≥{' '}
              <strong>{wizard.parametros.taxa_retirada_kg_m2_dia} kg/m²/dia</strong>,
              minimizando deterioração aeróbia (Bernardes et al., 2021).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* === Alertas Dinâmicos === */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Condições Detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertasDinamicos alertas={alertas} />
          </CardContent>
        </Card>
      )}

      {/* === Salvar === */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Finalizar Planejamento</CardTitle>
          <CardDescription>
            Salve este planejamento para referência futura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-planejamento">Nome do Planejamento</Label>
            <Input
              id="nome-planejamento"
              placeholder="ex: Rebanho Leiteiro 2026-06"
              value={nomePlanejamento}
              onChange={(e) => {
                setNomePlanejamento(e.target.value);
                setErroNome('');
              }}
              disabled={isSaving}
            />
            {erroNome && (
              <Alert variant="destructive">
                <AlertDescription>{erroNome}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleSave}
              disabled={!nomePlanejamento.trim() || isSaving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>

            <Button
              onClick={handleExportPDF}
              variant="outline"
              disabled={isSaving}
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === Botão Voltar === */}
      <div className="flex justify-start pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para Parâmetros
        </Button>
      </div>
    </div>
  );
}
