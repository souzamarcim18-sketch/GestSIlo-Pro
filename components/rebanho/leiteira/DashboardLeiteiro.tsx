'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProducaoLeiteira } from '@/lib/types/rebanho-leiteira';
import type { Animal } from '@/lib/types/rebanho';

interface DashboardLeiteiroProps {
  producoes: Array<ProducaoLeiteira & {
    animal_brinco: string;
    animal_nome: string | null;
    animal_status_reprodutivo: string | null;
    animal_lote_id: string | null;
  }>;
  animais: Animal[];
  totais: {
    total_litros: number;
    por_animal: Array<{
      animal_id: string;
      brinco: string;
      nome: string | null;
      total_litros: number;
    }>;
  };
}

export function DashboardLeiteiro({ producoes, animais, totais }: DashboardLeiteiroProps) {
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [modoRegistro, setModoRegistro] = useState<'individual' | 'coletivo'>('individual');

  // Preparar dados para gráfico (últimos 30 dias)
  const graficoData = useMemo(() => {
    const resultado: Record<string, number> = {};
    producoes.forEach((p) => {
      resultado[p.data] = (resultado[p.data] || 0) + p.volume_litros;
    });
    return Object.entries(resultado)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([data, volume]) => ({
        data: new Date(data).toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' }),
        volume: parseFloat(volume.toFixed(2)),
      }));
  }, [producoes]);

  // Ranking top 10
  const ranking = useMemo(() => {
    return totais.por_animal
      .sort((a, b) => b.total_litros - a.total_litros)
      .slice(0, 10);
  }, [totais]);

  // Vacas com queda de produção > 20%
  const vacsComQueda = useMemo(() => {
    const resultado: Array<{
      animal_id: string;
      brinco: string;
      queda_pct: number;
    }> = [];

    totais.por_animal.forEach((animal) => {
      const producoesDosUltimos7 = producoes
        .filter((p) => p.animal_id === animal.animal_id)
        .filter((p) => {
          const dias = Math.floor((new Date().getTime() - new Date(p.data).getTime()) / (1000 * 60 * 60 * 24));
          return dias <= 7;
        });

      const producoes7diasAntes = producoes
        .filter((p) => p.animal_id === animal.animal_id)
        .filter((p) => {
          const dias = Math.floor((new Date().getTime() - new Date(p.data).getTime()) / (1000 * 60 * 60 * 24));
          return dias > 7 && dias <= 14;
        });

      if (producoesDosUltimos7.length > 0 && producoes7diasAntes.length > 0) {
        const mediaUltimos7 = producoesDosUltimos7.reduce((acc, p) => acc + p.volume_litros, 0) / producoesDosUltimos7.length;
        const mediaAntes = producoes7diasAntes.reduce((acc, p) => acc + p.volume_litros, 0) / producoes7diasAntes.length;

        if (mediaAntes > 0) {
          const quedaPct = ((mediaAntes - mediaUltimos7) / mediaAntes) * 100;
          if (quedaPct > 20) {
            resultado.push({
              animal_id: animal.animal_id,
              brinco: animal.brinco,
              queda_pct: quedaPct,
            });
          }
        }
      }
    });

    return resultado;
  }, [producoes, totais]);

  return (
    <div className="space-y-6">
      {/* Gráfico de Produção Diária */}
      <Card>
        <CardHeader>
          <CardTitle>Produção Diária (últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {graficoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={graficoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis label={{ value: 'Litros', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value} L`} />
                <Bar dataKey="volume" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">Sem dados de produção</p>
          )}
        </CardContent>
      </Card>

      {/* Ranking Top 10 */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Produção (Top 10)</CardTitle>
          <CardDescription>Vacas com maior produção total no período</CardDescription>
        </CardHeader>
        <CardContent>
          {ranking.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium">Brinco</th>
                    <th className="text-right py-2 text-sm font-medium">Total (L)</th>
                    <th className="text-right py-2 text-sm font-medium">Média/dia</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((animal, idx) => (
                    <tr key={animal.animal_id} className="border-b">
                      <td className="py-2">{animal.brinco}</td>
                      <td className="text-right font-medium">{animal.total_litros.toFixed(1)}</td>
                      <td className="text-right text-muted-foreground">
                        {(animal.total_litros / 30).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Sem dados</p>
          )}
        </CardContent>
      </Card>

      {/* Alertas */}
      {vacsComQueda.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">⚠️ Alertas - Queda de Produção</CardTitle>
            <CardDescription className="text-yellow-800">
              Vacas com redução de produção superior a 20%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vacsComQueda.map((v) => (
                <div key={v.animal_id} className="flex justify-between items-center p-2 bg-white rounded border border-yellow-200">
                  <span className="font-medium">{v.brinco}</span>
                  <span className="text-yellow-700 font-semibold">-{v.queda_pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Registrar Produção */}
      <Button
        onClick={() => setIsOpenDialog(true)}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Registrar Produção
      </Button>

      {/* Dialog Registrar Produção */}
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Produção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={modoRegistro === 'individual' ? 'default' : 'outline'}
                onClick={() => setModoRegistro('individual')}
                className="flex-1"
              >
                Individual
              </Button>
              <Button
                variant={modoRegistro === 'coletivo' ? 'default' : 'outline'}
                onClick={() => setModoRegistro('coletivo')}
                className="flex-1"
              >
                Coletivo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {modoRegistro === 'individual'
                ? 'Registre a produção de um animal específico'
                : 'Registre a produção total da propriedade'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
