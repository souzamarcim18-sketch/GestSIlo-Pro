'use client';

import type { OcupacaoPiqueteComLote } from '@/lib/types/pastagens';

interface HistoricoOcupacoesProps {
  ocupacoes: OcupacaoPiqueteComLote[];
}

function diasNoPiquete(entrada: string, saida: string | null): string {
  if (!saida) return '—';
  const diff = Math.floor(
    (new Date(saida).getTime() - new Date(entrada).getTime()) / (1000 * 60 * 60 * 24)
  );
  return `${diff} dia${diff !== 1 ? 's' : ''}`;
}

export function HistoricoOcupacoes({ ocupacoes }: HistoricoOcupacoesProps) {
  if (ocupacoes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhum histórico de ocupações registrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Lote</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Entrada</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Saída</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Dias</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">UA/ha</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Método</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Dossel ent.</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-2">Dossel saída</th>
          </tr>
        </thead>
        <tbody>
          {ocupacoes.slice(0, 50).map((o) => (
            <tr key={o.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
              <td className="py-2 pr-4 text-sm text-foreground font-medium">
                {o.lotes?.nome ?? '—'}
              </td>
              <td className="py-2 pr-4 text-sm text-foreground">
                {new Date(o.data_entrada).toLocaleDateString('pt-BR')}
              </td>
              <td className="py-2 pr-4 text-sm text-foreground">
                {o.data_saida_real
                  ? new Date(o.data_saida_real).toLocaleDateString('pt-BR')
                  : <span className="text-[#00c45a] text-xs font-medium">Em pastejo</span>}
              </td>
              <td className="py-2 pr-4 text-sm text-muted-foreground">
                {diasNoPiquete(o.data_entrada, o.data_saida_real)}
              </td>
              <td className="py-2 pr-4 text-sm text-foreground">
                {o.ua_real !== null ? o.ua_real.toFixed(2) : '—'}
              </td>
              <td className="py-2 pr-4">
                {o.metodo_calculo_ua ? (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      o.metodo_calculo_ua === 'peso_real'
                        ? 'text-green-400 bg-green-500/10'
                        : 'text-yellow-400 bg-yellow-500/10'
                    }`}
                  >
                    {o.metodo_calculo_ua === 'peso_real' ? 'Peso real' : 'Estimativa'}
                  </span>
                ) : '—'}
              </td>
              <td className="py-2 pr-4 text-sm text-muted-foreground">
                {o.altura_dossel_entrada_cm !== null ? `${o.altura_dossel_entrada_cm} cm` : '—'}
              </td>
              <td className="py-2 text-sm text-muted-foreground">
                {o.altura_dossel_saida_cm !== null ? `${o.altura_dossel_saida_cm} cm` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
