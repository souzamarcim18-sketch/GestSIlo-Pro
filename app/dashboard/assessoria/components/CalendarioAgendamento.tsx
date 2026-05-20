'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { HorarioDisponivel } from '@/lib/types/assessoria';
import { formatDate } from '@/lib/utils';
import AgendamentoForm from './AgendamentoForm';

interface CalendarioAgendamentoProps {
  consultorId: string;
}

export default function CalendarioAgendamento({ consultorId }: CalendarioAgendamentoProps) {
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHorario, setSelectedHorario] = useState<HorarioDisponivel | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const loadHorarios = async () => {
      try {
        setIsLoading(true);
        // Usar endpoint API ao invés de query direta
        const response = await fetch('/api/assessoria/horarios?consultor_id=' + consultorId);
        const data = await response.json();
        setHorarios(data || []);
      } catch (error) {
        console.error('Erro ao carregar horários:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHorarios();
  }, [consultorId]);

  if (isLoading) return <div className="text-center py-4">Carregando horários...</div>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agenda Disponível
          </CardTitle>
          <CardDescription>
            Escolha um horário para agendar uma reunião com o assessor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {horarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum horário disponível no momento
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {horarios.map((horario) => (
                <Button
                  key={horario.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start hover:border-primary hover:bg-slate-50"
                  onClick={() => {
                    setSelectedHorario(horario);
                    setIsFormOpen(true);
                  }}
                >
                  <div className="font-semibold">{formatDate(horario.data_hora)}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(horario.data_hora).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AgendamentoForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedHorario(null);
        }}
        horarioSelecionado={selectedHorario}
        consultorId={consultorId}
      />
    </>
  );
}
