CREATE TABLE IF NOT EXISTS public.categorias_produto (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text        NOT NULL UNIQUE,
  unidade_padrao text        NOT NULL,
  icone          text        NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Seed das 9 categorias
INSERT INTO public.categorias_produto (nome, unidade_padrao, icone) VALUES
  ('Grãos',             'sacas',    'wheat'),
  ('Feno',              'fardos',   'package'),
  ('Pré-secado',        'kg',       'leaf'),
  ('Sementes',          'kg',       'sprout'),
  ('Leite',             'litros',   'droplets'),
  ('Arrobas',           '@',        'scale'),
  ('Animais',           'cabeças',  'beef'),
  ('Material Genético', 'doses',    'flask-conical'),
  ('Outros',            'unidade',  'box')
ON CONFLICT (nome) DO NOTHING;

-- RLS: SELECT para todos autenticados; escrita apenas service_role
ALTER TABLE public.categorias_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_produto_select_autenticados"
  ON public.categorias_produto FOR SELECT
  TO authenticated
  USING (true);
-- INSERT/UPDATE/DELETE: sem policy → apenas service_role pode escrever
