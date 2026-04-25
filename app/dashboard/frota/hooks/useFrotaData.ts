'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  type Maquina,
  type UsoMaquina,
  type Manutencao,
  type Abastecimento,
  type Talhao,
  type PlanoManutencao,
} from '@/lib/supabase';
import { q } from '@/lib/supabase/queries-audit';
import { toast } from 'sonner';

export type FrotaTab =
  | 'visao-geral'
  | 'cadastro'
  | 'uso'
  | 'manutencoes'
  | 'abastecimento'
  | 'custos'
  | 'relatorios';

export interface UseFrotaDataReturn {
  maquinas: Maquina[];
  usos: UsoMaquina[];
  manutencoes: Manutencao[];
  abastecimentos: Abastecimento[];
  talhoes: Talhao[];
  planos: PlanoManutencao[];
  loading: boolean;
  refreshMaquinas: () => Promise<void>;
  refreshUsos: () => Promise<void>;
  refreshManutencoes: () => Promise<void>;
  refreshAbastecimentos: () => Promise<void>;
  refreshPlanos: () => Promise<void>;
  refreshAll: () => void;
}

export function useFrotaData(activeTab: FrotaTab): UseFrotaDataReturn {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [usos, setUsos] = useState<UsoMaquina[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [planos, setPlanos] = useState<PlanoManutencao[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const initializedRef = useRef<Partial<Record<FrotaTab, boolean>>>({});
  const fetchedRef = useRef(new Set<string>());
  const maquinasRef = useRef<Maquina[]>([]);

  // ---------------------------------------------------------------------------
  // Granular refresh callbacks
  // ---------------------------------------------------------------------------
  const refreshMaquinas = useCallback(async () => {
    try {
      const data = await q.maquinas.list();
      setMaquinas(data);
      maquinasRef.current = data;
      fetchedRef.current.add('maquinas');
    } catch {
      toast.error('Erro ao recarregar máquinas');
    }
  }, []);

  const refreshUsos = useCallback(async () => {
    const ids = maquinasRef.current.map((m) => m.id);
    if (ids.length === 0) return;
    try {
      const data = await q.usoMaquinas.listByMaquinas(ids);
      setUsos(data);
      fetchedRef.current.add('usos');
    } catch {
      toast.error('Erro ao recarregar usos');
    }
  }, []);

  const refreshManutencoes = useCallback(async () => {
    const ids = maquinasRef.current.map((m) => m.id);
    if (ids.length === 0) return;
    try {
      const data = await q.manutencoes.listByMaquinas(ids);
      setManutencoes(data);
      fetchedRef.current.add('manutencoes');
    } catch {
      toast.error('Erro ao recarregar manutenções');
    }
  }, []);

  const refreshAbastecimentos = useCallback(async () => {
    const ids = maquinasRef.current.map((m) => m.id);
    if (ids.length === 0) return;
    try {
      const data = await q.abastecimentos.listByMaquinas(ids);
      setAbastecimentos(data);
      fetchedRef.current.add('abastecimentos');
    } catch {
      toast.error('Erro ao recarregar abastecimentos');
    }
  }, []);

  const refreshPlanos = useCallback(async () => {
    const ids = maquinasRef.current.map((m) => m.id);
    if (ids.length === 0) return;
    try {
      const data = await q.planosManutencao.listByMaquinas(ids);
      setPlanos(data);
      fetchedRef.current.add('planos');
    } catch {
      toast.error('Erro ao recarregar planos de manutenção');
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchedRef.current.clear();
    initializedRef.current = {};
    setRefreshKey((k) => k + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Lazy load per tab
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (initializedRef.current[activeTab]) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // ── Step 1: ensure maquinas are loaded first ────────────────────────
        let ids: string[];
        if (!fetchedRef.current.has('maquinas')) {
          const [maq, tals] = await Promise.all([
            q.maquinas.list(),
            q.talhoes.list(),
          ]);
          if (cancelled) return;
          setMaquinas(maq);
          setTalhoes(tals);
          maquinasRef.current = maq;
          fetchedRef.current.add('maquinas');
          fetchedRef.current.add('talhoes');
          ids = maq.map((m) => m.id);
        } else {
          if (!fetchedRef.current.has('talhoes')) {
            const tals = await q.talhoes.list();
            if (cancelled) return;
            setTalhoes(tals);
            fetchedRef.current.add('talhoes');
          }
          ids = maquinasRef.current.map((m) => m.id);
        }

        if (ids.length === 0) {
          initializedRef.current[activeTab] = true;
          return;
        }

        // ── Step 2: load tab-specific data in parallel ──────────────────────
        const tasks: Promise<void>[] = [];

        const needsUsos =
          (activeTab === 'visao-geral' || activeTab === 'uso' || activeTab === 'custos' || activeTab === 'relatorios') &&
          !fetchedRef.current.has('usos');

        const needsManutencoes =
          (activeTab === 'visao-geral' || activeTab === 'manutencoes' || activeTab === 'custos' || activeTab === 'relatorios') &&
          !fetchedRef.current.has('manutencoes');

        const needsAbastecimentos =
          (activeTab === 'visao-geral' || activeTab === 'abastecimento' || activeTab === 'custos' || activeTab === 'relatorios') &&
          !fetchedRef.current.has('abastecimentos');

        const needsPlanos =
          (activeTab === 'visao-geral' || activeTab === 'manutencoes') &&
          !fetchedRef.current.has('planos');

        if (needsUsos)
          tasks.push(
            q.usoMaquinas.listByMaquinas(ids).then((d) => {
              if (!cancelled) { setUsos(d); fetchedRef.current.add('usos'); }
            })
          );

        if (needsManutencoes)
          tasks.push(
            q.manutencoes.listByMaquinas(ids).then((d) => {
              if (!cancelled) { setManutencoes(d); fetchedRef.current.add('manutencoes'); }
            })
          );

        if (needsAbastecimentos)
          tasks.push(
            q.abastecimentos.listByMaquinas(ids).then((d) => {
              if (!cancelled) { setAbastecimentos(d); fetchedRef.current.add('abastecimentos'); }
            })
          );

        if (needsPlanos)
          tasks.push(
            q.planosManutencao.listByMaquinas(ids).then((d) => {
              if (!cancelled) { setPlanos(d); fetchedRef.current.add('planos'); }
            })
          );

        if (tasks.length > 0) await Promise.all(tasks);

        if (!cancelled) initializedRef.current[activeTab] = true;
      } catch {
        if (!cancelled) toast.error('Erro ao carregar dados da frota');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activeTab, refreshKey]);

  return {
    maquinas,
    usos,
    manutencoes,
    abastecimentos,
    talhoes,
    planos,
    loading,
    refreshMaquinas,
    refreshUsos,
    refreshManutencoes,
    refreshAbastecimentos,
    refreshPlanos,
    refreshAll,
  };
}
