'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardState, ResultadosPlanejamento, AlertaPlanejamento, PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import { CATEGORIAS_LEITE, CATEGORIAS_CORTE } from '@/lib/constants/planejamento-silagem';
import { AlertasDinamicos } from './AlertasDinamicos';
import { TabelaDetalhamento } from './TabelaDetalhamento';
import { GraficoParticipacao } from './GraficoParticipacao';
import { CardResumoGeral } from './resultados/CardResumoGeral';
import { CardPainelFrontal } from './resultados/CardPainelFrontal';
import { AlertasFixos } from './resultados/AlertasFixos';
import { SecaoSalvar } from './resultados/SecaoSalvar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Etapa4ResultadosProps {
  wizard: WizardState;
  resultados: ResultadosPlanejamento;
  alertas: AlertaPlanejamento[];
  onBack: () => void;
  onSave: (nome: string) => Promise<void>;
  isSaving: boolean;
  nomeFazenda?: string;
}

export function Etapa4Resultados({
  wizard,
  resultados,
  alertas,
  onBack,
  onSave,
  isSaving,
  nomeFazenda = 'Propriedade Rural',
}: Etapa4ResultadosProps) {
  if (!wizard.sistema || !wizard.parametros) {
    return <div className="text-center text-muted-foreground">Dados incompletos</div>;
  }

  // Preparar dados para gráfico
  const dadosGrafico = resultados.categorias_calculo
    .filter((cat) => cat.quantidade_cabecas > 0)
    .map((cat) => ({
      nome: cat.nome,
      participacao: cat.participacao_pct,
    }))
    .sort((a, b) => b.participacao - a.participacao);

  // Montar planejamento para export (sem id/fazenda_id, que serão adicionados no servidor)
  const categorias = wizard.sistema.tipo_rebanho === 'Leite' ? CATEGORIAS_LEITE : CATEGORIAS_CORTE;
  const planejamentoParaExportar: Omit<PlanejamentoSilagem, 'id' | 'fazenda_id'> & { id: string; fazenda_id: string } = {
    id: 'temp-preview',
    fazenda_id: 'temp-preview',
    nome: 'Planejamento',
    sistema: wizard.sistema,
    rebanho: categorias
      .map((cat) => ({
        ...cat,
        quantidade_cabecas: wizard.rebanho[cat.id] || 0,
      }))
      .filter((cat) => cat.quantidade_cabecas > 0),
    parametros: wizard.parametros,
    resultados,
    created_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <CardResumoGeral resultados={resultados} />

      {/* Painel Frontal */}
      <CardPainelFrontal resultados={resultados} parametros={wizard.parametros} />

      {/* Tabela Detalhamento */}
      <TabelaDetalhamento categorias={resultados.categorias_calculo} />

      {/* Gráfico Participação */}
      <GraficoParticipacao dados={dadosGrafico} />

      {/* Alertas Fixos */}
      <AlertasFixos parametros={wizard.parametros} />

      {/* Alertas Dinâmicos */}
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

      {/* Seção Salvar */}
      <SecaoSalvar
        onSave={onSave}
        isSaving={isSaving}
        planejamentoParaExportar={planejamentoParaExportar}
        nomeFazenda={nomeFazenda}
      />

      {/* Botão Voltar */}
      <div className="flex justify-start pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para Parâmetros
        </Button>
      </div>
    </div>
  );
}
