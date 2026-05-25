import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/utils';

export type ColunaTipo = 'BRL' | 'date' | 'number' | 'percent' | 'text';

export interface ColunaConfig {
  key: string;
  label: string;
  tipo?: ColunaTipo;
  largura?: number;
}

export interface AbaConfig {
  nome: string;
  colunas: ColunaConfig[];
  linhas: Record<string, unknown>[];
}

export interface ExcelMetadata {
  fazendaNome: string;
  periodo?: { from: Date; to: Date };
  geradoEm: Date;
  nomeRelatorio: string;
}

export interface ExcelReportConfig {
  fileName: string;
  sheets: AbaConfig[];
  metadata: ExcelMetadata;
}

export function formatarValorExcel(value: unknown, tipo: ColunaTipo = 'text'): string {
  if (value === null || value === undefined) return '';
  switch (tipo) {
    case 'BRL':
      return formatBRL(typeof value === 'number' ? value : Number(value));
    case 'date': {
      const d = typeof value === 'string' ? new Date(value) : (value as Date);
      return isNaN(d.getTime()) ? String(value) : format(d, 'dd/MM/yyyy', { locale: ptBR });
    }
    case 'percent':
      return `${(Number(value) * 100).toFixed(1)}%`;
    case 'number':
      return Number(value).toLocaleString('pt-BR');
    default:
      return String(value);
  }
}

function buildMetadataLine2(meta: ExcelMetadata): string {
  const gerado = format(meta.geradoEm, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  if (meta.periodo) {
    const from = format(meta.periodo.from, 'dd/MM/yyyy', { locale: ptBR });
    const to = format(meta.periodo.to, 'dd/MM/yyyy', { locale: ptBR });
    return `Fazenda: ${meta.fazendaNome} | Período: ${from} – ${to} | Gerado em: ${gerado}`;
  }
  return `Fazenda: ${meta.fazendaNome} | Gerado em: ${gerado}`;
}

/**
 * Constrói o WorkBook XLSX sem disparar download.
 * Separado de gerarExcel() para permitir testes unitários.
 */
export function buildWorkbook(config: ExcelReportConfig): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  for (const sheet of config.sheets) {
    const aoa: unknown[][] = [];

    aoa.push([`GestSilo — ${config.metadata.nomeRelatorio}`]);
    aoa.push([buildMetadataLine2(config.metadata)]);
    aoa.push([]);
    aoa.push(sheet.colunas.map((c) => c.label));

    if (sheet.linhas.length === 0) {
      const emptyText = config.metadata.periodo
        ? 'Nenhum registro encontrado no período selecionado'
        : 'Nenhum registro cadastrado';
      aoa.push([emptyText]);
    } else {
      for (const linha of sheet.linhas) {
        const row = sheet.colunas.map((c) => formatarValorExcel(linha[c.key], c.tipo));
        aoa.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Cabeçalho em negrito (linha 4 = índice 3)
    for (let col = 0; col < sheet.colunas.length; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 3, c: col });
      if (ws[cellAddr]) {
        ws[cellAddr].s = { font: { bold: true } };
      }
    }

    // Empty state em itálico + mescla
    if (sheet.linhas.length === 0) {
      const emptyCell = XLSX.utils.encode_cell({ r: 4, c: 0 });
      if (ws[emptyCell]) {
        ws[emptyCell].s = { font: { italic: true } };
        ws['!merges'] = [{ s: { r: 4, c: 0 }, e: { r: 4, c: Math.max(0, sheet.colunas.length - 1) } }];
      }
    }

    ws['!cols'] = sheet.colunas.map((c) => ({ wch: c.largura ?? 20 }));

    XLSX.utils.book_append_sheet(wb, ws, sheet.nome);
  }

  return wb;
}

/** Gera o Excel e dispara o download no browser. */
export function gerarExcel(config: ExcelReportConfig): void {
  const wb = buildWorkbook(config);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = config.fileName;
  a.click();
  URL.revokeObjectURL(url);
}
