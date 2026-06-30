'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Heart,
  Scale,
  Stethoscope,
  Layers,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type {
  ResumoOperacaoDia,
  CriticidadePendencia,
  SubdominioPendencia,
} from '@/lib/types/rebanho-pendencias';

interface Props {
  resumo: ResumoOperacaoDia;
}

const SUBDOMINIO_LABEL: Record<SubdominioPendencia, string> = {
  reproducao: 'Reprodução',
  sanidade: 'Sanidade',
  desempenho: 'Desempenho / Pesagem',
  manejo: 'Manejo / Lote',
};

const SUBDOMINIO_ICON: Record<
  SubdominioPendencia,
  React.ComponentType<{ className?: string }>
> = {
  reproducao: Heart,
  sanidade: Stethoscope,
  desempenho: Scale,
  manejo: Layers,
};

const CRITICIDADE_CLASSE: Record<CriticidadePendencia, string> = {
  critico: 'border-red-600 text-red-600',
  urgente: 'border-yellow-600 text-yellow-600',
  aviso: 'border-blue-600 text-blue-600',
};

const CRITICIDADE_LABEL: Record<CriticidadePendencia, string> = {
  critico: 'Crítico',
  urgente: 'Urgente',
  aviso: 'Atenção',
};

const SUBDOMINIOS: SubdominioPendencia[] = [
  'reproducao',
  'sanidade',
  'desempenho',
  'manejo',
];

export function OperacaoDiaClient({ resumo }: Props) {
  const { grupos, totaisPorSubdominio, totaisPorCategoria, total } = resumo;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#00A651]">
          Operação do dia
        </h1>
        <p className="text-sm text-muted-foreground">
          Pendências de rotina do rebanho — derivadas dos alertas de sanidade,
          reprodução e desempenho. Nada é salvo aqui: é a sua agenda de manejo.
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<Activity className="h-8 w-8" />}
          title="Nenhuma pendência para hoje"
          description="Não há vacinações, partos, secagens ou pesagens pendentes no momento."
        />
      ) : (
        <>
          {/* Leitura por subdomínio (reprodução / sanidade / desempenho / manejo) */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SUBDOMINIOS.map((sub) => {
              const Icon = SUBDOMINIO_ICON[sub];
              return (
                <Card key={sub}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold leading-none">
                        {totaisPorSubdominio[sub]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {SUBDOMINIO_LABEL[sub]}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Leitura por categoria animal crítica */}
          {totaisPorCategoria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pendências por categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {totaisPorCategoria.map((c) => (
                  <Badge
                    key={c.categoria}
                    variant="secondary"
                    className="text-sm"
                  >
                    {c.categoria}
                    <span className="ml-2 font-bold">{c.total}</span>
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Listas acionáveis */}
          <div className="space-y-4">
            {grupos.map((grupo) => {
              const Icon = SUBDOMINIO_ICON[grupo.subdominio];
              return (
                <Card key={grupo.tipo}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {grupo.titulo}
                      <Badge variant="secondary" className="ml-1">
                        {grupo.itens.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/60">
                    {grupo.itens.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{p.animal_brinco}</span>
                            {p.animal_nome && (
                              <span className="text-sm text-muted-foreground">
                                ({p.animal_nome})
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={CRITICIDADE_CLASSE[p.criticidade]}
                            >
                              {CRITICIDADE_LABEL[p.criticidade]}
                            </Badge>
                            {p.categoria && (
                              <Badge variant="secondary" className="text-xs">
                                {p.categoria}
                              </Badge>
                            )}
                          </div>
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CalendarDays
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            {p.motivo}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Link
                            href={p.href}
                            className={cn(
                              buttonVariants({ variant: 'outline', size: 'sm' })
                            )}
                          >
                            {p.acaoSugerida}
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
