'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<'Operador' | 'Visualizador'>('Operador');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleClose = () => {
    setEmail('');
    setPerfil('Operador');
    setEnviado(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !perfil) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), perfil }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao enviar convite.');
        return;
      }

      toast.success(`Convite enviado para ${email.trim()}!`);
      setEnviado(true);
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
            Convidar Usuário
          </DialogTitle>
          <DialogDescription className="text-sm">
            O convidado receberá um e-mail com as credenciais para acessar o sistema.
          </DialogDescription>
        </DialogHeader>

        {!enviado ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm">E-mail do convidado</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-perfil" className="text-sm">Perfil de acesso</Label>
              <Select
                value={perfil}
                onValueChange={(v) => setPerfil(v as 'Operador' | 'Visualizador')}
                disabled={loading}
              >
                <SelectTrigger id="invite-perfil" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operador">
                    <div>
                      <p className="font-medium text-sm">Operador</p>
                      <p className="text-xs text-muted-foreground">Registra eventos, edita dados operacionais</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="Visualizador">
                    <div>
                      <p className="font-medium text-sm">Visualizador</p>
                      <p className="text-xs text-muted-foreground">Somente leitura, sem alterações</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !email}>
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                {loading ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
              <p className="text-sm font-medium">Convite enviado!</p>
              <p className="text-sm text-muted-foreground">
                As credenciais de acesso foram enviadas para <strong>{email}</strong>.
                O usuário deve verificar a caixa de entrada (e spam) para obter a senha temporária.
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setEnviado(false); setEmail(''); }}
              >
                Novo convite
              </Button>
              <Button type="button" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
