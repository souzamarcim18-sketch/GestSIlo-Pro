'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Truck,
  Pencil,
  Trash2,
  Plus,
  Wrench,
  Fuel,
  BookOpen,
  Clock,
  Gauge,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MaquinaDialog } from '../components/dialogs/MaquinaDialog';
import { UsoDialog } from '../components/dialogs/UsoDialog';
import { ManutencaoDialog } from '../components/dialogs/ManutencaoDialog';
import { AbastecimentoDialog } from '../components/dialogs/AbastecimentoDialog';
import {
  type Maquina,
  type UsoMaquina,
  type Manutencao,
  type Abastecimento,
  type Talhao,
  type Profile,
} from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { formatBRL, formatDate } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

interface MaquinaDetailClientProps {
  maquinaId: string;
  profile: Profile | null;
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Ativo': 'default',
  'Em manutenção': 'secondary',
  'Parado': 'outline',
  'Vendido': 'destructive',
};

// Evento unificado da timeline
type TipoEvento = 'uso' | 'manutencao' | 'abastecimento';
interface EventoTimeline {
  id: string;
  tipo: TipoEvento;
  data: string;
  titulo: string;
  detalhe: string;
  valor: number | null;
}

const EVENTO_META: Record<TipoEvento, { label: string; icon: React.ElementType; cor: string }> = {
  uso: { label: 'Uso', icon: BookOpen, cor: 'text-blue-600 dark:text-blue-400' },
  manutencao: { label: 'Manutenção', icon: Wrench, cor: 'text-amber-600 dark:text-amber-400' },
  abastecimento: { label: 'Abastecimento', icon: Fuel, cor: 'text-emerald-600 dark:text-emerald-400' },
};

function valorAtualEstimado(maquina: Maquina): number | null {
  if (!maquina.valor_aquisicao || !maquina.data_aquisicao) return null;
  const anosUso = differenceInDays(new Date(), new Date(maquina.data_aquisicao)) / 365;
  const depAnual = maquina.valor_aquisicao / (maquina.vida_util_anos ?? 10);
  return Math.max(0, maquina.valor_aquisicao - depAnual * anosUso);
}

export function MaquinaDetailClient({ maquinaId, profile }: MaquinaDetailClientProps) {
  const router = useRouter();
  const isAdmin = profile?.perfil === 'Administrador';

  const [maquina, setMaquina] = useState<Maquina | null>(null);
  const [usos, setUsos] = useState<UsoMaquina[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [usoOpen, setUsoOpen] = useState(false);
  const [manutencaoOpen, setManutencaoOpen] = useState(false);
  const [abastecimentoOpen, setAbastecimentoOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadEventos = useCallback(async () => {
    const [u, m, a] = await Promise.all([
      q.usoMaquinas.listByMaquina(maquinaId),
      q.manutencoes.listByMaquina(maquinaId),
      q.abastecimentos.listByMaquina(maquinaId),
    ]);
    setUsos(u);
    setManutencoes(m);
    setAbastecimentos(a);
  }, [maquinaId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [todasMaquinas, tals] = await Promise.all([
          q.maquinas.list(),
          q.talhoes.list(),
        ]);
        if (cancelled) return;
        const maq = todasMaquinas.find((m) => m.id === maquinaId) ?? null;
        if (!maq) {
          setNotFound(true);
          return;
        }
        setMaquina(maq);
        setTalhoes(tals);
        await loadEventos();
      } catch {
        if (!cancelled) toast.error('Erro ao carregar dados da máquina');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [maquinaId, loadEventos]);

  const refreshMaquina = useCallback(async () => {
    const todas = await q.maquinas.list();
    setMaquina(todas.find((m) => m.id === maquinaId) ?? null);
  }, [maquinaId]);

  // KPIs agregados
  const horasTotais = useMemo(() => usos.reduce((s, u) => s + (u.horas ?? 0), 0), [usos]);
  const kmTotais = useMemo(() => usos.reduce((s, u) => s + (u.km ?? 0), 0), [usos]);
  const custoManutencoes = useMemo(() => manutencoes.reduce((s, m) => s + (m.custo ?? 0), 0), [manutencoes]);
  const custoCombustivel = useMemo(() => abastecimentos.reduce((s, a) => s + (a.valor ?? 0), 0), [abastecimentos]);

  // Timeline unificada
  const timeline = useMemo<EventoTimeline[]>(() => {
    const usoEv: EventoTimeline[] = usos.map((u) => ({
      id: `uso-${u.id}`,
      tipo: 'uso',
      data: u.data,
      titulo: u.tipo_operacao || 'Uso registrado',
      detalhe: [
        u.horas != null ? `${u.horas} h` : null,
        u.km != null ? `${u.km} km` : null,
        u.area_ha != null ? `${u.area_ha} ha` : null,
      ].filter(Boolean).join(' · ') || '—',
      valor: null,
    }));
    const manEv: EventoTimeline[] = manutencoes.map((m) => ({
      id: `man-${m.id}`,
      tipo: 'manutencao',
      data: m.data,
      titulo: `${m.tipo}${m.descricao ? ` — ${m.descricao}` : ''}`,
      detalhe: m.status ?? '—',
      valor: m.custo ?? null,
    }));
    const absEv: EventoTimeline[] = abastecimentos.map((a) => ({
      id: `abs-${a.id}`,
      tipo: 'abastecimento',
      data: a.data,
      titulo: `${a.litros ?? 0} L${a.combustivel ? ` de ${a.combustivel}` : ''}`,
      detalhe: a.valor && a.litros ? `R$ ${(a.valor / a.litros).toFixed(3)}/L` : '—',
      valor: a.valor ?? null,
    }));
    return [...usoEv, ...manEv, ...absEv].sort(
      (x, y) => new Date(y.data).getTime() - new Date(x.data).getTime()
    );
  }, [usos, manutencoes, abastecimentos]);

  const handleDeleteMaquina = async () => {
    if (!maquina) return;
    if (!confirm(`Excluir "${maquina.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await q.maquinas.remove(maquina.id);
      toast.success('Máquina excluída');
      router.push('/dashboard/frota');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir máquina');
      setDeleting(false);
    }
  };

  const handleDeleteEvento = async (ev: EventoTimeline) => {
    if (!confirm('Excluir este registro?')) return;
    const rawId = ev.id.replace(/^(uso|man|abs)-/, '');
    try {
      if (ev.tipo === 'uso') await q.usoMaquinas.remove(rawId);
      else if (ev.tipo === 'manutencao') await q.manutencoes.remove(rawId);
      else await q.abastecimentos.remove(rawId);
      toast.success('Registro removido');
      await loadEventos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !maquina) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/frota"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Frota
        </Link>
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Truck className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
            <p className="text-lg font-semibold text-muted-foreground">Máquina não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const valorAtual = valorAtualEstimado(maquina);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + cabeçalho */}
      <div>
        <Link
          href="/dashboard/frota"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3 w-3" />
          Frota
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(0,196,90,0.12)', border: '1px solid rgba(0,196,90,0.2)' }}
            >
              <Truck className="h-5 w-5 text-[#00c45a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{maquina.nome}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <span>{maquina.tipo}</span>
                {[maquina.marca, maquina.modelo, maquina.ano].filter(Boolean).length > 0 && (
                  <span>· {[maquina.marca, maquina.modelo, maquina.ano].filter(Boolean).join(' ')}</span>
                )}
                {maquina.identificacao && <span>· {maquina.identificacao}</span>}
                {maquina.status && (
                  <Badge variant={STATUS_BADGE[maquina.status] ?? 'outline'}>{maquina.status}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00A651] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#00904a]">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Registrar evento
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setUsoOpen(true)}>
                  <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                  Uso / Horas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManutencaoOpen(true)}>
                  <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                  Manutenção
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAbastecimentoOpen(true)}>
                  <Fuel className="mr-2 h-4 w-4" aria-hidden="true" />
                  Abastecimento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditOpen(true)} aria-label="Editar máquina">
              <Pencil className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={handleDeleteMaquina}
                disabled={deleting}
                aria-label="Excluir máquina"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-muted-foreground">Horas totais</p>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-xl sm:text-2xl font-bold">{horasTotais.toFixed(1)} h</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-muted-foreground">KM totais</p>
              <Gauge className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-xl sm:text-2xl font-bold">{kmTotais.toFixed(0)} km</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-muted-foreground">Combustível</p>
              <Fuel className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-xl sm:text-2xl font-bold">{formatBRL(custoCombustivel)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-muted-foreground">Manutenções</p>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-xl sm:text-2xl font-bold">{formatBRL(custoManutencoes)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dados técnicos / depreciação */}
      {valorAtual != null && (
        <Card className="rounded-2xl">
          <CardContent className="pt-4 pb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Valor de aquisição: </span>
              <span className="font-semibold">{formatBRL(maquina.valor_aquisicao ?? 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Valor atual estimado: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatBRL(valorAtual)}</span>
            </div>
            {maquina.vida_util_anos != null && (
              <div>
                <span className="text-muted-foreground">Vida útil: </span>
                <span className="font-semibold">{maquina.vida_util_anos} anos</span>
              </div>
            )}
            {maquina.horimetro_atual != null && (
              <div>
                <span className="text-muted-foreground">Horímetro atual: </span>
                <span className="font-semibold">{maquina.horimetro_atual} h</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline de eventos */}
      <Card className="rounded-2xl">
        <CardContent className="pt-5">
          <h2 className="text-base font-semibold mb-4">Histórico de eventos</h2>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <Clock className="h-8 w-8 text-muted-foreground opacity-30" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Nenhum evento registrado. Use &quot;Registrar evento&quot; para começar.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {timeline.map((ev) => {
                const meta = EVENTO_META[ev.tipo];
                const Icon = meta.icon;
                return (
                  <li
                    key={ev.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/30 group"
                  >
                    <div className={`mt-0.5 shrink-0 ${meta.cor}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                        <span className="text-sm font-medium truncate">{ev.titulo}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{ev.detalhe}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-muted-foreground">{formatDate(ev.data)}</p>
                      {ev.valor != null && (
                        <p className="text-sm font-semibold">{formatBRL(ev.valor)}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => handleDeleteEvento(ev)}
                      aria-label="Remover registro"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <MaquinaDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        maquina={maquina}
        onSuccess={async () => {
          setEditOpen(false);
          await refreshMaquina();
        }}
      />
      <UsoDialog
        open={usoOpen}
        onOpenChange={setUsoOpen}
        maquinas={[maquina]}
        talhoes={talhoes}
        onSuccess={async () => {
          setUsoOpen(false);
          await loadEventos();
        }}
      />
      <ManutencaoDialog
        open={manutencaoOpen}
        onOpenChange={setManutencaoOpen}
        maquinas={[maquina]}
        onSuccess={async () => {
          setManutencaoOpen(false);
          await loadEventos();
        }}
        onMaquinaStatusChange={() => refreshMaquina()}
      />
      <AbastecimentoDialog
        open={abastecimentoOpen}
        onOpenChange={setAbastecimentoOpen}
        maquinas={[maquina]}
        onSuccess={async () => {
          setAbastecimentoOpen(false);
          await loadEventos();
        }}
      />
    </div>
  );
}
