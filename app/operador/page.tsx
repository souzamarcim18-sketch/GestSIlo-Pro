'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Profile } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import {
  registrarRetiradaSilo,
  registrarPerdaSilo,
  listLotesCliente,
  type LoteSimples,
} from '@/lib/supabase/operador';
import { getConfiguracoesFazenda, type ConfiguracoesFazenda } from '@/lib/supabase/configuracoes';
import { enqueue } from '@/lib/db/syncQueue';
import { getDb } from '@/lib/db/localDb';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useSyncOnReconnect } from '@/lib/hooks/useSyncOnReconnect';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authLog, authError } from '@/lib/auth/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LogOut, PackageMinus, Trash2, User, Home, Database, ChevronRight, Check } from 'lucide-react';
import type { Silo } from '@/lib/supabase';

// ── Tipos locais ──────────────────────────────────────────────────────────────

type Etapa = 'silo' | 'acao' | 'retirada' | 'descarte';
type UnidadeMedida = 'toneladas' | 'conchas' | 'vagoes';

const TIPOS_PERDA = [
  { value: 'Aeróbica', label: 'Aeróbica (Aquecimento)' },
  { value: 'Efluente', label: 'Efluente (Chorume)' },
  { value: 'Deterioração', label: 'Deterioração (Mofo)' },
  { value: 'Outro', label: 'Outro' },
] as const;

const ULTIMO_SILO_KEY = 'gestsilo:operador:ultimo_silo';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModoOperadorPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [silos, setSilos] = useState<Silo[]>([]);
  const [lotes, setLotes] = useState<LoteSimples[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, updateStatus } = useOfflineSync();
  const { lastSyncAt } = useSyncOnReconnect();

  // fluxo em etapas
  const [etapa, setEtapa] = useState<Etapa>('silo');
  const [siloSelecionado, setSiloSelecionado] = useState<Silo | null>(null);

  // campos retirada
  const [loteId, setLoteId] = useState('');
  const [loteNome, setLoteNome] = useState('');
  const [qtdRetirada, setQtdRetirada] = useState('');
  const [dataRetirada, setDataRetirada] = useState(todayISO());
  const [obsRetirada, setObsRetirada] = useState('');

  // campos descarte
  const [tipoPerda, setTipoPerda] = useState('');
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [qtdDescarte, setQtdDescarte] = useState('');
  const [dataDescarte, setDataDescarte] = useState(todayISO());
  const [obsDescarte, setObsDescarte] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesFazenda | null>(null);

  // unidade de medida — retirada
  const [unidadeRetirada, setUnidadeRetirada] = useState<UnidadeMedida>('toneladas');
  const [qtdUnidadeRetirada, setQtdUnidadeRetirada] = useState('');

  // unidade de medida — descarte
  const [unidadeDescarte, setUnidadeDescarte] = useState<UnidadeMedida>('toneladas');
  const [qtdUnidadeDescarte, setQtdUnidadeDescarte] = useState('');

  // ── Carregar dados ──────────────────────────────────────────────────────────

  const checkAuth = useCallback(async () => {
    try {
      authLog('operador: carregando perfil');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, perfil, fazenda_id, fazendas(nome)')
        .eq('id', user!.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) {
        setError('Perfil não encontrado. Contate o administrador.');
        return;
      }
      if (profileData.perfil !== 'Operador') {
        authLog('operador: perfil não é Operador, redirecionando');
        router.push('/dashboard');
        return;
      }

      setProfile(profileData as unknown as Profile);

      const [silosData, lotesData, configData] = await Promise.all([
        q.silos.list(),
        listLotesCliente(),
        getConfiguracoesFazenda(),
      ]);
      setConfiguracoes(configData);
      setSilos(silosData);
      setLotes(lotesData);

      // pré-selecionar último silo usado
      const ultimoId = localStorage.getItem(ULTIMO_SILO_KEY);
      if (ultimoId) {
        const found = silosData.find((s) => s.id === ultimoId);
        if (found) setSiloSelecionado(found);
      }

      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      authError('operador:', msg);
      setError('Erro ao carregar dados. Tente novamente ou contacte o suporte.');
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    checkAuth();
  }, [user, authLoading, router, checkAuth]);

  // Hidrata o cache IndexedDB com movimentações recentes do silo quando online
  useEffect(() => {
    if (!isOnline) return;
    async function hydrate() {
      const { data } = await supabase
        .from('movimentacoes_silo')
        .select('id, silo_id, tipo, subtipo, quantidade, data, responsavel, observacao, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data) return;
      const db = await getDb();
      if (!db) return;
      for (const mov of data) {
        await db.put('movimentacoes_silo', mov as Record<string, unknown>);
      }
    }
    hydrate();
  }, [isOnline]);

  // ── Selecionar silo ─────────────────────────────────────────────────────────

  function selecionarSilo(silo: Silo) {
    setSiloSelecionado(silo);
    localStorage.setItem(ULTIMO_SILO_KEY, silo.id);
    setEtapa('acao');
  }

  // ── Conversão de unidades ────────────────────────────────────────────────────

  function converterParaToneladas(qtd: string, unidade: UnidadeMedida): number | null {
    const n = parseFloat(qtd);
    if (isNaN(n) || n <= 0) return null;
    if (unidade === 'toneladas') return n;
    if (unidade === 'conchas' && configuracoes?.peso_concha_ton) return n * configuracoes.peso_concha_ton;
    if (unidade === 'vagoes' && configuracoes?.peso_vagao_ton) return n * configuracoes.peso_vagao_ton;
    return null;
  }

  function labelUnidade(unidade: UnidadeMedida): string {
    if (unidade === 'conchas') return 'conchas';
    if (unidade === 'vagoes') return 'vagões';
    return 'toneladas';
  }

  // Aviso (não bloqueante) quando a quantidade informada passa do volume total
  // ensilado do silo — sinaliza provável erro de digitação/unidade em campo.
  function excedeVolume(qtd: string, unidade: UnidadeMedida): boolean {
    const ton = converterParaToneladas(qtd, unidade);
    const volume = siloSelecionado?.volume_ensilado_ton_mv ?? null;
    if (ton === null || volume === null || volume <= 0) return false;
    return ton > volume + 1e-6;
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  function resetRetirada() {
    setLoteId('');
    setLoteNome('');
    setQtdRetirada('');
    setQtdUnidadeRetirada('');
    setUnidadeRetirada('toneladas');
    setDataRetirada(todayISO());
    setObsRetirada('');
  }

  function resetDescarte() {
    setTipoPerda('');
    setMotivoDescarte('');
    setQtdDescarte('');
    setQtdUnidadeDescarte('');
    setUnidadeDescarte('toneladas');
    setDataDescarte(todayISO());
    setObsDescarte('');
  }

  function voltarParaAcao() {
    resetRetirada();
    resetDescarte();
    setEtapa('acao');
  }

  function voltarParaSilo() {
    resetRetirada();
    resetDescarte();
    setEtapa('silo');
  }

  // ── Submit Retirada ─────────────────────────────────────────────────────────

  async function handleRetirada(e: React.FormEvent) {
    e.preventDefault();
    if (!siloSelecionado || !profile) return;

    const qtdFinal = unidadeRetirada === 'toneladas'
      ? qtdRetirada
      : qtdUnidadeRetirada;

    const quantidadeTon = converterParaToneladas(qtdFinal, unidadeRetirada);
    if (!quantidadeTon) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    setSubmitting(true);

    const loteNomeFinal = loteId
      ? (lotes.find((l) => l.id === loteId)?.nome ?? loteNome)
      : loteNome;

    try {
      if (isOnline) {
        await registrarRetiradaSilo({
          siloId: siloSelecionado.id,
          quantidade: quantidadeTon,
          responsavel: profile.nome,
          loteNome: loteNomeFinal || undefined,
          data: dataRetirada,
          observacao: obsRetirada || undefined,
        });
        toast.success('Retirada registrada!');
      } else {
        const obsPartes = ['Retirada via Modo Operador (Offline)'];
        if (loteNomeFinal) obsPartes.push(`Lote: ${loteNomeFinal}`);
        if (unidadeRetirada !== 'toneladas') obsPartes.push(`${qtdFinal} ${labelUnidade(unidadeRetirada)} = ${quantidadeTon.toFixed(3)} t`);
        if (obsRetirada) obsPartes.push(obsRetirada);
        await enqueue('movimentacoes_silo', 'INSERT', {
          id: crypto.randomUUID(),
          silo_id: siloSelecionado.id,
          tipo: 'Saída',
          subtipo: 'Uso na alimentação',
          quantidade: quantidadeTon,
          data: dataRetirada,
          responsavel: profile.nome,
          observacao: obsPartes.join(' | '),
        });
        updateStatus();
        toast.warning('Offline — salvo localmente. Sincronizará quando conectar.');
      }
      resetRetirada();
      setEtapa('acao');
    } catch {
      toast.error('Erro ao registrar retirada');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submit Descarte ─────────────────────────────────────────────────────────

  async function handleDescarte(e: React.FormEvent) {
    e.preventDefault();
    if (!siloSelecionado || !tipoPerda || !profile) return;

    const qtdFinalDescarte = unidadeDescarte === 'toneladas'
      ? qtdDescarte
      : qtdUnidadeDescarte;

    const quantidadeDescarteTon = converterParaToneladas(qtdFinalDescarte, unidadeDescarte);
    if (!quantidadeDescarteTon) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    setSubmitting(true);

    try {
      if (isOnline) {
        await registrarPerdaSilo({
          siloId: siloSelecionado.id,
          quantidade: quantidadeDescarteTon,
          responsavel: profile.nome,
          tipoPerda,
          motivo: motivoDescarte || undefined,
          data: dataDescarte,
          observacao: obsDescarte || undefined,
        });
        toast.success('Descarte registrado!');
      } else {
        const obsPartes = [`Descarte: ${tipoPerda} (Offline)`];
        if (motivoDescarte) obsPartes.push(`Motivo: ${motivoDescarte}`);
        if (unidadeDescarte !== 'toneladas') obsPartes.push(`${qtdFinalDescarte} ${labelUnidade(unidadeDescarte)} = ${quantidadeDescarteTon.toFixed(3)} t`);
        if (obsDescarte) obsPartes.push(obsDescarte);
        await enqueue('movimentacoes_silo', 'INSERT', {
          id: crypto.randomUUID(),
          silo_id: siloSelecionado.id,
          tipo: 'Saída',
          subtipo: 'Descarte',
          quantidade: quantidadeDescarteTon,
          data: dataDescarte,
          responsavel: profile.nome,
          observacao: obsPartes.join(' | '),
        });
        updateStatus();
        toast.warning('Offline — salvo localmente. Sincronizará quando conectar.');
      }
      resetDescarte();
      setEtapa('acao');
    } catch {
      toast.error('Erro ao registrar descarte');
    } finally {
      setSubmitting(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ── Estados de erro / carregamento ─────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Erro ao Carregar</h1>
          <p className="text-zinc-300 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/login')} className="bg-primary hover:bg-primary/90">
              Voltar ao Login
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-900">
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" role="status" aria-label="Carregando">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" aria-hidden="true" />
      </div>
    );
  }

  // ── Layout base ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">

      {/* Header fixo */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div>
          <h1 className="text-xl font-black tracking-tight text-primary leading-none">GestSilo  </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">
            {(profile as unknown as { fazendas?: { nome?: string } })?.fazendas?.nome ?? 'Fazenda'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {profile?.perfil === 'Administrador' && (
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} aria-label="Dashboard" className="text-zinc-400 hover:text-zinc-100">
              <Home className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair" className="text-zinc-400 hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Breadcrumb de etapas */}
      <div className="flex items-center gap-2 px-5 py-3 text-xs text-zinc-500 border-b border-zinc-800/50">
        <button
          onClick={voltarParaSilo}
          className={`font-medium transition-colors ${etapa === 'silo' ? 'text-primary' : 'hover:text-zinc-300 cursor-pointer'}`}
        >
          Silo
        </button>
        <ChevronRight className="w-3 h-3" />
        <button
          onClick={etapa !== 'silo' ? voltarParaAcao : undefined}
          className={`font-medium transition-colors ${etapa === 'acao' ? 'text-primary' : etapa !== 'silo' ? 'hover:text-zinc-300 cursor-pointer' : 'opacity-40'}`}
        >
          Ação
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className={`font-medium ${etapa === 'retirada' || etapa === 'descarte' ? 'text-primary' : 'opacity-40'}`}>
          {etapa === 'retirada' ? 'Fornecimento' : etapa === 'descarte' ? 'Descarte' : 'Detalhes'}
        </span>
      </div>

      {/* Identificação do Operador */}
      <div className="flex items-center gap-3 px-5 py-3 bg-zinc-900/40 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <User className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 uppercase tracking-tight">Operador</p>
          <p className="text-sm font-bold truncate">{profile?.nome}</p>
        </div>
        {siloSelecionado && etapa !== 'silo' && (
          <>
            <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 uppercase tracking-tight">Silo</p>
              <p className="text-sm font-bold truncate text-primary">{siloSelecionado.nome}</p>
            </div>
          </>
        )}
      </div>

      {/* Conteúdo por etapa */}
      <main className="flex-1 overflow-y-auto px-5 py-6">

        {/* ── ETAPA 1: Selecionar Silo ──────────────────────────────────────── */}
        {etapa === 'silo' && (
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">Escolha o Silo</h2>
            {silos.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <Database className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">Nenhum silo cadastrado</p>
              </div>
            ) : (
              silos.map((silo) => {
                const isUltimo = siloSelecionado?.id === silo.id;
                return (
                  <button
                    key={silo.id}
                    onClick={() => selecionarSilo(silo)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all active:scale-98 flex items-center justify-between gap-3 ${
                      isUltimo
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUltimo ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{silo.nome}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {silo.tipo}
                          {silo.cultura_ensilada ? ` · ${silo.cultura_ensilada}` : ''}
                          {silo.volume_ensilado_ton_mv ? ` · ${silo.volume_ensilado_ton_mv.toFixed(1)} t` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isUltimo && <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">último</span>}
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── ETAPA 2: Escolher Ação ────────────────────────────────────────── */}
        {etapa === 'acao' && (
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">O que deseja registrar?</h2>
            <p className="text-sm text-zinc-500">Silo: <span className="text-zinc-300 font-medium">{siloSelecionado?.nome}</span></p>

            <button
              onClick={() => setEtapa('retirada')}
              className="w-full h-24 bg-primary hover:bg-primary/90 active:scale-95 transition-all rounded-3xl flex items-center justify-center gap-4 shadow-xl shadow-primary/20"
            >
              <PackageMinus className="w-9 h-9 text-white" />
              <div className="text-left">
                <p className="text-xl font-black text-white uppercase tracking-tight leading-none">Fornecimento</p>
                <p className="text-sm text-white/70 mt-0.5">Retirada para alimentação</p>
              </div>
            </button>

            <button
              onClick={() => setEtapa('descarte')}
              className="w-full h-24 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-3xl flex items-center justify-center gap-4 border border-zinc-700 shadow-xl"
            >
              <Trash2 className="w-9 h-9 text-red-400" />
              <div className="text-left">
                <p className="text-xl font-black text-zinc-100 uppercase tracking-tight leading-none">Descarte</p>
                <p className="text-sm text-zinc-400 mt-0.5">Perdas e deterioração</p>
              </div>
            </button>

            <button
              onClick={voltarParaSilo}
              className="w-full text-sm text-zinc-500 hover:text-zinc-300 py-3 transition-colors"
            >
              ← Trocar silo
            </button>
          </div>
        )}

        {/* ── ETAPA 3a: Formulário Fornecimento ────────────────────────────── */}
        {etapa === 'retirada' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-zinc-100 mb-1">Fornecimento</h2>
            <p className="text-sm text-zinc-500 mb-6">Silo: <span className="text-primary font-medium">{siloSelecionado?.nome}</span></p>

            <form onSubmit={handleRetirada} className="space-y-5" noValidate>

              {/* Lote */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-200">
                  Lote <span className="text-zinc-500 font-normal">(opcional)</span>
                </Label>
                {lotes.length > 0 ? (
                  <Select
                    value={loteId}
                    onValueChange={(v: string | null) => {
                      setLoteId(v ?? '');
                      setLoteNome('');
                    }}
                  >
                    <SelectTrigger className="h-14 bg-zinc-800 border-zinc-700 text-base rounded-2xl">
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectItem value="__nenhum__" className="text-base py-3 text-zinc-400">
                        Sem lote específico
                      </SelectItem>
                      {lotes.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-base py-3">
                          {l.nome}
                          {l.tipo_rebanho ? ` (${l.tipo_rebanho})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="text"
                    placeholder="Nome do lote (ex: Vacas em lactação)"
                    className="h-14 bg-zinc-800 border-zinc-700 text-base rounded-2xl"
                    value={loteNome}
                    onChange={(e) => setLoteNome(e.target.value)}
                  />
                )}
              </div>

              {/* Quantidade */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-zinc-200">
                  Quantidade <span className="text-red-400">*</span>
                </Label>

                {/* Seletor de unidade */}
                {(configuracoes?.peso_concha_ton || configuracoes?.peso_vagao_ton) && (
                  <div className="grid grid-cols-3 gap-2">
                    {(['toneladas', 'conchas', 'vagoes'] as UnidadeMedida[])
                      .filter((u) => {
                        if (u === 'toneladas') return true;
                        if (u === 'conchas') return !!configuracoes?.peso_concha_ton;
                        if (u === 'vagoes') return !!configuracoes?.peso_vagao_ton;
                        return false;
                      })
                      .map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => { setUnidadeRetirada(u); setQtdUnidadeRetirada(''); setQtdRetirada(''); }}
                          className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all capitalize ${
                            unidadeRetirada === u
                              ? 'border-primary/60 bg-primary/10 text-primary'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          {u === 'toneladas' ? 'Toneladas' : u === 'conchas' ? 'Conchas' : 'Vagões'}
                        </button>
                      ))}
                  </div>
                )}

                {unidadeRetirada === 'toneladas' ? (
                  <Input
                    id="qtd-retirada"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-16 bg-zinc-800 border-zinc-700 text-3xl rounded-2xl text-center font-bold"
                    value={qtdRetirada}
                    onChange={(e) => setQtdRetirada(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div className="space-y-1">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      inputMode="numeric"
                      placeholder="0"
                      className="h-16 bg-zinc-800 border-zinc-700 text-3xl rounded-2xl text-center font-bold"
                      value={qtdUnidadeRetirada}
                      onChange={(e) => setQtdUnidadeRetirada(e.target.value)}
                      autoFocus
                    />
                    {qtdUnidadeRetirada && parseFloat(qtdUnidadeRetirada) > 0 && (
                      <p className="text-xs text-primary text-center font-medium">
                        ≈ {(parseFloat(qtdUnidadeRetirada) * (unidadeRetirada === 'conchas' ? (configuracoes?.peso_concha_ton ?? 0) : (configuracoes?.peso_vagao_ton ?? 0))).toFixed(3)} t
                      </p>
                    )}
                  </div>
                )}

                {siloSelecionado?.volume_ensilado_ton_mv && (
                  <p className="text-xs text-zinc-500 text-center">
                    Volume ensilado: {siloSelecionado.volume_ensilado_ton_mv.toFixed(1)} t
                  </p>
                )}

                {excedeVolume(
                  unidadeRetirada === 'toneladas' ? qtdRetirada : qtdUnidadeRetirada,
                  unidadeRetirada
                ) && (
                  <p className="text-sm text-amber-400 text-center font-medium flex items-center justify-center gap-1.5">
                    ⚠️ Quantidade maior que todo o volume do silo. Confira a unidade.
                  </p>
                )}
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label htmlFor="data-retirada" className="text-sm font-semibold text-zinc-200">
                  Data
                </Label>
                <Input
                  id="data-retirada"
                  type="date"
                  className="h-14 bg-zinc-800 border-zinc-700 text-base rounded-2xl"
                  value={dataRetirada}
                  onChange={(e) => setDataRetirada(e.target.value)}
                  max={todayISO()}
                />
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="obs-retirada" className="text-sm font-semibold text-zinc-200">
                  Observações <span className="text-zinc-500 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="obs-retirada"
                  placeholder="Ex: Animal doente, consumo parcial..."
                  className="bg-zinc-800 border-zinc-700 text-base rounded-2xl resize-none min-h-[80px]"
                  value={obsRetirada}
                  onChange={(e) => setObsRetirada(e.target.value)}
                  maxLength={400}
                />
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting || !(unidadeRetirada === 'toneladas' ? qtdRetirada : qtdUnidadeRetirada)}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-lg font-black rounded-2xl"
                >
                  {submitting ? 'Registrando...' : (
                    <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Confirmar Fornecimento</span>
                  )}
                </Button>
                <button type="button" onClick={voltarParaAcao} className="w-full text-sm text-zinc-500 hover:text-zinc-300 py-2 transition-colors">
                  ← Voltar
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ── ETAPA 3b: Formulário Descarte ────────────────────────────────── */}
        {etapa === 'descarte' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-zinc-100 mb-1">Descarte / Perda</h2>
            <p className="text-sm text-zinc-500 mb-6">Silo: <span className="text-primary font-medium">{siloSelecionado?.nome}</span></p>

            <form onSubmit={handleDescarte} className="space-y-5" noValidate>

              {/* Tipo de perda */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-200">
                  Tipo de perda <span className="text-red-400">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_PERDA.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipoPerda(t.value)}
                      className={`py-3 px-3 rounded-2xl border text-sm font-semibold transition-all text-left leading-tight ${
                        tipoPerda === t.value
                          ? 'border-red-500/60 bg-red-950/40 text-red-300'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo (texto livre) */}
              <div className="space-y-2">
                <Label htmlFor="motivo-descarte" className="text-sm font-semibold text-zinc-200">
                  Motivo <span className="text-zinc-500 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="motivo-descarte"
                  type="text"
                  placeholder="Ex: Silo aberto há 30 dias, chuva excessiva..."
                  className="h-14 bg-zinc-800 border-zinc-700 text-base rounded-2xl"
                  value={motivoDescarte}
                  onChange={(e) => setMotivoDescarte(e.target.value)}
                  maxLength={200}
                />
              </div>

              {/* Quantidade */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-zinc-200">
                  Quantidade <span className="text-red-400">*</span>
                </Label>

                {/* Seletor de unidade */}
                {(configuracoes?.peso_concha_ton || configuracoes?.peso_vagao_ton) && (
                  <div className="grid grid-cols-3 gap-2">
                    {(['toneladas', 'conchas', 'vagoes'] as UnidadeMedida[])
                      .filter((u) => {
                        if (u === 'toneladas') return true;
                        if (u === 'conchas') return !!configuracoes?.peso_concha_ton;
                        if (u === 'vagoes') return !!configuracoes?.peso_vagao_ton;
                        return false;
                      })
                      .map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => { setUnidadeDescarte(u); setQtdUnidadeDescarte(''); setQtdDescarte(''); }}
                          className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all capitalize ${
                            unidadeDescarte === u
                              ? 'border-red-500/60 bg-red-950/40 text-red-300'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          {u === 'toneladas' ? 'Toneladas' : u === 'conchas' ? 'Conchas' : 'Vagões'}
                        </button>
                      ))}
                  </div>
                )}

                {unidadeDescarte === 'toneladas' ? (
                  <Input
                    id="qtd-descarte"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-16 bg-zinc-800 border-zinc-700 text-3xl rounded-2xl text-center font-bold"
                    value={qtdDescarte}
                    onChange={(e) => setQtdDescarte(e.target.value)}
                  />
                ) : (
                  <div className="space-y-1">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      inputMode="numeric"
                      placeholder="0"
                      className="h-16 bg-zinc-800 border-zinc-700 text-3xl rounded-2xl text-center font-bold"
                      value={qtdUnidadeDescarte}
                      onChange={(e) => setQtdUnidadeDescarte(e.target.value)}
                    />
                    {qtdUnidadeDescarte && parseFloat(qtdUnidadeDescarte) > 0 && (
                      <p className="text-xs text-red-400 text-center font-medium">
                        ≈ {(parseFloat(qtdUnidadeDescarte) * (unidadeDescarte === 'conchas' ? (configuracoes?.peso_concha_ton ?? 0) : (configuracoes?.peso_vagao_ton ?? 0))).toFixed(3)} t
                      </p>
                    )}
                  </div>
                )}

                {excedeVolume(
                  unidadeDescarte === 'toneladas' ? qtdDescarte : qtdUnidadeDescarte,
                  unidadeDescarte
                ) && (
                  <p className="text-sm text-amber-400 text-center font-medium">
                    ⚠️ Quantidade maior que todo o volume do silo. Confira a unidade.
                  </p>
                )}
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label htmlFor="data-descarte" className="text-sm font-semibold text-zinc-200">
                  Data
                </Label>
                <Input
                  id="data-descarte"
                  type="date"
                  className="h-14 bg-zinc-800 border-zinc-700 text-base rounded-2xl"
                  value={dataDescarte}
                  onChange={(e) => setDataDescarte(e.target.value)}
                  max={todayISO()}
                />
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="obs-descarte" className="text-sm font-semibold text-zinc-200">
                  Observações <span className="text-zinc-500 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="obs-descarte"
                  placeholder="Informações adicionais..."
                  className="bg-zinc-800 border-zinc-700 text-base rounded-2xl resize-none min-h-[80px]"
                  value={obsDescarte}
                  onChange={(e) => setObsDescarte(e.target.value)}
                  maxLength={400}
                />
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting || !(unidadeDescarte === 'toneladas' ? qtdDescarte : qtdUnidadeDescarte) || !tipoPerda}
                  className="w-full h-14 bg-red-900/80 hover:bg-red-800 text-lg font-black rounded-2xl text-red-100"
                >
                  {submitting ? 'Registrando...' : (
                    <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Confirmar Descarte</span>
                  )}
                </Button>
                <button type="button" onClick={voltarParaAcao} className="w-full text-sm text-zinc-500 hover:text-zinc-300 py-2 transition-colors">
                  ← Voltar
                </button>
              </div>

            </form>
          </div>
        )}

      </main>

      {/* Footer — status de conexão */}
      <footer className="px-5 py-3 border-t border-zinc-800 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-primary' : 'bg-amber-400 animate-pulse'}`} aria-hidden="true" />
          <p className="text-xs text-zinc-500" role="status" aria-live="polite">
            {isOnline ? 'Sincronizado com a nuvem' : 'Modo Offline — operações salvas localmente'}
          </p>
        </div>
        {lastSyncAt && (
          <p className="text-xs text-zinc-600">
            Sincronizado às {lastSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </footer>

    </div>
  );
}
