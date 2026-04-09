import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
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

export type Profile = {
  id: string;
  nome: string;
  email: string;
  perfil: 'Administrador' | 'Operador' | 'Visualizador';
  fazenda_id: string | null;
};

export type Fazenda = {
  id: string;
  nome: string;
  localizacao: string | null;
  area_total: number | null;
};

export type Silo = {
  id: string;
  nome: string;
  tipo: 'Bolsa' | 'Bunker' | 'Convencional';
  capacidade: number;
  localizacao: string | null;
  fazenda_id: string;
  materia_seca_percent: number | null;
  consumo_medio_diario_ton: number | null;
  insumo_lona_id: string | null;
  insumo_inoculante_id: string | null;
};

export type MovimentacaoSilo = {
  id: string;
  silo_id: string;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  data: string;
  talhao_id: string | null;
  responsavel: string | null;
  observacao: string | null;
};

export type Talhao = {
  id: string;
  nome: string;
  area: number;
  tipo_solo: string | null;
  localizacao: string | null;
  status: 'Plantado' | 'Em preparo' | 'Colhido' | 'Em pousio';
  fazenda_id: string;
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

export type Insumo = {
  id: string;
  nome: string;
  tipo: 'Fertilizante' | 'Defensivo' | 'Semente' | 'Combustível' | 'Outros';
  unidade: string;
  estoque_minimo: number;
  estoque_atual: number;
  fazenda_id: string;
  teor_n_percent?: number;
  teor_p_percent?: number;
  teor_k_percent?: number;
};

export type MovimentacaoInsumo = {
  id: string;
  insumo_id: string;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  data: string;
  destino: string | null;
  responsavel: string | null;
  valor_unitario: number | null;
};

export type Maquina = {
  id: string;
  nome: string;
  tipo: 'Trator' | 'Colheitadeira' | 'Pulverizador' | 'Caminhão' | 'Outros';
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  identificacao: string | null;
  fazenda_id: string;
  consumo_medio_lh: number | null;
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  vida_util_anos: number | null;
};

export type UsoMaquina = {
  id: string;
  maquina_id: string;
  data: string;
  operador: string | null;
  atividade: string | null;
  horas: number | null;
  km: number | null;
};

export type Manutencao = {
  id: string;
  maquina_id: string;
  data: string;
  tipo: 'Preventiva' | 'Corretiva';
  descricao: string | null;
  custo: number | null;
  proxima_manutencao: string | null;
};

export type Abastecimento = {
  id: string;
  maquina_id: string;
  data: string;
  combustivel: string | null;
  litros: number | null;
  valor: number | null;
  hodometro: number | null;
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
  talhao_id: string;
  ciclo_id: string | null;
  tipo_atividade: 'Preparo de Solo' | 'Calagem' | 'Gessagem' | 'Plantio' | 'Pulverização' | 'Colheita' | 'Análise de Solo' | 'Irrigação';
  data_atividade: string;
  custo_total: number | null;
  observacoes: string | null;
  dados_json: any;
  created_at: string;
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
