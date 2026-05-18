import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidade — GestSilo',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center mb-10">
          <Image
            src="/logo_verde.png"
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

        <article className="bg-surface border border-border2 rounded-[13px] p-10 max-w-none relative overflow-hidden">
          <div className="absolute top-0 left-[1.125rem] right-[1.125rem] h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent pointer-events-none" />

          <h1 className="text-2xl font-black text-foreground mb-2">
            Política de Privacidade
          </h1>
          <p className="text-xs text-muted-foreground mb-8">
            Última atualização: abril de 2026
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">1. Coleta de dados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            O GestSilo coleta apenas os dados necessários para a prestação do
            serviço: nome, e-mail, dados da fazenda e informações operacionais
            inseridas pelo usuário (silos, insumos, financeiro etc.).
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">2. Uso dos dados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Os dados coletados são utilizados exclusivamente para fornecer as
            funcionalidades da plataforma. Não compartilhamos informações pessoais
            com terceiros sem consentimento, exceto quando exigido por lei.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">3. Armazenamento e segurança</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Todos os dados são armazenados em servidores seguros com criptografia
            em trânsito (HTTPS/TLS) e em repouso. Utilizamos o Supabase como
            provedor de banco de dados, que segue padrões SOC 2 Type II.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">4. Direitos do usuário</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Você pode solicitar a qualquer momento o acesso, correção ou exclusão
            dos seus dados pessoais. Para isso, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@gestsilo.com.br" className="text-brand-primary hover:opacity-80">suporte@gestsilo.com.br</a>.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">5. Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Utilizamos cookies de sessão para manter você autenticado na
            plataforma. Não utilizamos cookies de rastreamento ou publicidade.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">6. Contato</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Em caso de dúvidas sobre esta política, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@gestsilo.com.br" className="text-brand-primary hover:opacity-80">suporte@gestsilo.com.br</a>.
          </p>
        </article>
      </div>
    </div>
  );
}
