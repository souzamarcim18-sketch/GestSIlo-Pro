import ExcelJS from 'exceljs';
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
 * Constrói o Workbook ExcelJS sem disparar download.
 * Separado de gerarExcel() para permitir testes unitários.
 */
export function buildWorkbook(config: ExcelReportConfig): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  for (const sheet of config.sheets) {
    const ws = wb.addWorksheet(sheet.nome);

    // Linha 1: título do relatório
    ws.addRow([`GestSilo — ${config.metadata.nomeRelatorio}`]);
    // Linha 2: metadados (fazenda, período, data de geração)
    ws.addRow([buildMetadataLine2(config.metadata)]);
    // Linha 3: em branco
    ws.addRow([]);
    // Linha 4: cabeçalhos das colunas
    const headerRow = ws.addRow(sheet.colunas.map((c) => c.label));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    if (sheet.linhas.length === 0) {
      const emptyText = config.metadata.periodo
        ? 'Nenhum registro encontrado no período selecionado'
        : 'Nenhum registro cadastrado';
      const emptyRow = ws.addRow([emptyText]);
      emptyRow.getCell(1).font = { italic: true };
      if (sheet.colunas.length > 1) {
        ws.mergeCells(5, 1, 5, sheet.colunas.length);
      }
    } else {
      for (const linha of sheet.linhas) {
        const row = sheet.colunas.map((c) => formatarValorExcel(linha[c.key], c.tipo));
        ws.addRow(row);
      }
    }

    ws.columns = sheet.colunas.map((c) => ({ width: c.largura ?? 20 }));
  }

  return wb;
}

/** Gera o Excel e dispara o download no browser. */
export async function gerarExcel(config: ExcelReportConfig): Promise<void> {
  const wb = buildWorkbook(config);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = config.fileName;
  a.click();
  URL.revokeObjectURL(url);
}
