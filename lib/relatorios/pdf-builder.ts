import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/utils';
import type { ColunaTipo, ExcelMetadata } from './excel-builder';
import {
  FONT_FAMILY,
  PDF_MARGIN,
  PDF_HEADER_HEIGHT,
  PDF_HEADER_ACCENT_H,
  PDF_LOGO_HEIGHT,
  PDF_LOGO_WIDTH,
  PDF_FIRST_CONTENT_Y,
  TABLE_HEADER_FILL_RGB,
  TABLE_HEADER_TEXT_RGB,
  ROW_ZEBRA_RGB,
  TEXT_DARK_HEX,
  TEXT_MUTED_HEX,
  SECTION_TITLE_HEX,
  REPORT_HEADER_FILL_RGB,
  REPORT_HEADER_ACCENT_RGB,
  REPORT_HEADER_TEXT_HEX,
  REPORT_HEADER_SUBTEXT_HEX,
} from '@/lib/branding/tokens';

export interface PdfColunaConfig {
  key: string;
  label: string;
  tipo?: ColunaTipo;
  largura?: number;
}

export interface PdfSecaoConfig {
  titulo: string;
  colunas: PdfColunaConfig[];
  linhas: Record<string, unknown>[];
}

export interface PdfReportConfig {
  fileName: string;
  titulo: string;
  secoes: PdfSecaoConfig[];
  metadata: ExcelMetadata;
  orientacao?: 'portrait' | 'landscape';
  /** Base64 da logo PNG. Quando omitido, o builder tenta carregar public/logo_verde.png via fs. */
  logoBase64?: string;
}

function formatarValorPdf(value: unknown, tipo: ColunaTipo = 'text'): string {
  if (value === null || value === undefined || value === '') return '—';
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

/** Tenta carregar a logo como base64 via fs (Node.js). Retorna undefined em browser. */
function carregarLogoBase64(): string | undefined {
  if (typeof window !== 'undefined') return undefined;
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const logoPath = path.join(process.cwd(), 'public', 'logo_verde.png');
    return fs.readFileSync(logoPath).toString('base64');
  } catch {
    return undefined;
  }
}

/** Desenha a faixa de cabeçalho (fundo branco + borda verde, logo, título e metadados) em toda página. */
function desenharCabecalho(
  doc: jsPDF,
  config: PdfReportConfig,
  logoBase64: string | undefined
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const gerado = geradoEmSP(config.metadata.geradoEm);

  // Fundo branco da faixa
  doc.setFillColor(...REPORT_HEADER_FILL_RGB);
  doc.rect(0, 0, pageW, PDF_HEADER_HEIGHT, 'F');

  // Borda inferior verde de marca
  doc.setFillColor(...REPORT_HEADER_ACCENT_RGB);
  doc.rect(0, PDF_HEADER_HEIGHT - PDF_HEADER_ACCENT_H, pageW, PDF_HEADER_ACCENT_H, 'F');

  // Logo (canto esquerdo, verticalmente centralizada)
  const logoX = PDF_MARGIN;
  const logoY = (PDF_HEADER_HEIGHT - PDF_LOGO_HEIGHT) / 2 - 1;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', logoX, logoY, PDF_LOGO_WIDTH, PDF_LOGO_HEIGHT);
    } catch {
      doc.setFont(FONT_FAMILY, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(REPORT_HEADER_TEXT_HEX);
      doc.text('GestSilo', logoX, PDF_HEADER_HEIGHT / 2 + 2);
    }
  } else {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(REPORT_HEADER_TEXT_HEX);
    doc.text('GestSilo', logoX, PDF_HEADER_HEIGHT / 2 + 2);
  }

  // Título do relatório (à direita da logo, alinhado ao centro da faixa)
  const titleX = logoX + PDF_LOGO_WIDTH + 8;
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(REPORT_HEADER_TEXT_HEX);
  doc.text(config.titulo, titleX, 14);

  // Nome da fazenda (abaixo do título)
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(`Fazenda: ${config.metadata.fazendaNome}`, titleX, 22);

  // Período / data geração (canto direito)
  const rightX = pageW - PDF_MARGIN;
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);

  if (config.metadata.periodo) {
    const from = format(config.metadata.periodo.from, 'dd/MM/yyyy', { locale: ptBR });
    const to = format(config.metadata.periodo.to, 'dd/MM/yyyy', { locale: ptBR });
    doc.text(`Período: ${from} – ${to}`, rightX, 14, { align: 'right' });
    doc.text(`Gerado em: ${gerado}`, rightX, 21, { align: 'right' });
  } else {
    doc.text(`Gerado em: ${gerado}`, rightX, 17, { align: 'right' });
  }
}

export function gerarPdf(config: PdfReportConfig): void {
  const orientacao = config.orientacao ?? 'portrait';
  const doc = new jsPDF(orientacao === 'landscape' ? 'l' : 'p', 'mm', 'A4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const larguraPagina = orientacao === 'landscape' ? 267 : 182;

  const logoBase64 = config.logoBase64 ?? carregarLogoBase64();

  // Cabeçalho da primeira página
  desenharCabecalho(doc, config, logoBase64);

  let posY = PDF_FIRST_CONTENT_Y;

  // ── Seções ──────────────────────────────────────────────────────────────────
  for (const secao of config.secoes) {
    // Título da seção (quando há mais de uma)
    if (config.secoes.length > 1) {
      // Quebra de página proativa se não couber o título + pelo menos 2 linhas
      if (posY > pageH - 40) {
        doc.addPage();
        desenharCabecalho(doc, config, logoBase64);
        posY = PDF_FIRST_CONTENT_Y;
      }
      doc.setFont(FONT_FAMILY, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(SECTION_TITLE_HEX);
      doc.text(secao.titulo, PDF_MARGIN, posY);
      posY += 6;
    }

    if (secao.linhas.length === 0) {
      doc.setFont(FONT_FAMILY, 'italic');
      doc.setFontSize(9);
      doc.setTextColor(TEXT_MUTED_HEX);
      doc.text('Nenhum registro encontrado no período selecionado.', PDF_MARGIN, posY);
      posY += 10;
      continue;
    }

    const head = [secao.colunas.map((c) => c.label)];
    const body = secao.linhas.map((linha) =>
      secao.colunas.map((c) => formatarValorPdf(linha[c.key], c.tipo))
    );

    // Larguras relativas em mm
    const colWidths = secao.colunas.map((c) => {
      const pct = c.largura ?? 100 / secao.colunas.length;
      return (pct / 100) * larguraPagina;
    });

    autoTable(doc, {
      startY: posY,
      head,
      body,
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
      columnStyles: Object.fromEntries(colWidths.map((w, i) => [i, { cellWidth: w }])),
      headStyles: {
        fillColor: TABLE_HEADER_FILL_RGB,
        textColor: TABLE_HEADER_TEXT_RGB,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [17, 17, 17] as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: ROW_ZEBRA_RGB,
      },
      didDrawPage: (data) => {
        // Cabeçalho em cada página nova
        if (data.pageNumber > 1) {
          desenharCabecalho(doc, config, logoBase64);
        }

        // Rodapé em cada página
        const totalPages = (
          doc as unknown as { internal: { getNumberOfPages: () => number } }
        ).internal.getNumberOfPages();
        doc.setFont(FONT_FAMILY, 'italic');
        doc.setFontSize(7);
        doc.setTextColor(TEXT_MUTED_HEX);
        doc.text(
          `Gerado por GestSilo — Página ${data.pageNumber} de ${totalPages}`,
          pageW / 2,
          pageH - 6,
          { align: 'center' }
        );
        doc.setTextColor(TEXT_DARK_HEX);
      },
    });

    posY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  doc.save(config.fileName);
}
