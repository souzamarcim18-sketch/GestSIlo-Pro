'use client';

import {
  X,
  Mail,
  Phone,
  Shield,
  MessageSquare,
  ExternalLink,
  BookOpen,
  MapPin,
  Handshake,
  HandHeart,
  type LucideIcon,
} from 'lucide-react';
import { useLandingModal, type ModalType } from './LandingModalContext';
import {
  VALORES,
  SUPORTE_CONTATOS,
  SUPORTE_FAQ,
  PRIVACIDADE_SECOES,
  TERMOS_SECOES,
} from './data';

const MODAL_CONTENT: Record<
  Exclude<ModalType, null>,
  { title: string; Icon: LucideIcon; iconColor: string; content: React.ReactNode }
> = {
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
        {VALORES.map((v) => (
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

export default function ModalInstitucional() {
  const { openModal, setOpenModal } = useLandingModal();

  if (!openModal) return null;

  return (
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
                {SUPORTE_CONTATOS.map((opt) => {
                  const Icon = opt.title === 'E-mail' ? Mail : opt.title === 'WhatsApp' ? MessageSquare : Phone;
                  return (
                    <div key={opt.title} className="flex items-start gap-4 p-4 rounded-[10px] border border-border2 bg-bg2">
                      <div className="w-9 h-9 rounded-lg bg-green-dim border border-green-border flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-brand-primary" />
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
                  );
                })}
              </div>
              <div className="rounded-[10px] border border-border2 bg-bg2 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={15} className="text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Perguntas Frequentes</p>
                </div>
                <div className="space-y-3">
                  {SUPORTE_FAQ.map((item, i) => (
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
              <p>Última atualização: <span className="text-foreground font-medium">maio de 2026</span></p>
              {PRIVACIDADE_SECOES.map((sec) => (
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
              {TERMOS_SECOES.map((sec) => (
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
  );
}
