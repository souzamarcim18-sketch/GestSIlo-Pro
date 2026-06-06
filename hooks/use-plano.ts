'use client';

import { useAuth } from '@/hooks/useAuth';
import {
  parsePlanoSlug,
  planoPermiteModulo,
  planoPermiteMaisRegistros,
  planoMinimoParaModulo,
  type PlanoSlug,
} from '@/lib/planos';

export interface UsePlanoReturn {
  plano: PlanoSlug;
  nomePlano: string;
  permiteModulo: (modulo: string) => boolean;
  permiteNovoRegistro: (tipo: 'silos' | 'planejamentos', atual: number) => boolean;
  precisaUpgrade: (modulo: string) => boolean;
  planoMinimoParaModulo: (modulo: string) => PlanoSlug | null;
}

export function usePlano(): UsePlanoReturn {
  const { planoAtual } = useAuth();
  const plano = parsePlanoSlug(planoAtual);

  return {
    plano,
    nomePlano: plano.charAt(0).toUpperCase() + plano.slice(1),
    permiteModulo: (modulo: string) => planoPermiteModulo(plano, modulo),
    permiteNovoRegistro: (tipo: 'silos' | 'planejamentos', atual: number) =>
      planoPermiteMaisRegistros(plano, tipo, atual),
    precisaUpgrade: (modulo: string) => !planoPermiteModulo(plano, modulo),
    planoMinimoParaModulo,
  };
}
