-- SQL Schema for GestSilo-Pro

-- Fazendas
CREATE TABLE fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  localizacao TEXT,
  area_total NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('Administrador', 'Operador', 'Visualizador')),
  fazenda_id UUID REFERENCES fazendas(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Silos
CREATE TABLE silos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Bolsa', 'Bunker', 'Convencional')),
  capacidade NUMERIC NOT NULL, -- em toneladas
  localizacao TEXT,
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movimentações de Silo
CREATE TABLE movimentacoes_silo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID REFERENCES silos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
  quantidade NUMERIC NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  talhao_id UUID, -- Referência a talhão (opcional na saída)
  responsavel TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Talhões
CREATE TABLE talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  area NUMERIC NOT NULL, -- em hectares
  tipo_solo TEXT,
  localizacao TEXT,
  status TEXT DEFAULT 'Em pousio' CHECK (status IN ('Plantado', 'Em preparo', 'Colhido', 'Em pousio')),
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ciclos Agrícolas
CREATE TABLE ciclos_agricolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talhao_id UUID REFERENCES talhoes(id) ON DELETE CASCADE,
  cultura TEXT NOT NULL,
  data_plantio DATE NOT NULL,
  data_colheita_prevista DATE,
  data_colheita_real DATE,
  produtividade NUMERIC, -- ton/ha
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insumos
CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Fertilizante', 'Defensivo', 'Semente', 'Combustível', 'Outros')),
  unidade TEXT NOT NULL,
  estoque_minimo NUMERIC DEFAULT 0,
  estoque_atual NUMERIC DEFAULT 0,
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movimentações de Insumo
CREATE TABLE movimentacoes_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID REFERENCES insumos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
  quantidade NUMERIC NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  destino TEXT, -- talhão ou equipamento
  responsavel TEXT,
  valor_unitario NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Máquinas
CREATE TABLE maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Trator', 'Colheitadeira', 'Pulverizador', 'Caminhão', 'Outros')),
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  identificacao TEXT, -- placa ou patrimônio
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uso de Máquinas
CREATE TABLE uso_maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  operador TEXT,
  atividade TEXT,
  horas NUMERIC,
  km NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manutenções
CREATE TABLE manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Preventiva', 'Corretiva')),
  descricao TEXT,
  custo NUMERIC,
  proxima_manutencao DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abastecimentos
CREATE TABLE abastecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  combustivel TEXT,
  litros NUMERIC,
  valor NUMERIC,
  hodometro NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financeiro
CREATE TABLE financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT,
  referencia_id UUID, -- ID do silo, talhão ou máquina
  referencia_tipo TEXT, -- 'Silo', 'Talhão', 'Máquina'
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Basic setup
ALTER TABLE fazendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ... and so on for all tables

-- Example Policy: Users can see data from their farm
-- CREATE POLICY "Users can see their farm data" ON silos FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));
