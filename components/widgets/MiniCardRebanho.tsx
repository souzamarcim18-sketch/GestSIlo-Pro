'use client';

import { useEffect, useState } from 'react';
import { Beef } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getMiniCardRebanhoAction,
  type MiniCardRebanhoData,
} from '@/app/dashboard/rebanho/indicadores/actions';
import { MiniCardRebanhoClient } from './MiniCardRebanhoClient';

export function MiniCardRebanho() {
  const [data, setData] = useState<MiniCardRebanhoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const result = await getMiniCardRebanhoAction();
        if (active) setData(result);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Card
        className="rounded-2xl p-6 h-full border-0"
        style={{
          background: 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
          boxShadow: '0 4px 16px rgba(0, 132, 61, 0.25)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-20 bg-white/20" />
            <Skeleton className="h-10 w-24 bg-white/20" />
            <Skeleton className="h-4 w-32 bg-white/20" />
          </div>
          <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
            <Beef className="h-5 w-5 text-white" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card
        className="rounded-2xl p-6 h-full border-0"
        style={{
          background: 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
          boxShadow: '0 4px 16px rgba(0, 132, 61, 0.25)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Rebanho
            </p>
            <p className="text-sm text-white/85">
              {error || 'Sem dados'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
            <Beef className="h-5 w-5 text-white" />
          </div>
        </div>
      </Card>
    );
  }

  return <MiniCardRebanhoClient data={data} />;
}
