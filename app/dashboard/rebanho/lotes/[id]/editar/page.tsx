'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Loader2 } from 'lucide-react';
import { listLotes } from '@/lib/supabase/rebanho';
import { editarLoteAction } from '../../../actions';
import type { Lote } from '@/lib/types/rebanho';

export default function EditarLotePage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading, profile } = useAuth();

  const loteId = params.id as string;
  const [lote, setLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipoRebanho, setTipoRebanho] = useState<string | null>(null);

  const fetchLote = useCallback(async () => {
    try {
      const lotesData = await listLotes(100, 0);
      const loteData = lotesData.find((l) => l.id === loteId);
      if (!loteData) {
        toast.error('Lote não encontrado');
        router.push('/dashboard/rebanho/lotes');
        return;
      }
      setLote(loteData);
      setTipoRebanho(loteData.tipo_rebanho ?? null);
    } catch {
      toast.error('Erro ao carregar lote');
    } finally {
      setLoading(false);
    }
  }, [loteId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.perfil !== 'Administrador') {
      toast.error('Apenas administradores podem editar lotes');
      router.push(`/dashboard/rebanho/lotes/${loteId}`);
      return;
    }
    fetchLote();
  }, [authLoading, profile, router, loteId, fetchLote]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(formData);
    payload.tipo_rebanho = tipoRebanho || null;

    try {
      const result = await editarLoteAction(loteId, payload);
      if (result.success) {
        toast.success('Lote atualizado com sucesso');
        router.push(`/dashboard/rebanho/lotes/${loteId}`);
      } else {
        toast.error(result.error || 'Erro ao atualizar lote');
      }
    } catch {
      toast.error('Erro ao atualizar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lote) return null;

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <Breadcrumbs />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Editar Lote</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Lote</CardTitle>
            <CardDescription>Edite as informações do lote</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="nome">Nome do Lote *</Label>
                <Input
                  id="nome"
                  name="nome"
                  defaultValue={lote.nome}
                  required
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tipo_rebanho">Tipo do Lote</Label>
                <Select value={tipoRebanho ?? ''} onValueChange={setTipoRebanho} disabled={isSubmitting}>
                  <SelectTrigger id="tipo_rebanho" className="mt-1">
                    <SelectValue placeholder="Sem tipo definido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem tipo definido</SelectItem>
                    <SelectItem value="leiteiro">Leiteiro</SelectItem>
                    <SelectItem value="corte">Corte</SelectItem>
                    <SelectItem value="misto">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  defaultValue={lote.descricao || ''}
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
