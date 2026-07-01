'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { hydrateEventosFromServer } from '@/lib/db/eventosRebanho';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SelecionarAnimalDialog } from './components/SelecionarAnimalDialog';
import { PainelResumo } from './components/PainelResumo';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Milk, Stethoscope, ArrowRightLeft, Beef, ClipboardList, Table2, Upload, ChevronDown, User, Users, FileInput, CalendarPlus, SlidersHorizontal, ListChecks } from 'lucide-react';
import { CowIcon } from '@/components/icons/CowIcon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
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
import { Badge } from '@/components/ui/badge';
import { listAnimais, countAnimais } from '@/lib/supabase/rebanho';
import type { AnimalParaPainel, PainelRebanhoExtras } from '@/lib/supabase/rebanho';
import type { Animal, Lote } from '@/lib/types/rebanho';

const PAGE_SIZE = 50;

interface Props {
  initialAnimais: Animal[];
  initialTotal: number;
  animaisParaPainel: AnimalParaPainel[];
  initialLotes: Lote[];
  painelExtras: PainelRebanhoExtras;
  isAdmin: boolean;
}

// Acesso rápido a todos os subdomínios do rebanho — ordem e nomenclatura
// alinhadas ao painel de visão geral.
// Reprodução e Indicadores foram absorvidos pelos painéis de Leite e Corte
// (abas por espécie), então saíram do hub.
const SUBDOMINIOS = [
  { href: '/dashboard/rebanho/leiteira', icon: Milk, titulo: 'Painel Gado de Leite', descricao: 'Produção, reprodução e indicadores' },
  { href: '/dashboard/rebanho/corte', icon: Beef, titulo: 'Painel Gado de Corte', descricao: 'Desempenho, reprodução e indicadores' },
  { href: '/dashboard/rebanho/sanidade', icon: Stethoscope, titulo: 'Sanidade', descricao: 'Vacinação e alertas' },
  { href: '/dashboard/rebanho/operacao', icon: ListChecks, titulo: 'Operações', descricao: 'Pendências e rotina' },
  { href: '/dashboard/rebanho/movimentacoes', icon: ArrowRightLeft, titulo: 'Movimentações', descricao: 'Entradas e saídas' },
] as const;

export function RebanhoClient({ initialAnimais, initialTotal, animaisParaPainel, initialLotes, painelExtras, isAdmin }: Props) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [animais, setAnimais] = useState<Animal[]>(initialAnimais);
  const [total, setTotal] = useState(initialTotal);
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroLote, setFiltroLote] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroSexo, setFiltroSexo] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selecionarAnimalOpen, setSelecionarAnimalOpen] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Hidrata o cache IndexedDB com eventos recentes do servidor na montagem inicial
  useEffect(() => {
    if (!isOnline) return;
    async function hydrate() {
      const { data } = await supabase
        .from('eventos_rebanho')
        .select('id, animal_id, tipo, data_evento, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (data) {
        await hydrateEventosFromServer(
          data.map((e) => ({
            id: e.id,
            animal_id: e.animal_id,
            tipo_evento: e.tipo as Parameters<typeof hydrateEventosFromServer>[0][number]['tipo_evento'],
            data_evento: e.data_evento,
            payload: e as Record<string, unknown>,
          }))
        );
      }
    }
    hydrate();
  }, [isOnline]);

  const categorias = Array.from(new Set(initialAnimais.map(a => a.categoria).filter(Boolean))).sort();

  const fetchAnimais = useCallback(async (params: {
    status?: string; lote_id?: string; tipo?: string; sexo?: string; busca?: string; pagina?: number;
  }) => {
    setLoading(true);
    const pg = params.pagina ?? 0;
    const filtros = {
      status: params.status || undefined,
      lote_id: params.lote_id || undefined,
      tipo_rebanho: params.tipo || undefined,
      sexo: params.sexo || undefined,
      busca: params.busca || undefined,
    };
    try {
      const [data, novoTotal] = await Promise.all([
        listAnimais(filtros, PAGE_SIZE, pg * PAGE_SIZE),
        countAnimais(filtros),
      ]);
      setAnimais(data);
      setTotal(novoTotal);
      setPagina(pg);
    } catch {
      toast.error('Erro ao carregar animais');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFiltroChange = (campo: string, valor: string | null) => {
    const v = valor ?? '';
    const novos = {
      status: filtroStatus,
      lote_id: filtroLote,
      tipo: filtroTipo,
      sexo: filtroSexo,
      busca,
      [campo]: v,
      pagina: 0,
    };
    if (campo === 'status') setFiltroStatus(v);
    if (campo === 'lote_id') setFiltroLote(v);
    if (campo === 'tipo') setFiltroTipo(v);
    if (campo === 'sexo') setFiltroSexo(v);
    if (campo === 'busca') setBusca(v);
    fetchAnimais(novos);
  };

  const handlePaginaChange = (novaPagina: number) => {
    fetchAnimais({
      status: filtroStatus,
      lote_id: filtroLote,
      tipo: filtroTipo,
      sexo: filtroSexo,
      busca,
      pagina: novaPagina,
    });
  };

  const animaisFiltrados = filtroCategoria
    ? animais.filter(a => a.categoria === filtroCategoria)
    : animais;

  const filtrosAtivos = [filtroStatus, filtroTipo, filtroSexo, filtroCategoria, filtroLote].filter(Boolean).length;

  const rebanhoVazio = initialAnimais.length === 0 && initialLotes.length === 0;

  const totalPaginas = Math.ceil(total / PAGE_SIZE);
  const inicio = pagina * PAGE_SIZE + 1;
  const fim = Math.min(pagina * PAGE_SIZE + animais.length, total);

  return (
    <div className="space-y-6">
      <PageHeader icon={CowIcon} titulo="Gestão do Rebanho">
        {isAdmin && (
          <>
            {/* Cadastro de animais */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar animais
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/dashboard/rebanho/novo')}>
                  <User className="mr-2 h-4 w-4" />
                  Animal único
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Operação — em massa</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/rebanho/cadastro-rapido')}>
                    <Table2 className="mr-2 h-4 w-4" />
                    Cadastro rápido (vários)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/rebanho/importar')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar CSV
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Lotes */}
            <Button variant="outline" onClick={() => router.push('/dashboard/rebanho/lotes')}>
              <Users className="mr-2 h-4 w-4" />
              Lotes
            </Button>

            {/* Lançamento de eventos */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Lançar eventos
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelecionarAnimalOpen(true)}>
                  <FileInput className="mr-2 h-4 w-4" />
                  Evento em um animal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Operação — em massa</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/rebanho/eventos/lote/novo')}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Lançamento múltiplo
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </PageHeader>

      <SelecionarAnimalDialog
        open={selecionarAnimalOpen}
        onOpenChange={setSelecionarAnimalOpen}
        animais={animais}
      />

      {/* Aviso de primeiro cadastro — sem animais e sem lotes */}
      {rebanhoVazio && isAdmin && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Beef className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold">Comece a gerir seu rebanho</p>
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem animais nem lotes cadastrados. Crie um lote para organizar
                  o rebanho e cadastre seu primeiro animal.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
              <Button variant="outline" onClick={() => router.push('/dashboard/rebanho/lotes')}>
                Criar primeiro lote
              </Button>
              <Button onClick={() => router.push('/dashboard/rebanho/novo')}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar primeiro animal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Painel de visão geral do rebanho */}
      {!rebanhoVazio && (
        <PainelResumo animais={animaisParaPainel} lotes={initialLotes} extras={painelExtras} />
      )}

      {/* Acesso Rápido — todos os subdomínios do rebanho */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Áreas de gestão</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {SUBDOMINIOS.map(({ href, icon: Icon, titulo, descricao }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-accent/50 hover:border-primary/30 transition-all duration-150 cursor-pointer text-center group h-full">
                <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-sm leading-tight">{titulo}</p>
                <p className="text-xs text-muted-foreground leading-tight hidden sm:block">{descricao}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Lista de animais — título + filtros */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lista de animais</h2>

      {/* Filtros — busca sempre visível, selects colapsáveis */}
      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por brinco..."
              value={busca}
              onChange={(e) => handleFiltroChange('busca', e.target.value)}
            />
          </div>
          <CollapsibleTrigger
            render={
              <Button variant="outline" className="shrink-0">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtros
                {filtrosAtivos > 0 && (
                  <Badge variant="secondary" className="ml-2">{filtrosAtivos}</Badge>
                )}
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`}
                />
              </Button>
            }
          />
        </div>
        <CollapsibleContent>
          <Card className="mt-2">
            <div className="grid gap-4 p-4 md:grid-cols-3 lg:grid-cols-5">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={filtroStatus} onValueChange={(val) => handleFiltroChange('status', val)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
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
                <Select value={filtroTipo} onValueChange={(val) => handleFiltroChange('tipo', val)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
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
                <Select value={filtroSexo} onValueChange={(val) => handleFiltroChange('sexo', val)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="Macho">Macho</SelectItem>
                    <SelectItem value="Fêmea">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(v ?? '')}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Lote</label>
                <Select value={filtroLote} onValueChange={(val) => handleFiltroChange('lote_id', val)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {initialLotes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {animaisFiltrados.length === 0 ? (
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
                    <TableHead />
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
                        <Badge
                          variant="outline"
                          className={
                            animal.status === 'Ativo'
                              ? 'border-green-600 text-green-600'
                              : animal.status === 'Morto'
                                ? 'border-red-600 text-red-600'
                                : 'border-yellow-600 text-yellow-600'
                          }
                        >
                          {animal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {animal.peso_atual ? `${animal.peso_atual.toFixed(2)} kg` : '—'}
                      </TableCell>
                      <TableCell>
                        {animal.lote_id
                          ? initialLotes.find((l) => l.id === animal.lote_id)?.nome || '—'
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? 'Nenhum animal encontrado'
            : `Exibindo ${inicio}–${fim} de ${total} animal(is)`}
        </p>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePaginaChange(pagina - 1)}
              disabled={pagina === 0 || loading}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pagina + 1} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePaginaChange(pagina + 1)}
              disabled={pagina >= totalPaginas - 1 || loading}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
