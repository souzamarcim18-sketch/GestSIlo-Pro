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

export const MODULO_CONFIG: Record<ModuloCalendario, { label: string; colorClass: string; bgClass: string; dotClass: string }> = {
  lavoura_dap:        { label: 'DAP Lavoura',       colorClass: 'text-green-300',       bgClass: 'bg-green-900/60',   dotClass: 'bg-green-400' },
  lavoura_atividade:  { label: 'Atividade Campo',    colorClass: 'text-emerald-300',     bgClass: 'bg-emerald-900/60', dotClass: 'bg-emerald-400' },
  frota:              { label: 'Frota',              colorClass: 'text-blue-300',        bgClass: 'bg-blue-900/60',    dotClass: 'bg-blue-400' },
  rebanho:            { label: 'Rebanho',            colorClass: 'text-amber-300',       bgClass: 'bg-amber-900/60',   dotClass: 'bg-amber-400' },
  sanidade:           { label: 'Sanidade',           colorClass: 'text-red-300',         bgClass: 'bg-red-900/60',     dotClass: 'bg-red-400' },
  mao_obra:           { label: 'Mão de Obra',        colorClass: 'text-purple-300',      bgClass: 'bg-purple-900/60',  dotClass: 'bg-purple-400' },
  pastagem_manejo:    { label: 'Manejo Pastagem',    colorClass: 'text-lime-300',        bgClass: 'bg-lime-900/60',    dotClass: 'bg-lime-400' },
  pastagem_ocupacao:  { label: 'Ocupação Piquete',   colorClass: 'text-lime-200',        bgClass: 'bg-lime-800/60',    dotClass: 'bg-lime-300' },
  silo:               { label: 'Silo',               colorClass: 'text-orange-300',      bgClass: 'bg-orange-900/60',  dotClass: 'bg-orange-400' },
  insumo:             { label: 'Insumo',             colorClass: 'text-cyan-300',        bgClass: 'bg-cyan-900/60',    dotClass: 'bg-cyan-400' },
  produto:            { label: 'Produto',            colorClass: 'text-indigo-300',      bgClass: 'bg-indigo-900/60',  dotClass: 'bg-indigo-400' },
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
