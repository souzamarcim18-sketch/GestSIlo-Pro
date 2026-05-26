import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/utils';
import {
  CAMPOS_REBANHO,
  CAMPOS_REBANHO_IDS,
  CAMPOS_REBANHO_MAP,
  type AnimalCompleto,
  type CampoRebanho,
} from '@/lib/types/relatorios-rebanho';

export interface FiltrosRebanho {
  lote_id?: string;
  categoria?: string;
  status?: string;
  sexo?: string;
}

export interface ValidacaoCampos {
  valid: boolean;
  validIds: string[];
  invalidIds: string[];
}

/**
 * Valida que todos os ids estão presentes em CAMPOS_REBANHO.
 * Em dev: console.warn para ids inválidos.
 */
export function validarCamposSelecionados(ids: string[]): ValidacaoCampos {
  const validIds: string[] = [];
  const invalidIds: string[] = [];

  for (const id of ids) {
    if (CAMPOS_REBANHO_IDS.has(id)) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  }

  if (invalidIds.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('[rebanho-builder] Campos inválidos ignorados:', invalidIds);
  }

  return { valid: invalidIds.length === 0, validIds, invalidIds };
}

/**
 * Monta o select seguro para a view vw_animais_completos.
 * Whitelist rígida — nunca aceita string arbitrária.
 * Sempre inclui: id, fazenda_id (base mínima para RLS e joins).
 */
export function buildRebanhoSelect(campos: CampoRebanho[]): string {
  const base = new Set<string>(['id', 'fazenda_id']);

  for (const campo of campos) {
    if (campo.fonte.tipo === 'coluna') {
      base.add(campo.fonte.coluna);
    }
  }

  return [...base].join(', ');
}

/**
 * Formata um valor do animal conforme o tipo do campo.
 */
function formatarCampoValor(animal: AnimalCompleto, campo: CampoRebanho): unknown {
  if (campo.fonte.tipo === 'computed_display') {
    return campo.fonte.fn(animal);
  }

  const rawValue = animal[campo.fonte.coluna];

  if (rawValue === null || rawValue === undefined) return '';

  switch (campo.tipo) {
    case 'date': {
      const d = typeof rawValue === 'string' ? new Date(rawValue) : new Date(rawValue as unknown as string);
      return isNaN(d.getTime()) ? String(rawValue) : format(d, 'dd/MM/yyyy', { locale: ptBR });
    }
    case 'currency':
      return formatBRL(typeof rawValue === 'number' ? rawValue : Number(rawValue));
    case 'number':
      return rawValue;
    default:
      return rawValue;
  }
}

/**
 * Projeta apenas os campos selecionados nas linhas retornadas.
 * Mantém a ordem dos campos conforme o array de entrada.
 * Garante que `brinco` sempre está presente (mesmo que não selecionado).
 */
export function buildRebanhoRows(
  animais: AnimalCompleto[],
  campos: CampoRebanho[]
): Record<string, unknown>[] {
  // Garante brinco sempre presente
  const brincoField = CAMPOS_REBANHO_MAP.get('brinco')!;
  const camposComBrinco =
    campos.some((c) => c.id === 'brinco')
      ? campos
      : [brincoField, ...campos];

  return animais.map((animal) => {
    const row: Record<string, unknown> = {};
    for (const campo of camposComBrinco) {
      row[campo.id] = formatarCampoValor(animal, campo);
    }
    return row;
  });
}

/**
 * Retorna os campos CampoRebanho correspondentes a uma lista de ids validados.
 * Mantém a ordem dos ids.
 */
export function getCamposPorIds(validIds: string[]): CampoRebanho[] {
  return validIds
    .map((id) => CAMPOS_REBANHO_MAP.get(id))
    .filter((c): c is CampoRebanho => c !== undefined);
}

/**
 * Retorna todos os campos agrupados por categoria, na ordem do catálogo.
 */
export function getCamposPorCategoria(): Map<string, CampoRebanho[]> {
  const map = new Map<string, CampoRebanho[]>();
  for (const campo of CAMPOS_REBANHO) {
    const lista = map.get(campo.categoria) ?? [];
    lista.push(campo);
    map.set(campo.categoria, lista);
  }
  return map;
}
