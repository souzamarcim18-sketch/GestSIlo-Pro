import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Termos de Uso — GestSilo',
};

export default function TermosPage() {
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
            Termos de Uso
          </h1>
          <p className="text-xs text-muted-foreground mb-8">
            Última atualização: abril de 2026
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">1. Aceitação dos termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Ao acessar ou utilizar o GestSilo, você concorda com estes Termos de
            Uso. Se não concordar com qualquer parte, não utilize a plataforma.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">2. Descrição do serviço</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            O GestSilo é uma plataforma de gestão agrícola que permite o controle
            de silos, talhões, frota, insumos e financeiro de propriedades rurais.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">3. Conta de usuário</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Você é responsável por manter a confidencialidade de suas credenciais
            de acesso e por todas as atividades realizadas em sua conta. Notifique
            imediatamente qualquer uso não autorizado.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">4. Uso aceitável</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            É vedado o uso da plataforma para fins ilegais, fraude, disseminação
            de conteúdo malicioso ou qualquer atividade que prejudique outros
            usuários ou a integridade do serviço.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">5. Propriedade intelectual</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Todo o conteúdo, código e design da plataforma são de propriedade
            exclusiva do GestSilo. Os dados inseridos pelo usuário permanecem de
            sua propriedade.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">6. Limitação de responsabilidade</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            O GestSilo não se responsabiliza por decisões tomadas com base nas
            informações exibidas na plataforma. O usuário é responsável pela
            precisão dos dados que insere.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">7. Alterações nos termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Reservamo-nos o direito de alterar estes termos a qualquer momento.
            Alterações significativas serão comunicadas por e-mail com antecedência
            mínima de 30 dias.
          </p>

          <h2 className="text-base font-bold text-foreground mt-6 mb-2">8. Contato</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Em caso de dúvidas, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@gestsilo.com.br" className="text-brand-primary hover:opacity-80">suporte@gestsilo.com.br</a>.
          </p>
        </article>
      </div>
    </div>
  );
}
