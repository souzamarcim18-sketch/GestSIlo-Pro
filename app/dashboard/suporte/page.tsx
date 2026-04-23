'use client';

import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, Mail, MessageSquare, BookOpen, ExternalLink, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const contactOptions = [
  {
    icon: Mail,
    title: 'E-mail',
    description: 'Para dúvidas gerais, bugs e solicitações.',
    action: 'suporte@gestsilo.com.br',
    href: 'mailto:suporte@gestsilo.com.br',
    label: 'Enviar e-mail',
    badge: 'Resposta em até 24h',
    badgeVariant: 'secondary' as const,
  },
  {
    icon: MessageSquare,
    title: 'Chat via WhatsApp',
    description: 'Atendimento rápido para problemas urgentes.',
    action: '+55 (XX) XXXXX-XXXX',
    href: '#',
    label: 'Abrir WhatsApp',
    badge: 'Seg–Sex, 8h–18h',
    badgeVariant: 'secondary' as const,
  },
  {
    icon: Phone,
    title: 'Telefone',
    description: 'Suporte por voz para situações críticas.',
    action: '+55 (XX) XXXX-XXXX',
    href: 'tel:+55XXXXXXXXXXX',
    label: 'Ligar agora',
    badge: 'Seg–Sex, 8h–18h',
    badgeVariant: 'secondary' as const,
  },
];

const faqItems = [
  {
    q: 'Como cadastrar uma nova fazenda?',
    a: 'Acesse Configurações → Dados da Fazenda e preencha as informações básicas. A localização (latitude e longitude) é necessária para a previsão do tempo.',
  },
  {
    q: 'Como registrar uma movimentação de silagem?',
    a: 'No módulo Silos, selecione o silo desejado e clique em "Nova Movimentação". Informe o tipo (Entrada ou Saída), a quantidade e a data.',
  },
  {
    q: 'O aplicativo funciona sem internet?',
    a: 'Sim, o GestSilo Pro é um PWA. Dados recentes ficam em cache e você pode continuar navegando offline. A sincronização ocorre ao reconectar.',
  },
  {
    q: 'Como adicionar um novo usuário (operador)?',
    a: 'Atualmente o cadastro de operadores está em desenvolvimento. Em breve será possível convidar colaboradores diretamente pelo painel de Configurações.',
  },
];

export default function SuportePage() {
  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-muted/30">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suporte Técnico</h1>
          <p className="text-sm text-muted-foreground">Entre em contato com nossa equipe</p>
        </div>
      </div>

      {/* Canais de contato */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contactOptions.map((opt) => (
          <Card key={opt.title} className="rounded-2xl shadow-sm">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <opt.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant={opt.badgeVariant} className="text-xs">{opt.badge}</Badge>
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{opt.title}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.description}</p>
                <p className="text-sm font-medium text-foreground mt-2">{opt.action}</p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full mt-auto"
              >
                <a href={opt.href} target="_blank" rel="noopener noreferrer">
                  {opt.label}
                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Perguntas Frequentes</h2>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <Card key={i} className="rounded-2xl shadow-sm">
              <CardContent className="p-5">
                <p className="font-semibold text-foreground text-sm">{item.q}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Versão */}
      <Card className="rounded-2xl shadow-sm bg-muted/50">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            GestSilo Pro · Em desenvolvimento ativo · Suporte disponível seg–sex, das 8h às 18h
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
