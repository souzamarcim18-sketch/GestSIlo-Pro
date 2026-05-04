export function getDateRangeLast90Days(): { dataInicio: string; dataFim: string } {
  const dataInicio = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dataFim = new Date().toISOString().split('T')[0];
  return { dataInicio, dataFim };
}
