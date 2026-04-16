'use client';

import { useState } from 'react';
import { Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { gerarPdfPlanejamento } from '@/lib/pdf/gerarPdfPlanejamento';
import { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';

interface SecaoSalvarProps {
  onSave: (nome: string) => Promise<void>;
  isSaving: boolean;
  planejamentoParaExportar?: PlanejamentoSilagem;
  nomeFazenda?: string;
}

export function SecaoSalvar({
  onSave,
  isSaving,
  planejamentoParaExportar,
  nomeFazenda = 'Propriedade Rural',
}: SecaoSalvarProps) {
  const [nomePlanejamento, setNomePlanejamento] = useState('');
  const [erroNome, setErroNome] = useState('');
  const [isExportando, setIsExportando] = useState(false);

  const handleSave = async () => {
    if (!nomePlanejamento.trim()) {
      setErroNome('Nome do planejamento é obrigatório');
      return;
    }
    setErroNome('');
    await onSave(nomePlanejamento);
    setNomePlanejamento('');
  };

  const handleExportPDF = async () => {
    if (!planejamentoParaExportar) {
      toast.error('Dados do planejamento não disponíveis');
      return;
    }

    setIsExportando(true);
    try {
      gerarPdfPlanejamento(planejamentoParaExportar, nomeFazenda);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsExportando(false);
    }
  };

  return (
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
            disabled={!planejamentoParaExportar || isExportando}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExportando ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
