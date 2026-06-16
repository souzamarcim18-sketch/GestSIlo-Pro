export const PLANOS = {
  free: {
    nome: 'Free',
    silos: 2,
    planejamentos: 1,
    modulos: ['silos'] as const,
  },
  starter: {
    nome: 'Starter',
    silos: Infinity,
    planejamentos: Infinity,
    modulos: [
      'silos',
      'rebanho',
      'balanco_forrageiro',
      'pastagens',
      'insumos',
      'calculadoras',
    ] as const,
  },
  pro: {
    nome: 'Pro',
    silos: Infinity,
    planejamentos: Infinity,
    modulos: [
      'silos',
      'rebanho',
      'balanco_forrageiro',
      'pastagens',
      'insumos',
      'calculadoras',
      'talhoes',
      'frota',
      'financeiro',
      'produtos',
      'planejamento_compras',
      'mao_de_obra',
    ] as const,
  },
  max: {
    nome: 'Max',
    silos: Infinity,
    planejamentos: Infinity,
    modulos: 'todos' as const,
  },
} as const;

export type PlanoSlug = keyof typeof PLANOS;

type ModulosDoPlano<T extends PlanoSlug> =
  (typeof PLANOS)[T]['modulos'] extends 'todos'
    ? true
    : (typeof PLANOS)[T]['modulos'] extends readonly string[]
    ? (typeof PLANOS)[T]['modulos'][number]
    : never;

const PLANO_ORDER: PlanoSlug[] = ['free', 'starter', 'pro', 'max'];

/** Retorna o slug do plano a partir de uma string do banco (case-insensitive, fallback free). */
export function parsePlanoSlug(raw: string | null | undefined): PlanoSlug {
  const normalized = (raw ?? '').toLowerCase().trim();
  if (normalized in PLANOS) return normalized as PlanoSlug;
  return 'free';
}

/** Verifica se o plano permite acesso a um módulo. */
export function planoPermiteModulo(plano: PlanoSlug, modulo: string): boolean {
  const config = PLANOS[plano];
  if (config.modulos === 'todos') return true;
  return (config.modulos as readonly string[]).includes(modulo);
}

/** Verifica se o plano permite criar mais registros do tipo especificado. */
export function planoPermiteMaisRegistros(
  plano: PlanoSlug,
  tipo: 'silos' | 'planejamentos',
  atual: number
): boolean {
  const limite = PLANOS[plano][tipo] as number;
  return atual < limite;
}

/** Retorna o plano mínimo que libera um módulo. */
export function planoMinimoParaModulo(modulo: string): PlanoSlug | null {
  for (const slug of PLANO_ORDER) {
    if (planoPermiteModulo(slug, modulo)) return slug;
  }
  return null;
}

export type { ModulosDoPlano };
