'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Silo, type Profile } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { registrarRetiradaSilo, registrarPerdaSilo } from '@/lib/supabase/operador';
import { enqueue } from '@/lib/db/syncQueue';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LogOut, PackageMinus, AlertOctagon, User, Home } from 'lucide-react';

export default function ModoOperadorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [silos, setSilos] = useState<Silo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRetiradaOpen, setIsRetiradaOpen] = useState(false);
  const [isPerdaOpen, setIsPerdaOpen] = useState(false);

  const [selectedSiloRetirada, setSelectedSiloRetirada] = useState('');
  const [selectedSiloPerda, setSelectedSiloPerda] = useState('');
  const [quantidadeRetirada, setQuantidadeRetirada] = useState('');
  const [quantidadePerda, setQuantidadePerda] = useState('');
  const [tipoPerda, setTipoPerda] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isOnline, updateStatus } = useOfflineSync();

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, fazendas(nome)')
      .eq('id', user.id)
      .single();

    if (!profileData) { router.push('/login'); return; }

    setProfile(profileData);
    if (profileData.fazenda_id) {
      const silosData = await q.silos.list();
      setSilos(silosData);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleRetirada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiloRetirada || !quantidadeRetirada || !profile) return;
    setSubmitting(true);
    try {
      if (isOnline) {
        await registrarRetiradaSilo(selectedSiloRetirada, Number(quantidadeRetirada), profile.nome);
        toast.success('Retirada registrada com sucesso!');
      } else {
        await enqueue('movimentacoes_silo', 'INSERT', {
          id: crypto.randomUUID(),
          silo_id: selectedSiloRetirada,
          tipo: 'Saída',
          quantidade: Number(quantidadeRetirada),
          data: new Date().toISOString().split('T')[0],
          responsavel: profile.nome,
          observacao: 'Retirada via Modo Operador (Offline)',
        });
        updateStatus();
        toast.warning('Você está offline. A retirada foi salva localmente.');
      }
      setIsRetiradaOpen(false);
      setSelectedSiloRetirada('');
      setQuantidadeRetirada('');
    } catch {
      toast.error('Erro ao registrar retirada');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePerda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiloPerda || !quantidadePerda || !tipoPerda || !profile) return;
    setSubmitting(true);
    try {
      if (isOnline) {
        await registrarPerdaSilo(selectedSiloPerda, Number(quantidadePerda), tipoPerda, profile.nome);
        toast.success('Perda registrada com sucesso!');
      } else {
        await enqueue('movimentacoes_silo', 'INSERT', {
          id: crypto.randomUUID(),
          silo_id: selectedSiloPerda,
          tipo: 'Saída',
          quantidade: Number(quantidadePerda),
          data: new Date().toISOString().split('T')[0],
          responsavel: profile.nome,
          observacao: `Perda: ${tipoPerda} (via Modo Operador - Offline)`,
        });
        updateStatus();
        toast.warning('Você está offline. A perda foi salva localmente.');
      }
      setIsPerdaOpen(false);
      setSelectedSiloPerda('');
      setQuantidadePerda('');
      setTipoPerda('');
    } catch {
      toast.error('Erro ao registrar perda');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen bg-zinc-950 flex items-center justify-center"
        role="status"
        aria-label="Carregando dados do operador"
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col font-sans">

      {/* Header */}
      <header className="flex items-center justify-between mb-10 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-green-500">GestSiloPRO</h1>
          <p className="text-sm text-zinc-300 font-medium uppercase tracking-widest">
            {profile?.fazendas?.nome || 'Fazenda'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {profile?.perfil === 'Administrador' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
              aria-label="Ir para o Dashboard"
              className="text-zinc-400 hover:text-zinc-100"
            >
              <Home className="w-6 h-6" aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Sair da conta"
            className="text-zinc-400 hover:text-red-500"
          >
            <LogOut className="w-6 h-6" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main id="main-content" className="flex flex-col flex-1">

        {/* Identificação do Operador */}
        <div
          className="mb-12 flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800"
          aria-label={`Operador logado: ${profile?.nome}`}
        >
          <div
            className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center text-green-500"
            aria-hidden="true"
          >
            <User className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-tighter">
              Operador Logado
            </p>
            <p className="text-xl font-bold">{profile?.nome}</p>
          </div>
        </div>

        {/* Ações Principais */}
        <div className="flex-1 flex flex-col gap-6 justify-center max-w-md mx-auto w-full">

          {/* ── Dialog: Retirada ──────────────────────────────────────────── */}
          <Dialog open={isRetiradaOpen} onOpenChange={setIsRetiradaOpen}>
            <DialogTrigger>
              <button
                className="w-full h-24 bg-green-600 hover:bg-green-500 active:scale-95 transition-all rounded-3xl flex items-center justify-center gap-4 shadow-xl shadow-green-900/20"
                aria-haspopup="dialog"
              >
                <PackageMinus className="w-10 h-10 text-white" aria-hidden="true" />
                <span className="text-2xl font-black text-white uppercase tracking-tight">
                  Retirada de Silo
                </span>
              </button>
            </DialogTrigger>

            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-green-500">
                  Registrar Retirada
                </DialogTitle>
                <DialogDescription className="text-zinc-300 text-base">
                  Informe os dados da retirada de silagem.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleRetirada} className="space-y-6 py-4" noValidate>

                {/* Silo */}
                <div className="space-y-3">
                  <Label
                    htmlFor="silo-retirada"
                    className="text-lg font-bold"
                  >
                    Selecionar Silo
                  </Label>
                  <Select
                    onValueChange={(v: string | null) => { if (v) setSelectedSiloRetirada(v); }}
                    required
                    name="silo-retirada"
                  >
                    <SelectTrigger
                      id="silo-retirada"
                      className="h-16 bg-zinc-800 border-zinc-700 text-xl rounded-2xl"
                      aria-label="Selecionar silo para retirada"
                    >
                      <SelectValue placeholder="Escolha o silo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      {silos.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-lg py-3">
                          {s.nome} ({s.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantidade */}
                <div className="space-y-3">
                  <Label htmlFor="qtd-retirada" className="text-lg font-bold">
                    Quantidade (Toneladas)
                  </Label>
                  <Input
                    id="qtd-retirada"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="h-16 bg-zinc-800 border-zinc-700 text-2xl rounded-2xl text-center"
                    value={quantidadeRetirada}
                    onChange={(e) => setQuantidadeRetirada(e.target.value)}
                    required
                    aria-required="true"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                    className="w-full h-16 bg-green-600 hover:bg-green-500 text-xl font-black rounded-2xl"
                  >
                    {submitting ? 'PROCESSANDO...' : 'CONFIRMAR RETIRADA'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* ── Dialog: Perda ─────────────────────────────────────────────── */}
          <Dialog open={isPerdaOpen} onOpenChange={setIsPerdaOpen}>
            <DialogTrigger>
              <button
                className="w-full h-24 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-3xl flex items-center justify-center gap-4 border border-zinc-700 shadow-xl"
                aria-haspopup="dialog"
              >
                <AlertOctagon className="w-10 h-10 text-red-500" aria-hidden="true" />
                <span className="text-2xl font-black text-zinc-100 uppercase tracking-tight">
                  Registrar Perda
                </span>
              </button>
            </DialogTrigger>

            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-red-500">
                  Registrar Perda
                </DialogTitle>
                <DialogDescription className="text-zinc-300 text-base">
                  Informe o motivo e a quantidade da perda.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handlePerda} className="space-y-6 py-4" noValidate>

                {/* Silo */}
                <div className="space-y-3">
                  <Label htmlFor="silo-perda" className="text-lg font-bold">
                    Selecionar Silo
                  </Label>
                  <Select
                    onValueChange={(v: string | null) => { if (v) setSelectedSiloPerda(v); }}
                    required
                    name="silo-perda"
                  >
                    <SelectTrigger
                      id="silo-perda"
                      className="h-16 bg-zinc-800 border-zinc-700 text-xl rounded-2xl"
                      aria-label="Selecionar silo para registrar perda"
                    >
                      <SelectValue placeholder="Escolha o silo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      {silos.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-lg py-3">
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Perda */}
                <div className="space-y-3">
                  <Label htmlFor="tipo-perda" className="text-lg font-bold">
                    Tipo de Perda
                  </Label>
                  <Select
                    onValueChange={(v: string | null) => { if (v) setTipoPerda(v); }}
                    required
                    name="tipo-perda"
                  >
                    <SelectTrigger
                      id="tipo-perda"
                      className="h-16 bg-zinc-800 border-zinc-700 text-xl rounded-2xl"
                      aria-label="Selecionar tipo de perda"
                    >
                      <SelectValue placeholder="Motivo da perda" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectItem value="Aeróbica"     className="text-lg py-3">Aeróbica (Aquecimento)</SelectItem>
                      <SelectItem value="Efluente"     className="text-lg py-3">Efluente (Chorume)</SelectItem>
                      <SelectItem value="Deterioração" className="text-lg py-3">Deterioração (Mofo)</SelectItem>
                      <SelectItem value="Outro"        className="text-lg py-3">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantidade */}
                <div className="space-y-3">
                  <Label htmlFor="qtd-perda" className="text-lg font-bold">
                    Quantidade (Toneladas)
                  </Label>
                  <Input
                    id="qtd-perda"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="h-16 bg-zinc-800 border-zinc-700 text-2xl rounded-2xl text-center"
                    value={quantidadePerda}
                    onChange={(e) => setQuantidadePerda(e.target.value)}
                    required
                    aria-required="true"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                    className="w-full h-16 bg-red-600 hover:bg-red-500 text-xl font-black rounded-2xl"
                  >
                    {submitting ? 'PROCESSANDO...' : 'REGISTRAR PERDA'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-zinc-400">
        <p className="text-sm font-medium">GestSiloPRO v1.0 · Modo Operador</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div
            className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}
            aria-hidden="true"
          />
          <p className="text-xs" role="status" aria-live="polite">
            {isOnline ? 'Sincronizado com a nuvem' : 'Modo Offline Ativo'}
          </p>
        </div>
      </footer>

    </div>
  );
}
