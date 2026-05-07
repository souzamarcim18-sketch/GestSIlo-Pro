'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { FormEventoSanitario } from '@/components/rebanho/FormEventoSanitario';
import { listEventosSanitariosPorAnimal, listAlertasVacinacao } from '@/lib/supabase/rebanho-sanitario';
import type { Animal, Lote } from '@/lib/types/rebanho';
import type { EventoSanitarioRow, AlertaSanitario } from '@/lib/types/rebanho-sanitario';
import { format } from 'date-fns';

interface AbaSanidadeProps {
  animal: Animal;
  animais: Animal[];
  lotes: Lote[];
  isAdmin: boolean;
  canRegister: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  vacinacao: 'Vacinação',
  vermifugacao: 'Vermifugação',
  tratamento_veterinario: 'Tratamento',
  exame_laboratorial: 'Exame',
};

const TIPO_COLORS: Record<string, string> = {
  vacinacao: 'bg-green-100 text-green-800 border-green-300',
  vermifugacao: 'bg-blue-100 text-blue-800 border-blue-300',
  tratamento_veterinario: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  exame_laboratorial: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function AbaSanidade({
  animal,
  animais,
  lotes,
  isAdmin,
  canRegister,
}: AbaSanidadeProps) {
  const [eventos, setEventos] = useState<EventoSanitarioRow[]>([]);
  const [alertas, setAlertas] = useState<AlertaSanitario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventosData, alertasData] = await Promise.all([
          listEventosSanitariosPorAnimal(animal.id, 100, 0),
          listAlertasVacinacao(15),
        ]);
        setEventos(eventosData);
        // Filtrar alertas apenas para este animal
        setAlertas(alertasData.filter((a) => a.animal_id === animal.id));
      } catch (error) {
        toast.error('Erro ao carregar eventos sanitários');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [animal.id]);

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    // Recarregar dados
    const loadData = async () => {
      const [eventosData, alertasData] = await Promise.all([
        listEventosSanitariosPorAnimal(animal.id, 100, 0),
        listAlertasVacinacao(15),
      ]);
      setEventos(eventosData);
      setAlertas(alertasData.filter((a) => a.animal_id === animal.id));
    };
    loadData();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Verificar alertas
  const temAlertas = alertas.length > 0;
  const alertasVencidos = alertas.filter((a) => a.dias_para_vencimento < 0);
  const alertasProximos = alertas.filter((a) => a.dias_para_vencimento >= 0);

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {temAlertas && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Vacinação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertasVencidos.length > 0 && (
              <div className="space-y-2 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm font-semibold text-red-900">Vacinações Vencidas</p>
                {alertasVencidos.map((alerta) => (
                  <div key={alerta.vacina_nome} className="text-sm text-red-800">
                    <p className="font-medium">{alerta.vacina_nome}</p>
                    <p className="text-xs">
                      Vencida há {Math.abs(alerta.dias_para_vencimento)} dias
                    </p>
                  </div>
                ))}
              </div>
            )}

            {alertasProximos.length > 0 && (
              <div className="space-y-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Próximas dos Próximos 15 Dias
                </p>
                {alertasProximos.map((alerta) => (
                  <div key={alerta.vacina_nome} className="text-sm text-yellow-800">
                    <p className="font-medium">{alerta.vacina_nome}</p>
                    <p className="text-xs">
                      {format(new Date(alerta.data_proxima_dose), 'dd/MM/yyyy')} ({alerta.dias_para_vencimento} dias)
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conteúdo Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Sanidade</CardTitle>
              <CardDescription>Vacinações, vermifugações, tratamentos e exames</CardDescription>
            </div>
            {canRegister && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Registrar Evento Sanitário</DialogTitle>
                    <DialogDescription>
                      {animal.brinco} {animal.nome && `(${animal.nome})`}
                    </DialogDescription>
                  </DialogHeader>
                  <FormEventoSanitario
                    animalPre={animal}
                    lotes={lotes}
                    animais={animais}
                    onSuccess={handleDialogClose}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {eventos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento sanitário registrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Próx. Dose</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventos.map((evento) => {
                    let detalhes = '';
                    if (evento.tipo === 'vacinacao' || evento.tipo === 'vermifugacao') {
                      detalhes = `${evento.vacina_nome} - ${evento.dose || 'N/A'}`;
                    } else if (evento.tipo === 'tratamento_veterinario') {
                      detalhes = evento.diagnostico || 'N/A';
                    } else if (evento.tipo === 'exame_laboratorial') {
                      detalhes = evento.tipo_exame || 'N/A';
                    }

                    return (
                      <TableRow key={evento.id}>
                        <TableCell>{format(new Date(evento.data_evento), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <Badge className={`${TIPO_COLORS[evento.tipo] || 'bg-gray-100'}`}>
                            {TIPO_LABELS[evento.tipo] || evento.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{detalhes}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {evento.responsavel || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {evento.data_proxima_dose ? format(new Date(evento.data_proxima_dose), 'dd/MM/yyyy') : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
