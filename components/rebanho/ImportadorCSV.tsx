'use client';

import { useCallback, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { importarCSVAction } from '@/app/dashboard/rebanho/actions';
import type { CSVImportResult, AnimalCSVRow } from '@/lib/types/rebanho';

interface ImportadorCSVProps {
  onSuccess?: () => void;
}

export function ImportadorCSV({ onSuccess }: ImportadorCSVProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<AnimalCSVRow[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<CSVImportResult | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Por favor, selecione um arquivo CSV válido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 10MB)');
      return;
    }

    setArquivo(file);
    setResultado(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const linhas = (results.data as Record<string, string>[]).slice(0, 5);
        setPreview(
          linhas.map((linha) => ({
            brinco: linha.brinco || '',
            sexo: (linha.sexo as 'Macho' | 'Fêmea') || 'Macho',
            data_nascimento: linha.data_nascimento || '',
            tipo_rebanho: (linha.tipo_rebanho as 'leiteiro' | 'corte') || 'leiteiro',
            lote: linha.lote || undefined,
            raca: linha.raca || undefined,
            observacoes: linha.observacoes || undefined,
          }))
        );
        toast.success(`Arquivo carregado: ${linhas.length} linhas de preview`);
      },
      error: () => {
        toast.error('Erro ao analisar CSV');
        setArquivo(null);
        setPreview([]);
      },
    });
  }, []);

  const handleDropZone = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDownloadTemplate = useCallback(() => {
    const template = `brinco,sexo,data_nascimento,tipo_rebanho,lote,raca,observacoes
001,Fêmea,2020-01-15,leiteiro,Lote A,Holandesa,Animal saudável
002,Macho,2021-03-20,leiteiro,Lote A,Holandesa,
003,Fêmea,2019-06-10,corte,Lote B,Nelore,Reprodutor`;
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-animais.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportar = useCallback(async () => {
    if (!arquivo) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('criar_lote_automatico', 'true');

      const res = await importarCSVAction(formData);
      setResultado(res);

      if (res.importados > 0) {
        toast.success(`${res.importados} animal(is) importado(s) com sucesso!`);
      }

      if (res.erros.length > 0) {
        toast.warning(`${res.erros.length} erro(s) encontrado(s)`);
      }

      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao importar CSV');
    } finally {
      setCarregando(false);
    }
  }, [arquivo, onSuccess]);

  const handleClearResultado = useCallback(() => {
    setResultado(null);
    setArquivo(null);
    setPreview([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="w-full space-y-6">
      {!resultado ? (
        <>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropZone}
            className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-12 text-center transition-colors hover:border-muted-foreground/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">Arraste um arquivo CSV aqui ou</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Selecionar Arquivo
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Máximo 10MB • Formato: brinco, sexo, data_nascimento, tipo_rebanho, lote, raça, observações
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Template
            </Button>
            <Button
              onClick={handleImportar}
              disabled={!arquivo || carregando}
              className="w-full sm:w-auto"
            >
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          </div>

          {preview.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Preview (primeiras 5 linhas)</h3>
              <ScrollArea className="w-full">
                <div className="inline-block w-full min-w-fit">
                  <table className="text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-semibold">Brinco</th>
                        <th className="px-3 py-2 text-left font-semibold">Sexo</th>
                        <th className="px-3 py-2 text-left font-semibold">Data Nascimento</th>
                        <th className="px-3 py-2 text-left font-semibold">Tipo Rebanho</th>
                        <th className="px-3 py-2 text-left font-semibold">Lote</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((linha, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2">{linha.brinco}</td>
                          <td className="px-3 py-2">{linha.sexo}</td>
                          <td className="px-3 py-2">{linha.data_nascimento}</td>
                          <td className="px-3 py-2">{linha.tipo_rebanho}</td>
                          <td className="px-3 py-2">{linha.lote || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="space-y-4">
            {resultado.importados > 0 && (
              <Alert className="border-green-500/20 bg-green-50 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>{resultado.importados} animal(is) importado(s) com sucesso!</strong>
                  {resultado.lote_criado_nome && (
                    <p className="mt-1 text-sm">
                      Lote criado: <strong>{resultado.lote_criado_nome}</strong>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {resultado.erros.length > 0 && (
              <Alert className="border-red-500/20 bg-red-50 dark:bg-red-950/30">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <strong>{resultado.erros.length} erro(s) encontrado(s)</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {resultado.erros.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Detalhes dos Erros</h3>
              <ScrollArea className="w-full">
                <div className="space-y-2">
                  {resultado.erros.map((erro, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-1 border-l-4 border-red-500 bg-red-50/50 px-3 py-2 text-xs dark:bg-red-950/20"
                    >
                      <div className="font-semibold text-red-700 dark:text-red-300">
                        Linha {erro.linha} {erro.brinco && `• Brinco: ${erro.brinco}`}
                      </div>
                      <div className="text-red-600 dark:text-red-400">{erro.mensagem}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleClearResultado}
              className="w-full sm:w-auto"
            >
              Importar Novo Arquivo
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
