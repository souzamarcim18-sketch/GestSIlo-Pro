import { Sprout, Shovel, Wrench, Beef, Syringe, HardHat, Leaf, PawPrint, Archive, Package, ShoppingBag } from 'lucide-react';
import type React from 'react';

export type ModuloCalendario =
  | 'lavoura_dap'
  | 'lavoura_atividade'
  | 'frota'
  | 'rebanho'
  | 'sanidade'
  | 'mao_obra'
  | 'pastagem_manejo'
  | 'pastagem_ocupacao'
  | 'silo'
  | 'insumo'
  | 'produto';

export type StatusEventoCalendario = 'planejado' | 'realizado' | 'atrasado' | 'concluido';

export interface EventoCalendario {
  id: string;
  fonte: string;
  modulo: ModuloCalendario;
  titulo: string;
  subtitulo?: string;
  data: string; // ISO date 'YYYY-MM-DD'
  status: StatusEventoCalendario;
  href?: string;
  talhaoId?: string; // para filtro local por talhão (lavoura_dap e lavoura_atividade)
}

export interface FiltrosCalendario {
  dataInicio: string; // ISO date
  dataFim: string;    // ISO date
  modulos?: ModuloCalendario[];
  talhaoId?: string;
  cultura?: string;
}

export const MODULO_CONFIG: Record<ModuloCalendario, { label: string; colorClass: string; bgClass: string }> = {
  lavoura_dap:        { label: 'DAP Lavoura',       colorClass: 'text-green-600',       bgClass: 'bg-green-100' },
  lavoura_atividade:  { label: 'Atividade Campo',    colorClass: 'text-green-800',       bgClass: 'bg-green-200' },
  frota:              { label: 'Frota',              colorClass: 'text-blue-600',        bgClass: 'bg-blue-100' },
  rebanho:            { label: 'Rebanho',            colorClass: 'text-amber-600',       bgClass: 'bg-amber-100' },
  sanidade:           { label: 'Sanidade',           colorClass: 'text-red-500',         bgClass: 'bg-red-100' },
  mao_obra:           { label: 'Mão de Obra',        colorClass: 'text-purple-600',      bgClass: 'bg-purple-100' },
  pastagem_manejo:    { label: 'Manejo Pastagem',    colorClass: 'text-lime-600',        bgClass: 'bg-lime-100' },
  pastagem_ocupacao:  { label: 'Ocupação Piquete',   colorClass: 'text-lime-500',        bgClass: 'bg-lime-50' },
  silo:               { label: 'Silo',               colorClass: 'text-orange-600',      bgClass: 'bg-orange-100' },
  insumo:             { label: 'Insumo',             colorClass: 'text-cyan-600',        bgClass: 'bg-cyan-100' },
  produto:            { label: 'Produto',            colorClass: 'text-indigo-600',      bgClass: 'bg-indigo-100' },
};

export const MODULO_ICONE: Record<ModuloCalendario, React.ComponentType<{ className?: string }>> = {
  lavoura_dap:        Sprout,
  lavoura_atividade:  Shovel,
  frota:              Wrench,
  rebanho:            Beef,
  sanidade:           Syringe,
  mao_obra:           HardHat,
  pastagem_manejo:    Leaf,
  pastagem_ocupacao:  PawPrint,
  silo:               Archive,
  insumo:             Package,
  produto:            ShoppingBag,
};
