'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Wheat,
  Tractor,
  Calculator,
  DollarSign,
  Package,
  BarChart3,
  Phone,
  Instagram,
  Mail,
  Sprout,
  Zap,
  MapPin,
  TrendingDown,
  Shield,
  Beef,
  Leaf,
  Users,
  Scale,
  AlertTriangle,
  ArrowUp,
  X,
  Target,
  Eye,
  Heart,
  MessageSquare,
  ExternalLink,
  BookOpen,
  Handshake,
  HandHeart,
} from 'lucide-react';

type ModalType = 'missao' | 'visao' | 'valores' | 'suporte' | 'privacidade' | 'termos' | null;

const MODAL_CONTENT = {
  missao: {
    title: 'Missão',
    Icon: Handshake,
    iconColor: '#BBF7D0',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Nossa missão é democratizar a gestão agrícola profissional, levando-a de forma simples e acessível 
          ao produtor rural brasileiro, para transformar rotina improvisada em decisões seguras, com dados reais, 
          mesmo em ambientes de baixa conectividade.
        </p>
       </div>
    ),
  },
  visao: {
    title: 'Visão',
    Icon: MapPin,
    iconColor: '#A5F3FC',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Nossa visão é ser a principal referência em gestão agropecuária para pequenos e médios produtores 
          no Brasil, reconhecida pela profundidade técnica, pela simplicidade de uso e pela confiança nos dados 
          que entrega, impulsionando um futuro em que toda propriedade rural tome decisões baseadas em dados reais,
          não em estimativas.
        </p>
       </div>
    ),
  },
  valores: {
    title: 'Nossos Valores',
    Icon: HandHeart,
    iconColor: '#FCA5A5',
    content: (
      <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
        {[
          {
            title: 'Proximidade com o produtor',
            desc: 'Cada funcionalidade nasce de uma necessidade real, a partir da realidade de uma operação, não de uma hipótese de escritório.',
          },
          {
            title: 'Precisão e confiabilidade',
            desc: 'Dados errados custam caro na fazenda. Priorizamos a exatidão de cada cálculo, a integridade de cada registro e a consistência de cada relatório.',
          },
          {
            title: 'Simplicidade sem superficialidade',
            desc: 'Fácil de usar, sem abrir mão da robustez técnica. Intuitivo para o operador de campo e robusto para o administrador da fazenda.',
          },
          {
            title: 'Compromisso com o campo brasileiro',
            desc: 'Acreditamos que o agronegócio brasileiro é estratégico para o país. Nosso trabalho é fortalecer quem está na base dessa cadeia — o produtor rural  .',
          },
          {
            title: 'Melhoria contínua',
            desc: 'O campo evolui. Em nossa plataforma inovamos sem atrapalhar a estabilidade do que já funciona.',
          },
        ].map((v) => (
          <div key={v.title} className="flex gap-3">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-green-dim border border-green-border flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-0.5">{v.title}</p>
              <p>{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  suporte: {
    title: 'Suporte',
    Icon: MessageSquare,
    iconColor: '#E9D5FF',
    content: null,
  },
  privacidade: {
    title: 'Política de Privacidade',
    Icon: Shield,
    iconColor: '#BBF7D0',
    content: null,
  },
  termos: {
    title: 'Termos de Uso',
    Icon: BookOpen,
    iconColor: '#FEF08A',
    content: null,
  },
};

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [openModal, setOpenModal] = useState<ModalType>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const checkUserRole = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('perfil')
          .eq('id', user.id)
          .single();

        if (profile?.perfil === 'Operador') {
          router.push('/operador');
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      }
    };

    checkUserRole();
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ===== MODAL INSTITUCIONAL ===== */}
      {openModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setOpenModal(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[16px] border border-border2 shadow-2xl"
            style={{ background: '#1c1c1c' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />

            {/* Header do modal */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              {(() => {
                const modal = MODAL_CONTENT[openModal];
                const IconComp = modal.Icon;
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-dim border border-green-border">
                      <IconComp size={20} color={modal.iconColor} />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">{modal.title}</h2>
                  </div>
                );
              })()}
              <button
                onClick={() => setOpenModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do modal */}
            <div className="p-6">
              {openModal === 'suporte' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { Icon: Mail, title: 'E-mail', desc: 'Para dúvidas gerais, bugs e solicitações.', contact: 'gestsilo.app@gmail.com', href: 'mailto:gestsilo.app@gmail.com', label: 'Enviar e-mail', badge: 'Resposta em até 24h' },
                      { Icon: MessageSquare, title: 'WhatsApp', desc: 'Atendimento rápido para problemas urgentes.', contact: '+55 (31) 99087-5346', href: 'https://wa.me/5531990875346', label: 'Abrir WhatsApp', badge: 'Seg–Sex, 8h–18h' },
                      { Icon: Phone, title: 'Telefone', desc: 'Suporte por voz para situações críticas.', contact: '+55 (31) 99087-5346', href: 'tel:+5531990875346', label: 'Ligar agora', badge: 'Seg–Sex, 8h–18h' },
                    ].map((opt) => (
                      <div key={opt.title} className="flex items-start gap-4 p-4 rounded-[10px] border border-border2 bg-bg2">
                        <div className="w-9 h-9 rounded-lg bg-green-dim border border-green-border flex items-center justify-center flex-shrink-0">
                          <opt.Icon size={16} className="text-brand-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-white/5 border border-border px-2 py-0.5 rounded-full whitespace-nowrap">{opt.badge}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{opt.desc}</p>
                          <p className="text-xs font-medium text-foreground">{opt.contact}</p>
                        </div>
                        <a
                          href={opt.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:opacity-80 transition-opacity whitespace-nowrap flex-shrink-0 mt-1"
                        >
                          {opt.label}
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[10px] border border-border2 bg-bg2 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen size={15} className="text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">Perguntas Frequentes</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { q: 'O aplicativo funciona sem internet?', a: 'Sim. O GestSilo é um PWA com suporte offline. Operações são salvas localmente e sincronizadas ao reconectar.' },
                        { q: 'Como adicionar um operador ou visualizador?', a: 'Em Configurações → Usuários e Acessos, clique em "Convidar Usuário" e informe o e-mail e o perfil desejado.' },
                        { q: 'Os meus dados estão seguros?', a: 'Sim. Usamos criptografia em trânsito e em repouso, isolamento total entre fazendas via RLS e backups automáticos semanais.' },
                      ].map((item, i) => (
                        <div key={i} className="border-t border-border pt-3 first:border-0 first:pt-0">
                          <p className="text-xs font-semibold text-foreground mb-1">{item.q}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">GestSilo · Suporte disponível seg–sex, das 8h às 18h</p>
                </div>
              )}

              {openModal === 'privacidade' && (
                <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
                  <p>Última atualização: <span className="text-foreground font-medium">abril de 2026</span></p>
                  {[
                    { h: '1. Coleta de dados', p: 'O GestSilo coleta apenas os dados necessários para a prestação do serviço: nome, e-mail, dados da fazenda e informações operacionais inseridas pelo usuário (silos, insumos, financeiro, rebanho, etc.). Não coletamos dados de localização em segundo plano nem monitoramos comportamento fora da plataforma.' },
                    { h: '2. Uso dos dados', p: 'Os dados coletados são utilizados exclusivamente para fornecer as funcionalidades da plataforma e melhorar a experiência do usuário. Não compartilhamos informações pessoais com terceiros sem consentimento explícito, exceto quando exigido por lei ou por ordem judicial.' },
                    { h: '3. Armazenamento e segurança', p: 'Todos os dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) e em repouso. Utilizamos o Supabase como provedor de banco de dados, que segue padrões SOC 2 Type II. Backups automáticos são realizados semanalmente e armazenados de forma segura na nuvem.' },
                    { h: '4. Isolamento entre fazendas', p: 'Cada fazenda opera em um ambiente totalmente isolado das demais. As políticas de segurança em nível de linha (RLS) garantem que nenhum usuário acesse dados de outra propriedade, mesmo que pertençam à mesma conta de e-mail.' },
                    { h: '5. Direitos do usuário (LGPD)', p: 'Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você pode a qualquer momento: acessar os dados que temos sobre você, solicitar a correção de informações incorretas, pedir a exclusão completa da sua conta e dados, ou revogar o consentimento de uso. Para exercer esses direitos, entre em contato pelo e-mail gestsilo.app@gmail.com.' },
                    { h: '6. Cookies', p: 'Utilizamos apenas cookies de sessão estritamente necessários para manter você autenticado na plataforma. Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de terceiros.' },
                    { h: '7. Contato', p: 'Dúvidas sobre esta política? Entre em contato pelo e-mail gestsilo.app@gmail.com ou pelo WhatsApp (31) 99087-5346.' },
                  ].map((sec) => (
                    <div key={sec.h}>
                      <h3 className="text-sm font-bold text-foreground mb-1.5">{sec.h}</h3>
                      <p>{sec.p}</p>
                    </div>
                  ))}
                </div>
              )}

              {openModal === 'termos' && (
                <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
                  <p>Última atualização: <span className="text-foreground font-medium">maio de 2026</span></p>
                  {[
                    { h: '1. Aceitação dos termos', p: 'Ao acessar ou utilizar o GestSilo, você declara que leu, entendeu e concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize a plataforma.' },
                    { h: '2. Descrição do serviço', p: 'O GestSilo é uma plataforma SaaS de gestão agropecuária que permite o controle integrado de silos, talhões, rebanho, frota, insumos, pastagens, mão de obra e financeiro de propriedades rurais brasileiras.' },
                    { h: '3. Conta de usuário', p: 'Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique imediatamente qualquer uso não autorizado pelo e-mail gestsilo.app@gmail.com.' },
                    { h: '4. Uso aceitável', p: 'É vedado o uso da plataforma para fins ilegais, fraude, engenharia reversa, disseminação de conteúdo malicioso, tentativas de acesso a dados de outras fazendas ou qualquer atividade que prejudique outros usuários ou a integridade do serviço.' },
                    { h: '5. Propriedade intelectual', p: 'Todo o conteúdo, código, design e marca da plataforma são de propriedade exclusiva do GestSilo. Os dados operacionais inseridos pelo usuário permanecem de sua propriedade e podem ser exportados a qualquer momento.' },
                    { h: '6. Disponibilidade do serviço', p: 'Buscamos manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas são comunicadas com antecedência. O serviço é oferecido sem garantia de resultados econômicos específicos.' },
                    { h: '7. Cancelamento e dados', p: 'Você pode cancelar sua conta a qualquer momento. Após o cancelamento, seus dados ficam disponíveis para exportação por 30 dias, após os quais são permanentemente excluídos dos nossos servidores.' },
                    { h: '8. Alterações nos termos', p: 'Reservamo-nos o direito de alterar estes termos a qualquer momento. Alterações significativas serão comunicadas por e-mail com antecedência mínima de 30 dias. O uso continuado da plataforma após o aviso implica aceitação dos novos termos.' },
                    { h: '9. Foro e lei aplicável', p: 'Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de Belo Horizonte/MG para dirimir quaisquer controvérsias decorrentes deste instrumento.' },
                  ].map((sec) => (
                    <div key={sec.h}>
                      <h3 className="text-sm font-bold text-foreground mb-1.5">{sec.h}</h3>
                      <p>{sec.p}</p>
                    </div>
                  ))}
                </div>
              )}

              {openModal !== 'suporte' && openModal !== 'privacidade' && openModal !== 'termos' && MODAL_CONTENT[openModal]?.content}
            </div>
          </div>
        </div>
      )}

      {/* ===== NAVBAR ===== */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border shadow-sm"
        style={{ background: 'rgba(28,28,28,0.92)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_verde.png"
              alt="GestSilo"
              width={180}
              height={45}
              className="object-contain brightness-110"
              priority
            />
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
            <a href="#funcionalidades" className="text-muted-foreground hover:text-brand-primary transition-colors">Funcionalidades</a>
            <a href="#beneficios" className="text-muted-foreground hover:text-brand-primary transition-colors">Benefícios</a>
            <a href="#planos" className="text-muted-foreground hover:text-brand-primary transition-colors">Planos</a>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Entrar
            </button>
            <button
              onClick={() => router.push('/register')}
              className="text-sm font-semibold text-white px-4 md:px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #135a36, #00843D)' }}
            >
              Solicitar acesso
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="bg-background relative min-h-[80vh] flex items-center overflow-hidden pt-20">
        {/* Grid pattern */}
        <div className="absolute left-0 top-0 h-full w-full z-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00A651" strokeWidth="0.4"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh] py-12">

            {/* COLUNA ESQUERDA — Texto */}
            <div className="flex flex-col justify-center">
              <div className="mb-8">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm border"
                  style={{
                    backgroundColor: 'rgba(0,166,81,0.15)',
                    color: 'var(--brand-green-primary)',
                    borderColor: 'rgba(0,166,81,0.3)',
                  }}
                >
                  Uma plataforma feita para o pecuarista e agricultor brasileiro
                </span>
              </div>

              <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.08] tracking-tight mb-8">
                <span className="text-foreground">
                  Planeje, gerencie e<br />maximize a{' '}
                </span>
                <span className="relative inline-block text-brand-primary">
                  produção
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="6"
                    viewBox="0 0 200 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 5 Q50 0 100 4 Q150 8 200 3"
                      stroke="#00843D"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.6"
                    />
                  </svg>
                </span>
                <br />
                <span className="text-foreground/85">da sua propriedade</span>
              </h1>

              <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl text-muted-foreground">
                Sua propriedade merece mais do que cadernos e planilhas.
                Controle sua silagem, suas lavouras, sua frota e seus insumos em uma plataforma feita para o
                produtor brasileiro — do campo à gestão, com poucos cliques.
              </p>
            </div>

            {/* COLUNA DIREITA — Imagem */}
            <div className="relative hidden lg:flex items-center justify-end">
              <div className="relative w-full max-w-md">
                <div
                  className="absolute -inset-4 rounded-[40px] rotate-3 opacity-25 z-0"
                  style={{ background: 'linear-gradient(135deg, #36875d, #205b0d)' }}
                />
                <div className="relative z-10 rounded-[32px] overflow-hidden shadow-2xl w-full max-w-md" style={{ aspectRatio: '4/3' }}>
                  <Image
                    src="/imagem-hero.webp?v=1"
                    alt="Gestão agrícola com GestSilo"
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/3 z-10"
                    style={{ background: 'linear-gradient(to top, rgba(0,132,61,0.35), transparent)' }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== FUNCIONALIDADES ===== */}
      <section id="funcionalidades" className="bg-bg2 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
              O sistema que a sua fazenda precisa
            </h2>
            <p className="text-lg max-w-xl mx-auto text-muted-foreground">
              Uma plataforma completa para gestão. Do campo à administração.
            </p>
          </div>

          {/* Linha 1 — módulos core */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {[
              { Icon: Wheat, title: 'Gestão de Silagens', desc: 'Controle total das suas silagens — entradas, saídas, volumes, qualidade bromatológica e de tamanho de partículas, evitando perdas e garantindo forragem de alto valor nutricional para o rebanho.', iconColor: '#BBF7D0' },
              { Icon: Beef, title: 'Gestão de Rebanho', desc: 'Seja para o rebanho leiteiro ou de corte. Ficha completa de cada animal, controle por lotes, reprodução, produção leiteira, sanidade, pesagens e GMD — tudo integrado em um único módulo.', iconColor: '#FED7AA' },
              { Icon: Sprout, title: 'Gestão de Lavouras', desc: 'Para gerenciar seus talhões, ciclos agrícolas, operações de campo, histórico de cultivos, produtividade por área e custo de produção por ciclo.', iconColor: '#BFDBFE' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-surface rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-8 transition-all duration-200 hover:-translate-y-1 hover:bg-surface2 cursor-default"
                style={{ border: '1px solid #00843D', outline: '1px solid rgba(255,255,255,0.12)', outlineOffset: '-2px' }}
              >
                <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
                <div className="mb-4">
                  <item.Icon size={36} strokeWidth={1.8} color={item.iconColor} />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Linha 2 — módulos de gestão */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[
              { Icon: Tractor, title: 'Frota & Maquinário', desc: 'Plano de manutenção preventiva/corretiva, diário de bordo, abastecimentos e custo operacional por máquina.', iconColor: '#FED7AA' },
              { Icon: Leaf, title: 'Gestão de Pastagens', desc: 'Controle de piquetes, ocupações de lotes, cálculo de UA/ha e histórico de eventos de manejo por área.', iconColor: '#BBF7D0' },
              { Icon: DollarSign, title: 'Gestão Financeira', desc: 'Despesas, receitas, fluxo de caixa e lucratividade com integração automática de todos os módulos — insumos, mão de obra, vendas.', iconColor: '#FEF08A' },
              { Icon: Users, title: 'Mão de Obra', desc: 'Registro de atividades rurais, custo por colaborador, vínculo com talhões e silos, e integração automática ao financeiro.', iconColor: '#E9D5FF' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-surface rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-surface2 cursor-default"
                style={{ border: '1px solid #00843D', outline: '1px solid rgba(255,255,255,0.12)', outlineOffset: '-2px' }}
              >
                <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
                <div className="mb-3">
                  <item.Icon size={32} strokeWidth={1.8} color={item.iconColor} />
                </div>
                <h3 className="font-bold text-foreground text-base mb-1.5">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Linha 3 — módulos de suporte e análise */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { Icon: Package, title: 'Estoque de Insumos & Produtos', desc: 'Controle os estoques de insumos e de seus produtos, com níveis mínimos, alertas automáticos, integração financeira e planejamento de compras.', iconColor: '#A5F3FC' },
              { Icon: Scale, title: 'Balanço Forrageiro', desc: 'Cruzamento do consumo real da silagem, da demanda projetada para o rebanho e da oferta das pastagens para calcular a autonomia líquida.', iconColor: '#D9F99D' },
              { Icon: Calculator, title: 'Calculadoras Agronômicas', desc: 'Encontrae a combinação de fertilizantes mais econômica ou com melhor eficicência de manejo para sua necessidade. Calcule a necessidade de calcário a partir da sua análise de solo', iconColor: '#E9D5FF' },
              { Icon: BarChart3, title: 'Relatórios Exportáveis', desc: 'Mais de 15 relatórios em Excel e PDF cobrindo todos os módulos — rebanho, financeiro, talhões, frota e muito mais.', iconColor: '#DDD6FE' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-surface rounded-[13px] relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.28),0_8px_28px_rgba(0,0,0,0.16)] p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-surface2 cursor-default"
                style={{ border: '1px solid #00843D', outline: '1px solid rgba(255,255,255,0.12)', outlineOffset: '-2px' }}
              >
                <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />
                <div className="mb-3">
                  <item.Icon size={32} strokeWidth={1.8} color={item.iconColor} />
                </div>
                <h3 className="font-bold text-foreground text-base mb-1.5">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section id="beneficios" className="bg-background py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-4 block text-brand-primary">
              Por que utilizar o GestSilo na sua propriedade?
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-foreground">
              Decisões mais inteligentes,<br />resultado no campo!
            </h2>
            <div className="space-y-5">
              {[
                { Icon: Zap, title: 'Agilidade', desc: 'Acesse qualquer informação em segundos, do celular ou do computador.' },
                { Icon: MapPin, title: 'Rastreabilidade', desc: 'Histórico completo de cada silo, de cada lavoura e das máquinas da sua fazenda.' },
                { Icon: TrendingDown, title: 'Gestão de custos', desc: 'Identifique os gargalos e reduza os desperdícios, através de dados precisos.' },
                { Icon: Shield, title: 'Segurança', desc: 'Seus dados protegidos com criptografia e backup automático.' },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="bg-green-dim border border-green-border rounded-[8px] w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <b.Icon className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-foreground">{b.title}</h4>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup do sistema — fiel ao dashboard real */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[32px] opacity-20 blur-2xl z-0" style={{ background: 'linear-gradient(135deg, #00A651, #135a36)' }} />

            {/* Shell tipo app com sidebar + conteúdo */}
            <div className="relative z-10 rounded-[18px] overflow-hidden border border-white/10 shadow-2xl flex" style={{ background: '#161616', minHeight: 480 }}>

              {/* Sidebar */}
              <div className="w-[120px] flex-shrink-0 border-r border-white/8 flex flex-col py-4 gap-1" style={{ background: '#111111' }}>
                {/* Logo */}
                <div className="px-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-brand-primary flex items-center justify-center">
                      <Wheat size={11} className="text-white" />
                    </div>
                    <span className="text-[10px] font-extrabold text-foreground tracking-tight">GestSilo</span>
                  </div>
                </div>
                {/* Item ativo */}
                <div className="mx-2 px-2 py-1.5 rounded-[6px] flex items-center gap-1.5" style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.25)' }}>
                  <BarChart3 size={11} className="text-brand-primary flex-shrink-0" />
                  <span className="text-[9px] font-bold text-brand-primary">Dashboard</span>
                </div>
                {[
                  { Icon: Wheat, label: 'Silos' },
                  { Icon: Sprout, label: 'Lavouras' },
                  { Icon: Leaf, label: 'Pastagens' },
                  { Icon: Beef, label: 'Rebanho' },
                  { Icon: Package, label: 'Insumos' },
                  { Icon: DollarSign, label: 'Financeiro' },
                ].map((item) => (
                  <div key={item.label} className="mx-2 px-2 py-1.5 rounded-[6px] flex items-center gap-1.5 hover:bg-white/5 cursor-default">
                    <item.Icon size={11} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-[9px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Conteúdo do dashboard */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Topbar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8" style={{ background: '#1a1a1a' }}>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Boa tarde, Marcio!</p>
                    <p className="text-[10px] font-semibold text-foreground">Visão geral da sua propriedade</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-semibold" style={{ background: 'rgba(0,166,81,0.12)', border: '1px solid rgba(0,166,81,0.25)', color: '#00A651' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    MS
                  </div>
                </div>

                <div className="flex-1 overflow-hidden p-3 space-y-3">

                  {/* Alertas Críticos */}
                  <div className="rounded-[8px] overflow-hidden border border-white/10" style={{ background: '#1c1c1c' }}>
                    <div className="px-3 py-1.5 border-b border-white/8 flex items-center gap-1.5">
                      <AlertTriangle size={10} className="text-red-400" />
                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Alertas Críticos</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {[
                        { msg: 'Sem consumo há 4 dias — Silo02', sub: 'Silo aberto sem registro de saída' },
                        { msg: 'Silo aberto sem consumo — Silo 01', sub: 'Aberto há 3 dias sem saída de silagem' },
                      ].map((a) => (
                        <div key={a.msg} className="px-3 py-1.5 flex items-start gap-2">
                          <AlertTriangle size={8} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[9px] font-semibold text-foreground">{a.msg}</p>
                            <p className="text-[8px] text-muted-foreground">{a.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seção SILAGEM */}
                  <div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Silagem</p>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Ocupação */}
                      <div className="rounded-[8px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                        <p className="text-[7px] uppercase tracking-wider text-muted-foreground mb-1">Ocupação</p>
                        <p className="text-sm font-extrabold text-foreground">67%</p>
                        <p className="text-[7px] text-muted-foreground">638 / 953 ton</p>
                      </div>
                      {/* Autonomia */}
                      <div className="rounded-[8px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                        <p className="text-[7px] uppercase tracking-wider text-muted-foreground mb-1">Autonomia</p>
                        <p className="text-sm font-extrabold text-foreground leading-none">232</p>
                        <p className="text-[7px] text-muted-foreground">dias de estoque</p>
                      </div>
                      {/* Consumo */}
                      <div className="rounded-[8px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                        <p className="text-[7px] uppercase tracking-wider text-muted-foreground mb-1">Consumo/dia</p>
                        <p className="text-sm font-extrabold text-foreground">1.283</p>
                        <p className="text-[7px] text-muted-foreground">kg/dia (30d)</p>
                      </div>
                    </div>
                    {/* Silos list */}
                    <div className="mt-1.5 rounded-[8px] border border-white/10 overflow-hidden" style={{ background: '#1c1c1c' }}>
                      {[
                        { nome: 'Silo02 — Milho', pct: 99, cor: '#00A651' },
                        { nome: 'Silo 04 — Sorgo', pct: 99, cor: '#EAB308' },
                        { nome: 'Silo 01 — Milho', pct: 99, cor: '#3B82F6' },
                      ].map((s) => (
                        <div key={s.nome} className="px-2.5 py-1.5 flex items-center gap-2 border-b border-white/5 last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.cor }} />
                          <span className="text-[8px] text-foreground flex-1">{s.nome}</span>
                          <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.cor }} />
                          </div>
                          <span className="text-[8px] font-bold" style={{ color: s.cor }}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seção CAMPO — Financeiro */}
                  <div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Financeiro</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Receita do Mês', value: 'R$ 0,00', color: '#4ADE80' },
                        { label: 'Despesa do Mês', value: 'R$ 0,00', color: '#F87171' },
                      ].map((f) => (
                        <div key={f.label} className="rounded-[8px] p-2.5 border border-white/10" style={{ background: '#1c1c1c' }}>
                          <p className="text-[7px] uppercase tracking-wider text-muted-foreground mb-1">{f.label}</p>
                          <p className="text-xs font-bold" style={{ color: f.color }}>{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section id="planos" className="bg-bg2 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
              O plano certo para cada fazenda!
            </h2>
            <p className="text-lg text-muted-foreground">
              Grátis para começar. Sem surpresa e sem limites para crescer!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Start',
                price: 'Grátis',
                period: '',
                desc: 'Para produtores que querem iniciar e conhecer',
                features: ['1 silo', 'Até 3 talhões', 'Suporte por e-mail'],
                cta: 'Começar grátis',
                highlight: false,
              },
              {
                name: 'Pro',
                price: 'R$ 49',
                period: '/mês',
                desc: 'Para gestão profissional da propriedade',
                features: ['Silos ilimitados', 'Talhões ilimitados', 'Planejador de silagem', 'Módulo financeiro', 'Gestão de Frotas', 'Calculadoras de Calcário e de Fertilizantes', 'Relatórios avançados', 'Suporte prioritário'],
                cta: 'Assinar Pro',
                highlight: true,
              },
              {
                name: 'Max',
                price: 'R$ 119',
                period: '/mês',
                desc: 'Para grandes operações',
                features: ['Tudo do Pro', 'Multi-fazendas', 'Assessoria agronômica exclusiva'],
                cta: 'Falar com vendas',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[13px] p-8 border relative transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlight ? 'shadow-2xl scale-105' : 'bg-surface border-border2'
                }`}
                style={
                  plan.highlight
                    ? { background: 'linear-gradient(145deg, #00A651, #00843D)', borderColor: '#00843D' }
                    : {}
                }
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow whitespace-nowrap"
                    style={{ background: '#FEF08A', color: '#854d0e' }}
                  >
                    Mais popular
                  </div>
                )}
                <h3 className={`font-bold text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlight ? 'text-white/85' : 'text-muted-foreground'}`}>
                  {plan.desc}
                </p>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ml-1 ${plan.highlight ? 'text-white/85' : 'text-muted-foreground'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg
                        className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-brand-primary'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      <span className={plan.highlight ? 'text-white/95' : 'text-muted-foreground'}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/register')}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90"
                  style={
                    plan.highlight
                      ? { background: '#ffffff', color: '#00843D' }
                      : { background: 'linear-gradient(135deg, #00A651, #00843D)', color: '#ffffff' }
                  }
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="bg-background py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00A651" strokeWidth="0.4"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-foreground">
            Pronto para gerenciar<br />suas silagens e sua propriedade?
          </h2>
          <p className="text-lg mb-10 text-muted-foreground">
            Mais controle. Menos perdas. Mais resultados para seu rebanho e para sua propriedade.
          </p>
          <button
            onClick={() => router.push('/register')}
            className="px-10 py-5 font-bold text-lg rounded-2xl shadow-2xl transition-all duration-200 hover:-translate-y-1 text-white"
            style={{ background: 'linear-gradient(135deg, #00A651, #00843D)' }}
          >
            Solicitar meu acesso
          </button>
          <p className="text-sm mt-4 text-muted-foreground">
            Solicite seu primeiro acesso, conheça e melhore sua gestão.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        className="py-14 px-6 border-t border-border"
        style={{ background: 'var(--sidebar)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 items-start mb-10">

            {/* COLUNA 1 — Logo + descrição */}
            <div className="flex flex-col items-center sm:items-start gap-3 sm:col-span-2 lg:col-span-1">
              <Image
                src="/logo_verde.png"
                alt="GestSilo"
                width={200}
                height={50}
                className="object-contain"
              />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px] text-center sm:text-left">
                Plataforma de gestão agropecuária para o produtor rural brasileiro  .
              </p>
            </div>

            {/* COLUNA 2 — Contatos */}
            <div className="flex flex-col items-center sm:items-start gap-3">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-1 text-foreground">
                Contatos
              </h4>
              <a
                href="https://wa.me/5531990875346"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
                aria-label="WhatsApp"
              >
                <Phone size={15} />
                <span>(31) 99087-5346</span>
              </a>
              <a
                href="https://instagram.com/gestsilo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={15} />
                <span>@gestsilo</span>
              </a>
              <a
                href="mailto:gestsilo.app@gmail.com"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
                aria-label="E-mail"
              >
                <Mail size={15} />
                <span>gestsilo.app@gmail.com</span>
              </a>
              <button
                onClick={() => setOpenModal('suporte')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              >
                <MessageSquare size={15} />
                <span>Suporte técnico</span>
              </button>
            </div>

            {/* COLUNA 3 — Institucional */}
            <div className="flex flex-col items-center sm:items-start gap-3">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-1 text-foreground">
                Institucional
              </h4>
              <button
                onClick={() => setOpenModal('missao')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              >
                <Target size={15} />
                <span>Missão</span>
              </button>
              <button
                onClick={() => setOpenModal('visao')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              >
                <Eye size={15} />
                <span>Visão</span>
              </button>
              <button
                onClick={() => setOpenModal('valores')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              >
                <Heart size={15} />
                <span>Valores</span>
              </button>
            </div>

            {/* COLUNA 4 — Legal */}
            <div className="flex flex-col items-center sm:items-start gap-3">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-1 text-foreground">
                Política e Termos
              </h4>
              <button
                onClick={() => setOpenModal('privacidade')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              >
                <Shield size={15} />
                <span>Política de Privacidade</span>
              </button>
              <button
                onClick={() => setOpenModal('termos')}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              >
                <BookOpen size={15} />
                <span>Termos de Uso</span>
              </button>
              <p className="text-xs text-muted-foreground mt-1">
                Em conformidade com a LGPD
              </p>
            </div>

          </div>

          {/* Linha final */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              © 2026 GestSilo · Todos os direitos reservados
            </span>
            <span className="text-xs text-muted-foreground">
              Feito com dedicação para o produtor brasileiro 🌾
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
