'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, Eye, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { gerarExcel } from '@/lib/relatorios/excel-builder';
import { gerarPdf } from '@/lib/relatorios/pdf-builder';
import {
  validarCamposSelecionados,
  buildRebanhoRows,
  getCamposPorIds,
  type FiltrosRebanho,
} from '@/lib/relatorios/rebanho-builder';
import {
  CAMPOS_REBANHO,
  CATEGORIAS_REBANHO_LABELS,
  type AnimalCompleto,
  type CategoriaRebanho,
} from '@/lib/types/relatorios-rebanho';
import { getRelatorioRebanhoAction } from './actions';

const PDF_MAX_COLUNAS = 8;

interface RebanhoBuilderClientProps {
  fazendaId: string;
  fazendaNome: string;
  lotes: Array<{ id: string; nome: string }>;
}

const CATEGORIAS_ORDEM: CategoriaRebanho[] = [
  'identificacao',
  'pesagem',
  'reproducao',
  'leiteira',
  'sanidade',
  'corte',
  'datas',
];

export function RebanhoBuilderClient({ fazendaId, fazendaNome, lotes }: RebanhoBuilderClientProps) {
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>(['brinco']);
  const [filtros, setFiltros] = useState<FiltrosRebanho>({});
  const [preview, setPreview] = useState<AnimalCompleto[] | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

  const camposAgrupados = useMemo(() => {
    const map = new Map<CategoriaRebanho, typeof CAMPOS_REBANHO>();
    for (const cat of CATEGORIAS_ORDEM) {
      map.set(cat, CAMPOS_REBANHO.filter((c) => c.categoria === cat));
    }
    return map;
  }, []);

  const toggleCampo = useCallback((id: string) => {
    if (id === 'brinco') return; // obrigatório
    setCamposSelecionados((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setPreview(null); // invalida preview ao mudar seleção
  }, []);

  const camposValidos = useMemo(() => {
    const { validIds } = validarCamposSelecionados(camposSelecionados);
    return validIds;
  }, [camposSelecionados]);

  const camposObj = useMemo(() => getCamposPorIds(camposValidos), [camposValidos]);

  const handlePreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const result = await getRelatorioRebanhoAction(camposValidos, filtros, 10);
      setPreview(result.data);
      if (result.data.length === 0) {
        toast.info('Nenhum animal encontrado com os filtros selecionados.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar preview. Tente novamente.');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [camposValidos, filtros]);

  const handleExportExcel = useCallback(async () => {
    setIsExporting('excel');
    try {
      const result = await getRelatorioRebanhoAction(camposValidos, filtros);
      if (result.truncated) {
        toast.warning('Relatório limitado a 5.000 animais. Aplique filtros para dados completos.');
      }
      const rows = buildRebanhoRows(result.data, camposObj);
      await gerarExcel({
        fileName: `rebanho_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`,
        metadata: { fazendaNome, geradoEm: new Date(), nomeRelatorio: 'Construtor de Rebanho' },
        sheets: [{
          nome: 'Rebanho',
          colunas: camposObj.map((c) => ({
            key: c.id,
            label: c.label,
            tipo: c.tipo === 'date' ? 'date' : c.tipo === 'currency' ? 'BRL' : c.tipo === 'number' ? 'number' : 'text',
            largura: 20,
          })),
          linhas: rows,
        }],
      });
      toast.success(`Excel gerado com ${result.data.length} animais.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar Excel. Tente novamente.');
    } finally {
      setIsExporting(null);
    }
  }, [camposValidos, camposObj, filtros, fazendaNome]);

  const handleExportPdf = useCallback(async () => {
    const camposParaPdf = camposObj.slice(0, PDF_MAX_COLUNAS);
    const truncouPdf = camposObj.length > PDF_MAX_COLUNAS;

    if (truncouPdf) {
      toast.warning(
        `PDF limitado a ${PDF_MAX_COLUNAS} colunas. Use Excel para tabelas com mais colunas.`
      );
    }

    setIsExporting('pdf');
    try {
      const result = await getRelatorioRebanhoAction(camposValidos, filtros, 500);
      const rows = buildRebanhoRows(result.data, camposParaPdf);
      await gerarPdf({
        fileName: `rebanho_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.pdf`,
        titulo: 'Relatório de Rebanho',
        orientacao: camposParaPdf.length > 5 ? 'landscape' : 'portrait',
        metadata: { fazendaNome, geradoEm: new Date(), nomeRelatorio: 'Construtor de Rebanho' },
        secoes: [{
          titulo: 'Animais',
          colunas: camposParaPdf.map((c) => ({
            key: c.id,
            label: c.label,
            tipo: c.tipo === 'date' ? 'date' : c.tipo === 'currency' ? 'BRL' : c.tipo === 'number' ? 'number' : 'text',
          })),
          linhas: rows,
        }],
      });
      toast.success('PDF gerado com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(null);
    }
  }, [camposValidos, camposObj, filtros, fazendaNome]);

  const previewColunas = camposObj;
  const previewRows = preview ? buildRebanhoRows(preview, previewColunas) : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/relatorios" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Relatórios
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">Construtor de Rebanho</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Construtor de Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione os campos e filtros desejados para montar seu relatório de rebanho.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal */}
        <div className="space-y-6">

          {/* Seleção de campos */}
          <div className="rounded-lg border bg-card p-5 space-y-5">
            <h2 className="text-sm font-semibold">Campos do Relatório</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {CATEGORIAS_ORDEM.map((cat) => {
                const campos = camposAgrupados.get(cat) ?? [];
                return (
                  <div key={cat} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {CATEGORIAS_REBANHO_LABELS[cat]}
                    </p>
                    <div className="space-y-1.5">
                      {campos.map((campo) => {
                        const checked = camposSelecionados.includes(campo.id);
                        const disabled = campo.id === 'brinco';
                        return (
                          <div key={campo.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`campo-${campo.id}`}
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={() => toggleCampo(campo.id)}
                            />
                            <Label
                              htmlFor={`campo-${campo.id}`}
                              className={`text-sm cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}
                            >
                              {campo.label}
                              {disabled && (
                                <Badge variant="secondary" className="ml-2 text-xs py-0">obrigatório</Badge>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {preview !== null && (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Preview {preview.length === 0 ? '— sem resultados' : `(${preview.length} animais)`}
                </p>
                <span className="text-xs text-muted-foreground">Primeiras 10 linhas</span>
              </div>
              {preview.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewColunas.map((c) => (
                          <TableHead key={c.id} className="text-xs whitespace-nowrap">{c.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {previewColunas.map((c) => (
                            <TableCell key={c.id} className="text-sm whitespace-nowrap">
                              {String(row[c.id] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="px-5 py-6 text-sm text-muted-foreground text-center">
                  Nenhum animal encontrado com os filtros selecionados.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Coluna lateral — filtros + export */}
        <div className="space-y-4">

          {/* Filtros */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Filtros</h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Lote</Label>
                <Select
                  value={filtros.lote_id ?? '__todos__'}
                  onValueChange={(v) => {
                    const loteIdVal: string | undefined = (!v || v === '__todos__') ? undefined : v;
                    setFiltros((f): FiltrosRebanho => ({ ...f, lote_id: loteIdVal }));
                    setPreview(null);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todos os lotes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os lotes</SelectItem>
                    {lotes.map((l) => (
                      <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select
                  value={filtros.status ?? '__todos__'}
                  onValueChange={(v) => {
                    const val: string | undefined = (!v || v === '__todos__') ? undefined : v;
                    setFiltros((f): FiltrosRebanho => ({ ...f, status: val }));
                    setPreview(null);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os status</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Morto">Morto</SelectItem>
                    <SelectItem value="Descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Sexo</Label>
                <Select
                  value={filtros.sexo ?? '__todos__'}
                  onValueChange={(v) => {
                    const val: string | undefined = (!v || v === '__todos__') ? undefined : v;
                    setFiltros((f): FiltrosRebanho => ({ ...f, sexo: val }));
                    setPreview(null);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    <SelectItem value="Fêmea">Fêmea</SelectItem>
                    <SelectItem value="Macho">Macho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Resumo seleção */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Selecionado</h2>
              <Badge variant="secondary">{camposValidos.length} campos</Badge>
            </div>

            {camposObj.length > PDF_MAX_COLUNAS && (
              <Alert className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  PDF limitado a {PDF_MAX_COLUNAS} colunas. Use Excel para exportar todos os campos.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handlePreview}
                disabled={isLoadingPreview || camposValidos.length === 0}
              >
                {isLoadingPreview ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Carregando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Visualizar Preview
                  </span>
                )}
              </Button>

              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleExportExcel}
                disabled={isExporting !== null || camposValidos.length === 0}
              >
                {isExporting === 'excel' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Gerando Excel...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleExportPdf}
                disabled={isExporting !== null || camposValidos.length === 0}
              >
                {isExporting === 'pdf' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Gerando PDF...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Exportar PDF {camposObj.length > PDF_MAX_COLUNAS && `(${PDF_MAX_COLUNAS} cols)`}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
