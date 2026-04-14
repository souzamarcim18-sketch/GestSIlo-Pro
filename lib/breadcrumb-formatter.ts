/**
 * Formata labels de breadcrumb a partir de slugs
 *
 * Transforma:
 *   "silos" → "Silos"
 *   "talhoes" → "Talhões"
 *   "frota" → "Frota"
 *   "maquina-details" → "Detalhes da Máquina"
 *   "manutenção" → "Manutenção"
 */

// Mapeamento de slugs conhecidos → labels amigáveis
const SLUG_MAP: Record<string, string> = {
  'silos': 'Silos',
  'talhoes': 'Talhões',
  'frota': 'Frota',
  'financeiro': 'Financeiro',
  'rebanho': 'Rebanho',
  'insumos': 'Insumos',
  'calculadoras': 'Calculadoras',
  'relatorios': 'Relatórios',
  'configuracoes': 'Configurações',
  'onboarding': 'Onboarding',
  'movimentacoes': 'Movimentações',
  'estoque': 'Estoque',
  'qualidade': 'Qualidade',
  'manutencoes': 'Manutenções',
  'manutenção': 'Manutenção',
  'historico': 'Histórico',
  'perfil': 'Perfil',
  'fazenda': 'Fazenda',
  'usuarios': 'Usuários',
};

export function formatBreadcrumbLabel(slug: string): string {
  // Se existe mapeamento, usar
  if (SLUG_MAP[slug.toLowerCase()]) {
    return SLUG_MAP[slug.toLowerCase()];
  }

  // Caso contrário, converter kebab-case e camelCase para Title Case
  return slug
    .replace(/[-_]/g, ' ')           // Trocar - e _ por espaço
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Separar camelCase
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Alias mais legível
 */
export const labelizer = formatBreadcrumbLabel;
