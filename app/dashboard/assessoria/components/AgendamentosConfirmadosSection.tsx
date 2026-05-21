'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus } from 'lucide-react';
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

  const ativos = agendamentos.filter(ag => ag.status !== 'cancelado');

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
              Suas solicitações de consulta com o assessor agronômico
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Solicitar Consulta
          </Button>
        </CardHeader>
        <CardContent>
          {ativos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum agendamento realizado. Solicite uma consulta para começar!
            </div>
          ) : (
            <div className="space-y-3">
              {ativos.map((ag) => (
                <div
                  key={ag.id}
                  className="border border-border rounded-lg p-4 space-y-3 bg-card transition-colors hover:border-muted-foreground/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(ag.data_agendada)}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(ag.data_agendada).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(ag.id)}
                      disabled={cancelingId === ag.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      {cancelingId === ag.id ? 'Cancelando...' : 'Cancelar'}
                    </Button>
                  </div>

                  {ag.observacoes && (
                    <div className="border-l-2 border-border pl-3 text-sm text-muted-foreground leading-relaxed">
                      {ag.observacoes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SolicitarConsultaDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAfterSubmit={onRefresh}
      />
    </>
  );
}
