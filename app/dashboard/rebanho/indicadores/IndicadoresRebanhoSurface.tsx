import Link from 'next/link';
import {
  AlertTriangle,
  Layers,
  Dna,
  Milk,
  Beef,
  Stethoscope,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getResumoOperacaoDia } from '@/lib/supabase/rebanho-pendencias';
import { getEstruturaRebanho } from '@/lib/supabase/rebanho-estrutura';
import { getKpisLeiteiros } from '@/lib/supabase/rebanho-leiteira';
import { queryIndicadoresReprodutivos } from '@/lib/supabase/rebanho-reproducao';
import { getCurrentFazendaId } from '@/lib/auth/helpers';
import type { Pendencia } from '@/lib/types/rebanho-pendencias';

/**
 * Superfície ÚNICA "Indicadores do Rebanho" (Fase 4 — SPEC-rebanho345 §7).
 *
 * Camada de APRESENTAÇÃO orientada a decisão. Não calcula KPI: consome apenas
 * serviços já extraídos/existentes, cada um com sua própria fonte de verdade e
 * janela (D-4.1):
 *  - Resumo executivo  → alertas/pendências da Fase 3 (getResumoOperacaoDia)
 *  - Estrutura/Composição → fonte única de categorias (getEstruturaRebanho)
 *  - Reprodução        → queryIndicadoresReprodutivos (runtime, janela própria)
 *  - Leite             → getKpisLeiteiros (serviço novo, janela 30d)
 *  - Corte             → renderizado pelo detalhe zootécnico (IndicadoresClient)
 *  - Sanidade          → mesmas pendências sanitárias (sem nova query)
 *
 * Cada seção rotula explicitamente sua base/janela quando diferem (R-4.2).
 */

const CRITICIDADE_CLASSES: Record<Pendencia['criticidade'], string> = {
  critico: 'border-l-red-500',
  urgente: 'border-l-amber-500',
  aviso: 'border-l-blue-500',
};

const CRITICIDADE_BADGE: Record<Pendencia['criticidade'], string> = {
  critico: 'bg-red-500/15 text-red-600',
  urgente: 'bg-amber-500/15 text-amber-600',
  aviso: 'bg-blue-500/15 text-blue-600',
};

function SectionHeader({
  icon,
  titulo,
  base,
}: {
  icon: React.ReactNode;
  titulo: string;
  base: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-primary" aria-hidden="true">
          {icon}
        </span>
        <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      </div>
      <span className="text-xs text-muted-foreground">{base}</span>
    </div>
  );
}

function MiniKpi({
  label,
  valor,
  sublabel,
}: {
  label: string;
  valor: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold leading-none text-foreground">{valor}</p>
      {sublabel && <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

export async function IndicadoresRebanhoSurface({
  corteDetalhe,
}: {
  /** Detalhe zootécnico (corte/efetivo: cards de desempenho, gráficos GMD/
   *  natalidade/efetivo/lotes, filtros e export) renderizado DENTRO da seção
   *  Corte. É a única superfície que lê essas séries — sem camada paralela. */
  corteDetalhe: React.ReactNode;
}) {
  const fazendaId = await getCurrentFazendaId();

  const [
    resumo,
    estrutura,
    kpisLeite,
    taxaPrenhez,
    contagemPorStatus,
    psmMedia,
    iepMedia,
    taxaConcepcaoIA,
    diasEmAberto,
    taxaServico,
    idadePrimeiraParicao,
  ] = await Promise.all([
    getResumoOperacaoDia(),
    getEstruturaRebanho(),
    getKpisLeiteiros(),
    queryIndicadoresReprodutivos.getTaxaPrenhez(fazendaId),
    queryIndicadoresReprodutivos.getContagemPorStatus(fazendaId),
    queryIndicadoresReprodutivos.getPSMMedia(fazendaId),
    queryIndicadoresReprodutivos.getIEPMedia(fazendaId),
    queryIndicadoresReprodutivos.getTaxaConcepçãoIA(fazendaId),
    queryIndicadoresReprodutivos.getDiasEmAberto(fazendaId),
    queryIndicadoresReprodutivos.getTaxaServiço(fazendaId),
    queryIndicadoresReprodutivos.getIdadePrimeiraPariçao(fazendaId),
  ]);

  // Resumo executivo: top pendências priorizadas (criticidade → prazo) +
  // contadores que orientam a decisão (não só exibição).
  const topPendencias = resumo.pendencias.slice(0, 5);
  const pendenciasSanidade = resumo.pendencias.filter((p) => p.subdominio === 'sanidade');

  return (
    <div className="space-y-8">
      {/* ===== 1. RESUMO EXECUTIVO ===== */}
      <section className="space-y-3">
        <SectionHeader
          icon={<AlertTriangle className="h-5 w-5" />}
          titulo="Resumo executivo"
          base="pendências do dia · reusa alertas da Operação"
        />
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniKpi label="Pendências totais" valor={resumo.total} sublabel="ações pendentes" />
              <MiniKpi
                label="Reprodução"
                valor={resumo.totaisPorSubdominio.reproducao}
                sublabel="partos / vacas a secar"
              />
              <MiniKpi
                label="Sanidade"
                valor={resumo.totaisPorSubdominio.sanidade}
                sublabel="vacinações"
              />
              <MiniKpi
                label="Desempenho"
                valor={resumo.totaisPorSubdominio.desempenho}
                sublabel="pesagens atrasadas"
              />
            </div>

            {topPendencias.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Prioridades</p>
                {topPendencias.map((p) => (
                  <Link
                    key={p.id}
                    href={p.href}
                    className={`flex items-center justify-between gap-3 rounded border border-l-4 p-2 transition-colors hover:bg-muted/50 ${CRITICIDADE_CLASSES[p.criticidade]}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.animal_brinco}
                        {p.animal_nome ? ` — ${p.animal_nome}` : ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{p.motivo}</p>
                    </div>
                    <Badge className={`shrink-0 ${CRITICIDADE_BADGE[p.criticidade]}`}>
                      {p.acaoSugerida}
                    </Badge>
                  </Link>
                ))}
                <Link
                  href="/dashboard/rebanho/operacao"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Ver Operação do dia <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma pendência prioritária no momento.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ===== 2. ESTRUTURA / COMPOSIÇÃO ===== */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Layers className="h-5 w-5" />}
          titulo="Estrutura / Composição"
          base="snapshot · efetivo ativo"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Efetivo por sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MiniKpi label="Total ativo" valor={estrutura.total} sublabel="animais" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leiteiro</span>
                  <span className="font-medium">{estrutura.composicao.por_vocacao.leiteiro}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Corte</span>
                  <span className="font-medium">{estrutura.composicao.por_vocacao.corte}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dupla aptidão</span>
                  <span className="font-medium">{estrutura.composicao.por_vocacao.dupla_aptidao}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Fêmeas / Machos</span>
                  <span className="font-medium">
                    {estrutura.composicao.por_sexo.Fêmea} / {estrutura.composicao.por_sexo.Macho}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(estrutura.composicao.por_categoria).length > 0 ? (
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {Object.entries(estrutura.composicao.por_categoria)
                    .sort(([, a], [, b]) => b - a)
                    .map(([categoria, total]) => (
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
                <p className="text-sm text-muted-foreground">Nenhum animal ativo cadastrado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== 3. REPRODUÇÃO ===== */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Dna className="h-5 w-5" />}
          titulo="Reprodução"
          base="runtime · status reprodutivo + eventos"
        />
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniKpi label="Taxa de prenhez" valor={`${taxaPrenhez}%`} sublabel="fêmeas aptas" />
            <MiniKpi
              label="Prenhez confirmada"
              valor={contagemPorStatus.prenha}
              sublabel="animais prenhes"
            />
            <MiniKpi
              label="PSM médio"
              valor={psmMedia !== null ? `${psmMedia} d` : '—'}
              sublabel="período de serviço"
            />
            <MiniKpi
              label="IEP médio"
              valor={iepMedia !== null ? `${iepMedia} d` : '—'}
              sublabel="intervalo entre partos"
            />
            <MiniKpi
              label="Concepção IA"
              valor={taxaConcepcaoIA !== null ? `${taxaConcepcaoIA}%` : '—'}
              sublabel="diag. positivos / IAs"
            />
            <MiniKpi
              label="Dias em aberto"
              valor={diasEmAberto.media_dias !== null ? `${diasEmAberto.media_dias} d` : '—'}
              sublabel={`${diasEmAberto.animais_count} vacas`}
            />
            <MiniKpi
              label="Taxa de serviço"
              valor={taxaServico !== null ? `${taxaServico}%` : '—'}
              sublabel="coberturas / aptas"
            />
            <MiniKpi
              label="Idade 1º parto"
              valor={idadePrimeiraParicao !== null ? `${idadePrimeiraParicao} m` : '—'}
              sublabel="meses"
            />
          </CardContent>
        </Card>
        <Link
          href="/dashboard/rebanho/reproducao"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Abrir painel de reprodução <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* ===== 4. LEITE ===== */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Milk className="h-5 w-5" />}
          titulo="Leite"
          base="janela 30 dias · produção"
        />
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <MiniKpi
              label="Produção hoje"
              valor={`${kpisLeite.producaoHojeLitros.toFixed(1)} L`}
            />
            <MiniKpi
              label="Média/dia"
              valor={`${kpisLeite.producaoMediaDiariaLitros.toFixed(1)} L`}
              sublabel="últimos 30 dias"
            />
            <MiniKpi
              label="Média/vaca"
              valor={`${kpisLeite.producaoMediaPorVacaLitros.toFixed(1)} L`}
              sublabel="por vaca em lactação"
            />
            <MiniKpi
              label="DEL médio"
              valor={kpisLeite.delMedioDias !== null ? `${kpisLeite.delMedioDias} d` : '—'}
              sublabel="dias em lactação"
            />
            <MiniKpi
              label="Em lactação"
              valor={kpisLeite.vacasEmLactacao}
              sublabel={`${kpisLeite.vacasEmSeco} em seco`}
            />
            <MiniKpi
              label="Eficiência"
              valor={kpisLeite.taxaEficienciaPct !== null ? `${kpisLeite.taxaEficienciaPct}%` : '—'}
              sublabel="vacas em produção"
            />
          </CardContent>
        </Card>
        <Link
          href="/dashboard/rebanho/leiteira"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Abrir gestão leiteira <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* ===== 5. CORTE / DESEMPENHO E EFETIVO ===== */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Beef className="h-5 w-5" />}
          titulo="Corte e desempenho"
          base="cálculo · pesagens + eventos · com filtros"
        />
        <p className="text-sm text-muted-foreground">
          GMD, taxas de desempenho/efetivo e séries históricas — derivados das pesagens e eventos.
          Filtre por período/lote/categoria e exporte. Detalhe por animal na ficha e no{' '}
          <Link href="/dashboard/rebanho/corte" className="text-primary hover:underline">
            painel de Corte
          </Link>
          .
        </p>
        {corteDetalhe}
      </section>

      {/* ===== 6. SANIDADE ===== */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Stethoscope className="h-5 w-5" />}
          titulo="Sanidade"
          base="próximas/vencidas em 30 dias"
        />
        <Card>
          <CardContent className="space-y-2 p-4">
            <MiniKpi
              label="Vacinações pendentes"
              valor={pendenciasSanidade.length}
              sublabel="próximas ou vencidas"
            />
            {pendenciasSanidade.length > 0 ? (
              <div className="space-y-1">
                {pendenciasSanidade.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    href={p.href}
                    className="flex items-center justify-between gap-2 rounded border p-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate text-foreground">
                      {p.animal_brinco} — {p.motivo}
                    </span>
                    <Badge className={`shrink-0 ${CRITICIDADE_BADGE[p.criticidade]}`}>
                      {p.criticidade}
                    </Badge>
                  </Link>
                ))}
                <Link
                  href="/dashboard/rebanho/sanidade"
                  className="inline-flex items-center gap-1 pt-1 text-sm text-primary hover:underline"
                >
                  Abrir sanidade <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma vacinação pendente.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
