'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle2, AlertCircle, XCircle, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { AgendamentoUsuario } from '@/lib/types/assessoria';
import { cancelarAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { toast } from 'sonner';
import { useState } from 'react';
import SolicitarConsultaDialog from './SolicitarConsultaDialog';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meus Agendamentos
            </CardTitle>
            <CardDescription>
              Acompanhe o status de suas solicitações de reunião com o assessor
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Solicitar Consulta
          </Button>
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
                  className={`border-2 rounded-lg p-5 space-y-3 ${config?.bgColor} transition-all hover:shadow-md`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      {/* Header com Status e Ícone */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {Icon && <Icon className={`h-6 w-6 ${config.color}`} />}
                          <Badge
                            className={
                              ag.status === 'confirmado'
                                ? 'bg-green-100 text-green-800'
                                : ag.status === 'recusado'
                                  ? 'bg-red-100 text-red-800'
                                  : ag.status === 'remarcado'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {config.label}
                          </Badge>
                        </div>
                        {ag.status === 'solicitado' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(ag.id)}
                            disabled={cancelingId === ag.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>

                      {/* Data e Hora */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 font-semibold text-base">
                          <Calendar className="h-4 w-4" />
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

                      {/* Observações (Sua Solicitação) */}
                      {ag.observacoes && (
                        <div className="bg-white bg-opacity-50 p-3 rounded border border-current border-opacity-20 text-sm mb-2">
                          <p className="font-semibold text-sm mb-1">📋 Sua solicitação:</p>
                          <p className="text-xs text-gray-700">{ag.observacoes}</p>
                        </div>
                      )}

                      {/* Motivo da Recusa */}
                      {ag.motivo_recusa && (
                        <div className="text-sm text-red-700 bg-white bg-opacity-70 p-3 rounded border-l-4 border-red-600 mb-2">
                          <p className="font-semibold mb-1">❌ Motivo da recusa:</p>
                          <p>{ag.motivo_recusa}</p>
                        </div>
                      )}

                      {/* Sugestão de Remarcação */}
                      {ag.sugestao_nova_data && (
                        <div className="text-sm text-blue-700 bg-white bg-opacity-70 p-3 rounded border-l-4 border-blue-600 mb-2">
                          <p className="font-semibold mb-1">📅 Sugestão de remarcação:</p>
                          <p>{formatDate(ag.sugestao_nova_data)}</p>
                        </div>
                      )}

                      {/* Link da Reunião */}
                      {ag.link_reuniao && ag.status === 'confirmado' && (
                        <div className="text-sm bg-white bg-opacity-70 p-3 rounded border-l-4 border-green-600 mb-2">
                          <p className="font-semibold mb-1 text-green-700">🔗 Link da reunião:</p>
                          <a
                            href={ag.link_reuniao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all text-xs"
                          >
                            {ag.link_reuniao}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <SolicitarConsultaDialog
      isOpen={isDialogOpen}
      onClose={() => {
        setIsDialogOpen(false);
      }}
      onAfterSubmit={onRefresh}
    />
    </>
  );
}
