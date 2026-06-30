'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Milk } from 'lucide-react';
import { listProducoesLeiteiras } from '@/lib/supabase/rebanho-leiteira';
import { formatDate } from '@/lib/utils';
import type { ProducaoLeiteira } from '@/lib/types/rebanho-leiteira';
import type { Animal } from '@/lib/types/rebanho';

/**
 * Resumo enxuto de produção leiteira do animal + link para o subdomínio Leite
 * (SPEC-rebanho012, P2.5). A gestão completa (registro/curva) fica em
 * /dashboard/rebanho/leiteira. Carrega por animal.id — sem fetch global.
 */
export function ResumoLeiteira({ animal }: { animal: Animal }) {
  const [producoes, setProducoes] = useState<ProducaoLeiteira[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function carregar() {
      try {
        const data = await listProducoesLeiteiras(animal.id, 5, 0);
        if (!cancelled) setProducoes(data);
      } catch {
        if (!cancelled) setProducoes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    carregar();
    return () => {
      cancelled = true;
    };
  }, [animal.id]);

  const ultima = producoes[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Milk className="h-4 w-4 text-primary" aria-hidden="true" />
              Produção Leiteira
            </CardTitle>
            <CardDescription>Resumo — gestão completa no módulo Leiteira</CardDescription>
          </div>
          <Link href="/dashboard/rebanho/leiteira">
            <Button variant="outline" size="sm">
              Abrir Leiteira
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : ultima ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Última produção</p>
              <p className="text-2xl font-bold">{ultima.volume_litros} L</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(ultima.data)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Registros recentes</p>
              <p className="text-2xl font-bold">{producoes.length}</p>
              <p className="text-xs text-muted-foreground mt-1">últimos lançamentos</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma produção registrada. Registre no módulo Leiteira.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
