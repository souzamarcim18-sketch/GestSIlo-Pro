/**
 * GET /api/export/preview-pdf
 *
 * Gera um PDF de exemplo com dados fictícios aplicando o novo padrão GestSilo.
 * Usado exclusivamente para validação visual — não expor em produção sem proteção.
 */
import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readFileSync } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

// ── Dados fictícios ─────────────────────────────────────────────────────────
const FAZENDA = 'Fazenda Boa Vista (EXEMPLO)';
const TITULO = 'Relatório de Indicadores Zootécnicos';

const FINANCEIRO = [
  { descricao: 'Venda de silagem — Lote A', tipo: 'Receita', valor: 'R$ 12.500,00', data: '15/05/2026' },
  { descricao: 'Compra de insumos NPK', tipo: 'Despesa', valor: 'R$ 4.320,00', data: '10/05/2026' },
  { descricao: 'Mão de obra — Trato rebanho', tipo: 'Despesa', valor: 'R$ 2.800,00', data: '08/05/2026' },
  { descricao: 'Venda de grãos — Milho', tipo: 'Receita', valor: 'R$ 31.000,00', data: '02/05/2026' },
  { descricao: 'Combustível — Frota', tipo: 'Despesa', valor: 'R$ 1.950,00', data: '28/04/2026' },
  { descricao: 'Venda de animais — Novilhos', tipo: 'Receita', valor: 'R$ 18.750,00', data: '20/04/2026' },
  { descricao: 'Adubação — Talhão 3', tipo: 'Despesa', valor: 'R$ 6.100,00', data: '15/04/2026' },
];

const REBANHO = [
  { categoria: 'Vacas em Lactação', cabecas: '42', gmd: '—', peso_medio: '540 kg', ua: '50,4' },
  { categoria: 'Vacas Secas', cabecas: '8', gmd: '—', peso_medio: '520 kg', ua: '9,2' },
  { categoria: 'Novilhas', cabecas: '15', gmd: '0,650 kg/d', peso_medio: '310 kg', ua: '10,3' },
  { categoria: 'Bezerros', cabecas: '12', gmd: '0,450 kg/d', peso_medio: '85 kg', ua: '2,3' },
  { categoria: 'Touros', cabecas: '2', gmd: '—', peso_medio: '820 kg', ua: '3,6' },
];

// ── Helper: cabeçalho ───────────────────────────────────────────────────────
function desenharCabecalho(
  doc: jsPDF,
  logoBase64: string | undefined,
  titulo: string,
  fazendaNome: string,
  periodo: string,
  geradoEm: string
): void {
  const pageW = doc.internal.pageSize.getWidth();

  // Fundo branco
  doc.setFillColor(...REPORT_HEADER_FILL_RGB);
  doc.rect(0, 0, pageW, PDF_HEADER_HEIGHT, 'F');

  // Borda inferior verde
  doc.setFillColor(...REPORT_HEADER_ACCENT_RGB);
  doc.rect(0, PDF_HEADER_HEIGHT - PDF_HEADER_ACCENT_H, pageW, PDF_HEADER_ACCENT_H, 'F');

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

  const titleX = logoX + PDF_LOGO_WIDTH + 8;
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(REPORT_HEADER_TEXT_HEX);
  doc.text(titulo, titleX, 14);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(`Fazenda: ${fazendaNome}`, titleX, 22);

  const rightX = pageW - PDF_MARGIN;
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(periodo, rightX, 14, { align: 'right' });
  doc.text(`Gerado em: ${geradoEm}`, rightX, 21, { align: 'right' });
}

export async function GET(): Promise<NextResponse> {
  // Carrega logo
  let logoBase64: string | undefined;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo_verde.png');
    logoBase64 = readFileSync(logoPath).toString('base64');
  } catch {
    // sem logo
  }

  const agora = new Date();
  const geradoEm = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const periodo = `Período: 01/04/2026 – 31/05/2026`;

  const doc = new jsPDF('p', 'mm', 'A4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  desenharCabecalho(doc, logoBase64, TITULO, FAZENDA, periodo, geradoEm);

  let posY = PDF_FIRST_CONTENT_Y;

  const renderSecao = (
    titulo: string,
    colunas: string[],
    linhas: string[][]
  ): void => {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(SECTION_TITLE_HEX);
    doc.text(titulo, PDF_MARGIN, posY);
    posY += 6;

    autoTable(doc, {
      startY: posY,
      head: [colunas],
      body: linhas,
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
      headStyles: {
        fillColor: TABLE_HEADER_FILL_RGB,
        textColor: TABLE_HEADER_TEXT_RGB,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [17, 17, 17] as [number, number, number],
      },
      alternateRowStyles: { fillColor: ROW_ZEBRA_RGB },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          desenharCabecalho(doc, logoBase64, TITULO, FAZENDA, periodo, geradoEm);
        }
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
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  };

  // Seção 1: Financeiro
  renderSecao(
    'MOVIMENTAÇÕES FINANCEIRAS',
    ['Descrição', 'Tipo', 'Valor', 'Data'],
    FINANCEIRO.map((r) => [r.descricao, r.tipo, r.valor, r.data])
  );

  // Seção 2: Rebanho
  renderSecao(
    'COMPOSIÇÃO DO REBANHO',
    ['Categoria', 'Cabeças', 'GMD', 'Peso Médio', 'UA Total'],
    REBANHO.map((r) => [r.categoria, r.cabecas, r.gmd, r.peso_medio, r.ua])
  );

  // Nota de rodapé extra (demonstração de texto livre)
  if (posY < pageH - 30) {
    doc.setFont(FONT_FAMILY, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED_HEX);
    const nota = `* Documento de exemplo gerado em ${format(agora, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} para validação visual do padrão GestSilo. Todos os dados são fictícios.`;
    doc.text(nota, PDF_MARGIN, posY, { maxWidth: pageW - PDF_MARGIN * 2 });
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="gestsilo-preview.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
