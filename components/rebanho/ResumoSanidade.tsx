'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { listEventosSanitariosPorAnimal } from '@/lib/supabase/rebanho-sanitario';
import { formatDate } from '@/lib/utils';
import type { EventoSanitarioRow } from '@/lib/types/rebanho-sanitario';
import type { Animal } from '@/lib/types/rebanho';

const TIPO_LABELS: Record<string, string> = {
  vacinacao: 'Vacinação',
  vermifugacao: 'Vermifugação',
  tratamento_veterinario: 'Tratamento',
  exame_laboratorial: 'Exame',
};

/**
 * Resumo enxuto de sanidade do animal + link para o subdomínio Sanidade
 * (SPEC-rebanho012, P2.5). A gestão completa (registro/calendário) fica em
 * /dashboard/rebanho/sanidade. Carrega por animal.id — sem fetch global.
 */
export function ResumoSanidade({ animal }: { animal: Animal }) {
  const [eventos, setEventos] = useState<EventoSanitarioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function carregar() {
      try {
        const data = await listEventosSanitariosPorAnimal(animal.id, 5, 0);
        if (!cancelled) setEventos(data);
      } catch {
        if (!cancelled) setEventos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    carregar();
    return () => {
      cancelled = true;
    };
  }, [animal.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
              Sanidade
            </CardTitle>
            <CardDescription>Resumo — gestão completa no módulo Sanidade</CardDescription>
          </div>
          <Link href="/dashboard/rebanho/sanidade">
            <Button variant="outline" size="sm">
              Abrir Sanidade
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum evento sanitário registrado. Registre no módulo Sanidade.
          </p>
        ) : (
          <ul className="space-y-2">
            {eventos.map((evento) => (
              <li
                key={evento.id}
                className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline">{TIPO_LABELS[evento.tipo] ?? evento.tipo}</Badge>
                  <span className="text-sm text-muted-foreground truncate">
                    {evento.vacina_nome ?? evento.tipo_exame ?? '—'}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(evento.data_evento)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
