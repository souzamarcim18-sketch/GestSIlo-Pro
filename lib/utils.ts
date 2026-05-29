import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { HORAS_POR_DIA } from '@/lib/types/mao-de-obra';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('pt-BR')
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Calcula o custo de um colaborador para uma atividade, convertendo entre
 * horas e diárias conforme necessário (1 dia = HORAS_POR_DIA horas).
 *
 * Tabela de conversão:
 *   duracao_tipo | tipo_valor | fórmula
 *   'horas'      | 'hora'     | duracaoValor * valorRef
 *   'dias'       | 'diaria'   | duracaoValor * valorRef
 *   'horas'      | 'diaria'   | (duracaoValor / HORAS_POR_DIA) * valorRef
 *   'dias'       | 'hora'     | (duracaoValor * HORAS_POR_DIA) * valorRef
 */
export function daysBetween(de: string, ate: string): number {
  return Math.floor(
    (new Date(ate).getTime() - new Date(de).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function calcularCustoColaborador(
  duracaoTipo: 'horas' | 'dias',
  duracaoValor: number,
  tipoValor: 'hora' | 'diaria',
  valorRef: number,
): number {
  if (duracaoTipo === 'horas' && tipoValor === 'hora') {
    return duracaoValor * valorRef;
  }
  if (duracaoTipo === 'dias' && tipoValor === 'diaria') {
    return duracaoValor * valorRef;
  }
  if (duracaoTipo === 'horas' && tipoValor === 'diaria') {
    return (duracaoValor / HORAS_POR_DIA) * valorRef;
  }
  // duracaoTipo === 'dias' && tipoValor === 'hora'
  return (duracaoValor * HORAS_POR_DIA) * valorRef;
}
