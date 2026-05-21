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
  cancelado: {
    icon: XCircle,
    color: 'text-gray-600',
    label: 'Cancelado',
    bgColor: 'bg-gray-50',
  },
  concluido: {
    icon: CheckCircle2,
    color: 'text-green-600',
    label: 'Concluído',
    bgColor: 'bg-green-50',
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
        {agendamentos.filter(ag => ag.status !== 'cancelado' && ag.status !== 'solicitado').length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum agendamento confirmado. Solicite uma consulta para começar!
          </div>
        ) : (
          <div className="space-y-3">
            {agendamentos
              .filter(ag => ag.status !== 'cancelado' && ag.status !== 'solicitado')
              .map((ag) => {
              const config = statusConfig[ag.status] || {
                icon: AlertCircle,
                color: 'text-gray-600',
                label: ag.status,
                bgColor: 'bg-gray-50',
              };
              const Icon = config.icon;

              return (
                <div
                  key={ag.id}
                  className="border border-slate-700 rounded-lg p-5 space-y-4 bg-slate-950 transition-all hover:border-slate-600"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      {/* Header com Status e Ícone */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {Icon && <Icon className={`h-6 w-6 ${config.color}`} />}
                          <Badge
                            className={
                              ag.status === 'confirmado'
                                ? 'bg-green-600 text-white'
                                : ag.status === 'recusado'
                                  ? 'bg-red-600 text-white'
                                  : ag.status === 'remarcado'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-600 text-white'
                            }
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Data e Hora */}
                      <div className="space-y-2 mb-4 pb-4 border-b border-slate-700">
                        <div className="flex items-center gap-2 font-semibold text-lg text-white">
                          <Calendar className="h-5 w-5 text-green-500" />
                          {formatDate(ag.data_agendada)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock className="h-4 w-4 text-blue-400" />
                          {new Date(ag.data_agendada).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Observações (Sua Solicitação) */}
                      {ag.observacoes && (
                        <div className="bg-slate-900 p-4 rounded border-l-4 border-blue-500 text-sm mb-3">
                          <p className="font-semibold text-slate-200 mb-2">📋 Detalhes da solicitação:</p>
                          <p className="text-slate-400 text-xs leading-relaxed">{ag.observacoes}</p>
                        </div>
                      )}

                      {/* Motivo da Recusa */}
                      {ag.motivo_recusa && (
                        <div className="text-sm bg-slate-900 p-4 rounded border-l-4 border-red-600 mb-3">
                          <p className="font-semibold mb-2 text-red-400">❌ Motivo da recusa:</p>
                          <p className="text-slate-300">{ag.motivo_recusa}</p>
                        </div>
                      )}

                      {/* Sugestão de Remarcação */}
                      {ag.sugestao_nova_data && (
                        <div className="text-sm bg-slate-900 p-4 rounded border-l-4 border-blue-600 mb-3">
                          <p className="font-semibold mb-2 text-blue-400">📅 Sugestão de remarcação:</p>
                          <p className="text-slate-300">{formatDate(ag.sugestao_nova_data)}</p>
                        </div>
                      )}

                      {/* Link da Reunião */}
                      {ag.link_reuniao && ag.status === 'confirmado' && (
                        <div className="text-sm bg-slate-900 p-4 rounded border-l-4 border-green-600 mb-3">
                          <p className="font-semibold mb-2 text-green-400">🔗 Link da reunião:</p>
                          <a
                            href={ag.link_reuniao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-400 hover:underline break-all text-xs"
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
