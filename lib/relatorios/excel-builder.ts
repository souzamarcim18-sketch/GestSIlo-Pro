import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/utils';
import {
  BRAND_PRIMARY_ARGB,
  TABLE_HEADER_FILL_ARGB,
  TABLE_HEADER_TEXT_ARGB,
  ROW_ZEBRA_ARGB,
  TEXT_DARK_ARGB,
  TEXT_MUTED_ARGB,
  REPORT_HEADER_TEXT_ARGB,
  REPORT_HEADER_SUBTEXT_ARGB,
  REPORT_META_FILL_ARGB,
  BORDER_ARGB,
  EXCEL_HEADER_ROW_HEIGHT,
  EXCEL_SUBHEADER_ROW_HEIGHT,
  EXCEL_LOGO_HEIGHT,
  EXCEL_LOGO_WIDTH,
} from '@/lib/branding/tokens';

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
  /** Buffer PNG da logo. Quando omitido, buildWorkbook tenta carregar public/logo_verde.png via fs (Node.js). */
  logoBuffer?: Buffer;
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

function geradoEmSP(date: Date): string {
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function buildPeriodoLine(meta: ExcelMetadata): string {
  const gerado = geradoEmSP(meta.geradoEm);
  if (meta.periodo) {
    const from = format(meta.periodo.from, 'dd/MM/yyyy', { locale: ptBR });
    const to = format(meta.periodo.to, 'dd/MM/yyyy', { locale: ptBR });
    return `Fazenda: ${meta.fazendaNome}  |  Período: ${from} – ${to}  |  Gerado em: ${gerado}`;
  }
  return `Fazenda: ${meta.fazendaNome}  |  Gerado em: ${gerado}`;
}

function applyCellBorder(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: 'thin', color: { argb: BORDER_ARGB } },
    left: { style: 'thin', color: { argb: BORDER_ARGB } },
    bottom: { style: 'thin', color: { argb: BORDER_ARGB } },
    right: { style: 'thin', color: { argb: BORDER_ARGB } },
  };
}

/**
 * Constrói o Workbook ExcelJS com identidade visual GestSilo.
 * Separado de gerarExcel() para permitir testes unitários.
 */
export function buildWorkbook(config: ExcelReportConfig): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  // Tenta carregar logo: usa buffer passado na config ou lê do fs (Node.js)
  let logoBuffer: Buffer | undefined = config.logoBuffer;
  if (!logoBuffer && typeof window === 'undefined') {
    try {
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const logoPath = path.join(process.cwd(), 'public', 'logo_verde.png');
      logoBuffer = fs.readFileSync(logoPath);
    } catch {
      // fs indisponível
    }
  }

  for (const sheet of config.sheets) {
    const ws = wb.addWorksheet(sheet.nome);
    const numCols = Math.max(sheet.colunas.length, 1);

    // ── Linha 1: Cabeçalho (fundo branco, título em verde escuro) ────────────
    const titleRow = ws.addRow(['GestSilo — ' + config.metadata.nomeRelatorio]);
    titleRow.height = EXCEL_HEADER_ROW_HEIGHT;
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 14, color: { argb: REPORT_HEADER_TEXT_ARGB }, name: 'Arial' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    if (numCols > 1) ws.mergeCells(1, 1, 1, numCols);

    // ── Linha 2: Metadados (fazenda, período, data) ───────────────────────────
    const metaRow = ws.addRow([buildPeriodoLine(config.metadata)]);
    metaRow.height = EXCEL_SUBHEADER_ROW_HEIGHT;
    const metaCell = metaRow.getCell(1);
    metaCell.font = { size: 9, italic: true, color: { argb: REPORT_HEADER_SUBTEXT_ARGB }, name: 'Arial' };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: REPORT_META_FILL_ARGB } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    if (numCols > 1) ws.mergeCells(2, 1, 2, numCols);

    // ── Linha 3: em branco ────────────────────────────────────────────────────
    ws.addRow([]);

    // ── Linha 4: Cabeçalhos das colunas ──────────────────────────────────────
    const headerRow = ws.addRow(sheet.colunas.map((c) => c.label));
    headerRow.height = 18;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: TABLE_HEADER_TEXT_ARGB }, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_HEADER_FILL_ARGB } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      applyCellBorder(cell);
    });

    // ── Linhas de dados (com zebra) ───────────────────────────────────────────
    if (sheet.linhas.length === 0) {
      const emptyText = config.metadata.periodo
        ? 'Nenhum registro encontrado no período selecionado'
        : 'Nenhum registro cadastrado';
      const emptyRow = ws.addRow([emptyText]);
      const emptyCell = emptyRow.getCell(1);
      emptyCell.font = { italic: true, color: { argb: TEXT_MUTED_ARGB }, name: 'Arial' };
      emptyCell.alignment = { horizontal: 'center' };
      if (numCols > 1) ws.mergeCells(5, 1, 5, numCols);
    } else {
      sheet.linhas.forEach((linha, idx) => {
        const isZebra = idx % 2 === 1;
        const row = ws.addRow(sheet.colunas.map((c) => formatarValorExcel(linha[c.key], c.tipo)));
        row.eachCell((cell) => {
          cell.font = { size: 9, color: { argb: TEXT_DARK_ARGB }, name: 'Arial' };
          cell.alignment = { vertical: 'middle', wrapText: false };
          if (isZebra) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ZEBRA_ARGB } };
          }
          applyCellBorder(cell);
        });
      });
    }

    // ── Linha de rodapé ───────────────────────────────────────────────────────
    ws.addRow([]);
    const footerRow = ws.addRow([`Gerado por GestSilo em ${geradoEmSP(config.metadata.geradoEm)}`]);
    const footerCell = footerRow.getCell(1);
    footerCell.font = { italic: true, size: 8, color: { argb: TEXT_MUTED_ARGB }, name: 'Arial' };
    if (numCols > 1) ws.mergeCells(footerRow.number, 1, footerRow.number, numCols);

    // ── Larguras de colunas ───────────────────────────────────────────────────
    ws.columns = sheet.colunas.map((c) => ({ width: c.largura ?? 22 }));

    // ── Logo embutida (centralizada horizontalmente na linha 1) ─────────────
    if (logoBuffer) {
      const imageId = wb.addImage({ buffer: logoBuffer as unknown as ExcelJS.Buffer, extension: 'png' });
      // Ancora na coluna central — flutua com posição absoluta sobre a área mesclada
      const midCol = Math.max(Math.floor(numCols / 2) - 1, 0);
      ws.addImage(imageId, {
        tl: { col: midCol, row: 0 },
        ext: { width: EXCEL_LOGO_WIDTH, height: EXCEL_LOGO_HEIGHT },
        editAs: 'oneCell',
      });
    }

    // ── Freeze nas duas primeiras linhas + cabeçalho de coluna ───────────────
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

    // ── Highlight das colunas de valor (BRL / number / percent) ──────────────
    // Aplica alinhamento e cor apenas nas células de dados (linha 5 em diante)
    // para não sobrescrever o estilo de células especiais (empty state mergeado).
    sheet.colunas.forEach((col, colIdx) => {
      if (col.tipo === 'BRL' || col.tipo === 'number' || col.tipo === 'percent') {
        const dataStartRow = 5;
        const dataEndRow = sheet.linhas.length > 0 ? dataStartRow + sheet.linhas.length - 1 : dataStartRow;
        for (let r = dataStartRow; r <= dataEndRow; r++) {
          const cell = ws.getCell(r, colIdx + 1);
          cell.alignment = { ...(cell.alignment ?? {}), horizontal: 'right' };
          if (!cell.font?.italic) {
            cell.font = { ...(cell.font ?? {}), color: { argb: BRAND_PRIMARY_ARGB } };
          }
        }
      }
    });
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
