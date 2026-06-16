'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import { getPlanejamentoAction } from '../../actions';
import { gerarPdfPlanejamento } from '@/lib/pdf/gerarPdfPlanejamento';
import { Button } from '@/components/ui/button';
import { CardResumoGeral } from '../../components/resultados/CardResumoGeral';
import { CardPainelFrontal } from '../../components/resultados/CardPainelFrontal';
import { AlertasFixos } from '../../components/resultados/AlertasFixos';
import { TabelaDetalhamento } from '../../components/TabelaDetalhamento';
import { GraficoParticipacao } from '../../components/GraficoParticipacao';

export default function DetalhePlanejamentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [planejamento, setPlanejamento] = useState<PlanejamentoSilagem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportando, setIsExportando] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = await getPlanejamentoAction(params.id);
        if (result.success && result.data) {
          setPlanejamento(result.data);
        } else {
          toast.error(result.error || 'Planejamento não encontrado');
          router.replace('/dashboard/planejamento-silagem/historico');
        }
      } catch {
        toast.error('Erro ao carregar planejamento');
        router.replace('/dashboard/planejamento-silagem/historico');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  const handleExportPDF = async () => {
    if (!planejamento) return;
    setIsExportando(true);
    try {
      await gerarPdfPlanejamento(planejamento, 'Propriedade Rural');
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsExportando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        Carregando planejamento...
      </div>
    );
  }

  if (!planejamento) return null;

  const dadosGrafico = planejamento.resultados.categorias_calculo
    .filter((cat) => cat.quantidade_cabecas > 0)
    .map((cat) => ({ nome: cat.nome, participacao: cat.participacao_pct }))
    .sort((a, b) => b.participacao - a.participacao);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/planejamento-silagem" className="hover:text-foreground">
          Planejamento Silagem
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/planejamento-silagem/historico" className="hover:text-foreground">
          Histórico
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground truncate max-w-[200px]">{planejamento.nome}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{planejamento.nome}</h1>
          <p className="text-muted-foreground mt-1">
            Criado em{' '}
            {new Date(planejamento.created_at).toLocaleDateString('pt-BR')}
            {' · '}
            {planejamento.sistema.tipo_rebanho}
            {' · '}
            <span className="capitalize">
              {planejamento.sistema.sistema_producao.replace('-', ' ')}
            </span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExportando}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExportando ? 'Gerando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <CardResumoGeral resultados={planejamento.resultados} />
      <CardPainelFrontal
        resultados={planejamento.resultados}
        parametros={planejamento.parametros}
      />
      <TabelaDetalhamento categorias={planejamento.resultados.categorias_calculo} />
      <GraficoParticipacao dados={dadosGrafico} />
      <AlertasFixos parametros={planejamento.parametros} />
    </div>
  );
}
