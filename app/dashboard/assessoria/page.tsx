'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ComingSoonBanner } from '@/components/ComingSoonBanner';
import { GraduationCap, StickyNote, CalendarClock, Lock, NotebookPen, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: NotebookPen,
    title: 'Bloco de Notas',
    description:
      'Registre suas dúvidas, observações de campo e pontos para discutir com o assessor. Organize por categoria e data.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda com o Assessor',
    description:
      'Agende visitas técnicas, reuniões e chamadas de acompanhamento. Receba lembretes e mantenha o histórico de atendimentos.',
  },
];

export default function AssessoriaPage() {
  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-muted/30">
      <ComingSoonBanner message="Assessoria agronômica será lançada em breve no Plano Max" />

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessoria Agronômica</h1>
          <p className="text-sm text-muted-foreground">Conecte-se com especialistas em agronomia</p>
        </div>
      </div>

      {/* Plano necessário */}
      <Card className="rounded-2xl shadow-sm border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center">
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Disponível no Plano Max</h2>
              <Badge className="bg-amber-500 text-white hover:bg-amber-600">Max</Badge>
            </div>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              O módulo de Assessoria Agronômica é exclusivo para assinantes do plano Max.
              Aqui você terá acesso a ferramentas para organizar suas dúvidas e agendar sessões
              com um assessor agronômico especializado em silagem e forragicultura.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview das funcionalidades */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">O que estará disponível no Plano Max</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="rounded-2xl shadow-sm opacity-60">
              <CardContent className="p-6 flex gap-4 items-start">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Destaques do plano */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Fluxo de uso
          </h2>
          <ol className="space-y-3">
            {[
              { step: '1', text: 'Anote sua dúvida ou observação no Bloco de Notas ao longo da semana.' },
              { step: '2', text: 'Agende uma sessão com o assessor agronômico via Agenda.' },
              { step: '3', text: 'Leve suas anotações para a reunião e registre as orientações recebidas.' },
              { step: '4', text: 'Acompanhe o histórico de atendimentos e implementações.' },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.step}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Notas rápidas — em desenvolvimento */}
      <Card className="rounded-2xl shadow-sm opacity-60 pointer-events-none select-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <StickyNote className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-muted-foreground">Minhas Anotações</h2>
            <Badge variant="outline" className="text-xs">Em breve</Badge>
          </div>
          <div className="h-24 bg-muted/50 rounded-xl flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Suas anotações aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
