import jsPDF from 'jspdf';
import { CalagemResult, NPKResult, CalagemInput, NPKInput } from '@/lib/calculadoras';

export interface PDFOptions {
  nomeProdutor?: string;
  nomeFazenda?: string;
  localidade?: string;
  dataAnalise?: Date;
  responsavelTecnico?: string;
}

/**
 * Exportar laudo de calagem em PDF
 */
export function exportarLaudoCalagem(
  input: CalagemInput,
  resultado: CalagemResult,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPos = margin;

  // --- HEADER ---
  doc.setFontSize(18);
  doc.text('LAUDO TÉCNICO DE CALAGEM', margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text(`GestSilo Pro`, margin, yPos);
  yPos += 6;
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPos);
  yPos += 8;
  if (options.responsavelTecnico) {
    doc.text(`Responsável Técnico: ${options.responsavelTecnico}`, margin, yPos);
    yPos += 8;
  }

  yPos += 5;

  // Linha separadora
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // --- INFORMAÇÕES DA PROPRIEDADE ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('INFORMAÇÕES DA PROPRIEDADE', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  const propriedadeLines = [
    ['Produtor:', options.nomeProdutor || '___________________'],
    ['Fazenda:', options.nomeFazenda || '___________________'],
    ['Localidade:', options.localidade || '___________________'],
    ['Área do Talhão:', `${parseFloat(input.area)} ha`],
  ];

  propriedadeLines.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, margin + 50, yPos);
    yPos += 8;
  });

  yPos += 5;

  // --- DADOS DA ANÁLISE ---
  doc.setFontSize(12);
  doc.text('DADOS DA ANÁLISE', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`Método: ${nomeMetodo(resultado.metodo)}`, margin, yPos);
  yPos += 8;

  const prnt = parseFloat(input.prnt);
  doc.text(`PRNT do Calcário: ${prnt.toFixed(1)}%`, margin, yPos);
  yPos += 8;

  // Parâmetros específicos do método
  const paramLines = obterParametrosPorMetodo(input, resultado);
  paramLines.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, margin + 60, yPos);
    yPos += 7;
  });

  yPos += 8;

  // --- RESULTADO ---
  doc.setFontSize(12);
  doc.text('RESULTADO', margin, yPos);
  yPos += 10;

  // Caixa destacada para o resultado
  doc.setFillColor(240, 248, 245); // Verde claro
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 20, 'F');

  doc.setFontSize(14);
  doc.setTextColor(0, 166, 81); // Verde GestSilo
  doc.text(`Necessidade de Calagem: ${resultado.nc.toFixed(2)} t/ha`, margin + 5, yPos + 5);
  yPos += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Total para a Área: ${resultado.total.toFixed(1)} toneladas`, margin + 5, yPos + 5);
  yPos += 15;

  // --- RECOMENDAÇÕES ---
  doc.setFontSize(12);
  doc.text('RECOMENDAÇÕES TÉCNICAS', margin, yPos);
  yPos += 10;

  doc.setFontSize(9);
  const recomendacoes = gerarRecomendacoesCalagem(resultado);
  recomendacoes.forEach(rec => {
    const lines = doc.splitTextToSize(rec, pageWidth - 2 * margin - 5);
    doc.text(lines, margin + 3, yPos);
    yPos += lines.length * 4 + 2;
  });

  yPos += 5;

  // --- DISCLAIMER ---
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const disclaimer = 'Disclaimer: Estas recomendações são indicativas e baseadas em fórmulas técnicas. Consulte um agrônomo qualificado para validar e implementar adequadamente.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
  doc.text(disclaimerLines, margin, yPos);

  // --- RODAPÉ ---
  yPos = pageHeight - 30;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;
  doc.text('Gerado por GestSilo Pro - Plataforma de Gestão Agrícola', margin, yPos);
  yPos += 5;
  doc.text(`Responsabilidade: Recomendações indicativas. Consulte agrônomo para implementação.`, margin, yPos);

  // --- ASSINATURA ---
  yPos = pageHeight - 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('Assinatura do Responsável Técnico:', margin, yPos);
  doc.line(margin + 50, yPos + 2, margin + 130, yPos + 2);

  doc.save(`laudo_calagem_${new Date().getTime()}.pdf`);
}

/**
 * Exportar relatório de otimização NPK
 */
export function exportarRelatorioNPK(
  input: NPKInput,
  resultado: NPKResult,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPos = margin;

  // --- HEADER ---
  doc.setFontSize(18);
  doc.text('RECOMENDAÇÃO DE ADUBAÇÃO NPK', margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text('GestSilo Pro', margin, yPos);
  yPos += 6;
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPos);
  yPos += 8;

  yPos += 5;

  // Linha separadora
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // --- NECESSIDADE ---
  doc.setFontSize(12);
  doc.text('NECESSIDADE DE NUTRIENTES', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  const nNec = parseFloat(input.n_nec);
  const pNec = parseFloat(input.p_nec);
  const kNec = parseFloat(input.k_nec);
  const area = parseFloat(input.area);

  doc.text(`N: ${nNec.toFixed(0)} kg/ha`, margin, yPos);
  yPos += 7;
  doc.text(`P₂O₅: ${pNec.toFixed(0)} kg/ha`, margin, yPos);
  yPos += 7;
  doc.text(`K₂O: ${kNec.toFixed(0)} kg/ha`, margin, yPos);
  yPos += 7;
  doc.text(`Área: ${area.toFixed(2)} ha`, margin, yPos);
  yPos += 10;

  // --- RESULTADO / OPÇÕES ---
  if (resultado.modo === 'simples') {
    doc.setFontSize(12);
    doc.text('RECOMENDAÇÃO SIMPLES', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 166, 81);
    doc.text(`${resultado.fertNome}: ${resultado.dosePorHa.toFixed(0)} kg/ha`, margin, yPos);
    yPos += 8;

    doc.setTextColor(0, 0, 0);
    doc.text(`Total para a Área: ${resultado.total.toFixed(2)} t`, margin, yPos);
    yPos += 15;
  } else if (resultado.top5 && resultado.top5.length > 0) {
    doc.setFontSize(12);
    doc.text('TOP 5 OPÇÕES OTIMIZADAS (por custo)', margin, yPos);
    yPos += 10;

    doc.setFontSize(8);
    resultado.top5.forEach((opcao, idx) => {
      // Número da opção
      doc.setTextColor(0, 166, 81);
      doc.text(`${idx + 1}. ${opcao.fertilizantes.map(f => f.fertilizante.nome).join(' + ')}`, margin, yPos);
      yPos += 6;

      // Doses
      doc.setTextColor(0, 0, 0);
      opcao.fertilizantes.forEach(f => {
        const doseStr = `${f.fertilizante.nome}: ${f.dose_kg_ha.toFixed(0)} kg/ha (${f.sacos_por_ha} sacos/ha)`;
        doc.text(doseStr, margin + 5, yPos);
        yPos += 5;
      });

      // Custo
      const totalSacos = opcao.fertilizantes.reduce((acc, f) => acc + f.total_sacos, 0);
      const custoTotalArea = opcao.custoTotal_r_ha * area;
      doc.text(`Custo: R$ ${opcao.custoTotal_r_ha.toFixed(2)}/ha | Total: R$ ${custoTotalArea.toFixed(2)} (${totalSacos} sacos)`, margin + 5, yPos);
      yPos += 6;

      // Nutrientes fornecidos
      const nutriStr = `N: ${opcao.nutrientes_fornecidos.n.toFixed(0)} kg/ha | P: ${opcao.nutrientes_fornecidos.p.toFixed(0)} kg/ha | K: ${opcao.nutrientes_fornecidos.k.toFixed(0)} kg/ha`;
      doc.text(nutriStr, margin + 5, yPos);
      yPos += 6;

      yPos += 3;

      // Se espaço está acabando, criar nova página
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
    });
  }

  yPos += 5;

  // --- DISCLAIMER ---
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const disclaimer = 'Disclaimer: Estas recomendações são indicativas e baseadas em otimização matemática. Consulte um agrônomo qualificado para validar e implementar adequadamente.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
  doc.text(disclaimerLines, margin, yPos);

  // --- RODAPÉ ---
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Gerado por GestSilo Pro - Plataforma de Gestão Agrícola', margin, yPos);

  doc.save(`recomendacao_npk_${new Date().getTime()}.pdf`);
}

// ========== FUNÇÕES AUXILIARES ==========

function nomeMetodo(metodo: string): string {
  const nomes: Record<string, string> = {
    saturacao: 'Saturação por Bases (V%)',
    al_ca_mg: 'Neutralização de Alumínio + Ca/Mg',
    mg_manual: 'Método Minas Gerais Manual',
    smp: 'Índice SMP',
    ufla: 'Teor de Cálcio Desejado (UFLA)',
  };
  return nomes[metodo] || metodo;
}

function obterParametrosPorMetodo(input: CalagemInput, resultado: CalagemResult): [string, string][] {
  const params: [string, string][] = [];

  if (resultado.metodo === 'saturacao') {
    params.push(['V% Atual (V1):', parseFloat(input.v1 || '0').toFixed(1) + '%']);
    params.push(['V% Desejado (V2):', parseFloat(input.v2 || '0').toFixed(1) + '%']);
    params.push(['CTC(T):', parseFloat(input.ctc || '0').toFixed(2) + ' cmolc/dm³']);
  } else if (resultado.metodo === 'al_ca_mg' || resultado.metodo === 'mg_manual') {
    params.push(['Al³⁺:', parseFloat(input.al || '0').toFixed(2) + ' cmolc/dm³']);
    params.push(['Ca²⁺:', parseFloat(input.ca || '0').toFixed(2) + ' cmolc/dm³']);
    params.push(['Mg²⁺:', parseFloat(input.mg || '0').toFixed(2) + ' cmolc/dm³']);
  } else if (resultado.metodo === 'smp') {
    params.push(['pH SMP:', parseFloat(input.ph_smp || '0').toFixed(1)]);
    params.push(['Textura:', input.textura || '-']);
  } else if (resultado.metodo === 'ufla') {
    params.push(['Ca² Atual:', parseFloat(input.ca || '0').toFixed(2) + ' cmolc/dm³']);
    params.push(['Cultura:', input.cultura || '-']);
  }

  return params;
}

function gerarRecomendacoesCalagem(resultado: CalagemResult): string[] {
  const recomendacoes: string[] = [];

  recomendacoes.push(`• Aplicar ${resultado.nc.toFixed(2)} t/ha de calcário com PRNT adequado.`);

  if (resultado.nc > 3) {
    recomendacoes.push('• Incorporar em profundidade (30-40 cm) para corrigir todo o perfil do solo.');
  }

  if (resultado.nc > 5) {
    recomendacoes.push('• Para NC > 5 t/ha, considere parcelar a aplicação em 2 safras para melhor aproveitamento.');
  }

  recomendacoes.push('• Realizar a calagem pelo menos 60-90 dias antes do plantio para permitir a reação do calcário.');
  recomendacoes.push('• Manter umidade adequada no solo para acelerar a reação do calcário.');

  return recomendacoes;
}
