'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Database, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { type Silo, type MovimentacaoSilo, type Talhao } from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { SiloCard, SiloKpiStrip } from './components';
import { SiloForm } from './components/dialogs/SiloForm';
import { AbrirSiloDialog } from './components/dialogs/AbrirSiloDialog';
import { calcularDadosSilos, type SiloCardData } from './helpers';
import { planoPermiteMaisRegistros, parsePlanoSlug } from '@/lib/planos';

type InsumoSelect = { id: string; nome: string };

interface Props {
  initialSiloCardData: SiloCardData[];
  initialTalhoes: Talhao[];
  initialInsumosLona: InsumoSelect[];
  initialInsumosInoculante: InsumoSelect[];
  isAdmin?: boolean;
  planoAtual?: string | null;
}

export function SilosClient({ initialSiloCardData, initialTalhoes, initialInsumosLona, initialInsumosInoculante, isAdmin, planoAtual }: Props) {
  const router = useRouter();
  const [siloCardData, setSiloCardData] = useState<SiloCardData[]>(initialSiloCardData);
  const [talhoes] = useState<Talhao[]>(initialTalhoes);
  const [insumosLona] = useState<InsumoSelect[]>(initialInsumosLona);
  const [insumosInoculante] = useState<InsumoSelect[]>(initialInsumosInoculante);
  const [isAddSiloOpen, setIsAddSiloOpen] = useState(false);
  const [abrirSiloTarget, setAbrirSiloTarget] = useState<{ id: string; nome: string; dataAberturaPrevia?: string | null } | null>(null);

  const plano = parsePlanoSlug(planoAtual);
  const limiteAtingido = !planoPermiteMaisRegistros(plano, 'silos', siloCardData.length);

  const handleNovoSilo = useCallback(() => {
    if (limiteAtingido) {
      toast.info('Limite de silos do seu plano atingido. Faça upgrade para cadastrar mais.');
      return;
    }
    setIsAddSiloOpen(true);
  }, [limiteAtingido]);

  const fetchData = useCallback(async () => {
    try {
      const silosData = await q.silos.list();
      const movsData = await q.movimentacoesSilo.listBySilos(silosData.map((s) => s.id));
      setSiloCardData(calcularDadosSilos(silosData, movsData));
    } catch {
      toast.error('Erro ao carregar dados');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Gestão de Silagens</h2>
        <Button onClick={handleNovoSilo}>
          {limiteAtingido ? <Lock className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          Novo Silo
        </Button>
      </div>

      {limiteAtingido && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Você atingiu o limite de silos do seu plano atual.
          </p>
          <Link
            href="/dashboard/configuracoes/plano?origem=silos"
            className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-white/[0.04] transition-all duration-150 whitespace-nowrap"
          >
            <Lock className="h-4 w-4" />
            Fazer upgrade
          </Link>
        </div>
      )}

      <SiloKpiStrip data={siloCardData} />

      <section>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {siloCardData.map((card) => (
            <SiloCard
              key={card.silo.id}
              {...card}
              isAdmin={isAdmin}
              onClick={() => router.push(`/dashboard/silos/${card.silo.id}`)}
              onAbrirSilo={() =>
                setAbrirSiloTarget({
                  id: card.silo.id,
                  nome: card.silo.nome,
                  dataAberturaPrevia: card.silo.data_abertura_prevista,
                })
              }
            />
          ))}

          {siloCardData.length === 0 && (
            <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed">
              <Database className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <CardHeader className="p-0">
                <CardTitle className="text-muted-foreground">Nenhum silo cadastrado</CardTitle>
                <CardDescription>Clique em &quot;Novo Silo&quot; para começar.</CardDescription>
              </CardHeader>
              <CardContent className="p-0" />
            </Card>
          )}
        </div>
      </section>

      <SiloForm
        open={isAddSiloOpen}
        onOpenChange={setIsAddSiloOpen}
        mode="create"
        talhoes={talhoes}
        insumosLona={insumosLona}
        insumosInoculante={insumosInoculante}
        onSuccess={fetchData}
        isFree={plano === 'free'}
      />

      {abrirSiloTarget && (
        <AbrirSiloDialog
          open={!!abrirSiloTarget}
          onOpenChange={(v) => { if (!v) setAbrirSiloTarget(null); }}
          siloId={abrirSiloTarget.id}
          siloNome={abrirSiloTarget.nome}
          dataAberturaMinima={abrirSiloTarget.dataAberturaPrevia ?? undefined}
          onSuccess={() => {
            setAbrirSiloTarget(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
