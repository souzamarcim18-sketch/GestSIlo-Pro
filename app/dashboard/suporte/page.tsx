'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Mail, MessageSquare, BookOpen, ExternalLink, Phone } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const contactOptions = [
  {
    icon: Mail,
    title: 'E-mail',
    description: 'Para dúvidas gerais, bugs e solicitações.',
    action: 'gestsilo.app@gmail.com',
    href: 'mailto:gestsilo.app@gmail.com',
    label: 'Enviar e-mail',
    badge: 'Resposta em até 24h',
    badgeVariant: 'secondary' as const,
  },
  {
    icon: MessageSquare,
    title: 'Chat via WhatsApp',
    description: 'Atendimento rápido para problemas urgentes.',
    action: '+55 (31) 99087-5346',
    href: '#',
    label: 'Abrir WhatsApp',
    badge: 'Seg–Sex, 8h–18h',
    badgeVariant: 'secondary' as const,
  },
  {
    icon: Phone,
    title: 'Telefone',
    description: 'Suporte por voz para situações críticas.',
    action: '+55 (31) 99087-5346',
    href: 'tel:+5531990875346',
    label: 'Ligar agora',
    badge: 'Seg–Sex, 8h–18h',
    badgeVariant: 'secondary' as const,
  },
];

const faqItems = [
  {
    q: 'Posso cadastrar mais de uma fazenda?',
    a: 'Atualmente cada conta GestSilo gerencia uma única fazenda. Todos os módulos — silos, talhões, rebanho, financeiro — são vinculados à fazenda configurada no seu perfil. Para gerenciar propriedades distintas, seria necessário criar contas separadas.',
  },
  {
    q: 'Como editar os dados da minha fazenda?',
    a: 'Acesse Configurações → Dados da Fazenda. Lá você pode alterar o nome, cidade (com busca automática de coordenadas) e a área total em hectares.',
  },
  {
    q: 'Como adicionar um novo usuário (operador ou visualizador)?',
    a: 'Acesse Configurações → Usuários e Acessos e clique em "Convidar Usuário". Informe o e-mail e escolha o perfil: Operador (acesso restrito ao registro de saídas) ou Visualizador (leitura de todos os módulos). O convite é enviado por e-mail com instruções de acesso.',
  },
  {
    q: 'Qual a diferença entre os perfis de acesso?',
    a: 'Existem três perfis: Administrador tem acesso completo a todos os módulos e pode realizar qualquer operação. Visualizador pode consultar todos os dados mas não faz alterações. Operador acessa apenas o painel de registro de saídas de silos — ideal para colaboradores de campo que precisam registrar fornecimentos e descartes.',
  },
  {
    q: 'O aplicativo funciona sem internet?',
    a: 'Sim. O GestSilo é um PWA (Progressive Web App) com suporte offline. O Operador pode registrar saídas de silos mesmo sem conexão — as movimentações ficam salvas localmente e são sincronizadas automaticamente ao reconectar. No Dashboard, dados recentes ficam em cache para consulta. Conflitos de sincronização (ex: animal já inativo no servidor) são exibidos em uma tela de revisão em Configurações → Sincronização.',
  },
  {
    q: 'Como registrar uma movimentação de silagem?',
    a: 'No módulo Silos, localize o silo desejado e clique em "Nova Movimentação". Selecione o tipo (Entrada, Fornecimento, Venda ou Descarte), informe a quantidade e a data. Vendas de silagem geram automaticamente um lançamento no módulo Financeiro.',
  },
  {
    q: 'Como exportar relatórios?',
    a: 'Acesse o módulo Relatórios no menu lateral. Estão disponíveis exportações em Excel (.xlsx) e PDF para os principais módulos: financeiro, silos, talhões, frota, rebanho, insumos, pastagens, mão de obra e outros. Basta selecionar o período e clicar no botão de exportação.',
  },
  {
    q: 'Os dados inseridos estão seguros?',
    a: 'Sim. O GestSilo utiliza o Supabase (banco PostgreSQL hospedado na nuvem) com isolamento total entre fazendas via políticas de segurança em nível de linha (RLS). Seus dados nunca são acessíveis por outros usuários. O acesso é protegido por autenticação com sessão segura e rate limiting nas rotas de login.',
  },
];

export default function SuportePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#00A651]">Suporte Técnico</h2>
        <p className="text-sm text-muted-foreground">Entre em contato com nossa equipe</p>
      </div>

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
              <a
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full mt-auto' })}
              >
                {opt.label}
                <ExternalLink className="h-3.5 w-3.5 ml-2" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Perguntas Frequentes</h2>
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="px-5 py-2">
            <Accordion className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={i}>
                  <AccordionTrigger className="text-sm font-medium text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm bg-muted/50">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            GestSilo · Suporte disponível seg–sex, das 8h às 18h
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
