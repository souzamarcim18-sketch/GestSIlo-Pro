import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { ArrowRight, ChevronRight, Clock } from 'lucide-react';
import { GUIAS, getGuiaBySlug } from '@/lib/guias/data';
import GuiasNavbar from '../GuiasNavbar';
import './guia-prose.css';

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guia = getGuiaBySlug(slug);

  if (!guia) {
    return { title: 'Guia não encontrado | GestSilo' };
  }

  return {
    title: `${guia.titulo} | GestSilo`,
    description: guia.descricao,
    alternates: { canonical: `/guias/${guia.slug}` },
    openGraph: {
      title: guia.titulo,
      description: guia.descricao,
      type: 'article',
      publishedTime: guia.publicadoEm,
    },
  };
}

function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function GuiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guia = getGuiaBySlug(slug);

  if (!guia) {
    notFound();
  }

  const html = await marked.parse(guia.conteudo);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GuiasNavbar />

      <main className="flex-1 pt-28 pb-20 px-6">
        <article className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav
            aria-label="Trilha de navegação"
            className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground mb-6"
          >
            <Link href="/" className="hover:text-brand-primary transition-colors">
              Início
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link
              href="/guias"
              className="hover:text-brand-primary transition-colors"
            >
              Guias
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-foreground truncate max-w-[60vw]">
              {guia.titulo}
            </span>
          </nav>

          {/* Cabeçalho do guia */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(0,196,90,0.1)', color: '#00c45a' }}
              >
                {guia.categoria}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={13} aria-hidden="true" />
                {guia.tempoLeitura} min de leitura
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
              {guia.titulo}
            </h1>
            <time
              dateTime={guia.publicadoEm}
              className="block text-sm text-muted-foreground mt-3"
            >
              Publicado em {formatarData(guia.publicadoEm)}
            </time>
          </header>

          {/* Conteúdo */}
          <div
            className="guia-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* CTA final */}
          <Link
            href="/solicitar-acesso"
            className="group flex items-center justify-between gap-4 mt-12 rounded-xl border border-brand-primary/30 p-6 transition-all duration-200 hover:border-brand-primary/60"
            style={{ background: 'rgba(0,196,90,0.08)' }}
          >
            <div>
              <p className="text-base font-bold text-foreground">
                Este conteúdo está integrado ao GestSilo.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Registre seus silos, acompanhe a qualidade e decida com dados
                reais.
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-primary whitespace-nowrap">
              Começar grátis
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        </article>
      </main>
    </div>
  );
}
