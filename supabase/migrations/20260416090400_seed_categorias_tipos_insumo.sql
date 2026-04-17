-- supabase/migrations/20260416090400_seed_categorias_tipos_insumo.sql
-- Dados iniciais: Categorias e Tipos de Insumos

-- Inserir Categorias com ON CONFLICT para idempotência
INSERT INTO categorias_insumo (nome, descricao) VALUES
  ('Fertilizantes/Corretivos', 'Adubos, calcário, gesso e corretivos'),
  ('Defensivos', 'Herbicidas, inseticidas, fungicidas'),
  ('Sementes', 'Sementes agrícolas'),
  ('Combustíveis', 'Diesel, gasolina, arla 32'),
  ('Nutrição Animal', 'Rações, minerais, núcleos, farelos'),
  ('Inoculantes', 'Bactérias e fungos para silos e solo'),
  ('Lonas', 'Lonas para silos'),
  ('Peças e Manutenções', 'Peças de reposição e materiais de manutenção'),
  ('Outros', 'Outros insumos não categorizados')
ON CONFLICT (nome) DO NOTHING;

-- Inserir Tipos por Categoria com ON CONFLICT para idempotência
-- FERTILIZANTES/CORRETIVOS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Fertilizante', 'Adubos NPK, simples' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Fertilizante Foliar', 'Adubação via folha' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Calcário', 'Correção de acidez' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Gesso', 'Condicionador de solo' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
UNION ALL SELECT id, 'Outros', 'Outros corretivos' FROM categorias_insumo WHERE nome = 'Fertilizantes/Corretivos'
ON CONFLICT (categoria_id, nome) DO NOTHING;

-- DEFENSIVOS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Herbicida', 'Controle de plantas daninhas' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Inseticida', 'Controle de insetos' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Fungicida', 'Controle de doenças fúngicas' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Adjuvantes', 'Potencializadores de eficácia' FROM categorias_insumo WHERE nome = 'Defensivos'
UNION ALL SELECT id, 'Espalhantes', 'Reduzem tensão superficial' FROM categorias_insumo WHERE nome = 'Defensivos'
ON CONFLICT (categoria_id, nome) DO NOTHING;

-- SEMENTES
-- Sem subtipos (deixar vazio)

-- COMBUSTÍVEIS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Diesel', 'Combustível para máquinas' FROM categorias_insumo WHERE nome = 'Combustíveis'
UNION ALL SELECT id, 'Gasolina', 'Combustível alternativo' FROM categorias_insumo WHERE nome = 'Combustíveis'
UNION ALL SELECT id, 'Arla 32', 'Aditivo para motores diesel' FROM categorias_insumo WHERE nome = 'Combustíveis'
ON CONFLICT (categoria_id, nome) DO NOTHING;

-- NUTRIÇÃO ANIMAL
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Sal Mineral', 'Mineral essencial' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Sal Proteinado', 'Mineral + proteína' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Ração', 'Alimento balanceado' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Núcleo', 'Concentrado mineral/vitamínico' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Aditivos', 'Promotores de crescimento/saúde' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Grãos/Farelos', 'Milho, soja, sorgo' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Feno', 'Forragem seca' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
UNION ALL SELECT id, 'Outros', 'Outros alimentos' FROM categorias_insumo WHERE nome = 'Nutrição Animal'
ON CONFLICT (categoria_id, nome) DO NOTHING;

-- INOCULANTES
-- Sem subtipos (deixar vazio)

-- LONAS
INSERT INTO tipos_insumo (categoria_id, nome, descricao)
SELECT id, 'Convencional', 'Lona padrão' FROM categorias_insumo WHERE nome = 'Lonas'
UNION ALL SELECT id, 'Barreira O2', 'Lona com barreira de oxigênio' FROM categorias_insumo WHERE nome = 'Lonas'
ON CONFLICT (categoria_id, nome) DO NOTHING;

-- PEÇAS E MANUTENÇÕES
-- Sem subtipos (deixar vazio)

-- OUTROS
-- Sem subtipos (deixar vazio)

COMMENT ON TABLE categorias_insumo IS 'Dados de seed inseridos em 2026-04-16';
