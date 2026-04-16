'use client';

import { useState } from 'react';
import { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { gerarPdfPlanejamento } from '@/lib/pdf/gerarPdfPlanejamento';
import { CardResumoGeral } from '../../components/resultados/CardResumoGeral';
import { CardPainelFrontal } from '../../components/resultados/CardPainelFrontal';
import { AlertasFixos } from '../../components/resultados/AlertasFixos';
import { TabelaDetalhamento } from '../../components/TabelaDetalhamento';
import { GraficoParticipacao } from '../../components/GraficoParticipacao';
import { AlertasDinamicos } from '../../components/AlertasDinamicos';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface DialogDetalhesProps {
  planejamento: PlanejamentoSilagem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeFazenda?: string;
}

export function DialogDetalhes({
  planejamento,
  open,
  onOpenChange,
  nomeFazenda = 'Propriedade Rural',
}: DialogDetalhesProps) {
  const [isExportando, setIsExportando] = useState(false);

  if (!planejamento) return null;

  const handleExportPDF = async () => {
    setIsExportando(true);
    try {
      gerarPdfPlanejamento(planejamento, nomeFazenda);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsExportando(false);
    }
  };

  const dadosGrafico = planejamento.resultados.categorias_calculo
    .filter((cat) => cat.quantidade_cabecas > 0)
    .map((cat) => ({
      nome: cat.nome,
      participacao: cat.participacao_pct,
    }))
    .sort((a, b) => b.participacao - a.participacao);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{planejamento.nome}</DialogTitle>
          <DialogDescription>
            Criado em {new Date(planejamento.created_at).toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cards de Resumo */}
          <CardResumoGeral resultados={planejamento.resultados} />

          {/* Painel Frontal */}
          <CardPainelFrontal
            resultados={planejamento.resultados}
            parametros={planejamento.parametros}
          />

          {/* Tabela Detalhamento */}
          <TabelaDetalhamento
            categorias={planejamento.resultados.categorias_calculo}
          />

          {/* Gráfico Participação */}
          <GraficoParticipacao dados={dadosGrafico} />

          {/* Alertas Fixos */}
          <AlertasFixos parametros={planejamento.parametros} />

          {/* Alertas Dinâmicos - Se houver */}
          {planejamento.resultados.categorias_calculo.some(
            (cat) => cat.quantidade_cabecas > 0
          ) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Referências Técnicas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Baseado em dados do planejamento salvo.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            disabled={isExportando}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExportando ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={isExportando}
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
