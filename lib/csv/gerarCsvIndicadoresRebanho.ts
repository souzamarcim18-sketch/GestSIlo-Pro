import type { IndicadorRebanho, TipoExploracao } from '@/types/rebanho-indicadores';

interface CsvExportOptions {
  fazendaNome: string;
  tipoExploracao: TipoExploracao;
  periodo: { dataInicio: Date; dataFim: Date };
  indicadores: IndicadorRebanho;
}

/**
 * Gera CSV nativo com UTF-8 BOM para indicadores de rebanho
 * Separador: ; (Excel BR)
 * Encoding: UTF-8 com BOM
 */
export function gerarCsvIndicadoresRebanho(options: CsvExportOptions): Blob {
  const { fazendaNome, tipoExploracao, periodo, indicadores } = options;

  const dataInicio = periodo.dataInicio.toLocaleDateString('pt-BR');
  const dataFim = periodo.dataFim.toLocaleDateString('pt-BR');

  // BOM para UTF-8
  const utf8Bom = '﻿';

  // Headers e dados
  const linhas: string[] = [];

  // Cabeçalho do relatório
  linhas.push(`Relatório de Indicadores - Rebanho`);
  linhas.push(`Fazenda;${fazendaNome}`);
  linhas.push(`Tipo de Exploração;${tipoExploracao}`);
  linhas.push(`Período;${dataInicio} a ${dataFim}`);
  linhas.push(`Data de Geração;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
  linhas.push('');

  // Tabela de indicadores
  linhas.push('Indicador;Período;Valor;Unidade;Benchmark;Status');

  // Função helper para formatar valor
  function formatarValor(valor: number | null): string {
    if (valor === null) return '-';
    return valor.toFixed(2).replace('.', ',');
  }

  // Função helper para determinar status
  function determinarStatus(
    valor: number | null,
    benchmark?: { min: number; max: number }
  ): string {
    if (valor === null) return 'Sem dados';
    if (!benchmark) return 'OK';
    if (valor >= benchmark.min && valor <= benchmark.max) return '✓ OK';
    if (valor < benchmark.min) return '⚠️ Abaixo';
    return '⚠️ Acima';
  }

  // Função helper para formatar benchmark
  function formatarBenchmark(benchmark?: { min: number; max: number }): string {
    if (!benchmark) return '-';
    return `${benchmark.min}-${benchmark.max}`;
  }

  // Indicadores comuns
  linhas.push(
    `GMD (Ganho de Peso);${dataInicio} a ${dataFim};${formatarValor(indicadores.gmd.valor)};kg/dia;0,8-1,5;${determinarStatus(indicadores.gmd.valor, { min: 0.8, max: 1.5 })}`
  );

  linhas.push(
    `Taxa de Natalidade;${dataInicio} a ${dataFim};${formatarValor(indicadores.taxaNatalidade.valor)};%;80-95;${determinarStatus(indicadores.taxaNatalidade.valor, { min: 80, max: 95 })}`
  );

  linhas.push(
    `Taxa de Mortalidade Geral;${dataInicio} a ${dataFim};${formatarValor(indicadores.taxaMortalidadeGeral.valor)};%;0-5;${determinarStatus(indicadores.taxaMortalidadeGeral.valor, { min: 0, max: 5 })}`
  );

  linhas.push(
    `Taxa de Mortalidade (Bezerros);${dataInicio} a ${dataFim};${formatarValor(indicadores.taxaMortalidadeBezerros.valor)};%;0-8;${determinarStatus(indicadores.taxaMortalidadeBezerros.valor, { min: 0, max: 8 })}`
  );

  linhas.push(
    `Taxa de Descarte;${dataInicio} a ${dataFim};${formatarValor(indicadores.taxaDescarte.valor)};%;10-20;${determinarStatus(indicadores.taxaDescarte.valor, { min: 10, max: 20 })}`
  );

  linhas.push(
    `Taxa de Prenhez;${dataInicio} a ${dataFim};${formatarValor(indicadores.taxaPrenhez.valor)};%;80-95;${determinarStatus(indicadores.taxaPrenhez.valor, { min: 80, max: 95 })}`
  );

  linhas.push(
    `IEP (Intervalo Entre Partos);${dataInicio} a ${dataFim};${formatarValor(indicadores.iep.valor)};dias;380-420;${determinarStatus(indicadores.iep.valor, { min: 380, max: 420 })}`
  );

  linhas.push(
    `IPP (Idade Primeiro Parto);${dataInicio} a ${dataFim};${formatarValor(indicadores.ipp.valor)};meses;22-26;${determinarStatus(indicadores.ipp.valor, { min: 22, max: 26 })}`
  );

  linhas.push(
    `Taxa de Reposição;${dataInicio} a ${dataFim};${formatarValor(indicadores.taxaReposicao.valor)};%;20-30;${determinarStatus(indicadores.taxaReposicao.valor, { min: 20, max: 30 })}`
  );

  // Específicos Corte
  if (indicadores.taxaDesfrute) {
    linhas.push(
      `Taxa de Desfrute;${dataInicio} a ${dataFim};${formatarValor(indicadores.taxaDesfrute.valor)};%;15-25;${determinarStatus(indicadores.taxaDesfrute.valor, { min: 15, max: 25 })}`
    );
  }

  // Específicos Leite
  if (indicadores.percentualVacasLactacao) {
    linhas.push(
      `% Vacas em Lactação;${dataInicio} a ${dataFim};${formatarValor(indicadores.percentualVacasLactacao.valor)};%;70-85;${determinarStatus(indicadores.percentualVacasLactacao.valor, { min: 70, max: 85 })}`
    );
  }

  if (indicadores.periodoSecoMedio) {
    linhas.push(
      `Período Seco Médio;${dataInicio} a ${dataFim};${formatarValor(indicadores.periodoSecoMedio.valor)};dias;45-60;${determinarStatus(indicadores.periodoSecoMedio.valor, { min: 45, max: 60 })}`
    );
  }

  // Peso médio por categoria (se disponível)
  if (indicadores.pesoMedioPorCategoria.valor && Object.keys(indicadores.pesoMedioPorCategoria.valor).length > 0) {
    linhas.push('');
    linhas.push('Peso Médio por Categoria');
    linhas.push('Categoria;Peso Médio (kg)');
    for (const [categoria, peso] of Object.entries(indicadores.pesoMedioPorCategoria.valor)) {
      linhas.push(`${categoria};${formatarValor(peso)}`);
    }
  }

  // Composição do rebanho (se disponível)
  if (indicadores.composicaoRebanho.valor && Object.keys(indicadores.composicaoRebanho.valor).length > 0) {
    linhas.push('');
    linhas.push('Composição do Rebanho');
    linhas.push('Categoria;Percentual (%)');
    for (const [categoria, percentual] of Object.entries(indicadores.composicaoRebanho.valor)) {
      linhas.push(`${categoria};${formatarValor(percentual)}`);
    }
  }

  // Rodapé
  linhas.push('');
  linhas.push('Notas');
  linhas.push(`Gerado por GestSilo em ${new Date().toISOString()}`);
  linhas.push('Relatório confidencial - Propriedade do produtor rural');

  // Juntar com quebra de linha
  const csvContent = utf8Bom + linhas.join('\n');

  // Criar Blob com encoding UTF-8
  return new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
}
