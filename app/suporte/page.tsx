'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SuportePage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Abre o cliente de e-mail com os dados preenchidos
    const subject = encodeURIComponent(`[GestSilo Suporte] Mensagem de ${nome}`);
    const body = encodeURIComponent(
      `Nome: ${nome}\nE-mail: ${email}\n\nMensagem:\n${mensagem}`
    );
    window.location.href = `mailto:suporte@gestsilo.com.br?subject=${subject}&body=${body}`;
    setEnviado(true);
    toast.success('Abrindo seu cliente de e-mail...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Voltar ao login
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Suporte</h1>
          <p className="text-gray-600 text-sm mb-8">
            Precisa de ajuda? Preencha o formulário abaixo ou envie um e-mail
            diretamente para{' '}
            <a
              href="mailto:suporte@gestsilo.com.br"
              className="text-green-600 hover:underline"
            >
              suporte@gestsilo.com.br
            </a>
            .
          </p>

          {enviado ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
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
                  className="block text-sm font-semibold text-gray-700 mb-2"
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-base shadow-sm"
                  onFocus={(e) =>
                    (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.15)')
                  }
                  onBlur={(e) => (e.target.style.boxShadow = '')}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-base shadow-sm"
                  onFocus={(e) =>
                    (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.15)')
                  }
                  onBlur={(e) => (e.target.style.boxShadow = '')}
                />
              </div>

              <div>
                <label
                  htmlFor="mensagem"
                  className="block text-sm font-semibold text-gray-700 mb-2"
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
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-base shadow-sm resize-none"
                  onFocus={(e) =>
                    (e.target.style.boxShadow = '0 0 0 3px rgba(0,166,81,0.15)')
                  }
                  onBlur={(e) => (e.target.style.boxShadow = '')}
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
