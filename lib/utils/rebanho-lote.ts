import type { TipoEventoLote, AnimalParaLote } from '@/lib/types/rebanho-lote';

// Campos obrigatórios por tipo (para contar animais completos)
export function getCamposObrigatorios(tipo: TipoEventoLote): string[] {
  switch (tipo) {
    case 'pesagem':
      return ['peso_kg'];
    case 'diagnostico_prenhez':
      return ['resultado_prenhez'];
    default:
      return [];
  }
}

// Verifica se uma linha tem todos os campos obrigatórios preenchidos
export function linhaValida(
  animalId: string,
  tipo: TipoEventoLote,
  dadosIndividuais: Record<string, Record<string, unknown>>
): boolean {
  const obrigatorios = getCamposObrigatorios(tipo);
  if (obrigatorios.length === 0) return true;
  const dados = dadosIndividuais[animalId] ?? {};
  return obrigatorios.every((campo) => {
    const val = dados[campo];
    return val !== undefined && val !== null && val !== '';
  });
}

// Conta animais com todos os campos obrigatórios preenchidos
export function contarAnimaisCompletos(
  animaisSelecionados: AnimalParaLote[],
  tipo: TipoEventoLote,
  dadosIndividuais: Record<string, Record<string, unknown>>
): number {
  return animaisSelecionados.filter((a) => linhaValida(a.id, tipo, dadosIndividuais)).length;
}

// Aplica valor da linha 0 (primeiro animal) às demais — em memória, retorna novo estado
export function aplicarCascataEmMemoria(
  campo: string,
  animaisSelecionados: AnimalParaLote[],
  dadosIndividuais: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  if (animaisSelecionados.length === 0) return dadosIndividuais;
  const primeiroId = animaisSelecionados[0].id;
  const valor = (dadosIndividuais[primeiroId] ?? {})[campo];
  const novo = { ...dadosIndividuais };
  for (const a of animaisSelecionados.slice(1)) {
    novo[a.id] = { ...(novo[a.id] ?? {}), [campo]: valor };
  }
  return novo;
}

// Filtra lista de animais com base nos critérios da Etapa 2
export interface FiltrosEtapa2 {
  filtroLote?: string;
  filtroCategoria?: string;
  filtroSexo?: string;
  termoBusca?: string;
}

export function filtrarAnimais(
  animais: AnimalParaLote[],
  filtros: FiltrosEtapa2
): AnimalParaLote[] {
  const { filtroLote, filtroCategoria, filtroSexo, termoBusca } = filtros;
  return animais.filter((a) => {
    if (filtroLote && a.lote_id !== filtroLote) return false;
    if (filtroCategoria && a.categoria !== filtroCategoria) return false;
    if (filtroSexo && a.sexo !== filtroSexo) return false;
    if (termoBusca) {
      const t = termoBusca.toLowerCase();
      return a.brinco.toLowerCase().includes(t) || (a.nome ?? '').toLowerCase().includes(t);
    }
    return true;
  });
}

// Seleciona todos os animais filtrados sem duplicar os já selecionados
export function selecionarTodosFiltrados(
  prevSelecionados: AnimalParaLote[],
  animaisFiltrados: AnimalParaLote[]
): AnimalParaLote[] {
  const novoSet = new Set(prevSelecionados.map((a) => a.id));
  const novos = animaisFiltrados.filter((a) => !novoSet.has(a.id));
  return [...prevSelecionados, ...novos];
}
