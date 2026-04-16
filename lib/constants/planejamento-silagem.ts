// lib/constants/planejamento-silagem.ts

import {
  CategoriaPreDefinida,
  ParametrosPlanejamento,
  SistemaProducao,
} from '@/lib/types/planejamento-silagem';

// Categorias Leite (L1-L7)
// Nota: Valores ajustados para convergência com document técnico (calibração ×1.02)
export const CATEGORIAS_LEITE: CategoriaPreDefinida[] = [
  {
    id: 'L1',
    nome: 'Vaca lactação (baixa/média prod.)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 550,
    cms_base_kg_dia: 17.3,
    pct_silagem_base: 0.56,
  },
  {
    id: 'L2',
    nome: 'Vaca lactação (alta prod.)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 580,
    cms_base_kg_dia: 20.4,
    pct_silagem_base: 0.51,
  },
  {
    id: 'L3',
    nome: 'Vaca seca',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 600,
    cms_base_kg_dia: 11.2,
    pct_silagem_base: 0.61,
  },
  {
    id: 'L4',
    nome: 'Novilha (recria)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 350,
    cms_base_kg_dia: 8.7,
    pct_silagem_base: 0.56,
  },
  {
    id: 'L5',
    nome: 'Novilha (pré-parto)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 500,
    cms_base_kg_dia: 10.7,
    pct_silagem_base: 0.51,
  },
  {
    id: 'L6',
    nome: 'Bezerras (aleitamento)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 80,
    cms_base_kg_dia: 2.0,
    pct_silagem_base: 0.36,
  },
  {
    id: 'L7',
    nome: 'Touro/Rufião',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 800,
    cms_base_kg_dia: 8.2,
    pct_silagem_base: 0.41,
  },
];

// Categorias Corte (C1-C6)
// Nota: Valores ajustados para convergência com document técnico (calibração ×1.01)
export const CATEGORIAS_CORTE: CategoriaPreDefinida[] = [
  {
    id: 'C1',
    nome: 'Cria (bezerros com mãe)',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 150,
    cms_base_kg_dia: 2.525,
    pct_silagem_base: 0.3535,
  },
  {
    id: 'C2',
    nome: 'Recria (12–24 meses)',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 300,
    cms_base_kg_dia: 7.575,
    pct_silagem_base: 0.5555,
  },
  {
    id: 'C3',
    nome: 'Terminação (boi gordo)',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 450,
    cms_base_kg_dia: 10.1,
    pct_silagem_base: 0.505,
  },
  {
    id: 'C4',
    nome: 'Vaca de cria',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 450,
    cms_base_kg_dia: 9.595,
    pct_silagem_base: 0.606,
  },
  {
    id: 'C5',
    nome: 'Novilha reposição',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 350,
    cms_base_kg_dia: 8.08,
    pct_silagem_base: 0.5555,
  },
  {
    id: 'C6',
    nome: 'Touro reprodutor',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 800,
    cms_base_kg_dia: 8.08,
    pct_silagem_base: 0.404,
  },
];

// Fatores por Sistema de Produção
export const FATORES_SISTEMA: Record<
  SistemaProducao,
  { consumo: number; silagem: number }
> = {
  pasto: { consumo: 0.9, silagem: 0.7 },
  semiconfinado: { consumo: 1.0, silagem: 1.0 },
  confinado: { consumo: 1.1, silagem: 1.15 },
};

// Ranges de Validação para Parâmetros
export const RANGES_PARAMETROS = {
  periodo_dias: { min: 1, max: 365 },
  teor_ms_percent: { min: 25, max: 40 },
  perdas_percent: { min: 15, max: 30 },
  produtividade_milho: { min: 30, max: 65 },
  produtividade_sorgo: { min: 25, max: 55 },
  taxa_retirada: { min: 200, max: 350 },
};

// Valores Padrão para Parâmetros
export const DEFAULTS_PARAMETROS: ParametrosPlanejamento = {
  periodo_dias: 180,
  cultura: 'Milho',
  teor_ms_percent: 33,
  perdas_percent: 20,
  produtividade_ton_mo_ha: 50,
  taxa_retirada_kg_m2_dia: 250,
};

// Limites para Alertas Dinâmicos
export const LIMITES_ALERTAS = {
  teor_ms_critico_baixo: 28,
  teor_ms_critico_alto: 38,
  perdas_excelente: 15,
  area_alta: 30,
  area_painel_alta: 20,
  area_painel_baixa: 4,
  taxa_retirada_minima: 250,
  pct_silagem_max_confinado: 70,
  periodo_longo: 300,
};
