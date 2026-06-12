import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import {
  listGuias,
  CATEGORIAS_GUIA,
  type CategoriaGuia,
} from '@/lib/guias/data';
import GuiasNavbar from './GuiasNavbar';
import GuiaCard from './GuiaCard';

export const metadata: Metadata = {
  title: 'Guias e Materiais | GestSilo',
  description:
    'Biblioteca de guias técnicos e materiais de apoio para o produtor rural: silagem, solo, rebanho, pastagens, financeiro e mais.',
  alternates: { canonical: '/guias' },
  openGraph: {
    title: 'Guias e Materiais | GestSilo',
    description:
      'Conteúdo técnico para o dia a dia da fazenda — silagem, solo, rebanho, pastagens e financeiro.',
    type: 'website',
  },
};

function isCategoria(value: string | undefined): value is CategoriaGuia {
  return (
    value !== undefined && CATEGORIAS_GUIA.includes(value as CategoriaGuia)
  );
}

export default async function GuiasPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const categoriaAtiva = isCategoria(categoria) ? categoria : undefined;

  const todos = listGuias();
  const guias = categoriaAtiva
    ? todos.filter((g) => g.categoria === categoriaAtiva)
    : todos;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GuiasNavbar />

      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Banner CTA */}
          <Link
            href="/solicitar-acesso"
            className="group flex items-center justify-between gap-4 mb-10 rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-200 hover:border-brand-primary/40 hover:bg-white/[0.07]"
          >
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">
                Gerencie sua fazenda com dados reais
              </span>{' '}
              — e pare de decidir no improviso.
            </p>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-primary whitespace-nowrap">
              Criar conta grátis
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Guias e Materiais
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conteúdo técnico para o dia a dia da fazenda
            </p>
          </header>

          {/* Filtro por categoria */}
          <nav
            aria-label="Filtrar por categoria"
            className="flex flex-wrap gap-2 mb-8"
          >
            <FiltroLink label="Todos" href="/guias" ativo={!categoriaAtiva} />
            {CATEGORIAS_GUIA.map((cat) => (
              <FiltroLink
                key={cat}
                label={cat}
                href={`/guias?categoria=${encodeURIComponent(cat)}`}
                ativo={categoriaAtiva === cat}
              />
            ))}
          </nav>

          {/* Grid ou estado vazio */}
          {guias.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 border border-white/10 bg-white/5 rounded-xl">
              <BookOpen
                size={36}
                className="text-muted-foreground mb-4"
                aria-hidden="true"
              />
              <p className="text-base font-bold text-foreground">
                Nenhum guia por aqui ainda
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {categoriaAtiva
                  ? 'Ainda não publicamos materiais nesta categoria. Em breve teremos novidades.'
                  : 'Estamos preparando os primeiros materiais. Volte em breve.'}
              </p>
              {categoriaAtiva && (
                <Link
                  href="/guias"
                  className="mt-6 text-sm font-semibold text-brand-primary hover:opacity-80 transition-opacity"
                >
                  Ver todos os guias
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {guias.map((guia) => (
                <GuiaCard key={guia.slug} guia={guia} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FiltroLink({
  label,
  href,
  ativo,
}: {
  label: string;
  href: string;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? 'true' : undefined}
      className="text-sm font-semibold px-4 py-2 rounded-full border transition-all duration-150"
      style={
        ativo
          ? {
              background: 'rgba(0,196,90,0.1)',
              color: '#00c45a',
              borderColor: 'rgba(0,196,90,0.4)',
            }
          : {
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--muted-foreground)',
              borderColor: 'rgba(255,255,255,0.1)',
            }
      }
    >
      {label}
    </Link>
  );
}
