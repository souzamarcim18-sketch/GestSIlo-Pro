'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Settings, Shield, Building, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Profile, Fazenda } from '@/lib/supabase';

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fazenda, setFazenda] = useState<Fazenda | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mocking data
      const mockProfile: Profile = { id: '1', nome: 'Administrador', email: 'admin@gestsilo.com', perfil: 'Administrador', fazenda_id: '1' };
      setProfile(mockProfile);

      const mockFazenda: Fazenda = { id: '1', nome: 'Fazenda São José', localizacao: 'BR-163, KM 450, Sorriso - MT', area_total: 850 };
      setFazenda(mockFazenda);

      const mockUsers: Profile[] = [
        { id: '1', nome: 'Administrador', email: 'admin@gestsilo.com', perfil: 'Administrador', fazenda_id: '1' },
        { id: '2', nome: 'João Silva', email: 'joao@fazenda.com', perfil: 'Operador', fazenda_id: '1' },
        { id: '3', nome: 'Maria Santos', email: 'maria@fazenda.com', perfil: 'Visualizador', fazenda_id: '1' },
      ];
      setUsers(mockUsers);
    } catch (error) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h2>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
          <TabsTrigger value="fazenda">Dados da Fazenda</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários e Acessos</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Gerencie seus dados de acesso e perfil.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prof-nome">Nome Completo</Label>
                    <Input id="prof-nome" defaultValue={profile?.nome} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-email">E-mail</Label>
                    <Input id="prof-email" type="email" defaultValue={profile?.email} disabled />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prof-perfil">Perfil de Acesso</Label>
                    <Input id="prof-perfil" defaultValue={profile?.perfil} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-senha">Nova Senha</Label>
                    <Input id="prof-senha" type="password" placeholder="Deixe em branco para manter a atual" />
                  </div>
                </div>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fazenda" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Propriedade</CardTitle>
              <CardDescription>Informações gerais da fazenda ativa.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveFazenda} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="faz-nome">Nome da Fazenda</Label>
                  <Input id="faz-nome" defaultValue={fazenda?.nome} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faz-loc">Localização / Endereço</Label>
                  <Input id="faz-loc" defaultValue={fazenda?.localizacao || ''} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="faz-area">Área Total (ha)</Label>
                    <Input id="faz-area" type="number" defaultValue={fazenda?.area_total || 0} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faz-prop">Proprietário</Label>
                    <Input id="faz-prop" placeholder="Nome do proprietário" />
                  </div>
                </div>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Dados
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Controle de Usuários</CardTitle>
                <CardDescription>Gerencie quem tem acesso ao sistema da fazenda.</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Convidar Usuário
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.perfil === 'Administrador' ? "default" : "outline"}>
                          {user.perfil}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600 border-green-600">Ativo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
