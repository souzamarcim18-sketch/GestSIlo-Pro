'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Printer, FileText } from 'lucide-react';
import { type Maquina, type UsoMaquina, type Manutencao, type Abastecimento } from '@/lib/supabase';
import { agruparCustosPorMaquina, filtrarManutencoesPorPeriodo } from '@/lib/utils/frota';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

// ---------------------------------------------------------------------------
// Tipos de relatório
// ---------------------------------------------------------------------------
type TipoRelatorio = 'por-maquina' | 'consolidado' | 'manutencoes' | 'ranking-custo';

interface FrotaRelatoriosProps {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  manutencoes: Manutencao[];
  abastecimentos: Abastecimento[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// exportarCSV — Blob API nativa, sem dependências
// ---------------------------------------------------------------------------
function exportarCSV(dados: Record<string, string | number | null | undefined>[], nomeArquivo: string) {
  if (dados.length === 0) return;
  const headers = Object.keys(dados[0]);
  const linhas = dados.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val == null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = [headers.join(','), ...linhas].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatData(d: string | null | undefined) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
}

function fmtBrl(v: number | null | undefined) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function FrotaRelatorios({
  maquinas,
  usos,
  manutencoes,
  abastecimentos,
  loading,
}: FrotaRelatoriosProps) {
  const hoje = new Date();
  const [tipo, setTipo] = useState<TipoRelatorio>('por-maquina');
  const [maquinaFiltro, setMaquinaFiltro] = useState('');
  const [tipoManutFiltro, setTipoManutFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState(startOfMonth(subMonths(hoje, 1)).toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(endOfMonth(hoje).toISOString().slice(0, 10));

  const inicio = useMemo(() => new Date(dataInicio), [dataInicio]);
  const fim = useMemo(() => new Date(dataFim + 'T23:59:59'), [dataFim]);

  // ── Dados por tipo de relatório ──────────────────────────────────────────
  const dadosPorMaquina = useMemo(() => {
    if (tipo !== 'por-maquina' || !maquinaFiltro) return [];
    const maqUsos = usos
      .filter((u) => u.maquina_id === maquinaFiltro && new Date(u.data) >= inicio && new Date(u.data) <= fim)
      .map((u) => ({
        tipo: 'Uso',
        data: u.data,
        descricao: u.atividade ?? u.tipo_operacao ?? 'Operação',
        valor: '—',
        horas: u.horas?.toFixed(1) ?? '—',
      }));
    const maqManut = manutencoes
      .filter((m) => {
        const d = new Date(m.data_realizada ?? m.data_prevista ?? m.data);
        return m.maquina_id === maquinaFiltro && d >= inicio && d <= fim;
      })
      .map((m) => ({
        tipo: `Manutenção (${m.tipo})`,
        data: m.data_realizada ?? m.data_prevista ?? m.data,
        descricao: m.descricao,
        valor: fmtBrl(m.custo),
        horas: '—',
      }));
    const maqAbast = abastecimentos
      .filter((a) => a.maquina_id === maquinaFiltro && new Date(a.data) >= inicio && new Date(a.data) <= fim)
      .map((a) => ({
        tipo: 'Abastecimento',
        data: a.data,
        descricao: `${a.litros ?? 0} L de ${a.combustivel}`,
        valor: fmtBrl(a.valor),
        horas: '—',
      }));
    return [...maqUsos, ...maqManut, ...maqAbast].sort((a, b) =>
      new Date(a.data).getTime() - new Date(b.data).getTime()
    );
  }, [tipo, maquinaFiltro, usos, manutencoes, abastecimentos, inicio, fim]);

  const dadosConsolidado = useMemo(() => {
    if (tipo !== 'consolidado') return [];
    return maquinas.map((m) => {
      const maqUsos = usos.filter((u) => u.maquina_id === m.id && new Date(u.data) >= inicio && new Date(u.data) <= fim);
      const maqAbast = abastecimentos.filter((a) => a.maquina_id === m.id && new Date(a.data) >= inicio && new Date(a.data) <= fim);
      const maqManut = manutencoes.filter((mt) => {
        const d = new Date(mt.data_realizada ?? mt.data_prevista ?? mt.data);
        return mt.maquina_id === m.id && d >= inicio && d <= fim;
      });
      return {
        maquina: m.nome,
        tipo: m.tipo,
        horas_totais: maqUsos.reduce((s, u) => s + (u.horas ?? 0), 0).toFixed(1),
        litros_diesel: maqAbast.reduce((s, a) => s + (a.litros ?? 0), 0).toFixed(0),
        custo_combustivel: fmtBrl(maqAbast.reduce((s, a) => s + (a.valor ?? 0), 0)),
        custo_manutencao: fmtBrl(maqManut.reduce((s, mt) => s + (mt.custo ?? 0), 0)),
        qtd_manutencoes: String(maqManut.length),
      };
    });
  }, [tipo, maquinas, usos, abastecimentos, manutencoes, inicio, fim]);

  const dadosManutencoes = useMemo(() => {
    if (tipo !== 'manutencoes') return [];
    return filtrarManutencoesPorPeriodo(manutencoes, inicio, fim)
      .filter((m) => !tipoManutFiltro || m.tipo === tipoManutFiltro)
      .map((m) => ({
        data_prevista: formatData(m.data_prevista),
        data_realizada: formatData(m.data_realizada),
        maquina: maquinas.find((mq) => mq.id === m.maquina_id)?.nome ?? '—',
        tipo: m.tipo,
        status: m.status ?? '—',
        descricao: m.descricao,
        responsavel: m.responsavel ?? '—',
        custo: fmtBrl(m.custo),
      }));
  }, [tipo, manutencoes, inicio, fim, tipoManutFiltro, maquinas]);

  const dadosRanking = useMemo(() => {
    if (tipo !== 'ranking-custo') return [];
    const rows = agruparCustosPorMaquina(
      maquinas,
      abastecimentos.filter((a) => new Date(a.data) >= inicio && new Date(a.data) <= fim),
      filtrarManutencoesPorPeriodo(manutencoes, inicio, fim),
      usos.filter((u) => new Date(u.data) >= inicio && new Date(u.data) <= fim)
    );
    return rows.map((r) => ({
      ranking: String(r.ranking),
      maquina: r.maquina.nome,
      tipo: r.maquina.tipo,
      horas: r.horasTotais.toFixed(1),
      deprec_h: fmtBrl(r.custoHora.fixo),
      comb_h: fmtBrl(r.custoHora.combustivel),
      manut_h: fmtBrl(r.custoHora.manutencao),
      total_h: fmtBrl(r.custoHora.total),
    }));
  }, [tipo, maquinas, abastecimentos, manutencoes, usos, inicio, fim]);

  // Seleciona os dados e colunas conforme o tipo ativo
  const dadosAtivos = useMemo(() => {
    if (tipo === 'por-maquina') return dadosPorMaquina;
    if (tipo === 'consolidado') return dadosConsolidado;
    if (tipo === 'manutencoes') return dadosManutencoes;
    return dadosRanking;
  }, [tipo, dadosPorMaquina, dadosConsolidado, dadosManutencoes, dadosRanking]);

  const nomeArquivo = `frota-${tipo}-${dataInicio}-${dataFim}`;

  const TIPOS: { value: TipoRelatorio; label: string }[] = [
    { value: 'por-maquina', label: 'Relatório por Máquina' },
    { value: 'consolidado', label: 'Relatório Consolidado da Frota' },
    { value: 'manutencoes', label: 'Histórico de Manutenções' },
    { value: 'ranking-custo', label: 'Ranking por Custo/Hora' },
  ];

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Seletor de tipo ─────────────────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Tipo de Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {TIPOS.map((t) => (
              <label
                key={t.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  tipo === t.value
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  value={t.value}
                  checked={tipo === t.value}
                  onChange={() => setTipo(t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>

          {/* Período */}
          <div className="flex flex-wrap gap-4 items-end pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rel-inicio">Período inicial</Label>
              <Input
                id="rel-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-fim">Período final</Label>
              <Input
                id="rel-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-44"
              />
            </div>
          </div>

          {/* Filtros específicos por tipo */}
          {tipo === 'por-maquina' && (
            <div className="space-y-1.5">
              <Label htmlFor="rel-maquina">Máquina</Label>
              <select
                id="rel-maquina"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={maquinaFiltro}
                onChange={(e) => setMaquinaFiltro(e.target.value)}
              >
                <option value="">Selecione uma máquina…</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'manutencoes' && (
            <div className="space-y-1.5">
              <Label htmlFor="rel-tipo-manut">Tipo de manutenção</Label>
              <select
                id="rel-tipo-manut"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={tipoManutFiltro}
                onChange={(e) => setTipoManutFiltro(e.target.value)}
              >
                <option value="">Todos os tipos</option>
                <option value="Preventiva">Preventiva</option>
                <option value="Corretiva">Corretiva</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Preview ─────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl print:block">
        <CardHeader className="flex flex-row items-center justify-between print:pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Preview
            </CardTitle>
            <CardDescription>
              {TIPOS.find((t) => t.value === tipo)?.label} —{' '}
              {formatData(dataInicio)} até {formatData(dataFim)}
            </CardDescription>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportarCSV(dadosAtivos as Record<string, string | number | null | undefined>[], nomeArquivo)}
              disabled={dadosAtivos.length === 0}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Exportar CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Imprimir / PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dadosAtivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <FileText className="h-8 w-8 text-muted-foreground opacity-30" aria-hidden="true" />
              <p className="text-muted-foreground text-sm">
                {tipo === 'por-maquina' && !maquinaFiltro
                  ? 'Selecione uma máquina para gerar o relatório.'
                  : 'Nenhum dado encontrado para os filtros selecionados.'}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(dadosAtivos[0]).map((col) => (
                      <TableHead key={col} className="text-xs uppercase tracking-wide">
                        {col.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosAtivos.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} className="text-sm">
                          {tipo === 'manutencoes' && j === 2 ? (
                            <Badge variant={String(val) === 'Preventiva' ? 'outline' : 'secondary'}>
                              {String(val)}
                            </Badge>
                          ) : String(val ?? '—')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3 text-right">
                {dadosAtivos.length} registro(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
