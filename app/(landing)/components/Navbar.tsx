'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Na home, usa âncora pura (rolagem suave). Fora dela, navega para a home + âncora.
  const sectionHref = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border shadow-sm"
      style={{ background: 'rgba(28,28,28,0.92)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a
          href={isHome ? '#' : '/'}
          onClick={(e) => {
            if (isHome) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          aria-label="Ir para o topo da página"
          className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
        >
          <Image
            src="/logo_verde.png"
            alt="GestSilo"
            width={180}
            height={45}
            className="object-contain brightness-110"
            priority
          />
        </a>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
          <a href={sectionHref('funcionalidades')} className="text-muted-foreground hover:text-brand-primary transition-colors">Funcionalidades</a>
          <a href={sectionHref('beneficios')} className="text-muted-foreground hover:text-brand-primary transition-colors">Benefícios</a>
          <a href={sectionHref('quem-somos')} className="text-muted-foreground hover:text-brand-primary transition-colors">Quem somos</a>
          <a href={sectionHref('planos')} className="text-muted-foreground hover:text-brand-primary transition-colors">Planos</a>
          <a href={sectionHref('faq')} className="text-muted-foreground hover:text-brand-primary transition-colors">Dúvidas</a>
          <Link href="/guias" className="text-muted-foreground hover:text-brand-primary transition-colors">Materiais</Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Entrar
          </button>
          <button
            onClick={() => router.push('/solicitar-acesso')}
            className="text-sm font-semibold text-white px-4 md:px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #135a36, #00843D)' }}
          >
            Solicitar acesso
          </button>
        </div>
      </div>
    </header>
  );
}
