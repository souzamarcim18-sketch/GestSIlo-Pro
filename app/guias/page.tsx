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

          {/* Banner CTA */}
          <div className="mt-16 rounded-2xl overflow-hidden relative border border-white/10">
            {/* Fundo com gradiente */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,196,90,0.12) 0%, rgba(0,132,61,0.06) 50%, rgba(255,255,255,0.02) 100%)',
              }}
              aria-hidden="true"
            />
            {/* Orbe decorativo */}
            <div
              className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
              style={{ background: '#00c45a' }}
              aria-hidden="true"
            />
            <div className="relative px-8 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
              <div className="flex-1">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: '#00c45a' }}
                >
                  GestSilo — Gestão Agrícola
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-foreground leading-snug">
                  Gerencie sua fazenda com dados reais
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Pare de decidir no improviso. Controle silos, rebanho,
                  pastagens e finanças em um único lugar — feito para o
                  produtor rural brasileiro.
                </p>
              </div>
              <Link
                href="/solicitar-acesso"
                className="group shrink-0 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #00c45a, #00843d)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(0,196,90,0.25)',
                }}
              >
                Criar conta grátis
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
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
