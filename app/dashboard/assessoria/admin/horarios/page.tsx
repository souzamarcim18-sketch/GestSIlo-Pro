'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  listarHorariosAction,
  deletarHorarioAction,
  marcarIndisponibilidadeAction,
  reativarHorarioAction,
} from '../actions';
import CriarHorarioDialog from './components/CriarHorarioDialog';
import GerarHorariosPeriodoDialog from './components/GerarHorariosPeriodoDialog';

interface Horario {
  id: string;
  consultor_id: string;
  data_hora: string;
  duracao_minutos: number;
  disponivel: boolean;
  created_at: string;
  updated_at: string;
}

export default function HorariosAdminPage() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPeriodoFormOpen, setIsPeriodoFormOpen] = useState(false);

  const loadHorarios = async () => {
    try {
      setIsLoading(true);
      const result = await listarHorariosAction();
      if (result.success) {
        setHorarios(result.data as Horario[]);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHorarios();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este horário?')) return;

    try {
      const result = await deletarHorarioAction(id);
      if (result.success) {
        toast.success(result.message);
        await loadHorarios();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao deletar');
    }
  };

  const handleToggleDisponibilidade = async (horario: Horario) => {
    try {
      const result = horario.disponivel
        ? await marcarIndisponibilidadeAction(horario.id)
        : await reativarHorarioAction(horario.id);

      if (result.success) {
        toast.success(result.message);
        await loadHorarios();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  // Agrupar por data
  const horariosPorData = horarios.reduce(
    (acc, h) => {
      const data = new Date(h.data_hora).toLocaleDateString('pt-BR');
      if (!acc[data]) acc[data] = [];
      acc[data].push(h);
      return acc;
    },
    {} as Record<string, Horario[]>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Horários</h1>
            <p className="text-sm text-muted-foreground">Configure sua agenda de disponibilidade</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsPeriodoFormOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Gerar Período
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Horário
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando horários...
          </CardContent>
        </Card>
      ) : horarios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum horário configurado. Comece adicionando horários.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(horariosPorData)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([data, horariosDodia]) => (
              <Card key={data}>
                <CardHeader>
                  <CardTitle className="text-lg">{data}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {horariosDodia.map((h) => {
                      const hora = new Date(h.data_hora).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={h.id}
                          className={`border rounded-lg p-3 flex items-center justify-between ${
                            h.disponivel ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{hora}</div>
                            <div className="text-xs text-muted-foreground">
                              {h.duracao_minutos} min
                            </div>
                            <div className={`text-xs mt-1 ${h.disponivel ? 'text-green-600' : 'text-gray-600'}`}>
                              {h.disponivel ? '✅ Disponível' : '❌ Indisponível'}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleDisponibilidade(h)}
                              title={h.disponivel ? 'Marcar como indisponível' : 'Marcar como disponível'}
                            >
                              {h.disponivel ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(h.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <CriarHorarioDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onAfterSubmit={loadHorarios}
      />

      <GerarHorariosPeriodoDialog
        isOpen={isPeriodoFormOpen}
        onClose={() => setIsPeriodoFormOpen(false)}
        onAfterSubmit={loadHorarios}
      />
    </div>
  );
}
