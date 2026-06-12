'use client';

import Image from 'next/image';
import {
  Phone,
  Instagram,
  Mail,
  Shield,
  MessageSquare,
  BookOpen,
  MapPin,
  Handshake,
  HandHeart,
} from 'lucide-react';
import { useLandingModal } from './LandingModalContext';

export default function Footer() {
  const { setOpenModal } = useLandingModal();

  return (
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
              Plataforma de gestão agropecuária para o produtor rural brasileiro
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
              <Handshake size={15} />
              <span>Missão</span>
            </button>
            <button
              onClick={() => setOpenModal('visao')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
            >
              <MapPin size={15} />
              <span>Visão</span>
            </button>
            <button
              onClick={() => setOpenModal('valores')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-primary transition-colors"
            >
              <HandHeart size={15} />
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
  );
}
