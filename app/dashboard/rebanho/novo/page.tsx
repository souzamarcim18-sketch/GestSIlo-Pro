'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { criarAnimalAction } from '../actions';
import { listLotes } from '@/lib/supabase/rebanho';
import type { Lote } from '@/lib/types/rebanho';

export default function NovoAnimalPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [origem, setOrigem] = useState<'nascido' | 'comprado'>('nascido');
  const [dataEstimada, setDataEstimada] = useState(false);
  const [loteId, setLoteId] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (profile?.perfil !== 'Administrador') {
      toast.error('Apenas administradores podem criar animais');
      router.push('/dashboard/rebanho');
      return;
    }

    listLotes(100, 0).then(setLotes).catch(() => toast.error('Erro ao carregar lotes'));
  }, [authLoading, profile, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const dados = Object.fromEntries(formData);

    if (dados.peso_nascimento) {
      dados.peso_nascimento = Number(dados.peso_nascimento);
    }

    try {
      const result = await criarAnimalAction(dados);
      if (result.success) {
        toast.success('Animal criado com sucesso');
        router.push(`/dashboard/rebanho/${result.animal_id}`);
      } else {
        toast.error(result.error || 'Erro ao criar animal');
      }
    } catch (err) {
      toast.error('Erro ao criar animal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <Breadcrumbs />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Novo Animal</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Animal</CardTitle>
            <CardDescription>Preencha as informações do novo animal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Brinco e Nome */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="brinco">Brinco *</Label>
                  <Input
                    id="brinco"
                    name="brinco"
                    placeholder="Ex: 001"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    name="nome"
                    placeholder="Ex: Princesa"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Sexo e Data de Nascimento */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sexo">Sexo *</Label>
                  <Select name="sexo" defaultValue="Macho" required>
                    <SelectTrigger id="sexo" disabled={isSubmitting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        id="data_nascimento"
                        name="data_nascimento"
                        type="date"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <Checkbox
                        id="data_nascimento_estimada"
                        name="data_nascimento_estimada"
                        checked={dataEstimada}
                        onCheckedChange={(checked) => setDataEstimada(checked === true)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="data_nascimento_estimada" className="text-sm cursor-pointer">
                        Estimada
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipo de Rebanho e Raça */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="tipo_rebanho">Tipo de Rebanho *</Label>
                  <Select name="tipo_rebanho" defaultValue="leiteiro" required>
                    <SelectTrigger id="tipo_rebanho" disabled={isSubmitting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leiteiro">Leiteiro</SelectItem>
                      <SelectItem value="corte">Corte</SelectItem>
                      <SelectItem value="dupla_aptidao">Dupla Aptidão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="raca">Raça</Label>
                  <Input
                    id="raca"
                    name="raca"
                    placeholder="Ex: Holandês"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Origem */}
              <div>
                <Label htmlFor="origem">Origem *</Label>
                <Select value={origem} onValueChange={(val) => setOrigem(val as 'nascido' | 'comprado')}>
                  <SelectTrigger id="origem" disabled={isSubmitting}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nascido">Nascido na propriedade</SelectItem>
                    <SelectItem value="comprado">Comprado</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="origem" value={origem} />
              </div>

              {/* Peso ao Nascimento (se nascido) */}
              {origem === 'nascido' && (
                <div>
                  <Label htmlFor="peso_nascimento">Peso ao Nascimento (kg)</Label>
                  <Input
                    id="peso_nascimento"
                    name="peso_nascimento"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 35.5"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* SISBOV/CRBIO */}
              <div>
                <Label htmlFor="sisbov_crbio">Código SISBOV/CRBIO</Label>
                <Input
                  id="sisbov_crbio"
                  name="sisbov_crbio"
                  placeholder="Ex: 12345678901234"
                  disabled={isSubmitting}
                />
              </div>

              {/* Lote */}
              <div>
                <Label htmlFor="lote_id">Lote</Label>
                <Select
                  name="lote_id"
                  value={loteId}
                  onValueChange={(value) => setLoteId(value || '')}
                >
                  <SelectTrigger id="lote_id" disabled={isSubmitting}>
                    <SelectValue placeholder="Sem lote" />
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

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  placeholder="Adicione informações extras sobre o animal"
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
                  {isSubmitting ? 'Criando...' : 'Criar Animal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
