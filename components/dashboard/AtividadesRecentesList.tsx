'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type EventoCalendario, MODULO_CONFIG, MODULO_ICONE } from '@/lib/types/calendario';

interface Props {
  eventos: EventoCalendario[];
}

export function AtividadesRecentesList({ eventos }: Props) {
  if (eventos.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade registrada recentemente.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Suas últimas movimentações aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {eventos.map((evento) => (
        <AtividadeRecenteItem key={evento.id} evento={evento} />
      ))}
    </ul>
  );
}

function AtividadeRecenteItem({ evento }: { evento: EventoCalendario }) {
  const { colorClass, bgClass } = MODULO_CONFIG[evento.modulo];
  const Icone = MODULO_ICONE[evento.modulo];
  // noon para evitar off-by-one de timezone ao converter date string
  const dataObj = new Date(`${evento.data}T12:00:00`);
  const tempoRelativo = formatDistanceToNow(dataObj, { addSuffix: true, locale: ptBR });

  const conteudo = (
    <div className="flex items-start gap-3 py-2">
      <span className={`mt-0.5 p-1.5 rounded-full ${bgClass} shrink-0`}>
        <Icone className={`w-3.5 h-3.5 ${colorClass}`} aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{evento.titulo}</p>
        {evento.subtitulo && (
          <p className="text-xs text-muted-foreground truncate">{evento.subtitulo}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{tempoRelativo}</span>
    </div>
  );

  if (evento.href) {
    return (
      <li>
        <Link href={evento.href} className="block hover:bg-muted/50 rounded-lg px-1 -mx-1 transition-colors">
          {conteudo}
        </Link>
      </li>
    );
  }

  return <li>{conteudo}</li>;
}
