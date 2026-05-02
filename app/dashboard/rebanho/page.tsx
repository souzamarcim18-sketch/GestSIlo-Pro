'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listAnimais, listLotes } from '@/lib/supabase/rebanho';
import type { Animal, Lote, StatusAnimal } from '@/lib/types/rebanho';

export default function RebanhosPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();

  const [animais, setAnimais] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [filtroLote, setFiltroLote] = useState<string | null>(null);

  const isAdmin = profile?.perfil === 'Administrador';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [animaisData, lotesData] = await Promise.all([
        listAnimais(
          {
            status: filtroStatus ? filtroStatus : undefined,
            lote_id: filtroLote ? filtroLote : undefined,
            busca: busca || undefined,
          },
          100,
          0
        ),
        listLotes(100, 0),
      ]);

      setAnimais(animaisData);
      setLotes(lotesData);
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, filtroLote, busca]);

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [authLoading, fetchData]);

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <Breadcrumbs />
          <div className="flex items-center justify-between mt-4">
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Rebanho</h1>
            <div className="space-x-2">
              {isAdmin && (
                <>
                  <Button onClick={() => router.push('/dashboard/rebanho/novo')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Animal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/rebanho/lotes')}
                  >
                    Lotes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/rebanho/importar')}
                  >
                    Importar CSV
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Buscar por Brinco</label>
                <Input
                  placeholder="Ex: 001"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Morto">Morto</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Lote</label>
                <Select value={filtroLote} onValueChange={setFiltroLote}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {lotes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : animais.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <p className="text-muted-foreground mb-4">Nenhum animal encontrado</p>
                {isAdmin && (
                  <Button onClick={() => router.push('/dashboard/rebanho/novo')}>
                    Criar primeiro animal
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brinco</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Peso Atual</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animais.map((animal) => (
                      <TableRow
                        key={animal.id}
                        onClick={() => router.push(`/dashboard/rebanho/${animal.id}`)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">{animal.brinco}</TableCell>
                        <TableCell>{animal.sexo}</TableCell>
                        <TableCell>{animal.categoria}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              animal.status === 'Ativo'
                                ? 'bg-green-100 text-green-700'
                                : animal.status === 'Morto'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {animal.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {animal.peso_atual ? `${animal.peso_atual.toFixed(2)} kg` : '—'}
                        </TableCell>
                        <TableCell>
                          {animal.lote_id
                            ? lotes.find((l) => l.id === animal.lote_id)?.nome || '—'
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/rebanho/${animal.id}`);
                            }}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Total de {animais.length} animal(is) encontrado(s)
        </p>
      </div>
    </div>
  );
}
