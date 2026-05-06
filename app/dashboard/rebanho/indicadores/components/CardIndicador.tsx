'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CardIndicadorProps } from '@/types/rebanho-indicadores';

export function CardIndicador({
  nome,
  valor,
  unidade,
  benchmark,
  icon,
  onRefresh,
}: CardIndicadorProps) {
  const renderizarConteudo = () => {
    switch (valor.estado) {
      case 'LOADING':
        return renderizarLoading();
      case 'OK':
        return renderizarOK();
      case 'INSUFFICIENT_DATA':
        return renderizarDadosInsuficientes();
      case 'ERROR':
        return renderizarErro();
    }
  };

  const renderizarLoading = () => {
    return (
      <div className="space-y-3">
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
      </div>
    );
  };

  const renderizarOK = () => {
    const getBenchmarkStatus = (): { emoji: string; classe: string } => {
      if (!benchmark || valor.valor === null) return { emoji: '•', classe: 'text-gray-500' };

      if (valor.valor < benchmark.min) {
        return { emoji: '✗', classe: 'text-red-600' };
      }
      if (valor.valor > benchmark.max) {
        return { emoji: '⚠️', classe: 'text-yellow-600' };
      }
      return { emoji: '✓', classe: 'text-green-600' };
    };

    const benchmarkStatus = getBenchmarkStatus();

    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold">
            {valor.valor?.toFixed(2) ?? '—'}
          </div>
          <div className="text-sm font-medium text-gray-600">{unidade}</div>
        </div>

        {benchmark && valor.valor !== null && (
          <div className="text-xs text-gray-600">
            Benchmark: {benchmark.min.toFixed(2)}–{benchmark.max.toFixed(2)} {benchmarkStatus.emoji}
          </div>
        )}

        {valor.trend && valor.trendValor !== undefined && (
          <div className="flex items-center gap-1">
            {valor.trend === 'up' && (
              <TrendingUp className="h-4 w-4 text-green-600" />
            )}
            {valor.trend === 'down' && (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            {valor.trend === 'stable' && (
              <div className="h-4 w-4 text-gray-500">→</div>
            )}
            <span className={cn(
              'text-xs font-medium',
              valor.trend === 'up' && 'text-green-600',
              valor.trend === 'down' && 'text-red-600',
              valor.trend === 'stable' && 'text-gray-500',
            )}>
              {valor.trend === 'up' && '+'}
              {valor.trendValor.toFixed(2)} {unidade}
            </span>
          </div>
        )}

        {valor.atualizadoEm && (
          <div className="text-xs text-gray-500">
            Atualizado em {new Date(valor.atualizadoEm).toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>
    );
  };

  const renderizarDadosInsuficientes = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Dados Insuficientes</p>
            <p className="text-xs text-gray-600">Registre mais pesagens para calcular este indicador</p>
          </div>
        </div>
        <Link href="/dashboard/rebanho/pesagens" className="block">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
          >
            Registrar Pesagem
          </Button>
        </Link>
      </div>
    );
  };

  const renderizarErro = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Erro ao Calcular</p>
            <p className="text-xs text-gray-600">
              {valor.erro || 'Tente novamente em instantes'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRefresh}
          disabled={!onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <div className="text-lg">{icon}</div>}
            <h3 className="text-sm font-semibold text-gray-900">{nome}</h3>
          </div>
          {onRefresh && valor.estado === 'OK' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderizarConteudo()}
      </CardContent>
    </Card>
  );
}
