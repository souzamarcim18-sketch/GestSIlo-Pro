'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  validarCSVAction,
  importarCSVAction,
} from '@/app/dashboard/rebanho/actions';
import type { CSVImportResult, CSVValidacaoResult } from '@/lib/types/rebanho';

interface ImportadorCSVProps {
  onSuccess?: () => void;
}

type Etapa = 'selecionar' | 'revisar' | 'concluido';

export function ImportadorCSV({ onSuccess }: ImportadorCSVProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('selecionar');
  const [validacao, setValidacao] = useState<CSVValidacaoResult | null>(null);
  const [resultado, setResultado] = useState<CSVImportResult | null>(null);
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);

  const validarArquivo = useCallback(async (file: File) => {
    setValidando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      const res = await validarCSVAction(formData);
      setValidacao(res);
      setEtapa('revisar');
      if (res.validos === 0) {
        toast.warning('Nenhuma linha válida encontrada — revise os erros.');
      } else {
        toast.success(`${res.validos} linha(s) pronta(s) para importar.`);
      }
    } catch {
      toast.error('Erro ao validar o arquivo CSV');
    } finally {
      setValidando(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
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
      await validarArquivo(file);
    },
    [validarArquivo]
  );

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
    // Usa ponto e vírgula como separador: é o delimitador que o Excel em
    // locale pt-BR espera. Com vírgula, o Excel joga tudo na coluna A.
    // A linha "sep=;" instrui o Excel a usar ";" independente do locale.
    const template = `sep=;
brinco;nome;sexo;data_nascimento;tipo_rebanho;categoria;lote;raca;origem;peso_nascimento;peso_atual;observacoes
001;Mimosa;Fêmea;2020-01-15;leiteiro;;Lote A;Holandesa;nascido;38;480;Animal saudável
002;;Macho;2021-03-20;leiteiro;;Lote A;Holandesa;comprado;40;520;
003;Estrela;Fêmea;2019-06-10;corte;;Lote B;Nelore;nascido;32;;Matriz`;
    const blob = new Blob([`﻿${template}`], { type: 'text/csv;charset=utf-8' });
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
    setImportando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('criar_lote_automatico', 'true');

      const res = await importarCSVAction(formData);
      setResultado(res);
      setEtapa('concluido');

      if (res.importados > 0) {
        toast.success(`${res.importados} animal(is) importado(s) com sucesso!`);
      }
      if (res.erros.length > 0) {
        toast.warning(`${res.erros.length} linha(s) não importada(s)`);
      }
      onSuccess?.();
    } catch {
      toast.error('Erro ao importar CSV');
    } finally {
      setImportando(false);
    }
  }, [arquivo, onSuccess]);

  const reiniciar = useCallback(() => {
    setArquivo(null);
    setValidacao(null);
    setResultado(null);
    setEtapa('selecionar');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // ---- Etapa: seleção do arquivo ----
  if (etapa === 'selecionar') {
    return (
      <div className="w-full space-y-6">
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
          {validando ? (
            <>
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm font-semibold uppercase tracking-[0.13em]">Validando arquivo…</p>
            </>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.13em]">
                Arraste um arquivo CSV aqui ou
              </p>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Selecionar Arquivo
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Máximo 10MB • Aceita separador vírgula ou ponto e vírgula
              </p>
            </>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Baixar Template
        </Button>
      </div>
    );
  }

  // ---- Etapa: revisão (preview validado antes de confirmar) ----
  if (etapa === 'revisar' && validacao) {
    const podeImportar = validacao.validos > 0;
    return (
      <div className="w-full space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResumoCard label="Total" valor={validacao.total_linhas} />
          <ResumoCard label="Válidos" valor={validacao.validos} tom="ok" />
          <ResumoCard label="Com erro" valor={validacao.com_erro} tom={validacao.com_erro ? 'erro' : undefined} />
          <ResumoCard
            label="Duplicados"
            valor={validacao.duplicados_arquivo + validacao.duplicados_banco}
            tom={validacao.duplicados_arquivo + validacao.duplicados_banco ? 'aviso' : undefined}
          />
        </div>

        {!podeImportar && (
          <Alert className="border-red-500/20 bg-red-50 dark:bg-red-950/30">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              Nenhuma linha válida para importar. Corrija o arquivo e tente novamente.
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.13em]">
            Revisão das linhas
          </h3>
          <ScrollArea className="h-80 w-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Linha</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Brinco</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Nome</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Sexo</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Nascimento</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Tipo</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Raça</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Lote</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold uppercase tracking-[0.13em]">Situação</th>
                </tr>
              </thead>
              <tbody>
                {validacao.linhas.map((l, idx) => (
                  <tr
                    key={idx}
                    className={
                      l.status === 'erro'
                        ? 'border-b bg-red-50/50 dark:bg-red-950/20'
                        : 'border-b'
                    }
                  >
                    <td className="px-2 py-2">{l.linha || '-'}</td>
                    <td className="px-2 py-2 font-medium">{l.brinco || '-'}</td>
                    <td className="px-2 py-2">{l.nome || '-'}</td>
                    <td className="px-2 py-2">{l.sexo || '-'}</td>
                    <td className="px-2 py-2">{l.data_nascimento || '-'}</td>
                    <td className="px-2 py-2 capitalize">{l.tipo_rebanho || '-'}</td>
                    <td className="px-2 py-2">{l.raca || '-'}</td>
                    <td className="px-2 py-2">{l.lote || '-'}</td>
                    <td className="px-2 py-2">
                      {l.status === 'valido' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{l.mensagem}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={reiniciar} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Escolher outro arquivo
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!podeImportar || importando}
            className="w-full sm:w-auto"
          >
            {importando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Confirmar importação ({validacao.validos})
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Etapa: concluído ----
  if (etapa === 'concluido' && resultado) {
    return (
      <div className="w-full space-y-6">
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
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.13em]">
              {resultado.erros.length} linha(s) não importada(s)
            </h3>
            <ScrollArea className="h-64 w-full">
              <div className="space-y-2">
                {resultado.erros.map((erro, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 border-l-4 border-red-500 bg-red-50/50 px-3 py-2 text-xs dark:bg-red-950/20"
                  >
                    <div className="font-semibold text-red-700 dark:text-red-300">
                      {erro.linha ? `Linha ${erro.linha} • ` : ''}
                      {erro.brinco && `Brinco: ${erro.brinco}`}
                    </div>
                    <div className="text-red-600 dark:text-red-400">{erro.mensagem}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        <Button variant="outline" onClick={reiniciar} className="w-full sm:w-auto">
          Importar Novo Arquivo
        </Button>
      </div>
    );
  }

  return null;
}

function ResumoCard({
  label,
  valor,
  tom,
}: {
  label: string;
  valor: number;
  tom?: 'ok' | 'erro' | 'aviso';
}) {
  const cor =
    tom === 'ok'
      ? 'text-green-600 dark:text-green-400'
      : tom === 'erro'
        ? 'text-red-600 dark:text-red-400'
        : tom === 'aviso'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-foreground';
  return (
    <Card className="p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${cor}`}>{valor}</p>
    </Card>
  );
}
