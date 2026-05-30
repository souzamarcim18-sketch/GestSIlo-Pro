/**
 * Tipos TypeScript para o módulo de Rebanho — Fase 4: Indicadores Zootécnicos
 * Baseado em: SPEC-rebanho.md Seção 3 (2026-05-05)
 * Dependência: types/rebanho.ts (Lote)
 */

import type { Lote } from '@/lib/types/rebanho';

// ========== ENUMS & TIPOS BASE ==========

/**
 * Tipo de Exploração da Fazenda
 * Define quais indicadores zootécnicos são exibidos no dashboard
 */
export type TipoExploracao = 'CORTE' | 'LEITE' | 'MISTO';

/**
 * Períodos Preset para Filtros de Indicadores
 */
export type PeriodoPreset = '30d' | '90d' | '365d' | 'safra' | 'custom';

/**
 * Estados do Card Indicador (renderização e feedback)
 */
export type EstadoCard = 'LOADING' | 'OK' | 'INSUFFICIENT_DATA' | 'ERROR';

/**
 * Trend de Evolução do Indicador
 */
export type Trend = 'up' | 'down' | 'stable';

// ========== RESULTADO GENÉRICO DE CÁLCULO ==========

/**
 * Resultado padrão para qualquer cálculo de indicador
 * Inclui valor, estado, erro, timestamp e trend comparativo
 */
export interface ResultadoIndicador<T> {
  valor: T | null;
  estado: EstadoCard;
  erro?: string;
  atualizadoEm?: Date;
  trend?: Trend;
  trendValor?: number;
}

// ========== FILTROS ==========

/**
 * Filtros para cálculo de indicadores
 * Suporta períodos preset e custom, multi-lote, multi-categoria
 */
export interface FiltrosIndicadores {
  periodo: PeriodoPreset;
  dataInicio?: Date | string;     // Obrigatório se periodo = 'custom'
  dataFim?: Date | string;        // Obrigatório se periodo = 'custom'
  lotes?: string[];      // Array de lote_id (multi-select)
  categorias?: string[]; // Array de categorias (Bezerra, Vaca, etc.)
  fazendaId?: string;    // UUID da fazenda (se multi-fazenda)
}

// ========== INDICADORES (RESULTADOS AGREGADOS) ==========

/**
 * Conjunto completo de indicadores zootécnicos
 * Inclui 14 indicadores comuns + específicos (Corte/Leite)
 *
 * Indicadores opcionais:
 * - taxaDesfrute: apenas se tipo_exploracao IN ('CORTE', 'MISTO')
 * - percentualVacasLactacao, periodoSecoMedio: apenas se tipo_exploracao IN ('LEITE', 'MISTO')
 */
export interface IndicadorRebanho {
  // Indicadores Comuns (Corte + Leite)
  gmd: ResultadoIndicador<number>;                                    // kg/dia
  taxaNatalidade: ResultadoIndicador<number>;                         // %
  taxaMortalidadeGeral: ResultadoIndicador<number>;                   // %
  taxaMortalidadeBezerros: ResultadoIndicador<number>;                // %
  taxaDescarte: ResultadoIndicador<number>;                           // %
  taxaPrenhez: ResultadoIndicador<number>;                            // %
  iep: ResultadoIndicador<number>;                                    // dias (Intervalo Entre Partos)
  ipp: ResultadoIndicador<number>;                                    // meses (Idade Primeiro Parto)
  pesoMedioPorCategoria: ResultadoIndicador<Record<string, number>>; // kg por categoria
  taxaReposicao: ResultadoIndicador<number>;                          // %
  evolucaoEfetivo: ResultadoIndicador<Array<{ data: Date; quantidade: number }>>;
  composicaoRebanho: ResultadoIndicador<Record<string, number>>;      // % por categoria

  // Específicos Corte (se tipo_exploracao IN ('CORTE', 'MISTO'))
  taxaDesfrute?: ResultadoIndicador<number>;                          // %

  // Específicos Leite (se tipo_exploracao IN ('LEITE', 'MISTO'))
  percentualVacasLactacao?: ResultadoIndicador<number>;               // %
  periodoSecoMedio?: ResultadoIndicador<number>;                      // dias
}

// ========== RELATÓRIO COMPLETO ==========

/**
 * Relatório completo de indicadores com metadados
 * Inclui contexto de fazenda, período, filtros e auditoria
 * Usado por exportarIndicadoresPDFAction e exportarIndicadoresCSVAction
 */
export interface RelatorioRebanho {
  fazendaId: string;
  fazendaNome: string;
  tipoExploracao: TipoExploracao;
  periodo: { dataInicio: Date; dataFim: Date };
  filtros: FiltrosIndicadores;
  indicadores: IndicadorRebanho;
  geradoEm: Date;
  geradoPor: string; // usuario_id
}

// ========== COMPARATIVO ENTRE LOTES ==========

/**
 * Comparativo de um lote em relação a um indicador específico
 * Inclui ranking, trend e comparação com período anterior
 */
export interface ComparativoLotes {
  loteId: string;
  loteNome: string;
  quantidadeAnimais: number;
  gmd?: number;
  taxaNatalidade?: number;
  taxaPrenhez?: number;
  pesoMedio?: number;
  trend?: Trend;
  trendValor?: number;
}

// ========== PROPS PARA COMPONENTES ==========

/**
 * Props para CardIndicador.tsx
 * Renderiza 4 estados: LOADING, OK, INSUFFICIENT_DATA, ERROR
 */
export interface CardIndicadorProps {
  nome: string;
  valor: ResultadoIndicador<number>;
  unidade: string;
  benchmark?: { min: number; max: number };
  icon?: React.ReactNode;
  onRefresh?: () => void;
  mensagemInsuficiente?: string;
  acaoInsuficiente?: { label: string; href: string };
}

/**
 * Props para FiltrosIndicadores.tsx
 * Dropdowns: período, lotes, categorias, fazenda
 * Persistência: URL params + sessionStorage
 */
export interface FiltrosIndicadoresProps {
  filtrosAtuais: FiltrosIndicadores;
  tipoExploracao: TipoExploracao;
  onAplicar: (filtros: FiltrosIndicadores) => Promise<void>;
  onResetar: () => void;
  lotes: Lote[];
  isLoading?: boolean;
}

/**
 * Props para GraficoGMD.tsx
 * LineChart: tempo X → GMD Y, modo por-animal ou por-lote
 */
export interface GraficoGMDProps {
  dados: Array<{
    animal_id: string;
    brinco: string;
    datas: Date[];
    pesos: number[];
    gmd: number;
  }>;
  modo: 'por-animal' | 'por-lote';
  periodo: FiltrosIndicadores;
}

/**
 * Props para GraficoComposicao.tsx
 * PieChart: categoria → %
 */
export interface GraficoComposicaoProps {
  dados: Record<string, number>;
  periodo: FiltrosIndicadores;
  onClickCategoria?: (categoria: string) => void;
}

/**
 * Props para GraficoDistribuicaoEtaria.tsx
 * DonutChart ou BarChart: categoria → percentual
 */
export interface GraficoDistribuicaoEtariaProps {
  dados: Array<{ categoria: string; percentual: number }>;
  periodo: FiltrosIndicadores;
}

/**
 * Props para GraficoEvolucaoEfetivo.tsx
 * LineChart: timeline com marcadores de eventos (nascimentos, mortes, vendas)
 */
export interface GraficoEvolucaoEfetivoProps {
  dados: Array<{
    data: Date;
    quantidade: number;
    eventos?: { nascimentos: number; mortes: number; vendas: number };
  }>;
  periodo: FiltrosIndicadores;
}

/**
 * Props para GraficoNatalidadeMortalidade.tsx
 * BarChart agrupado: mês → (Natalidade | Mortalidade)
 */
export interface GraficoNatalidadeMortalidadeProps {
  dados: Array<{
    mes: string;
    natalidade: number;  // %
    mortalidade: number; // %
  }>;
  periodo: FiltrosIndicadores;
}

/**
 * Props para ComparativoLotes.tsx
 * Tabela + BarChart: ranking 1-5 de lotes por indicador
 */
export interface ComparativoLotesProps {
  dados: ComparativoLotes[];
  indicador: 'gmd' | 'natalidade' | 'prenhez' | 'peso';
  periodo: FiltrosIndicadores;
  onSelectLote?: (loteId: string) => void;
}

/**
 * Props para MiniCardRebanho.tsx
 * Card compacto no dashboard principal: total, GMD trend, prenhez
 */
export interface MiniCardRebanhoProps {
  totalAnimais: number;
  gmd: number;
  taxaPrenhez: number;
  trendGMD: Trend;
  trendValor?: number;
  href: string;
}

// ========== PAGE PROPS ==========

/**
 * Props para page RSC (IndicadoresPage)
 * Recebe searchParams dos query params
 */
export interface IndicadoresPageProps {
  searchParams?: Record<string, string | string[]>;
}

/**
 * Props para IndicadoresClient.tsx
 * Recebe filtros iniciais e tipo_exploracao da fazenda
 */
export interface IndicadoresClientProps {
  initialFiltros: FiltrosIndicadores;
  tipoExploracao: TipoExploracao;
}
