'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { TipoEvento } from '@/lib/types/rebanho';
import { listLotes } from '@/lib/supabase/rebanho';
import type { Lote } from '@/lib/types/rebanho';

import { EventoIndividualForm } from './EventoIndividualForm';

// Tipos de evento registráveis individualmente, na ordem de exibição.
// MUDANCA_CATEGORIA fica de fora: é tratada por `mudarCategoriaAction` (não é
// um evento da RPC `registrar_evento_com_status` com schema próprio).
const TIPOS_REGISTRAVEIS: { valor: TipoEvento; label: string }[] = [
  { valor: TipoEvento.PESAGEM, label: 'Pesagem' },
  { valor: TipoEvento.COBERTURA, label: 'Cobertura' },
  { valor: TipoEvento.DIAGNOSTICO_PRENHEZ, label: 'Diagnóstico de Prenhez' },
  { valor: TipoEvento.PARTO, label: 'Parto' },
  { valor: TipoEvento.SECAGEM, label: 'Secagem' },
  { valor: TipoEvento.ABORTO, label: 'Aborto' },
  { valor: TipoEvento.DESMAME, label: 'Desmame' },
  { valor: TipoEvento.NASCIMENTO, label: 'Nascimento' },
  { valor: TipoEvento.TRANSFERENCIA_LOTE, label: 'Transferência de Lote' },
  { valor: TipoEvento.VENDA, label: 'Venda' },
  { valor: TipoEvento.MORTE, label: 'Morte' },
  { valor: TipoEvento.DESCARTE, label: 'Descarte' },
];

export default function EventoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const animalId = params.id;

  const [tipo, setTipo] = useState<TipoEvento>(TipoEvento.PESAGEM);
  const [lotes, setLotes] = useState<Lote[]>([]);

  useEffect(() => {
    let cancelled = false;
    const carregarLotes = async () => {
      try {
        const data = await listLotes(100, 0);
        if (!cancelled) setLotes(data);
      } catch {
        // silencioso — lotes só são necessários na transferência de lote
      }
    };
    carregarLotes();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/rebanho/${animalId}`}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">Registrar Evento</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Tipo de evento — fora do form para remontar o form ao trocar */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Evento *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEvento)}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_REGISTRAVEIS.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/*
            key={tipo} remonta o form (e seu resolver Zod) ao trocar de tipo,
            garantindo defaults e validação corretos por tipo de evento.
          */}
          <EventoIndividualForm
            key={tipo}
            animalId={animalId}
            tipo={tipo}
            lotes={lotes}
            onSuccess={() => router.push(`/dashboard/rebanho/${animalId}`)}
            onCancel={() => router.push(`/dashboard/rebanho/${animalId}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
