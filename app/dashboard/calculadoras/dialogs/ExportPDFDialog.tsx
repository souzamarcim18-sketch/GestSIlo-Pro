'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportarLaudoCalagem, exportarRelatorioNPK, PDFOptions } from '@/lib/pdf-export';
import { CalagemInput, CalagemResult, NPKInput, NPKResult } from '@/lib/calculadoras';
import { Loader2 } from 'lucide-react';

interface ExportPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculadora: 'calagem' | 'npk';
  dadosCalagem?: { input: CalagemInput; resultado: CalagemResult };
  dadosNPK?: { input: NPKInput; resultado: NPKResult };
}

export function ExportPDFDialog({
  open,
  onOpenChange,
  calculadora,
  dadosCalagem,
  dadosNPK,
}: ExportPDFDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [nomeProdutor, setNomeProdutor] = useState('');
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [responsavelTecnico, setResponsavelTecnico] = useState('');

  async function handleExportar() {
    try {
      setIsExporting(true);

      const options: PDFOptions = {
        nomeProdutor: nomeProdutor || undefined,
        nomeFazenda: nomeFazenda || undefined,
        localidade: localidade || undefined,
        responsavelTecnico: responsavelTecnico || undefined,
      };

      if (calculadora === 'calagem' && dadosCalagem) {
        exportarLaudoCalagem(dadosCalagem.input, dadosCalagem.resultado, options);
      } else if (calculadora === 'npk' && dadosNPK) {
        exportarRelatorioNPK(dadosNPK.input, dadosNPK.resultado, options);
      }

      toast.success('PDF exportado com sucesso!');
      onOpenChange(false);

      // Limpar campos
      setNomeProdutor('');
      setNomeFazenda('');
      setLocalidade('');
      setResponsavelTecnico('');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  }

  const titulo = calculadora === 'calagem' ? 'Exportar Laudo de Calagem' : 'Exportar Relatório NPK';
  const descricao =
    calculadora === 'calagem'
      ? 'Customize as informações do laudo técnico de calagem antes de exportar'
      : 'Customize as informações do relatório de adubação antes de exportar';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomeProdutor">Nome do Produtor (opcional)</Label>
            <Input
              id="nomeProdutor"
              placeholder="Ex: João da Silva"
              value={nomeProdutor}
              onChange={e => setNomeProdutor(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeFazenda">Nome da Fazenda (opcional)</Label>
            <Input
              id="nomeFazenda"
              placeholder="Ex: Fazenda Santa Maria"
              value={nomeFazenda}
              onChange={e => setNomeFazenda(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localidade">Localidade (opcional)</Label>
            <Input
              id="localidade"
              placeholder="Ex: Região de Goiás"
              value={localidade}
              onChange={e => setLocalidade(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavelTecnico">Responsável Técnico (opcional)</Label>
            <Input
              id="responsavelTecnico"
              placeholder="Ex: Eng. Agrônomo - Crea 12345"
              value={responsavelTecnico}
              onChange={e => setResponsavelTecnico(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancelar
          </Button>
          <Button onClick={handleExportar} disabled={isExporting}>
            {isExporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
