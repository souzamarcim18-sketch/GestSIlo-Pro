import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade — GestSilo',
};

export default function PrivacidadePage() {
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
            Política de Privacidade
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Última atualização: abril de 2026
          </p>

          <h2>1. Coleta de dados</h2>
          <p>
            O GestSilo coleta apenas os dados necessários para a prestação do
            serviço: nome, e-mail, dados da fazenda e informações operacionais
            inseridas pelo usuário (silos, insumos, financeiro etc.).
          </p>

          <h2>2. Uso dos dados</h2>
          <p>
            Os dados coletados são utilizados exclusivamente para fornecer as
            funcionalidades da plataforma. Não compartilhamos informações pessoais
            com terceiros sem consentimento, exceto quando exigido por lei.
          </p>

          <h2>3. Armazenamento e segurança</h2>
          <p>
            Todos os dados são armazenados em servidores seguros com criptografia
            em trânsito (HTTPS/TLS) e em repouso. Utilizamos o Supabase como
            provedor de banco de dados, que segue padrões SOC 2 Type II.
          </p>

          <h2>4. Direitos do usuário</h2>
          <p>
            Você pode solicitar a qualquer momento o acesso, correção ou exclusão
            dos seus dados pessoais. Para isso, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@gestsilo.com.br">suporte@gestsilo.com.br</a>.
          </p>

          <h2>5. Cookies</h2>
          <p>
            Utilizamos cookies de sessão para manter você autenticado na
            plataforma. Não utilizamos cookies de rastreamento ou publicidade.
          </p>

          <h2>6. Contato</h2>
          <p>
            Em caso de dúvidas sobre esta política, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@gestsilo.com.br">suporte@gestsilo.com.br</a>.
          </p>
        </article>
      </div>
    </div>
  );
}
