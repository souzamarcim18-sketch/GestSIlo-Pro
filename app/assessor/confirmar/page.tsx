'use client';

import { useEffect, useState } from 'react';

// Esta página é totalmente dinâmica (não fazer prerender estático)
export const dynamic = 'force-dynamic';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { verificarTokenConfirmacao } from '@/lib/services/email';
import { atualizarStatusAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export default function ConfirmarAgendamentoPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const agendamentoId = searchParams.get('agendamento');

  const [agendamento, setAgendamento] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [novaData, setNovaData] = useState('');
  const [statusFinal, setStatusFinal] = useState<'confirmado' | 'recusado' | 'remarcado' | null>(null);

  useEffect(() => {
    async function verificarToken() {
      try {
        setIsLoading(true);

        if (!token || !agendamentoId) {
          setErro('Link inválido ou expirado');
          return;
        }

        const decoded = verificarTokenConfirmacao(token);
        if (!decoded || decoded.agendamento_id !== agendamentoId) {
          setErro('Link expirado. Validade: 24 horas');
          return;
        }

        // Buscar agendamento via API
        const response = await fetch(`/api/assessoria/agendamentos/${agendamentoId}`);
        if (!response.ok) {
          setErro('Agendamento não encontrado');
          return;
        }
        const agendamento = await response.json();
        setAgendamento(agendamento);
      } catch (error) {
        setErro('Erro ao verificar link');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    verificarToken();
  }, [token, agendamentoId]);

  const handleConfirmar = async () => {
    try {
      setIsSubmitting(true);
      const result = await atualizarStatusAgendamentoAction(agendamentoId || '', {
        status: 'confirmado' as const,
      });

      if (result.success) {
        setStatusFinal('confirmado');
        toast.success('Agendamento confirmado!');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao confirmar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecusar = async () => {
    if (!motivo.trim()) {
      toast.error('Por favor, indique o motivo da recusa');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await atualizarStatusAgendamentoAction(agendamentoId || '', {
        status: 'recusado' as const,
        motivo_recusa: motivo,
      });

      if (result.success) {
        setStatusFinal('recusado');
        toast.success('Agendamento recusado');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao recusar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemarcar = async () => {
    if (!novaData.trim()) {
      toast.error('Por favor, sugira uma nova data');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await atualizarStatusAgendamentoAction(agendamentoId || '', {
        status: 'remarcado' as const,
        sugestao_nova_data: new Date(novaData),
      });

      if (result.success) {
        setStatusFinal('remarcado');
        toast.success('Remarcação sugerida');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao remarcar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{erro}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Se o problema persistir, entre em contato com a fazenda.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statusFinal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {statusFinal === 'confirmado' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {statusFinal === 'recusado' && <XCircle className="h-5 w-5 text-red-600" />}
              {statusFinal === 'remarcado' && <AlertCircle className="h-5 w-5 text-blue-600" />}
              {statusFinal === 'confirmado' && 'Agendamento Confirmado'}
              {statusFinal === 'recusado' && 'Agendamento Recusado'}
              {statusFinal === 'remarcado' && 'Remarcação Sugerida'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {statusFinal === 'confirmado' && 'A fazenda foi notificada da confirmação. Aguarde o contato com o link da reunião.'}
              {statusFinal === 'recusado' && 'A fazenda foi notificada da recusa.'}
              {statusFinal === 'remarcado' && 'A fazenda foi notificada da sugestão de remarcação.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agendamento) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Confirmar Agendamento</CardTitle>
          <CardDescription>
            Você está respondendo a uma solicitação de agendamento de uma fazenda
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalhes do Agendamento */}
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">📅 Data/Hora</p>
              <p className="font-semibold text-lg">
                {new Date(agendamento.data_agendada).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })} às{' '}
                {new Date(agendamento.data_agendada).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">📞 Tipo</p>
              <p className="font-semibold">
                {agendamento.tipo === 'reuniao_video'
                  ? '📹 Reunião por Vídeo'
                  : '☎️ Chamada Telefônica'}
              </p>
            </div>
            {agendamento.observacoes && (
              <div>
                <p className="text-sm text-muted-foreground">📝 Observações da Fazenda</p>
                <p className="text-sm">{agendamento.observacoes}</p>
              </div>
            )}
          </div>

          {/* Opção 1: Confirmar */}
          <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
            <h3 className="font-semibold mb-3 text-green-900 dark:text-green-100">
              ✅ Confirmar Agendamento
            </h3>
            <p className="text-sm text-green-800 dark:text-green-200 mb-4">
              A fazenda será notificada de que você confirmou o agendamento.
            </p>
            <Button
              onClick={handleConfirmar}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Agendamento'}
            </Button>
          </div>

          {/* Opção 2: Recusar */}
          <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
            <h3 className="font-semibold mb-3 text-red-900 dark:text-red-100">
              ❌ Recusar Agendamento
            </h3>
            <p className="text-sm text-red-800 dark:text-red-200 mb-3">
              Indique o motivo da recusa para a fazenda.
            </p>
            <Textarea
              placeholder="Ex: Indisponível nessa data, conflito de agenda, etc."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mb-3 text-sm"
              disabled={isSubmitting}
            />
            <Button
              onClick={handleRecusar}
              disabled={isSubmitting || !motivo.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Processando...' : 'Recusar'}
            </Button>
          </div>

          {/* Opção 3: Remarcar */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
            <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
              🔄 Sugerir Nova Data
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Sugira uma nova data/hora para a reunião.
            </p>
            <Input
              type="datetime-local"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="mb-3 text-sm"
              disabled={isSubmitting}
            />
            <Button
              onClick={handleRemarcar}
              disabled={isSubmitting || !novaData.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Processando...' : 'Sugerir Nova Data'}
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Link válido por 24 horas. Após esse período, a fazenda receberá um novo link.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
