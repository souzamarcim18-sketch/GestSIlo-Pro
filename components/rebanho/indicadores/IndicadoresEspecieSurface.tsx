'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calcularComposicaoRebanho } from '@/lib/calculos/indicadores-rebanho';
import type { Animal } from '@/lib/types/rebanho';

interface IndicadoresEspecieSurfaceProps {
  especie: 'leiteiro' | 'corte';
  animais: Animal[];
}

function MiniKpi({ label, valor, sublabel }: { label: string; valor: string | number; sublabel?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold leading-none text-foreground">{valor}</p>
      {sublabel && <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

/**
 * Superfície de indicadores/estrutura por espécie. Camada de apresentação
 * enxuta: consome os animais já filtrados por tipo_rebanho e deriva a
 * composição do efetivo. Resultado técnico dependente de período (desmama,
 * desfrute, arrobas/área, CCS) é apresentado nas abas de Produção/Reprodução
 * onde os dados de eventos/produção estão disponíveis.
 */
export function IndicadoresEspecieSurface({ especie, animais }: IndicadoresEspecieSurfaceProps) {
  const composicao = useMemo(
    () => calcularComposicaoRebanho(animais.filter((a) => a.status === 'Ativo')),
    [animais]
  );

  const categorias = useMemo(
    () => Object.entries(composicao.por_categoria).sort(([, a], [, b]) => b - a),
    [composicao]
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Estrutura do efetivo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniKpi label="Total ativo" valor={composicao.total} sublabel="animais" />
          <MiniKpi label="Fêmeas" valor={composicao.por_sexo.Fêmea} />
          <MiniKpi label="Machos" valor={composicao.por_sexo.Macho} />
          <MiniKpi
            label={especie === 'leiteiro' ? 'Leiteiro / Dupla' : 'Corte / Dupla'}
            valor={
              especie === 'leiteiro'
                ? composicao.por_vocacao.leiteiro + composicao.por_vocacao.dupla_aptidao
                : composicao.por_vocacao.corte + composicao.por_vocacao.dupla_aptidao
            }
          />
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {categorias.length > 0 ? (
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {categorias.map(([categoria, total]) => (
                <div
                  key={categoria}
                  className="flex items-center justify-between border-b border-border/50 py-1 text-sm"
                >
                  <span className="text-muted-foreground">{categoria}</span>
                  <span className="font-medium text-foreground">{total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum animal ativo nesta espécie.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Esta aba resume a estrutura do efetivo.{' '}
        {especie === 'leiteiro'
          ? 'Os indicadores de produção (litros/vaca, litros/ha, CCS) estão detalhados na aba Produção e os reprodutivos na aba Reprodução.'
          : 'Os indicadores de desempenho (GMD, arrobas, @/ha, desfrute, desmama) estão detalhados na aba Desempenho e os reprodutivos na aba Reprodução.'}
      </p>
    </div>
  );
}
