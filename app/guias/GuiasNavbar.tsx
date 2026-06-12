import Image from 'next/image';
import Link from 'next/link';

export default function GuiasNavbar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border shadow-sm"
      style={{ background: 'rgba(28,28,28,0.92)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Ir para a página inicial"
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
        </Link>

        <nav className="hidden sm:flex items-center gap-8 text-sm font-semibold">
          <Link
            href="/"
            className="text-muted-foreground hover:text-brand-primary transition-colors"
          >
            Início
          </Link>
          <Link
            href="/guias"
            className="text-brand-primary transition-colors"
          >
            Guias
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Entrar
          </Link>
          <Link
            href="/solicitar-acesso"
            className="text-sm font-semibold text-white px-4 md:px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #135a36, #00843D)' }}
          >
            Solicitar acesso
          </Link>
        </div>
      </div>
    </header>
  );
}
