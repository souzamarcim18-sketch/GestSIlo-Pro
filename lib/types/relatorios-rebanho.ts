export type CategoriaRebanho =
  | 'identificacao'
  | 'reproducao'
  | 'leiteira'
  | 'sanidade'
  | 'pesagem'
  | 'corte'
  | 'datas';

export type TipoCampo = 'string' | 'number' | 'date' | 'currency';

export type FonteCampo =
  | { tipo: 'coluna'; tabela: 'vw_animais_completos'; coluna: keyof AnimalCompleto }
  | { tipo: 'computed_display'; fn: (animal: AnimalCompleto) => string };

export interface CampoRebanho {
  id: string;
  label: string;
  categoria: CategoriaRebanho;
  tipo: TipoCampo;
  fonte: FonteCampo;
}

export interface AnimalCompleto {
  id: string;
  brinco: string;
  nome: string | null;
  sexo: string;
  raca: string | null;
  categoria: string | null;
  status: string;
  data_nascimento: string | null;
  fazenda_id: string;
  lote_nome: string | null;
  ultimo_peso_kg: number | null;
  data_ultimo_peso: string | null;
  gmd_90d: number | null;
  producao_media_30d: number | null;
  dias_lactacao: number | null;
  total_lactacao: number | null;
  ultima_cobertura: string | null;
  data_parto_previsto: string | null;
  iep_dias: number | null;
  qtd_partos: number | null;
  status_reprodutivo: string | null;
  ultima_vacinacao: string | null;
  proxima_vacinacao: string | null;
  ultima_vermifugacao: string | null;
  arroba_estimada: number | null;
  projecao_abate: string | null;
}

export const CAMPOS_REBANHO: CampoRebanho[] = [
  // ── Identificação ─────────────────────────────────────────────────────────
  {
    id: 'brinco',
    label: 'Brinco',
    categoria: 'identificacao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'brinco' },
  },
  {
    id: 'nome',
    label: 'Nome',
    categoria: 'identificacao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'nome' },
  },
  {
    id: 'sexo',
    label: 'Sexo',
    categoria: 'identificacao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'sexo' },
  },
  {
    id: 'raca',
    label: 'Raça',
    categoria: 'identificacao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'raca' },
  },
  {
    id: 'categoria',
    label: 'Categoria',
    categoria: 'identificacao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'categoria' },
  },
  {
    id: 'status',
    label: 'Status',
    categoria: 'identificacao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'status' },
  },
  {
    id: 'lote_nome',
    label: 'Lote',
    categoria: 'identificacao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'lote_nome' },
  },

  // ── Pesagem ───────────────────────────────────────────────────────────────
  {
    id: 'ultimo_peso_kg',
    label: 'Último Peso (kg)',
    categoria: 'pesagem',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'ultimo_peso_kg' },
  },
  {
    id: 'data_ultimo_peso',
    label: 'Data Última Pesagem',
    categoria: 'pesagem',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'data_ultimo_peso' },
  },
  {
    id: 'gmd_90d',
    label: 'GMD 90d (kg/dia)',
    categoria: 'pesagem',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'gmd_90d' },
  },

  // ── Reprodução ────────────────────────────────────────────────────────────
  {
    id: 'ultima_cobertura',
    label: 'Última Cobertura',
    categoria: 'reproducao',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'ultima_cobertura' },
  },
  {
    id: 'data_parto_previsto',
    label: 'Data Parto Previsto',
    categoria: 'reproducao',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'data_parto_previsto' },
  },
  {
    id: 'iep_dias',
    label: 'IEP (dias)',
    categoria: 'reproducao',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'iep_dias' },
  },
  {
    id: 'qtd_partos',
    label: 'Qtd. Partos',
    categoria: 'reproducao',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'qtd_partos' },
  },
  {
    id: 'status_reprodutivo',
    label: 'Status Reprodutivo',
    categoria: 'reproducao',
    tipo: 'string',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'status_reprodutivo' },
  },

  // ── Leiteira ──────────────────────────────────────────────────────────────
  {
    id: 'producao_media_30d',
    label: 'Produção Média 30d (L)',
    categoria: 'leiteira',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'producao_media_30d' },
  },
  {
    id: 'dias_lactacao',
    label: 'Dias em Lactação',
    categoria: 'leiteira',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'dias_lactacao' },
  },
  {
    id: 'total_lactacao',
    label: 'Total Lactação Atual (L)',
    categoria: 'leiteira',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'total_lactacao' },
  },

  // ── Sanidade ──────────────────────────────────────────────────────────────
  {
    id: 'ultima_vacinacao',
    label: 'Última Vacinação',
    categoria: 'sanidade',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'ultima_vacinacao' },
  },
  {
    id: 'proxima_vacinacao',
    label: 'Próxima Vacinação',
    categoria: 'sanidade',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'proxima_vacinacao' },
  },
  {
    id: 'ultima_vermifugacao',
    label: 'Última Vermifugação',
    categoria: 'sanidade',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'ultima_vermifugacao' },
  },

  // ── Corte ─────────────────────────────────────────────────────────────────
  {
    id: 'arroba_estimada',
    label: 'Arroba Estimada (@)',
    categoria: 'corte',
    tipo: 'number',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'arroba_estimada' },
  },
  {
    id: 'projecao_abate',
    label: 'Projeção de Abate',
    categoria: 'corte',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'projecao_abate' },
  },

  // ── Datas ─────────────────────────────────────────────────────────────────
  {
    id: 'data_nascimento',
    label: 'Nascimento',
    categoria: 'datas',
    tipo: 'date',
    fonte: { tipo: 'coluna', tabela: 'vw_animais_completos', coluna: 'data_nascimento' },
  },
];

// Set de ids válidos para lookups O(1)
export const CAMPOS_REBANHO_IDS: ReadonlySet<string> = new Set(
  CAMPOS_REBANHO.map((c) => c.id)
);

// Mapa id → campo para lookups O(1)
export const CAMPOS_REBANHO_MAP: ReadonlyMap<string, CampoRebanho> = new Map(
  CAMPOS_REBANHO.map((c) => [c.id, c])
);

// Categorias únicas para agrupamento na UI
export const CATEGORIAS_REBANHO_LABELS: Record<CategoriaRebanho, string> = {
  identificacao: 'Identificação',
  pesagem: 'Pesagem',
  reproducao: 'Reprodução',
  leiteira: 'Leiteira',
  sanidade: 'Sanidade',
  corte: 'Corte',
  datas: 'Datas',
};
