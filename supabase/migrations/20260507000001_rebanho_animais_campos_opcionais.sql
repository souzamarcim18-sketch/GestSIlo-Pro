-- Migration A: Campos opcionais em animais (spec completa)
-- Dependência: nenhuma. Executar dentro de BEGIN/COMMIT.

BEGIN;

-- Nome do animal (opcional, spec diz "Nome (opcional)")
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS nome TEXT NULL;

-- Código SISBOV/CRBIO (rastreabilidade, opcional)
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS sisbov_crbio TEXT NULL;

-- Origem do animal
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS origem TEXT NULL
  CHECK (origem IS NULL OR origem IN ('nascido', 'comprado'));

-- Peso ao nascimento (opcional)
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS peso_nascimento NUMERIC(6,2) NULL
  CHECK (peso_nascimento IS NULL OR peso_nascimento > 0);

-- Flag: data de nascimento é estimada?
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS data_nascimento_estimada BOOLEAN NOT NULL DEFAULT FALSE;

-- URL da foto do animal (armazenada no Supabase Storage)
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS foto_url TEXT NULL;

-- Índice para busca por nome (busca textual por nome)
CREATE INDEX IF NOT EXISTS idx_animais_nome
  ON public.animais(fazenda_id, nome)
  WHERE nome IS NOT NULL AND deleted_at IS NULL;

-- Índice para rastreabilidade SISBOV
CREATE INDEX IF NOT EXISTS idx_animais_sisbov_crbio
  ON public.animais(sisbov_crbio)
  WHERE sisbov_crbio IS NOT NULL;

COMMIT;
