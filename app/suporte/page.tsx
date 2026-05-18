'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function SuportePage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[GestSilo Suporte] Mensagem de ${nome}`);
    const body = encodeURIComponent(
      `Nome: ${nome}\nE-mail: ${email}\n\nMensagem:\n${mensagem}`
    );
    window.location.href = `mailto:suporte@gestsilo.com.br?subject=${subject}&body=${body}`;
    setEnviado(true);
    toast.success('Abrindo seu cliente de e-mail...');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-suporte" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--brand-green-vivid)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-suporte)" />
        </svg>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 relative">
        <div className="flex items-center justify-center mb-10">
          <Image
            src="/logo_degrad-hor.png"
            alt="GestSilo"
            width={200}
            height={50}
            className="object-contain brightness-110"
            priority
          />
        </div>

        <div className="mb-8">
          <Link
            href="/login"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao login
          </Link>
        </div>

        <div className="bg-surface border border-border2 rounded-[13px] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />

          <h1 className="text-2xl font-black tracking-tight text-foreground mb-2">Suporte</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Precisa de ajuda? Preencha o formulário abaixo ou envie um e-mail
            diretamente para{' '}
            <a
              href="mailto:suporte@gestsilo.com.br"
              className="text-brand-primary hover:opacity-80"
            >
              suporte@gestsilo.com.br
            </a>
            .
          </p>

          {enviado ? (
            <div className="p-4 bg-green-dim border border-green-border rounded-[8px] text-foreground text-sm">
              <p className="font-semibold mb-1">Mensagem preparada!</p>
              <p>
                Seu cliente de e-mail foi aberto com os dados preenchidos. Envie a
                mensagem para concluir.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="nome"
                  className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground"
                >
                  Nome
                </label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full px-4 py-3 bg-input border border-border rounded-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm shadow-sm transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground"
                >
                  E-mail para resposta
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-input border border-border rounded-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm shadow-sm transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="mensagem"
                  className="block text-xs font-bold uppercase tracking-[0.1em] mb-2 text-muted-foreground"
                >
                  Mensagem
                </label>
                <textarea
                  id="mensagem"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Descreva sua dúvida ou problema..."
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-input border border-border rounded-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm shadow-sm transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!nome.trim() || !email.trim() || !mensagem.trim()}
                className="w-full py-3 px-6 text-white font-semibold text-base rounded-xl transition-all duration-200 shadow-lg"
                style={{
                  background:
                    !nome.trim() || !email.trim() || !mensagem.trim()
                      ? '#9CA3AF'
                      : 'linear-gradient(135deg, #00A651 0%, #00843D 100%)',
                  boxShadow:
                    !nome.trim() || !email.trim() || !mensagem.trim()
                      ? 'none'
                      : '0 4px 20px rgba(0,166,81,0.35)',
                }}
              >
                Enviar mensagem
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
