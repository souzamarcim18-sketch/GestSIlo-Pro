'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { criarProducaoLeiteiraAction } from '@/app/dashboard/rebanho/leiteira/actions';
import type { ProducaoLeiteira, TurnoProducao } from '@/lib/types/rebanho-leiteira';
import type { Animal } from '@/lib/types/rebanho';

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontSize: '12px',
} as const;

const TURNO_LABELS_MAP: Record<TurnoProducao, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  dia_inteiro: 'Dia Inteiro',
};

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
  const router = useRouter();
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [modoRegistro, setModoRegistro] = useState<'individual' | 'coletivo'>('individual');
  const [isSaving, setIsSaving] = useState(false);
  const [periodoGrafico, setPeriodoGrafico] = useState<'7' | '14' | '30'>('30');

  // Form state
  const hoje = new Date().toISOString().split('T')[0];
  const [animalId, setAnimalId] = useState('');
  const [data, setData] = useState(hoje);
  const [turno, setTurno] = useState<TurnoProducao>('manha');
  const [volume, setVolume] = useState('');
  const [volumeColetivo, setVolumeColetivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const animaisEmLactacao = useMemo(
    () => animais.filter((a) => a.status_reprodutivo === 'lactacao' && a.status === 'Ativo'),
    [animais]
  );

  function resetForm() {
    setAnimalId('');
    setData(hoje);
    setTurno('manha');
    setVolume('');
    setVolumeColetivo('');
    setObservacoes('');
  }

  async function handleSubmit() {
    if (modoRegistro === 'individual') {
      if (!animalId) { toast.error('Selecione um animal.'); return; }
      const vol = parseFloat(volume);
      if (!volume || isNaN(vol) || vol <= 0) { toast.error('Informe um volume válido.'); return; }

      setIsSaving(true);
      const result = await criarProducaoLeiteiraAction({ animal_id: animalId, data, turno, volume_litros: vol, observacoes: observacoes || null });
      setIsSaving(false);

      if (result.success) {
        toast.success('Produção registrada com sucesso!');
        setIsOpenDialog(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error ?? 'Erro ao registrar produção.');
      }
    } else {
      // Modo coletivo: registra uma entrada por animal em lactação com volume dividido
      if (!animaisEmLactacao.length) { toast.error('Nenhuma vaca em lactação cadastrada.'); return; }
      const volTotal = parseFloat(volumeColetivo);
      if (!volumeColetivo || isNaN(volTotal) || volTotal <= 0) { toast.error('Informe o volume total.'); return; }

      const volPorAnimal = parseFloat((volTotal / animaisEmLactacao.length).toFixed(2));
      setIsSaving(true);
      const promises = animaisEmLactacao.map((a) =>
        criarProducaoLeiteiraAction({ animal_id: a.id, data, turno, volume_litros: volPorAnimal, observacoes: observacoes || null })
      );
      const results = await Promise.allSettled(promises);
      setIsSaving(false);

      const erros = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      if (erros.length === 0) {
        toast.success(`Produção registrada para ${animaisEmLactacao.length} vacas.`);
        setIsOpenDialog(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(`${erros.length} erro(s) ao registrar. Tente novamente.`);
      }
    }
  }

  // Preparar dados para gráfico com seletor de período
  const graficoData = useMemo(() => {
    const diasAtras = parseInt(periodoGrafico);
    const corte = new Date();
    corte.setDate(corte.getDate() - diasAtras);
    const corteStr = corte.toISOString().split('T')[0];

    const resultado: Record<string, number> = {};
    producoes
      .filter((p) => p.data >= corteStr)
      .forEach((p) => {
        resultado[p.data] = (resultado[p.data] || 0) + p.volume_litros;
      });
    return Object.entries(resultado)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, volume]) => ({
        data: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' }),
        volume: parseFloat(volume.toFixed(2)),
      }));
  }, [producoes, periodoGrafico]);

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
      {/* Alertas — queda de produção */}
      {vacsComQueda.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Alerta — Queda de Produção</CardTitle>
              <span className="ml-auto text-sm text-muted-foreground">{vacsComQueda.length} vaca(s)</span>
            </div>
            <CardDescription>Vacas com redução de mais de 20% nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {vacsComQueda.map((v) => (
                <div key={v.animal_id} className="flex justify-between items-center py-1.5 px-3 rounded border border-border/50 bg-background">
                  <span className="font-medium text-sm">{v.brinco}</span>
                  <span className="text-destructive font-semibold text-sm">−{v.queda_pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Produção Diária */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Produção Diária</CardTitle>
              <CardDescription>Litros registrados por dia no período selecionado</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select value={periodoGrafico} onValueChange={(v) => setPeriodoGrafico(v as '7' | '14' | '30')}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setIsOpenDialog(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Registrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {graficoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={graficoData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Litros', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value} L`, 'Produção']} />
                <Bar dataKey="volume" fill="hsl(217 91% 60%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p className="text-sm font-medium mb-1">Sem dados de produção no período</p>
              <p className="text-xs">Registre produções para visualizar o gráfico</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking Top 10 */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Produção (Top 10)</CardTitle>
          <CardDescription>Vacas com maior produção total nos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {ranking.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Brinco / Nome</TableHead>
                  <TableHead className="text-right">Total (L)</TableHead>
                  <TableHead className="text-right">Média/dia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((animal, idx) => (
                  <TableRow key={animal.animal_id}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {animal.brinco}
                      {animal.nome && <span className="text-muted-foreground font-normal"> — {animal.nome}</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{animal.total_litros.toFixed(1)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {(animal.total_litros / 30).toFixed(1)} L
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">Sem dados de produção registrados</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog Registrar Produção */}
      <Dialog open={isOpenDialog} onOpenChange={(open) => { setIsOpenDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Produção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Modo */}
            <div className="flex gap-2">
              <Button
                variant={modoRegistro === 'individual' ? 'default' : 'outline'}
                onClick={() => setModoRegistro('individual')}
                className="flex-1"
                type="button"
              >
                Individual
              </Button>
              <Button
                variant={modoRegistro === 'coletivo' ? 'default' : 'outline'}
                onClick={() => setModoRegistro('coletivo')}
                className="flex-1"
                type="button"
              >
                Coletivo
              </Button>
            </div>

            {/* Animal (modo individual) */}
            {modoRegistro === 'individual' && (
              <div className="space-y-1">
                <Label htmlFor="animal_id">Animal *</Label>
                <Select value={animalId} onValueChange={(v) => setAnimalId(v ?? '')}>
                  <SelectTrigger id="animal_id">
                    <SelectValue placeholder="Selecione uma vaca em lactação" />
                  </SelectTrigger>
                  <SelectContent>
                    {animaisEmLactacao.length === 0 ? (
                      <SelectItem value="__none__" disabled>Nenhuma vaca em lactação</SelectItem>
                    ) : (
                      animaisEmLactacao.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.brinco}{a.nome ? ` — ${a.nome}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modoRegistro === 'coletivo' && (
              <p className="text-sm text-muted-foreground">
                O volume total será dividido igualmente entre as {animaisEmLactacao.length} vacas em lactação.
              </p>
            )}

            {/* Data */}
            <div className="space-y-1">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={data}
                max={hoje}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            {/* Turno */}
            <div className="space-y-1">
              <Label htmlFor="turno">Turno *</Label>
              <Select value={turno} onValueChange={(v) => setTurno(v as TurnoProducao)}>
                <SelectTrigger id="turno">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TURNO_LABELS_MAP) as [TurnoProducao, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Volume */}
            <div className="space-y-1">
              <Label htmlFor="volume">
                {modoRegistro === 'individual' ? 'Volume (litros) *' : 'Volume Total (litros) *'}
              </Label>
              <Input
                id="volume"
                type="number"
                min="0.1"
                max={modoRegistro === 'individual' ? '100' : '99999'}
                step="0.1"
                placeholder="Ex: 25.5"
                value={modoRegistro === 'individual' ? volume : volumeColetivo}
                onChange={(e) => modoRegistro === 'individual' ? setVolume(e.target.value) : setVolumeColetivo(e.target.value)}
              />
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                placeholder="Opcional"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialog(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
