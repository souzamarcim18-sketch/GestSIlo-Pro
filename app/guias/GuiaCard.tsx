import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { Guia } from '@/lib/guias/data';

const CATEGORIA_BADGE_STYLE = {
  background: 'rgba(0,196,90,0.1)',
  color: '#00c45a',
} as const;

function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function GuiaCard({ guia }: { guia: Guia }) {
  return (
    <Link
      href={`/guias/${guia.slug}`}
      className="group flex flex-col h-full border border-white/10 bg-white/5 rounded-xl p-5 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={CATEGORIA_BADGE_STYLE}
        >
          {guia.categoria}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <Clock size={13} aria-hidden="true" />
          {guia.tempoLeitura} min
        </span>
      </div>

      <h2 className="text-base font-bold text-foreground leading-snug mb-2 group-hover:text-brand-primary transition-colors">
        {guia.titulo}
      </h2>

      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        {guia.descricao}
      </p>

      <time
        dateTime={guia.publicadoEm}
        className="text-xs text-muted-foreground mt-4 pt-3 border-t border-white/10"
      >
        {formatarData(guia.publicadoEm)}
      </time>
    </Link>
  );
}
