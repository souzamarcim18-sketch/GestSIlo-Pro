'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  calcularGMDUltimasDuas,
  calcularProjecaoAbate,
  calcularArrobasEstimadas,
} from '@/lib/calculos/indicadores-rebanho';
import type { Animal, PesoAnimal, Lote } from '@/lib/types/rebanho';
import { FormRegistroPesagemLote } from './FormRegistroPesagemLote';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

interface DashboardCorteProps {
  animais: Animal[];
  lotes: Lote[];
  pesos: PesoAnimal[];
  data90dias: string;
}

export function DashboardCorte({
  animais,
  lotes,
  pesos,
  data90dias,
}: DashboardCorteProps) {
  const [periodo, setPeriodo] = useState<string>('90');
  const [loteFiltroPId, setLoteFiltroPId] = useState<string>('todos');
  const [showFormRegistro, setShowFormRegistro] = useState(false);
  const [pesoAlvo, setPesoAlvo] = useLocalStorage('gestsilo:peso-alvo-corte', '480');

  // Agrupar pesos por animal
  const pesosAgrupados = useMemo(() => {
    const map = new Map<string, PesoAnimal[]>();
    for (const peso of pesos) {
      if (!map.has(peso.animal_id)) {
        map.set(peso.animal_id, []);
      }
      map.get(peso.animal_id)!.push(peso);
    }
    return map;
  }, [pesos]);

  // Calcular data de início do período
  const hoje = new Date();
  const diasAtras = parseInt(periodo);
  const dataInicio = new Date(hoje);
  dataInicio.setDate(dataInicio.getDate() - diasAtras);
  const dataInicioStr = dataInicio.toISOString().split('T')[0];

  // Filtrar animais por lote se necessário
  const animaisAtivos = useMemo(() => {
    return animais.filter((a) => {
      if (loteFiltroPId !== 'todos' && a.lote_id !== loteFiltroPId) {
        return false;
      }
      return true;
    });
  }, [animais, loteFiltroPId]);

  // ========== SEÇÃO A: KPIs ==========

  const totalAnimaisCorte = animaisAtivos.length;

  const gmdsMedios: number[] = [];
  for (const animal of animaisAtivos) {
    const pesosAnimal = pesosAgrupados.get(animal.id) || [];
    const gmd = calcularGMDUltimasDuas(pesosAnimal);
    if (gmd !== null && gmd > 0) {
      gmdsMedios.push(gmd);
    }
  }
  const gmdMedioRebanho =
    gmdsMedios.length > 0 ? gmdsMedios.reduce((a, b) => a + b, 0) / gmdsMedios.length : 0;

  const pesoMedioAtual =
    animaisAtivos.length > 0
      ? animaisAtivos.filter((a) => a.peso_atual !== null).reduce((acc, a) => acc + (a.peso_atual || 0), 0) /
        animaisAtivos.filter((a) => a.peso_atual !== null).length
      : 0;

  const pesoAlvoNum = parseFloat(pesoAlvo) || 480;
  const arrobasProjetadas = animaisAtivos
    .map((a) => calcularArrobasEstimadas(a.peso_atual, 0.52) || 0)
    .reduce((a, b) => a + b, 0);

  // ========== SEÇÃO A: GRÁFICO (EVOLUÇÃO POR LOTE) ==========

  const dadosGrafico = useMemo(() => {
    const dataMap = new Map<string, Record<string, number[] | string>>();

    // Coletar todas as datas no período
    for (const [animalId, pesosAnimal] of pesosAgrupados) {
      const animal = animais.find((a) => a.id === animalId);
      if (!animal || !animaisAtivos.includes(animal)) continue;

      for (const peso of pesosAnimal) {
        if (peso.data_pesagem >= dataInicioStr) {
          const dataKey = peso.data_pesagem;
          if (!dataMap.has(dataKey)) {
            dataMap.set(dataKey, { data: dataKey });
          }

          const loteNome = lotes.find((l) => l.id === animal.lote_id)?.nome || 'Sem Lote';
          if (!dataMap.get(dataKey)![loteNome]) {
            dataMap.get(dataKey)![loteNome] = [] as number[];
          }
          const pesos = dataMap.get(dataKey)![loteNome];
          if (Array.isArray(pesos)) {
            pesos.push(peso.peso_kg);
          }
        }
      }
    }

    // Calcular média por lote por data
    const dados: any[] = [];
    for (const [data, record] of Array.from(dataMap.entries()).sort()) {
      const novoRecord: any = { data };
      for (const [lote, pesos] of Object.entries(record)) {
        if (lote !== 'data' && Array.isArray(pesos)) {
          novoRecord[lote] = pesos.reduce((a, b) => a + b, 0) / pesos.length;
        }
      }
      dados.push(novoRecord);
    }

    return dados;
  }, [pesosAgrupados, animaisAtivos, animais, lotes, dataInicioStr]);

  // ========== SEÇÃO B: ANIMAIS PRÓXIMOS AO ABATE ==========

  const animaisProximos = useMemo(() => {
    return animaisAtivos
      .map((animal) => {
        const pesosAnimal = pesosAgrupados.get(animal.id) || [];
        const gmd = calcularGMDUltimasDuas(pesosAnimal);
        const diasEstimados = calcularProjecaoAbate(animal.peso_atual, gmd, pesoAlvoNum);
        const arrobas = calcularArrobasEstimadas(animal.peso_atual, 0.52);

        return {
          animal,
          gmd,
          diasEstimados,
          arrobas,
          loteNome: lotes.find((l) => l.id === animal.lote_id)?.nome || '—',
        };
      })
      .filter(
        (item) =>
          item.animal.peso_atual &&
          item.animal.peso_atual >= pesoAlvoNum * 0.9
      )
      .sort((a, b) => {
        // Ordenar por dias estimados (menores primeiro)
        const diasA = a.diasEstimados || Infinity;
        const diasB = b.diasEstimados || Infinity;
        return diasA - diasB;
      });
  }, [animaisAtivos, pesosAgrupados, lotes, pesoAlvoNum]);

  // ========== RENDER ==========

  return (
    <div className="space-y-6">
      {/* SEÇÃO A: KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Animais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnimaisCorte}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              GMD Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gmdMedioRebanho.toFixed(2)} kg/dia</div>
            <p className="text-xs text-muted-foreground mt-1">últimas 2 pesagens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Peso Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pesoMedioAtual.toFixed(0)} kg</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Arrobas Projetadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{arrobasProjetadas.toFixed(0)} @</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Período</Label>
          <Select value={periodo} onValueChange={(v) => v && setPeriodo(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Lote</Label>
          <Select value={loteFiltroPId} onValueChange={(v) => v && setLoteFiltroPId(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os lotes</SelectItem>
              {lotes.map((lote) => (
                <SelectItem key={lote.id} value={lote.id}>
                  {lote.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* GRÁFICO */}
      {dadosGrafico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Peso Médio por Lote</CardTitle>
            <CardDescription>
              Acompanhe a tendência de ganho de peso nos últimos {periodo} dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', {
                    month: '2-digit',
                    day: '2-digit',
                  })}
                />
                <YAxis label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  formatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)} kg` : value)}
                />
                <Legend />
                {Array.from(
                  new Set(dadosGrafico.flatMap((d) => Object.keys(d).filter((k) => k !== 'data')))
                ).map((lote, i) => (
                  <Line
                    key={lote}
                    type="monotone"
                    dataKey={lote}
                    stroke={`hsl(${(i * 360) / 8}, 70%, 50%)`}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO B: ANIMAIS PRÓXIMOS AO ABATE */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Animais Próximos ao Peso-Alvo</CardTitle>
              <CardDescription>
                Configuração: peso-alvo {pesoAlvoNum}kg (listando ≥ {(pesoAlvoNum * 0.9).toFixed(0)}kg)
              </CardDescription>
            </div>
            <div className="w-32">
              <Label className="text-xs">Peso-alvo (kg)</Label>
              <Input
                type="number"
                value={pesoAlvo}
                onChange={(e) => setPesoAlvo(e.target.value)}
                min="300"
                max="600"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {animaisProximos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum animal próximo ao peso-alvo neste período
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brinco</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Peso Atual</TableHead>
                    <TableHead>Arrobas</TableHead>
                    <TableHead>GMD</TableHead>
                    <TableHead>Dias ao Abate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animaisProximos.map(({ animal, gmd, diasEstimados, arrobas, loteNome }) => (
                    <TableRow key={animal.id}>
                      <TableCell className="font-medium">{animal.brinco}</TableCell>
                      <TableCell>{animal.nome || '—'}</TableCell>
                      <TableCell className="text-sm">{loteNome}</TableCell>
                      <TableCell className="font-medium">
                        {animal.peso_atual?.toFixed(0)} kg
                      </TableCell>
                      <TableCell>
                        {arrobas ? `${arrobas.toFixed(1)} @` : '—'}
                      </TableCell>
                      <TableCell>
                        {gmd ? `${gmd.toFixed(2)} kg/dia` : '—'}
                      </TableCell>
                      <TableCell>
                        {diasEstimados ? `${diasEstimados} dias` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO C: REGISTRO DE PESAGEM */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registrar Pesagem</CardTitle>
            <Button
              onClick={() => setShowFormRegistro(!showFormRegistro)}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {showFormRegistro ? 'Fechar' : 'Registrar Pesagem'}
            </Button>
          </div>
        </CardHeader>
        {showFormRegistro && (
          <CardContent>
            <FormRegistroPesagemLote
              animais={animaisAtivos}
              lotes={lotes}
              onSuccess={() => setShowFormRegistro(false)}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
