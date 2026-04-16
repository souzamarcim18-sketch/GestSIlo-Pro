// lib/constants/planejamento-silagem.ts

import {
  CategoriaPreDefinida,
  ParametrosPlanejamento,
  SistemaProducao,
} from '@/lib/types/planejamento-silagem';

// Categorias Leite (L1-L7)
export const CATEGORIAS_LEITE: CategoriaPreDefinida[] = [
  {
    id: 'L1',
    nome: 'Vaca lactação (baixa/média prod.)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 550,
    cms_base_kg_dia: 17.0,
    pct_silagem_base: 0.55,
  },
  {
    id: 'L2',
    nome: 'Vaca lactação (alta prod.)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 580,
    cms_base_kg_dia: 20.0,
    pct_silagem_base: 0.50,
  },
  {
    id: 'L3',
    nome: 'Vaca seca',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 600,
    cms_base_kg_dia: 11.0,
    pct_silagem_base: 0.60,
  },
  {
    id: 'L4',
    nome: 'Novilha (recria)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 350,
    cms_base_kg_dia: 8.5,
    pct_silagem_base: 0.55,
  },
  {
    id: 'L5',
    nome: 'Novilha (pré-parto)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 500,
    cms_base_kg_dia: 10.5,
    pct_silagem_base: 0.50,
  },
  {
    id: 'L6',
    nome: 'Bezerras (aleitamento)',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 80,
    cms_base_kg_dia: 2.0,
    pct_silagem_base: 0.35,
  },
  {
    id: 'L7',
    nome: 'Touro/Rufião',
    tipo_rebanho: 'Leite',
    pv_ref_kg: 800,
    cms_base_kg_dia: 8.0,
    pct_silagem_base: 0.40,
  },
];

// Categorias Corte (C1-C6)
export const CATEGORIAS_CORTE: CategoriaPreDefinida[] = [
  {
    id: 'C1',
    nome: 'Cria (bezerros com mãe)',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 150,
    cms_base_kg_dia: 2.5,
    pct_silagem_base: 0.35,
  },
  {
    id: 'C2',
    nome: 'Recria (12–24 meses)',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 300,
    cms_base_kg_dia: 7.5,
    pct_silagem_base: 0.55,
  },
  {
    id: 'C3',
    nome: 'Terminação (boi gordo)',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 450,
    cms_base_kg_dia: 10.0,
    pct_silagem_base: 0.50,
  },
  {
    id: 'C4',
    nome: 'Vaca de cria',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 450,
    cms_base_kg_dia: 9.5,
    pct_silagem_base: 0.60,
  },
  {
    id: 'C5',
    nome: 'Novilha reposição',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 350,
    cms_base_kg_dia: 8.0,
    pct_silagem_base: 0.55,
  },
  {
    id: 'C6',
    nome: 'Touro reprodutor',
    tipo_rebanho: 'Corte',
    pv_ref_kg: 800,
    cms_base_kg_dia: 8.0,
    pct_silagem_base: 0.40,
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
