import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanejamentoSilagem } from './types/planejamento-silagem';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// Typed lazy singleton — defers createClient until first use so SSR prerendering
// does not throw when env vars are absent from the build context.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver);
  },
});

// ── Types ─────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  perfil: 'Administrador' | 'Operador' | 'Visualizador';
  role?: 'Administrador' | 'Operador' | 'Visualizador' | null;
  fazenda_id: string | null;
  fazendas?: { nome: string } | null;
};

export type Fazenda = {
  id: string;
  nome: string;
  localizacao: string | null;
  area_total: number | null;
  latitude?: number | null;  // Adicionado para Weather Widget (via migration)
  longitude?: number | null; // Adicionado para Weather Widget (via migration)
};

export type Silo = {
  id: string;
  nome: string;
  tipo: 'Superfície' | 'Trincheira' | 'Bag' | 'Outros';
  fazenda_id: string;
  talhao_id: string | null;
  materia_seca_percent: number | null;
  insumo_lona_id: string | null;
  insumo_inoculante_id: string | null;
  cultura_ensilada: string | null;
  data_fechamento: string | null;
  data_abertura_prevista: string | null;
  data_abertura_real: string | null;
  volume_ensilado_ton_mv: number | null;
  comprimento_m: number | null;
  largura_m: number | null;
  altura_m: number | null;
  observacoes_gerais: string | null;
  custo_aquisicao_rs_ton: number | null;
};

export type MovimentacaoSilo = {
  id: string;
  silo_id: string;
  tipo: 'Entrada' | 'Saída';
  subtipo: 'Ensilagem' | 'Uso na alimentação' | 'Descarte' | 'Transferência' | 'Venda' | null;
  quantidade: number;
  data: string;
  talhao_id: string | null;
  responsavel: string | null;
  observacao: string | null;
};

export type Talhao = {
  id: string;
  nome: string;
  area_ha: number;
  tipo_solo: string;
  status: 'Em pousio' | 'Em preparo' | 'Plantado' | 'Colhido';
  fazenda_id: string;
  observacoes?: string | null;
};

export type CicloAgricola = {
  id: string;
  talhao_id: string;
  cultura: string;
  data_plantio: string;
  data_colheita_prevista: string | null;
  data_colheita_real: string | null;
  produtividade: number | null;
};

// ── Insumos: fonte única da verdade em types/insumos.ts ───────────────
// Re-exports para manter retrocompatibilidade com imports antigos
// (ex: `import { Insumo } from '@/lib/supabase'`).
export type {
  CategoriaInsumo,
  TipoInsumo,
  Insumo,
  MovimentacaoInsumo,
} from '@/types/insumos';

export type Maquina = {
  id: string;
  nome: string;
  tipo: 'Trator' | 'Ensiladeira' | 'Colheitadeira' | 'Pulverizador' | 'Plantadeira/Semeadora' | 'Implemento' | 'Caminhão' | 'Outros';
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  identificacao: string | null;
  fazenda_id: string;
  consumo_medio_lh: number | null;
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  vida_util_anos: number | null;
  // Campos adicionados na migration 20260423_frota_expansao (opcionais para compatibilidade)
  status?: 'Ativo' | 'Em manutenção' | 'Parado' | 'Vendido' | null;
  numero_serie?: string | null;
  placa?: string | null;
  potencia_cv?: number | null;
  horimetro_atual?: number | null;
  valor_residual?: number | null;
  vida_util_horas?: number | null;
  largura_trabalho_metros?: number | null;
  tratores_compativeis?: string[] | null;
};

export type UsoMaquina = {
  id: string;
  maquina_id: string;
  data: string;
  operador: string | null;
  atividade: string | null;
  horas: number | null;
  km: number | null;
  // Campos adicionados na migration 20260423_frota_expansao (opcionais para compatibilidade)
  horimetro_inicio?: number | null;
  horimetro_fim?: number | null;
  implemento_id?: string | null;
  talhao_id?: string | null;
  tipo_operacao?: string | null;
  area_ha?: number | null;
  origem?: 'manual' | 'operacao_agricola' | null;
};

export type PecaManutencao = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
};

export type Manutencao = {
  id: string;
  maquina_id: string;
  data: string;
  tipo: 'Preventiva' | 'Corretiva';
  descricao: string | null;
  custo: number | null;
  proxima_manutencao: string | null;
  // Campos adicionados na migration 20260423_frota_expansao (opcionais para compatibilidade)
  status?: 'aberta' | 'em andamento' | 'concluída' | null;
  data_prevista?: string | null;
  data_realizada?: string | null;
  horimetro?: number | null;
  proxima_manutencao_horimetro?: number | null;
  responsavel?: string | null;
  mao_de_obra_tipo?: 'própria' | 'terceirizada' | null;
  mao_de_obra_valor?: number | null;
  pecas?: PecaManutencao[] | null;
};

export type Abastecimento = {
  id: string;
  maquina_id: string;
  data: string;
  combustivel: string | null;
  litros: number | null;
  valor: number | null;
  hodometro: number | null;
  // Campos adicionados na migration 20260423_frota_expansao (opcionais para compatibilidade)
  preco_litro?: number | null;
  fornecedor?: string | null;
  horimetro?: number | null;
};

export type PlanoManutencao = {
  id: string;
  maquina_id: string;
  descricao: string;
  intervalo_horas: number | null;
  intervalo_dias: number | null;
  horimetro_base: number | null;
  data_base: string | null;
  ativo: boolean;
  fazenda_id: string;
  created_at: string;
};

export type Financeiro = {
  id: string;
  tipo: 'Receita' | 'Despesa';
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  forma_pagamento: string | null;
  referencia_id: string | null;
  referencia_tipo: 'Silo' | 'Talhão' | 'Máquina' | null;
  fazenda_id: string;
};

export type AtividadeCampo = {
  id: string;
  fazenda_id: string;
  ciclo_id: string | null;
  talhao_id: string;
  tipo_operacao: string;
  data: string;
  maquina_id?: string | null;
  horas_maquina?: number | null;
  observacoes?: string | null;
  custo_total: number | null;
  custo_manual?: number | null;
  tipo_operacao_solo?: string | null;
  insumo_id?: string | null;
  dose_ton_ha?: number | null;
  semente_id?: string | null;
  populacao_plantas_ha?: number | null;
  sacos_ha?: number | null;
  espacamento_entre_linhas_cm?: number | null;
  categoria_pulverizacao?: string | null;
  dose_valor?: number | null;
  dose_unidade?: string | null;
  volume_calda_l_ha?: number | null;
  produtividade_ton_ha?: number | null;
  maquina_colheita_id?: string | null;
  horas_colheita?: number | null;
  maquina_transporte_id?: string | null;
  horas_transporte?: number | null;
  maquina_compactacao_id?: string | null;
  horas_compactacao?: number | null;
  valor_terceirizacao_r?: number | null;
  permite_rebrota?: boolean;
  custo_amostra_r?: number | null;
  metodo_entrada?: string | null;
  url_pdf_analise?: string | null;
  ph_cacl2?: number | null;
  mo_g_dm3?: number | null;
  p_mg_dm3?: number | null;
  k_mmolc_dm3?: number | null;
  ca_mmolc_dm3?: number | null;
  mg_mmolc_dm3?: number | null;
  al_mmolc_dm3?: number | null;
  h_al_mmolc_dm3?: number | null;
  s_mg_dm3?: number | null;
  b_mg_dm3?: number | null;
  cu_mg_dm3?: number | null;
  fe_mg_dm3?: number | null;
  mn_mg_dm3?: number | null;
  zn_mg_dm3?: number | null;
  lamina_mm?: number | null;
  horas_irrigacao?: number | null;
  custo_por_hora_r?: number | null;
  created_at: string;
  updated_at?: string;
};

export type CategoriaRebanho = {
  id: string;
  fazenda_id: string;
  nome: string;
  quantidade_cabecas: number;
  consumo_ms_kg_cab_dia: number;
  created_at: string;
};

export type PeriodoConfinamento = {
  id: string;
  fazenda_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
};

export type AvaliacaoBromatologica = {
  id: string;
  silo_id: string;
  data: string;
  momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
  ms: number | null;
  pb: number | null;
  fdn: number | null;
  fda: number | null;
  amido: number | null;
  ndt: number | null;
  ph: number | null;
  avaliador: string | null;
  created_at: string;
};

export type AvaliacaoPSPS = {
  id: string;
  silo_id: string;
  data: string;
  momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
  peneira_19mm: number;
  peneira_8_19mm: number;
  peneira_4_8mm: number;
  peneira_fundo_4mm: number;
  tmp_mm: number | null;
  tamanho_teorico_corte_mm: number | null;
  kernel_processor: boolean;
  avaliador: string | null;
  created_at: string;
};

// Re-export de planejamento-silagem
export type { PlanejamentoSilagem };
