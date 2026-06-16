'use client';

import { useState } from 'react';
import { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { gerarPdfPlanejamento } from '@/lib/pdf/gerarPdfPlanejamento';
import { CardResumoGeral } from '../../components/resultados/CardResumoGeral';
import { CardPainelFrontal } from '../../components/resultados/CardPainelFrontal';
import { AlertasFixos } from '../../components/resultados/AlertasFixos';
import { TabelaDetalhamento } from '../../components/TabelaDetalhamento';
import { GraficoParticipacao } from '../../components/GraficoParticipacao';

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
      await gerarPdfPlanejamento(planejamento, nomeFazenda);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col p-0"
      >
        {/* Cabeçalho fixo */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-lg">{planejamento.nome}</SheetTitle>
          <SheetDescription>
            Criado em{' '}
            {new Date(planejamento.created_at).toLocaleDateString('pt-BR')}
          </SheetDescription>
        </SheetHeader>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <CardResumoGeral resultados={planejamento.resultados} />
          <CardPainelFrontal
            resultados={planejamento.resultados}
            parametros={planejamento.parametros}
          />
          <TabelaDetalhamento
            categorias={planejamento.resultados.categorias_calculo}
          />
          <GraficoParticipacao dados={dadosGrafico} />
          <AlertasFixos parametros={planejamento.parametros} />
        </div>

        {/* Rodapé fixo */}
        <div className="px-6 py-4 border-t shrink-0">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            disabled={isExportando}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExportando ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
