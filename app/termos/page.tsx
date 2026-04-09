import Link from 'next/link';

export const metadata = {
  title: 'Termos de Uso — GestSilo',
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Voltar ao login
          </Link>
        </div>

        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Termos de Uso
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Última atualização: abril de 2026
          </p>

          <h2>1. Aceitação dos termos</h2>
          <p>
            Ao acessar ou utilizar o GestSilo, você concorda com estes Termos de
            Uso. Se não concordar com qualquer parte, não utilize a plataforma.
          </p>

          <h2>2. Descrição do serviço</h2>
          <p>
            O GestSilo é uma plataforma de gestão agrícola que permite o controle
            de silos, talhões, frota, insumos e financeiro de propriedades rurais.
          </p>

          <h2>3. Conta de usuário</h2>
          <p>
            Você é responsável por manter a confidencialidade de suas credenciais
            de acesso e por todas as atividades realizadas em sua conta. Notifique
            imediatamente qualquer uso não autorizado.
          </p>

          <h2>4. Uso aceitável</h2>
          <p>
            É vedado o uso da plataforma para fins ilegais, fraude, disseminação
            de conteúdo malicioso ou qualquer atividade que prejudique outros
            usuários ou a integridade do serviço.
          </p>

          <h2>5. Propriedade intelectual</h2>
          <p>
            Todo o conteúdo, código e design da plataforma são de propriedade
            exclusiva do GestSilo. Os dados inseridos pelo usuário permanecem de
            sua propriedade.
          </p>

          <h2>6. Limitação de responsabilidade</h2>
          <p>
            O GestSilo não se responsabiliza por decisões tomadas com base nas
            informações exibidas na plataforma. O usuário é responsável pela
            precisão dos dados que insere.
          </p>

          <h2>7. Alterações nos termos</h2>
          <p>
            Reservamo-nos o direito de alterar estes termos a qualquer momento.
            Alterações significativas serão comunicadas por e-mail com antecedência
            mínima de 30 dias.
          </p>

          <h2>8. Contato</h2>
          <p>
            Em caso de dúvidas, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@gestsilo.com.br">suporte@gestsilo.com.br</a>.
          </p>
        </article>
      </div>
    </div>
  );
}
