'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/utils/format-planejamento';

interface GraficoParticipacaoProps {
  dados: Array<{ nome: string; participacao: number }>;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
} as const;

export function GraficoParticipacao({ dados }: GraficoParticipacaoProps) {
  if (dados.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Nenhum dado para exibir
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Participação por Categoria</CardTitle>
        <CardDescription>Distribuição da demanda total de MS</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="nome" type="category" width={140} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatPercent(Number(value))}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar
                dataKey="participacao"
                fill="#00A651"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
