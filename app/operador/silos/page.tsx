'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { q } from '@/lib/supabase/queries-audit';
import { type Silo, type MovimentacaoSilo } from '@/lib/supabase';
import { calcularEstoque, calcularStatusSilo } from '../../dashboard/silos/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { LogOut, AlertTriangle, Loader } from 'lucide-react';
import { z } from 'zod';

const operadorSaidaSchema = z.object({
  silo_id: z.string().uuid('Silo inválido'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  subtipo: z.enum(['Uso na alimentação', 'Descarte', 'Transferência', 'Venda']),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
});

type OperadorSaidaInput = z.infer<typeof operadorSaidaSchema>;

const SUBTIPOS_MOVIMENTACAO = [
  { value: 'Uso na alimentação', label: 'Uso na alimentação' },
  { value: 'Descarte', label: 'Descarte' },
  { value: 'Transferência', label: 'Transferência' },
  { value: 'Venda', label: 'Venda' },
];

export default function OperadorSilosPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [silos, setSilos] = useState<Silo[]>([]);
  const [siloSelecionado, setSiloSelecionado] = useState<Silo | null>(null);
  const [estoque, setEstoque] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<OperadorSaidaInput>>({
    silo_id: '',
    quantidade: undefined,
    subtipo: 'Uso na alimentação',
    data: new Date().toISOString().split('T')[0],
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OperadorSaidaInput, string>>>({});

  // Autorização: permitir 'operador' ou 'admin'
  useEffect(() => {
    if (authLoading) return;

    if (!user || !profile) {
      router.push('/login');
      return;
    }

    const roleAllowed = profile.perfil === 'Operador' || profile.perfil === 'Administrador';
    if (!roleAllowed) {
      toast.error('Acesso restrito. Você não tem permissão para acessar esta página.');
      router.push('/login');
      return;
    }
  }, [user, profile, authLoading, router]);

  // Fetch silos ativos (status !== 'Vazio')
  const fetchSilos = useCallback(async () => {
    setLoading(true);
    try {
      const allSilos = await q.silos.list();
      const movimentacoes = await Promise.all(
        allSilos.map((s) => q.movimentacoesSilo.listBySilo(s.id))
      );

      // Filtrar silos ativos: status !== 'Vazio'
      const silosAtivos = allSilos.filter((s, idx) => {
        const status = calcularStatusSilo(s, calcularEstoque(movimentacoes[idx]), movimentacoes[idx]);
        return status !== 'Vazio';
      });

      setSilos(silosAtivos);
    } catch (err) {
      toast.error('Erro ao carregar silos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch estoque de um silo específico
  const fetchEstoqueSilo = useCallback(async (siloId: string) => {
    try {
      const silo = silos.find((s) => s.id === siloId);
      if (!silo) return;

      setSiloSelecionado(silo);

      const movimentacoes = await q.movimentacoesSilo.listBySilo(siloId);
      const estoqueCalc = calcularEstoque(movimentacoes);
      setEstoque(estoqueCalc);
    } catch (err) {
      toast.error('Erro ao carregar estoque do silo');
      console.error(err);
    }
  }, [silos]);

  // Handle silo change
  const handleSiloChange = (siloId: string | null) => {
    if (!siloId) return;
    setFormData((prev) => ({ ...prev, silo_id: siloId }));
    setFormErrors({});
    fetchEstoqueSilo(siloId);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      // Validar schema
      const validatedData = operadorSaidaSchema.parse(formData);

      // Validar quantidade <= estoque
      if (validatedData.quantidade > estoque) {
        setFormErrors({ quantidade: `Quantidade não pode exceder estoque (${estoque.toFixed(2)} ton)` });
        return;
      }

      setSubmitting(true);

      // Criar movimentação de saída
      await q.movimentacoesSilo.create({
        silo_id: validatedData.silo_id,
        tipo: 'Saída',
        subtipo: validatedData.subtipo,
        quantidade: validatedData.quantidade,
        data: validatedData.data,
        talhao_id: null,
        responsavel: profile?.nome || 'Operador',
        observacao: `Saída registrada via app móvel. Subtipo: ${validatedData.subtipo}`,
      });

      toast.success('Saída registrada com sucesso!');

      // Reset form
      setFormData({
        silo_id: '',
        quantidade: undefined,
        subtipo: 'Uso na alimentação',
        data: new Date().toISOString().split('T')[0],
      });
      setSiloSelecionado(null);
      setEstoque(0);

      // Refresh silos
      await fetchSilos();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof OperadorSaidaInput, string>> = {};
        err.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          newErrors[path as keyof OperadorSaidaInput] = issue.message;
        });
        setFormErrors(newErrors);
      } else {
        toast.error(err instanceof Error ? err.message : 'Erro ao registrar saída');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 flex items-center justify-center p-4">
        <Loader className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const quantidadeError = formErrors.quantidade;
  const isQuantidadeExcedida = quantidadeError !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 text-white p-4 flex flex-col">
      {/* Header minimalista */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold">GestSilo</h1>
          <p className="text-xs text-green-100">Saída de Silagem</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-green-100 hover:text-white"
          aria-label="Sair"
        >
          <LogOut className="h-6 w-6" />
        </Button>
      </header>

      {/* Card centralizado */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-sm bg-white text-slate-900 shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Registrar Saída</CardTitle>
            <CardDescription>Informe os dados da saída de silagem</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Silo */}
              <div className="space-y-2">
                <Label htmlFor="silo" className="text-base font-semibold">
                  Silo
                </Label>
                <Select
                  value={formData.silo_id || ''}
                  onValueChange={handleSiloChange}
                >
                  <SelectTrigger
                    id="silo"
                    className="h-12 text-base"
                    aria-label="Selecionar silo"
                  >
                    <SelectValue placeholder="Escolha um silo" />
                  </SelectTrigger>
                  <SelectContent>
                    {silos.map((silo) => (
                      <SelectItem key={silo.id} value={silo.id} className="text-base">
                        {silo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.silo_id && (
                  <p className="text-xs text-destructive">{formErrors.silo_id}</p>
                )}
                {siloSelecionado && (
                  <p className="text-sm text-green-600 font-semibold">
                    Estoque: {estoque.toFixed(2)} ton
                  </p>
                )}
              </div>

              {/* Quantidade */}
              <div className="space-y-2">
                <Label htmlFor="quantidade" className="text-base font-semibold">
                  Quantidade (ton)
                </Label>
                <Input
                  id="quantidade"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.quantidade || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantidade: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="h-12 text-lg"
                  inputMode="decimal"
                  aria-label="Quantidade em toneladas"
                />
                {formErrors.quantidade && (
                  <p className="text-xs text-destructive">{formErrors.quantidade}</p>
                )}
              </div>

              {/* Subtipo */}
              <div className="space-y-2">
                <Label htmlFor="subtipo" className="text-base font-semibold">
                  Tipo de Saída
                </Label>
                <Select
                  value={formData.subtipo || ''}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      subtipo: value as OperadorSaidaInput['subtipo'],
                    }))
                  }
                >
                  <SelectTrigger
                    id="subtipo"
                    className="h-12 text-base"
                    aria-label="Selecionar tipo de saída"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBTIPOS_MOVIMENTACAO.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-base">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.subtipo && (
                  <p className="text-xs text-destructive">{formErrors.subtipo}</p>
                )}
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label htmlFor="data" className="text-base font-semibold">
                  Data
                </Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data: e.target.value }))
                  }
                  className="h-12 text-base"
                  aria-label="Data da saída"
                />
                {formErrors.data && (
                  <p className="text-xs text-destructive">{formErrors.data}</p>
                )}
              </div>

              {/* Alerta se quantidade > estoque */}
              {isQuantidadeExcedida && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm text-red-800">
                    {quantidadeError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Botão submit */}
              <Button
                type="submit"
                disabled={submitting || isQuantidadeExcedida || !siloSelecionado}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                aria-busy={submitting}
              >
                {submitting ? 'Registrando...' : 'Registrar Saída'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center text-green-100 text-xs mt-8">
        <p>GestSilo Pro — Operador v1.0</p>
      </footer>
    </div>
  );
}
