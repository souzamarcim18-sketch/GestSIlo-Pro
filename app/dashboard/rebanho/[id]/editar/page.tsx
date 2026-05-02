'use client';

import { useState, useEffect } from 'react';
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
import { editarAnimalAction } from '../../actions';
import { listAnimais, listLotes } from '@/lib/supabase/rebanho';
import type { Animal, Lote } from '@/lib/types/rebanho';

export default function EditarAnimalPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading, profile } = useAuth();

  const animalId = params.id as string;
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [animaisParaGenealgia, setAnimaisParaGenealgia] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.perfil !== 'Administrador') {
      toast.error('Apenas administradores podem editar animais');
      router.push('/dashboard/rebanho');
      return;
    }

    const loadData = async () => {
      try {
        const [animaisList, lotesList] = await Promise.all([
          listAnimais({}, 1000, 0),
          listLotes(100, 0),
        ]);

        const animalData = animaisList.find((a) => a.id === animalId);
        if (!animalData) {
          toast.error('Animal não encontrado');
          router.push('/dashboard/rebanho');
          return;
        }

        setAnimal(animalData);
        setLotes(lotesList);
        setAnimaisParaGenealgia(animaisList.filter((a) => a.id !== animalId));
      } catch (err) {
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authLoading, profile, router, animalId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await editarAnimalAction(animalId, Object.fromEntries(formData));
      if (result.success) {
        toast.success('Animal atualizado com sucesso');
        router.push(`/dashboard/rebanho/${animalId}`);
      } else {
        toast.error(result.error || 'Erro ao atualizar animal');
      }
    } catch (err) {
      toast.error('Erro ao atualizar animal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rebanho', href: '/dashboard/rebanho' },
    { label: animal?.brinco || 'Animal', href: `/dashboard/rebanho/${animalId}` },
    { label: 'Editar', href: `/dashboard/rebanho/${animalId}/editar` },
  ];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-muted-foreground">Animal não encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <Breadcrumbs />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Editar Animal</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Animal</CardTitle>
            <CardDescription>Edite as informações do animal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="brinco">Brinco</Label>
                <Input
                  id="brinco"
                  name="brinco"
                  value={animal.brinco}
                  disabled
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">O brinco não pode ser alterado</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    name="data_nascimento"
                    type="date"
                    defaultValue={animal.data_nascimento}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="raca">Raça</Label>
                  <Input
                    id="raca"
                    name="raca"
                    defaultValue={animal.raca || ''}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="lote_id">Lote</Label>
                  <Select
                    name="lote_id"
                    defaultValue={animal.lote_id || ''}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="lote_id" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem lote</SelectItem>
                      {lotes.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="mae_id">Mãe</Label>
                  <Select
                    name="mae_id"
                    defaultValue={animal.mae_id || ''}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="mae_id" className="mt-1">
                      <SelectValue placeholder="Sem mãe registrada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem mãe</SelectItem>
                      {animaisParaGenealgia
                        .filter((a) => a.sexo === 'Fêmea')
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.brinco}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pai_id">Pai</Label>
                  <Select
                    name="pai_id"
                    defaultValue={animal.pai_id || ''}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="pai_id" className="mt-1">
                      <SelectValue placeholder="Sem pai registrado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem pai</SelectItem>
                      {animaisParaGenealgia
                        .filter((a) => a.sexo === 'Macho')
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.brinco}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  defaultValue={animal.observacoes || ''}
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
