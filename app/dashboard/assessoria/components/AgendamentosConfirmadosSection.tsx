'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { AgendamentoUsuario } from '@/lib/types/assessoria';
import { cancelarAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { toast } from 'sonner';
import { useState } from 'react';

interface AgendamentosConfirmadosProps {
  agendamentos: AgendamentoUsuario[];
  onRefresh: () => Promise<void>;
}

const statusConfig: Record<
  string,
  { icon: any; color: string; label: string; bgColor: string }
> = {
  solicitado: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    label: 'Aguardando Confirmação',
    bgColor: 'bg-yellow-50',
  },
  confirmado: {
    icon: CheckCircle2,
    color: 'text-green-600',
    label: 'Confirmado',
    bgColor: 'bg-green-50',
  },
  recusado: {
    icon: XCircle,
    color: 'text-red-600',
    label: 'Recusado',
    bgColor: 'bg-red-50',
  },
  remarcado: {
    icon: AlertCircle,
    color: 'text-blue-600',
    label: 'Remarcado',
    bgColor: 'bg-blue-50',
  },
};

export default function AgendamentosConfirmadosSection({
  agendamentos,
  onRefresh,
}: AgendamentosConfirmadosProps) {
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    try {
      setCancelingId(id);
      const result = await cancelarAgendamentoAction(id);
      if (result.success) {
        toast.success(result.message);
        await onRefresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Meus Agendamentos
        </CardTitle>
        <CardDescription>
          Acompanhe o status de suas solicitações de reunião com o assessor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {agendamentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum agendamento realizado. Escolha um horário no calendário acima!
          </div>
        ) : (
          <div className="space-y-3">
            {agendamentos.map((ag) => {
              const config = statusConfig[ag.status];
              const Icon = config?.icon;

              return (
                <div
                  key={ag.id}
                  className={`border rounded-lg p-4 space-y-3 ${config?.bgColor}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className={`h-5 w-5 ${config.color}`} />}
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {ag.tipo === 'reuniao_video' ? '📹' : '☎️'}
                            {formatDate(ag.data_agendada)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(ag.data_agendada).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center">
                        <Badge
                          className={
                            ag.status === 'confirmado'
                              ? 'bg-green-100 text-green-800'
                              : ag.status === 'recusado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {config.label}
                        </Badge>
                      </div>

                      {ag.observacoes && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Sua solicitação:</strong> {ag.observacoes}
                        </div>
                      )}

                      {ag.motivo_recusa && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          <strong>Motivo da recusa:</strong> {ag.motivo_recusa}
                        </div>
                      )}

                      {ag.sugestao_nova_data && (
                        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          <strong>Sugestão de remarcação:</strong>{' '}
                          {formatDate(ag.sugestao_nova_data)}
                        </div>
                      )}

                      {ag.link_reuniao && ag.status === 'confirmado' && (
                        <div className="text-sm">
                          <a
                            href={ag.link_reuniao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Link da reunião: {ag.link_reuniao}
                          </a>
                        </div>
                      )}
                    </div>

                    {ag.status === 'solicitado' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(ag.id)}
                        disabled={cancelingId === ag.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
