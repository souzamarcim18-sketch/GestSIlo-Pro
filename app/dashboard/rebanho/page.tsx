'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, BarChart3, Heart, Milk, Scale, Stethoscope, ArrowRightLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroSexo, setFiltroSexo] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Set<string>>(new Set());

  const isAdmin = profile?.perfil === 'Administrador';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [animaisData, lotesData] = await Promise.all([
        listAnimais(
          {
            status: filtroStatus ? filtroStatus : undefined,
            lote_id: filtroLote ? filtroLote : undefined,
            tipo_rebanho: filtroTipo ? filtroTipo : undefined,
            sexo: filtroSexo ? filtroSexo : undefined,
            busca: busca || undefined,
          },
          100,
          0
        ),
        listLotes(100, 0),
      ]);

      setAnimais(animaisData);
      setLotes(lotesData);

      const categoriasSet = new Set(animaisData.map(a => a.categoria).filter(c => c));
      setCategorias(categoriasSet);
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, filtroLote, filtroTipo, filtroSexo, busca]);

  const animaisFiltrados = filtroCategoria
    ? animais.filter(a => a.categoria === filtroCategoria)
    : animais;

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [authLoading, fetchData]);

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acesso Rápido */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { href: '/dashboard/rebanho/indicadores', icon: BarChart3, titulo: 'Indicadores', descricao: 'Dashboard com KPIs e 4 alertas proativos' },
              { href: '/dashboard/rebanho/reproducao', icon: Heart, titulo: 'Reprodução', descricao: 'Calendário reprodutivo, eventos, reprodutores' },
              { href: '/dashboard/rebanho/leiteira', icon: Milk, titulo: 'Leiteira', descricao: 'Registro e curva de lactação' },
              { href: '/dashboard/rebanho/corte', icon: Scale, titulo: 'Corte', descricao: 'GMD, arrobas, projeção de abate' },
              { href: '/dashboard/rebanho/sanidade', icon: Stethoscope, titulo: 'Sanidade', descricao: 'Vacinação, sanitários, alertas' },
              { href: '/dashboard/rebanho/movimentacoes', icon: ArrowRightLeft, titulo: 'Movimentações', descricao: 'Entradas, saídas, transferências' },
            ].map(({ href, icon: Icon, titulo, descricao }) => (
              <Link key={href} href={href}>
                <Card className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-150 h-full">
                  <CardContent className="flex flex-col items-start justify-center gap-2 p-6 min-h-[120px]">
                    <Icon className="h-8 w-8 text-[#00A651]" />
                    <p className="font-semibold text-base">{titulo}</p>
                    <p className="text-sm text-muted-foreground">{descricao}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
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
                <Select value={filtroStatus || ''} onValueChange={(val) => setFiltroStatus(val || null)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Morto">Morto</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo Rebanho</label>
                <Select value={filtroTipo || ''} onValueChange={(val) => setFiltroTipo(val || null)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="leiteiro">Leiteiro</SelectItem>
                    <SelectItem value="corte">Corte</SelectItem>
                    <SelectItem value="dupla_aptidao">Dupla Aptidão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Sexo</label>
                <Select value={filtroSexo || ''} onValueChange={(val) => setFiltroSexo(val || null)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="Macho">Macho</SelectItem>
                    <SelectItem value="Fêmea">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Select value={filtroCategoria || ''} onValueChange={(val) => setFiltroCategoria(val || null)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {Array.from(categorias).sort().map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Lote</label>
                <Select value={filtroLote || ''} onValueChange={(val) => setFiltroLote(val || null)}>
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
            ) : animaisFiltrados.length === 0 ? (
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
                      <TableHead className="text-sm font-medium">Brinco</TableHead>
                      <TableHead className="text-sm font-medium">Sexo</TableHead>
                      <TableHead className="text-sm font-medium">Categoria</TableHead>
                      <TableHead className="text-sm font-medium">Status</TableHead>
                      <TableHead className="text-sm font-medium">Peso Atual</TableHead>
                      <TableHead className="text-sm font-medium">Lote</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animaisFiltrados.map((animal) => (
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
          Total de {animaisFiltrados.length} animal(is) encontrado(s)
        </p>
      </div>
    </div>
  );
}
