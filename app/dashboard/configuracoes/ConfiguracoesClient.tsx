'use client';

import { useState, useId, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { InviteUserModal } from '@/components/InviteUserModal';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Scale } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, Fazenda } from '@/lib/supabase';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { updateProfile, updateFazenda, type ConfiguracoesFazenda } from '@/lib/supabase/configuracoes';
import { salvarConfiguracoesPesosAction } from './actions';
import { RemoverUsuarioDialog } from './RemoverUsuarioDialog';
import type { CityOption } from '@/hooks/useGeocoding';

interface Props {
  initialProfile: Profile;
  initialFazenda: Fazenda;
  initialUsers: Profile[];
  isAdmin: boolean;
  userId: string;
  fazendaId: string;
  initialConfiguracoes: ConfiguracoesFazenda | null;
}

export function ConfiguracoesClient({
  initialProfile,
  initialFazenda,
  initialUsers,
  isAdmin,
  userId,
  fazendaId,
  initialConfiguracoes,
}: Props) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'fazenda' | 'usuarios' | 'unidades'>('perfil');
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [fazenda, setFazenda] = useState<Fazenda>(initialFazenda);
  const [users] = useState<Profile[]>(initialUsers);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingFazenda, setSavingFazenda] = useState(false);
  const [savingUnidades, setSavingUnidades] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [pesoConcha, setPesoConcha] = useState(
    initialConfiguracoes?.peso_concha_ton != null ? String(initialConfiguracoes.peso_concha_ton) : ''
  );
  const [pesoVagao, setPesoVagao] = useState(
    initialConfiguracoes?.peso_vagao_ton != null ? String(initialConfiguracoes.peso_vagao_ton) : ''
  );

  const profileNomeRef = useRef<HTMLInputElement>(null);
  const profileSenhaRef = useRef<HTMLInputElement>(null);
  const fazendaNomeRef = useRef<HTMLInputElement>(null);
  const fazendaAreaRef = useRef<HTMLInputElement>(null);

  const uid = useId();
  const ids = {
    perfilTitle:   `${uid}-perfil-title`,
    fazendaTitle:  `${uid}-fazenda-title`,
    usuariosTitle: `${uid}-usuarios-title`,
    senhaHint:     `${uid}-senha-hint`,
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const nome = profileNomeRef.current?.value ?? profile.nome ?? '';
      const novaSenha = profileSenhaRef.current?.value ?? '';

      if (novaSenha) {
        if (novaSenha.length < 6) {
          toast.error('A nova senha deve ter pelo menos 6 caracteres.');
          return;
        }
        const { error: senhaError } = await supabase.auth.updateUser({ password: novaSenha });
        if (senhaError) throw new Error(senhaError.message);
        if (profileSenhaRef.current) profileSenhaRef.current.value = '';
      }

      const updated = await updateProfile(userId, { nome });
      setProfile(updated);
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveUnidades = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUnidades(true);
    try {
      const result = await salvarConfiguracoesPesosAction({
        peso_concha_ton: pesoConcha.trim() || null,
        peso_vagao_ton: pesoVagao.trim() || null,
      });
      if (!result.success) {
        toast.error(result.error ?? 'Erro ao salvar');
        return;
      }
      toast.success('Unidades de medida salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingUnidades(false);
    }
  };

  const handleSaveFazenda = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFazenda(true);
    try {
      const nome       = fazendaNomeRef.current?.value ?? fazenda.nome ?? '';
      const area_total = fazendaAreaRef.current?.value
        ? parseFloat(fazendaAreaRef.current.value)
        : fazenda.area_total ?? null;
      const localizacao = selectedCity?.displayName ?? fazenda.localizacao ?? null;
      const latitude    = selectedCity?.latitude    ?? fazenda.latitude    ?? null;
      const longitude   = selectedCity?.longitude   ?? fazenda.longitude   ?? null;

      const updated = await updateFazenda(fazendaId, { nome, localizacao, area_total, latitude, longitude });
      setFazenda(updated);
      setSelectedCity(null);
      toast.success('Dados da fazenda atualizados!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar dados da fazenda');
    } finally {
      setSavingFazenda(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Configurações do Sistema</h2>
      </div>

      <div className="w-full space-y-6">
        <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/50 border border-border p-[3px] lg:w-[680px]">
          {([
            { value: 'perfil',   label: 'Meu Perfil' },
            { value: 'fazenda',  label: 'Dados da Fazenda' },
            { value: 'usuarios', label: 'Usuários e Acessos' },
            { value: 'unidades', label: 'Unidades de Medida' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === value
                  ? 'bg-[#00A651] text-white font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Aba: Perfil */}
        {activeTab === 'perfil' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 id={ids.perfilTitle} className="text-xl font-semibold leading-none tracking-tight">
                    Informações Pessoais
                  </h2>
                </CardTitle>
                <CardDescription>Gerencie seus dados de acesso e perfil.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6" aria-labelledby={ids.perfilTitle} noValidate>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prof-nome" className="text-sm">Nome Completo</Label>
                      <Input id="prof-nome" ref={profileNomeRef} key={profile.nome} defaultValue={profile.nome} autoComplete="name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-email" className="text-sm">E-mail</Label>
                      <Input id="prof-email" type="email" defaultValue={profile.email} disabled aria-disabled="true" autoComplete="email" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prof-perfil" className="text-sm">Perfil de Acesso</Label>
                      <Input id="prof-perfil" defaultValue={profile.perfil} disabled aria-disabled="true" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-senha" className="text-sm">Nova Senha</Label>
                      <Input id="prof-senha" ref={profileSenhaRef} type="password" placeholder="••••••••" autoComplete="new-password" aria-describedby={ids.senhaHint} />
                      <p id={ids.senhaHint} className="text-sm text-muted-foreground">Deixe em branco para manter a senha atual.</p>
                    </div>
                  </div>
                  <Button type="submit" disabled={savingProfile}>
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba: Fazenda */}
        {activeTab === 'fazenda' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 id={ids.fazendaTitle} className="text-xl font-semibold leading-none tracking-tight">
                    Dados da Propriedade
                  </h2>
                </CardTitle>
                <CardDescription>Informações gerais da fazenda ativa.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveFazenda} className="space-y-6" aria-labelledby={ids.fazendaTitle} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="faz-nome" className="text-sm">Nome da Fazenda</Label>
                    <Input id="faz-nome" ref={fazendaNomeRef} key={`nome-${fazenda.nome}`} defaultValue={fazenda.nome} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <CityAutocomplete
                        label="Localização (Cidade)"
                        placeholder="Digite o nome da cidade"
                        value={selectedCity?.displayName || fazenda.localizacao || ''}
                        onSelect={setSelectedCity}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faz-area" className="text-sm">Área Total (ha)</Label>
                      <Input id="faz-area" ref={fazendaAreaRef} key={`area-${fazenda.area_total}`} type="number" min="0" step="0.01" defaultValue={fazenda.area_total || 0} />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingFazenda}>
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    {savingFazenda ? 'Salvando...' : 'Salvar Dados'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba: Usuários */}
        {activeTab === 'usuarios' && (
          <div className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    <h2 id={ids.usuariosTitle} className="text-xl font-semibold leading-none tracking-tight">
                      Controle de Usuários
                    </h2>
                  </CardTitle>
                  <CardDescription>Gerencie quem tem acesso ao sistema da fazenda.</CardDescription>
                </div>
                {isAdmin && (
                  <Button size="sm" onClick={() => setInviteModalOpen(true)} aria-label="Convidar novo usuário para a fazenda">
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Convidar Usuário
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table aria-labelledby={ids.usuariosTitle}>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="text-sm">Nome</TableHead>
                      <TableHead scope="col" className="text-sm">E-mail</TableHead>
                      <TableHead scope="col" className="text-sm">Perfil</TableHead>
                      <TableHead scope="col" className="text-sm">Status</TableHead>
                      <TableHead scope="col" className="text-right"><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.perfil === 'Administrador' ? 'default' : 'outline'}>{u.perfil}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-primary border-primary">Ativo</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && u.id !== userId && (
                            <RemoverUsuarioDialog userId={u.id} userName={u.nome ?? u.email} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground" role="status" aria-live="polite">
                          Nenhum outro usuário cadastrado para esta fazenda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba: Unidades de Medida */}
        {activeTab === 'unidades' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
                    Unidades de Medida para Operador
                  </h2>
                </CardTitle>
                <CardDescription>
                  Configure os pesos das unidades usadas pelo operador ao registrar saídas de silagem.
                  Apenas as unidades configuradas ficam disponíveis para o operador.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isAdmin ? (
                  <p className="text-sm text-muted-foreground">
                    Apenas administradores podem alterar estas configurações.
                  </p>
                ) : (
                  <form onSubmit={handleSaveUnidades} className="space-y-6" noValidate>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="peso-concha" className="text-sm font-medium">
                          Peso por concha do trator (toneladas)
                        </Label>
                        <Input
                          id="peso-concha"
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          placeholder="Ex: 0.8"
                          value={pesoConcha}
                          onChange={(e) => setPesoConcha(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Deixe em branco para não oferecer essa opção ao operador.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="peso-vagao" className="text-sm font-medium">
                          Peso por vagão (toneladas)
                        </Label>
                        <Input
                          id="peso-vagao"
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          placeholder="Ex: 3.5"
                          value={pesoVagao}
                          onChange={(e) => setPesoVagao(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Deixe em branco para não oferecer essa opção ao operador.
                        </p>
                      </div>
                    </div>
                    <Button type="submit" disabled={savingUnidades}>
                      <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                      {savingUnidades ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </div>
  );
}
