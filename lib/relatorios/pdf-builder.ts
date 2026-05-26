import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/utils';
import type { ColunaTipo, ExcelMetadata } from './excel-builder';

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

export function gerarPdf(config: PdfReportConfig): void {
  const orientacao = config.orientacao ?? 'portrait';
  const doc = new jsPDF(orientacao === 'landscape' ? 'l' : 'p', 'mm', 'A4');

  const corPrincipal = '#00A651';
  const corFundoHeader = '#161616';
  const margemEsq = 14;
  const larguraPagina = orientacao === 'landscape' ? 267 : 182;
  let posY = 14;

  // ── Cabeçalho ─────────────────────────────────────────────────────────────
  doc.setFillColor(corFundoHeader);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor('#00A651');
  doc.text('GestSilo', margemEsq, 12);

  doc.setFontSize(11);
  doc.setTextColor('#ffffff');
  doc.text(config.titulo, margemEsq, 21);

  // Fazenda + período no canto direito
  const gerado = format(config.metadata.geradoEm, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  const infoLines = [
    `Fazenda: ${config.metadata.fazendaNome}`,
    config.metadata.periodo
      ? `Período: ${format(config.metadata.periodo.from, 'dd/MM/yyyy', { locale: ptBR })} – ${format(config.metadata.periodo.to, 'dd/MM/yyyy', { locale: ptBR })}`
      : `Gerado em: ${gerado}`,
  ];
  doc.setFontSize(8);
  doc.setTextColor('#cccccc');
  const pageW = doc.internal.pageSize.getWidth();
  infoLines.forEach((line, i) => {
    doc.text(line, pageW - margemEsq, 10 + i * 6, { align: 'right' });
  });
  if (config.metadata.periodo) {
    doc.text(`Gerado em: ${gerado}`, pageW - margemEsq, 22, { align: 'right' });
  }

  posY = 34;

  // ── Seções ─────────────────────────────────────────────────────────────────
  for (const secao of config.secoes) {
    // Título da seção
    if (config.secoes.length > 1) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(corPrincipal);
      doc.text(secao.titulo, margemEsq, posY);
      posY += 6;
    }

    if (secao.linhas.length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor('#888888');
      doc.text('Nenhum registro encontrado no período selecionado.', margemEsq, posY);
      posY += 10;
      continue;
    }

    const head = [secao.colunas.map((c) => c.label)];
    const body = secao.linhas.map((linha) =>
      secao.colunas.map((c) => formatarValorPdf(linha[c.key], c.tipo))
    );

    // Larguras relativas em mm
    const totalLargura = larguraPagina;
    const colWidths = secao.colunas.map((c) => {
      const pct = (c.largura ?? (100 / secao.colunas.length));
      return (pct / 100) * totalLargura;
    });

    autoTable(doc, {
      startY: posY,
      head,
      body,
      margin: { left: margemEsq, right: margemEsq },
      columnStyles: Object.fromEntries(colWidths.map((w, i) => [i, { cellWidth: w }])),
      headStyles: {
        fillColor: [22, 22, 22],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: (data) => {
        // Rodapé em cada página
        const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor('#999999');
        const pageH = doc.internal.pageSize.getHeight();
        doc.text(
          `Gerado por GestSilo — Página ${data.pageNumber} de ${pageCount}`,
          pageW / 2,
          pageH - 6,
          { align: 'center' }
        );
      },
    });

    posY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  doc.save(config.fileName);
}
