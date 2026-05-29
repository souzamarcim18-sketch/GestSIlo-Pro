-- Corrige a RPC registrar_evento_com_status (3 problemas encontrados):
--
-- 1. v_tipo é TEXT mas eventos_rebanho.tipo é enum tipo_evento_rebanho → cast ::tipo_evento_rebanho
-- 2. v_novo_status é TEXT mas animais.status é enum status_animal → cast ::status_animal
-- 3. Enum tipo_evento_rebanho não possui o valor 'desmame' (existe no TypeScript mas faltava no banco)
--
-- NOTA: ALTER TYPE ADD VALUE não suporta transações — executa fora de bloco BEGIN/COMMIT.

ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'desmame';
