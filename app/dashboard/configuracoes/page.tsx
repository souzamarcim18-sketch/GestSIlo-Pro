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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Profile, Fazenda } from '@/lib/supabase';

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fazenda, setFazenda]  = useState<Fazenda | null>(null);
  const [users, setUsers]      = useState<Profile[]>([]);
  const [loading, setLoading]  = useState(true);

  // IDs estáveis para associação label ↔ controle e aria-describedby
  const uid = useId();
  const ids = {
    perfilTitle:   `${uid}-perfil-title`,
    fazendaTitle:  `${uid}-fazenda-title`,
    usuariosTitle: `${uid}-usuarios-title`,
    senhaHint:     `${uid}-senha-hint`,
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setProfile(null);
      setFazenda(null);
      setUsers([]);
    } catch {
      // ✅ variável omitida — evita @typescript-eslint/no-unused-vars
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Perfil atualizado com sucesso!');
  };

  const handleSaveFazenda = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Dados da fazenda atualizados!');
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      // ✅ role="status" + aria-label anunciam o estado para AT
      <div
        className="flex items-center justify-center min-h-[400px]"
        role="status"
        aria-label="Carregando configurações..."
        aria-live="polite"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
          aria-hidden="true"
        />
        {/* Texto visível apenas para AT */}
        <span className="sr-only">Carregando configurações...</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {/* ✅ h1 real da página */}
        <h1 className="text-3xl font-bold tracking-tight">
          Configurações do Sistema
        </h1>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="perfil"   aria-label="Aba: Meu Perfil">
            Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="fazenda"  aria-label="Aba: Dados da Fazenda">
            Dados da Fazenda
          </TabsTrigger>
          <TabsTrigger value="usuarios" aria-label="Aba: Usuários e Acessos">
            Usuários e Acessos
          </TabsTrigger>
        </TabsList>

        {/* ── Aba: Perfil ──────────────────────────────────────────────── */}
        <TabsContent value="perfil" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
  <h2 id={ids.perfilTitle} className="text-xl font-semibold leading-none tracking-tight">
    Informações Pessoais
  </h2>
</CardTitle>
              <CardDescription>
                Gerencie seus dados de acesso e perfil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSaveProfile}
                className="space-y-6"
                aria-labelledby={ids.perfilTitle}
                noValidate
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prof-nome">Nome Completo</Label>
                    <Input
                      id="prof-nome"
                      defaultValue={profile?.nome}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-email">E-mail</Label>
                    {/*
                      ✅ aria-disabled reforça disabled para AT que
                      ignoram o atributo nativo em alguns contextos
                    */}
                    <Input
                      id="prof-email"
                      type="email"
                      defaultValue={profile?.email}
                      disabled
                      aria-disabled="true"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prof-perfil">Perfil de Acesso</Label>
                    <Input
                      id="prof-perfil"
                      defaultValue={profile?.perfil}
                      disabled
                      aria-disabled="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-senha">Nova Senha</Label>
                    {/*
                      ✅ aria-describedby associa o hint ao campo —
                      AT lê: "Nova Senha — Deixe em branco para manter a atual"
                    */}
                    <Input
                      id="prof-senha"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-describedby={ids.senhaHint}
                    />
                    <p
                      id={ids.senhaHint}
                      className="text-xs text-muted-foreground"
                    >
                      Deixe em branco para manter a senha atual.
                    </p>
                  </div>
                </div>

                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  Salvar Alterações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aba: Fazenda ─────────────────────────────────────────────── */}
        <TabsContent value="fazenda" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
  <h2 id={ids.fazendaTitle} className="text-xl font-semibold leading-none tracking-tight">
    Dados da Propriedade
  </h2>
</CardTitle>
              <CardDescription>
                Informações gerais da fazenda ativa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSaveFazenda}
                className="space-y-6"
                aria-labelledby={ids.fazendaTitle}
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="faz-nome">Nome da Fazenda</Label>
                  <Input
                    id="faz-nome"
                    defaultValue={fazenda?.nome}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faz-loc">Localização / Endereço</Label>
                  <Input
                    id="faz-loc"
                    defaultValue={fazenda?.localizacao || ''}
                    autoComplete="street-address"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="faz-area">Área Total (ha)</Label>
                    <Input
                      id="faz-area"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={fazenda?.area_total || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faz-prop">Proprietário</Label>
                    <Input
                      id="faz-prop"
                      placeholder="Nome do proprietário"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  Salvar Dados
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aba: Usuários ─────────────────────────────────────────────── */}
        <TabsContent value="usuarios" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
  <h2 id={ids.usuariosTitle} className="text-xl font-semibold leading-none tracking-tight">
    Controle de Usuários
  </h2>
</CardTitle>
                <CardDescription>
                  Gerencie quem tem acesso ao sistema da fazenda.
                </CardDescription>
              </div>
              {/*
                ✅ Botão sem dialog associado recebe toast de feedback
                em vez de silêncio — evita armadilha de foco
              */}
              <Button
                size="sm"
                onClick={() => toast.info('Convite de usuário em breve.')}
                aria-label="Convidar novo usuário para a fazenda"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Convidar Usuário
              </Button>
            </CardHeader>

            <CardContent>
              <Table aria-labelledby={ids.usuariosTitle}>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Nome</TableHead>
                    <TableHead scope="col">E-mail</TableHead>
                    <TableHead scope="col">Perfil</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    {/* ✅ Coluna de ações com texto visível apenas para AT */}
                    <TableHead scope="col" className="text-right">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.perfil === 'Administrador' ? 'default' : 'outline'}
                        >
                          {user.perfil}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-600"
                        >
                          Ativo
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {/*
                          ✅ aria-label inclui o nome do usuário:
                          "Remover acesso de João Silva"
                          — resolve button-name CRITICAL
                        */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Remover acesso de ${user.nome}`}
                          onClick={() =>
                            toast.warning(`Remoção de ${user.nome} em breve.`)
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* ✅ Estado vazio anunciado por AT */}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Nenhum outro usuário cadastrado para esta fazenda.
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
