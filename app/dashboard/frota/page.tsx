'use client';

import { useState, useEffect, useId } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Truck,
  Settings,
  Fuel,
  Clock,
  Gauge,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Maquina, UsoMaquina, Manutencao, Abastecimento } from '@/lib/supabase';
import { getMaquinasByFazenda, createMaquina } from '@/lib/supabase/maquinas';
import { format, isBefore, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FrotaPage() {
  const [maquinas, setMaquinas]           = useState<Maquina[]>([]);
  const [usos, setUsos]                   = useState<UsoMaquina[]>([]);
  const [manutencoes, setManutencoes]     = useState<Manutencao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isAddMaquinaOpen, setIsAddMaquinaOpen] = useState(false);
  const [isManutencaoOpen, setIsManutencaoOpen] = useState(false);

  // IDs estáveis para associação label ↔ controle
  const uid = useId();
  const ids = {
    // Dialog manutenção
    manTitle:   `${uid}-man-title`,
    manDesc:    `${uid}-man-desc`,
    manMaq:     `${uid}-man-maq`,
    manTipo:    `${uid}-man-tipo`,
    // Dialog nova máquina
    maqTitle:   `${uid}-maq-title`,
    maqDesc:    `${uid}-maq-desc`,
    maqTipo:    `${uid}-maq-tipo`,
    // Depreciação
    depValor:   `${uid}-dep-valor`,
    depData:    `${uid}-dep-data`,
    depVida:    `${uid}-dep-vida`,
  };

  const [newMaquina, setNewMaquina] = useState({
    nome: '',
    tipo: 'Trator' as Maquina['tipo'],
    marca: '',
    modelo: '',
    ano: '',
    identificacao: '',
    consumo_medio_lh: '',
    valor_aquisicao: '',
    data_aquisicao: '',
    vida_util_anos: '10',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('fazenda_id')
        .eq('id', user.id)
        .single();

      if (profile?.fazenda_id) {
        // ✅ Busca maquinas uma única vez e reutiliza os IDs
        const maquinasData = await getMaquinasByFazenda(profile.fazenda_id);
        const ids_maquinas = maquinasData.map((m) => m.id);

        const [usosRes, manutencoesRes, abastecimentosRes] = await Promise.all([
          supabase.from('uso_maquinas').select('*').in('maquina_id', ids_maquinas),
          supabase.from('manutencoes').select('*').in('maquina_id', ids_maquinas),
          supabase.from('abastecimentos').select('*').in('maquina_id', ids_maquinas),
        ]);

        setMaquinas(maquinasData);
        setUsos(usosRes.data || []);
        setManutencoes(manutencoesRes.data || []);
        setAbastecimentos(abastecimentosRes.data || []);
      }
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaquina = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('fazenda_id')
        .eq('id', user.id)
        .single();

      if (profile?.fazenda_id) {
        await createMaquina({
          nome: newMaquina.nome,
          tipo: newMaquina.tipo,
          marca: newMaquina.marca || null,
          modelo: newMaquina.modelo || null,
          ano: newMaquina.ano ? Number(newMaquina.ano) : null,
          identificacao: newMaquina.identificacao || null,
          fazenda_id: profile.fazenda_id,
          consumo_medio_lh: newMaquina.consumo_medio_lh
            ? Number(newMaquina.consumo_medio_lh) : null,
          valor_aquisicao: newMaquina.valor_aquisicao
            ? Number(newMaquina.valor_aquisicao) : null,
          data_aquisicao: newMaquina.data_aquisicao || null,
          vida_util_anos: newMaquina.vida_util_anos
            ? Number(newMaquina.vida_util_anos) : 10,
        });
        toast.success('Máquina cadastrada com sucesso!');
        setIsAddMaquinaOpen(false);
        fetchData();
        setNewMaquina({
          nome: '', tipo: 'Trator', marca: '', modelo: '', ano: '',
          identificacao: '', consumo_medio_lh: '', valor_aquisicao: '',
          data_aquisicao: '', vida_util_anos: '10',
        });
      }
    } catch {
      toast.error('Erro ao cadastrar máquina');
    }
  };

  const calcularDepreciacao = (maquina: Maquina) => {
    if (!maquina.valor_aquisicao || !maquina.data_aquisicao) return null;
    const anosUso =
      differenceInDays(new Date(), new Date(maquina.data_aquisicao)) / 365;
    const depAnual = maquina.valor_aquisicao / (maquina.vida_util_anos ?? 10);
    const valorAtual = Math.max(0, maquina.valor_aquisicao - depAnual * anosUso);
    return {
      valorAtual,
      depAcumulada: maquina.valor_aquisicao - valorAtual,
      percentualRestante: (valorAtual / maquina.valor_aquisicao) * 100,
    };
  };

  /**
   * Retorna dados de status de manutenção — sem JSX, para manter lógica separada.
   * O JSX é renderizado diretamente no card com aria correto.
   */
  const getMaintenanceStatus = (maquinaId: string) => {
    const maquinaManutencoes = manutencoes.filter((m) => m.maquina_id === maquinaId);
    if (maquinaManutencoes.length === 0) return null;

    const last = maquinaManutencoes[maquinaManutencoes.length - 1];
    if (!last.proxima_manutencao) return null;

    const nextDate = new Date(last.proxima_manutencao);
    const today    = new Date();

    if (isBefore(nextDate, today))            return 'vencida';
    if (isBefore(nextDate, addDays(today, 7))) return 'proxima';
    return null;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Frota e Máquinas</h1>
        <div className="flex gap-2">

          {/* Dialog: Registrar Manutenção */}
          <Dialog open={isManutencaoOpen} onOpenChange={setIsManutencaoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Registrar Manutenção
              </Button>
            </DialogTrigger>
            <DialogContent
              aria-labelledby={ids.manTitle}
              aria-describedby={ids.manDesc}
            >
              <DialogHeader>
                <DialogTitle id={ids.manTitle}>Nova Manutenção</DialogTitle>
                <DialogDescription id={ids.manDesc}>
                  Registre serviços preventivos ou corretivos.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success('Manutenção registrada!');
                  setIsManutencaoOpen(false);
                }}
                className="space-y-4 py-4"
                aria-labelledby={ids.manTitle}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={ids.manMaq}>Máquina</Label>
                    <Select required>
                      <SelectTrigger id={ids.manMaq}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {maquinas.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={ids.manTipo}>Tipo</Label>
                    <Select defaultValue="Preventiva">
                      <SelectTrigger id={ids.manTipo}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="man-desc">Descrição do Serviço</Label>
                  <Input
                    id="man-desc"
                    placeholder="Ex: Troca de óleo, reparo hidráulico"
                    required
                    aria-required="true"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="man-custo">Custo (R$)</Label>
                    <Input
                      id="man-custo"
                      type="number"
                      step="0.01"
                      required
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="man-prox">Próxima Manutenção</Label>
                    <Input id="man-prox" type="date" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog: Nova Máquina */}
          <Dialog open={isAddMaquinaOpen} onOpenChange={setIsAddMaquinaOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nova Máquina
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-2xl"
              aria-labelledby={ids.maqTitle}
              aria-describedby={ids.maqDesc}
            >
              <DialogHeader>
                <DialogTitle id={ids.maqTitle}>Cadastrar Nova Máquina</DialogTitle>
                <DialogDescription id={ids.maqDesc}>
                  Adicione um novo equipamento à frota.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleAddMaquina}
                className="space-y-4 py-4"
                aria-labelledby={ids.maqTitle}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-nome">Nome / Identificação</Label>
                    <Input
                      id="maq-nome"
                      placeholder="Ex: Trator JD 01"
                      required
                      aria-required="true"
                      value={newMaquina.nome}
                      onChange={(e) => setNewMaquina({ ...newMaquina, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-ident">Placa / Patrimônio</Label>
                    <Input
                      id="maq-ident"
                      placeholder="Ex: ABC-1234"
                      value={newMaquina.identificacao}
                      onChange={(e) => setNewMaquina({ ...newMaquina, identificacao: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={ids.maqTipo}>Tipo</Label>
                    <Select
                      defaultValue="Trator"
                      onValueChange={(v: any) => v && setNewMaquina({ ...newMaquina, tipo: v })}
                    >
                      <SelectTrigger id={ids.maqTipo}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Trator">Trator</SelectItem>
                        <SelectItem value="Colheitadeira">Colheitadeira</SelectItem>
                        <SelectItem value="Pulverizador">Pulverizador</SelectItem>
                        <SelectItem value="Caminhão">Caminhão</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-marca">Marca</Label>
                    <Input
                      id="maq-marca"
                      placeholder="Ex: John Deere"
                      value={newMaquina.marca}
                      onChange={(e) => setNewMaquina({ ...newMaquina, marca: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maq-modelo">Modelo</Label>
                    <Input
                      id="maq-modelo"
                      placeholder="Ex: 6125J"
                      value={newMaquina.modelo}
                      onChange={(e) => setNewMaquina({ ...newMaquina, modelo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-ano">Ano</Label>
                    <Input
                      id="maq-ano"
                      type="number"
                      value={newMaquina.ano}
                      onChange={(e) => setNewMaquina({ ...newMaquina, ano: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maq-cons">Consumo (L/h)</Label>
                    <Input
                      id="maq-cons"
                      type="number"
                      step="0.1"
                      value={newMaquina.consumo_medio_lh}
                      onChange={(e) =>
                        setNewMaquina({ ...newMaquina, consumo_medio_lh: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Seção de depreciação */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  {/* p — não é heading de página, mas subtítulo de seção do form */}
                  <p className="text-sm font-semibold flex items-center gap-2" id={`${uid}-dep-heading`}>
                    <TrendingDown className="w-4 h-4" aria-hidden="true" />
                    Dados para Depreciação
                  </p>
                  <div
                    className="grid grid-cols-3 gap-4"
                    role="group"
                    aria-labelledby={`${uid}-dep-heading`}
                  >
                    <div className="space-y-2">
                      <Label htmlFor={ids.depValor} className="text-xs">
                        Valor Aquisição (R$)
                      </Label>
                      <Input
                        id={ids.depValor}
                        type="number"
                        step="0.01"
                        value={newMaquina.valor_aquisicao}
                        onChange={(e) =>
                          setNewMaquina({ ...newMaquina, valor_aquisicao: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={ids.depData} className="text-xs">
                        Data Aquisição
                      </Label>
                      <Input
                        id={ids.depData}
                        type="date"
                        value={newMaquina.data_aquisicao}
                        onChange={(e) =>
                          setNewMaquina({ ...newMaquina, data_aquisicao: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={ids.depVida} className="text-xs">
                        Vida Útil (Anos)
                      </Label>
                      <Input
                        id={ids.depVida}
                        type="number"
                        value={newMaquina.vida_util_anos}
                        onChange={(e) =>
                          setNewMaquina({ ...newMaquina, vida_util_anos: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    Cadastrar Máquina
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* ── Cards de Máquinas ──────────────────────────────────────────── */}
      <section aria-labelledby="frota-heading">
        <h2 id="frota-heading" className="sr-only">Máquinas cadastradas</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {maquinas.map((maquina) => {
            const dep = calcularDepreciacao(maquina);
            const maintenanceStatus = getMaintenanceStatus(maquina.id);

            const horasTotais = usos
              .filter((u) => u.maquina_id === maquina.id)
              .reduce((acc: number, u: UsoMaquina) => acc + (u.horas || 0), 0);

            const kmTotais = usos
              .filter((u) => u.maquina_id === maquina.id)
              .reduce((acc: number, u: UsoMaquina) => acc + (u.km || 0), 0);

            return (
              <Card key={maquina.id} aria-label={`Máquina: ${maquina.nome}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle as="h3" className="text-xl font-bold">
                    {maquina.nome}
                  </CardTitle>
                  <Truck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {maquina.tipo}
                        {maquina.identificacao ? ` • ${maquina.identificacao}` : ''}
                      </span>

                      {/* Badge de manutenção com aria-live para anunciar mudanças */}
                      {maintenanceStatus === 'vencida' && (
                        <Badge
                          variant="destructive"
                          // ✅ motion-safe evita piscar para quem tem prefers-reduced-motion
                          className="motion-safe:animate-pulse"
                          aria-label="Atenção: manutenção vencida"
                          role="status"
                        >
                          Manutenção Vencida
                        </Badge>
                      )}
                      {maintenanceStatus === 'proxima' && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500 text-white"
                          aria-label="Próxima manutenção em menos de 7 dias"
                          role="status"
                        >
                          Próxima Manutenção
                        </Badge>
                      )}
                    </div>

                    {/* Marca / Modelo / Ano — text-xs mínimo 12px */}
                    <div className="text-xs text-muted-foreground">
                      {[maquina.marca, maquina.modelo, maquina.ano].filter(Boolean).join(' ')}
                    </div>

                    {dep && (
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        {/* text-[10px] → text-xs para WCAG 1.4.4 */}
                        <div className="flex justify-between text-xs font-semibold uppercase text-muted-foreground">
                          <span>Valor Atual Estimado</span>
                          <span className="text-emerald-600">
                            -{(100 - dep.percentualRestante).toFixed(1)}%
                          </span>
                        </div>
                        <div
                          className="text-lg font-bold text-foreground"
                          aria-label={`Valor atual estimado: R$ ${dep.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        >
                          R${' '}
                          {dep.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        {/* text-[9px] → text-xs para WCAG 1.4.4 */}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Aquisição: R${' '}
                            {maquina.valor_aquisicao?.toLocaleString('pt-BR')}
                          </span>
                          <span>Vida Útil: {maquina.vida_util_anos} anos</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2 border-t">
                      <div
                        className="flex items-center gap-1 text-xs font-medium text-blue-600"
                        aria-label={`Horas trabalhadas: ${horasTotais} horas`}
                      >
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {horasTotais}h
                      </div>
                      <div
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600"
                        aria-label={`Quilometragem: ${kmTotais} km`}
                      >
                        <Gauge className="w-3 h-3" aria-hidden="true" />
                        {kmTotais}km
                      </div>
                      {maquina.consumo_medio_lh && (
                        <div
                          className="flex items-center gap-1 text-xs font-medium text-amber-600"
                          aria-label={`Consumo médio: ${maquina.consumo_medio_lh} litros por hora`}
                        >
                          <Fuel className="w-3 h-3" aria-hidden="true" />
                          {maquina.consumo_medio_lh}L/h
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Estado vazio */}
          {maquinas.length === 0 && !loading && (
            <Card
              className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed"
              role="status"
              aria-label="Nenhuma máquina cadastrada"
            >
              <Truck
                className="h-12 w-12 text-muted-foreground mb-4 opacity-20"
                aria-hidden="true"
              />
              <CardTitle className="text-muted-foreground">
                Nenhuma máquina cadastrada
              </CardTitle>
              <CardDescription>
                Clique em &quot;Nova Máquina&quot; para começar a gerenciar sua frota.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      {/* ── Tabs de histórico ──────────────────────────────────────────── */}
      <Tabs defaultValue="uso" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="uso"          aria-label="Aba: Uso Diário">Uso Diário</TabsTrigger>
          <TabsTrigger value="manutencao"   aria-label="Aba: Manutenções">Manutenções</TabsTrigger>
          <TabsTrigger value="abastecimento" aria-label="Aba: Abastecimentos">Abastecimentos</TabsTrigger>
        </TabsList>

        {/* Aba: Uso Diário */}
        <TabsContent value="uso" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle id="uso-titulo">Histórico de Uso</CardTitle>
                <CardDescription>Registros de atividades e horas trabalhadas.</CardDescription>
              </div>
              {/* Botão sem dialog — desabilitado para não criar armadilha de foco */}
              <Button size="sm" disabled aria-disabled="true" aria-label="Registrar uso — funcionalidade em breve">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Registrar Uso
              </Button>
            </CardHeader>
            <CardContent>
              <Table aria-labelledby="uso-titulo">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Data</TableHead>
                    <TableHead scope="col">Máquina</TableHead>
                    <TableHead scope="col">Operador</TableHead>
                    <TableHead scope="col">Atividade</TableHead>
                    <TableHead scope="col">Horas</TableHead>
                    <TableHead scope="col">KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usos.map((uso) => (
                    <TableRow key={uso.id}>
                      <TableCell>
                        {format(new Date(uso.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find((m) => m.id === uso.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>{uso.operador}</TableCell>
                      <TableCell>{uso.atividade}</TableCell>
                      <TableCell>{uso.horas ? `${uso.horas}h` : '—'}</TableCell>
                      <TableCell>{uso.km   ? `${uso.km}km`   : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {usos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Nenhum registro de uso encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Manutenções */}
        <TabsContent value="manutencao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle id="man-hist-titulo">Histórico de Manutenções</CardTitle>
              <CardDescription>Serviços realizados e próximos agendamentos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table aria-labelledby="man-hist-titulo">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Data</TableHead>
                    <TableHead scope="col">Máquina</TableHead>
                    <TableHead scope="col">Tipo</TableHead>
                    <TableHead scope="col">Descrição</TableHead>
                    <TableHead scope="col">Custo</TableHead>
                    <TableHead scope="col">Próxima</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manutencoes.map((man) => (
                    <TableRow key={man.id}>
                      <TableCell>
                        {format(new Date(man.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find((m) => m.id === man.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={man.tipo === 'Preventiva' ? 'outline' : 'secondary'}>
                          {man.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{man.descricao}</TableCell>
                      <TableCell className="font-bold">
                        R$ {man.custo?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {man.proxima_manutencao
                          ? format(new Date(man.proxima_manutencao), 'dd/MM/yyyy', { locale: ptBR })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {manutencoes.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Nenhuma manutenção registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Abastecimentos */}
        <TabsContent value="abastecimento" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle id="abast-titulo">Histórico de Abastecimentos</CardTitle>
                <CardDescription>Consumo de combustível por máquina.</CardDescription>
              </div>
              <Button size="sm" variant="outline" disabled aria-disabled="true" aria-label="Registrar abastecimento — funcionalidade em breve">
                <Fuel className="mr-2 h-4 w-4" aria-hidden="true" />
                Novo Abastecimento
              </Button>
            </CardHeader>
            <CardContent>
              <Table aria-labelledby="abast-titulo">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Data</TableHead>
                    <TableHead scope="col">Máquina</TableHead>
                    <TableHead scope="col">Combustível</TableHead>
                    <TableHead scope="col">Litros</TableHead>
                    <TableHead scope="col">Valor Total</TableHead>
                    <TableHead scope="col">Hodômetro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abastecimentos.map((abs) => (
                    <TableRow key={abs.id}>
                      <TableCell>
                        {format(new Date(abs.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {maquinas.find((m) => m.id === abs.maquina_id)?.nome || 'Máquina removida'}
                      </TableCell>
                      <TableCell>{abs.combustivel}</TableCell>
                      <TableCell className="font-bold">{abs.litros} L</TableCell>
                      <TableCell>R$ {abs.valor?.toFixed(2)}</TableCell>
                      <TableCell>{abs.hodometro}</TableCell>
                    </TableRow>
                  ))}
                  {abastecimentos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Nenhum abastecimento registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
