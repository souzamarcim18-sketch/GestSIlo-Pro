import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IndicadorRebanho, TipoExploracao } from '@/types/rebanho-indicadores';

interface PdfExportOptions {
  fazendaNome: string;
  tipoExploracao: TipoExploracao;
  periodo: { dataInicio: Date; dataFim: Date };
  usuarioNome?: string;
  indicadores: IndicadorRebanho;
}

/**
 * Gera PDF dos indicadores de rebanho usando jsPDF + autoTable
 * Segue padrão de gerarPdfPlanejamento.ts
 * Performance: <3s para rebanho 500 animais
 */
export function gerarPdfIndicadoresRebanho(options: PdfExportOptions): void {
  const { fazendaNome, tipoExploracao, periodo, usuarioNome = 'Sistema', indicadores } = options;

  const doc = new jsPDF('p', 'mm', 'A4');
  const corVerde = '#00A651';
  const corTexto = '#1a1a1a';
  const margemEsquerda = 20;
  const larguraPagina = 170;
  let posY = 20;

  // ===== HEADER =====
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(corVerde));
  doc.text('GestSilo Pro — Indicadores Zootécnicos', margemEsquerda, posY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  posY += 8;
  doc.text(`Fazenda: ${fazendaNome}`, margemEsquerda, posY);
  posY += 5;
  doc.text(`Tipo de Exploração: ${tipoExploracao}`, margemEsquerda, posY);
  posY += 5;
  doc.text(
    `Período: ${periodo.dataInicio.toLocaleDateString('pt-BR')} a ${periodo.dataFim.toLocaleDateString('pt-BR')}`,
    margemEsquerda,
    posY
  );
  posY += 5;
  doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, margemEsquerda, posY);
  posY += 10;

  // ===== SEÇÃO INDICADORES PRINCIPAIS =====
  adicionarSecao(doc, 'INDICADORES PRINCIPAIS', corVerde, margemEsquerda, posY);
  posY += 8;

  const indicadoresData: Array<[string, string, string, string]> = [];

  // Comuns
  indicadoresData.push([
    'GMD (Ganho de Peso)',
    formatarValor(indicadores.gmd.valor),
    'kg/dia',
    determinarStatusShort(indicadores.gmd.valor, { min: 0.8, max: 1.5 }),
  ]);

  indicadoresData.push([
    'Taxa de Natalidade',
    formatarValor(indicadores.taxaNatalidade.valor),
    '%',
    determinarStatusShort(indicadores.taxaNatalidade.valor, { min: 80, max: 95 }),
  ]);

  indicadoresData.push([
    'Taxa de Mortalidade Geral',
    formatarValor(indicadores.taxaMortalidadeGeral.valor),
    '%',
    determinarStatusShort(indicadores.taxaMortalidadeGeral.valor, { min: 0, max: 5 }),
  ]);

  indicadoresData.push([
    'Taxa de Mortalidade (Bezerros)',
    formatarValor(indicadores.taxaMortalidadeBezerros.valor),
    '%',
    determinarStatusShort(indicadores.taxaMortalidadeBezerros.valor, { min: 0, max: 8 }),
  ]);

  indicadoresData.push([
    'Taxa de Descarte',
    formatarValor(indicadores.taxaDescarte.valor),
    '%',
    determinarStatusShort(indicadores.taxaDescarte.valor, { min: 10, max: 20 }),
  ]);

  indicadoresData.push([
    'Taxa de Prenhez',
    formatarValor(indicadores.taxaPrenhez.valor),
    '%',
    determinarStatusShort(indicadores.taxaPrenhez.valor, { min: 80, max: 95 }),
  ]);

  indicadoresData.push([
    'IEP (Int. Entre Partos)',
    formatarValor(indicadores.iep.valor),
    'dias',
    determinarStatusShort(indicadores.iep.valor, { min: 380, max: 420 }),
  ]);

  indicadoresData.push([
    'IPP (Idade 1º Parto)',
    formatarValor(indicadores.ipp.valor),
    'meses',
    determinarStatusShort(indicadores.ipp.valor, { min: 22, max: 26 }),
  ]);

  indicadoresData.push([
    'Taxa de Reposição',
    formatarValor(indicadores.taxaReposicao.valor),
    '%',
    determinarStatusShort(indicadores.taxaReposicao.valor, { min: 20, max: 30 }),
  ]);

  // Específicos Corte
  if (indicadores.taxaDesfrute) {
    indicadoresData.push([
      'Taxa de Desfrute',
      formatarValor(indicadores.taxaDesfrute.valor),
      '%',
      determinarStatusShort(indicadores.taxaDesfrute.valor, { min: 15, max: 25 }),
    ]);
  }

  // Específicos Leite
  if (indicadores.percentualVacasLactacao) {
    indicadoresData.push([
      '% Vacas em Lactação',
      formatarValor(indicadores.percentualVacasLactacao.valor),
      '%',
      determinarStatusShort(indicadores.percentualVacasLactacao.valor, { min: 70, max: 85 }),
    ]);
  }

  if (indicadores.periodoSecoMedio) {
    indicadoresData.push([
      'Período Seco Médio',
      formatarValor(indicadores.periodoSecoMedio.valor),
      'dias',
      determinarStatusShort(indicadores.periodoSecoMedio.valor, { min: 45, max: 60 }),
    ]);
  }

  autoTable(doc, {
    startY: posY,
    margin: { left: margemEsquerda, right: margemEsquerda },
    head: [['Indicador', 'Valor', 'Unidade', 'Status']],
    body: indicadoresData,
    theme: 'grid',
    headStyles: {
      fillColor: hexToRgb(corVerde),
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
  });

  posY = (doc as any).lastAutoTable.finalY + 10;

  // ===== SEÇÃO COMPOSIÇÃO DO REBANHO =====
  if (indicadores.composicaoRebanho.valor && Object.keys(indicadores.composicaoRebanho.valor).length > 0) {
    if (posY > 200) {
      doc.addPage();
      posY = 20;
    }

    adicionarSecao(doc, 'COMPOSIÇÃO DO REBANHO', corVerde, margemEsquerda, posY);
    posY += 8;

    const composicaoData = Object.entries(indicadores.composicaoRebanho.valor)
      .filter(([, pct]) => pct > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, pct]) => [categoria, `${formatarValor(pct)}%`]);

    if (composicaoData.length > 0) {
      autoTable(doc, {
        startY: posY,
        margin: { left: margemEsquerda, right: margemEsquerda },
        head: [['Categoria', 'Percentual']],
        body: composicaoData,
        theme: 'grid',
        headStyles: {
          fillColor: hexToRgb(corVerde),
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' },
        },
      });

      posY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ===== SEÇÃO PESO MÉDIO POR CATEGORIA =====
  if (indicadores.pesoMedioPorCategoria.valor && Object.keys(indicadores.pesoMedioPorCategoria.valor).length > 0) {
    if (posY > 200) {
      doc.addPage();
      posY = 20;
    }

    adicionarSecao(doc, 'PESO MÉDIO POR CATEGORIA', corVerde, margemEsquerda, posY);
    posY += 8;

    const pesoData = Object.entries(indicadores.pesoMedioPorCategoria.valor)
      .filter(([, peso]) => peso > 0)
      .map(([categoria, peso]) => [categoria, `${formatarValor(peso)} kg`]);

    if (pesoData.length > 0) {
      autoTable(doc, {
        startY: posY,
        margin: { left: margemEsquerda, right: margemEsquerda },
        head: [['Categoria', 'Peso Médio']],
        body: pesoData,
        theme: 'grid',
        headStyles: {
          fillColor: hexToRgb(corVerde),
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' },
        },
      });

      posY = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ===== FOOTER =====
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const totalPaginas = (doc as any).internal.pages.length - 1;
  doc.text(
    `Gerado por GestSilo Pro — Página 1 de ${totalPaginas} — Usuário: ${usuarioNome}`,
    margemEsquerda,
    doc.internal.pageSize.getHeight() - 10
  );

  // Salvar PDF
  const nomearquivo = `indicadores-${fazendaNome.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nomearquivo);
}

/**
 * Adiciona uma seção com título e linha horizontal
 */
function adicionarSecao(
  doc: jsPDF,
  titulo: string,
  cor: string,
  x: number,
  y: number
): void {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(cor));
  doc.text(titulo, x, y);

  // Linha
  doc.setDrawColor(...hexToRgb(cor));
  doc.setLineWidth(0.5);
  doc.line(x, y + 2, x + 150, y + 2);

  doc.setTextColor(0, 0, 0);
}

/**
 * Converte hex para RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const resultado = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!resultado) {
    return [0, 166, 81]; // Verde padrão
  }
  return [
    parseInt(resultado[1], 16),
    parseInt(resultado[2], 16),
    parseInt(resultado[3], 16),
  ];
}

/**
 * Formata valor com 2 casas decimais e , como separador decimal
 */
function formatarValor(valor: number | null): string {
  if (valor === null || valor === undefined) return '-';
  return valor.toFixed(2).replace('.', ',');
}

/**
 * Determina status curto (OK, ⚠️, etc)
 */
function determinarStatusShort(valor: number | null, benchmark?: { min: number; max: number }): string {
  if (valor === null || valor === undefined) return '—';
  if (!benchmark) return 'OK';
  if (valor >= benchmark.min && valor <= benchmark.max) return '✓';
  if (valor < benchmark.min) return '↓';
  return '↑';
}
