'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type CicloAgricola } from '@/lib/types/talhoes';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TalhaoHistoricoTabProps {
  ciclos: CicloAgricola[];
}

export function TalhaoHistoricoTab({ ciclos }: TalhaoHistoricoTabProps) {
  // Ciclos passados (colhidos)
  const ciclosPassados = ciclos.filter((c) => c.data_colheita_real);

  // Dados para o gráfico
  const dadosGrafico = ciclosPassados.map((ciclo) => ({
    nome: `${ciclo.cultura} (${new Date(ciclo.data_colheita_real!).getFullYear()})`,
    produtividade: ciclo.produtividade_ton_ha || 0,
  }));

  if (ciclosPassados.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="text-muted-foreground">Nenhum ciclo concluído</div>
          <div className="text-sm text-muted-foreground mt-2">
            Complete um ciclo para visualizar o histórico e gráficos.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline de Ciclos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ciclos Concluídos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ciclosPassados.map((ciclo, index) => (
              <div
                key={ciclo.id}
                className="relative pb-4"
                style={{
                  paddingLeft: '2rem',
                  ...(index !== ciclosPassados.length - 1 && {
                    borderLeft: '2px solid hsl(var(--muted-foreground) / 0.2)',
                  }),
                }}
              >
                <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-primary"></div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{ciclo.cultura}</span>
                    <Badge variant="outline">Concluído</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Plantio</div>
                      <div className="font-semibold">
                        {new Date(ciclo.data_plantio).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Colheita</div>
                      <div className="font-semibold">
                        {new Date(ciclo.data_colheita_real!).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Produtividade</div>
                      <div className="font-semibold text-primary">
                        {ciclo.produtividade_ton_ha
                          ? `${ciclo.produtividade_ton_ha} ton/ha`
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Produtividade */}
      {dadosGrafico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtividade por Ciclo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'ton/ha', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value) => `${value} ton/ha`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Legend />
                <Bar dataKey="produtividade" name="Produtividade" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
