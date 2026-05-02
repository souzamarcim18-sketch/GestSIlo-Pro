'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { criarLoteAction } from '../../actions';

export default function NovoLotePage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.perfil !== 'Administrador') {
      toast.error('Apenas administradores podem criar lotes');
      router.push('/dashboard/rebanho/lotes');
      return;
    }
  }, [authLoading, profile, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await criarLoteAction(Object.fromEntries(formData));
      if (result.success) {
        toast.success('Lote criado com sucesso');
        router.push(`/dashboard/rebanho/lotes/${result.lote_id}`);
      } else {
        toast.error(result.error || 'Erro ao criar lote');
      }
    } catch (err) {
      toast.error('Erro ao criar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rebanho', href: '/dashboard/rebanho' },
    { label: 'Lotes', href: '/dashboard/rebanho/lotes' },
    { label: 'Novo Lote', href: '/dashboard/rebanho/lotes/novo' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <Breadcrumbs />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Novo Lote</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Lote</CardTitle>
            <CardDescription>Preencha as informações do novo lote</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="nome">Nome do Lote *</Label>
                <Input
                  id="nome"
                  name="nome"
                  placeholder="Ex: Lote A, Lote de Matrizes"
                  required
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  placeholder="Adicione informações sobre o lote"
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
                  {isSubmitting ? 'Criando...' : 'Criar Lote'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
